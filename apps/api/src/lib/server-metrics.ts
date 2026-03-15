import os from "node:os";
import process from "node:process";

export interface ServerMetricsSnapshot {
  hostname: string;
  platform: string;
  node_version: string;
  cpu_usage_percent: number | null;
  cpu_cores: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  memory_usage_percent: number;
  process_heap_used_bytes: number;
  process_heap_total_bytes: number;
  process_rss_bytes: number;
  system_uptime_seconds: number;
  process_uptime_seconds: number;
  load_avg_1m: number;
  load_avg_5m: number;
  load_avg_15m: number;
  disk_used_bytes: number | null;
  disk_total_bytes: number | null;
  disk_usage_percent: number | null;
}

function sampleCpu(): { idle: number; total: number }[] {
  const cpus = os.cpus();
  return cpus.map((c) => {
    const times = c.times;
    const idle = times.idle;
    const total = Object.values(times).reduce((a, b) => a + b, 0);
    return { idle, total };
  });
}

function computeCpuPercent(prev: { idle: number; total: number }[], next: { idle: number; total: number }[]): number | null {
  let totalIdleDelta = 0;
  let totalTotalDelta = 0;
  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (p) {
      totalIdleDelta += n.idle - p.idle;
      totalTotalDelta += n.total - p.total;
    }
  }
  if (totalTotalDelta <= 0) return null;
  return Math.min(100, Math.max(0, ((totalTotalDelta - totalIdleDelta) / totalTotalDelta) * 100));
}

/**
 * Collect current server metrics (CPU, memory, load, uptime, process stats).
 * CPU % is computed by sampling twice with a short delay.
 */
export async function collectServerMetrics(): Promise<ServerMetricsSnapshot> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;

  const pmu = process.memoryUsage();
  const load = os.loadavg();
  const hostname = os.hostname();
  const platform = `${os.platform()}-${os.arch()}`;
  const nodeVersion = process.version;

  const first = sampleCpu();
  await new Promise((r) => setTimeout(r, 120));
  const second = sampleCpu();
  const cpuPercent = computeCpuPercent(first, second);

  let diskUsed: number | null = null;
  let diskTotal: number | null = null;
  let diskPercent: number | null = null;
  try {
    const { execSync } = await import("node:child_process");
    if (os.platform() !== "win32") {
      const out = execSync("df -k .", { encoding: "utf8", timeout: 2000 });
      const lines = out.trim().split("\n");
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 3) {
          const totalK = parseInt(parts[1], 10);
          const usedK = parseInt(parts[2], 10);
          if (!Number.isNaN(totalK) && !Number.isNaN(usedK) && totalK > 0) {
            diskTotal = totalK * 1024;
            diskUsed = usedK * 1024;
            diskPercent = (usedK / totalK) * 100;
          }
        }
      }
    }
  } catch {
    // ignore disk errors
  }

  return {
    hostname,
    platform,
    node_version: nodeVersion,
    cpu_usage_percent: cpuPercent,
    cpu_cores: os.cpus().length,
    memory_used_bytes: usedMem,
    memory_total_bytes: totalMem,
    memory_usage_percent: memUsagePercent,
    process_heap_used_bytes: pmu.heapUsed,
    process_heap_total_bytes: pmu.heapTotal,
    process_rss_bytes: pmu.rss,
    system_uptime_seconds: os.uptime(),
    process_uptime_seconds: process.uptime(),
    load_avg_1m: load[0] ?? 0,
    load_avg_5m: load[1] ?? 0,
    load_avg_15m: load[2] ?? 0,
    disk_used_bytes: diskUsed,
    disk_total_bytes: diskTotal,
    disk_usage_percent: diskPercent,
  };
}
