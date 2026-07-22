# Deowi Architecture Plan — Scalable Media Processing Pipeline

## Current Architecture Problems

1. **Fire-and-forget server action** — `processMedia()` runs in the same Node.js process, un-await'd. On serverless (Vercel), the function can be **terminated arbitrarily** after the response is sent, dropping jobs silently.

2. **Monolithic sync chain** — Transcribe → AI generate → save DB all happen sequentially in one function. No parallelism, no retries, no partial-failure recovery.

3. **No job queue** — If Deepgram rate-limits you or Gemini times out, the entire pipeline fails with no retry mechanism.

4. **Server-mediated upload** — Files go through Next.js `serverActions` with a 100MB limit, tying up serverless function duration during upload.

5. **No CDN for media** — Supabase Storage URLs served directly; no edge caching for audio/video or generated content.

6. **Single-region** — Everything runs in one Supabase region + one cloud function region.

---

## Recommended Architecture3

### 1. Direct-to-Storage Upload (Presigned URLs)

```
Client ──► GET /api/upload-url (returns presigned PUT URL)
          └──► Upload directly to Supabase Storage (bypasses Next.js server)
```

**Why**: Serverless functions have timeout limits (~30s on Vercel Hobby, 300s on Pro, 900s on Enterprise). Large files (2GB) will timeout or consume expensive wall-clock time. Direct uploads are infinitely scalable — you only pay for storage + egress.

**Implementation**: A lightweight API route generates a presigned PUT URL; the client uploads directly using the returned URL.

### 2. Job Queue (Decoupled Workers)

```
Upload complete ──► Queue (BullMQ + Redis) ──► Worker Pool
                                               ├── Transcribe Worker (Deepgram)
                                               ├── AI Generate Worker (Nemotron)
                                               └── Save Results Worker
```

**Why**: Decouples the web server from CPU-bound work. Workers can retry, scale independently, and run in the background without impacting API response times.

**Chosen**: **BullMQ + Redis (Upstash)** — mature, great DX, concurrency control, proven at scale.

### 3. Multi-Step Pipeline (Event-Driven)

```
[Upload Complete] ──► [Transcode/Validate] ──► [Transcribe] ──► [AI Generate] ──► [Save + Notify]
```

Each step is an idempotent handler with its own queue or queue stage:

| Step | Handler | Input | Output | Retry Policy |
|---|---|---|---|---|
| 1. Transcode | FFmpeg worker | Raw file | 16kHz mono WAV | 3 attempts, 10s backoff |
| 2. Transcribe | Deepgram API | Audio URL | Transcript + utterances | 5 attempts, exponential backoff |
| 3. Chunk | Local logic | Full transcript | Chapter-sized chunks | 2 attempts |
| 4. AI Generate | Gemini API | Transcript chunks | Blog, newsletter, hooks, chapters | 3 attempts, 30s backoff |
| 5. Save + Notify | DB write + Realtime | Full kit | Updated status + Realtime event | 3 attempts |

### 4. Worker Pool Architecture

```
                         ┌──────────────────────┐
                         │  Job Queue (BullMQ)   │
                         └──────┬───────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
               ┌────▼───┐ ┌────▼───┐ ┌────▼───┐
               │Worker 1│ │Worker 2│ │Worker N│  (Horizontal scale)
               └────┬───┘ └────┬───┘ └────┬───┘
                    │           │           │
         ┌──────────┤           │           ├──────────┐
         │          │           │           │          │
    ┌────▼────┐ ┌──▼───┐ ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
    │Deepgram │ │Gemini│ │Supabase │ │Supabase │ │ CDN    │
    │Nova-3   │ │ 2.5  │ │ Storage │ │   DB    │ │ Cache  │
    └─────────┘ └──────┘ └─────────┘ └─────────┘ └────────┘
```

- **Workers are stateless** — Pull jobs from the queue, process one step, push the result to the next queue step.
- **Each step separately retryable** — If Deepgram fails, retry just transcribe. If Gemini returns malformed output, retry AI generation.
- **Scale horizontally** — Spin up more worker instances during peak hours.

### 5. Caching & CDN Strategy

