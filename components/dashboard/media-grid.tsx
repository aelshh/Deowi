"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FileAudio, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";

type MediaItem = {
  id: string;
  title: string;
  status: "pending" | "generating" | "completed" | "failed";
  created_at: string;
};

export function MediaGrid({
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
      .channel("media-channel")
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
            setItems((prev) => [...prev, payload.new as MediaItem]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as MediaItem) : item,
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-surface/50 px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <FileAudio className="size-6" />
        </div>
        <h3 className="text-base font-semibold">
          No media yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your first recording to generate a marketing kit.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={
            item.status === "completed" ? `/dashboard/kits/${item.id}` : "#"
          }
          className="group relative rounded-2xl border border-border/50 bg-surface/50 p-5 transition-all duration-200 hover:border-border hover:bg-surface"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-lg rounded-xl bg-accent/10 text-accent">
              <FileAudio className="size-4" />
            </div>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm font-medium line-clamp-2">{item.title}</p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {item.status === "completed" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <ScrollText className="size-3.5" />
                View kit
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
