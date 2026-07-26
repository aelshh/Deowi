<div align="center">

# Deowi

**Turn recordings into marketing kits.**

Upload any recording — podcast, meeting, lecture — and get a blog post, newsletter, social hooks, and chapters in seconds.

[![CI/CD](https://github.com/anomalyco/deowi/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/anomalyco/deowi/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#)

[deowi.tech](https://deowi.tech)

</div>

---

## What Deowi Does

Deowi is a full-stack web application that automates content repurposing from audio/video recordings. Upload a file and Deowi handles the rest — transcription, AI-powered content generation, and a polished dashboard to manage everything.

### Features

- **Drag & Drop Upload** — Direct-to-storage upload via presigned URLs (up to 50 MB, audio/video)
- **AI Transcription** — Deepgram Nova-3 with speaker diarization and smart formatting
- **Content Generation** — Multi-provider AI pipeline with automatic failover:
  - Blog posts (1500–3500 words, scaled to transcript length)
  - Newsletters (< 300 words with subject lines, hooks, CTAs)
  - X/Twitter hooks (5 standalone tweets under 280 chars)
  - LinkedIn hooks (3–6 sentence professional posts)
  - Auto-generated chapter timeline with timestamps
  - Downloadable SRT subtitles
- **Real-time Updates** — SSE-powered live status on the dashboard
- **Dark / Light Mode** — System-preference default with manual toggle
- **Authentication** — Email/password + Google & GitHub OAuth via Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| UI | shadcn/ui, Tailwind CSS v4, Framer Motion |
| Auth & DB | Supabase (Auth, PostgreSQL, Storage) |
| AI | Vercel AI SDK + OpenRouter (Nemotron), Groq (Llama 3.3), Google (Gemini 2.0 Flash) |
| Transcription | Deepgram Nova-3 |
| Job Queue | BullMQ + Redis (Upstash) |
| Deployment | Docker, AWS ECS Fargate, GitHub Actions CI/CD |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│  BullMQ      │────▶│   Worker     │
│   Web App    │     │  Queues      │     │   Service    │
│              │     │              │     │              │
│  - Landing   │     │  - Transcr.  │     │  - Deepgram  │
│  - Dashboard │     │  - AI Gen    │     │  - AI Gen    │
│  - Upload    │     │  - DB Save   │     │  - DB Save   │
│  - SSE       │     └──────────────┘     └──────────────┘
└──────┬───────┘              │                    │
       │                      ▼                    ▼
       │               ┌──────────────┐     ┌──────────────┐
       │               │    Redis     │     │   Supabase   │
       │               │  (Upstash)   │     │  (Postgres + │
       │               │              │     │   Storage)   │
       │               └──────────────┘     └──────────────┘
       │
       ▼
  ┌──────────────┐
  │   Browser    │
  │   (SSE)      │
  └──────────────┘
```

### Processing Pipeline

```
Upload ──▶ Presigned URL ──▶ Upload Complete ──▶ Enqueue Job
                                                       │
         ┌─────────────────────────────────────────────┘
         ▼
   Transcription (Deepgram Nova-3)
         │
         ▼
   AI Generation (Nemotron → Llama 3.3 → Gemini fallback chain)
         │
         ▼
   Save to Supabase ──▶ SSE Update to Dashboard
```

## Getting Started

### Prerequisites

- Node.js 20+
- Redis instance (local or Upstash)
- Supabase project (Auth, Database, Storage)
- Deepgram API key
- AI provider API key(s) — OpenRouter, Groq, or Google AI Studio

### 1. Clone & Install

```bash
git clone https://github.com/anomalyco/deowi.git
cd deowi
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in the required variables in `.env.local`:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | Yes |
| `DEEPGRAM_API_KEY` | Deepgram API key | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key (primary AI provider) | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key (fallback) | No |
| `GROQ_API_KEY` | Groq API key (fallback) | No |
| `NEXT_PUBLIC_SITE_URL` | Production site URL | No |

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run the Worker (separate terminal)

The worker processes transcription and AI generation jobs:

```bash
cd worker
npm install
npm run dev
```

> **Note:** Both the web app and worker must be running for the full processing pipeline to work.

## Project Structure

```
deowi/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (upload, SSE, webhooks)
│   ├── auth/               # Login, signup, OAuth callback
│   ├── dashboard/          # Media list, marketing kit views
│   └── page.tsx            # Landing page
├── actions/                # Server actions (auth)
├── components/
│   ├── auth/               # Login/signup forms
│   ├── dashboard/          # Dashboard UI (upload, grid, sidebar)
│   ├── landing/            # Marketing site sections
│   └── ui/                 # shadcn/ui + custom components
├── lib/
│   ├── ai/                 # AI prompt templates & generation
│   ├── deepgram/           # Transcription wrapper
│   ├── media/              # Processing pipeline steps
│   ├── queue/              # BullMQ queue definitions
│   ├── dal.ts              # Data access layer
│   ├── redis.ts            # Redis connections
│   └── server.ts           # Supabase server client
├── worker/                 # BullMQ worker service
│   ├── index.ts            # Worker logic
│   ├── start.ts            # Entry point
│   └── preload.ts          # Env preload
├── docker/                 # Dockerfiles (web + worker)
└── .github/workflows/      # CI/CD pipeline
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-url` | Generate a presigned upload URL |
| `POST` | `/api/upload-complete` | Trigger processing pipeline after upload |
| `GET` | `/api/events` | SSE stream for real-time status updates |
| `POST` | `/api/webhooks` | Webhook receiver (placeholder) |

## Deployment

### Docker

```bash
# Build web image
docker build -f docker/Dockerfile.web -t deowi-web .

# Build worker image
docker build -f docker/Dockerfile.worker -t deowi-worker .
```

### AWS ECS Fargate

Task definitions are included for ECS Fargate deployment:
- `task-definition-web.json` — Web app (256 CPU, 512 MB)
- `task-definition-worker.json` — Worker service (256 CPU, 512 MB)

### CI/CD

GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) runs on push to `main`:

1. Lint & typecheck
2. Docker build & push to ECR
3. Deploy to ECS Fargate
4. Health check verification

## Pricing

| Tier | Price | Uploads/mo | Recording Limit |
|------|-------|-----------|-----------------|
| Free | $0 | 3 | 30 min |
| Pro | $19/mo | 50 | 2 hours |
| Enterprise | $99/mo | Unlimited | Unlimited |

## License

All rights reserved. See [deowi.tech](https://deowi.tech) for details.
