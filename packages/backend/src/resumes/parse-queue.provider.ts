import { Queue } from "bullmq";

export const PARSE_QUEUE = "PARSE_QUEUE";

export const parseQueueProvider = {
  provide: PARSE_QUEUE,
  useFactory: () => new Queue("resume-parse", {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
  }),
};