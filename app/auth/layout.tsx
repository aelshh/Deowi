"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
        <h2 className="text-2xl font-bold tracking-tight">
          Turn recordings into
          <br />
          <span className="text-gradient">marketing kits</span>
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
            className="text-xl leading-snug font-semibold tracking-tight"
          >
            &ldquo;{testimonials[index].quote}&rdquo;
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-secondary text-sm font-medium text-white">
          {testimonials[index].author
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="text-sm font-semibold">{testimonials[index].author}</p>
          <p className="text-xs text-muted-foreground">
            {testimonials[index].role}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === index
                ? "w-6 bg-accent"
                : "w-1.5 bg-muted hover:bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-accent" />
          10x faster creation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-accent" />
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
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-surface to-background p-12 lg:flex">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-secondary text-sm font-bold text-white">
              D
            </div>
            <span className="text-sm font-semibold tracking-tight">Deowi</span>
          </div>
          <ThemeToggle />
        </div>

        <TestimonialCarousel />

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Deowi. All rights reserved.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
