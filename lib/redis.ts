import Redis from "ioredis";

let publisher: Redis | null = null;

export function getRedisPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 20,
    });
  }
  return publisher;
}

let subscriber: Redis | null = null;

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 20,
    });
  }
  return subscriber;
}
