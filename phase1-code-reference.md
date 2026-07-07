# Phase 1 — Code Reference

Copy from here by sight. Files to create/edit:

- `lib/queue/worker.ts` — **Replace**
- `app/api/cron/route.ts` — **Create**
- `lib/client.ts` — **Create**
- `components/dashboard/live-media-grid.tsx` — **Create**
- `app/dashboard/page.tsx` — **Edit**
- `.env.local` — **Append**

---

## 1. `lib/queue/worker.ts`

```typescript
import { createAdminClient } from "../server";
import { stepTranscribe } from "../media/step-transcribe";
import { stepAiGenerate } from "../media/step-ai-generate";
import { stepSave } from "../media/step-save";

type PgmqMessage = {
  msg_id: number;
  message: {
    jobId: string;
    postId: string;
    fileUrl: string;
    step: string;
    transcriptionText?: string;
    rawTimeStamp?: unknown;
    kitData?: {
      blogPost: string;
      newsletter: string;
      xHooks: string[];
      linkedinHooks: string[];
      chapters: { timestamp: string; title: string }[];
    };
  };
};

async function handleFailure(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  error: string,
  queueName: string,
  originalMessage: object,
) {
  const { data: job } = await supabase
    .from("processing_jobs")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const newAttempts = (job?.attempts || 0) + 1;
  const isFailed = newAttempts >= (job?.max_attempts || 3);

  const update: Record<string, unknown> = {
    status: isFailed ? "failed" : "pending",
    attempts: newAttempts,
    error,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("processing_jobs")
    .update(update)
    .eq("id", jobId);

  // If retries remain, put the message back in the queue
  if (!isFailed) {
    await supabase.rpc("pgmq_send", {
      queue_name: queueName,
      message: JSON.stringify(originalMessage),
    });
  }
}

export async function processNextJob() {
  const supabase = createAdminClient();

  const { data: messages, error: readError } = await supabase.rpc("pgmq_read", {
    queue_name: "media-queue",
    vt_seconds: 30,
  });

  if (readError) {
    console.error("[worker] pgmq_read error:", readError);
    return { processed: false, error: readError.message };
  }
  if (!messages || messages.length === 0) return { processed: false };

  const msg = messages[0] as PgmqMessage;
  const { jobId, postId, fileUrl, step, ...stepData } = msg.message;

  await supabase
    .from("processing_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    let result;

    switch (step) {
      case "transcribe": {
        result = await stepTranscribe(fileUrl);
        if (result.success) {
          await supabase.rpc("pgmq_send", {
            queue_name: "media-queue",
            message: JSON.stringify({
              jobId,
              postId,
              fileUrl,
              step: "ai_generate",
              transcriptionText: result.transcriptionText,
              rawTimeStamp: result.rawTimeStamp,
            }),
          });
          await supabase
            .from("processing_jobs")
            .update({ step: "ai_generate", status: "queued" })
            .eq("id", jobId);
        } else {
          await handleFailure(supabase, jobId, result.error, "media-queue", msg.message);
        }
        break;
      }

      case "ai_generate": {
        result = await stepAiGenerate(
          stepData.transcriptionText as string,
          stepData.rawTimeStamp as any,
        );
        if (result.success) {
          await supabase.rpc("pgmq_send", {
            queue_name: "media-queue",
            message: JSON.stringify({
              jobId,
              postId,
              step: "save",
              kitData: {
                blogPost: result.blogPost,
                newsletter: result.newsletter,
                xHooks: result.xHooks,
                linkedinHooks: result.linkedinHooks,
                chapters: result.chapters,
              },
            }),
          });
          await supabase
            .from("processing_jobs")
            .update({ step: "save", status: "queued" })
            .eq("id", jobId);
        } else {
          await handleFailure(supabase, jobId, result.error, "media-queue", msg.message);
        }
        break;
      }

      case "save": {
        result = await stepSave(postId, stepData.kitData as any);
        if (result.success) {
          await supabase
            .from("processing_jobs")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", jobId);
        } else {
          await handleFailure(supabase, jobId, result.error, "media-queue", msg.message);
        }
        break;
      }

      default:
        await handleFailure(supabase, jobId, `Unknown step: ${step}`, "media-queue", msg.message);
    }

    await supabase.rpc("pgmq_archive", {
      queue_name: "media-queue",
      msg_id: msg.msg_id,
    });

    return { processed: true };
  } catch (error) {
    console.error("[worker] unexpected error:", error);

    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await supabase.rpc("pgmq_archive", {
      queue_name: "media-queue",
      msg_id: msg.msg_id,
    });

    return { processed: true, error: String(error) };
  }
}
```

---

## 2. `app/api/cron/route.ts`

```typescript
import { NextResponse } from "next/server";
import { processNextJob } from "@/lib/queue/worker";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  for (let i = 0; i < 5; i++) {
    const result = await processNextJob();
    results.push(result);
    if (!result.processed) break;
  }

  return NextResponse.json({ count: results.length });
}
```

---

## 3. `lib/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

---

## 4. `components/dashboard/live-media-grid.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FileAudio, ScrollText } from "lucide-react";

type MediaItem = {
  id: string;
  title: string;
  status: "pending" | "generating" | "completed" | "failed";
  created_at: string;
};

export function LiveMediaGrid({
  initialItems,
  userId,
}: {
  initialItems: MediaItem[];
  userId: string;
}) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("media-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "media_posts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as MediaItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? (payload.new as MediaItem)
                  : item,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-2 border-primary bg-surface px-6 py-16 text-center shadow-[4px_4px_0_0_#0A0A0A]">
        <div className="mb-4 flex size-12 items-center justify-center bg-accent text-accent_foreground shadow-[4px_4px_0_0_#0A0A0A]">
          <FileAudio className="size-6" />
        </div>
        <h3 className="font-heading text-base font-semibold uppercase tracking-tight">
          No media yet
        </h3>
        <p className="mt-1 text-sm text-muted_foreground">
          Upload your first recording to generate a marketing kit.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-0 border-2 border-primary sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={
            item.status === "completed"
              ? `/dashboard/kits/${item.id}`
              : "#"
          }
          className="group relative bg-surface p-5 transition-all hover:bg-muted/50 border-b-2 border-primary sm:border-b-2 sm:border-r-2 sm:border-primary last:border-b-0 sm:last:border-r-0 [&:nth-last-child(-n+3)]:border-b-0"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center bg-accent text-accent_foreground shadow-[2px_2px_0_0_#0A0A0A]">
              <FileAudio className="size-4" />
            </div>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm font-medium line-clamp-2">{item.title}</p>
          <p className="mt-3 font-mono text-xs text-muted_foreground">
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {item.status === "completed" && (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-medium uppercase tracking-[0.1em] text-accent opacity-0 transition-opacity group-hover:opacity-100">
              <ScrollText className="size-3.5" />
              View kit
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
```

---

## 5. `app/dashboard/page.tsx` — Edits

**Old `MediaList` function:**
```typescript
async function MediaList() {
  const media = await getUserMedia();
  return <MediaGrid items={media} />;
}
```

**Replace with:**
```typescript
async function MediaList() {
  const media = await getUserMedia();
  const { user } = await verifySession();
  return <LiveMediaGrid initialItems={media} userId={user.id} />;
}
```

**Imports to update at top:**
```typescript
import { LiveMediaGrid } from "@/components/dashboard/live-media-grid";
```
(Remove the old `MediaGrid` import.)

---

## 6. `.env.local` — Append

```
CRON_SECRET=pick-any-random-password-here
```
