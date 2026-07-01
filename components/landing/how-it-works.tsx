"use client";

import { motion } from "framer-motion";
import { Upload, Mic, FileText } from "lucide-react";
import { staggerContainer } from "@/lib/motion";

const steps = [
  {
    step: "01",
    title: "Upload your media",
    description:
      "Drop a podcast episode, meeting recording, or lecture. We support audio and video files up to 2GB.",
    icon: Upload,
  },
  {
    step: "02",
    title: "AI transcribes & analyzes",
    description:
      "Deepgram Nova-3 transcribes with speaker diarization. Gemini 2.5 Flash extracts insights and patterns.",
    icon: Mic,
  },
  {
    step: "03",
    title: "Get your marketing kit",
    description:
      "Receive a blog post, newsletter, social hooks, and chaptered timeline — all in one place.",
    icon: FileText,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b-2 border-primary py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-xs font-mono uppercase tracking-[0.2em] text-muted_foreground">
            How It Works
          </p>
          <h2 className="font-heading text-4xl font-semibold tracking-tighter uppercase md:text-5xl">
            Three steps from recording to publish-ready content
          </h2>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 border-2 border-primary md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.1 } },
                }}
                className={`bg-surface p-8 md:p-10 relative ${i < steps.length - 1 ? "border-b-2 border-primary md:border-b-0 md:border-r-2 md:border-primary" : "border-b-2 border-primary md:border-b-0"}`}
              >
                <span className="mb-4 block font-heading text-5xl font-bold text-accent">
                  {item.step}
                </span>
                <div className="mb-4 flex size-12 items-center justify-center bg-accent text-accent_foreground shadow-[4px_4px_0_0_#0A0A0A]">
                  <Icon className="size-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold uppercase tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted_foreground">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
