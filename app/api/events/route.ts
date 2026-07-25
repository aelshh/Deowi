import { createClient } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";
import { getRedisSubscriber } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      sendEvent({ type: "connected" });

      const redis = getRedisSubscriber();

      const channel = "media-updates";

      await redis.subscribe(channel);

      const onMessage = (redisChannel: string, message: string) => {
        if (redisChannel !== channel) {
          return;
        }
        try {
          const event = JSON.parse(message);

          if (event.userId !== user.id) {
            return;
          }

          sendEvent({
            type: "status-change",
            postId: event.postId,
            status: event.status,
          });
        } catch (err) {
          console.error("SSE: malformed Redis message:", message, err);
        }
      };

      redis.on("message", onMessage);

      const heartbeat = setInterval(() => {
        sendEvent({ type: "heartbeat" });
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        redis.off("message", onMessage);
        redis.unsubscribe(channel);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
