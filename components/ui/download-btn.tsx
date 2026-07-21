"use client";
import { Subtitles } from "lucide-react";

export default function SubtitleDownloadButton({
  srtContent,
  title,
}: {
  srtContent: string;
  title: string;
}) {
  function handleDownload() {
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "subtitles"}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
    >
      <Subtitles className="size-3.5" />
      Download Subtitles
    </button>
  );
}
