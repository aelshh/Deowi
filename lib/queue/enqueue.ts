import { createAdminClient } from "../server";

type EnqueType = {
  postId: string;
  fileUrl: string;
};

export async function enqueueJob({ postId, fileUrl }: EnqueType) {
  const supabaseAdmin = createAdminClient();
  const { data: job, error: insertError } = await supabaseAdmin
    .from("processing_jobs")
    .insert({
      post_id: postId,
      step: "transcribing",
      status: "pending",
      attempts: 0,
      max_attempts: 3,
    })
    .select()
    .single();

  if (insertError) {
    console.error("enqueue failed to create job", insertError);
    return { success: false, error: insertError.message };
  }

  const { error: queueError } = await supabaseAdmin.rpc("pgmq_send", {
    queue_name: "media-queue",
    message: JSON.stringify({
      jobId: job.id,
      postId,
      fileUrl,
      step: "transcribe",
    }),
  });

  if (queueError) {
    console.error("enqueue failed to send to pgmq: ", queueError);
    await supabaseAdmin
      .from("processing_jobs")
      .update({
        status: "failed",
        error: queueError.message,
      })
      .eq("id", job.id);
    return { success: false, error: queueError.message };
  }
  await supabaseAdmin
    .from("processing_jobs")
    .update({
      status: "queued",
    })
    .eq("id", job.id);
  return { success: false, jobId: job.id };
}
