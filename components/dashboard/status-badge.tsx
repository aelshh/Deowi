import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  generating: { label: "Generating", className: "bg-yellow-500/10 text-yellow-500" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-500" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
};

export function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        config.className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "completed" && "bg-green-500",
          status === "generating" && "animate-pulse bg-yellow-500",
          status === "failed" && "bg-destructive",
          status === "pending" && "bg-muted-foreground",
        )}
      />
      {config.label}
    </span>
  );
}
