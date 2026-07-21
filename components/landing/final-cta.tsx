"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
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
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920&h=800&fit=crop&q=80"
          alt=""
          fill
          className="object-cover opacity-[0.03] dark:opacity-[0.05]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.p
            variants={childVariants}
            className="mb-6 inline-flex items-center gap-2 text-sm text-accent font-medium"
          >
            <Sparkles className="size-4" />
            Powered by Gemini &amp; Deepgram
          </motion.p>

          <motion.h2
            variants={childVariants}
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
          >
            Ready to turn recordings
            <br />
            into{" "}
            <span className="text-gradient">marketing kits</span>?
          </motion.h2>

          <motion.p
            variants={childVariants}
            className="mx-auto mt-4 max-w-xl text-base text-muted-foreground"
          >
            Join thousands of creators and teams who save hours every week.
            No credit card required.
          </motion.p>

          <motion.div variants={childVariants} className="mt-10">
            <Link
              href="/auth/signup"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-8 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:shadow-glow-lg hover:brightness-110"
              data-testid="cta-button"
            >
              Get started free
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
