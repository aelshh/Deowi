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
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });

  const logoRef = useRef<HTMLDivElement>(null);
  const logoInView = useInView(logoRef, { once: true, margin: "-60px" });

  return (
    <section className="border-t border-border/50 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 16 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="grid gap-6 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-surface/50 p-8 backdrop-blur-sm"
            >
              <span className="text-5xl font-bold tracking-tight text-gradient md:text-6xl">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          ref={logoRef}
          initial={{ opacity: 0, y: 16 }}
          animate={logoInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" as const }}
          className="mt-16"
        >
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Trusted by teams building in public
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            {companies.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold tracking-tight text-muted-foreground/30 transition-colors duration-200 hover:text-foreground cursor-default"
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
