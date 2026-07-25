/**
 * Converts newsletter markdown to inline-styled HTML.
 * The output is ready to paste into email editors, CMS, or any rich-text surface.
 * No external dependencies — pure string conversion.
 */
export function newsletterToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  const inline = (s: string): string =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#7C3AED;text-decoration:underline;">$1</a>');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // blank line
    if (trimmed === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }

    // ## Subject heading
    if (/^##\s+Subject:\s*/.test(trimmed)) {
      const subject = trimmed.replace(/^##\s+Subject:\s*/, "");
      out.push(
        `<h1 style="font-size:22px;font-weight:700;margin:0 0 8px 0;color:#111827;">${inline(subject)}</h1>`,
      );
      continue;
    }

    // ## Other heading
    if (/^##\s+/.test(trimmed)) {
      const text = trimmed.replace(/^##\s+/, "");
      out.push(
        `<h2 style="font-size:18px;font-weight:600;margin:16px 0 8px 0;color:#111827;">${inline(text)}</h2>`,
      );
      continue;
    }

    // ### heading
    if (/^###\s+/.test(trimmed)) {
      const text = trimmed.replace(/^###\s+/, "");
      out.push(
        `<h3 style="font-size:16px;font-weight:600;margin:12px 0 6px 0;color:#111827;">${inline(text)}</h3>`,
      );
      continue;
    }

    // bullet point
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        out.push('<ul style="margin:8px 0;padding-left:24px;">');
        inList = true;
      }
      const text = trimmed.replace(/^[-*]\s+/, "");
      out.push(
        `<li style="margin:4px 0;line-height:1.6;color:#374151;">${inline(text)}</li>`,
      );
      continue;
    }

    // paragraph
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    out.push(
      `<p style="margin:8px 0;line-height:1.7;color:#374151;">${inline(trimmed)}</p>`,
    );
  }

  if (inList) out.push("</ul>");

  return out.join("\n");
}

/**
 * Strips the Subject line from newsletter markdown, returning just the body.
 */
export function stripSubjectLine(md: string): string {
  return md.replace(/^##\s+Subject:.*\n*/m, "").trim();
}

/**
 * Extracts the subject line text from newsletter markdown, or null if not found.
 */
export function extractSubject(md: string): string | null {
  const match = md.match(/^##\s+Subject:\s*(.+)/m);
  return match ? match[1].trim() : null;
}
