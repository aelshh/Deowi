import { Quote } from "lucide-react";

const stats = [
  { value: "10x", label: "Faster content creation" },
  { value: "99%", label: "Transcription accuracy" },
  { value: "5+", label: "Content formats per upload" },
];

const testimonials = [
  {
    quote:
      "I turned a 45-minute podcast into a blog post, Twitter thread, and newsletter in under 2 minutes. This is insane.",
    author: "Sarah Chen",
    role: "Content Strategist",
  },
  {
    quote:
      "The chapter detection alone saves me hours of manual editing. The marketing kit is the cherry on top.",
    author: "Marcus Rivera",
    role: "Podcast Producer",
  },
];

export function TrustBar() {
  return (
    <section className="border-b border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-10">
            <h2 className="font-heading text-3xl tracking-tight md:text-4xl">
              Trusted by content teams
            </h2>
            <div className="grid gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-3">
                  <span className="font-heading text-3xl font-bold text-primary">
                    {stat.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="rounded-xl bg-card p-6 shadow-xs ring-1 ring-foreground/5"
              >
                <Quote className="mb-3 size-5 text-primary/40" />
                <p className="text-sm leading-relaxed text-foreground/80">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-border/20 pt-4">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
