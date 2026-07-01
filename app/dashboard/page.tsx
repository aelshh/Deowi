import { Suspense } from "react";
import { getUserMedia, verifySession } from "@/lib/dal";
import { MediaGrid } from "@/components/dashboard/media-grid";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { Header } from "@/components/dashboard/header";

async function MediaList() {
  const media = await getUserMedia();
  return <MediaGrid items={media} />;
}

export default async function DashboardPage() {
  const { email, user } = await verifySession();
  const userName = user.user_metadata?.full_name as string | undefined;

  return (
    <>
      <Header title="Media" userEmail={email} userName={userName} />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Upload a recording to generate a marketing kit.
          </p>
          <UploadDialog />
        </div>
        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse border-2 border-[#0A0A0A] bg-[#E5E4DE]/50"
                />
              ))}
            </div>
          }
        >
          <MediaList />
        </Suspense>
      </div>
    </>
  );
}
