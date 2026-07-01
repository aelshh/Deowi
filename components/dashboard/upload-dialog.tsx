"use client";

import { useRef, useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadMediaAction } from "@/actions/project-actions";
import { Upload, FileAudio, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await uploadMediaAction(formData);
      if (result.success) {
        setFile(null);
        setOpen(false);
      }
      return result;
    },
    undefined,
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
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
          <DialogTitle className="font-heading text-lg font-semibold uppercase tracking-tight">Upload media</DialogTitle>
          <DialogDescription className="text-sm text-muted_foreground">
            Upload a podcast, meeting recording, or lecture. We support MP3,
            MP4, WAV, and more up to 2GB.
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
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

          {state && !state.success && (
            <div className="mt-3 flex items-center gap-2 font-mono text-xs text-destructive">
              <XCircle className="size-3.5" />
              {state.error || "Upload failed"}
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
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
