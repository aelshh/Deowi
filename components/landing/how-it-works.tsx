import { Upload, Mic, FileText } from "lucide-react";

const steps = [
  {
    step: 1,
    title: "Upload your media",
    description:
      "Drop a podcast episode, meeting recording, or lecture. We support audio and video files up to 2GB.",
    icon: Upload,
  },
  {
    step: 2,
    title: "AI transcribes & analyzes",
    description:
      "Deepgram Nova-3 transcribes with speaker diarization. Gemini 2.5 Flash extracts insights and patterns.",
    icon: Mic,
  },
  {
    step: 3,
    title: "Get your marketing kit",
    description:
      "Receive a blog post, newsletter, social hooks, and chaptered timeline — all in one place.",
    icon: FileText,
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl tracking-tight md:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps from recording to publish-ready content.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative">
                <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                    {item.step}
                  </span>
                  <h3 className="font-heading text-base font-medium">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
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
