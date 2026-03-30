import { Router, Request, Response } from "express";
import dns from "node:dns";
import { pathParam } from "../lib/req-params.js";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { auth } from "../auth/config.js";
import { jsonStringifySafe } from "../lib/json-safe.js";
import { notifyAdminsOrganizationCreated } from "../lib/notifications/helpers.js";
import { computeAuditAdminStats } from "../site-audit/admin-stats.js";
import { sendOwnerInvitationEmail, sendInvitationEmail, sendOrganizationInvitationEmail } from "../lib/email.js";
import { notifyMemberInvited, notifyMemberJoined } from "../lib/notifications/helpers.js";
import { checkDomainMx, checkDomainSpf } from "../lib/email-dns.js";
import { getAdminSystemEnvironmentSnapshot } from "../lib/system-environment.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "../lib/email-system.js";
import { cacheDel } from "../lib/redis-cache.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin access required" });
  next();
}

/** Send JSON response with BigInt serialized as string (avoids "Do not know how to serialize a BigInt") */
function jsonSafe(res: Response, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.send(jsonStringifySafe(data));
}

// GET /api/admin/dashboard-stats
router.get("/dashboard-stats", adminOnly, async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalOrgs, totalUsers, totalWebsites, totalSubscriptions, totalEmails, totalFormSubmissions, newUsersThisMonth, newOrgsThisMonth, bannedUsers, openTickets, totalPageViews, unseenForms, totalInvoices] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.websites.count(),
      prisma.subscriptions.count({ where: { status: "active" } }),
      prisma.email.count(),
      prisma.form_submissions.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.support_tickets.count({ where: { status: { in: ["open", "in_progress"] } } }).catch(() => 0),
      prisma.events.count({ where: { created_at: { gte: thirtyDaysAgo } } }).catch(() => 0),
      prisma.form_submissions.count({ where: { seen: false } }),
      prisma.invoice.count().catch(() => 0),
    ]);
    const recentUsers = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, image: true, createdAt: true, role: true } });
    const recentOrgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, name: true, slug: true, logo: true, createdAt: true, _count: { select: { members: true } } },
    });
    const auditStats = await computeAuditAdminStats(prisma, totalWebsites, thirtyDaysAgo);
    res.json({ success: true, stats: {
      totalOrgs, totalUsers, totalWebsites, totalSubscriptions, totalEmails, totalFormSubmissions,
      newUsersThisMonth, newOrgsThisMonth, bannedUsers, openTickets, totalPageViews, unseenForms, totalInvoices,
      recentUsers, recentOrgs,
      auditStats,
    }});
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/admin/organizations?search=...&hasSubscription=...&limit=50&offset=0
router.get("/organizations", adminOnly, async (req: Request, res: Response) => {
  try {
    const { search, hasSubscription, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (hasSubscription === "true") {
      where.subscriptions_subscriptions_organization_idToorganization = { some: { status: "active" } };
    }

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          websites: { select: { id: true, domain: true, name: true, analytics: true } },
          subscriptions_subscriptions_organization_idToorganization: { where: { status: "active" } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(parseInt(limit), 100),
        skip: parseInt(offset),
      }),
      prisma.organization.count({ where }),
    ]);
    jsonSafe(res, { success: true, organizations: orgs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/admin/organizations/by-slug?slug=...
// Returns full organization by slug so admins can access any org's dashboard without being a member.
router.get("/organizations/by-slug", adminOnly, async (req: Request, res: Response) => {
  try {
    const slug = (req.query as { slug?: string }).slug;
    if (!slug) return res.status(400).json({ success: false, error: "Missing slug" });
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } }, websites: true, subscriptions_subscriptions_organization_idToorganization: true, invitations: { where: { status: "pending" } } },
    });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });
    jsonSafe(res, { success: true, organization: org, members: org.members });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/admin/organizations/:id
router.get("/organizations/:id", adminOnly, async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: pathParam(req, "id") },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } }, websites: true, subscriptions_subscriptions_organization_idToorganization: true, invitations: { where: { status: "pending" } } },
    });
    if (!org) return res.status(404).json({ success: false, error: "Not found" });
    jsonSafe(res, { success: true, organization: org });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

