"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { heroContainer, heroItem } from "@/lib/motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b-2 border-primary">
      <div className="mx-auto max-w-6xl px-6 pb-32 pt-32 md:pb-40 md:pt-40">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={heroContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={heroItem}
            className="mb-8 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground"
          >
            Powered by Gemini &amp; Deepgram
          </motion.p>

          <motion.h1
            variants={heroItem}
            className="font-heading text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.9] tracking-tighter uppercase"
          >
            Turn Any Recording
            <br />
            Into A{" "}
            <span className="text-accent">Marketing Kit</span>
          </motion.h1>

          <motion.div
            variants={heroItem}
            className="mx-auto mt-10 max-w-2xl"
          >
            <div className="flex items-center border-2 border-primary bg-surface shadow-[8px_8px_0_0_#0A0A0A]">
              <input
                type="text"
                placeholder="Paste your recording URL..."
                className="flex-1 bg-transparent px-6 py-5 text-lg font-mono placeholder:text-muted_foreground focus:outline-none md:text-2xl md:py-6"
                data-testid="hero-input"
              />
              <Link
                href="/auth/signup"
                className="flex shrink-0 items-center gap-2 bg-accent px-6 py-5 font-mono text-sm font-medium uppercase tracking-[0.2em] text-accent_foreground border-l-2 border-primary md:py-6 md:px-8 hover:bg-accent/90 transition-colors"
                data-testid="cta-button"
              >
                Generate
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>

          <motion.p
            variants={heroItem}
            className="mt-3 text-xs font-mono text-muted_foreground"
          >
            Paste a URL or upload directly after signing up
          </motion.p>

          <motion.div
            variants={heroItem}
            className="mx-auto mt-10 flex max-w-sm gap-4"
          >
            <Link
              href="/auth/signup"
              className="flex flex-1 items-center justify-center gap-2 bg-accent px-6 py-4 font-mono text-sm font-medium uppercase tracking-[0.2em] text-accent_foreground border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all"
              data-testid="cta-button"
            >
              Get started free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex flex-1 items-center justify-center gap-2 bg-surface px-6 py-4 font-mono text-sm font-medium uppercase tracking-[0.2em] text-primary border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.div
            variants={heroItem}
            className="mt-10 flex items-center justify-center gap-8 font-mono text-xs uppercase tracking-[0.2em] text-muted_foreground"
          >
            <span className="text-foreground font-medium">10x faster</span>
            <span className="text-muted_foreground/50">*</span>
            <span className="text-foreground font-medium">99% accuracy</span>
            <span className="text-muted_foreground/50">*</span>
            <span className="text-foreground font-medium">5+ formats</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
