import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export const marketingKitSchema = z.object({
  blogPost: z
    .string()
    .describe(
      "A comprehensive, SEO-optimized markdown-formatted blog post based on the transcript. Use clear headings, bullet points, and clean syntax.",
    ),
  newsletter: z
    .string()
    .describe(
      "A punchy, value-first email newsletter summarizing the key takeaways of the transcript, ending with an engaging hook.",
    ),
  xHooks: z
    .array(z.string())
    .describe(
      "3 to 5 highly engaging, stand-alone X/Twitter hooks under 280 characters designed to maximize impressions.",
    ),
  linkedinHooks: z
    .array(z.string())
    .describe(
      "2 to 3 professional LinkedIn text posts with space/line breaks optimized for readability and click-throughs.",
    ),

  chapters: z.array(
    z.object({
      timestamp: z.string().describe("MM:SS or HH:MM:SS"),
      title: z.string(),
    }),
  ),
});

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

  const buckets: Array<{ start: number; end: number; texts: string[] }> = [];

  let currentBucket: { start: number; end: number; texts: string[] } | null =
    null;

  for (const utt of rawTimestamp) {
    if (!currentBucket || utt.start - currentBucket.start >= 30) {
      currentBucket = {
        start: utt.start,
        end: utt.end,
        texts: [utt.transcript],
      };
      buckets.push(currentBucket);
    } else {
      currentBucket.end = utt.end;
      currentBucket.texts.push(utt.transcript);
    }
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
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: marketingKitSchema }),
      system: `You are an elite growth marketer and content strategist. Your job is to extract maximum value from raw audio or video transcripts.
Analyze the provided transcript and generate an outstanding marketing kit matching the requested schema.
Maintain the core technical accuracy, tone, and insights of the speaker, but polish the output to read like high-quality, professional copy written by a native writer.
Do not include meta-commentary, placeholders, or conversational fluff. Write directly in your target formats.
For the chapters field, use the provided timestamped utterances to determine accurate MM:SS or HH:MM:SS markers. Each chapter should reflect a real topic shift in the recording, not arbitrary splits.`,
      prompt: `Here is the raw transcript:  \n\n ${transcript} \n\nHere are the timestamp utterances from the recording: \n\n${summarizeUtterances(rawTimestamp)}`,
    });

    return {
      success: true,
      data: output,
    };
  } catch (err) {
    console.error("AI wrapper failed: ", err);
    const message = err instanceof Error ? err.message : "An unknown error occurred during AI content generation";
    return {
      success: false,
      error: message,
    };
  }
}