const ORG_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// PATCH /api/admin/organizations/:id — platform admin updates core org fields (name, slug, logo, billing, etc.)
router.patch("/organizations/:id", adminOnly, async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    if (!id) return res.status(400).json({ success: false, error: "Missing organization id" });
    const body = req.body as Record<string, unknown>;
    const existing = await prisma.organization.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!existing) return res.status(404).json({ success: false, error: "Organization not found" });

    const data: Record<string, string | null> = {};
    if (typeof body.name === "string") {
      const n = body.name.trim();
      if (!n) return res.status(400).json({ success: false, error: "Name cannot be empty" });
      data.name = n;
    }
    if (body.slug !== undefined) {
      if (typeof body.slug !== "string") return res.status(400).json({ success: false, error: "Invalid slug" });
      const s = body.slug.trim().toLowerCase();
      if (!ORG_SLUG_RE.test(s)) return res.status(400).json({ success: false, error: "Invalid slug format" });
      if (s !== existing.slug) {
        const taken = await prisma.organization.findFirst({ where: { slug: s, id: { not: id } } });
        if (taken) return res.status(409).json({ success: false, error: "Slug already in use" });
      }
      data.slug = s;
    }
    if (body.logo !== undefined) {
      data.logo = body.logo === null || body.logo === "" ? null : String(body.logo);
    }
    if (typeof body.country === "string") data.country = body.country.trim() || "South Africa";
    if (typeof body.currency === "string") data.currency = body.currency.trim().toUpperCase().slice(0, 8) || "ZAR";
    if (body.billing_email !== undefined) {
      data.billing_email =
        body.billing_email === null || body.billing_email === ""
          ? null
          : String(body.billing_email).trim().slice(0, 255);
    }
    if (body.tax_id !== undefined) {
      data.tax_id =
        body.tax_id === null || body.tax_id === "" ? null : String(body.tax_id).trim().slice(0, 100);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    const org = await prisma.organization.update({
      where: { id },
      data,
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } },
        invitations: { where: { status: "pending" } },
      },
    });
    jsonSafe(res, { success: true, organization: org });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/organizations/:id/invite — invite by email without org membership (platform admin)
router.post("/organizations/:id/invite", adminOnly, async (req: Request, res: Response) => {
  try {
    const organizationId = pathParam(req, "id");
    if (!organizationId) return res.status(400).json({ success: false, error: "Missing organization id" });
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email || typeof email !== "string") return res.status(400).json({ success: false, error: "Email required" });
    const normalized = email.trim().toLowerCase();
    if (!normalized) return res.status(400).json({ success: false, error: "Email required" });

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });

    const r = (role || "member").toLowerCase();
    if (!["member", "admin", "owner"].includes(r)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    const userCheck = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (userCheck) {
      const already = await prisma.member.findFirst({ where: { userId: userCheck.id, organizationId } });
      if (already) return res.status(400).json({ success: false, error: "User is already a member" });
    }

    const pending = await prisma.invitation.findFirst({
      where: { organizationId, email: normalized, status: "pending" },
    });
    if (pending) return res.status(400).json({ success: false, error: "A pending invitation already exists for this email" });

    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        email: normalized,
        role: r,
        organizationId,
        inviterId: req.user.id,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    });

    const APP_URL = process.env.APP_URL || "http://localhost:3000";
    const inviteLink = `${APP_URL}/accept-org-invitation/${invitation.id}`;
    await sendOrganizationInvitationEmail({
      email: normalized,
      role: r as "admin" | "member" | "owner",
      organizationName: org.name,
      inviteLink,
      invitedByUsername: req.user.name || "Platform admin",
      invitedByEmail: req.user.email,
      userExists: !!userCheck,
    });
    await notifyMemberInvited(organizationId, normalized, r, req.user.name || "Platform admin");

    jsonSafe(res, { success: true, invitation });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/organizations/:id/members — add an existing user by email (platform admin)
