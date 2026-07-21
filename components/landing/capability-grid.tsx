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

export function CapabilityGrid() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-sm text-accent font-medium">Features</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything you need from one recording
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            One upload. Full marketing suite. No context switching.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {capabilities.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.05 } },
                }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-border/50 bg-surface/50 p-6 backdrop-blur-sm transition-colors duration-200 hover:border-accent/20 hover:bg-surface"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent/20">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
