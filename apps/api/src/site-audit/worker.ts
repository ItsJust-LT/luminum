/**
 * Site audit worker — runs as a separate process to keep the API responsive.
 * Start with: node --loader tsx dist/site-audit/worker.js  (or tsx src/site-audit/worker.ts)
 */
import "dotenv/config";
import { Worker, type ConnectionOptions } from "bullmq";
import { createPrismaClient } from "@luminum/database";
import { QUEUE_NAME } from "./queue.js";
import { recoverStaleSiteAudits } from "./recover-stale.js";
import { computeSummary, extractMetrics } from "./scoring.js";
import type { AuditJobPayload } from "./types.js";

const REDIS_URL = process.env.REDIS_URL;
const CONCURRENCY = parseInt(process.env.AUDIT_WORKER_CONCURRENCY ?? "1", 10);
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
/** BullMQ default lock is 30s — Lighthouse often needs several minutes. */
const LOCK_MS = parseInt(process.env.AUDIT_JOB_LOCK_MS ?? "900000", 10);
const LIGHTHOUSE_MAX_MS = parseInt(process.env.AUDIT_LIGHTHOUSE_MAX_MS ?? String(12 * 60 * 1000), 10);

function getConnection(): ConnectionOptions {
  if (!REDIS_URL) throw new Error("REDIS_URL is required for the audit worker");
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || process.env.REDIS_PASSWORD || undefined,
    username: url.username || undefined,
  };
}

const prisma = createPrismaClient();

async function runLighthouseInner(url: string, formFactor: "mobile" | "desktop") {
  const lighthouse = (await import("lighthouse")).default;
  const puppeteer = (await import("puppeteer")).default;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    ...(CHROME_PATH ? { executablePath: CHROME_PATH } : {}),
  });

  try {
    const page = await browser.newPage();

    const flags: Record<string, unknown> = {
      port: new URL(browser.wsEndpoint()).port,
      output: "json",
      logLevel: "error",
      formFactor,
      screenEmulation:
        formFactor === "desktop"
          ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 }
          : undefined,
      throttling:
        formFactor === "desktop"
          ? {
              rttMs: 40,
              throughputKbps: 10240,
              cpuSlowdownMultiplier: 1,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            }
          : undefined,
    };

    const config = {
      extends: "lighthouse:default",
      settings: {
        onlyCategories: ["performance"],
      },
    };

    const result = await lighthouse(url, flags, config, page);
    await page.close();
    return result?.lhr ?? null;
  } finally {
    await browser.close();
  }
}

async function runLighthouse(url: string, formFactor: "mobile" | "desktop") {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Lighthouse timed out after ${Math.round(LIGHTHOUSE_MAX_MS / 1000)}s`)),
      LIGHTHOUSE_MAX_MS,
    );
  });
  try {
    return await Promise.race([runLighthouseInner(url, formFactor), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

async function processJob(job: { data: AuditJobPayload }) {
  const { auditId, targetUrl, formFactor } = job.data;

  await prisma.website_audit.update({
    where: { id: auditId },
    data: { status: "running", started_at: new Date() },
  });

  try {
    const lhr = await runLighthouse(targetUrl, formFactor);
    if (!lhr) throw new Error("Lighthouse returned no result");

    const summary = computeSummary(lhr);
    const metrics = extractMetrics(lhr);

    await prisma.website_audit_result.create({
      data: {
        audit_id: auditId,
        summary: summary as object,
        metrics: metrics as object,
      },
    });

    await prisma.website_audit.update({
      where: { id: auditId },
      data: {
        status: "completed",
        completed_at: new Date(),
        lighthouse_version: lhr.lighthouseVersion ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
    await prisma.website_audit.update({
      where: { id: auditId },
      data: { status: "failed", error_message: message, completed_at: new Date() },
    });
    throw err;
  }
}

async function main() {
  await recoverStaleSiteAudits(prisma);

  const connection = getConnection();
  const worker = new Worker<AuditJobPayload>(QUEUE_NAME, processJob, {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: LOCK_MS,
  });

  worker.on("completed", (job) => {
    console.log(`[site-audit] Job ${job?.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[site-audit] Job ${job?.id} failed:`, err.message);
  });

  console.log(
    `[site-audit] Worker started (concurrency=${CONCURRENCY}, lockDurationMs=${LOCK_MS}, lighthouseMaxMs=${LIGHTHOUSE_MAX_MS})`,
  );
}

void main().catch((err) => {
  console.error("[site-audit] Worker failed to start:", err);
  process.exit(1);
});
