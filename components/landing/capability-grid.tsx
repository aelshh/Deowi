"use client";

import { motion } from "framer-motion";
import { FileText, Hash, Mail, ListTree, Mic, Sparkles } from "lucide-react";
import { staggerContainer } from "@/lib/motion";

interface Capability {
  title: string;
  description: string;
  icon: typeof FileText;
}

const capabilities: Capability[] = [
  {
    title: "Blog Post",
    description:
      "A full-length article with your unique voice, formatted and ready to publish.",
    icon: FileText,
  },
  {
    title: "Social Hooks",
    description:
      "X threads and LinkedIn posts that capture your key insights.",
    icon: Hash,
  },
  {
    title: "Newsletter",
    description:
      "A ready-to-send email digest with headlines and CTAs.",
    icon: Mail,
  },
  {
    title: "Chapter Timeline",
    description:
      "Auto-generated chapters with timestamps for navigation.",
    icon: ListTree,
  },
  {
    title: "Transcription",
    description:
      "Full transcript with speaker diarization, searchable.",
    icon: Mic,
  },
  {
    title: "AI Summary",
    description:
      "Key takeaways extracted automatically from any conversation.",
    icon: Sparkles,
  },
];

const gridClasses = [
  "md:col-span-2 md:row-span-2 border-b-2 border-primary md:border-r-2 md:border-primary",
  "md:col-span-2 border-b-2 border-primary",
  "md:col-span-2 border-b-2 border-primary",
  "md:col-span-1 border-b-2 border-primary md:border-b-0 md:border-r-2 md:border-primary",
  "md:col-span-1 border-b-2 border-primary md:border-b-0 md:border-r-2 md:border-primary",
  "md:col-span-1",
];

export function CapabilityGrid() {
  return (
    <section id="features" className="border-b-2 border-primary py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-xs font-mono uppercase tracking-[0.2em] text-muted_foreground">
            Features
          </p>
          <h2 className="font-heading text-4xl font-semibold tracking-tighter uppercase md:text-5xl">
            Everything you need from one recording
          </h2>
          <p className="mt-4 text-base text-muted_foreground">
            One upload. Full marketing suite. No context switching.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 border-2 border-primary md:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {capabilities.map((item, i) => {
            const Icon = item.icon;
            const isLarge = i === 0;
            return (
              <motion.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05 } },
                }}
                className={`bg-surface p-6 md:p-8 relative ${gridClasses[i]}`}
              >
                <div className="mb-4 flex size-10 items-center justify-center bg-accent text-accent_foreground shadow-[4px_4px_0_0_#0A0A0A]">
                  <Icon className="size-5" />
                </div>
                <h3 className={`font-heading font-semibold uppercase tracking-tight text-foreground ${isLarge ? "text-2xl" : "text-lg"}`}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted_foreground">
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
