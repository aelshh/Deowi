"use client";

import { motion } from "framer-motion";
import { Upload, Mic, FileText } from "lucide-react";
import Image from "next/image";
import { staggerContainer } from "@/lib/motion";

const steps = [
  {
    step: "01",
    title: "Upload your media",
    description:
      "Drop a podcast episode, meeting recording, or lecture. We support audio and video files up to 2GB.",
    icon: Upload,
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&h=400&fit=crop&q=80",
    alt: "Professional podcast microphone in a recording studio",
  },
  {
    step: "02",
    title: "AI transcribes & analyzes",
    description:
      "Deepgram Nova-3 transcribes with speaker diarization. Gemini 2.5 Flash extracts insights and patterns.",
    icon: Mic,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&q=80",
    alt: "Abstract AI visualization representing machine learning analysis",
  },
  {
    step: "03",
    title: "Get your marketing kit",
    description:
      "Receive a blog post, newsletter, social hooks, and chaptered timeline — all in one place.",
    icon: FileText,
    image: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&h=400&fit=crop&q=80",
    alt: "Content creation workspace with laptop and notes",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-sm text-accent font-medium">How It Works</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Three steps from recording to publish-ready content
          </h2>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.1 } },
                }}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-surface/50 backdrop-blur-sm transition-colors duration-200 hover:border-accent/20 hover:bg-surface"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
                  <span className="absolute top-4 left-4 text-5xl font-bold text-gradient">
                    {item.step}
                  </span>
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent/20">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
