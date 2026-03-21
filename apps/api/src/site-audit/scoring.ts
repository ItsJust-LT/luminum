import type {
  MetricStatus,
  Grade,
  MetricResult,
  Bottleneck,
  AuditSummary,
  AuditMetrics,
  ResourceBreakdown,
  NetworkRequestEntry,
  ScoringWeights,
} from "./types.js";
import {
  CWV_THRESHOLDS,
  DEFAULT_WEIGHTS,
  GRADE_THRESHOLDS,
} from "./types.js";

const SCORING_VERSION = "1.0.0";

// Static thresholds for resource-size heuristics (bytes)
const JS_BUNDLE_WARN = 250_000;
const JS_BUNDLE_POOR = 500_000;
const IMAGE_WARN = 200_000;

export function classifyMetric(name: string, value: number | null): MetricStatus {
  if (value === null || value === undefined) return "poor";
  const t = CWV_THRESHOLDS[name];
  if (!t) return "needsImprovement";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needsImprovement";
  return "poor";
}

export function computeGrade(score: number): Grade {
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (score >= min) return grade;
  }
  return "F";
}

function formatMs(ms: number | null): string {
  if (ms === null) return "N/A";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function fmt(value: number | null, unit: string): string {
  if (value === null) return "N/A";
  if (unit === "ms") return formatMs(value);
  if (unit === "unitless") return value.toFixed(3);
  if (unit === "bytes") {
    if (value > 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
    if (value > 1_000) return `${(value / 1_000).toFixed(0)} KB`;
    return `${value} B`;
  }
  return String(value);
}

function lhNumeric(audits: Record<string, any>, id: string): number | null {
  const a = audits[id];
  if (!a || a.numericValue === undefined || a.numericValue === null) return null;
  return a.numericValue;
}

export function extractMetrics(lhResult: any): AuditMetrics {
  const audits = lhResult.audits ?? {};

  const cwvDefs: { name: string; label: string; auditId: string; unit: string }[] = [
    { name: "LCP", label: "Largest Contentful Paint", auditId: "largest-contentful-paint", unit: "ms" },
    { name: "CLS", label: "Cumulative Layout Shift", auditId: "cumulative-layout-shift", unit: "unitless" },
    { name: "INP", label: "Interaction to Next Paint", auditId: "interaction-to-next-paint", unit: "ms" },
    { name: "FID", label: "First Input Delay", auditId: "max-potential-fid", unit: "ms" },
  ];

  const timingDefs: { name: string; label: string; auditId: string; unit: string }[] = [
    { name: "FCP", label: "First Contentful Paint", auditId: "first-contentful-paint", unit: "ms" },
    { name: "SI", label: "Speed Index", auditId: "speed-index", unit: "ms" },
    { name: "TBT", label: "Total Blocking Time", auditId: "total-blocking-time", unit: "ms" },
    { name: "TTFB", label: "Time to First Byte", auditId: "server-response-time", unit: "ms" },
  ];

  function toMetric(def: typeof cwvDefs[number]): MetricResult {
    const value = lhNumeric(audits, def.auditId);
    return {
      name: def.name,
      label: def.label,
      value,
      unit: def.unit,
      status: classifyMetric(def.name, value),
      displayValue: fmt(value, def.unit),
    };
  }

  const cwv = cwvDefs.map(toMetric);
  const timings = timingDefs.map(toMetric);

  const resources = extractResources(lhResult);
  const networkRequests = extractNetworkRequests(lhResult);

  return { cwv, timings, resources, networkRequests };
}

function extractResources(lhResult: any): ResourceBreakdown {
  const audits = lhResult.audits ?? {};
  const breakdown: ResourceBreakdown = {
    totalBytes: 0,
    jsBytes: 0,
    cssBytes: 0,
    imageBytes: 0,
    fontBytes: 0,
    otherBytes: 0,
    totalRequests: 0,
  };

  const rbAudit = audits["resource-summary"];
  if (rbAudit?.details?.items) {
    for (const item of rbAudit.details.items) {
      const type = item.resourceType ?? item.label ?? "";
      const size = item.transferSize ?? 0;
      const count = item.requestCount ?? 0;

      if (type === "total") {
        breakdown.totalBytes = size;
        breakdown.totalRequests = count;
      } else if (type === "script") {
        breakdown.jsBytes = size;
      } else if (type === "stylesheet") {
        breakdown.cssBytes = size;
      } else if (type === "image") {
        breakdown.imageBytes = size;
      } else if (type === "font") {
        breakdown.fontBytes = size;
      } else if (type !== "document") {
        breakdown.otherBytes += size;
      }
    }
  }

  return breakdown;
}

function extractNetworkRequests(lhResult: any): NetworkRequestEntry[] {
  const audits = lhResult.audits ?? {};
  const nrAudit = audits["network-requests"];
  if (!nrAudit?.details?.items) return [];

  return nrAudit.details.items.slice(0, 100).map((item: any) => ({
    url: item.url ?? "",
    resourceType: item.resourceType ?? "other",
    transferSize: item.transferSize ?? 0,
    startTime: item.startTime ?? 0,
    endTime: item.endTime ?? 0,
    statusCode: item.statusCode ?? 0,
  }));
}

export function extractBottlenecks(lhResult: any): Bottleneck[] {
  const audits = lhResult.audits ?? {};
  const bottlenecks: Bottleneck[] = [];

  const checks: { id: string; title: string; failMsg: string }[] = [
    { id: "render-blocking-resources", title: "Render-blocking resources", failMsg: "CSS or JS files are blocking initial render" },
    { id: "unused-javascript", title: "Unused JavaScript", failMsg: "Large amounts of shipped JavaScript are unused" },
    { id: "unused-css-rules", title: "Unused CSS", failMsg: "Significant portions of CSS are unused" },
    { id: "uses-responsive-images", title: "Oversized images", failMsg: "Images are larger than their display size" },
    { id: "offscreen-images", title: "Off-screen images", failMsg: "Images below the fold are not lazily loaded" },
    { id: "uses-webp-images", title: "Next-gen image formats", failMsg: "Images could use WebP/AVIF for smaller file sizes" },
    { id: "uses-optimized-images", title: "Unoptimized images", failMsg: "Images could be more efficiently encoded" },
    { id: "uses-text-compression", title: "Text compression", failMsg: "Text resources are not compressed (gzip/brotli)" },
    { id: "uses-long-cache-ttl", title: "Cache policy", failMsg: "Static assets have short cache lifetimes" },
    { id: "dom-size", title: "Large DOM size", failMsg: "Excessive DOM nodes slow down rendering" },
    { id: "mainthread-work-breakdown", title: "Main-thread work", failMsg: "Heavy main-thread activity blocks interactivity" },
    { id: "bootup-time", title: "JS boot-up time", failMsg: "JavaScript takes too long to parse and execute" },
  ];

  for (const check of checks) {
    const audit = audits[check.id];
    if (!audit) continue;
    const score = audit.score;
    if (score === null || score === undefined) continue;
    if (score >= 0.9) continue;

    const severity: MetricStatus = score < 0.5 ? "poor" : "needsImprovement";
    bottlenecks.push({
      id: check.id,
      severity,
      title: check.title,
      description: audit.displayValue
        ? `${check.failMsg} (${audit.displayValue})`
        : check.failMsg,
    });
  }

  // Flag large JS bundle
  const resources = extractResources(lhResult);
  if (resources.jsBytes > JS_BUNDLE_POOR) {
    bottlenecks.push({
      id: "large-js-bundle",
      severity: "poor",
      title: "Large JavaScript bundle",
      description: `Total JS transfer size is ${fmt(resources.jsBytes, "bytes")} — aim for under ${fmt(JS_BUNDLE_WARN, "bytes")}`,
    });
  } else if (resources.jsBytes > JS_BUNDLE_WARN) {
    bottlenecks.push({
      id: "large-js-bundle",
      severity: "needsImprovement",
      title: "JavaScript bundle could be smaller",
      description: `Total JS transfer size is ${fmt(resources.jsBytes, "bytes")} — aim for under ${fmt(JS_BUNDLE_WARN, "bytes")}`,
    });
  }

  return bottlenecks.sort((a, b) => (a.severity === "poor" ? -1 : 1) - (b.severity === "poor" ? -1 : 1));
}

export function computeSummary(
  lhResult: any,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): AuditSummary {
  const perfCategory = lhResult.categories?.performance;
  const performanceScore = perfCategory?.score != null
    ? Math.round(perfCategory.score * 100)
    : 0;

  const totalWeight = weights.performance + weights.seo + weights.accessibility;
  const overallScore = totalWeight > 0
    ? Math.round((performanceScore * weights.performance) / totalWeight)
    : performanceScore;

  return {
    performanceScore,
    overallScore,
    grade: computeGrade(overallScore),
    bottlenecks: extractBottlenecks(lhResult),
    weights,
    scoringVersion: SCORING_VERSION,
  };
}
