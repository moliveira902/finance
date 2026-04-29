import { Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { processCategorize, CategorizeJobData } from "./jobs/categorize.js";

const log = pino({ name: "worker" });
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const categorizationWorker = new Worker<CategorizeJobData>(
  "categorization",
  async (job) => {
    await processCategorize(job.data);
  },
  { connection, concurrency: 5 }
);

categorizationWorker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Job completed");
});

categorizationWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err }, "Job failed");
});

log.info("🤖 Worker started — listening for categorization jobs");

async function shutdown() {
  log.info("Shutting down worker…");
  await categorizationWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
