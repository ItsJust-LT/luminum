import type { PrismaClient } from "@luminum/database";

type GradeKey = "A" | "B" | "C" | "D" | "F";

export interface AuditAdminStats {
  totalAudits: number;
  auditsCreatedLast30Days: number;
  auditsByStatus: Record<string, number>;
  completedAuditsLast30Days: number;
  avgPerformanceScoreLast30Days: number | null;
  gradeDistributionLast30Days: Record<GradeKey, number>;
  websitesWithAtLeastOneCompletedAudit: number;
  websiteAuditCoveragePercent: number | null;
  poorPerformingCountLast30Days: number;
  topBottlenecksLast30Days: Array<{ title: string; count: number }>;
  recentAudits: Array<{
    id: string;
    status: string;
    targetUrl: string;
    formFactor: string;
    completedAt: string | null;
    createdAt: string;
    performanceScore: number | null;
    grade: string | null;
    domain: string;
    organizationName: string;
    organizationSlug: string;
  }>;
  lowestRecentScores: Array<{
    auditId: string;
    performanceScore: number;
    grade: string | null;
    domain: string;
    organizationSlug: string;
    completedAt: string;
  }>;
}

function emptyGrades(): Record<GradeKey, number> {
  return { A: 0, B: 0, C: 0, D: 0, F: 0 };
}

function isGrade(g: string): g is GradeKey {
  return g === "A" || g === "B" || g === "C" || g === "D" || g === "F";
}

export async function computeAuditAdminStats(
  prisma: PrismaClient,
  totalWebsites: number,
  thirtyDaysAgo: Date,
): Promise<AuditAdminStats> {
  const [
    totalAudits,
    auditsCreatedLast30Days,
    statusGroups,
    websitesWithCompletedGroup,
    resultsLast30,
    recentAuditsRows,
  ] = await Promise.all([
    prisma.website_audit.count(),
    prisma.website_audit.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
    prisma.website_audit.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.website_audit.groupBy({
      by: ["website_id"],
      where: { status: "completed" },
      _count: { _all: true },
    }),
    prisma.website_audit_result.findMany({
      where: {
        audit: {
          status: "completed",
          completed_at: { gte: thirtyDaysAgo },
        },
      },
      select: {
        summary: true,
        audit: {
          select: {
            id: true,
            website_id: true,
            completed_at: true,
            website: {
              select: {
                domain: true,
                organization: { select: { slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.website_audit.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      include: {
        website: {
          select: {
            domain: true,
            organization: { select: { name: true, slug: true } },
          },
        },
        result: { select: { summary: true } },
      },
    }),
  ]);

  const auditsByStatus: Record<string, number> = {};
  for (const row of statusGroups) {
    auditsByStatus[row.status] = row._count._all;
  }

  const websitesWithAtLeastOneCompletedAudit = websitesWithCompletedGroup.length;
  const websiteAuditCoveragePercent =
    totalWebsites > 0
      ? Math.round((websitesWithAtLeastOneCompletedAudit / totalWebsites) * 1000) / 10
      : null;

  let scoreSum = 0;
  let scoreN = 0;
  const grades = emptyGrades();
  const bottleneckMap = new Map<string, number>();
  let poorPerformingCountLast30Days = 0;

  for (const row of resultsLast30) {
    const s = row.summary as {
      performanceScore?: number;
      grade?: string;
      bottlenecks?: Array<{ id?: string; title?: string }>;
    } | null;
    if (s && typeof s.performanceScore === "number") {
      scoreSum += s.performanceScore;
      scoreN++;
      if (s.performanceScore < 50) poorPerformingCountLast30Days++;
    }
    const g = s?.grade;
    if (g && isGrade(g)) grades[g]++;
    for (const b of s?.bottlenecks ?? []) {
      const key = (b.title || b.id || "issue").slice(0, 120);
      bottleneckMap.set(key, (bottleneckMap.get(key) ?? 0) + 1);
    }
  }

  const topBottlenecksLast30Days = [...bottleneckMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([title, count]) => ({ title, count }));

  const lowestRecentScores = [...resultsLast30]
    .map((row) => {
      const s = row.summary as { performanceScore?: number; grade?: string } | null;
      const sc = s?.performanceScore;
      if (typeof sc !== "number" || !row.audit.completed_at) return null;
      return {
        auditId: row.audit.id,
        performanceScore: sc,
        grade: s?.grade ?? null,
        domain: row.audit.website.domain,
        organizationSlug: row.audit.website.organization.slug,
        completedAt: row.audit.completed_at.toISOString(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.performanceScore - b.performanceScore)
    .slice(0, 8);

  const recentAudits = recentAuditsRows.map((a) => {
    const s = a.result?.summary as { performanceScore?: number; grade?: string } | null;
    return {
      id: a.id,
      status: a.status,
      targetUrl: a.target_url,
      formFactor: a.form_factor,
      completedAt: a.completed_at?.toISOString() ?? null,
      createdAt: a.created_at.toISOString(),
      performanceScore: typeof s?.performanceScore === "number" ? s.performanceScore : null,
      grade: s?.grade ?? null,
      domain: a.website.domain,
      organizationName: a.website.organization.name,
      organizationSlug: a.website.organization.slug,
    };
  });

  return {
    totalAudits,
    auditsCreatedLast30Days,
    auditsByStatus,
    completedAuditsLast30Days: scoreN,
    avgPerformanceScoreLast30Days: scoreN > 0 ? Math.round(scoreSum / scoreN) : null,
    gradeDistributionLast30Days: grades,
    websitesWithAtLeastOneCompletedAudit,
    websiteAuditCoveragePercent,
    poorPerformingCountLast30Days,
    topBottlenecksLast30Days,
    recentAudits,
    lowestRecentScores,
  };
}
