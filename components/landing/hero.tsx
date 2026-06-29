"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, FileText, Hash, Mail } from "lucide-react";

const previews: Record<string, { label: string; content: string; icon: typeof FileText }> = {
  blog: {
    label: "Blog Post",
    content:
      "In this episode, we explore how AI is reshaping content creation...",
    icon: FileText,
  },
  social: {
    label: "Social Hooks",
    content:
      "AI isn't coming for your job — it's coming for your busywork. Here's why that's a good thing.",
    icon: Hash,
  },
  newsletter: {
    label: "Newsletter",
    content:
      "**Weekly Dispatch** — This week we break down the latest AI content tools and how teams are using them.",
    icon: Mail,
  },
};

export function Hero() {
  const [input, setInput] = useState("");
  const [activePreview, setActivePreview] = useState<keyof typeof previews>("blog");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-32 md:pt-32 md:pb-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            AI-powered content generation
          </div>
          <h1 className="font-heading text-4xl leading-tight tracking-tight md:text-6xl">
            Turn any recording into a{" "}
            <span className="text-primary">marketing kit</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Upload a podcast, meeting, or lecture. Get a blog post, newsletter,
            social hooks, and chapters — in seconds.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-xl gap-3">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste a topic or recording URL..."
                className="h-11 pl-9 text-sm"
              />
            </div>
            <Button type="submit" size="lg" className="h-11 gap-1.5">
              Generate
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {submitted && (
            <div className="mx-auto mt-8 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="rounded-xl border border-border/40 bg-card p-4 text-left shadow-xs">
                <div className="flex items-center gap-2 border-b border-border/20 pb-2 mb-3">
                  {activePreview && (
                    <>
                      {(() => {
                        const Icon = previews[activePreview].icon;
                        return <Icon className="size-4 text-primary" />;
                      })()}
                      <span className="text-xs font-medium text-muted-foreground">
                        {previews[activePreview].label}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {previews[activePreview].content}
                </p>
                <div className="mt-3 flex gap-2">
                  {Object.keys(previews).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActivePreview(key as keyof typeof previews)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        activePreview === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {previews[key as keyof typeof previews].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-8 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              Powered by Gemini 2.5 & Deepgram
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
