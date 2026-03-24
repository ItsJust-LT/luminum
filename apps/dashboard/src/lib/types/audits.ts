export type MetricStatus = "good" | "needsImprovement" | "poor";
export type Grade = "A" | "B" | "C" | "D" | "F";

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
  weights: { performance: number; seo: number; accessibility: number };
  scoringVersion: string;
}

export interface NetworkRequestEntry {
  url: string;
  resourceType: string;
  transferSize: number;
  startTime: number;
  endTime: number;
  statusCode: number;
}

export interface AuditMetrics {
  cwv: MetricResult[];
  timings: MetricResult[];
  resources: ResourceBreakdown;
  networkRequests: NetworkRequestEntry[];
}

export interface AuditListItem {
  id: string;
  websiteId: string;
  organizationId: string;
  status: "queued" | "running" | "completed" | "failed";
  targetUrl: string;
  path: string | null;
  formFactor: string;
  triggerSource: string;
  errorMessage: string | null;
  lighthouseVersion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  summary: AuditSummary | null;
}

export interface AuditDetail extends AuditListItem {
  metrics: {
    pageResults?: Array<{
      path: string;
      url: string;
      device: "mobile" | "desktop";
      status: "completed" | "failed";
      error?: string;
      summary?: AuditSummary;
      metrics?: AuditMetrics;
    }>;
    topPages?: Array<{ path: string; device: "mobile" | "desktop"; score: number }>;
    worstPages?: Array<{ path: string; device: "mobile" | "desktop"; score: number }>;
  } | null;
}
