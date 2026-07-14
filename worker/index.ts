import { stepAiGenerate } from "@/lib/media/step-ai-generate";
import { stepSave } from "@/lib/media/step-save";
import { stepTranscribe } from "@/lib/media/step-transcribe";
import {
  aiQueue,
  createRedisConnection,
  mediaQueue,
  saveQueue,
} from "@/lib/queue/queue";
import { createAdminClient } from "@/lib/server";
import { Worker } from "bullmq";

const connection = createRedisConnection();

async function updateJobStatus(
  jobId: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  const supabaseAdmin = createAdminClient();
  await supabaseAdmin
    .from("processing_jobs")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", jobId);
}

async function chainToAIGenerate(
  jobId: string,
  postId: string,
  fileUrl: string,
  data: Record<string, unknown> = {},
) {
  await aiQueue.add(
    "ai_generate",
    {
      jobId,
      postId,
      fileUrl,
      ...data,
    },
    { jobId: `${jobId}-ai_generate` },
  );
  await updateJobStatus(jobId, "queued", { step: "ai_generate" });
}
async function chainToSave(
  jobId: string,
  postId: string,
  fileUrl: string,
  data: Record<string, unknown> = {},
) {
  await saveQueue.add(
    "save",
    {
      jobId,
      postId,
      fileUrl,
      ...data,
    },
    { jobId: `${jobId}-save` },
  );
  await updateJobStatus(jobId, "queued", { step: "save" });
}

const transcriptionWorker = new Worker(
  "media-transcription",
  async (job) => {
    const { jobId, postId, fileUrl } = job.data;

    console.log(`Starting transcribe job: ${jobId}`);
    await updateJobStatus(jobId, "running");

    const result = await stepTranscribe(fileUrl);

    if (!result.success) {
      throw new Error(result.error);
    }

    await chainToAIGenerate(jobId, postId, fileUrl, {
      transcriptionText: result.transcriptionText,
      rawTimeStamp: result.rawTimeStamp,
    });

    console.log(`Transcription job done: ${jobId}`);
  },
  {
    connection,
    concurrency: 2,
    lockDuration: 120_000,
  },
);

const aiGenerateWorker = new Worker(
  "media-aiProcessing",
  async (job) => {
    const { jobId, postId, fileUrl, transcriptionText, rawTimeStamp } =
      job.data;

    console.log(`Starting transcribe job: ${jobId}`);
    await updateJobStatus(jobId, "running");

    const result = await stepAiGenerate(transcriptionText, rawTimeStamp);

    if (!result.success) {
      throw new Error(result.error);
    }

    await chainToSave(jobId, postId, fileUrl, {
      kitData: {
        blogPost: result.blogPost,
        newsletter: result.newsletter,
        xHooks: result.xHooks,
        linkedinHooks: result.linkedinHooks,
        chapters: result.chapters,
        subtitles: result.subtitles,
      },
    });

    console.log(`AI Generate job done: ${jobId}`);
  },
  {
    connection,
    concurrency: 2,
    lockDuration: 600_000,
  },
);
const saveWorker = new Worker(
  "media-saving",
  async (job) => {
    const { jobId, postId, kitData } = job.data;

    console.log(`Starting save job: ${jobId}`);
    await updateJobStatus(jobId, "running");

    const result = await stepSave(postId, kitData);

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`Save job done: ${jobId}`);

    await updateJobStatus(jobId, "completed");
    console.log(`Job: ${jobId} done, all jobs completed`);
  },
  {
    connection,
    concurrency: 5,
    lockDuration: 30_000,
  },
);

async function handleJobFail(job: any, error: Error) {
  const { jobId } = job.data;

  console.log(`Job: ${jobId} ${job.name} failed, error: ${error.message} `);

  const isFinalFailure = job.attemptsMade >= job.opts.attempts;

  const supabase = createAdminClient();

  await supabase
    .from("processing_jobs")
    .update({
      attempts: job.attemptsMade,
      status: isFinalFailure ? "failed" : "queued",
      error: error.message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

transcriptionWorker.on("failed", handleJobFail);
aiGenerateWorker.on("failed", handleJobFail);
saveWorker.on("failed", handleJobFail);

async function shutdown() {
  console.log("\nShutting down gracefully");

  await transcriptionWorker.close();
  await aiGenerateWorker.close();
  await saveWorker.close();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("\n======================================");
console.log("Bullmq worker stated");
