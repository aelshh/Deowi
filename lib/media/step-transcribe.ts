import { RawTimestamp } from "../ai/prompt";
import { transcribeAudioFromUrl } from "../deepgram/transcribe";

export type TranscribeResult =
  | {
      success: true;
      transcriptionText: string;
      rawTimeStamp: RawTimestamp;
    }
  | {
      success: false;
      error: string;
    };

export async function stepTranscribe(
  fileUrl: string,
): Promise<TranscribeResult> {
  console.log(`step:transcribe starting for file: ${fileUrl}`);

  const result = await transcribeAudioFromUrl(fileUrl);

  if (!result.success || !result.transcriptText) {
    return {
      success: false,
      error: result.error ?? "Unknown transcription error",
    };
  }

  const utterances = result.rawResult.results.utterances;
  if (!utterances || utterances.length === 0) {
    return {
      success: false,
      error: result.error ?? "No timestamp utterances found in Deepgram result",
    };
  }

  return {
    success: true,
    transcriptionText: result.transcriptText,
    rawTimeStamp: utterances as RawTimestamp,
  };
}
