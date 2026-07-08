import { RawTimestamp } from "../ai/prompt";
import { stepAiGenerate } from "../media/step-ai-generate";
import { stepSave } from "../media/step-save";
import { stepTranscribe } from "../media/step-transcribe";
import { createAdminClient } from "../server";

type PgmqMessage = {
  msg_id: number;
  message: {
    jobId: string;
    postId: string;
    fileUrl: string;
    step: string;
    transcription: string;
    rawTimeStamp: unknown;
    kitData?: {
      blogPost: string;
      newsletter: string;
      xHooks: string[];
      linkedinHooks: string[];
      chapters: { timestamp: string; title: string }[];
    };
  };
};

async function handleFailure(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  error: string,
  originalmessage: object,
) {
  const { data: job } = await supabase
    .from("processing_jobs")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const newAttempts = (job?.attempts || 0) + 1;
  const isFailed = newAttempts >= (job?.max_attempts || 3);

  await supabase.from("processing_jobs").update({
    attempts: newAttempts,
    status: isFailed ? "failed" : "pending",
    error,
    updated_at: new Date().toISOString(),
  });

  if (!isFailed) {
    await supabase.rpc("pgmq_send", {
      queue_name: "media-queue",
      message: JSON.stringify(originalmessage),
    });
  }
}

export async function processNextJob() {
  const supabase = createAdminClient();

  const { data: message, error: readError } = await supabase.rpc("pgmq_read", {
    queue_name: "media-queue",
    vt_seconds: 30,
  });

  if (readError) {
    console.error(`pgmq_read error: ${readError.message}`);
    return { processed: false, error: readError.message };
  }

  if (!message || message.length === 0) return { processed: false };
  const msg = message[0] as PgmqMessage;
  const { jobId, postId, fileUrl, step, ...stepData } = msg.message;

  await supabase
    .from("processing_jobs")
    .update({
      status: "running",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  try {
    let result;

    switch (step) {
      case "transcribe": {
        result = await stepTranscribe(fileUrl);
        if (result.success) {
          await supabase.rpc("pgmq_send", {
            queue_name: "media-queue",
            message: JSON.stringify({
              jobId,
              postId,
              fileUrl,
              step: "ai_generate",
              transcriptionText: result.transcriptionText,
              rawTimeStamp: result.rawTimeStamp,
            }),
          });

          await supabase
            .from("processing_jobs")
            .update({
              step: "ai_generate",
              status: "queued",
            })
            .eq("id", jobId);
        } else {
          handleFailure(supabase, jobId, result.error, msg.message);
        }
        break;
      }
      case "ai_generate": {
        result = await stepAiGenerate(
          stepData.transcription,
          stepData.rawTimeStamp as RawTimestamp,
        );
        if (result.success) {
          await supabase.rpc("pgmq_send", {
            queue_name: "media-queue",
            message: JSON.stringify({
              jobId,
              postId,
              fileUrl,
              step: "save",
              kitData: {
                blogPost: result.blogPost,
                newsletter: result.newsletter,
                xHooks: result.xHooks,
                linkedinHooks: result.linkedinHooks,
                chapter: result.chapters,
              },
            }),
          });

          await supabase
            .from("processing_jobs")
            .update({
              step: "save",
              status: "queued",
            })
            .eq("id", jobId);
        } else {
          handleFailure(supabase, jobId, result.error, msg.message);
        }
        break;
      }
      case "save": {
        if (!stepData.kitData) {
          handleFailure(
            supabase,
            jobId,
            "Missing kitData for save step",
            msg.message,
          );
          break;
        }
        result = await stepSave(postId, stepData.kitData);
        if (result.success) {
          await supabase
            .from("processing_jobs")
            .update({
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
        } else {
          handleFailure(supabase, jobId, result.error, msg.message);
        }
        break;
      }

      default: {
        handleFailure(supabase, jobId, `Unkown step ${step}`, msg.message);
      }
    }
    await supabase.rpc("pgmq_archive", {
      queue_name: "media-queue",
      msg_id: msg.msg_id,
    });

    return { processed: true };
  } catch (err) {
    console.error("Unexpected worker error: ", err);

    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await supabase.rpc("pgmq_archive", {
      queue_name: "media-queue",
      msg_id: msg.msg_id,
    });
    return { processed: true, error: String(err) };
  }
}
