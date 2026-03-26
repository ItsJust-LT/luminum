import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { jsonStringifySafe } from "../lib/json-safe.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}

function jsonSafe(res: Response, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.send(jsonStringifySafe(data));
}

// GET /api/admin/invoices/stats
router.get("/stats", adminOnly, async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, draft, sent, paid, overdue, cancelled, recentMonth, allInvoices] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "draft" } }),
      prisma.invoice.count({ where: { status: "sent" } }),
      prisma.invoice.count({ where: { status: "paid" } }),
      prisma.invoice.count({ where: { status: "overdue" } }),
      prisma.invoice.count({ where: { status: "cancelled" } }),
      prisma.invoice.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
      prisma.invoice.findMany({
        select: { grand_total: true, status: true, organization_id: true, created_at: true },
      }),
    ]);

    let totalRevenue = 0;
    let paidRevenue = 0;
    const orgTotals: Record<string, { count: number; revenue: number }> = {};

    for (const inv of allInvoices) {
      const gt = Number(inv.grand_total);
      totalRevenue += gt;
      if (inv.status === "paid") paidRevenue += gt;
      if (!orgTotals[inv.organization_id]) orgTotals[inv.organization_id] = { count: 0, revenue: 0 };
      orgTotals[inv.organization_id]!.count++;
      orgTotals[inv.organization_id]!.revenue += gt;
    }

    const topOrgs = Object.entries(orgTotals)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);

    const topOrgIds = topOrgs.map(([id]) => id);
    const orgNames = await prisma.organization.findMany({
      where: { id: { in: topOrgIds } },
      select: { id: true, name: true, slug: true },
    });
    const orgNameMap = new Map(orgNames.map((o) => [o.id, o]));

    const topOrganizations = topOrgs.map(([id, data]) => ({
      id,
      name: orgNameMap.get(id)?.name ?? "Unknown",
      slug: orgNameMap.get(id)?.slug ?? "",
      invoiceCount: data.count,
      revenue: data.revenue,
    }));

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyInvoices = allInvoices.filter((i) => i.created_at >= sixMonthsAgo);
    const monthlyTrend: Record<string, { count: number; revenue: number }> = {};
    for (const inv of monthlyInvoices) {
      const key = `${inv.created_at.getFullYear()}-${String(inv.created_at.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyTrend[key]) monthlyTrend[key] = { count: 0, revenue: 0 };
      monthlyTrend[key]!.count++;
      monthlyTrend[key]!.revenue += Number(inv.grand_total);
    }

    jsonSafe(res, {
      success: true,
      stats: {
        total, draft, sent, paid, overdue, cancelled, recentMonth,
        totalRevenue, paidRevenue,
        topOrganizations,
        monthlyTrend,
      },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/admin/invoices?page=&limit=&status=&search=
router.get("/", adminOnly, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: "insensitive" } },
        { client_name: { contains: search, mode: "insensitive" } },
        { company_name: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    jsonSafe(res, { success: true, invoices, total, page, limit });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as adminInvoicesRouter };
