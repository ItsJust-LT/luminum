import "dotenv/config";
import { Worker, type ConnectionOptions } from "bullmq";
import { createPrismaClient } from "@luminum/database";
import { QUEUE_NAME } from "./queue.js";
import { recoverStaleSiteAudits } from "./recover-stale.js";
import { computeSummary, extractMetrics } from "./scoring.js";
import type { AuditJobPayload, AuditMetrics, AuditSummary } from "./types.js";

const REDIS_URL = process.env.REDIS_URL;
const CONCURRENCY = parseInt(process.env.AUDIT_WORKER_CONCURRENCY ?? "1", 10);
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
const LOCK_MS = parseInt(process.env.AUDIT_JOB_LOCK_MS ?? "900000", 10);
const LIGHTHOUSE_MAX_MS = parseInt(process.env.AUDIT_LIGHTHOUSE_MAX_MS ?? String(12 * 60 * 1000), 10);

function getConnection(): ConnectionOptions {
  if (!REDIS_URL) throw new Error("REDIS_URL is required for audit worker");
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || process.env.REDIS_PASSWORD || undefined,
    username: url.username || undefined,
  };
}

const prisma = createPrismaClient();

type PageDeviceResult = {
  path: string;
  url: string;
  device: "mobile" | "desktop";
  status: "completed" | "failed";
  error?: string;
  summary?: AuditSummary;
  metrics?: AuditMetrics;
  lighthouseVersion?: string | null;
};

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
      screenEmulation: formFactor === "desktop" ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 } : undefined,
      throttling: formFactor === "desktop"
        ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 }
        : undefined,
    };
    const config = { extends: "lighthouse:default", settings: { onlyCategories: ["performance"] } };
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
    timeoutId = setTimeout(() => reject(new Error(`Lighthouse timed out after ${Math.round(LIGHTHOUSE_MAX_MS / 1000)}s`)), LIGHTHOUSE_MAX_MS);
  });
  try {
    return await Promise.race([runLighthouseInner(url, formFactor), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

function aggregate(results: PageDeviceResult[]) {
  const completed = results.filter((r) => r.status === "completed" && r.summary);
  const perfAvg = completed.length
    ? Math.round(completed.reduce((a, r) => a + (r.summary?.performanceScore ?? 0), 0) / completed.length)
    : 0;
  const pages = new Set(results.map((r) => r.path));
  const bottleneckMap = new Map<string, { id: string; severity: string; title: string; description: string; count: number }>();
  for (const r of completed) {
    for (const b of r.summary?.bottlenecks ?? []) {
      const prev = bottleneckMap.get(b.id);
      if (prev) prev.count += 1;
      else bottleneckMap.set(b.id, { ...b, count: 1 });
    }
  }
  const bottlenecks = Array.from(bottleneckMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((b) => ({ id: b.id, severity: b.severity, title: b.title, description: `${b.description} (seen on ${b.count} page/device runs)` }));

  return {
    summary: {
      overallScore: perfAvg,
      performanceScore: perfAvg,
      grade: perfAvg >= 90 ? "A" : perfAvg >= 75 ? "B" : perfAvg >= 60 ? "C" : perfAvg >= 40 ? "D" : "F",
      weights: { performance: 1, seo: 0, accessibility: 0 },
      scoringVersion: "2.0.0",
      bottlenecks,
      pagesDiscovered: pages.size,
      runsTotal: results.length,
      runsCompleted: completed.length,
      runsFailed: results.length - completed.length,
    },
    metrics: {
      pageResults: results,
      topPages: completed
        .map((r) => ({ path: r.path, device: r.device, score: r.summary?.performanceScore ?? 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
      worstPages: completed
        .map((r) => ({ path: r.path, device: r.device, score: r.summary?.performanceScore ?? 0 }))
        .sort((a, b) => a.score - b.score)
        .slice(0, 10),
    },
  };
}

async function processJob(job: { data: AuditJobPayload }) {
  const { auditId, domain, paths } = job.data;
  const progressTotal = paths.length * 2;
  let progressDone = 0;
  await prisma.website_audit.update({
    where: { id: auditId },
    data: {
      status: "running",
      started_at: new Date(),
      form_factor: "both",
      path: null,
      progress_total: progressTotal,
      progress_done: 0,
      progress_current: "Initializing full-site audit",
    },
  });

  let lhVersion: string | null = null;
  const results: PageDeviceResult[] = [];
  async function persistPartial(current: string) {
    const agg = aggregate(results);
    await prisma.website_audit_result.upsert({
      where: { audit_id: auditId },
      update: { summary: agg.summary as object, metrics: agg.metrics as object },
      create: { audit_id: auditId, summary: agg.summary as object, metrics: agg.metrics as object },
    });
    await prisma.website_audit.update({
      where: { id: auditId },
      data: {
        progress_current: current,
        progress_done: progressDone,
        progress_total: progressTotal,
      },
    });
  }

  for (const path of paths) {
    const url = `https://${domain}${path}`;
    for (const device of ["mobile", "desktop"] as const) {
      await prisma.website_audit.update({
        where: { id: auditId },
        data: {
          progress_current: `Scanning ${path} (${device})`,
          progress_done: progressDone,
          progress_total: progressTotal,
        },
      });
      try {
        const lhr = await runLighthouse(url, device);
        if (!lhr) throw new Error("Lighthouse returned no result");
        const summary = computeSummary(lhr);
        const metrics = extractMetrics(lhr);
        lhVersion = lhr.lighthouseVersion ?? lhVersion;
        results.push({ path, url, device, status: "completed", summary, metrics, lighthouseVersion: lhr.lighthouseVersion ?? null });
      } catch (err) {
        const message = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
        results.push({ path, url, device, status: "failed", error: message });
      }
      progressDone += 1;
      await persistPartial(`Completed ${path} (${device})`);
    }
  }

  const agg = aggregate(results);
  await prisma.website_audit_result.upsert({
    where: { audit_id: auditId },
    update: { summary: agg.summary as object, metrics: agg.metrics as object },
    create: { audit_id: auditId, summary: agg.summary as object, metrics: agg.metrics as object },
  });
  await prisma.website_audit.update({
    where: { id: auditId },
    data: {
      status: agg.summary.runsCompleted > 0 ? "completed" : "failed",
      completed_at: new Date(),
      lighthouse_version: lhVersion,
      error_message: agg.summary.runsCompleted > 0 ? null : "No page/device runs completed successfully.",
      progress_done: progressTotal,
      progress_total: progressTotal,
      progress_current: "Audit completed",
    },
  });
}

async function main() {
  await recoverStaleSiteAudits(prisma);
  const worker = new Worker<AuditJobPayload>(QUEUE_NAME, processJob, {
    connection: getConnection(),
    concurrency: CONCURRENCY,
    lockDuration: LOCK_MS,
  });
  worker.on("completed", (job) => console.log(`[site-audit] Job ${job?.id} completed`));
  worker.on("failed", (job, err) => console.error(`[site-audit] Job ${job?.id} failed:`, err.message));
  console.log(`[site-audit] Worker started (concurrency=${CONCURRENCY}, lock=${LOCK_MS}, timeout=${LIGHTHOUSE_MAX_MS})`);
}

void main().catch((err) => {
  console.error("[site-audit] Worker failed to start:", err);
  process.exit(1);
});
