import { FileText, Hash, Mail, ListTree, Mic, Sparkles } from "lucide-react";

const capabilities = [
  {
    title: "Blog Post",
    description:
      "A full-length article with your unique voice, formatted and ready to publish.",
    icon: FileText,
    variant: "large" as const,
  },
  {
    title: "Social Hooks",
    description:
      "X threads and LinkedIn posts that capture your key insights in shareable format.",
    icon: Hash,
    variant: "medium" as const,
  },
  {
    title: "Newsletter",
    description:
      "A ready-to-send email digest with headlines, summaries, and CTAs.",
    icon: Mail,
    variant: "medium" as const,
  },
  {
    title: "Chapter Timeline",
    description:
      "Auto-generated chapters with timestamps so you can navigate any recording.",
    icon: ListTree,
    variant: "small" as const,
  },
  {
    title: "Transcription",
    description:
      "Full transcript with speaker diarization — searchable and timestamped.",
    icon: Mic,
    variant: "small" as const,
  },
  {
    title: "AI Summary",
    description:
      "Key takeaways and action items extracted automatically from any conversation.",
    icon: Sparkles,
    variant: "small" as const,
  },
];

export function CapabilityGrid() {
  return (
    <section className="border-b border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl tracking-tight md:text-4xl">
            Everything you need from one recording
          </h2>
          <p className="mt-3 text-muted-foreground">
            One upload. Full marketing suite. No context switching.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
          {capabilities.map((item) => {
            const Icon = item.icon;
            const isLarge = item.variant === "large";
            const isMedium = item.variant === "medium";

            return (
              <div
                key={item.title}
                className={`group relative rounded-xl bg-card p-6 shadow-xs ring-1 ring-foreground/5 transition-all hover:ring-primary/20 hover:shadow-sm ${
                  isLarge ? "md:col-span-2 md:row-span-2 md:p-8" : ""
                } ${isMedium ? "md:col-span-2" : ""}`}
              >
                <div
                  className={`mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ${
                    isLarge ? "size-12 rounded-xl" : ""
                  }`}
                >
                  <Icon className={`${isLarge ? "size-6" : "size-5"}`} />
                </div>
                <h3
                  className={`font-heading font-medium text-foreground ${
                    isLarge ? "text-xl" : "text-sm"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-1.5 text-muted-foreground ${
                    isLarge ? "text-sm leading-relaxed" : "text-xs"
                  }`}
                >
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
