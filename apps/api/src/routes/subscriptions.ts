import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization } from "../lib/access.js";

const router = Router();
router.use(requireAuth);

// POST /api/subscriptions
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const organizationId = data.organization_id;
    if (!organizationId || !(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const subscription = await prisma.subscriptions.create({ data: { organization_id: organizationId, provider: data.provider || "paystack", type: data.type || "free", status: data.status || "active", provider_subscription_id: data.provider_subscription_id || null, provider_customer_id: data.provider_customer_id || null, plan_name: data.plan_name || null, plan_id: data.plan_id || null, amount: data.amount || null, currency: data.currency || "ZAR", billing_cycle: data.billing_cycle || null, trial_start_date: data.trial_start_date ? new Date(data.trial_start_date) : null, trial_end_date: data.trial_end_date ? new Date(data.trial_end_date) : null } });
    res.json({ success: true, subscription });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/subscriptions/set-primary
router.post("/set-primary", async (req: Request, res: Response) => {
  try {
    const { organizationId, subscriptionId } = req.body;
    if (!organizationId || !(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    await prisma.organization.update({ where: { id: organizationId }, data: { primary_subscription_id: subscriptionId } });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/subscriptions?organizationId=...
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId || !(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const subscriptions = await prisma.subscriptions.findMany({ where: { organization_id: organizationId }, include: { payments: { orderBy: { created_at: "desc" }, take: 10 } }, orderBy: { created_at: "desc" } });
    res.json({ success: true, subscriptions });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/subscriptions/record-payment
router.post("/record-payment", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const payment = await prisma.payments.create({ data: { subscription_id: data.subscription_id, provider: data.provider || "paystack", amount: data.amount, currency: data.currency || "ZAR", status: data.status || "success", provider_payment_id: data.provider_payment_id || null, provider_transaction_id: data.provider_transaction_id || null, payment_method: data.payment_method || null, paid_at: data.paid_at ? new Date(data.paid_at) : new Date() } });
    res.json({ success: true, payment });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/subscriptions/sync
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;
    const sub = await prisma.subscriptions.findUnique({ where: { id: subscriptionId } });
    if (!sub?.provider_subscription_id) return res.json({ success: true, subscription: sub });

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
    if (!PAYSTACK_SECRET) return res.json({ success: true, subscription: sub });

    const resp = await fetch(`https://api.paystack.co/subscription/${sub.provider_subscription_id}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
    const data = (await resp.json()) as { status?: boolean; data?: { status?: string; plan?: { name?: string }; amount?: number; createdAt?: string; next_payment_date?: string } };
    if (data.status && data.data) {
      const ps = data.data;
      const updated = await prisma.subscriptions.update({
        where: { id: subscriptionId },
        data: {
          status: ps.status === "active" ? "active" : ps.status === "non-renewing" ? "canceled" : (ps.status ?? sub.status),
          plan_name: (ps.plan?.name as string | undefined) || sub.plan_name,
          amount: typeof ps.amount === "number" ? ps.amount / 100 : sub.amount,
          current_period_start: ps.createdAt ? new Date(ps.createdAt) : sub.current_period_start,
          current_period_end: ps.next_payment_date ? new Date(ps.next_payment_date) : sub.current_period_end,
          updated_at: new Date(),
        },
      });
      return res.json({ success: true, subscription: updated });
    }
    res.json({ success: true, subscription: sub });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as subscriptionsRouter };
