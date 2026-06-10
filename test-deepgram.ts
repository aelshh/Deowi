import dotenv from "dotenv";
import { transcribeAudioFromUrl } from "./lib/deepgram/transcribe";

dotenv.config({ path: ".env.local" });

async function runTest() {
  const testUrl =
    "https://static.deepgram.com/examples/nasa-spacewalk-interview.wav";
  console.log("testing deepgram api");

  const response = await transcribeAudioFromUrl(testUrl);

  if (response.success) {
    console.log("Success, here is the transcription: ");
    console.log(response.transcriptText);
  } else {
    console.log("Failed", response.error);
  }
}

runTest();
