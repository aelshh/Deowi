"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function FinalCta() {
  return (
    <section className="border-b-2 border-primary">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            variants={childVariants}
            className="mb-6 text-xs font-mono uppercase tracking-[0.2em] text-muted_foreground"
          >
            <Sparkles className="inline-block size-3.5 mr-1.5 text-accent" />
            Powered by Gemini &amp; Deepgram
          </motion.p>

          <motion.h2
            variants={childVariants}
            className="font-heading text-4xl font-semibold tracking-tighter uppercase md:text-5xl lg:text-6xl"
          >
            Ready to turn recordings
            <br />
            into{" "}
            <span className="text-accent">marketing kits</span>?
          </motion.h2>

          <motion.p
            variants={childVariants}
            className="mx-auto mt-4 max-w-xl text-base text-muted_foreground"
          >
            Join thousands of creators and teams who save hours every week.
            No credit card required.
          </motion.p>

          <motion.div variants={childVariants} className="mt-10">
            <Link
              href="/auth/signup"
              className="group inline-flex h-12 items-center justify-center gap-2 bg-accent px-8 font-mono text-sm font-medium uppercase tracking-[0.2em] text-accent_foreground border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all"
              data-testid="cta-button"
            >
              Get started free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
