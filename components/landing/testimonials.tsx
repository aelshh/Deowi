"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/motion";

const testimonials = [
  {
    quote:
      "I turned a 45-minute podcast into a blog post, Twitter thread, and newsletter in under 2 minutes.",
    author: "Sarah Chen",
    role: "Content Strategist",
    image: "https://images.unsplash.com/photo-1587668242726-f1515f01b9f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHw0fHxtYXJrZXRpbmclMjBzdHJhdGVnaXN0JTIwbWluaW1hbCUyMHBvcnRyYWl0fGVufDB8fHxibGFja19hbmRfd2hpdGV8MTc4MjcyNDE4NHww&ixlib=rb-4.1.0&q=85&w=200&h=200&fit=crop",
  },
  {
    quote:
      "The chapter detection alone saves me hours of manual editing. The marketing kit is the cherry on top.",
    author: "Marcus Rivera",
    role: "Podcast Producer",
    image: "https://images.unsplash.com/flagged/photo-1595514191830-3e96a518989b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwyfHxtYXJrZXRpbmclMjBzdHJhdGVnaXN0JTIwbWluaW1hbCUyMHBvcnRyYWl0fGVufDB8fHxibGFja19hbmRfd2hpdGV8MTc4MjcyNDE4NHww&ixlib=rb-4.1.0&q=85&w=200&h=200&fit=crop",
  },
  {
    quote:
      "We use Deowi for every client podcast now. It's cut our content production time by 80%.",
    author: "Priya Patel",
    role: "Marketing Agency Owner",
    image: "https://images.unsplash.com/photo-1586447824866-3dbe5c051fcf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwzfHxtYXJrZXRpbmclMjBzdHJhdGVnaXN0JTIwbWluaW1hbCUyMHBvcnRyYWl0fGVufDB8fHxibGFja19hbmRfd2hpdGV8MTc4MjcyNDE4NHww&ixlib=rb-4.1.0&q=85&w=200&h=200&fit=crop",
  },
  {
    quote:
      "Finally, an AI tool that understands context. The blog posts sound like me, not a robot.",
    author: "James Mitchell",
    role: "Independent Creator",
    image: "https://images.unsplash.com/photo-1596365481115-79cb80ea517b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwxfHxtYXJrZXRpbmclMjBzdHJhdGVnaXN0JTIwbWluaW1hbCUyMHBvcnRyYWl0fGVufDB8fHxibGFja19hbmRfd2hpdGV8MTc4MjcyNDE4NHww&ixlib=rb-4.1.0&q=85&w=200&h=200&fit=crop",
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
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={`bg-surface border-2 border-primary relative ${featured ? "p-8 md:p-10" : "p-6 md:p-8"}`}
    >
      <p
        className={`leading-relaxed text-foreground ${featured ? "text-lg md:text-xl font-medium" : "text-base"}`}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div className={`mt-6 flex items-center gap-4 border-t-2 border-primary pt-4`}>
        <img
          src={image}
          alt={author}
          className={`border-2 border-primary object-cover ${featured ? "size-12" : "size-10"}`}
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {author}
          </p>
          <p className="text-xs font-mono uppercase tracking-[0.1em] text-muted_foreground">
            {role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <section className="border-b-2 border-primary py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="mb-4 text-xs font-mono uppercase tracking-[0.2em] text-muted_foreground">
            Testimonials
          </p>
          <h2 className="font-heading text-4xl font-semibold tracking-tighter uppercase md:text-5xl">
            Loved by content teams
          </h2>
          <p className="mt-4 text-base text-muted_foreground">
            Here&apos;s what creators and marketers are saying.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid gap-0 border-2 border-primary md:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <div className="border-b-2 border-primary md:border-b-0 md:border-r-2 md:border-primary p-0">
            <TestimonialCard {...testimonials[0]} featured={true} />
          </div>
          <div className="border-b-2 border-primary md:border-b-2 md:border-primary p-0">
            <TestimonialCard {...testimonials[1]} featured={false} />
            <div className="border-t-2 border-primary">
              <TestimonialCard {...testimonials[2]} featured={false} />
            </div>
          </div>
          <div className="md:col-span-2 border-t-2 border-primary md:border-t-0 md:border-t-2 md:border-primary p-0 md:border-b-0">
            <div className="md:border-r-2 md:border-primary">
              <TestimonialCard {...testimonials[3]} featured={false} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
