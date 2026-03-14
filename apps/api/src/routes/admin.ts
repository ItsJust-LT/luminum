import { Router, Request, Response } from "express";
import { pathParam } from "../lib/req-params.js";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { auth } from "../auth/config.js";
import { notifyAdminsOrganizationCreated } from "../lib/notifications/helpers.js";
import { sendOwnerInvitationEmail, sendInvitationEmail } from "../lib/email.js";
import { checkDomainMx, checkDomainSpf } from "../lib/email-dns.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}

// GET /api/admin/dashboard-stats
router.get("/dashboard-stats", adminOnly, async (_req: Request, res: Response) => {
  try {
    const [totalOrgs, totalUsers, totalWebsites, totalSubscriptions, totalEmails, totalFormSubmissions] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.websites.count(),
      prisma.subscriptions.count({ where: { status: "active" } }),
      prisma.email.count(),
      prisma.form_submissions.count(),
    ]);
    const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true } });
    res.json({ success: true, stats: { totalOrgs, totalUsers, totalWebsites, totalSubscriptions, totalEmails, totalFormSubmissions, recentUsers } });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/admin/organizations
router.get("/organizations", adminOnly, async (_req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: { member: { include: { user: { select: { id: true, name: true, email: true } } } }, websites: { select: { id: true, domain: true, name: true, analytics: true } }, subscriptions_subscriptions_organization_idToorganization: { where: { status: "active" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, organizations: orgs });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/admin/organizations/:id
router.get("/organizations/:id", adminOnly, async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: pathParam(req, "id") },
      include: { member: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } }, websites: true, subscriptions_subscriptions_organization_idToorganization: true, invitations: { where: { status: "pending" } } },
    });
    if (!org) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, organization: org });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/admin/create-organization
router.post("/create-organization", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationData, ownerAssignment, subscriptionData } = req.body;
    const org = await prisma.organization.create({
      data: {
        id: crypto.randomUUID(), name: organizationData.name, slug: organizationData.slug,
        logo: organizationData.logo || null, country: organizationData.country || "South Africa",
        currency: organizationData.currency || "ZAR", payment_provider: organizationData.paymentProvider || "paystack",
        createdAt: new Date(),
      },
    });

    if (organizationData.domain) {
      try {
        await prisma.websites.create({ data: { domain: organizationData.domain, name: organizationData.name, organization_id: org.id } });
      } catch {}
    }

    if (subscriptionData) {
      await prisma.subscriptions.create({
        data: {
          organization_id: org.id, provider: "paystack", type: subscriptionData.type || "free",
          status: subscriptionData.type === "trial" ? "trialing" : "active",
          trial_end_date: subscriptionData.trialEndDate ? new Date(subscriptionData.trialEndDate) : null,
          provider_subscription_id: subscriptionData.paystackSubscriptionId || null,
          currency: organizationData.currency || "ZAR",
        },
      });
    }

    const APP_URL = process.env.APP_URL || "http://localhost:3000";
    if (ownerAssignment.type === "existing_user" && ownerAssignment.userId) {
      await prisma.member.create({ data: { id: crypto.randomUUID(), userId: ownerAssignment.userId, organizationId: org.id, role: "owner", createdAt: new Date() } });
    } else if (ownerAssignment.type === "invitation" && ownerAssignment.email) {
      const invitationId = crypto.randomUUID();
      await prisma.invitation.create({
        data: { id: invitationId, email: ownerAssignment.email, role: "owner", organizationId: org.id, inviterId: req.user.id, status: "pending", expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date() },
      });
      try {
        await sendOwnerInvitationEmail({ email: ownerAssignment.email, name: ownerAssignment.name || "User", organizationName: org.name, invitationLink: `${APP_URL}/accept-owner-invitation/${invitationId}`, invitedBy: req.user.name || "Admin" });
      } catch {}
    }

    await notifyAdminsOrganizationCreated(org.name, org.id);
    res.json({ success: true, organization: org });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/admin/users
router.get("/users", adminOnly, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { member: { include: { organization: { select: { id: true, name: true, slug: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, users });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/admin/search-paystack-customers
router.post("/search-paystack-customers", adminOnly, async (req: Request, res: Response) => {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
    if (!PAYSTACK_SECRET) return res.json({ success: false, error: "PAYSTACK_SECRET not configured" });
    const { email } = req.body;
    const resp = await fetch(`https://api.paystack.co/customer?email=${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
    const data = await resp.json();
    res.json({ success: true, data });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/admin/check-domain
router.post("/check-domain", adminOnly, async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;
    const website = await prisma.websites.findUnique({ where: { domain }, select: { id: true } });
    res.json({ success: true, available: !website });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/admin/check-email-dns
router.post("/check-email-dns", adminOnly, async (req: Request, res: Response) => {
  try {
    const { domain, organizationId, includeSpf } = req.body as { domain?: string; organizationId?: string; includeSpf?: boolean };
    let checkDomain: string | null = domain || null;
    if (organizationId && !checkDomain) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { email_domain_id: true, email_domain: { select: { domain: true } } },
      });
      if (!org?.email_domain_id || !org.email_domain) {
        return res.status(400).json({ success: false, error: "No email domain set for this organization" });
      }
      checkDomain = org.email_domain.domain;
    }
    if (!checkDomain) {
      return res.status(400).json({ success: false, error: "Provide domain or organizationId" });
    }
    const mx = await checkDomainMx(checkDomain);
    const result: { success: boolean; mx: typeof mx; spf?: Awaited<ReturnType<typeof checkDomainSpf>> } = { success: true, mx };
    if (includeSpf) {
      result.spf = await checkDomainSpf(checkDomain);
    }
    res.json(result);
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/enable-organization-email
router.post("/enable-organization-email", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId, websiteId, email_from_address } = req.body as { organizationId: string; websiteId: string; email_from_address?: string };
    if (!organizationId || !websiteId) {
      return res.status(400).json({ success: false, error: "organizationId and websiteId required" });
    }
    const website = await prisma.websites.findUnique({
      where: { id: websiteId },
      select: { id: true, domain: true, organization_id: true },
    });
    if (!website || website.organization_id !== organizationId) {
      return res.status(400).json({ success: false, error: "Website not found or does not belong to this organization" });
    }
    const mx = await checkDomainMx(website.domain);
    if (!mx.ok) {
      return res.status(400).json({
        success: false,
        error: mx.error || "MX check failed",
        expectedHost: mx.expectedHost,
        actualHosts: mx.actualHosts,
      });
    }
    const replyAddress = email_from_address || `replies@${website.domain}`;
    const now = new Date();
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        emails_enabled: true,
        email_domain_id: websiteId,
        email_dns_verified_at: now,
        email_dns_last_check_at: now,
        email_dns_last_error: null,
        email_from_address: replyAddress,
      },
    });
    res.json({ success: true, message: "Email enabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/disable-organization-email
router.post("/disable-organization-email", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        emails_enabled: false,
        email_domain_id: null,
        email_dns_verified_at: null,
        email_dns_last_check_at: null,
        email_dns_last_error: null,
        email_from_address: null,
      },
    });
    res.json({ success: true, message: "Email disabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as adminRouter };
