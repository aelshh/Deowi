import { Queue } from "bullmq";

export function createRedisConnection() {
  const url = new URL(process.env.REDIS_URL!);
  return {
    host: url.hostname,
    port: Number(url.port),
    password: decodeURIComponent(url.password),
    tls: {},
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const transcriptionQueue = new Queue("media-transcription", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
export const aiQueue = new Queue("media-aiProcessing", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
export const saveQueue = new Queue("media-saving", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
