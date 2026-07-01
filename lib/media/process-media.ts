import {
  generateMarketingKitFromTranscript,
  RawTimestamp,
} from "@/lib/ai/prompt";
import { transcribeAudioFromUrl } from "@/lib/deepgram/transcribe";
import { createAdminClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function processMedia(mediaId: string, fileURL: string) {
  const supabaseAdmin = createAdminClient();

  try {
    console.log("initiating media processsing");

    await supabaseAdmin
      .from("media_posts")
      .update({ status: "generating" })
      .eq("id", mediaId);

    const transcriptionResult = await transcribeAudioFromUrl(fileURL);

    if (
      !transcriptionResult ||
      !transcriptionResult.success ||
      !transcriptionResult.transcriptText
    ) {
      throw new Error(
        `Failed to generate transcription: ${transcriptionResult.error}`,
      );
    }

    await supabaseAdmin
      .from("media_posts")
      .update({ status: "generating" })
      .eq("id", mediaId);

    const utterances = transcriptionResult.rawResult.results.utterances;
    if (!utterances || utterances.length === 0) {
      throw new Error("No timestamped utterances found in Deepgram result");
    }
    const rawTimestamp = utterances as RawTimestamp;

    const aiResult = await generateMarketingKitFromTranscript(
      transcriptionResult.transcriptText,
      rawTimestamp,
    );

    if (!aiResult || !aiResult.success || !aiResult.data) {
      throw new Error(
        `Failed to generate marketing kit, error: ${aiResult.error}`,
      );
    }

    const { blogPost, xHooks, newsletter, linkedinHooks, chapters } =
      aiResult.data;

    const { error: insertKitError } = await supabaseAdmin
      .from("marketing_kits")
      .insert({
        post_id: mediaId,
        blog_post: blogPost,
        newsletter,
        social_hooks: {
          x_hooks: xHooks,
          linkedin_hooks: linkedinHooks,
        },
        chapters,
      });

    if (insertKitError) {
      throw new Error(
        `Failed to save marketing kit: ${insertKitError.message}`,
      );
    }

    await supabaseAdmin
      .from("media_posts")
      .update({ status: "completed" })
      .eq("id", mediaId);

    console.log("Media processed and marketing kit generated");
  } catch (err) {
    console.error("Critical failure in route, error: ", err);
    await supabaseAdmin
      .from("media_posts")
      .update({ status: "failed" })
      .eq("id", mediaId);
  }
}
