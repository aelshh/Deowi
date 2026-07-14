import {
  generateBlogPostFromTranscript,
  generateMarketingKitFromTranscript,
  generateSrtSubtitles,
  RawTimestamp,
} from "../ai/prompt";

export type AiGenerateResult =
  | {
      success: true;
      blogPost: {
        title: string;
        content: string;
      };
      newsletter: string;
      xHooks: string[];
      linkedinHooks: string[];
      chapters: { timestamp: string; title: string }[];
      subtitles: string;
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

  const subtitles = generateSrtSubtitles(rawTimeStamp);
  console.log(`Generate subtitles`);

  const [blogResult, kitResult] = await Promise.all([
    generateBlogPostFromTranscript(transcriptionText, rawTimeStamp),
    generateMarketingKitFromTranscript(transcriptionText, rawTimeStamp),
  ]);

  if (!blogResult.success || !blogResult.data) {
    return {
      success: false,
      error: blogResult.error ?? "BlogPost generation failed",
    };
  }
  if (!kitResult.success || !kitResult.data) {
    return {
      success: false,
      error: kitResult.error ?? "Kit generation fialed",
    };
  }

  const { xHooks, newsletter, linkedinHooks, chapters } = kitResult.data;

  return {
    success: true,
    blogPost: {
      title: blogResult.data.title,
      content: blogResult.data.content,
    },
    newsletter,
    xHooks,
    linkedinHooks,
    chapters,
    subtitles,
  };
}
