# AWS ElastiCache Migration Guide

## From Upstash to Production-Grade Redis

---

## Quick Start (For Experienced Users)

1. **Create Cluster:** AWS Console → ElastiCache → Create Redis cluster (t2.micro, single node, us-east-1)
2. **Get Endpoint:** Copy the endpoint from cluster details (format: `xxxx.cache.amazonaws.com`)
3. **Update .env.local:** `REDIS_URL=redis://default:your-auth-token@endpoint:6379`
4. **Test:** Run your worker, trigger a job, verify it processes
5. **Deploy:** Update SSM Parameter Store with new URL, redeploy ECS tasks

**Estimated Time:** 15-20 minutes  
**Cost:** Free for 12 months (750 hrs/month)

---

## Introduction

### What is Redis?
Redis is an in-memory data store. Your project uses it to power **BullMQ job queues** — when a user uploads media, Redis stores the job temporarily until your worker processes it.

### Why Move from Upstash to ElastiCache?

| Feature | Upstash Free | AWS ElastiCache Free |
|---------|-------------|---------------------|
| **Commands/day** | 500,000 | Unlimited |
| **Storage** | 256 MB | 20 GB |
| **Latency** | 5-50ms (HTTP) | <1ms (TCP) |
| **Cost** | Free | Free (12 months) |
| **Management** | None (serverless) | None (AWS manages) |

### What You'll Build
- A Redis cluster on AWS
- Connect your existing BullMQ queues to it
- Keep everything running for $0/month

---

## Step 1: Create AWS ElastiCache Cluster

### 1.1 Log into AWS Console
1. Go to https://console.aws.amazon.com
2. Sign in (create account if needed)
3. Search for "ElastiCache" in the top search bar

### 1.2 Create Cluster
1. Click **Create cluster**
2. Select **Redis** as the engine
3. Choose **Cluster mode: Disabled** (single node)
4. Click **Next**

### 1.3 Configure Settings
Fill in these fields:
- **Cluster name:** `deowi-redis` (or any name you like)
- **Description:** `Redis for resume project`
- **Engine version:** 7.x (latest)
- **Port:** 6379 (default)
- **Node type:** `cache.t2.micro` (free tier eligible)

### 1.4 Security & Networking
- **Subnet group:** Create new (or use default VPC)
- **Security group:** Create new, or select existing
- **Important:** Your security group MUST allow inbound traffic on port 6379

To create a security group:
1. Go to VPC → Security Groups → Create
2. Name: `redis-access`
3. Inbound rule: Type=Custom TCP, Port=6379, Source=Your IP (or 0.0.0.0/0 for testing)
4. Attach this security group to your ElastiCache cluster

### 1.5 Advanced Settings
- **Auth token:** Leave empty (we'll connect without password for now)
- **Backup:** Disable (not needed for resume project)
- **Maintenance:** Leave defaults

### 1.6 Create
1. Click **Create**
2. Wait 2-3 minutes for status to become **Available**
3. Copy the **Endpoint** (looks like: `deowi-redis.xxxx.cache.amazonaws.com`)

---

## Step 2: Get Connection Details

You now have:
- **Endpoint:** `deowi-redis.xxxx.cache.amazonaws.com`
- **Port:** 6379
- **Auth token:** None (or the one you set)

Test the connection:
```bash
# Install Redis CLI if you don't have it
# Windows: choco install redis-64
# Mac: brew install redis
# Linux: sudo apt install redis-tools

redis-cli -h deowi-redis.xxxx.cache.amazonaws.com -p 6379
# Type PING, should return PONG
```

---

## Step 3: Update Your Code

### 3.1 Understanding Your Current Setup

Your project uses `lib/queue/queue.ts` which connects to Redis using `REDIS_URL`. Currently, your URL looks like:
```
redis://default:gQAAAAAAAeXgAAIgcDJmYTBlNWRiMmZlNDU0NmMyOWVjMjE5YmZkZDc2YzVkMg@master-bluebird-124384.upstash.io:6379
```

With ElastiCache, you don't need auth token (if you didn't set one), so your new URL will be simpler.

### 3.2 Update .env.local

Add this line to your `.env.local`:
```env
REDIS_URL=redis://deowi-redis.xxxx.cache.amazonaws.com:6379
```

**Note:** If you set an auth token during cluster creation, include it:
```env
REDIS_URL=redis://default:your-auth-token@deowi-redis.xxxx.cache.amazonaws.com:6379
```

