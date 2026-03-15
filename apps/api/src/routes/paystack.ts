import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization } from "../lib/access.js";

const router = Router();
router.use(requireAuth);

function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET;
  if (!secret) throw new Error("PAYSTACK_SECRET not configured");
  return secret;
}

// GET /api/paystack/subscription-details?organizationId=...
router.get("/subscription-details", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId || !(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, include: { subscriptions_subscriptions_organization_idToorganization: { orderBy: { created_at: "desc" } } } });
    if (!org) return res.status(404).json({ success: false, error: "Not found" });

    const activeSub = org.subscriptions_subscriptions_organization_idToorganization.find(s => s.status === "active" || s.status === "trialing");
    if (!activeSub?.provider_subscription_id) return res.json({ success: true, subscription: activeSub || null, paystackData: null });

    try {
      const secret = getPaystackSecret();
      const resp = await fetch(`https://api.paystack.co/subscription/${activeSub.provider_subscription_id}`, { headers: { Authorization: `Bearer ${secret}` } });
      const data = (await resp.json()) as { data?: unknown };
      return res.json({ success: true, subscription: activeSub, paystackData: data.data });
    } catch { return res.json({ success: true, subscription: activeSub, paystackData: null }); }
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/paystack/customer-transactions?organizationId=...
router.get("/customer-transactions", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId || !(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const payments = await prisma.payments.findMany({
      where: { subscriptions: { organization_id: organizationId } },
      orderBy: { created_at: "desc" }, take: 20,
    });
    res.json({ success: true, transactions: payments });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/paystack/update-card-link
router.post("/update-card-link", async (req: Request, res: Response) => {
  try {
    const { subscriptionCode } = req.body;
    const secret = getPaystackSecret();
    const resp = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}/manage/link`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = (await resp.json()) as { data?: { link?: string } };
    res.json({ success: true, link: data.data?.link });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/paystack/transactions?page=1&perPage=50&status=...&from=...&to=...
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const secret = getPaystackSecret();
    const params = new URLSearchParams();
    if (req.query.page) params.set("page", req.query.page as string);
    if (req.query.perPage) params.set("perPage", req.query.perPage as string);
    if (req.query.status) params.set("status", req.query.status as string);
    if (req.query.from) params.set("from", req.query.from as string);
    if (req.query.to) params.set("to", req.query.to as string);
    const resp = await fetch(`https://api.paystack.co/transaction?${params}`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = (await resp.json()) as { data?: unknown; meta?: unknown };
    res.json({ success: true, data: data.data, meta: data.meta });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/paystack/transactions/:id
router.get("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const secret = getPaystackSecret();
    const resp = await fetch(`https://api.paystack.co/transaction/${req.params.id}`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = (await resp.json()) as { data?: unknown };
    res.json({ success: true, data: data.data });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/paystack/revenue-analytics?from=...&to=...
router.get("/revenue-analytics", async (req: Request, res: Response) => {
  try {
    const secret = getPaystackSecret();
    const params = new URLSearchParams();
    if (req.query.from) params.set("from", req.query.from as string);
    if (req.query.to) params.set("to", req.query.to as string);
    params.set("perPage", "100");
    const resp = await fetch(`https://api.paystack.co/transaction?${params}`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = (await resp.json()) as { data?: unknown[]; meta?: unknown };
    res.json({ success: true, transactions: data.data || [], meta: data.meta });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/paystack/customers
router.get("/customers", async (req: Request, res: Response) => {
  try {
    const secret = getPaystackSecret();
    const resp = await fetch("https://api.paystack.co/customer?perPage=100", { headers: { Authorization: `Bearer ${secret}` } });
    const data = (await resp.json()) as { data?: unknown[] };
    res.json({ success: true, customers: data.data || [] });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/paystack/transaction-timeline/:id
router.get("/transaction-timeline/:id", async (req: Request, res: Response) => {
  try {
    const secret = getPaystackSecret();
    const resp = await fetch(`https://api.paystack.co/transaction/timeline/${req.params.id}`, { headers: { Authorization: `Bearer ${secret}` } });
    const data = (await resp.json()) as { data?: unknown };
    res.json({ success: true, data: data.data });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as paystackRouter };