| Layer | What to Cache | Where | TTL |
|---|---|---|---|
| **Media files** | Raw uploads, transcoded audio | Supabase Storage CDN (built-in) | Long-lived (until deleted) |
| **AI outputs** | Marketing kits keyed by transcript hash | Redis / Upstash | 24h or until source changes |
| **API responses** | GET /api/kits/* | Edge cache (Vercel CDN / Cloudflare) | 1s SWR + 60s stale |
| **Transcriptions** | Deepgram results keyed by file hash | DB with unique constraint | Permanent |

### 6. Real-time Updates

```
Client ◄── WebSocket / Supabase Realtime ◄── DB Change (status update)
```

Instead of polling, use **Supabase Realtime** (built-in WebSocket support) to push status changes to the dashboard. When a job progresses (`pending` → `generating` → `completed`), the dashboard updates instantly.

**Implementation**: Subscribe to `media_posts` table changes filtered by `user_id` on the dashboard page.

### 7. Rate Limiting & Backpressure

| Limit | Scope | Method |
|---|---|---|
| Max concurrent jobs per user | User-level | Check active jobs count before enqueuing |
| Deepgram API rate limit | Global | Token bucket (e.g., 5 concurrent) |
| Gemini API rate limit | Global | Queue concurrency cap (e.g., 10 concurrent) |
| File size | Global | Reject > 2GB at presigned URL generation |
| Upload frequency | Per-user | Sliding window (e.g., 5 uploads per minute) |

---

## Data Model Changes

### New: `processing_jobs` table

```sql
create table processing_jobs (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references media_posts(id) on delete cascade,
  step        text not null,  -- 'transcode', 'transcribe', 'ai_generate', 'save'
  status      text not null default 'pending',  -- 'pending', 'running', 'completed', 'failed'
  attempts    int not null default 0,
  max_attempts int not null default 3,
  error       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### Modified: `media_posts` table

Add `storage_path` (text) for the Supabase Storage object path.

Add `retry_count` (int) to track overall retries.

---

## High-Level Architecture Diagram

```
┌──────────────┐     Presigned PUT      ┌───────────────────┐
│   Browser     │ ────────────────────►  │ Supabase Storage   │
│  (Dashboard)  │                       │  (CDN-backed)      │
│              │ ◄────────────────────  └────────┬──────────┘
│              │   Status (Realtime WS)          │
└──────┬───────┘                                  │
       │                                          │
       │  POST /api/upload-complete               │ Storage webhook
       ▼                                          ▼
┌────────────────┐                   ┌──────────────────────┐
│   Next.js API   │                  │  Job Queue (BullMQ)   │
│  (lightweight)  │ ──► enqueue ──►  │  (retry, rate-limit)  │
└────────────────┘                   └──────────┬───────────┘
                                                │
                        ┌───────────────────────┤
                        │                       │
                   ┌────▼────┐           ┌──────▼──────┐
                   │ Worker 1 │           │   Worker N   │
                   │ (Node.js)│           │  (Node.js)   │
                   └────┬────┘           └──────┬───────┘
                        │                       │
               ┌────────┼───────────┐           │
               │        │           │           │
          ┌────▼───┐ ┌──▼───┐ ┌────▼────┐      │
          │Deepgram│ │Gemini│ │Supabase │      │
          │ API    │ │ API  │ │DB+Storage│     │
          └────────┘ └──────┘ └─────────┘      │
                                               │
          ┌────────────────────────────────────┘
          │
     ┌────▼────┐
     │ Supabase │
     │  DB      │  (media_posts + marketing_kits updated)
     └─────────┘
```

---

## Implementation Roadmap

### Phase 1: Reliability (immediate)
1. Add `processing_jobs` table migration
2. Replace fire-and-forget `processMedia()` with queue enqueue action
3. Create BullMQ worker service (Node.js, ECS Fargate)
4. Split `process-media.ts` into separate step handlers
5. Add Supabase Realtime subscription to dashboard

### Phase 2: Performance (next)
6. Add presigned URL endpoint for direct uploads
7. Implement AI output caching (transcript hash → kit)
8. Add rate limiting per-user and per-API
9. Implement chunked AI generation for long content

### Phase 3: Scale (future)
10. Switch to dedicated worker service (not serverless functions)
11. Add CDN configuration for media and static outputs
12. Implement transcoding step for format normalization
13. Multi-region deployment

---

## Technology Choices Summary

| Concern | Best Choice (for this stack) | Why |
|---|---|---|
| **File upload** | Supabase Storage signed URLs | Already using Supabase, zero extra infra |
| **Job queue** | BullMQ + Redis (Upstash) | Mature, concurrency control, proven at scale |
| **Workers** | Next.js API routes → dedicated Node service | Incremental migration path |
| **Real-time** | Supabase Realtime subscriptions | Built-in, native WebSocket |
| **CDN** | Supabase Storage built-in CDN + Cloudflare fronting | Global edge caching |
| **AI / transcript cache** | Upstash Redis | Sub-millisecond reads, serverless |
| **Rate limiting** | Upstash Redis + sliding window | Serverless-native, fast |
| **Observability** | Sentry + OpenTelemetry | Trace jobs through pipeline |
| **Payments** | Stripe (when ready) | Industry standard |

---

## Key Principles

- **Every step is idempotent** — Running the same job twice produces the same result
- **Workers are stateless** — Any worker can pick up any job
- **Failures are recoverable** — Each step has its own retry policy
- **The database is the source of truth** — Queue state, job status, all in Postgres
- **The client is notified reactively** — No polling, use Realtime subscriptions
- **Scale vertically first, then horizontally** — Optimize each step before adding more workers
