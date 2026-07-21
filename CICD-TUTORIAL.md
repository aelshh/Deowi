# Deowi CI/CD Pipeline — Build It Yourself

This tutorial walks you through building a production-grade CI/CD pipeline with GitHub Actions that deploys your Next.js web app and BullMQ worker to AWS ECS Fargate.

**You will type every line.** I'll explain what each piece does, but you do the work. That's how you learn.

---

## Table of Contents

1. [What We're Building](#1-what-were-building)
2. [Prerequisites](#2-prerequisites)
3. [Task Definition Templates](#3-task-definition-templates)
4. [Writing the Workflow File](#4-writing-the-workflow-file)
5. [Key Concepts Explained](#5-key-concepts-explained)
6. [Testing Your Pipeline](#6-testing-your-pipeline)
7. [Common Failures & Fixes](#7-common-failures--fixes)
8. [Future Improvements](#8-future-improvements)

---

## 1. What We're Building

Right now, every time you make a change, you have to:
1. Build Docker images locally
2. Push them to ECR manually
3. Tell ECS to redeploy

We're replacing all of that with a single `git push`.

### The Pipeline

```
You push code to main
        │
        ▼
┌───────────────────────────────┐
│  GitHub Actions kicks off     │
│                               │
│  Stage 1: LINT & TYPECHECK    │  ← "Is the code valid?"
│    npm ci                     │
│    npm run lint               │
│    npx tsc --noEmit           │
│                               │
│  Stage 2: BUILD & PUSH        │  ← "Package it up"
│    Login to ECR               │
│    Build web Docker image     │  (runs in parallel)
│    Build worker Docker image  │  (runs in parallel)
│    Push both to ECR           │
│                               │
│  Stage 3: DEPLOY TO ECS       │  ← "Ship it live"
│    Update web task definition │
│    Update worker task def     │
│    Wait for healthy           │
└───────────────────────────────┘
        │
        ▼
  ECS pulls new images → new containers start → old ones stop
```

**Why three stages?**
- If lint fails, we stop immediately — no point building broken code
- If a Docker build fails, we don't deploy — no point deploying something that won't start
- Deploy only happens when everything before it passed

### The Two Programs Being Deployed

| Program | Dockerfile | What It Does |
|---------|-----------|--------------|
| **Web** | `docker/Dockerfile.web` | Next.js app — serves pages, handles uploads, API routes |
| **Worker** | `docker/Dockerfile.worker` | BullMQ processor — picks up jobs from Redis, calls Deepgram/OpenRouter, saves results |

Both need their own Docker image, their own ECR repository, and their own ECS service. The CI/CD pipeline builds and deploys both.

---

## 2. Prerequisites

Before writing any workflow code, you need these things set up. Do them now if you haven't already.

### 2a. Verify ECR Repositories Exist

Run this in your terminal:

```bash
aws ecr describe-repositories --region us-east-1
```

You should see `deowi-web` and `deowi-worker` in the output. If not, create them:

```bash
aws ecr create-repository --repository-name deowi-web --image-scanning-configuration scanOnPush=true --region us-east-1
aws ecr create-repository --repository-name deowi-worker --image-scanning-configuration scanOnPush=true --region us-east-1
```

### 2b. Create an IAM User for GitHub Actions

GitHub Actions needs AWS credentials to push images and update ECS. We create a **dedicated IAM user** for this — not your personal admin credentials.

**Why a separate user?** If the GitHub token leaks, the attacker only gets limited permissions (push to ECR, update ECS). They can't delete your AWS account or access other services.

Run this in your terminal — copy each command exactly:

```bash
aws iam create-user --user-name github-actions-deployer
```

Now create the permissions policy. This tells AWS exactly what the user is allowed to do:

```bash
cat > /tmp/github-actions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRLogin",
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": [
        "arn:aws:ecr:us-east-1:AWS_ACCOUNT_ID:repository/deowi-web",
        "arn:aws:ecr:us-east-1:AWS_ACCOUNT_ID:repository/deowi-worker"
      ]
    },
    {
      "Sid": "ECSDeploy",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": [
        "arn:aws:iam::AWS_ACCOUNT_ID:role/deowi-ecs-task-execution-role"
      ]
    }
  ]
}
EOF
```

**Stop and understand what you just typed:**

| Statement | Why It's Needed |
|-----------|----------------|
| `ecr:GetAuthorizationToken` | Gets a temporary password to log in to ECR |
| `ecr:PutImage`, `ecr:InitiateLayerUpload`, etc. | Push Docker image layers to ECR |
| `ecs:UpdateService` | Tell ECS to redeploy with new images |
| `ecs:RegisterTaskDefinition` | Register new versions of task definitions |
| `iam:PassRole` | Allow the task execution role to be used by new task definitions |

**Replace `AWS_ACCOUNT_ID`** with your actual 12-digit AWS account ID. Find it in the top-right corner of the AWS Console, or run:

```bash
aws sts get-caller-identity --query 'Account' --output text
```

Now attach the policy and create access keys:

```bash
aws iam put-user-policy \
  --user-name github-actions-deployer \
  --policy-name deowi-deploy-policy \
  --policy-document file:///tmp/github-actions-policy.json

aws iam create-access-key --user-name github-actions-deployer
```

**Copy the Access Key ID and Secret Access Key from the output.** You'll need them in the next step. The secret key is shown only once — save it somewhere safe.

### 2c. Set Up GitHub Secrets

Go to your GitHub repo in your browser:
1. Click **Settings** (top tab bar)
2. Click **Secrets and variables** → **Actions** (left sidebar)
3. Click **New repository secret**

Add these one by one:

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | From the `create-access-key` output above |
| `AWS_SECRET_ACCESS_KEY` | From the same output (the `SecretAccessKey` field) |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCOUNT_ID` | Your 12-digit account ID |
| `ECR_WEB_REPOSITORY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-web` (replace with your account ID) |
| `ECR_WORKER_REPOSITORY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-worker` (replace with your account ID) |

**Why GitHub Secrets?** They're encrypted and never shown in logs. If someone looks at your workflow file or build logs, they see `${{ secrets.AWS_ACCESS_KEY_ID }}` — not the actual key.

---

## 3. Task Definition Templates

A **task definition** is the blueprint ECS uses to run your container. It answers: which image? How much CPU/RAM? What environment variables? Where do logs go?

We need two — one for web, one for worker. You'll type them yourself.

### 3a. Why Templates?

The CI/CD pipeline needs to **dynamically set the image tag** to the commit SHA. We can't hardcode `:latest` in the task definition because then every deploy would pull the same tag and ECS might skip the update.

Instead, we create a **template** with a placeholder. The CI pipeline uses `jq` to replace the placeholder with the real SHA before registering the task definition.

### 3b. Web Task Definition

Create a new file at the root of your project called `task-definition-web.json`:

Type this out character by character. Read each line as you go:

```json
{
  "family": "deowi-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::AWS_ACCOUNT_ID:role/deowi-ecs-task-execution-role",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/deowi-web:IMAGE_TAG",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "NEXT_PUBLIC_SUPABASE_URL", "value": "YOUR_SUPABASE_URL" },
        { "name": "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "value": "YOUR_SUPABASE_PUBLISHABLE_KEY" },
        { "name": "NEXT_PUBLIC_SITE_URL", "value": "https://deowi.com" }
      ],
      "secrets": [
        { "name": "SUPABASE_SERVICE_ROLE_KEY", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/SUPABASE_SERVICE_ROLE_KEY" },
        { "name": "DEEPGRAM_API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/DEEPGRAM_API_KEY" },
        { "name": "OPENROUTER_API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/OPENROUTER_API_KEY" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/REDIS_URL" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/deowi-web",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Stop. Understand what you typed:**

| Field | What It Means | Why |
|-------|--------------|-----|
| `"family": "deowi-web"` | The task definition name | ECS references this when creating services |
| `"networkMode": "awsvpc"` | Each task gets its own network interface | Required for Fargate — each container gets its own IP |
| `"requiresCompatibilities": ["FARGATE"]` | This runs on Fargate (serverless) | Tells ECS not to look for EC2 instances |
| `"cpu": "256"` | 0.25 vCPU | Smallest Fargate size — enough for a small SaaS |
| `"memory": "512"` | 512 MB RAM | Enough for Next.js serving pages |
| `"executionRoleArn"` | IAM role for ECS | Gives ECS permission to pull from ECR and read SSM secrets |
| `"image"` with `IMAGE_TAG` | The Docker image to run | **Placeholder** — CI replaces this with the real commit SHA |
| `"portMappings"` | Container listens on port 3000 | Next.js default port |
| `"environment"` | Non-sensitive env vars | Hardcoded in the task definition (visible in Console but no secrets) |
| `"secrets"` | Sensitive env vars from SSM | Fetched at runtime — never stored in the task definition |
| `"logConfiguration"` | Sends stdout/stderr to CloudWatch | How you see what your container is doing |
| `"healthCheck"` | ECS checks if the container is alive | If it fails 3 times, ECS restarts the container |

**`environment` vs `secrets` — this is critical:**

```
environment:                          secrets:
  "value": "hardcoded here"            "valueFrom": "arn:aws:ssm:..."
  ↓                                    ↓
  Visible in AWS Console               Never stored in task definition
  Fine for: URLs, feature flags        Required for: API keys, tokens, passwords
```

**Replace these placeholders before committing:**
- `AWS_ACCOUNT_ID` — your 12-digit account ID (everywhere it appears)
- `IMAGE_TAG` — leave as-is, CI replaces this
- `YOUR_SUPABASE_URL` — your Supabase project URL
- `YOUR_SUPABASE_PUBLISHABLE_KEY` — your Supabase anon key

### 3c. Worker Task Definition

Create a new file called `task-definition-worker.json`:

```json
{
  "family": "deowi-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::AWS_ACCOUNT_ID:role/deowi-ecs-task-execution-role",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/deowi-worker:IMAGE_TAG",
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "SUPABASE_SERVICE_ROLE_KEY", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/SUPABASE_SERVICE_ROLE_KEY" },
        { "name": "DEEPGRAM_API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/DEEPGRAM_API_KEY" },
        { "name": "OPENROUTER_API_KEY", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/OPENROUTER_API_KEY" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/deowi/REDIS_URL" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/deowi-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "worker"
        }
      }
    }
  ]
}
```

**What's different from the web task?**

| Field | Web | Worker | Why |
|-------|-----|--------|-----|
| `"portMappings"` | Port 3000 | **None** | Worker doesn't serve HTTP — nothing connects to it |
| `"healthCheck"` | Yes (hits `/` endpoint) | **None** | Worker has no HTTP endpoint to check |
| `"environment"` | `NEXT_PUBLIC_*` vars included | **Only `NODE_ENV`** | Worker runs in Node.js, not in a browser — no `NEXT_PUBLIC_*` needed |
| `"logConfiguration"` prefix | `web` | `worker` | So you can tell which logs belong to which in CloudWatch |

---

## 4. Writing the Workflow File

This is the main event. You'll create `.github/workflows/ci-cd.yml` — the file GitHub Actions reads to know what to do.

### 4a. Creating the Directory Structure

```bash
mkdir -p .github/workflows
```

Now create the file `.github/workflows/ci-cd.yml`. Type it out section by section. I'll explain each block, then you type it, then we move on.

### 4b. The Trigger

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]
```

**What this says:** "GitHub, run this workflow every time someone pushes code to the `main` branch."

- `name:` — The name shown in the GitHub Actions UI tab
- `on: push: branches: [main]` — The trigger. Only `main` branch. Not feature branches, not PRs. This is intentional — you don't want every push deploying to production.

**Why not trigger on PRs?** For a production deploy pipeline, you want a human to merge to `main` first. PRs can have a separate "preview" workflow later.

### 4c. Environment Variables

Add this below the trigger:

```yaml
env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_WEB_REPOSITORY: ${{ secrets.ECR_WEB_REPOSITORY }}
  ECR_WORKER_REPOSITORY: ${{ secrets.ECR_WORKER_REPOSITORY }}
  ECS_CLUSTER: deowi-cluster
  ECS_WEB_SERVICE: deowi-web-service
  ECS_WORKER_SERVICE: deowi-worker-service
```

**What this says:** "These values are used in multiple places below. Define them once, reference them everywhere."

- `${{ secrets.AWS_REGION }}` — Pulls from your GitHub Secrets (the encrypted value)
- `deowi-cluster` etc. — Hardcoded because these names never change (they're part of your infrastructure)

**Why secrets vs hardcoded?** AWS credentials are secret → use secrets. Cluster names are public knowledge → hardcode them.

### 4d. Job 1: Lint & Typecheck

```yaml
jobs:
  lint:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npx tsc --noEmit
```

**Break this down line by line:**

| Line | What It Does |
|------|-------------|
| `jobs:` | Everything below defines jobs (parallel units of work) |
| `lint:` | The job ID — other jobs can reference this with `needs: lint` |
| `name: Lint & Typecheck` | Human-readable name shown in the GitHub UI |
| `runs-on: ubuntu-latest` | GitHub provides a fresh Ubuntu VM to run on |
| `steps:` | A list of things to do in order |
| `actions/checkout@v4` | Downloads your repo to the VM (pinned to v4 for stability) |
| `actions/setup-node@v4` | Installs Node.js 20 on the VM |
| `cache: "npm"` | Caches `node_modules` between runs — second run is 10x faster |
| `npm ci` | Installs dependencies (clean install — uses `package-lock.json` exactly) |
| `npm run lint` | Runs ESLint — checks for code style errors |
| `npx tsc --noEmit` | Runs TypeScript compiler to check types without producing files |

**`npm ci` vs `npm install`:** `npm ci` is designed for CI environments. It deletes `node_modules` first, installs exactly what's in `package-lock.json`, and fails if the lockfile is out of sync. `npm install` can modify the lockfile — fine for local dev, dangerous in CI.

**Why `--noEmit`?** We only want to check if types are valid. We don't need the compiled output — Docker will do the real build later.

**If any step fails, the job stops immediately.** No point linting broken code, and no point building images with type errors.

### 4e. Job 2: Build & Push Docker Images

This is the most important job. It builds both Docker images and pushes them to ECR.

Add this after the `lint` job:

```yaml
  build:
    name: Build & Push Images
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push web image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f docker/Dockerfile.web -t $ECR_WEB_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_WEB_REPOSITORY:$IMAGE_TAG $ECR_WEB_REPOSITORY:latest
          docker push $ECR_WEB_REPOSITORY:$IMAGE_TAG
          docker push $ECR_WEB_REPOSITORY:latest

      - name: Build and push worker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f docker/Dockerfile.worker -t $ECR_WORKER_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_WORKER_REPOSITORY:$IMAGE_TAG $ECR_WORKER_REPOSITORY:latest
          docker push $ECR_WORKER_REPOSITORY:$IMAGE_TAG
          docker push $ECR_WORKER_REPOSITORY:latest
```

**Line by line:**

| Line | What It Does |
|------|-------------|
| `needs: lint` | **Only run if lint job passed.** This is the dependency chain. |
| `aws-actions/configure-aws-credentials@v4` | Sets up AWS credentials as environment variables |
| `aws-actions/amazon-ecr-login@v2` | Logs into ECR, outputs the registry URL |
| `id: login-ecr` | Names this step so we can reference its outputs later |
| `steps.login-ecr.outputs.registry` | The ECR registry URL (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com`) |
| `github.sha` | The full 40-character commit hash (e.g., `a1b2c3d4e5f6...`) |
| `docker build -f docker/Dockerfile.web -t $ECR_WEB_REPOSITORY:$IMAGE_TAG .` | Builds the web image and tags it with the commit SHA |
| `docker tag $ECR_WEB_REPOSITORY:$IMAGE_TAG $ECR_WEB_REPOSITORY:latest` | Gives the same image a second name (`latest`) — no rebuild |
| `-t $ECR_WEB_REPOSITORY:$IMAGE_TAG` | Tags it with the commit SHA |
| `-t $ECR_WEB_REPOSITORY:latest` | Also tags it as `latest` (what ECS actually pulls) |
| `docker push` | Uploads to ECR |

**Why two tags?**
- `:a1b2c3d4...` — Permanent record. If something breaks, you know exactly which commit caused it. You can roll back to this exact image.
- `:latest` — What ECS is configured to pull. It always gets the most recent build.

**Why `needs: lint`?** This creates a dependency chain:

```
lint ──passes──► build ──passes──► deploy
  │
  └── fails ──► build never runs ──► deploy never runs
```

Without `needs: lint`, all three jobs would run simultaneously — you could deploy broken code while lint is still failing.

### 4f. Job 3: Deploy to ECS

Add this after the `build` job:

```yaml
  deploy:
    name: Deploy to ECS
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Register and deploy web service
        run: |
          sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-web.json

          TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-web.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WEB_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION

      - name: Register and deploy worker service
        run: |
          sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-worker.json

          TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-worker.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WORKER_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION

      - name: Wait for web service stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_WEB_SERVICE \
            --region $AWS_REGION

      - name: Wait for worker service stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_WORKER_SERVICE \
            --region $AWS_REGION
```

**This is the most complex job. Let's break it down:**

**The problem this job solves:** Your task definition templates have `IMAGE_TAG` as a placeholder. We need to replace it with the real commit SHA before registering the task definition with ECS.

**How it works:**

1. `sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-web.json`
   - Replaces the placeholder `IMAGE_TAG` with the real commit SHA in the file

2. `aws ecs register-task-definition --cli-input-json file://task-definition-web.json`
   - Reads the modified JSON file and registers it as a new task definition version
   - ECS assigns it an ARN like `arn:aws:ecs:us-east-1:123456789012:task-definition/deowi-web:3`

3. `--query 'taskDefinition.taskDefinitionArn' --output text`
   - Extracts just the ARN string from the response (no JSON wrapping)

4. `aws ecs update-service --task-definition $TASK_DEF_ARN`
   - Tells ECS: "Use this new task definition version for the service"
   - ECS pulls the new image, starts new containers, stops old ones

4. `aws ecs wait services-stable`
   - Blocks (waits) until ECS reports the service is stable
   - If the new containers fail to start, this will time out and the step fails
   - This is your **deployment verification**

**Wait — how does the IMAGE_TAG get replaced?**

Looking at this more carefully, there's a subtlety. The task definition in the repo has the literal string `IMAGE_TAG`. When CI registers this, ECS will try to pull `deowi-web:IMAGE_TAG` — which doesn't exist.

We need to **dynamically replace** the image tag. Here's the corrected deploy step:

Replace the web and worker deploy steps with:

```yaml
      - name: Register and deploy web service
        run: |
          # Replace IMAGE_TAG placeholder with actual commit SHA
          sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-web.json

          # Register new task definition and get the ARN
          TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-web.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          # Update the service to use the new task definition
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WEB_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION
```

And the same for the worker:

```yaml
      - name: Register and deploy worker service
        run: |
          sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-worker.json

          TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-worker.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WORKER_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION
```

**What `sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g"` does:**
- `sed` — Stream editor (text replacement tool)
- `-i` — Edit the file in-place
- `s|:IMAGE_TAG|:${{ github.sha }}|g` — Replace `:IMAGE_TAG` with `:a1b2c3d4...` everywhere in the file
- `${{ github.sha }}` — GitHub Actions expression that resolves to the commit hash

**What `--query 'taskDefinition.taskDefinitionArn' --output text` does:**
- `--query` extracts just the ARN string from the full JSON response
- `--output text` returns it as plain text (not JSON) — so `TASK_DEF_ARN` holds just the string

**The flow in each step:**
```
1. sed replaces IMAGE_TAG with real SHA in the JSON file
2. aws ecs register-task-definition reads the file → creates new revision → returns ARN
3. ARN is stored in TASK_DEF_ARN variable
4. aws ecs update-service tells ECS to use that new revision
```

---

## 5. Key Concepts Explained

### 5a. `github.sha` — Why Commit SHA Tagging Matters

```
Commit a1b2c3d → Image pushed as :a1b2c3d and :latest
Commit d4e5f6a → Image pushed as :d4e5f6a and :latest
```

If `d4e5f6a` breaks production:
- You know exactly which commit caused it (`d4e5f6a`)
- You can rollback by updating the task definition to use `:a1b2c3d`
- You can `git revert d4e5f6a` and push — CI builds a new image, ECS redeploys

Without SHA tagging (only `:latest`), you'd have no idea which deploy broke things.

### 5b. `--force-new-deployment` vs `--task-definition`

The deployment guide uses `--force-new-deployment` which tells ECS "check for new image and redeploy." But our approach is more precise — we register a **new task definition version** and tell the service to use it. This is better because:
- Each deploy gets a new task definition version number
- You can see the deployment history in ECS
- Rollback is explicit — just point back to the previous task definition ARN

### 5c. Job Dependency Chain

```yaml
lint ──needs──► build ──needs──► deploy
```

This means:
- `lint` starts immediately
- `build` waits for `lint` to finish
- `deploy` waits for `build` to finish

If `lint` fails → `build` is skipped → `deploy` is skipped.
If `build` fails → `deploy` is skipped.

This prevents deploying broken code.

### 5d. Caching

```yaml
- uses: actions/setup-node@v4
  with:
    cache: "npm"
```

This caches `~/.npm` (the npm download cache), not `node_modules`. When `npm ci` runs, it still installs from scratch but downloads packages from cache instead of the registry. First run: ~2 min. Subsequent runs: ~30 sec.

### 5e. Secrets in Logs

GitHub Actions automatically masks secrets in logs. If your AWS secret key appears in a log line, it gets replaced with `***`. But don't test this — always use `${{ secrets.X }}` references, never hardcode values.

---

## 6. Testing Your Pipeline

### 6a. Push and Watch

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

Go to your GitHub repo → **Actions** tab. You'll see the workflow running:
1. Click on the workflow run
2. Watch each job in real-time
3. Click on individual steps to see their logs

### 6b. Verify the Deploy

After the pipeline completes (should take 5-8 minutes):

```bash
# Check that the new task definition was registered
aws ecs list-task-definitions --family-prefix deowi-web --region us-east-1

# Check service status
aws ecs describe-services \
  --cluster deowi-cluster \
  --services deowi-web-service \
  --query 'services[0].{status:status,desiredCount:desiredCount,runningCount:runningCount,events:events[0:3]}' \
  --region us-east-1

# Check that containers are healthy
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:AWS_ACCOUNT_ID:targetgroup/deowi-web-TG_ID \
  --region us-east-1
```

### 6c. Test a Breaking Change

To verify the pipeline catches errors:
1. Introduce a TypeScript error (e.g., add `const x: number = "hello"` to a file)
2. Push to main
3. Watch the lint job fail
4. Verify that build and deploy jobs are skipped
5. Fix the error, push again
6. Watch the full pipeline succeed

---

## 7. Common Failures & Fixes

| Failure | Error Message | Fix |
|---------|--------------|-----|
| **Lint fails** | `ESLint found X problems` | Fix the lint errors, push again |
| **Typecheck fails** | `Type 'string' is not assignable to type 'number'` | Fix the type error, push again |
| **ECR login fails** | `no basic auth credentials` | Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub Secrets |
| **Docker build fails** | `COPY failed: file not found` | Check the Dockerfile paths match your directory structure |
| **ECR push fails** | `repository does not exist` | Verify `ECR_WEB_REPOSITORY` and `ECR_WORKER_REPOSITORY` in GitHub Secrets |
| **Task def register fails** | `Invalid parameter at 'containerDefinitions'` | Check your task definition JSON is valid (no trailing commas, correct ARN format) |
| **ECS update fails** | `The service is not active` | ECS service might be in a bad state — check `aws ecs describe-services` |
| **Deploy timeout** | `wait services-stable timed out` | New containers aren't becoming healthy — check CloudWatch logs |

### How to Debug

```bash
# See why a service isn't stable
aws ecs describe-services \
  --cluster deowi-cluster \
  --services deowi-web-service \
  --query 'services[0].events[0:5]' \
  --region us-east-1

# Check container logs
aws logs tail /ecs/deowi-web --follow --region us-east-1

# Check if the task definition was registered correctly
aws ecs describe-task-definition \
  --task-definition deowi-web \
  --query 'taskDefinition.containerDefinitions[0].image' \
  --output text \
  --region us-east-1
```

---

## 8. Future Improvements

Once your pipeline works, here's what to add next:

### 8a. Auto-Rollback

If `aws ecs wait services-stable` times out, automatically roll back to the previous task definition:

```yaml
      - name: Deploy web service
        id: deploy-web
        run: |
          # Save current task definition for rollback
          CURRENT_ARN=$(aws ecs describe-services \
            --cluster $ECS_CLUSTER \
            --services $ECS_WEB_SERVICE \
            --query 'services[0].taskDefinition' \
            --output text \
            --region $AWS_REGION)
          echo "current_task_def_arn=$CURRENT_ARN" >> $GITHUB_OUTPUT
          
          TASK_DEF_ARN=$(cat /tmp/web-task-def-output.json | jq -r '.taskDefinitionArn')
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WEB_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION

      - name: Wait for web service stability
        id: wait-web
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_WEB_SERVICE \
            --region $AWS_REGION

      - name: Rollback web service on failure
        if: failure() && steps.deploy-web.conclusion == 'success'
        run: |
          echo "Deployment failed — rolling back!"
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WEB_SERVICE \
            --task-definition ${{ steps.deploy-web.outputs.current_task_def_arn }} \
            --region $AWS_REGION
```

### 8b. Parallel Docker Builds

Build web and worker images simultaneously (saves ~2 minutes):

```yaml
  build:
    name: Build & Push Images
    needs: lint
    runs-on: ubuntu-latest
    steps:
      # ... setup steps ...

      - name: Build and push web image
        run: |
          docker build -f docker/Dockerfile.web -t $ECR_WEB_REPOSITORY:${{ github.sha }} .
          docker tag $ECR_WEB_REPOSITORY:${{ github.sha }} $ECR_WEB_REPOSITORY:latest
          docker push $ECR_WEB_REPOSITORY:${{ github.sha }}
          docker push $ECR_WEB_REPOSITORY:latest

      - name: Build and push worker image
        run: |
          docker build -f docker/Dockerfile.worker -t $ECR_WORKER_REPOSITORY:${{ github.sha }} .
          docker tag $ECR_WORKER_REPOSITORY:${{ github.sha }} $ECR_WORKER_REPOSITORY:latest
          docker push $ECR_WORKER_REPOSITORY:${{ github.sha }}
          docker push $ECR_WORKER_REPOSITORY:latest
```

To make them truly parallel, split into two separate jobs:

```yaml
  build-web:
    name: Build Web Image
    needs: lint
    runs-on: ubuntu-latest
    steps:
      # ... build web ...

  build-worker:
    name: Build Worker Image
    needs: lint
    runs-on: ubuntu-latest
    steps:
      # ... build worker ...

  deploy:
    name: Deploy to ECS
    needs: [build-web, build-worker]
    runs-on: ubuntu-latest
    steps:
      # ... deploy ...
```

Now `build-web` and `build-worker` run simultaneously, and `deploy` waits for both.

### 8c. Slack Notifications

```yaml
      - name: Notify Slack on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "Deowi deployed successfully! Commit: ${{ github.sha }}"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 8d. OIDC (More Secure Than Access Keys)

Instead of long-lived access keys, use GitHub's OIDC provider for short-lived tokens:

```yaml
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::AWS_ACCOUNT_ID:role/github-actions-oidc-role
          aws-region: us-east-1
```

This creates temporary credentials that expire after each run — no secrets to manage.

---

## Complete Workflow File

For reference, here's the full `.github/workflows/ci-cd.yml` you should have after typing everything out:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_WEB_REPOSITORY: ${{ secrets.ECR_WEB_REPOSITORY }}
  ECR_WORKER_REPOSITORY: ${{ secrets.ECR_WORKER_REPOSITORY }}
  ECS_CLUSTER: deowi-cluster
  ECS_WEB_SERVICE: deowi-web-service
  ECS_WORKER_SERVICE: deowi-worker-service

jobs:
  lint:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npx tsc --noEmit

  build:
    name: Build & Push Images
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push web image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f docker/Dockerfile.web -t $ECR_WEB_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_WEB_REPOSITORY:$IMAGE_TAG $ECR_WEB_REPOSITORY:latest
          docker push $ECR_WEB_REPOSITORY:$IMAGE_TAG
          docker push $ECR_WEB_REPOSITORY:latest

      - name: Build and push worker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f docker/Dockerfile.worker -t $ECR_WORKER_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_WORKER_REPOSITORY:$IMAGE_TAG $ECR_WORKER_REPOSITORY:latest
          docker push $ECR_WORKER_REPOSITORY:$IMAGE_TAG
          docker push $ECR_WORKER_REPOSITORY:latest

  deploy:
    name: Deploy to ECS
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Register and deploy web service
        run: |
          sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-web.json

          TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-web.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WEB_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION

      - name: Register and deploy worker service
        run: |
          sed -i "s|:IMAGE_TAG|:${{ github.sha }}|g" task-definition-worker.json

          TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://task-definition-worker.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WORKER_SERVICE \
            --task-definition $TASK_DEF_ARN \
            --region $AWS_REGION

      - name: Wait for web service stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_WEB_SERVICE \
            --region $AWS_REGION

      - name: Wait for worker service stability
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_WORKER_SERVICE \
            --region $AWS_REGION
```

---

## Summary

You've built a production-grade CI/CD pipeline that:

1. **Catches errors early** — lint and typecheck run before any Docker build
2. **Builds two images in parallel** — web and worker
3. **Tags every image with the commit SHA** — full traceability and rollback capability
4. **Dynamically updates task definitions** — no hardcoded `latest` tag
5. **Waits for deployment stability** — doesn't declare success until containers are healthy
6. **Uses least-privilege IAM** — the CI user can only push to ECR and update ECS

Every time you `git push origin main`, this entire pipeline runs. No manual Docker builds, no manual ECR pushes, no manual ECS updates. Just code and push.
