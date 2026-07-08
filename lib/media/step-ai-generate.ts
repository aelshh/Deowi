import { generateMarketingKitFromTranscript, RawTimestamp } from "../ai/prompt";

export type AiGenerateResult =
  | {
      success: true;
      blogPost: string;
      newsletter: string;
      xHooks: string[];
      linkedinHooks: string[];
      chapters: { timestamp: string; title: string }[];
    }
  | {
      success: false;
      error: string;
    };

export async function stepAiGenerate(
  transcriptionText: string,
  rawTimeStamp: RawTimestamp,
): Promise<AiGenerateResult> {
  console.log("Step:aigenerate, generating marketing kit from transcription");

  const result = await generateMarketingKitFromTranscript(
    transcriptionText,
    rawTimeStamp,
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error ?? "AI generation returned no data",
    };
  }

  const { blogPost, xHooks, newsletter, linkedinHooks, chapters } = result.data;

  return {
    success: true,
    blogPost,
    newsletter,
    xHooks,
    linkedinHooks,
    chapters,
  };
}
