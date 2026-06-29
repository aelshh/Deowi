import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary/10 via-primary/5 to-background p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            D
          </div>
          <span className="text-sm font-medium">Deowi</span>
        </div>
        <div className="max-w-sm">
          <Sparkles className="mb-4 size-8 text-primary" />
          <blockquote className="font-heading text-xl leading-snug tracking-tight">
            &ldquo;I turned a 45-minute podcast into a blog post, Twitter
            thread, and newsletter in under 2 minutes.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            — Sarah Chen, Content Strategist
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Deowi. All rights reserved.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
