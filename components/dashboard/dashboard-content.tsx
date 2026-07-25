"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "./header";
import { UploadDialog } from "./upload-dialog";
import { MediaGrid } from "./media-grid";

type MediaItem = {
  id: string;
  title: string;
  status:
    | "pending"
    | "transcribing"
    | "generating"
    | "saving"
    | "completed"
    | "failed";
  created_at: string;
};

function DashboardContent({
  initialItems,
  userId,
  userEmail,
  userName,
}: {
  initialItems: MediaItem[];
  userId: string;
  userEmail: string;
  userName?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);

  const handleUploadSuccess = useCallback((newItem: MediaItem) => {
    setItems((prev) => [newItem, ...prev]);
  }, []);

  const handleUploadResolved = useCallback((tempId: string, realId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === tempId ? { ...item, id: realId } : item)),
    );
  }, []);

  const handleUploadError = useCallback((tempId: string) => {
    setItems((prev) => {
      const failedItem = prev.find((item) => item.id === tempId);

      const updated = prev.map((item) =>
        item.id === tempId ? { ...item, status: "failed" as const } : item,
      );

      if (failedItem) {
        toast.error(`Failed to save ${failedItem.title}`);
      }

      setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== tempId));
      }, 5_000);

      return updated;
    });
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "status-change") {
          setItems((prev) =>
            prev.map((item) =>
              item.id === data.postId
                ? { ...item, status: data.status as MediaItem["status"] }
                : item,
            ),
          );
        }
      } catch (err) {
        console.error(
          `SSE: failed to parse event, ${event.data} error: ${err}`,
        );
      }
    };

    eventSource.onerror = (event) => {};

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <>
      <Header title="Media" userEmail={userEmail} userName={userName} />
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Upload a recording to generate a marketing kit.
          </p>
          <UploadDialog
            onUploadError={handleUploadError}
            onUploadResolved={handleUploadResolved}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        <MediaGrid items={items} />
      </div>
    </>
  );
}

export default DashboardContent;