router.post("/organizations/:id/members", adminOnly, async (req: Request, res: Response) => {
  try {
    const organizationId = pathParam(req, "id");
    if (!organizationId) return res.status(400).json({ success: false, error: "Missing organization id" });
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email || typeof email !== "string") return res.status(400).json({ success: false, error: "Email required" });
    const normalized = email.trim().toLowerCase();

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });

    const r = (role || "member").toLowerCase();
    if (!["member", "admin", "owner"].includes(r)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }

    const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, name: true } });
    if (!user) return res.status(404).json({ success: false, error: "No user with that email — use Invite instead" });

    const existingMember = await prisma.member.findFirst({ where: { userId: user.id, organizationId } });
    if (existingMember) return res.status(400).json({ success: false, error: "User is already a member" });

    await prisma.member.create({
      data: { id: crypto.randomUUID(), userId: user.id, organizationId, role: r, createdAt: new Date() },
    });
    await notifyMemberJoined(organizationId, user.name || normalized, normalized, r);

    jsonSafe(res, { success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
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
    jsonSafe(res, { success: true, organization: org });
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

// GET /api/admin/system-environment — read-only env snapshot (secrets masked) for operators
router.get("/system-environment", adminOnly, async (_req: Request, res: Response) => {
  try {
    const snapshot = getAdminSystemEnvironmentSnapshot();
    res.json({ success: true, ...snapshot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed" });
  }
});

// GET /api/admin/email-system-status — platform email feature flag
router.get("/email-system-status", adminOnly, async (_req: Request, res: Response) => {
  const enabled = isEmailSystemEnabled();
  res.json({
    success: true,
    enabled,
    message: enabled
      ? "Organization email (inbox / send) is enabled when EMAIL_SYSTEM_ENABLED is not set to false."
      : `Platform email is disabled (EMAIL_SYSTEM_ENABLED=false). Inbound webhooks and send are rejected. ${EMAIL_SYSTEM_UNAVAILABLE_MESSAGE}`,
  });
});

// POST /api/admin/enable-organization-email-access — enable emails feature for org (access only; org does domain/DNS setup in dashboard).
router.post("/enable-organization-email-access", adminOnly, async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) {
      return res.status(400).json({
        success: false,
        error:
          "Platform email is disabled (EMAIL_SYSTEM_ENABLED). Enable it in the server environment before granting org access.",
      });
    }
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { emails_enabled: true },
    });
    res.json({ success: true, message: "Email access enabled. Organization can complete domain/DNS setup in dashboard." });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/enable-organization-email — full enable with domain and MX verification (optional; use enable-organization-email-access for access-only).
router.post("/enable-organization-email", adminOnly, async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) {
      return res.status(400).json({
        success: false,
        error:
          "Platform email is disabled (EMAIL_SYSTEM_ENABLED). Enable it in the server environment before enabling email for organizations.",
      });
    }
    const { organizationId, websiteId, email_from_address } = req.body as { organizationId: string; websiteId?: string; email_from_address?: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!websiteId) {
      await prisma.organization.update({ where: { id: organizationId }, data: { emails_enabled: true } });
      return res.json({ success: true, message: "Email access enabled" });
    }
    const website = await prisma.websites.findUnique({
      where: { id: websiteId },
      select: { id: true, domain: true, organization_id: true },
    });
    if (!website || website.organization_id !== organizationId) {
      return res.status(400).json({ success: false, error: "Website not found or does not belong to this organization" });
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

// POST /api/admin/enable-organization-whatsapp
router.post("/enable-organization-whatsapp", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { whatsapp_enabled: true },
    });
    res.json({ success: true, message: "WhatsApp enabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/disable-organization-whatsapp
router.post("/disable-organization-whatsapp", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { whatsapp_enabled: false },
    });
    res.json({ success: true, message: "WhatsApp disabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/enable-organization-analytics
router.post("/enable-organization-analytics", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { analytics_enabled: true },
    });
    res.json({ success: true, message: "Analytics enabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/disable-organization-analytics
router.post("/disable-organization-analytics", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { analytics_enabled: false },
    });
    res.json({ success: true, message: "Analytics disabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/enable-organization-blogs
router.post("/enable-organization-blogs", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { blogs_enabled: true },
    });
    res.json({ success: true, message: "Blogs enabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/disable-organization-blogs
router.post("/disable-organization-blogs", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { blogs_enabled: false },
    });
    res.json({ success: true, message: "Blogs disabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/enable-organization-invoices
router.post("/enable-organization-invoices", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { invoices_enabled: true },
    });
    res.json({ success: true, message: "Invoices enabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/admin/disable-organization-invoices
router.post("/disable-organization-invoices", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { invoices_enabled: false },
    });
    res.json({ success: true, message: "Invoices disabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// ─── Branded Dashboard ─────────────────────────────────────────────────

router.post("/enable-organization-branded-dashboard", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { branded_dashboard_enabled: true },
    });
    res.json({ success: true, message: "Branded dashboard enabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/disable-organization-branded-dashboard", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { branded_dashboard_enabled: false },
    });
    res.json({ success: true, message: "Branded dashboard disabled" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HOSTNAME_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

router.post("/set-organization-custom-domain", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId, prefix, baseDomain } = req.body as {
      organizationId: string;
      prefix: string;
      baseDomain: string;
    };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });

    const p = (prefix || "admin").toLowerCase().trim();
    const d = (baseDomain || "").toLowerCase().trim();
    if (!SUBDOMAIN_RE.test(p)) return res.status(400).json({ success: false, error: "Invalid subdomain prefix" });
    if (!HOSTNAME_RE.test(d)) return res.status(400).json({ success: false, error: "Invalid base domain" });

    const fullDomain = `${p}.${d}`;

    const existing = await prisma.organization.findFirst({
      where: { custom_domain: fullDomain, id: { not: organizationId } },
    });
    if (existing) return res.status(409).json({ success: false, error: "Domain already in use by another organization" });

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        custom_domain: fullDomain,
        custom_domain_prefix: p,
        custom_domain_verified: false,
      },
    });

    await cacheDel(`domain-lookup:${fullDomain}`);
    res.json({ success: true, domain: org.custom_domain, prefix: org.custom_domain_prefix });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/remove-organization-custom-domain", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { custom_domain: true } });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { custom_domain: null, custom_domain_prefix: null, custom_domain_verified: false },
    });

    if (org?.custom_domain) await cacheDel(`domain-lookup:${org.custom_domain}`);
    res.json({ success: true, message: "Custom domain removed" });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

/** Public IPv4 of the host that serves HTTPS (Caddy). Must match branded-domain A records; do not rely on CNAME to a CDN-proxied app hostname. */
const SERVER_IP = (process.env.SERVER_IP || process.env.MAIL_SEND_IP || "").trim();

router.post("/verify-organization-custom-domain", adminOnly, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { custom_domain: true },
    });
    if (!org?.custom_domain) return res.status(400).json({ success: false, error: "No custom domain set" });

    const domain = org.custom_domain;

    if (!SERVER_IP) {
      return res.json({
        success: true,
        verified: false,
        message:
          "Set SERVER_IP (or MAIL_SEND_IP) on the API service to this server’s public IPv4. Branded domains must use an A record to that address.",
      });
    }

    let verified = false;
    try {
      const ips = await dns.promises.resolve4(domain);
      if (ips.includes(SERVER_IP)) verified = true;
    } catch {
      /* no A record yet */
    }

    if (verified) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { custom_domain_verified: true },
      });
      await cacheDel(`domain-lookup:${domain}`);
      return res.json({ success: true, verified: true, message: "Domain verified" });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { custom_domain_verified: false },
    });
    await cacheDel(`domain-lookup:${domain}`);

    res.json({
      success: true,
      verified: false,
      message: `Add an A record: ${domain} → ${SERVER_IP}. Do not CNAME to your main app hostname if it is behind Cloudflare (or similar); that sends traffic to the CDN, which will not serve this customer hostname. Wait for DNS propagation, then verify again.`,
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as adminRouter };
