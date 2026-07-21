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

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 10000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
};

let _transcriptionQueue: Queue | undefined;
let _aiQueue: Queue | undefined;
let _saveQueue: Queue | undefined;

export function getTranscriptionQueue(): Queue {
  if (!_transcriptionQueue) {
    _transcriptionQueue = new Queue("media-transcription", {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return _transcriptionQueue;
}

export function getAiQueue(): Queue {
  if (!_aiQueue) {
    _aiQueue = new Queue("media-aiProcessing", {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return _aiQueue;
}

export function getSaveQueue(): Queue {
  if (!_saveQueue) {
    _saveQueue = new Queue("media-saving", {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return _saveQueue;
}
