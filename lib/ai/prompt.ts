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
      Do not include meta-commentary, placeholders, or conversational fluff. Write directly in your target formats.`,
      prompt: `Here is the raw transcript:  \n\n ${transcript}`,
    });

    return {
      success: true,
      data: output,
    };
  } catch (error: any) {
    console.error("AI wrapper failed: ", error);
    return {
      success: false,
      error:
        error.message ||
        "An unkown error occurred during AI content generation",
    };
  }
}
