import { stepAiGenerate } from "../lib/media/step-ai-generate";
import { stepSave } from "../lib/media/step-save";
import { stepTranscribe } from "../lib/media/step-transcribe";
import {
  getAiQueue,
  createRedisConnection,
  getSaveQueue,
} from "../lib/queue/queue";
import { createAdminClient } from "../lib/server";
import { Worker, Job } from "bullmq";
import { getRedisPublisher } from "../lib/redis";

function getConnection() {
  return createRedisConnection();
}

const redis = getRedisPublisher();

const supabaseAdmin = createAdminClient();

function publishStatus(userId: string, postId: string, status: string) {
  redis.publish(
    "media-updates",
    JSON.stringify({
      userId,
      postId,
      status,
    }),
  );
}

async function updateJobStatus(
  jobId: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  await supabaseAdmin
    .from("processing_jobs")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", jobId);
}

async function updatePostStatus(
  userId: string,
  postId: string,
  status: string,
) {
  await supabaseAdmin.from("media_posts").update({ status }).eq("id", postId);
  redis.publish("media-updates", JSON.stringify({ userId, postId, status }));
}

async function chainToAIGenerate(
  jobId: string,
  postId: string,
  fileUrl: string,
  userId: string,
  data: Record<string, unknown> = {},
) {
  await getAiQueue().add(
    "ai_generate",
    {
      jobId,
      postId,
      fileUrl,
      userId,
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
  userId: string,
  data: Record<string, unknown> = {},
) {
  await getSaveQueue().add(
    "save",
    {
      jobId,
      postId,
      fileUrl,
      userId,
      ...data,
    },
    { jobId: `${jobId}-save` },
  );
  await updateJobStatus(jobId, "queued", { step: "save" });
}

const transcriptionWorker = new Worker(
  "media-transcription",
  async (job) => {
    const { jobId, postId, fileUrl, userId } = job.data;

    console.log(`Starting transcribe job: ${jobId}`);
    await updateJobStatus(jobId, "running");
    await updatePostStatus(userId, postId, "transcribing");

    const result = await stepTranscribe(fileUrl);

    if (!result.success) {
      throw new Error(result.error);
    }

    await chainToAIGenerate(jobId, postId, fileUrl, userId, {
      transcriptionText: result.transcriptionText,
      rawTimeStamp: result.rawTimeStamp,
    });

    console.log(`Transcription job done: ${jobId}`);
  },
  {
    connection: getConnection(),
    concurrency: 2,
    lockDuration: 120_000,
  },
);

const aiGenerateWorker = new Worker(
  "media-aiProcessing",
  async (job) => {
    const { jobId, postId, fileUrl, transcriptionText, rawTimeStamp, userId } =
      job.data;

    console.log(`Starting AI generate job: ${jobId}`);
    await updateJobStatus(jobId, "running");
    await updatePostStatus(userId, postId, "generating");

    const result = await stepAiGenerate(transcriptionText, rawTimeStamp);

    if (!result.success) {
      throw new Error(result.error);
    }

    await chainToSave(jobId, postId, fileUrl, userId, {
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
    connection: getConnection(),
    concurrency: 2,
    lockDuration: 600_000,
  },
);
const saveWorker = new Worker(
  "media-saving",
  async (job) => {
    const { jobId, postId, kitData, userId } = job.data;

    console.log(`Starting save job: ${jobId}`);
    await updateJobStatus(jobId, "running");
    await updatePostStatus(userId, postId, "saving");

    const result = await stepSave(postId, kitData);

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`Save job done: ${jobId}`);

    await updatePostStatus(userId, postId, "completed");
    await updateJobStatus(jobId, "completed");
    console.log(`Job: ${jobId} done, all jobs completed`);
  },
  {
    connection: getConnection(),
    concurrency: 5,
    lockDuration: 30_000,
  },
);

async function handleJobFail(job: Job | undefined, error: Error) {
  if (!job) return;
  const { jobId, postId, userId } = job.data;

  console.log(`Job: ${jobId} ${job.name} failed, error: ${error.message} `);

  const isFinalFailure = job.attemptsMade >= (job.opts.attempts ?? 3);

  await supabaseAdmin
    .from("processing_jobs")
    .update({
      attempts: job.attemptsMade,
      status: isFinalFailure ? "failed" : "queued",
      error: error.message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (isFinalFailure && postId && userId) {
    updatePostStatus(userId, postId, "failed");
  }
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
