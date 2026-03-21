export interface CWVThresholds {
  good: number;
  poor: number;
}

export const CWV_THRESHOLDS: Record<string, CWVThresholds> = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
  SI: { good: 3400, poor: 5800 },
  TBT: { good: 200, poor: 600 },
};

export type MetricStatus = "good" | "needsImprovement" | "poor";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ScoringWeights {
  performance: number;
  seo: number;
  accessibility: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  performance: 1,
  seo: 0,
  accessibility: 0,
};

export const GRADE_THRESHOLDS: { min: number; grade: Grade }[] = [
  { min: 90, grade: "A" },
  { min: 75, grade: "B" },
  { min: 60, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0, grade: "F" },
];

export interface MetricResult {
  name: string;
  label: string;
  value: number | null;
  unit: string;
  status: MetricStatus;
  displayValue: string;
}

export interface ResourceBreakdown {
  totalBytes: number;
  jsBytes: number;
  cssBytes: number;
  imageBytes: number;
  fontBytes: number;
  otherBytes: number;
  totalRequests: number;
}

export interface Bottleneck {
  id: string;
  severity: MetricStatus;
  title: string;
  description: string;
}

export interface AuditSummary {
  performanceScore: number;
  overallScore: number;
  grade: Grade;
  bottlenecks: Bottleneck[];
  weights: ScoringWeights;
  scoringVersion: string;
}

export interface AuditMetrics {
  cwv: MetricResult[];
  timings: MetricResult[];
  resources: ResourceBreakdown;
  networkRequests: NetworkRequestEntry[];
}

export interface NetworkRequestEntry {
  url: string;
  resourceType: string;
  transferSize: number;
  startTime: number;
  endTime: number;
  statusCode: number;
}

export interface AuditJobPayload {
  auditId: string;
  websiteId: string;
  targetUrl: string;
  formFactor: "mobile" | "desktop";
}
