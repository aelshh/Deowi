import { notFound } from "next/navigation";
import { getMediaById, getMarketingKit, verifySession } from "@/lib/dal";
import { Header } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  FileText,
  Hash,
  Mail,
  ListTree,
  Subtitles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import SubtitleDownloadButton from "@/components/ui/download-btn";
import { CopyButton } from "@/components/ui/copy-button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { newsletterToHtml, stripSubjectLine, extractSubject } from "@/lib/newsletter-html";

type KitPageProps = {
  params: Promise<{ id: string }>;
};

function SectionBlock({
  title,
  icon: Icon,
  copyText,
  copyMarkdown,
  children,
}: {
  title: string;
  icon: typeof FileText;
  copyText: string;
  copyMarkdown?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-4" />
          </div>
          <h2 className="text-sm font-semibold">
            {title}
          </h2>
        </div>
        <CopyButton text={copyText} markdown={copyMarkdown} />
      </div>
      <div className="min-w-0 text-sm leading-relaxed text-foreground/80">
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

  const blogMd = `${kit.blog_post.title}\n\n${kit.blog_post.content}`;
  const newsletterMd = kit.newsletter as string;
  const newsletterSubject = extractSubject(newsletterMd);
  const newsletterBody = stripSubjectLine(newsletterMd);
  const newsletterHtml = newsletterToHtml(newsletterMd);

  return (
    <>
      <Header title={media.title} userEmail={email} userName={userName} />
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        <Link
          href="/dashboard/kits"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to kits
        </Link>
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
          <SectionBlock title="Blog Post" icon={FileText} copyText={blogMd} copyMarkdown={blogMd}>
            <h2 className="text-lg font-semibold mb-4 break-words md:text-xl">{kit.blog_post.title}</h2>
            <div className="max-h-96 overflow-y-auto scrollbar-themed">
              <MarkdownContent content={kit.blog_post.content} />
            </div>
          </SectionBlock>

          <SectionBlock title="Newsletter" icon={Mail} copyText={newsletterMd} copyMarkdown={newsletterMd}>
            <MarkdownContent content={newsletterMd} />
          </SectionBlock>

          {socialHooks?.x_hooks && socialHooks.x_hooks.length > 0 && (
            <SectionBlock title="X / Twitter Hooks" icon={Hash} copyText={socialHooks.x_hooks.join("\n\n")}>
              <ul className="space-y-3">
                {socialHooks.x_hooks.map((hook: string, i: number) => (
                  <li key={i} className="border-l-2 border-accent/30 pl-3 text-sm leading-relaxed break-words">
                    {hook}
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {socialHooks?.linkedin_hooks &&
            socialHooks.linkedin_hooks.length > 0 && (
              <SectionBlock title="LinkedIn Hooks" icon={Hash} copyText={socialHooks.linkedin_hooks.join("\n\n")}>
                <ul className="space-y-3">
                  {socialHooks.linkedin_hooks.map((hook: string, i: number) => (
                    <li key={i} className="border-l-2 border-accent/30 pl-3 text-sm leading-relaxed break-words">
                      {hook}
                    </li>
                  ))}
                </ul>
              </SectionBlock>
            )}

          {chapters && chapters.length > 0 && (
            <SectionBlock title="Chapters" icon={ListTree} copyText={chapters.map((ch) => `${ch.timestamp} - ${ch.title}`).join("\n")}>
              <ol className="space-y-2">
                {chapters.map(
                  (ch: { title: string; timestamp: string }, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 shrink-0 rounded-md bg-surface px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {ch.timestamp}
                      </span>
                      <span className="break-words leading-relaxed">{ch.title}</span>
                    </li>
                  ),
                )}
              </ol>
            </SectionBlock>
          )}

          {typeof kit.subtitles === "string" && kit.subtitles.length > 0 && (
            <SectionBlock title={"Subtitles"} icon={Subtitles} copyText={kit.subtitles}>
              <SubtitleDownloadButton
                srtContent={kit.subtitles}
                title={media.title}
              />
            </SectionBlock>
          )}
        </div>
      </div>
    </>
  );
}
