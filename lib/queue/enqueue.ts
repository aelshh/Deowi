import { createAdminClient } from "../server";
import { getTranscriptionQueue } from "./queue";

type EnqueType = {
  postId: string;
  fileUrl: string;
};

export async function enqueueJob({ postId, fileUrl }: EnqueType) {
  const supabaseAdmin = createAdminClient();
  console.log("created client");

  const { data: job, error: insertError } = await supabaseAdmin
    .from("processing_jobs")
    .insert({
      post_id: postId,
      step: "transcribe",
      status: "queued",
      attempts: 0,
      max_attempts: 3,
    })
    .select()
    .single();
  console.log("inserted inthe db");

  if (insertError) {
    console.error("enqueue failed to create job", insertError);
    return { success: false, error: insertError.message };
  }

  try {
    await getTranscriptionQueue().add(
      "transcribe",
      { jobId: job.id, postId, fileUrl },
      { jobId: job.id },
    );

    console.log("added job from transcribe from enqueue.ts : ");

    return { success: true, jobId: job.id };
  } catch (queryError) {
    console.error("Enqueue failed to send to BullMQ: ", queryError);

    await supabaseAdmin
      .from("processing_jobs")
      .update({
        status: "failed",
        error:
          queryError instanceof Error
            ? queryError.message
            : "Failed to enqueue job",
      })
      .eq("id", job.id);

    return { success: false, error: "Failed to enqueue job" };
  }
}
