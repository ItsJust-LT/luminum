import { Queue, type ConnectionOptions } from "bullmq";
import type { AuditJobPayload } from "./types.js";

const REDIS_URL = process.env.REDIS_URL;

function getConnection(): ConnectionOptions | undefined {
  if (!REDIS_URL) return undefined;
  try {
    const url = new URL(REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      password: url.password || process.env.REDIS_PASSWORD || undefined,
      username: url.username || undefined,
    };
  } catch {
    return undefined;
  }
}

export const QUEUE_NAME = "site-audit";

const connection = getConnection();

export const auditQueue = connection
  ? new Queue<AuditJobPayload>(QUEUE_NAME, { connection })
  : null;

export async function enqueueAudit(payload: AuditJobPayload): Promise<string | null> {
  if (!auditQueue) return null;
  const job = await auditQueue.add("run-audit", payload, {
    jobId: `audit-${payload.auditId}`,
    removeOnComplete: 100,
    removeOnFail: 200,
  });
  return job.id ?? null;
}
