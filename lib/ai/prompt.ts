import { generateText, Output } from "ai";
// import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, 
});

export const blogPostSchema = z.object({
  title: z
    .string()
    .describe(
      "A compelling, attention-grabbing blog post title. Keep it under 15 words.",
    ),
  content: z
    .string()
    .describe(
      "The full blog post in markdown. Must be complete — do not cut off mid-sentence. " +
        "Length should scale with the transcript: ~1500 words for short transcripts (under 20 min), " +
        "~2500 words for medium (20-45 min), and ~3500 words for long (45+ min).",
    ),
});

export const marketingKitSchema = z.object({
  newsletter: z
    .string()
    .describe(
      "A punchy, value-first email newsletter under 300 words. " +
        "Start with a hook, list 3-5 key takeaways as bullet points, " +
        "end with a single call-to-action. Use short paragraphs and white space.",
    ),
  xHooks: z
    .array(z.string())
    .describe(
      "3 to 5 highly engaging X/Twitter hooks, each under 280 characters. " +
        "Use varied formulas: questions, statistics, contrarian takes, story teasers. " +
        "Each hook should work as a standalone post.",
    ),
  linkedinHooks: z
    .array(z.string())
    .describe(
      "2 to 3 professional LinkedIn text posts. Each should be 3-6 sentences, " +
        "use line breaks for readability, open with a pattern-interrupt first line, " +
        "and end with a question or call-to-action to drive comments.",
    ),

  chapters: z.array(
    z.object({
      timestamp: z
        .string()
        .describe("MM:SS or HH:MM:SS — the exact start time of this topic"),
      title: z
        .string()
        .describe(
          "A short, descriptive chapter title (under 10 words). " +
            "Each chapter must represent a distinct topic shift, NOT a time interval.",
        ),
    }),
  ),
});

export type BlogPost = z.infer<typeof blogPostSchema>;
export type MarketingKit = z.infer<typeof marketingKitSchema>;

export type RawTimestamp = Array<{
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  id: string;
}>;

function formatSecondsToTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600);
  const s = Math.floor(seconds % 60);

  if (h > 0)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function summarizeUtterances(rawTimestamp: RawTimestamp): string {
  if (!rawTimestamp || rawTimestamp.length === 0) return "";

  if (rawTimestamp.length <= 200) {
    return rawTimestamp
      .map((utt) => {
        const start = formatSecondsToTimestamp(utt.start);
        const end = formatSecondsToTimestamp(utt.end);

        return `[${start} - ${end}]  ${utt.transcript}`;
      })
      .join("\n");
  }

  const BUCKET_SIZE = 15;

  const buckets: Array<{ start: number; end: number; texts: string[] }> = [];

  for (let i = 0; i < rawTimestamp.length; i += BUCKET_SIZE) {
    const batch = rawTimestamp.slice(i, i + BUCKET_SIZE);

    buckets.push({
      start: batch[0].start,
      end: batch[batch.length - 1].end,
      texts: batch.map((x) => x.transcript),
    });
  }

  return buckets
    .map((b) => {
      const startStr = formatSecondsToTimestamp(b.start);
      const endStr = formatSecondsToTimestamp(b.end);
      const text = b.texts.join(" ").trim();
      return `[${startStr} -> ${endStr}] ${text}`;
    })
    .join("\n");
}

const marketingKitSystemPrompt = `You are an elite growth marketer and content strategist.
Your job is to create a complete marketing toolkit from a transcript.

You produce three things: a newsletter, Twitter hooks, LinkedIn hooks, and chapters.
Each must be polished, professional, and ready to use as-is.

---

NEWSLETTER RULES:
- Under 300 words total.
- Opening line must be a hook that makes the reader want to continue.
- List 3-5 key takeaways as bullet points. Each bullet should be 1-2 sentences.
- End with a single call-to-action (read the full post, watch the episode, etc.).
- Use short paragraphs and white space. This should be scannable in 30 seconds.
- Subject line should be included at the top, formatted as: Subject: [your subject line]

TWITTER / X HOOK RULES:
- Generate exactly 5 hooks.
- Each MUST be under 280 characters (count carefully).
- Use a variety of formats across the 5 hooks:
  * 1-2 question hooks ("Did you know...?" or "What if...?")
  * 1-2 story hooks ("A journalist received a WhatsApp call from...")
  * 1 data/statistic hook (use a specific number from the transcript)
  * 1 contrarian hook (challenge a common assumption)
- Each hook must work as a standalone tweet. Do not use "thread" style.
- Include 1-2 relevant hashtags at the end of each hook (not more).

LINKEDIN HOOK RULES:
- Generate exactly 3 posts.
- Each post should be 3-6 sentences.
- Open with a "pattern interrupt" — a bold statement, surprising fact, or personal anecdote.
- Use line breaks between ideas (LinkedIn penalizes dense text).
- End each post with a question to drive comments.
- Professional but not stiff. Write like a thoughtful industry leader, not a corporate robot.
- Include 3-5 relevant hashtags at the end of each post.

CHAPTER RULES:
- Generate between 5 and 10 chapters. NOT more, NOT fewer.
- Each chapter represents a MAJOR TOPIC SHIFT in the recording.
  Do NOT create a chapter every few minutes. Group related discussion into one chapter.
- Use the provided timestamps to place chapters at the EXACT moment a new topic begins.
- Timestamps MUST be in HH:MM:SS format (e.g., "02:33:33"), NOT total minutes (e.g., "153:33").
  If the timestamp is under 1 hour, use MM:SS (e.g., "45:12").
- Titles should be short (under 10 words) and descriptive.
- Chapters should flow logically — reading just the chapter titles should give
  someone a clear summary of the entire recording.

OUTPUT: Return a JSON object matching the schema exactly.`;

