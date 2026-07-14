import { notFound } from "next/navigation";
import { getMediaById, getMarketingKit, verifySession } from "@/lib/dal";
import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  FileText,
  Hash,
  Mail,
  ListTree,
  ClipboardCopy,
  Subtitles,
} from "lucide-react";
import SubtitleDownloadButton from "@/components/ui/download-btn";

type KitPageProps = {
  params: Promise<{ id: string }>;
};

function CopyButton({ text }: { text: string }) {
  return (
    <form
      action={async () => {
        "use server";
      }}
    >
      <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-accent/30 hover:bg-accent/10 hover:text-accent">
        <ClipboardCopy className="size-3.5" />
        Copy
      </button>
    </form>
  );
}

function SectionBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-4" />
          </div>
          <h2 className="text-sm font-semibold">
            {title}
          </h2>
        </div>
        <CopyButton text={title} />
      </div>
      <div className="max-w-none text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </div>
  );
}

export default async function KitDetailPage({ params }: KitPageProps) {
  const { id } = await params;
  const { email, user } = await verifySession();
  const userName = user.user_metadata?.full_name as string | undefined;
  const [media, kit] = await Promise.all([
    getMediaById(id),
    getMarketingKit(id),
  ]);

  if (!media || !kit) {
    notFound();
  }

  const chapters = kit.chapters as
    | Array<{ title: string; timestamp: string }>
    | undefined;
  const socialHooks = kit.social_hooks as
    | { x_hooks?: string[]; linkedin_hooks?: string[] }
    | undefined;

  return (
    <>
      <Header title={media.title} userEmail={email} userName={userName} />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex items-center gap-3">
          <StatusBadge status={media.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(media.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="space-y-6">
          <SectionBlock title="Blog Post" icon={FileText}>
            <h2 className="text-xl font-semibold mb-4">{kit.blog_post.title}</h2>
            <div className="whitespace-pre-wrap">{kit.blog_post.content}</div>
          </SectionBlock>

          <SectionBlock title="Newsletter" icon={Mail}>
            <div className="whitespace-pre-wrap">{kit.newsletter}</div>
          </SectionBlock>

          {socialHooks?.x_hooks && socialHooks.x_hooks.length > 0 && (
            <SectionBlock title="X / Twitter Hooks" icon={Hash}>
              <ul className="space-y-3">
                {socialHooks.x_hooks.map((hook: string, i: number) => (
                  <li key={i} className="border-l-2 border-accent/30 pl-3">
                    {hook}
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {socialHooks?.linkedin_hooks &&
            socialHooks.linkedin_hooks.length > 0 && (
              <SectionBlock title="LinkedIn Hooks" icon={Hash}>
                <ul className="space-y-3">
                  {socialHooks.linkedin_hooks.map((hook: string, i: number) => (
                    <li key={i} className="border-l-2 border-accent/30 pl-3">
                      {hook}
                    </li>
                  ))}
                </ul>
              </SectionBlock>
            )}

          {chapters && chapters.length > 0 && (
            <SectionBlock title="Chapters" icon={ListTree}>
              <ol className="space-y-2">
                {chapters.map(
                  (ch: { title: string; timestamp: string }, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0 rounded-md bg-surface px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {ch.timestamp}
                      </span>
                      <span>{ch.title}</span>
                    </li>
                  ),
                )}
              </ol>
            </SectionBlock>
          )}

          {typeof kit.subtitles === "string" && kit.subtitles.length > 0 && (
            <SectionBlock title={"Subtitles"} icon={Subtitles}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Download this file and import into your video editor
                </p>
                <SubtitleDownloadButton
                  srtContent={kit.subtitles}
                  title={media.title}
                />
              </div>
              <pre className="max-h-64 max-w-3xl overflow-y-auto rounded-xl border border-border bg-surface p-3 font-mono text-xs text-foreground/70">
                {kit.subtitles}
              </pre>
            </SectionBlock>
          )}
        </div>
      </div>
    </>
  );
}
