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

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatSecondsToTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function findClosestUtterance(
  targetSeconds: number,
  rawTimestamp: RawTimestamp,
): number {
  let closest = rawTimestamp[0].start;
  let minDiff = Infinity;
  for (const utt of rawTimestamp) {
    const diff = Math.abs(utt.start - targetSeconds);
    if (diff < minDiff) {
      minDiff = diff;
      closest = utt.start;
    }
  }
  return closest;
}

function validateChapters(
  chapters: { timestamp: string; title: string }[],
  rawTimestamp: RawTimestamp,
): { timestamp: string; title: string }[] {
  if (!rawTimestamp || rawTimestamp.length === 0) return chapters;

  const totalDuration = rawTimestamp[rawTimestamp.length - 1].end;

  return chapters.map((ch) => {
    let seconds = parseTimestampToSeconds(ch.timestamp);

    if (isNaN(seconds) || seconds < 0 || seconds > totalDuration) {
      seconds = isNaN(seconds) ? 0 : Math.max(0, Math.min(seconds, totalDuration));
    }

    const snapped = findClosestUtterance(seconds, rawTimestamp);

    return {
      timestamp: formatSecondsToTimestamp(snapped),
      title: ch.title,
    };
  });
}

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

  const validatedChapters = validateChapters(chapters, rawTimeStamp);

  return {
    success: true,
    blogPost: {
      title: blogResult.data.title,
      content: blogResult.data.content,
    },
    newsletter,
    xHooks,
    linkedinHooks,
    chapters: validatedChapters,
    subtitles,
  };
}
