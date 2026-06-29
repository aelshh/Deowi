import { Suspense } from "react";
import { getUserMedia, verifySession } from "@/lib/dal";
import { MediaTable } from "@/components/dashboard/media-table";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { Header } from "@/components/dashboard/header";

async function MediaList() {
  const media = await getUserMedia();
  return <MediaTable items={media} />;
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
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-muted/50"
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
