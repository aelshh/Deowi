import {
  generateMarketingKitFromTranscript,
  RawTimestamp,
} from "@/lib/ai/prompt";
import { transcribeAudioFromUrl } from "@/lib/deepgram/transcribe";
import { createAdminClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabaseAdmin = createAdminClient();
  let mediaId: string | null = null; 

  try {
    const body = await request.json();
    const { mediaId: incomingMediaId, fileURL } = body;
    mediaId = incomingMediaId;

    if (!mediaId || !fileURL) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: mediaId and fileURL",
        },
        { status: 400 },
      );
    }

    const { error: statusUpdate1Error } = await supabaseAdmin
      .from("media_posts")
      .update({ status: "generating" })
      .eq("id", mediaId);

    if (statusUpdate1Error) {
      throw new Error(
        `Failed to update status to transcribing: ${statusUpdate1Error.message}`,
      );
    }

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

    const { error: statusUpdate2Error } = await supabaseAdmin
      .from("media_posts")
      .update({ status: "generating" })
      .eq("id", mediaId);

    if (statusUpdate2Error) {
      throw new Error(
        `Failed to update status to generating: ${statusUpdate2Error.message}`,
      );
    }

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

    const { error: statusUpdate3Error } = await supabaseAdmin
      .from("media_posts")
      .update({ status: "completed" })
      .eq("id", mediaId);

    if (statusUpdate3Error) {
      throw new Error(
        `Failed to update status to completed: ${statusUpdate3Error.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Media processed and marketing kit generated",
    });
  } catch (err) {
    console.error("Critical failure in route, error: ", err);

    if (mediaId) {
      await supabaseAdmin
        .from("media_posts")
        .update({ status: "failed" })
        .eq("id", mediaId);
    }

    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
