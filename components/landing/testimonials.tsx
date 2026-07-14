"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { staggerContainer } from "@/lib/motion";

const testimonials = [
  {
    quote:
      "I turned a 45-minute podcast into a blog post, Twitter thread, and newsletter in under 2 minutes.",
    author: "Sarah Chen",
    role: "Content Strategist",
    image: "https://images.unsplash.com/photo-1587668242726-f1515f01b9f8?w=100&h=100&fit=crop&q=80",
  },
  {
    quote:
      "The chapter detection alone saves me hours of manual editing. The marketing kit is the cherry on top.",
    author: "Marcus Rivera",
    role: "Podcast Producer",
    image: "https://images.unsplash.com/photo-1595514191830-3e96a518989b?w=100&h=100&fit=crop&q=80",
  },
  {
    quote:
      "We use Deowi for every client podcast now. It's cut our content production time by 80%.",
    author: "Priya Patel",
    role: "Marketing Agency Owner",
    image: "https://images.unsplash.com/photo-1586447824866-3dbe5c051fcf?w=100&h=100&fit=crop&q=80",
  },
  {
    quote:
      "Finally, an AI tool that understands context. The blog posts sound like me, not a robot.",
    author: "James Mitchell",
    role: "Independent Creator",
    image: "https://images.unsplash.com/photo-1596365481115-79cb80ea517b?w=100&h=100&fit=crop&q=80",
  },
];

function TestimonialCard({
  quote,
  author,
  role,
  image,
  featured,
}: {
  quote: string;
  author: string;
  role: string;
  image: string;
  featured: boolean;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      className={`rounded-2xl border border-border/50 bg-surface/50 backdrop-blur-sm transition-colors duration-200 hover:border-border ${featured ? "p-8 md:p-10" : "p-6 md:p-8"}`}
    >
      <p
        className={`leading-relaxed text-foreground ${featured ? "text-lg md:text-xl font-medium" : "text-base"}`}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div className={`mt-6 flex items-center gap-4 border-t border-border/50 pt-4`}>
        <div className={`relative rounded-full overflow-hidden ${featured ? "size-12" : "size-10"}`}>
          <Image
            src={image}
            alt={author}
            fill
            className="object-cover"
            sizes={featured ? "48px" : "40px"}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {author}
          </p>
          <p className="text-xs text-muted-foreground">
            {role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-sm text-accent font-medium">Testimonials</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Loved by content teams
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Here&apos;s what creators and marketers are saying.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid gap-4 md:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <TestimonialCard {...testimonials[0]} featured={true} />
          <div className="grid gap-4">
            <TestimonialCard {...testimonials[1]} featured={false} />
            <TestimonialCard {...testimonials[2]} featured={false} />
          </div>
          <div className="md:col-span-2">
            <TestimonialCard {...testimonials[3]} featured={false} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