export async function generateMarketingKitFromTranscript(
  transcript: string,
  rawTimestamp: RawTimestamp,
): Promise<{
  success: boolean;
  data?: MarketingKit;
  error?: string;
}> {
  try {
    console.log("Initializing Gemini 2.5 Flash for high-context generation");

    const { output } = await generateText({
      model: openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
      maxOutputTokens: 32768,
      output: Output.object({ schema: marketingKitSchema }),
      system: marketingKitSystemPrompt,
      prompt: `Here is the raw transcript:  \n\n ${transcript} \n\nHere are the timestamp utterances from the recording: \n\n${summarizeUtterances(rawTimestamp)}`,
    });

    return {
      success: true,
      data: output,
    };
  } catch (err) {
    console.error("AI wrapper failed: ", err);
    const message =
      err instanceof Error
        ? err.message
        : "An unknown error occurred during AI content generation";
    return {
      success: false,
      error: message,
    };
  }
}

function estimateBlogWordCount(timestamp: RawTimestamp): string {
  const end = timestamp[timestamp.length - 1].end;
  const totalMinutes = end / 60;

  if (totalMinutes < 20) {
    return "~1500 words. The source material is short, so be concise and focused.";
  } else if (totalMinutes < 45) {
    return "~2500 words. You have substantial material. Cover all major topics thoroughly.";
  } else {
    return "~3500 words. This is a long recording with rich content. Go deep on every major topic.";
  }
}

const blogPostSystemPrompt = `You are a senior content strategist and long-form writer at a top-tier media publication. Your blog posts are known for their depth, clarity, and ability to keep readers hooked from the first sentence to the last.

RULES FOR THE BLOG POST:

STRUCTURE:
- Start with a "hook" opening: a surprising fact, a provocative question, or a vivid scene.
  NEVER start with "In today's world..." or "In this article..." or any generic opening.
- Use H2 headings (##) to break the post into 4-8 clear sections.
- Use H3 headings (###) within sections when a section covers multiple sub-points.
- End with a strong conclusion that ties back to the opening hook. Do not just summarize.
- Do NOT use a "Table of Contents" — the headings ARE the table of contents.

WRITING STYLE:
- Conversational but authoritative. Write like you are explaining to a smart friend, not lecturing.
- Use short paragraphs (2-4 sentences max). Large walls of text lose readers.
- Vary sentence length. Mix short punchy sentences with longer flowing ones.
- Use bullet points and numbered lists when presenting multiple items.
- Use bold text (**like this**) for key terms and takeaways.
- Use concrete examples, analogies, and stories. Avoid vague generalizations.

LENGTH:
- Scale the blog post length to match the transcript:
  * Transcripts under 20 minutes: aim for ~1500 words
  * Transcripts 20-45 minutes: aim for ~2500 words
  * Transcripts over 45 minutes: aim for ~3500 words
- Do NOT pad with filler to hit a word count. Every sentence should earn its place.

SEO BASICS:
- The title should include the main topic keyword naturally.
- Use the main topic keywords naturally throughout (do not stuff them).

ABSOLUTELY FORBIDDEN:
- "In today's fast-paced world..."
- "Let's dive in..."
- "Without further ado..."
- "In this comprehensive guide..."
- "It goes without saying..."
- "At the end of the day..."
- Any phrase that sounds like AI-generated filler.

OUTPUT: Return a JSON object with "title" and "content" fields.
The content field must be complete markdown — do NOT end mid-sentence.`;

export async function generateBlogPostFromTranscript(
  transcript: string,
  rawTimestamp: RawTimestamp,
): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  try {
    const wordCountEstimate = estimateBlogWordCount(rawTimestamp);
    const timestampContext = summarizeUtterances(rawTimestamp);

    const { text } = await generateText({
      model: openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
      maxOutputTokens: 32768,
      system:
        blogPostSystemPrompt +
        "\n\nOUTPUT FORMAT: Start with a # Markdown heading for the title, then write the full blog post content below it. Return ONLY the markdown — no JSON, no wrapping.",
      prompt: `Write a blog post of ${wordCountEstimate}

    Here is the raw transcript: 
    ${transcript}
    Here are the timestamped sections for reference (use these to ensure accurate time references in the blog post):
    ${timestampContext}`,
    });

    const titleMatch = text.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1]?.trim() ?? "Untitled";
    const content = text.replace(/^#\s+.+\n?/, "").trim();

    return {
      success: true,
      data: { title, content },
    };
  } catch (error) {
    console.error("Blog post generation failed: ", error);
    const message =
      error instanceof Error ? error.message : "Blog post generate failed";

    return {
      success: false,
      error: message,
    };
  }
}

export function generateSrtSubtitles(rawTimeStamp: RawTimestamp): string {
  if (!rawTimeStamp || rawTimeStamp.length === 0) return "";

  function secondsToSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return (
      `${h.toString().padStart(2, "0")}:` +
      `${m.toString().padStart(2, "0")}:` +
      `${s.toString().padStart(2, "0")},` +
      `${ms.toString().padStart(3, "0")}`
    );
  }

  const srtEntries = rawTimeStamp.map((utt, index) => {
    const startTime = secondsToSrtTime(utt.start);
    const endTime = secondsToSrtTime(utt.end);
    const text = utt.transcript.trim();

    return `${index + 1}\n${startTime} --> ${endTime}\n${text}`;
  });

  return srtEntries.join("\n\n") + "\n";
}
