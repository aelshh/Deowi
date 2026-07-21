"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, Mail, Hash, ListTree } from "lucide-react";
import Link from "next/link";
import { heroContainer, heroItem } from "@/lib/motion";

function ProductMockup() {
  return (
    <motion.div
      variants={heroItem}
      className="mx-auto mt-16 max-w-4xl"
    >
      <div className="relative rounded-2xl border border-border/50 bg-surface/80 shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border/50 bg-surface/50 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
          </div>
          <div className="ml-4 flex-1 rounded-lg bg-background/50 px-3 py-1.5 text-xs text-muted-foreground">
            deowi.app/dashboard/kits/episode-42
          </div>
        </div>

        {/* App content */}
        <div className="p-6 md:p-8">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Marketing Kit</h3>
              <p className="text-sm text-muted-foreground">Episode 42: The Future of AI in Content</p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                Ready
              </span>
            </div>
          </div>

          {/* Audio waveform */}
          <div className="mt-6 rounded-xl bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-accent/10">
                <div className="size-0 border-l-[10px] border-l-accent border-y-[6px] border-y-transparent ml-0.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-end gap-[2px] h-8">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const height = Math.sin(i * 0.3) * 0.5 + 0.5;
                    const isPlayed = i < 32;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-colors ${isPlayed ? "bg-accent" : "bg-border"}`}
                        style={{ height: `${Math.max(height * 100, 20)}%` }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">14:32</span>
            </div>
          </div>

          {/* Content tabs */}
          <div className="mt-6 flex gap-1 rounded-lg bg-background/50 p-1">
            {[
              { icon: FileText, label: "Blog Post", active: true },
              { icon: Mail, label: "Newsletter", active: false },
              { icon: Hash, label: "Social Hooks", active: false },
              { icon: ListTree, label: "Chapters", active: false },
            ].map((tab) => (
              <div
                key={tab.label}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab.active
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="size-3" />
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
            ))}
          </div>

          {/* Preview content */}
          <div className="mt-6 rounded-xl border border-border/50 bg-background/30 p-6">
            <div className="space-y-3">
              <div className="h-5 w-3/4 rounded bg-foreground/10" />
              <div className="h-3 w-full rounded bg-foreground/5" />
              <div className="h-3 w-5/6 rounded bg-foreground/5" />
              <div className="h-3 w-4/5 rounded bg-foreground/5" />
              <div className="mt-4 h-3 w-2/3 rounded bg-foreground/5" />
              <div className="h-3 w-full rounded bg-foreground/5" />
              <div className="h-3 w-3/4 rounded bg-foreground/5" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-accent/10" />
              <div className="h-6 w-20 rounded-full bg-accent-secondary/10" />
              <div className="h-6 w-14 rounded-full bg-accent/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 h-64 w-[500px] rounded-full bg-accent/15 blur-[100px]" />
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent-secondary/10 blur-[128px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-32 md:pb-24 md:pt-40">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={heroContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={heroItem}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
          >
            <span className="size-1.5 rounded-full bg-green-500" />
            Powered by Gemini &amp; Deepgram
          </motion.p>

          <motion.h1
            variants={heroItem}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Turn Any Recording
            <br />
            Into A{" "}
            <span className="text-gradient">Marketing Kit</span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Upload a podcast, meeting, or lecture. Get a blog post, newsletter, social hooks, and chapters — all in seconds.
          </motion.p>

          <motion.div
            variants={heroItem}
            className="mx-auto mt-10 max-w-lg"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg backdrop-blur-sm">
              <input
                type="text"
                placeholder="Paste your recording URL..."
                className="flex-1 bg-transparent px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none"
                data-testid="hero-input"
              />
              <Link
                href="/auth/signup"
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-6 py-3 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-glow hover:brightness-110"
                data-testid="cta-button"
              >
                Generate
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={heroItem}
            className="mx-auto mt-10 flex max-w-sm gap-3"
          >
            <Link
              href="/auth/signup"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-6 py-3.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-glow hover:brightness-110"
              data-testid="cta-button"
            >
              Get started free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-surface-hover"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.div
            variants={heroItem}
            className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-foreground font-medium">10x faster</span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-foreground font-medium">99% accuracy</span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-foreground font-medium">5+ formats</span>
            </span>
          </motion.div>
        </motion.div>

        <ProductMockup />
      </div>
    </section>
  );
}