### 3.3 Understanding the Connection Code

Let me explain what `lib/queue/queue.ts` does:

```typescript
// This is what your current code likely looks like
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,  // BullMQ requires this
  enableReadyCheck: false,     // Skip initial PING test
});
```

**What changed:**
- **Upstash:** Uses HTTP under the hood (slower, counted per request)
- **ElastiCache:** Uses direct TCP connection (faster, unlimited)

**No code changes needed!** Your `REDIS_URL` format works for both Upstash and ElastiCache.

---

## Step 4: Test Locally

### 4.1 Run Your Worker
```bash
# Terminal 1 - Start the worker
npm run worker
```

You should see output like:
```
Worker started
Waiting for jobs...
```

### 4.2 Trigger a Job
1. Start your web app: `npm run dev`
2. Upload a test media file
3. Watch the worker terminal — it should process the job

### 4.3 Verify in Redis CLI
```bash
# Open another terminal
redis-cli -h deowi-redis.xxxx.cache.amazonaws.com -p 6379

# Check queue lengths
LLEN bull:media-transcription:wait
LLEN bull:media-aiProcessing:wait
LLEN bull:media-saving:wait
```

If you see numbers (even 0), your queues are connected.

---

## Step 5: Update Production (AWS ECS)

### 5.1 Update SSM Parameter Store
1. Go to AWS Systems Manager → Parameter Store
2. Find parameter: `arn:aws:ssm:us-east-1:626185423401:parameter/deowi/REDIS_URL`
3. Click **Edit**
4. Update value to your new ElastiCache URL
5. Click **Save**

### 5.2 Redeploy ECS Tasks
```bash
# If using AWS CLI
aws ecs update-service \
  --cluster deowi-cluster \
  --service web-service \
  --force-new-deployment

aws ecs update-service \
  --cluster deowi-cluster \
  --service worker-service \
  --force-new-deployment
```

Or redeploy from AWS Console:
1. Go to ECS → Clusters → your cluster
2. Select each service → Update → Force new deployment

---

## Troubleshooting

### Error: "Connection refused"
**Cause:** Security group blocking traffic
**Fix:**
1. Check security group allows inbound on port 6379
2. Ensure ElastiCache and ECS are in same VPC (or peered)

### Error: "ETIMEDOUT"
**Cause:** Wrong endpoint or region
**Fix:**
1. Verify endpoint is correct (no typos)
2. Check cluster is in `us-east-1` (same as your ECS)

### Error: "NOAUTH Authentication required"
**Cause:** You set an auth token but didn't include it in URL
**Fix:**
```env
REDIS_URL=redis://default:your-auth-token@endpoint:6379
```

### Error: "ECONNRESET"
**Cause:** TLS required but not configured
**Fix:** Add TLS to your connection:
```typescript
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},  // Enable TLS
});
```

---

## Cleanup (After 12 Months)

### Delete ElastiCache Cluster
1. Go to ElastiCache → Clusters
2. Select your cluster
3. Click **Delete**
4. Confirm deletion

### Delete Security Group
1. Go to VPC → Security Groups
2. Select `redis-access`
3. Actions → Delete

**Note:** You have 750 free hours/month = ~31 days of continuous running. For a resume project used occasionally, you'll stay well under the limit.

---

## Cost Summary

### Free Tier (12 months):
- **ElastiCache:** $0 (750 hrs/month of t2.micro)
- **Data transfer:** $0 (within same region)

### After Free Tier:
- **t2.micro:** ~$12-15/month (24/7)
- **t3.small:** ~$25/month

### Your Usage:
- Running only when you test (maybe 5-10 hours/month)
- **Actual cost: $0 for 12 months, then ~$2-3/month**

---

## What You Learned

1. **AWS ElastiCache** — Managed Redis service
2. **Security Groups** — Firewall rules for AWS resources
3. **VPC Networking** — How AWS services connect
4. **Redis Connection** — URL format and configuration
5. **SSM Parameters** — Secure storage for secrets

This knowledge is valuable for production applications and shows on your resume that you understand cloud infrastructure.

---

## Next Steps

1. **Monitor usage:** AWS Console → ElastiCache → Metrics
2. **Set up billing alerts:** AWS Console → Billing → Budgets
3. **Learn about clustering:** When you need high availability

---

**Questions?** Check the troubleshooting section or search the error message online.