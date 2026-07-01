"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "10x", label: "Faster content creation" },
  { value: "99%", label: "Transcription accuracy" },
  { value: "5+", label: "Content formats per upload" },
];

const companies = [
  "Pulse Media",
  "Vertex Studio",
  "Nexus Labs",
  "BrightMind",
  "TechFlow",
  "Acme Corp",
  "Stellar AI",
  "Craft Content",
];

export function SocialProof() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  const logoRef = useRef<HTMLDivElement>(null);
  const logoInView = useInView(logoRef, { once: true, margin: "-80px" });

  return (
    <section className="border-b-2 border-primary py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="grid gap-0 border-2 border-primary md:grid-cols-3"
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center justify-center gap-1 p-8 ${i < stats.length - 1 ? "border-b-2 border-primary md:border-b-0 md:border-r-2 md:border-primary" : ""}`}
            >
              <span className="font-heading text-5xl font-bold tracking-tighter text-accent md:text-6xl">
                {stat.value}
              </span>
              <span className="text-sm font-mono uppercase tracking-[0.1em] text-muted_foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          ref={logoRef}
          initial={{ opacity: 0, y: 20 }}
          animate={logoInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" as const }}
          className="mt-14"
        >
          <p className="mb-8 text-center text-xs font-mono uppercase tracking-[0.2em] text-muted_foreground">
            Trusted by teams building in public
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            {companies.map((name) => (
              <span
                key={name}
                className="text-sm font-heading font-semibold uppercase tracking-tight text-muted_foreground/40 transition-colors hover:text-foreground cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
