import { DeepgramClient } from "@deepgram/sdk";
const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });

export async function transcribeAudioFromUrl(fileUrl: string) {
  try {
    console.log(`Starting transcription for fileUrl: ${fileUrl}`);

    const response = await deepgram.listen.v1.media.transcribeUrl({
      url: fileUrl,
      model: "nova-3",
      smart_format: true,
      utterances: true,
      diarize: true,
    });

    if (!response || !("results" in response)) {
      throw new Error(
        "No transcript results returned. ( Did you accidently pass a callback URL? ) ",
      );
    }

    const transcriptText =
      response.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      

    if (!transcriptText) {
      throw new Error(
        "Deepgram responded but the transcript text structure was missing or empty.",
      );
    }

    return {
      success: true,
      transcriptText,
      rawResult: response,
    };
  } catch (err) {
    console.error("Transcripton wrapper failed: ", err);
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return {
      success: false,
      error: message,
    };
  }
}
