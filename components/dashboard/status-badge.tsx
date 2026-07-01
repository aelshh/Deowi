import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Pending", className: "bg-muted text-muted_foreground border-primary" },
  generating: { label: "Generating", className: "bg-accent/10 text-accent border-accent" },
  completed: { label: "Completed", className: "bg-accent text-accent_foreground border-accent" },
  failed: { label: "Failed", className: "bg-accent/10 text-accent border-accent" },
};

export function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em]",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
