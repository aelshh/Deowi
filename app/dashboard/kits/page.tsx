import { Suspense } from "react";
import { getUserMedia, verifySession } from "@/lib/dal";
import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import Link from "next/link";
import { ScrollText } from "lucide-react";

async function KitsList() {
  const media = await getUserMedia();
  const completed = media.filter((m) => m.status === "completed");

  if (completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-surface/50 px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <ScrollText className="size-6" />
        </div>
        <h3 className="text-base font-semibold">
          No marketing kits yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and process media to generate marketing kits.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {completed.map((item) => (
        <Link
          key={item.id}
          href={`/dashboard/kits/${item.id}`}
          className="group relative rounded-2xl border border-border/50 bg-surface/50 p-5 transition-all duration-200 hover:border-border hover:bg-surface"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ScrollText className="size-4" />
            </div>
            <StatusBadge status="completed" />
          </div>
          <p className="text-sm font-medium line-clamp-2">{item.title}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default async function KitsPage() {
  const { email, user } = await verifySession();
  const userName = user.user_metadata?.full_name as string | undefined;

  return (
    <>
      <Header title="Marketing Kits" userEmail={email} userName={userName} />
      <div className="flex-1 space-y-6 p-6">
        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-muted/30"
                />
              ))}
            </div>
          }
        >
          <KitsList />
        </Suspense>
      </div>
    </>
  );
}
