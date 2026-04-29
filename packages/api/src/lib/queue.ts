import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let connection: IORedis | null = null;

function getConnection() {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
  }
  return connection;
}

export const categorizationQueue = new Queue("categorization", {
  connection: getConnection(),
  defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
});
