"use client";

import { useState, useRef } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function CopyButton({
  text,
  markdown,
  html,
}: {
  text: string;
  markdown?: string;
  html?: string;
}) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      if (html) {
        const htmlBlob = new Blob([html], { type: "text/html" });
        const plainBlob = new Blob([text], { type: "text/plain" });
        const item = new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": plainBlob,
        });
        await navigator.clipboard.write([item]);
      } else if (markdown && containerRef.current) {
        const renderedHtml = containerRef.current.innerHTML;
        const htmlBlob = new Blob([renderedHtml], { type: "text/html" });
        const plainBlob = new Blob([text], { type: "text/plain" });
        const item = new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": plainBlob,
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {markdown && (
        <div ref={containerRef} className="hidden">
          <div className="kit-prose">
            <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-green-500" />
            Copied
          </>
        ) : (
          <>
            <ClipboardCopy className="size-3.5" />
            Copy
          </>
        )}
      </button>
    </>
  );
}
