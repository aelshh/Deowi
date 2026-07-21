# Deowi — AWS ECS Fargate Deployment Guide

Everything explained from the ground up. No assumed knowledge.

---

## Table of Contents

1. [How This App Works (Architecture)](#how-this-app-works)
2. [What We're Building Today](#what-were-building-today)
3. [Prerequisites](#prerequisites)
4. [Phase 1: Docker — Packaging Your App](#phase-1-docker--packaging-your-app)
5. [Phase 2: Amazon ECR — Storing Your Images](#phase-2-amazon-ecr--storing-your-images)
6. [Phase 3: VPC & Networking — Your Cloud Network](#phase-3-vpc--networking--your-cloud-network)
7. [Phase 4: ECS Cluster, Tasks & Services](#phase-4-ecs-cluster-tasks--services)
8. [Phase 5: Application Load Balancer](#phase-5-application-load-balancer)
9. [Phase 6: IAM Roles & Security](#phase-6-iam-roles--security)
10. [Phase 7: CloudWatch Logging](#phase-7-cloudwatch-logging)
11. [Phase 8: SSL/HTTPS with ACM](#phase-8-sslhttps-with-acm)
12. [Phase 9: Domain & DNS](#phase-9-domain--dns)
13. [Phase 10: Supabase Auth Config](#phase-10-supabase-auth-config)
14. [Phase 11: CI/CD with GitHub Actions](#phase-11-cicd-with-github-actions)
15. [Updating Your App After Changes](#updating-your-app-after-changes)
16. [Reference: AWS CLI Commands](#reference-aws-cli-commands)
17. [Troubleshooting](#troubleshooting)
18. [Cost Estimate](#cost-estimate)

---

## How This App Works

Before deploying anything, you need to understand what you're deploying.

Deowi has **two separate programs** that work together:

### Program 1: The Next.js Web App

This is what users see in their browser. It handles:
- Serving the landing page (`/`)
- Login/signup pages (`/auth/login`, `/auth/signup`)
- The dashboard (`/dashboard`) where users upload audio/video files
- API routes that handle uploads and trigger processing

When a user uploads a file, the web app:
1. Gets a signed upload URL from Supabase Storage
2. The user's browser uploads the file directly to Supabase
3. The browser calls `/api/upload-complete` to say "I'm done uploading"
4. That API route creates a job in the database and pushes it to a **Redis queue**

### Program 2: The BullMQ Worker

This is a **background process** that runs separately from the web app. It has no UI. Its only job is to pick up jobs from Redis and process them. It runs three types of jobs in a pipeline:

```
User uploads file
       │
       ▼
┌─────────────────────┐
│ Step 1: TRANSCRIBE   │  Pick up audio → call Deepgram API → get text transcription
│ Queue: media-transcription
└─────────┬───────────┘
          │ (pushes result to next queue)
          ▼
┌─────────────────────┐
│ Step 2: AI GENERATE  │  Take transcription → call OpenRouter AI → generate blog post,
│ Queue: media-aiProcessing │  newsletter, social hooks, chapters
└─────────┬───────────┘
          │ (pushes result to next queue)
          ▼
┌─────────────────────┐
│ Step 3: SAVE         │  Take all generated content → save to Supabase database
│ Queue: media-saving  │  → mark job as "completed"
└─────────────────────┘
```

### Why Two Programs?

The web app needs to respond to user requests **fast**. If the web app also tried to transcribe audio and call AI APIs (which can take minutes), every page would be slow. By splitting into two programs:
- The **web app** stays fast — it just queues jobs and returns
- The **worker** handles heavy lifting in the background
- If the worker crashes, the web app keeps working (and vice versa)
- You can restart the worker without downtime on the website

### External Services

Your app talks to these external services (you don't host them):

| Service | What It Does | You Pay For |
|---------|-------------|-------------|
| **Supabase** | Database, user authentication, file storage, real-time updates | Free tier or $25/mo |
| **Upstash Redis** | Message queue — stores jobs between the web app and worker | Free tier or ~$10/mo |
| **Deepgram** | Converts audio/video to text (speech-to-text) | Pay per minute |
| **OpenRouter** | AI content generation (blog posts, newsletters, etc.) | Pay per request |

---

## What We're Building Today

You're going to:

1. **Package** both programs into Docker images (like sealed boxes with everything they need inside)
2. **Push** those images to Amazon ECR (Elastic Container Registry — AWS's own Docker image storage)
3. **Create a VPC** — your own private network inside AWS with public subnets for internet-facing resources
4. **Launch an ECS Fargate cluster** — AWS runs your containers for you (no servers to manage)
5. **Set up an Application Load Balancer** — distributes traffic and handles SSL/HTTPS
6. **Point your domain** to the load balancer so users can visit `deowi.com`
7. **Add HTTPS** so the connection is encrypted (the padlock in the browser)

### Why ECS Fargate Instead of a Server?

| Approach | What You Manage | Scaling | Cost Model |
|----------|----------------|---------|------------|
| **DigitalOcean Droplet** | OS, Docker, networking, SSL, everything | Manual (bigger droplet) | Flat monthly fee |
| **ECS on EC2** | EC2 instances, ECS agent, some networking | Semi-automatic | Pay for EC2 instances |
| **ECS Fargate** | Nothing (serverless) | Automatic (set min/max) | Pay per vCPU/hour + GB/hour |

Fargate means AWS manages the servers. You just define "run this container with this much CPU and RAM" and AWS handles the rest. No SSH, no OS patching, no Docker install.

---

## Prerequisites

- **An AWS account** — Sign up at [aws.amazon.com](https://aws.amazon.com). You'll need a credit card. The free tier covers 12 months of many services.
- **AWS CLI installed** — The command-line tool for interacting with AWS. Install from [aws.amazon.com/cli](https://aws.amazon.com/cli).
- **A domain name** — Buy one from Namecheap, Cloudflare Registrar, Route 53, etc. (e.g., `deowi.com`).
- **Your repo pushed to GitHub** — With secrets removed.
- **Your env vars** — You'll need these values handy:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPGRAM_API_KEY`
  - `OPENROUTER_API_KEY`
  - `REDIS_URL`
  - `NEXT_PUBLIC_SITE_URL`

### Configure AWS CLI

After installing the AWS CLI, configure it with your credentials:

```bash
aws configure
```

It will ask for:
- **AWS Access Key ID** — Get this from IAM → Users → Security credentials
- **AWS Secret Access Key** — Same place
- **Default region** — Use `us-east-1` (or your preferred region)
- **Default output format** — Type `json`

**Where do I get access keys?**

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Click your username (top right) → **Security credentials**
3. Under "Access keys", click **Create access key**
4. Select **Command Line Interface**
5. Check the confirmation box → **Create access key**
6. Copy the Access Key ID and Secret Access Key

**Keep these secret.** Never commit them to GitHub or share them.

---

## Phase 1: Docker — Packaging Your App

### What Is Docker?

When you develop on your laptop, your code runs in a specific environment — your version of Node.js, your operating system, your installed packages. When you move to a server, that server might have different versions, different packages, or different settings. This causes the classic "works on my machine" problem.

**Docker solves this by letting you package your app with EVERYTHING it needs** — the OS, Node.js, npm packages, your code, environment variables — into a sealed box called a **container**.

A container runs the same way everywhere — on your laptop, on a server, in AWS.

### Key Docker Terms

| Term | What It Means | Analogy |
|------|--------------|---------|
| **Image** | A read-only template — your app + everything it needs, packaged up | A blueprint for a house |
| **Container** | A running instance of an image | An actual house built from the blueprint |
| **Dockerfile** | A text file with instructions on how to build an image | A recipe |
| **Registry** | A place to store and share Docker images | GitHub, but for Docker images |
| **ECR** | Amazon's Docker image registry (replaces Docker Hub for AWS) | GitHub, but owned by AWS |
| **Multi-stage build** | Using multiple build stages to keep the final image small | Build in a workshop, ship only the finished product |

### Step 1 — Add `output: "standalone"` to Next.js

**File to edit:** `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
```

**What does `output: "standalone"` do?**

By default, when you run `next build`, Next.js creates a `.next` folder that requires `node_modules` to run. Those `node_modules` can be hundreds of megabytes.

With `output: "standalone"`, Next.js creates a `.next/standalone` folder that is **self-contained**. It copies only the Node.js files your app actually uses. The result:
- Instead of 200MB+ of node_modules, you get ~20MB
- The `standalone` folder has its own `server.js` that can run with just `node server.js`
- This is what makes Docker images small and fast to deploy

**Why do we need this?** Because Docker images should be as small as possible. Smaller images = faster pushes to ECR, faster pulls on ECS, less memory usage.

### Step 2 — Create `.env.example`

**File to create:** `.env.example` (at the root of your project)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEEPGRAM_API_KEY=
OPENROUTER_API_KEY=
REDIS_URL=
NEXT_PUBLIC_SITE_URL=
```

It's a template that documents which environment variables your app needs. Safe to commit — no real values.

### Step 3 — Create `.dockerignore`

**File to create:** `.dockerignore` (at the root of your project)

```
node_modules
.next
.env
.env.local
.env*.local
.git
.gitignore
README.md
DEPLOYMENT-GUIDE.md
ARCHITECTURE-PLAN.md
GUIDE-FIX-MEDIA-KIT.md
```

**What is this?** It tells Docker which files to EXCLUDE when building images. Without it, Docker copies your `node_modules`, `.next` build cache, and secrets into the image — wasting space and risking leaks.

### Step 4 — Create `Dockerfile.web`

**File to create:** `Dockerfile.web` (at the root of your project)

```dockerfile
FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

**Line-by-line explanation:**

**`FROM node:20-alpine AS base`** — Start with Alpine Linux (~5MB) + Node.js 20. Alpine keeps images tiny.

**Multi-stage build:** Three stages — `deps` (install packages), `builder` (compile Next.js), `runner` (final slim image). Only the `runner` stage ships.

**`RUN addgroup --system --gid 1001 nodejs` / `RUN adduser --system --uid 1001 nextjs`** — Creates a non-root user. Running as root in a container is a security risk — if someone exploits your app, they'd have root access. Non-root limits the damage.

**`COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./`** — Copies the self-contained Next.js build. The `--chown` ensures files are owned by the `nextjs` user.

**Final image:** ~80-100MB (vs500MB+ without multi-stage).

### Step 5 — Create `Dockerfile.worker`

**File to create:** `Dockerfile.worker` (at the root of your project)

```dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install root dependencies (needed by lib/)
COPY package.json package-lock.json ./
RUN npm ci

# Install worker dependencies
COPY worker/package.json worker/package-lock.json ./worker/
RUN cd worker && npm ci

# Copy source
COPY lib/ ./lib/
COPY worker/ ./worker/

# Build worker
RUN cd worker && npx tsc --project tsconfig.json

# Remove dev dependencies after build
RUN npm prune --omit=dev && cd worker && npm prune --omit=dev

USER node
CMD ["node", "--import", "./worker/dist/worker/preload.js", "worker/dist/worker/start.js"]
```

**Why is this different from the web Dockerfile?**

The worker is NOT a Next.js app. It's a plain Node.js process using TypeScript. It needs `tsc` (TypeScript compiler), not `next build`.

**Why does it need root dependencies?**

The worker's `tsconfig.json` has `"rootDir": "../"` and includes `../lib/**/*.ts`. The `lib/` folder uses packages from the ROOT `package.json` (`@supabase/supabase-js`, `ai`, `@deepgram/sdk`). So we install both sets of dependencies, compile, then prune devDependencies.

**`CMD ["node", "--import", "./worker/dist/worker/preload.js", "worker/dist/worker/start.js"]`**
- `--import ./worker/dist/worker/preload.js` — Runs the preload script BEFORE the main script. The preload loads env vars into `process.env`. In ECS, env vars are passed via the task definition, but the preload is still needed.
- `worker/dist/worker/start.js` — The compiled main script.

---

## Phase 2: Amazon ECR — Storing Your Images

### What Is ECR?

ECR (Elastic Container Registry) is AWS's Docker image storage. It's like Docker Hub, but:
- Integrated with IAM (access control)
- Integrated with ECS (ECS pulls images from ECR automatically)
- Sits inside your AWS network (faster pulls, no internet egress for private subnets)
- First 500MB storage is free

### Step 6 — Create ECR Repositories

Run these commands in your terminal (AWS CLI must be configured first):

```bash
# Create the web repository
aws ecr create-repository \
  --repository-name deowi-web \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1

# Create the worker repository
aws ecr create-repository \
  --repository-name deowi-worker \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

**What this does:**
- `create-repository` — Creates a place in ECR to store your images
- `--repository-name deowi-web` — Names the repository
- `--image-scanning-configuration scanOnPush=true` — AWS automatically scans your images for known vulnerabilities when you push. Free for the first 100 scans/month.
- `--region us-east-1` — Which AWS region to create it in. Use the same region for all resources.

After running these, you'll see output with `repositoryUri`. Copy them — you'll need them:

```
# Example output (yours will differ):
"repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-web"
"repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-worker"
```

### Step 7 — Authenticate Docker with ECR

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

**Replace `123456789012`** with your actual AWS Account ID (visible in the top right of the AWS Console, or in the repository URIs from step 6).

**What this does:** Gets a temporary password from ECR and logs Docker in. This is different from Docker Hub — ECR uses AWS credentials, not a username/password.

### Step 8 — Build and Push Images

```bash
# Set your ECR URI (replace with your actual URI from step 6)
ECR_WEB=123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-web
ECR_WORKER=123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-worker

# Build web image
docker build -f Dockerfile.web -t deowi-web .

# Tag for ECR
docker tag deowi-web:latest $ECR_WEB:latest

# Push to ECR
docker push $ECR_WEB:latest

# Build worker image
docker build -f Dockerfile.worker -t deowi-worker .

# Tag for ECR
docker tag deowi-worker:latest $ECR_WORKER:latest

# Push to ECR
docker push $ECR_WORKER:latest
```

**What these commands do:**

1. `docker build` — Builds a Docker image from your Dockerfile
2. `docker tag` — Gives the image the ECR repository address as its name (required for pushing)
3. `docker push` — Uploads the image to ECR

**The first build will take 2-5 minutes.** Subsequent builds are much faster (Docker layer caching).

### Why Not Docker Hub?

| | Docker Hub | ECR |
|---|---|---|
| **Auth** | Username/password | IAM (AWS credentials) |
| **ECS integration** | Manual IAM for pull | Built-in (same account) |
| **Network** | Public internet | Private (within AWS) |
| **Scanning** | Paid add-on | Free (100/month) |
| **Cost** | Free for public | 500MB free, then $0.10/GB |

---

## Phase 3: VPC & Networking — Your Cloud Network

When you used the AWS Console to create an ECS service and clicked "Create new VPC", the console created a VPC, subnets, internet gateway, route tables, and security groups **for you behind the scenes**. The console hides these details. Here, we create them manually so you understand what's actually happening.

### What Is a VPC?

A **VPC (Virtual Private Cloud)** is your own isolated network inside AWS. Think of it like renting a section of a data center — you define the IP address range, what goes in, what comes out, and what can talk to what.

```
Your laptop                           AWS Data Center
┌──────────┐                        ┌──────────────────────────┐
│          │                        │                          │
│ Browser  │──── internet ─────────│  ┌────────────────────┐  │
│          │                        │  │     YOUR VPC       │  │
└──────────┘                        │  │  10.0.0.0/16       │  │
                                    │  │  (your private     │  │
                                    │  │   network)         │  │
                                    │  └────────────────────┘  │
                                    │                          │
                                    │  ┌────────────────────┐  │
                                    │  │   Someone else's   │  │
                                    │  │       VPC          │  │
                                    │  └────────────────────┘  │
                                    └──────────────────────────┘
```

Every AWS account gets a VPC. Inside it, you create smaller networks called **subnets**. Subnets are where your actual resources (containers, load balancers) live.

### What Is a Subnet?

A **subnet** is a smaller network inside your VPC. Each subnet lives in one **Availability Zone (AZ)** — a physical data center building.

```
VPC: 10.0.0.0/16 (65,536 IPs)
├── Subnet A: 10.0.1.0/24 (256 IPs) → lives in AZ-a (us-east-1a)
└── Subnet B: 10.0.2.0/24 (256 IPs) → lives in AZ-b (us-east-1b)
```

**Why two subnets in two AZs?** If one data center has a power outage, your app keeps running in the other. The ALB also requires at least 2 subnets in different AZs.

**What is a CIDR block?** It defines the IP address range. `10.0.1.0/24` means IPs from `10.0.1.0` to `10.0.1.255` (256 addresses). You won't use all of them — it's just defining the space.

### What Is an Internet Gateway?

An **Internet Gateway (IGW)** is the door between your VPC and the internet. Without it, nothing in your VPC can reach the outside world.

```
Internet ──── Internet Gateway ──── VPC
                  (IGW)
```

### What Is a Route Table?

A **route table** is a set of rules that tells traffic where to go. Every subnet needs a route table.

```
Route Table:
┌─────────────────────┬─────────────────────┐
│ Destination         │ Target              │
├─────────────────────┼─────────────────────┤
│ 0.0.0.0/0           │ Internet Gateway    │  ← "Send all outbound
│ (all traffic)       │                     │     traffic to the IGW"
└─────────────────────┴─────────────────────┘
```

Without this route, your subnets are isolated — nothing gets in or out. With it, traffic can flow to/from the internet.

### What Is a Security Group?

A **security group** is a virtual firewall. It defines which traffic is allowed in and out. Each resource (ALB, container) gets its own security group.

```
Security Group Rules:

ALB Security Group:
  INBOUND:  Port 80  from 0.0.0.0/0 (HTTP from anyone)
            Port 443 from 0.0.0.0/0 (HTTPS from anyone)

ECS Security Group:
  INBOUND:  Port 3000 from ALB Security Group only
            (only the ALB can talk to containers)
```

### What We're Building

```
                    Internet
                       │
                       ▼
              ┌─────────────────┐
              │ Internet Gateway │  ← The door to the internet
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Route Table     │  ← "Send all traffic to IGW"
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   ALB            │  ← Users connect here
              │  (ALB SG)       │     Security Group: 80, 443 from anywhere
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │                           │
┌────────▼────────┐        ┌────────▼────────┐
│  Subnet A        │        │  Subnet B        │
│  (AZ-a)          │        │  (AZ-b)          │
│                   │        │                   │
│  ECS Tasks        │        │  ECS Tasks        │
│  (ECS SG)        │        │  (ECS SG)        │
│  Port 3000 only   │        │  Port 3000 only   │
│  from ALB         │        │  from ALB         │
└──────────────────┘        └──────────────────┘
```

We'll use **public subnets only** for this deployment. This is simpler and cheaper (no NAT Gateway needed). The ALB + security groups protect your containers.

> **Production note:** In a production setup, you'd put ECS tasks in **private subnets** with a **NAT Gateway** for outbound internet access (so they can call Deepgram, OpenRouter, Supabase). For a resume project, public subnets work fine — the security groups still protect your tasks.

### Step 9 — Create the VPC

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --query 'Vpc.VpcId' \
  --output text \
  --region us-east-1)

echo "VPC ID: $VPC_ID"

# Enable DNS support (required for ECS)
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-support '{"Value":true}' \
  --region us-east-1

aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames '{"Value":true}' \
  --region us-east-1
```

**Breaking down the command:**

| Part | What It Does |
|------|-------------|
| `aws ec2 create-vpc` | Creates a new VPC in your AWS account |
| `--cidr-block 10.0.0.0/16` | Defines the IP address range (65,536 IPs) |
| `--query 'Vpc.VpcId'` | Extracts just the VPC ID from the JSON output |
| `--output text` | Outputs as plain text (not JSON) |
| `--region us-east-1` | Which AWS region to create it in |

**Why `--query` and `--output text`?** AWS CLI returns full JSON by default. `--query 'Vpc.VpcId'` extracts just the ID. `--output text` makes it a plain string. The `$()` around the command captures the output into a variable. So `VPC_ID` now holds something like `vpc-0abc123def456`.

**Why enable DNS support and hostnames?** ECS needs to resolve service names (like finding your load balancer by name). Without DNS, ECS tasks can't find each other. It's like having a phone without a contacts list — you can't call anyone by name.

### Step 10 — Create an Internet Gateway

```bash
# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' \
  --output text \
  --region us-east-1)

echo "Internet Gateway ID: $IGW_ID"

# Attach to VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id $IGW_ID \
  --vpc-id $VPC_ID \
  --region us-east-1
```

**Breaking down the command:**

| Part | What It Does |
|------|-------------|
| `aws ec2 create-internet-gateway` | Creates a new internet gateway |
| `--query 'InternetGateway.InternetGatewayId'` | Extracts just the ID |
| `aws ec2 attach-internet-gateway` | Connects the IGW to your VPC |
| `--internet-gateway-id $IGW_ID` | Which IGW to attach |
| `--vpc-id $VPC_ID` | Which VPC to attach it to |

An IGW by itself does nothing — you must **attach** it to your VPC. It's like installing a door in a wall — the door exists, but it's not connected to anything until you mount it.

### Step 11 — Create Public Subnets

```bash
# Get available AZs (data centers in your region)
AZS=$(aws ec2 describe-availability-zones \
  --query 'AvailabilityZones[0:2].ZoneName' \
  --output text \
  --region us-east-1)

AZ_A=$(echo $AZS | awk '{print $1}')
AZ_B=$(echo $AZS | awk '{print $2}')

echo "Using AZs: $AZ_A, $AZ_B"

# Create public subnet in AZ-a
SUBNET_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone $AZ_A \
  --query 'Subnet.SubnetId' \
  --output text \
  --region us-east-1)

# Create public subnet in AZ-b
SUBNET_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone $AZ_B \
  --query 'Subnet.SubnetId' \
  --output text \
  --region us-east-1)

echo "Subnet A: $SUBNET_A"
echo "Subnet B: $SUBNET_B"

# Make them public (auto-assign public IP)
aws ec2 modify-subnet-attribute \
  --subnet-id $SUBNET_A \
  --map-public-ip-on-launch \
  --region us-east-1

aws ec2 modify-subnet-attribute \
  --subnet-id $SUBNET_B \
  --map-public-ip-on-launch \
  --region us-east-1
```

**Breaking down the commands:**

| Part | What It Does |
|------|-------------|
| `aws ec2 describe-availability-zones` | Lists all AZs in the region |
| `--query 'AvailabilityZones[0:2].ZoneName'` | Gets the first 2 AZ names |
| `awk '{print $1}'` | Extracts the first column (AZ name) |
| `aws ec2 create-subnet` | Creates a new subnet |
| `--cidr-block 10.0.1.0/24` | IP range for this subnet (256 IPs) |
| `--availability-zone $AZ_A` | Which data center to put it in |
| `--map-public-ip-on-launch` | Auto-assigns a public IP to anything launched in this subnet |

**Why `--map-public-ip-on-launch`?** By default, subnets are private — resources launched in them don't get public IPs. We need public IPs so our containers can reach the internet (to call Deepgram, OpenRouter, Supabase). This flag makes the subnet "public."

**What are Availability Zones?** They're separate data center buildings within a region. If one AZ has a fire, flood, or power outage, the others keep running. AWS recommends using at least 2 AZs for high availability.

### Step 12 — Create a Route Table

```bash
# Create route table
RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text \
  --region us-east-1)

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region us-east-1

# Associate with both subnets
aws ec2 associate-route-table \
  --route-table-id $RT_ID \
  --subnet-id $SUBNET_A \
  --region us-east-1

aws ec2 associate-route-table \
  --route-table-id $RT_ID \
  --subnet-id $SUBNET_B \
  --region us-east-1
```

**Breaking down the commands:**

| Part | What It Does |
|------|-------------|
| `aws ec2 create-route-table` | Creates a new route table in your VPC |
| `aws ec2 create-route` | Adds a routing rule to the table |
| `--destination-cidr-block 0.0.0.0/0` | Matches ALL traffic (any IP, any port) |
| `--gateway-id $IGW_ID` | Send matched traffic to the Internet Gateway |
| `aws ec2 associate-route-table` | Connects the route table to a subnet |

**What does `0.0.0.0/0` mean?** It's a wildcard — it matches every IP address. This route says "send any outbound traffic to the Internet Gateway." Without this, your subnets are isolated — nothing gets in or out.

**Why associate with both subnets?** Both subnets need internet access. The route table tells both of them "use the Internet Gateway for outbound traffic."

### Step 13 — Create Security Groups

```bash
# Security group for the ALB
ALB_SG=$(aws ec2 create-security-group \
  --group-name deowi-alb-sg \
  --description "ALB security group" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region us-east-1)

# Allow HTTP from internet
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

# Allow HTTPS from internet
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

# Security group for ECS tasks
ECS_SG=$(aws ec2 create-security-group \
  --group-name deowi-ecs-sg \
  --description "ECS tasks security group" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text \
  --region us-east-1)

# Allow traffic ONLY from the ALB on port 3000
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG \
  --region us-east-1

echo "ALB Security Group: $ALB_SG"
echo "ECS Security Group: $ECS_SG"
```

**Breaking down the commands:**

| Part | What It Does |
|------|-------------|
| `aws ec2 create-security-group` | Creates a new security group (firewall) |
| `--group-name deowi-alb-sg` | Names the security group |
| `--vpc-id $VPC_ID` | Which VPC this security group belongs to |
| `aws ec2 authorize-security-group-ingress` | Adds an INBOUND rule (what traffic is allowed IN) |
| `--protocol tcp` | Which protocol (TCP for web traffic) |
| `--port 80` | Which port (80 = HTTP, 443 = HTTPS) |
| `--cidr 0.0.0.0/0` | From any IP address |
| `--source-group $ALB_SG` | Only from resources in this security group |

**Two security groups, two purposes:**

```
ALB Security Group (deowi-alb-sg):
  ✅ Port 80  from anywhere (0.0.0.0/0) — HTTP
  ✅ Port 443 from anywhere (0.0.0.0/0) — HTTPS
  ❌ Everything else blocked by default

ECS Security Group (deowi-ecs-sg):
  ✅ Port 3000 from ALB Security Group only
  ❌ Everything else blocked by default
```

**Why `--source-group $ALB_SG` instead of `--cidr 0.0.0.0/0`?** This is the key security trick. Instead of saying "anyone can reach port 3000", we say "only the ALB can reach port 3000." Users must go through the ALB — they can't bypass it and talk directly to your containers.

---

## Phase 4: ECS Cluster, Tasks & Services

### What Is ECS?

**ECS (Elastic Container Service)** is AWS's container orchestration platform. It's the AWS equivalent of Kubernetes, but simpler. When you used the console before and clicked "Create Cluster" and "Create Service", you were using ECS — the console just hid the details.

Here's how ECS works, layer by layer:

```
ECS Cluster: "deowi-cluster"  (a logical group — like a project folder)
│
├── Service: "deowi-web-service"     (manages web tasks — restarts if one dies)
│   ├── Task: web-abc123             (a running container)
│   └── Task: web-def456             (another running container)
│
└── Service: "deowi-worker-service"  (manages worker tasks)
    └── Task: worker-xyz789          (a running container)
```

| Term | What It Means | Real-World Analogy |
|------|--------------|-------------------|
| **Cluster** | A logical grouping for your services | A housing complex — it's the "container" for everything |
| **Task Definition** | A blueprint for running a container (image, CPU, RAM, env vars) | A floor plan — describes what the apartment looks like |
| **Task** | A running instance of a task definition | An occupied apartment — the actual running container |
| **Service** | Maintains a desired number of tasks, restarts if one dies | A property manager — ensures apartments stay occupied |

### What Is Fargate?

**Fargate** is the "serverless" mode for ECS. Instead of managing EC2 instances (virtual machines) to run your containers, you just say "run this container with 0.25 vCPU and 0.5GB RAM" and AWS figures out where to run it.

```
Without Fargate (EC2 mode):
  You create EC2 instances → Install Docker → Run containers on them
  You manage: OS updates, security patches, scaling, monitoring

With Fargate:
  You say "run this container" → AWS handles everything else
  You manage: nothing (just the task definition)
```

### Step 14 — Create the ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name deowi-cluster \
  --region us-east-1
```

| Part | What It Does |
|------|-------------|
| `aws ecs create-cluster` | Creates a new ECS cluster |
| `--cluster-name deowi-cluster` | Names the cluster |
| `--region us-east-1` | Which region to create it in |

This creates an empty cluster — a container for your services. Think of it as naming your deployment environment. The cluster itself does nothing — it's just a label that groups your services together.

### Step 15 — Create the IAM Role for Task Execution

ECS needs permission to pull images from ECR and write logs to CloudWatch. This role gives it that permission.

```bash
# Create the trust policy file
cat > /tmp/ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name deowi-ecs-task-execution-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
  --region us-east-1

# Attach the managed policy (gives ECR pull + CloudWatch write permissions)
aws iam attach-role-policy \
  --role-name deowi-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region us-east-1
```

**What is IAM?**

**IAM (Identity and Access Management)** is AWS's security system. Every action in AWS goes through IAM. It answers two questions:
1. **Who** is requesting the action? (Identity)
2. **Are they allowed** to do it? (Policy)

| Concept | What It Means | Analogy |
|---------|--------------|---------|
| **Identity** | WHO is requesting the action (user, role, service) | A person's ID card |
| **Policy** | WHAT they're allowed to do | A list of permissions |
| **Role** | An IAM identity with attached policies | A job title with defined responsibilities |

**What is a trust policy?**

A trust policy defines WHO can assume this role. Here, we say "only the ECS task execution service (`ecs-tasks.amazonaws.com`) can use this role." No human can assume it — only ECS.

```json
{
  "Effect": "Allow",
  "Principal": {
    "Service": "ecs-tasks.amazonaws.com"  ← WHO can assume this role
  },
  "Action": "sts:AssumeRole"              ← WHAT they can do (assume the role)
}
```

**What is a managed policy?**

`AmazonECSTaskExecutionRolePolicy` is a pre-built AWS policy that gives ECS permission to:
- Pull images from ECR
- Write logs to CloudWatch
- Read secrets from SSM Parameter Store

Instead of writing these permissions yourself, you attach this AWS-managed policy. It's like using a standard employment contract instead of writing one from scratch.

### Step 16 — Store Environment Variables in SSM Parameter Store

Instead of hardcoding secrets in task definitions, we store them in **AWS SSM Parameter Store** (free tier: 10,000 parameters, unlimited requests).

```bash
# Store each env var as a SecureString parameter
aws ssm put-parameter \
  --name "/deowi/NEXT_PUBLIC_SUPABASE_URL" \
  --value "https://hwxbimhcmeefolkrkajw.supabase.co" \
  --type "String" \
  --region us-east-1

aws ssm put-parameter \
  --name "/deowi/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  --value "sb_publishable_YeMbYdzhwRod7Ao929klPg_wobINmU5" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/deowi/SUPABASE_SERVICE_ROLE_KEY" \
  --value "your_service_role_key_here" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/deowi/DEEPGRAM_API_KEY" \
  --value "your_deepgram_key_here" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/deowi/OPENROUTER_API_KEY" \
  --value "your_openrouter_key_here" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/deowi/REDIS_URL" \
  --value "redis://default:your_upstash_password@enabling-bonefish-142686.upstash.io:6379" \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/deowi/NEXT_PUBLIC_SITE_URL" \
  --value "https://deowi.com" \
  --type "String" \
  --region us-east-1
```

| Part | What It Does |
|------|-------------|
| `aws ssm put-parameter` | Stores a value in SSM Parameter Store |
| `--name "/deowi/KEY_NAME"` | The parameter name (path-like structure for organization) |
| `--value "the_value"` | The actual value to store |
| `--type "SecureString"` | Encrypted with AWS KMS (for secrets) |
| `--type "String"` | Plain text (for non-sensitive values like URLs) |

**Why SSM instead of putting secrets in the task definition?**

Task definitions are visible in the AWS Console. Anyone with ECS access could see your API keys. SSM Parameter Store keeps secrets encrypted at rest (AWS KMS) and you grant access via IAM — only the ECS task execution role can read them.

**`SecureString` vs `String`:**
- `SecureString` = encrypted with AWS KMS. Use for API keys, tokens, passwords.
- `String` = plain text. Use for non-sensitive values like URLs.

### Step 17 — Create the Web Task Definition

**File to create:** `task-definition-web.json`

This is the **blueprint** for your web container. It tells ECS: "run this image, with this much CPU/RAM, these environment variables, and connect to these logs."

```json
{
  "family": "deowi-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/deowi-ecs-task-execution-role",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-web:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXT_PUBLIC_SUPABASE_URL",
          "value": "https://hwxbimhcmeefolkrkajw.supabase.co"
        },
        {
          "name": "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          "value": "sb_publishable_YeMbYdzhwRod7Ao929klPg_wobINmU5"
        },
        {
          "name": "NEXT_PUBLIC_SITE_URL",
          "value": "https://deowi.com"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/SUPABASE_SERVICE_ROLE_KEY"
        },
        {
          "name": "DEEPGRAM_API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/DEEPGRAM_API_KEY"
        },
        {
          "name": "OPENROUTER_API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/OPENROUTER_API_KEY"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/REDIS_URL"
        }
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

**Line-by-line explanation:**

| Field | What It Does |
|-------|-------------|
| `"family": "deowi-web"` | The task definition name. You'll reference this when creating services. |
| `"networkMode": "awsvpc"` | Each task gets its own network interface (like giving each container its own network card). Required for Fargate. |
| `"requiresCompatibilities": ["FARGATE"]` | This task runs on Fargate (serverless), not EC2. |
| `"cpu": "256"` | 0.25 vCPU (a quarter of a CPU core). Smallest Fargate size. |
| `"memory": "512"` | 512MB RAM. Enough for a Next.js app serving a small SaaS. |
| `"executionRoleArn"` | The IAM role that gives ECS permission to pull from ECR and write to CloudWatch. **Replace `123456789012` with your AWS Account ID.** |
| `"environment"` | Plain text env vars (non-sensitive). Visible in the Console but contain no secrets. |
| `"secrets"` | Sensitive env vars pulled from SSM Parameter Store at runtime. The ECS agent fetches them when the task starts. Never stored in the task definition. |
| `"logConfiguration"` | Sends container stdout/stderr to CloudWatch Logs. The `awslogs-stream-prefix` differentiates web vs worker logs. |
| `"healthCheck"` | ECS runs this command inside the container every 30 seconds. If it fails 3 times in a row, ECS restarts the container. |

**`environment` vs `secrets`:**

```
environment:                          secrets:
  "value": "hardcoded here"            "valueFrom": "arn:aws:ssm:..."
  ↓                                    ↓
  Stored in the task definition        Pulled from SSM at runtime
  Visible in Console                   Never stored in task definition
  Use for: non-sensitive values        Use for: API keys, tokens, passwords
```

### Step 18 — Create the Worker Task Definition

**File to create:** `task-definition-worker.json`

```json
{
  "family": "deowi-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/deowi-ecs-task-execution-role",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-worker:latest",
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/SUPABASE_SERVICE_ROLE_KEY"
        },
        {
          "name": "DEEPGRAM_API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/DEEPGRAM_API_KEY"
        },
        {
          "name": "OPENROUTER_API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/OPENROUTER_API_KEY"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/deowi/REDIS_URL"
        }
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

**Key differences from the web task:**

| Field | Web | Worker | Why |
|-------|-----|--------|-----|
| `portMappings` | Port 3000 | None | Worker doesn't serve HTTP |
| `healthCheck` | Yes | None | Worker has no HTTP endpoint to check |
| `NEXT_PUBLIC_*` env vars | Yes | No | Worker doesn't serve a browser |
| `image` | deowi-web | deowi-worker | Different ECR repository |

### Step 19 — Register the Task Definitions

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition-web.json \
  --region us-east-1

aws ecs register-task-definition \
  --cli-input-json file://task-definition-worker.json \
  --region us-east-1
```

| Part | What It Does |
|------|-------------|
| `aws ecs register-task-definition` | Uploads the task definition to ECS |
| `--cli-input-json file://task-definition-web.json` | Reads the JSON file as input |

**What does "register" mean?** It uploads the blueprint to ECS. It's like saving a template. You can have multiple versions — ECS always runs the latest registered version. If you update the task definition later, you register a new version and ECS uses that one.

### Step 20 — Create the Web Service

```bash
aws ecs create-service \
  --cluster deowi-cluster \
  --service-name deowi-web-service \
  --task-definition deowi-web \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_A,$SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=ALB_TG_ARN,containerName=web,containerPort=3000" \
  --region us-east-1
```

**Replace `ALB_TG_ARN`** with the target group ARN from Step 23 (you'll create it in Phase 5). You can come back to this step after setting up the ALB.

**Breaking down the command:**

| Part | What It Does |
|------|-------------|
| `--cluster deowi-cluster` | Which cluster to put this service in |
| `--service-name deowi-web-service` | Names the service |
| `--task-definition deowi-web` | Which task definition blueprint to use |
| `--desired-count 2` | Run 2 copies (one in each AZ for high availability) |
| `--launch-type FARGATE` | Run on Fargate (serverless) |
| `--network-configuration` | Which subnets and security group to use |
| `--load-balancers` | Connects this service to the ALB's target group |

**What does `--desired-count 2` mean?** ECS will always try to keep 2 copies of your web container running. If one dies, ECS automatically starts a new one. This is high availability — if one AZ goes down, the other keeps serving traffic.

**What does `--load-balancers` do?** It tells ECS: "When the ALB receives traffic, forward it to port 3000 on these containers." This connects the ALB to your ECS service.

### Step 21 — Create the Worker Service

```bash
aws ecs create-service \
  --cluster deowi-cluster \
  --service-name deowi-worker-service \
  --task-definition deowi-worker \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_A,$SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --region us-east-1
```

**Key differences from the web service:**

| Flag | Web Service | Worker Service | Why |
|------|------------|----------------|-----|
| `--desired-count` | 2 | 1 | Only one worker needed (it's a background processor) |
| `--load-balancers` | Yes | No | Worker has no HTTP endpoint; nothing connects to it |

---

## Phase 5: Application Load Balancer

### What Is an ALB?

An **ALB (Application Load Balancer)** sits in front of your containers and acts as a traffic cop. When you used the console before and clicked "Create Load Balancer", you were creating an ALB — the console just hid the details.

```
User's browser
      │
      │ "GET https://deowi.com"
      ▼
┌─────────────────────┐
│   ALB                │
│                      │
│  Listens on:         │
│    Port 80 (HTTP)   │  ← catches all HTTP traffic
│    Port 443 (HTTPS) │  ← catches all HTTPS traffic
│                      │
│  Forwards to:        │
│    Target Group      │──→ Web Container 1 (10.0.1.45:3000)
│    (deowi-web-tg)    │──→ Web Container 2 (10.0.2.33:3000)
└─────────────────────┘
```

**What the ALB does:**
- Listens on ports 80 (HTTP) and 443 (HTTPS)
- Forwards requests to your containers based on rules
- Handles SSL termination (decrypts HTTPS before passing to your app)
- Distributes traffic across multiple containers/AZs
- Provides a single entry point for users
- Health checks — stops sending traffic to unhealthy containers

Without an ALB, users would need to know which specific container to connect to. The ALB abstracts that away — users connect to the ALB, and the ALB figures out which container to use.

### What Is a Target Group?

A **target group** tells the ALB where to send traffic. It's a list of healthy containers that the ALB can forward requests to.

```
ALB
 │
 └──→ Target Group: "deowi-web-tg"
        ├── Target: 10.0.1.45:3000 (healthy ✓)
        ├── Target: 10.0.2.33:3000 (healthy ✓)
        └── Target: 10.0.1.78:3000 (unhealthy ✗ — stopped sending traffic)
```

**Why `--target-type ip`?** Fargate tasks get their own IP addresses (unlike EC2, where multiple containers share one IP). So the target group tracks individual task IPs.

### What Is a Listener?

A **listener** watches for traffic on a specific port and protocol. It's the "ear" of the ALB — it listens for incoming connections and decides what to do with them.

```
Listener 1: Port 80 (HTTP)
  → Action: Redirect to HTTPS (port 443)

Listener 2: Port 443 (HTTPS)
  → Action: Forward to Target Group (deowi-web-tg)
```

### Step 22 — Create the ALB

```bash
# Create the ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name deowi-alb \
  --subnets $SUBNET_A $SUBNET_B \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region us-east-1)

echo "ALB ARN: $ALB_ARN"

# Wait for it to be active (takes ~1 minute)
aws elbv2 wait load-balancer-available \
  --load-balancer-arns $ALB_ARN \
  --region us-east-1

# Get the ALB DNS name (this is what users will connect to)
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region us-east-1)

echo "ALB DNS: $ALB_DNS"
```

**Breaking down the command:**

| Part | What It Does |
|------|-------------|
| `aws elbv2 create-load-balancer` | Creates a new load balancer |
| `--name deowi-alb` | Names the load balancer |
| `--subnets $SUBNET_A $SUBNET_B` | Which subnets to put it in (must be 2+ different AZs) |
| `--security-groups $ALB_SG` | Which security group to apply (the one that allows 80/443) |
| `--scheme internet-facing` | This ALB is accessible from the internet (not internal) |
| `--type application` | Application Load Balancer (handles HTTP/HTTPS) |
| `aws elbv2 wait load-balancer-available` | Waits until the ALB is fully created (~1 min) |
| `aws elbv2 describe-load-balancers` | Gets details about the ALB (we extract the DNS name) |

**Copy the ALB DNS name** — you'll point your domain to this. It looks like: `deowi-alb-1234567890.us-east-1.elb.amazonaws.com`

### Step 23 — Create Target Groups

```bash
# Target group for the web service
TG_ARN=$(aws elbv2 create-target-group \
  --name deowi-web-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region us-east-1)

echo "Target Group ARN: $TG_ARN"
```

**Breaking down the command:**

| Part | What It Does |
|------|-------------|
| `aws elbv2 create-target-group` | Creates a new target group |
| `--name deowi-web-tg` | Names the target group |
| `--protocol HTTP` | Targets serve HTTP traffic |
| `--port 3000` | Targets listen on port 3000 (your Next.js app) |
| `--vpc-id $VPC_ID` | Which VPC this target group belongs to |
| `--target-type ip` | Track individual task IPs (Fargate requirement) |
| `--health-check-path "/"` | Check health by hitting `http://container:3000/` |
| `--health-check-interval-seconds 30` | Check every 30 seconds |
| `--health-check-timeout-seconds 5` | Wait 5 seconds for a response |
| `--healthy-threshold-count 2` | Need 2 successful checks to mark as healthy |
| `--unhealthy-threshold-count 3` | Need 3 failed checks to mark as unhealthy |

**How health checks work:**

```
Every 30 seconds:
  ALB sends GET http://container-ip:3000/
  │
  ├── Response within 5 seconds? → Success (+1)
  │   └── 2 successes in a row → Mark as HEALTHY ✓
  │
  └── No response or error? → Failure (+1)
      └── 3 failures in a row → Mark as UNHEALTHY ✗
                                → Stop sending traffic
                                → ECS restarts the container
```

### Step 24 — Create Listeners

```bash
# HTTP listener (port 80) — redirects to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region us-east-1

# HTTPS listener (port 443) — forwards to target group
# (You need the ACM certificate ARN from Phase 8 first — come back to this)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=ACM_CERT_ARN \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region us-east-1
```

**Replace `ACM_CERT_ARN`** with the certificate ARN from Step 29 (Phase 8).

**Breaking down the commands:**

| Part | What It Does |
|------|-------------|
| `aws elbv2 create-listener` | Creates a new listener on the ALB |
| `--load-balancer-arn $ALB_ARN` | Which ALB to add this listener to |
| `--protocol HTTP` / `--protocol HTTPS` | Which protocol to listen on |
| `--port 80` / `--port 443` | Which port to listen on |
| `--default-actions Type=redirect` | HTTP listener redirects to HTTPS |
| `--default-actions Type=forward` | HTTPS listener forwards to target group |
| `--certificates CertificateArn=ACM_CERT_ARN` | Which SSL certificate to use |
| `--ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06` | Modern SSL policy (TLS 1.3 + 1.2) |

**What are listeners?** They watch for traffic on a specific port and protocol. The HTTP listener catches all HTTP traffic and redirects it to HTTPS. The HTTPS listener catches HTTPS traffic and forwards it to the web containers via the target group.

### Step 25 — Update the Web Service (if you registered it early)

If you already ran Step 20 before creating the ALB, update the service:

```bash
aws ecs update-service \
  --cluster deowi-cluster \
  --service deowi-web-service \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=web,containerPort=3000" \
  --region us-east-1
```

---

## Phase 6: IAM Roles & Security

### What Is IAM?

**IAM (Identity and Access Management)** is AWS's security system. Every action in AWS goes through IAM. It's the bouncer at the door — it checks WHO is asking and WHETHER they're allowed.

When you created the task execution role in Step 15, you were creating an IAM role. Here's the deeper explanation:

| Concept | What It Means | Analogy |
|---------|--------------|---------|
| **Identity** | WHO is requesting the action (user, role, service) | A person's ID card |
| **Policy** | WHAT they're allowed to do | A list of permissions |
| **Role** | An IAM identity with attached policies | A job title with defined responsibilities |

### How IAM Works

```
Request: "Pull image from ECR"
    │
    ▼
┌─────────────────────┐
│   IAM checks:       │
│                     │
│  1. WHO is asking?  │  → ECS task execution role
│  2. ALLOWED?        │  → Yes (AmazonECSTaskExecutionRolePolicy includes ECR pull)
│                     │
│  Result: ✅ Allow   │
└─────────────────────┘
    │
    ▼
ECR gives the image to ECS
```

### Task Execution Role (Already Created)

We created this in Step 15. It gives ECS permission to:
- Pull images from ECR
- Write logs to CloudWatch
- Read secrets from SSM Parameter Store

### Task Role (Optional but Recommended)

If your containers need to call other AWS services (like S3, DynamoDB, etc.), you'd create a separate "task role." For now, our containers only talk to external services (Supabase, Deepgram, OpenRouter, Redis) via the internet — no special AWS permissions needed.

---

## Phase 7: CloudWatch Logging

### What Is CloudWatch?

**CloudWatch** is AWS's monitoring and logging service. When your containers print to stdout/stderr (like `console.log`), those logs go to CloudWatch. This is essential for debugging — you can't SSH into a Fargate container.

```
Container stdout/stderr
         │
         ▼
┌─────────────────────┐
│  CloudWatch Logs     │
│                      │
│  Log Group:          │
│    /ecs/deowi-web    │  ← all web container logs
│    /ecs/deowi-worker │  ← all worker container logs
│                      │
│  Log Streams:        │
│    web/abc123        │  ← logs from specific task
│    web/def456        │  ← logs from another task
└─────────────────────┘
```

### Step 26 — Create Log Groups

```bash
# Log group for the web service
aws logs create-log-group \
  --log-group-name /ecs/deowi-web \
  --region us-east-1

# Log group for the worker service
aws logs create-log-group \
  --log-group-name /ecs/deowi-worker \
  --region us-east-1

# Set retention (30 days — free tier friendly)
aws logs put-retention-policy \
  --log-group-name /ecs/deowi-web \
  --retention-in-days 30 \
  --region us-east-1

aws logs put-retention-policy \
  --log-group-name /ecs/deowi-worker \
  --retention-in-days 30 \
  --region us-east-1
```

| Part | What It Does |
|------|-------------|
| `aws logs create-log-group` | Creates a container for log streams |
| `--log-group-name /ecs/deowi-web` | Names the log group (matches the task definition) |
| `aws logs put-retention-policy` | Sets how long to keep logs |
| `--retention-in-days 30` | Delete logs after 30 days (saves money) |

**Why set retention?** Without it, logs are kept forever (and cost money). 30 days is enough for debugging while keeping costs low.

### How to View Logs

```bash
# Stream web logs (live — Ctrl+C to stop)
aws logs tail /ecs/deowi-web --follow --region us-east-1

# Stream worker logs
aws logs tail /ecs/deowi-worker --follow --region us-east-1
```

Or use the AWS Console → CloudWatch → Log Groups → `/ecs/deowi-web`.

---

## Phase 8: SSL/HTTPS with ACM

### What Is SSL/HTTPS?

When you visit a website over HTTP (without the S), your browser sends data in plain text. Anyone on the network can read it. **HTTPS** encrypts the connection — that's the padlock icon in the browser.

```
HTTP (insecure):                    HTTPS (secure):
Browser → plain text → Server      Browser → encrypted → Server
         "password: abc123"                  "Xk#9f!m@2p..."
                    ↑ Anyone can read                    ↑ Only you and server can read
```

HTTPS requires an **SSL certificate** — a cryptographic file that proves the server is who it claims to be.

### What Is ACM?

**ACM (AWS Certificate Manager)** provisions and manages SSL/TLS certificates. It's free for certificates used with AWS services (like ALB). Certificates auto-renew — you never think about expiration.

### Step 27 — Request a Certificate

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name deowi.com \
  --subject-alternative-names "www.deowi.com" \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text \
  --region us-east-1)

echo "Certificate ARN: $CERT_ARN"
```

| Part | What It Does |
|------|-------------|
| `aws acm request-certificate` | Requests a new SSL certificate |
| `--domain-name deowi.com` | The main domain for the certificate |
| `--subject-alternative-names "www.deowi.com"` | Additional domains covered by the same certificate |
| `--validation-method DNS` | Prove you own the domain by adding DNS records |

**Why `--subject-alternative-names`?** One certificate can cover multiple domains. We want `deowi.com` AND `www.deowi.com` to both work with the same certificate.

### Step 28 — Get the DNS Records for Validation

```bash
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[*].ResourceRecord.{Name:Name,Type:Type,Value:Value}' \
  --output table \
  --region us-east-1
```

This shows the DNS records you need to add to prove you own the domain:

```
| Name                                     | Type  | Value                                    |
|------------------------------------------|-------|------------------------------------------|
| _abc123.deowi.com                        | CNAME | _def456.acm-validations.aws.             |
| _xyz789.deowi.com                        | CNAME | _ghi012.acm-validations.aws.             |
```

### Step 29 — Add DNS Validation Records

Go to your domain registrar (Namecheap, Cloudflare, etc.) and add these CNAME records:

| Type | Host/Name | Value |
|------|-----------|-------|
| CNAME | `_abc123` | `_def456.acm-validations.aws.` |
| CNAME | `_xyz789` | `_ghi012.acm-validations.aws.` |

The exact values come from Step 28. Make sure to include the trailing dot (`.`) if your DNS provider requires it.

### Step 30 — Wait for Validation

```bash
# Check validation status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.Status' \
  --output text \
  --region us-east-1
```

Wait until the status changes from `PENDING_VALIDATION` to `ISSUED`. This usually takes 5-15 minutes. DNS propagation needs to complete first.

Once issued, use the certificate ARN for the HTTPS listener in Step 24.

---

## Phase 9: Domain & DNS

### What Is DNS?

When you type `deowi.com` in your browser, your computer doesn't know where that is. It asks a DNS server: "What IP address is `deowi.com`?" The DNS server responds with your ALB's DNS name. Your browser then connects to that.

DNS is essentially the internet's phone book — it maps human-readable names to IP addresses.

### What Records Do You Need?

| Record | What It Does |
|--------|-------------|
| CNAME `@` → ALB DNS | `deowi.com` → ALB |
| CNAME `www` → ALB DNS | `www.deowi.com` → ALB |

### Step 31 — Get the ALB DNS Name

```bash
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?LoadBalancerName==`deowi-alb`].DNSName' \
  --output text \
  --region us-east-1
```

This returns something like: `deowi-alb-1234567890.us-east-1.elb.amazonaws.com`

### Step 32 — Point Your Domain to the ALB

Go to your domain registrar and add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `@` | `deowi-alb-1234567890.us-east-1.elb.amazonaws.com` | 300 |
| CNAME | `www` | `deowi-alb-1234567890.us-east-1.elb.amazonaws.com` | 300 |

**Why CNAME and not A record?** AWS ALBs use DNS names (not fixed IPs — they can change). A CNAME record points a name to another name. Some registrars don't allow CNAME on the bare domain (`@`). If yours doesn't, you can use **Route 53** (AWS's DNS service) which handles this with "Alias" records.

**Alternative: Use Route 53 (recommended if your registrar doesn't support bare CNAME)**

```bash
# Create a hosted zone (if you don't have one)
HOSTED_ZONE_ID=$(aws route53 create-hosted-zone \
  --name deowi.com \
  --query 'HostedZone.Id' \
  --output text \
  --region us-east-1)

# Create an Alias A record pointing to the ALB
# (Alias records are like CNAME but work for bare domains)
cat > /tmp/dns-records.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "deowi.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$ALB_DNS",
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text --region us-east-1)",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.deowi.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$ALB_DNS",
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text --region us-east-1)",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/dns-records.json \
  --region us-east-1
```

### Step 33 — Wait for DNS Propagation

```bash
dig deowi.com +short
```

If you see the ALB's DNS name resolved, it's ready. Wait 5-30 minutes.

**What is `dig`?** It's a DNS lookup tool. `dig deowi.com +short` asks DNS "what IP is deowi.com?" and prints just the answer.

---

## Phase 10: Supabase Auth Config

### Why Do This?

When a user clicks "Login with Google", Supabase handles the OAuth flow. After Google authenticates the user, Supabase redirects them back to your app. For security, Supabase only allows redirects to URLs you've explicitly whitelisted.

### Step 34 — Update Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (Deowi)
3. Go to **Authentication** in the left sidebar
4. Click **URL Configuration**
5. Set **Site URL** to: `https://deowi.com`
6. Under **Redirect URLs**, add: `https://deowi.com/auth/callback`
7. Click **Save**

**OAuth callback flow:**
1. User clicks "Login with Google"
2. Supabase redirects to Google
3. Google authenticates the user
4. Google redirects back to Supabase
5. Supabase creates a session
6. Supabase redirects to: `https://deowi.com/auth/callback`
7. Your `app/auth/callback/route.ts` extracts the session and stores it in cookies

Without the callback URL in the allowed list, step 6 fails.

---

## Phase 11: CI/CD with GitHub Actions

### What Is CI/CD?

**CI/CD (Continuous Integration / Continuous Deployment)** automates your deployment pipeline. Instead of manually building Docker images, pushing to ECR, and updating ECS every time you make a change, GitHub Actions does it for you.

```
Before CI/CD (manual):
  Write code → git push → build Docker → push to ECR → update ECS
  (5+ minutes of manual commands every time)

After CI/CD (automatic):
  Write code → git push → ☕ GitHub Actions does everything
  (0 minutes of manual work)
```

### How It Works

```
You push to main
       │
       ▼
┌─────────────────────┐
│  GitHub Actions      │
│                      │
│  1. Checkout code    │
│  2. Login to AWS     │
│  3. Login to ECR     │
│  4. Build web image  │
│  5. Build worker img │
│  6. Push to ECR      │
│  7. Update ECS       │
└─────────────────────┘
       │
       ▼
ECS pulls new images → New containers start → Old ones stop
```

### Step 35 — Create GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add:

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_REGION` | `us-east-1` |
| `ECR_WEB_REPOSITORY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-web` |
| `ECR_WORKER_REPOSITORY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com/deowi-worker` |

### Step 36 — Create the GitHub Actions Workflow

**File to create:** `.github/workflows/deploy.yml`

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
  build-and-deploy:
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

      - name: Build, tag, and push web image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.web -t $ECR_WEB_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_WEB_REPOSITORY:$IMAGE_TAG $ECR_WEB_REPOSITORY:latest
          docker push $ECR_WEB_REPOSITORY:$IMAGE_TAG
          docker push $ECR_WEB_REPOSITORY:latest

      - name: Build, tag, and push worker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.worker -t $ECR_WORKER_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_WORKER_REPOSITORY:$IMAGE_TAG $ECR_WORKER_REPOSITORY:latest
          docker push $ECR_WORKER_REPOSITORY:$IMAGE_TAG
          docker push $ECR_WORKER_REPOSITORY:latest

      - name: Deploy web service to ECS
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WEB_SERVICE \
            --force-new-deployment \
            --region $AWS_REGION

      - name: Deploy worker service to ECS
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_WORKER_SERVICE \
            --force-new-deployment \
            --region $AWS_REGION
```

**Breaking down the workflow:**

| Step | What It Does |
|------|-------------|
| `on: push: branches: [main]` | Triggers on every push to `main` |
| `Checkout code` | Downloads your repo to the GitHub runner |
| `Configure AWS credentials` | Logs in to AWS using your secrets |
| `Login to Amazon ECR` | Gets a Docker login token for ECR |
| `Build, tag, and push` | Builds Docker images, tags with commit SHA + latest, pushes to ECR |
| `Deploy to ECS` | Tells ECS to pull the new images and restart containers |

**Why tag with commit SHA?** `github.sha` is the unique hash of each commit. It creates a permanent identifier for each deployment. If something breaks, you can roll back to a specific commit's image. The `latest` tag is what ECS actually pulls.

**Why `--force-new-deployment`?** Even if the image tag is the same (`latest`), this forces ECS to check for a new image digest and redeploy. Without it, ECS might skip the update if it thinks nothing changed.

### Step 37 — Grant ECR Access to GitHub Actions

Create an IAM user for GitHub Actions:

```bash
# Create the user
aws iam create-user --user-name github-actions-deployer --region us-east-1

# Create the policy
cat > /tmp/github-actions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
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
        "arn:aws:ecr:us-east-1:123456789012:repository/deowi-web",
        "arn:aws:ecr:us-east-1:123456789012:repository/deowi-worker"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name github-actions-deployer \
  --policy-name deowi-deploy-policy \
  --policy-document file:///tmp/github-actions-policy.json \
  --region us-east-1

# Create access keys for the user
aws iam create-access-key --user-name github-actions-deployer --region us-east-1
```

**What this policy does:**

| Permission | Why |
|-----------|-----|
| `ecr:GetAuthorizationToken` | Login to ECR |
| `ecr:PutImage`, `ecr:InitiateLayerUpload`, etc. | Push images to ECR |
| `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer` | Pull images (for verification) |
| `ecs:UpdateService` | Tell ECS to redeploy |
| `ecs:DescribeServices` | Check service status |

**Add the access key and secret** from the output to your GitHub Secrets (the same `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from Step 35).

---

## Updating Your App After Changes

### Automatic (CI/CD)

If you set up GitHub Actions (Phase 11), just push to `main`:

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

GitHub Actions handles the rest — builds, pushes to ECR, deploys to ECS. Check the Actions tab in your repo to monitor progress.

### Manual (if not using CI/CD)

```bash
# On your local machine
# Build new images
docker build -f Dockerfile.web -t deowi-web .
docker build -f Dockerfile.worker -t deowi-worker .

# Tag for ECR
docker tag deowi-web:latest $ECR_WEB:latest
docker tag deowi-worker:latest $ECR_WORKER:latest

# Push to ECR
docker push $ECR_WEB:latest
docker push $ECR_WORKER:latest

# Force ECS to pull new images
aws ecs update-service --cluster deowi-cluster --service deowi-web-service --force-new-deployment --region us-east-1
aws ecs update-service --cluster deowi-cluster --service deowi-worker-service --force-new-deployment --region us-east-1
```

---

## Reference: AWS CLI Commands

```bash
# --- ECS ---
aws ecs list-clusters --region us-east-1
aws ecs list-services --cluster deowi-cluster --region us-east-1
aws ecs describe-services --cluster deowi-cluster --services deowi-web-service --region us-east-1
aws ecs list-tasks --cluster deowi-cluster --region us-east-1
aws ecs describe-tasks --cluster deowi-cluster --tasks TASK_ID --region us-east-1

# --- Logs ---
aws logs tail /ecs/deowi-web --follow --region us-east-1
aws logs tail /ecs/deowi-worker --follow --region us-east-1

# --- ALB ---
aws elbv2 describe-load-balancers --region us-east-1
aws elbv2 describe-target-health --target-group-arn $TG_ARN --region us-east-1

# --- Scaling ---
aws ecs update-service --cluster deowi-cluster --service deowi-web-service --desired-count 3 --region us-east-1

# --- Deploy updates ---
aws ecs update-service --cluster deowi-cluster --service deowi-web-service --force-new-deployment --region us-east-1

# --- Debugging ---
aws ecs describe-services --cluster deowi-cluster --services deowi-web-service --query 'services[0].{status:status,events:events}' --region us-east-1
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Service shows 0 running tasks | Task definition wrong or IAM role missing | Check `aws ecs describe-services` for error events |
| Tasks keep stopping immediately | Container crash (check CloudWatch) | `aws logs tail /ecs/deowi-web --follow` to see the error |
| ALB returns 502 Bad Gateway | No healthy targets | Check target health: `aws elbv2 describe-target-health --target-group-arn $TG_ARN` |
| ALB returns 503 Service Unavailable | No targets registered | Ensure ECS service has `--load-balancers` configured |
| Auth redirect loop | Supabase URL config wrong | Verify Site URL is `https://deowi.com` and callback URL is `https://deowi.com/auth/callback` |
| Container can't connect to Redis | `REDIS_URL` is wrong or SSM parameter missing | Check SSM: `aws ssm get-parameter --name /deowi/REDIS_URL --with-decryption` |
| Tasks stuck in PENDING | Not enough resources or subnets | Check subnets have internet access; check CPU/memory limits |
| SSL certificate not issued | DNS validation not complete | Run `aws acm describe-certificate` and check status |
| DNS not resolving | DNS not propagated | Wait 5-30 minutes. Check with `dig deowi.com +short` |
| ECR push fails | Not authenticated or wrong region | Re-run the `aws ecr get-login-password` command; ensure same region |
| GitHub Actions fails | Missing or wrong secrets | Verify all GitHub secrets match your AWS credentials |

---

## Cost Estimate

### Monthly Cost (Fargate — Always Running)

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| **Fargate (web)** | 2 tasks × 0.25 vCPU × 0.5GB | ~$15 |
| **Fargate (worker)** | 1 task × 0.25 vCPU × 0.5GB | ~$7.50 |
| **ALB** | Always-on load balancer + LCU charges | ~$16 + data |
| **ECR** | 500MB free, then $0.10/GB | ~$0 |
| **CloudWatch Logs** | 5GB ingestion free tier | ~$0-2 |
| **SSM Parameter Store** | 10,000 params free | ~$0 |
| **Route 53** (if used) | Hosted zone + queries | ~$1 |
| **N/A — No NAT Gateway** | (public subnets only) | $0 |
| **Total** | | **~$40-42/month** |

### Cost Optimization Tips

| Tip | Savings |
|-----|---------|
| Use **Spot Fargate** for the worker (non-critical) | ~60-70% off Fargate price |
| Scale web to **1 task** during low traffic | Saves ~$7.50/mo |
| Use **Graviton** (ARM) images | ~20% cheaper Fargate |
| Set CloudWatch log retention to **7 days** | Keeps storage costs at $0 |

### Compared to DigitalOcean

| | DigitalOcean | AWS ECS Fargate |
|---|---|---|
| **Monthly cost** | ~$12/mo | ~$40/mo |
| **What you manage** | OS, Docker, SSL, everything | Nothing (serverless) |
| **Scaling** | Manual (bigger droplet) | Automatic (task count) |
| **High availability** | Single server (SPOF) | Multi-AZ by default |
| **Resume value** | Basic DevOps | Cloud-native DevOps |

**For a resume project, the extra $28/month is worth it.** You demonstrate VPC design, ECS orchestration, ALB configuration, IAM security, CI/CD pipelines, and CloudWatch observability — skills that are directly applicable to production jobs.
