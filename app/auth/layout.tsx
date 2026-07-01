"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const testimonials = [
  {
    quote:
      "I turned a 45-minute podcast into a blog post, Twitter thread, and newsletter in under 2 minutes.",
    author: "Sarah Chen",
    role: "Content Strategist",
  },
  {
    quote:
      "The chapter detection alone saves me hours of manual editing. The marketing kit is the cherry on top.",
    author: "Marcus Rivera",
    role: "Podcast Producer",
  },
  {
    quote:
      "It's cut our content production time by 80% and the quality keeps getting better.",
    author: "Priya Patel",
    role: "Marketing Agency Owner",
  },
];

function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-sm space-y-8">
      <div className="space-y-2">
        <Sparkles className="size-8 text-accent" />
        <h2 className="font-heading text-2xl font-semibold uppercase tracking-tight">
          Turn recordings into
          <br />
          <span className="text-accent">marketing kits</span>
        </h2>
      </div>

      <div className="relative min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
            className="font-heading text-xl leading-snug tracking-tight"
          >
            &ldquo;{testimonials[index].quote}&rdquo;
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center border-2 border-primary bg-surface text-sm font-medium text-foreground shadow-[4px_4px_0_0_#0A0A0A]">
          {testimonials[index].author
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="text-sm font-semibold">{testimonials[index].author}</p>
          <p className="text-xs font-mono uppercase tracking-[0.1em] text-muted_foreground">
            {testimonials[index].role}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 transition-all ${
              i === index
                ? "w-6 bg-accent"
                : "w-1.5 bg-border hover:bg-muted_foreground/30"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-6 font-mono text-xs uppercase tracking-[0.1em] text-muted_foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 bg-accent" />
          10x faster creation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 bg-accent" />
          99% accuracy
        </span>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-1/2 flex-col justify-between bg-surface border-r-2 border-primary p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center bg-primary text-sm font-bold text-primary-foreground shadow-[4px_4px_0_0_#0A0A0A]">
            D
          </div>
          <span className="text-sm font-heading font-semibold">Deowi</span>
        </div>

        <TestimonialCarousel />

        <p className="text-xs text-muted_foreground">
          &copy; {new Date().getFullYear()} Deowi. All rights reserved.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
