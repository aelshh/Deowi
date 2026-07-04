"use client";

import React, { useRef, useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileAudio, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  async function uploadFileToSignedUrl(
    file: File,
    signedUrl: string,
    onProgress: (pct: number) => void,
  ) {
    await axios.put(signedUrl, file, {
      headers: { "Content-Type": file.type },
      onUploadProgress: (e) => {
        if (e.total) onProgress(Math.round(e.loaded * 100) / e.total);
      },
    });
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setProgress(0);

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

      await uploadFileToSignedUrl(file, signedUrl, setProgress);

      const completeRes = await axios.post(
        "/api/upload-complete",
        { storagePath },
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (completeRes.data.error) {
        const err = completeRes.data.error;

        throw new Error(err || "Failed to complete upload");
      }

      setUploadSuccess(true);
      setOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Upload className="size-4" />
        Upload media
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-semibold uppercase tracking-tight">
            Upload media
          </DialogTitle>
          <DialogDescription className="text-sm text-muted_foreground">
            Upload a podcast, meeting recording, or lecture. We support MP3,
            MP4, WAV, and more up to 2GB.
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
              "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 p-10 text-center transition-all",
              dragOver
                ? "border-accent bg-accent/5 shadow-[4px_4px_0_0_#FF3300]"
                : "border-primary bg-surface shadow-[4px_4px_0_0_#0A0A0A]",
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
                  <p className="font-mono text-xs text-muted_foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted_foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drop a file here or click to browse
                  </p>
                  <p className="font-mono text-xs text-muted_foreground">
                    MP3, MP4, WAV, MOV up to 2GB
                  </p>
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 flex items-center gap-2 font-mono text-xs text-destructive">
              <XCircle className="size-3.5" />
              {uploadError || "Upload failed"}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setOpen(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              Upload
            </Button>
          </div>
          {uploading && (
            <div className="mt-3 h-2 w-full border-2 border-prmary bg-surface">
              <div
                className="h-full bg-accent transition-all duratoin-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
