import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FileAudio, ScrollText } from "lucide-react";

type MediaItem = {
  id: string;
  title: string;
  status: "pending" | "generating" | "completed" | "failed";
  created_at: string;
};

export function MediaTable({ items }: { items: MediaItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card px-6 py-16 text-center">
        <FileAudio className="mb-4 size-10 text-muted-foreground/50" />
        <h3 className="font-heading text-base font-medium">No media yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your first recording to generate a marketing kit.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40 text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">
              Date
            </th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/20 text-sm transition-colors hover:bg-muted/30 last:border-none"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileAudio className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[200px] md:max-w-xs">
                    {item.title}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3">
                {item.status === "completed" ? (
                  <Link
                    href={`/dashboard/kits/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ScrollText className="size-3.5" />
                    View kit
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
