import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FileAudio, ScrollText } from "lucide-react";

type MediaItem = {
  id: string;
  title: string;
  status: "pending" | "generating" | "completed" | "failed";
  created_at: string;
};

export function MediaGrid({ items }: { items: MediaItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-2 border-primary bg-surface px-6 py-16 text-center shadow-[4px_4px_0_0_#0A0A0A]">
        <div className="mb-4 flex size-12 items-center justify-center bg-accent text-accent_foreground shadow-[4px_4px_0_0_#0A0A0A]">
          <FileAudio className="size-6" />
        </div>
        <h3 className="font-heading text-base font-semibold uppercase tracking-tight">No media yet</h3>
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
          <div className="mt-3 flex items-center justify-between">
            <p className="font-mono text-xs text-muted_foreground">
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
          </div>
        </Link>
      ))}
    </div>
  );
}
