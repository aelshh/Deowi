"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileAudio, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

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

export function UploadDialog({
  onUploadSuccess,
  onUploadError,
  onUploadResolved,
}: {
  onUploadSuccess?: (newItem: MediaItem) => void;
  onUploadError?: (tempId: string) => void;
  onUploadResolved?: (tempId: string, realId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tempIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && uploading) {
      abortRef.current?.abort();
    }
    if (!nextOpen) {
      setFile(null);
      setUploadError(null);
      setProgress(0);
    }
    setOpen(nextOpen);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const urlRes = await axios.post(
        "/api/upload-url",
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
        {
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        },
      );

      if (urlRes.data.error) {
        const err = urlRes.data.error;
        throw new Error(err || "Failed to get upload URL");
      }

      const {
        signedUrl,
        storagePath,
      }: { signedUrl: string; storagePath: string } = urlRes.data;

      await axios.put(signedUrl, file, {
        headers: { "Content-Type": file.type },
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round(e.loaded * 100) / e.total);
        },
      });

      const tempId = crypto.randomUUID();
      tempIdRef.current = tempId;

      onUploadSuccess?.({
        id: tempId,
        title: file.name,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      setOpen(false);

      axios
        .post(
          "/api/upload-complete",
          { storagePath },
          {
            headers: { "Content-Type": "application/json" },
          },
        )
        .then((res) => {
          if (res.data.error) {
            console.error("Upload complete failed:", res.data.error);
            onUploadError?.(tempId);
            return;
          }
          onUploadResolved?.(tempId, res.data.mediaId);
        });
    } catch (err) {
      if (axios.isCancel(err)) {
        if (tempIdRef.current) {
          onUploadError?.(tempIdRef.current);
        }
        tempIdRef.current = null;
        return;
      }
      if (axios.isAxiosError(err) && err.response?.data.error)
        setUploadError(err.response.data.error);
      else {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Upload className="size-4" />
        Upload media
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload media</DialogTitle>
          <DialogDescription>
            Upload a podcast, meeting recording, or lecture. We support MP3,
            MP4, WAV, and more up to 50mb.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 sm:p-10",
              dragOver
                ? "border-accent bg-accent/5"
                : "border-border hover:border-border",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              name="mediaFile"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <FileAudio className="size-8 text-accent" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP3, MP4, WAV, MOV up to 50mb
                  </p>
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
              <XCircle className="size-3.5" />
              {uploadError || "Upload failed"}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              Upload
            </Button>
          </div>
          {uploading && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
