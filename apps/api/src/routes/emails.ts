import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization, getMemberOrAdmin } from "../lib/access.js";
import { checkDomainDkim, checkDomainDmarc, checkDomainMx, checkDomainSpf } from "../lib/email-dns.js";
import { config } from "../config.js";
import * as s3 from "../lib/storage/s3.js";
import { pathParam, queryParam } from "../lib/req-params.js";
import {
  getExpectedMxHost,
  getExpectedSpfRecord,
  getDkimRecordName,
  getExpectedDmarcRecord,
} from "../lib/email-dns.js";
import { getOrgReplyAddress, sendViaMailApp } from "../lib/email-send.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(requireAuth);

function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}

function extractDomainFromEmail(addr: string): string | null {
  const parts = addr.split("@");
  return parts.length === 2 ? parts[1].toLowerCase().trim() : null;
}

// GET /api/emails/enabled?organizationId=...
router.get("/enabled", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    const org = await prisma.organization.findUnique({ where: { id: organizationId! }, select: { emails_enabled: true } });
    res.json({ success: true, enabled: org?.emails_enabled || false });
  } catch (error: any) {
    res.json({ success: false, enabled: false, error: error.message });
  }
});

// GET /api/emails/addresses?organizationId=...
router.get("/addresses", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const websites = await prisma.websites.findMany({ where: { organization_id: organizationId }, select: { domain: true } });
    const orgDomains = new Set(websites.map(w => w.domain.toLowerCase().trim()));
    if (orgDomains.size === 0) return res.json({ success: true, emailAddresses: [] });

    const emails = await prisma.email.findMany({ where: { organization_id: organizationId }, select: { to: true } });
    const emailSet = new Set<string>();
    emails.forEach((e: any) => {
      if (e.to) {
        let items: string[] = [];
        try { const p = JSON.parse(e.to); items = Array.isArray(p) ? p : [p]; } catch { items = [e.to]; }
        items.forEach(item => {
          const addr = extractEmailAddress(item);
          const domain = extractDomainFromEmail(addr);
          if (domain && orgDomains.has(domain)) emailSet.add(addr.toLowerCase());
        });
      }
    });
    res.json({ success: true, emailAddresses: Array.from(emailSet).sort() });
  } catch (error: any) {
    res.json({ success: false, error: error.message, emailAddresses: [] });
  }
});

// GET /api/emails/unread-count?organizationId=...
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    if (!(await canAccessOrganization(organizationId!, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const count = await prisma.email.count({ where: { organization_id: organizationId!, read: false } });
    res.json({ success: true, count });
  } catch (error: any) {
    res.json({ success: false, error: error.message, count: 0 });
  }
});

// GET /api/emails/setup-status?organizationId=...
router.get("/setup-status", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        emails_enabled: true,
        email_domain_id: true,
        email_dns_verified_at: true,
        email_dns_last_check_at: true,
        email_dns_last_error: true,
        email_from_address: true,
        email_domain: { select: { domain: true } },
      },
    });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });
    const access = !!org.emails_enabled;
    const hasDomain = !!org.email_domain_id && !!org.email_domain;
    const setupComplete = access && hasDomain && !!org.email_dns_verified_at && !org.email_dns_last_error;
    const domain = org.email_domain?.domain ?? "";
    const [expectedMxHost, expectedSpfRecord] = await Promise.all([
      getExpectedMxHost(),
      getExpectedSpfRecord(domain || undefined),
    ]);
    const dkimInfo = domain ? getDkimRecordName(domain) : null;
    const expectedDmarcRecord = domain ? getExpectedDmarcRecord(domain) : "";
    const dmarcRecordName = domain ? `_dmarc.${domain}` : "";

    const dnsRecords = domain
      ? {
          mx: {
            type: "MX" as const,
            name: domain,
            value: expectedMxHost || "mail.yourdomain.com",
            priority: 10,
          },
          spf: {
            type: "TXT" as const,
            name: domain,
            value: expectedSpfRecord,
          },
          dkim: {
            type: "TXT" as const,
            name: dkimInfo?.name ?? "",
            selector: dkimInfo?.selector ?? "default",
            valueNote: "Your mail provider (e.g. Cloudflare Email Routing, Mailgun, or your server) gives you a DKIM public key. In your DNS, add the TXT record they provide. The record name is usually <selector>._domainkey.<domain> — we use selector \"default\" unless your provider uses another. The TXT value is the public key from the provider; we cannot generate it here.",
          },
          dmarc: {
            type: "TXT" as const,
            name: dmarcRecordName,
            value: expectedDmarcRecord,
          },
        }
      : undefined;

    res.json({
      success: true,
      access,
      setupComplete,
      domain: domain || undefined,
      expectedMxHost: expectedMxHost || undefined,
      lastCheckAt: org.email_dns_last_check_at?.toISOString(),
      lastError: org.email_dns_last_error ?? undefined,
      emailFromAddress: org.email_from_address ?? undefined,
      dnsRecords,
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/setup-domain — set email domain (website) for org. Owner/admin or platform admin only.
router.post("/setup-domain", async (req: Request, res: Response) => {
  try {
    const { organizationId, websiteId } = req.body as { organizationId?: string; websiteId?: string };
    if (!organizationId || !websiteId) return res.status(400).json({ success: false, error: "organizationId and websiteId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const member = await getMemberOrAdmin(organizationId, req.user);
    if (!member || (member.role !== "owner" && member.role !== "admin")) return res.status(403).json({ success: false, error: "Only owners and admins can set the email domain" });
    const website = await prisma.websites.findUnique({ where: { id: websiteId }, select: { id: true, domain: true, organization_id: true } });
    if (!website || website.organization_id !== organizationId) return res.status(400).json({ success: false, error: "Website not found or does not belong to this organization" });
    const now = new Date();
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        emails_enabled: true,
        email_domain_id: websiteId,
        email_from_address: `replies@${website.domain}`,
        email_dns_verified_at: null,
        email_dns_last_check_at: null,
        email_dns_last_error: null,
      },
    });
    res.json({ success: true, message: "Domain set. Add the MX record and then click Verify DNS." });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/verify-dns — check MX for org's email domain and update verified flag if ok.
router.post("/verify-dns", async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body as { organizationId?: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { email_domain_id: true, email_domain: { select: { domain: true } } },
    });
    if (!org?.email_domain_id || !org.email_domain) return res.status(400).json({ success: false, error: "No email domain set. Select a domain first." });
    const domain = org.email_domain.domain;
    const [mx, spf, dkim, dmarc] = await Promise.all([
      checkDomainMx(domain),
      checkDomainSpf(domain),
      checkDomainDkim(domain),
      checkDomainDmarc(domain),
    ]);
    const now = new Date();
    const allOk = mx.ok && spf.ok && dkim.ok && dmarc.ok;
    if (allOk) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { email_dns_verified_at: now, email_dns_last_check_at: now, email_dns_last_error: null },
      });
      return res.json({
        success: true,
        message: "DNS verified. You can send and receive email.",
        expectedHost: mx.expectedHost,
        actualHosts: mx.actualHosts,
        checks: {
          mx,
          spf,
          dkim,
          dmarc,
        },
      });
    }
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        email_dns_last_check_at: now,
        email_dns_last_error:
          (!mx.ok && (mx.error || "MX check failed")) ||
          (!spf.ok && (spf.error || "SPF check failed")) ||
          (!dkim.ok && (dkim.error || "DKIM check failed")) ||
          (!dmarc.ok && (dmarc.error || "DMARC check failed")) ||
          "DNS check failed",
      },
    });
    res.json({
      success: false,
      error:
        (!mx.ok && (mx.error || "MX check failed")) ||
        (!spf.ok && (spf.error || "SPF check failed")) ||
        (!dkim.ok && (dkim.error || "DKIM check failed")) ||
        (!dmarc.ok && (dmarc.error || "DMARC check failed")) ||
        "DNS check failed",
      expectedHost: mx.expectedHost,
      actualHosts: mx.actualHosts,
      checks: {
        mx,
        spf,
        dkim,
        dmarc,
      },
    });
  } catch (error: unknown) {
    const reqWithId = req as Request & { requestId?: string };
    logger.logError(error, "Emails verify-dns failed", { organizationId: (req.body as any)?.organizationId }, reqWithId.requestId);
    res.json({ success: false, error: error instanceof Error ? error.message : "Verify failed" });
  }
});

// POST /api/emails/send
router.post("/send", async (req: Request, res: Response) => {
  try {
    const { organizationId, to: toInput, subject, text, html, attachments: attachmentsInput } = req.body as {
      organizationId?: string; to?: string | string[]; subject?: string; text?: string; html?: string;
      attachments?: { storageKey?: string; filename?: string; contentType?: string; contentBase64?: string }[];
    };
    if (!organizationId || !subject || (!text && !html)) {
      return res.status(400).json({ success: false, error: "organizationId, subject, and text or html required" });
    }
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const { from, replyTo } = await getOrgReplyAddress(organizationId);
    const toList = Array.isArray(toInput) ? toInput : toInput ? [toInput] : [];
    if (toList.length === 0) return res.status(400).json({ success: false, error: "At least one recipient required" });
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
    const attachments: { filename: string; contentType: string; contentBase64: string }[] = [];
    if (attachmentsInput && attachmentsInput.length > 0 && attachmentsInput.length <= 10) {
      for (const a of attachmentsInput) {
        if (a.contentBase64 && a.filename && a.contentType) {
          attachments.push({ filename: a.filename, contentType: a.contentType, contentBase64: a.contentBase64 });
        }
      }
    }
    const { messageId: sentMessageId } = await sendViaMailApp({
      from, replyTo, to: toList, subject,
      text: text || "", html: html || undefined,
      attachments: attachments.length ? attachments : undefined,
      messageId,
    });
    const emailRecord = await prisma.email.create({
      data: {
        organization_id: organizationId,
        from: replyTo,
        to: JSON.stringify(toList),
        subject,
        text: text || null,
        html: html || null,
        direction: "outbound",
        messageId: sentMessageId,
        sent_at: new Date(),
        receivedAt: null,
      },
    });
    const reqWithId = req as Request & { requestId?: string };
    logger.info("Email sent (outbound)", { to: toList, subject, messageId: sentMessageId, emailId: emailRecord.id, organizationId }, reqWithId.requestId);
    res.json({ success: true, data: { id: emailRecord.id, messageId: sentMessageId } });
  } catch (error: unknown) {
    const reqWithId = req as Request & { requestId?: string };
    logger.logError(error, "Emails send failed", { organizationId: (req.body as any)?.organizationId }, reqWithId.requestId);
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Send failed" });
  }
});

// GET /api/emails?organizationId=...&page=1&limit=20&read=true&search=...&from=...&emailAddresses=a,b
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    const page = parseInt(queryParam(req, "page") ?? "", 10) || 1;
    const limit = parseInt(queryParam(req, "limit") ?? "", 10) || 20;
    const readParam = queryParam(req, "read");
    const read = readParam !== undefined ? readParam === "true" : undefined;
    const search = queryParam(req, "search");
    const from = queryParam(req, "from");
    const emailAddressesRaw = queryParam(req, "emailAddresses");
    const emailAddresses = emailAddressesRaw ? emailAddressesRaw.split(",") : undefined;

    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { emails_enabled: true } });
    if (!org?.emails_enabled) return res.status(400).json({ success: false, error: "Emails not enabled" });

    const where: any = { organization_id: organizationId };
    if (read !== undefined) where.read = read;
    if (from) where.from = { contains: from, mode: "insensitive" };

    const andConditions: any[] = [];
    if (emailAddresses && emailAddresses.length > 0) {
      const emailFilters: any[] = [];
      emailAddresses.forEach(email => {
        emailFilters.push({ from: { contains: email.toLowerCase(), mode: "insensitive" } });
        emailFilters.push({ to: { contains: email.toLowerCase(), mode: "insensitive" } });
      });
      andConditions.push({ OR: emailFilters });
    }
    if (search) {
      andConditions.push({ OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { from: { contains: search, mode: "insensitive" } },
        { text: { contains: search, mode: "insensitive" } },
      ]});
    }
    if (andConditions.length > 0) where.AND = andConditions;

    const [total, unreadCount] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.count({ where: { ...where, read: false } }),
    ]);

    const emails = await prisma.email.findMany({
      where, orderBy: { receivedAt: "desc" }, skip: (page - 1) * limit, take: limit,
      include: { attachments: true },
    });

    const transformed = emails.map((e: any) => {
      let toArray: string[] = [];
      if (e.to) { try { const p = JSON.parse(e.to); toArray = Array.isArray(p) ? p : [p]; } catch { toArray = [e.to]; } }
      return {
        id: e.id, from: e.from || "", to: toArray, cc: [], bcc: [],
        subject: e.subject || "", date: e.receivedAt || e.createdAt,
        textBody: e.text || null, htmlBody: e.html || null, read: e.read, createdAt: e.createdAt,
        direction: (e as any).direction ?? "inbound",
        in_reply_to: (e as any).in_reply_to ?? undefined,
        attachments: e.attachments.map((a: any) => {
          const base = config.apiUrl.replace(/\/$/, "");
          const url = a.r2Key ? `${base}/api/files/${encodeURIComponent(a.r2Key)}` : a.url;
          return { filename: a.filename, file_size: a.size || 0, mime_type: a.contentType, r2_key: a.r2Key, r2_url: url, storage_key: a.r2Key };
        }),
        inlineImages: [],
      };
    });

    res.json({ success: true, data: { emails: transformed, pagination: { page, limit, total, unreadCount, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/emails/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({
      where: { id },
      include: { organization: { select: { id: true, name: true } }, attachments: true },
    });
    if (!email) return res.status(404).json({ success: false, error: "Email not found" });
    if (!email.organization_id) return res.status(400).json({ success: false, error: "Email has no organization" });

    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    res.json({ success: true, data: email });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/:id/read
router.post("/:id/read", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, select: { organization_id: true } });
    if (!email) return res.status(404).json({ success: false, error: "Email not found" });
    if (!email.organization_id) return res.status(400).json({ success: false, error: "No organization" });

    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    await prisma.email.update({ where: { id: id! }, data: { read: true } });

    const notifications = await prisma.notifications.findMany({ where: { user_id: req.user.id, read: false }, select: { id: true, data: true } });
    const matchingIds = notifications.filter((n: any) => (n.data as any)?.emailId === id).map(n => n.id);
    if (matchingIds.length > 0) await prisma.notifications.updateMany({ where: { id: { in: matchingIds } }, data: { read: true } });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/:id/unread
router.post("/:id/unread", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, select: { organization_id: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });

    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    await prisma.email.update({ where: { id: id! }, data: { read: false } });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/:id/reply
router.post("/:id/reply", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const { text, html } = req.body as { text?: string; html?: string };
    if (!text && !html) return res.status(400).json({ success: false, error: "text or html required" });
    const original = await prisma.email.findUnique({
      where: { id },
      select: { id: true, organization_id: true, from: true, subject: true, messageId: true, references: true },
    });
    if (!original?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });
    if (!(await canAccessOrganization(original.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const { from, replyTo } = await getOrgReplyAddress(original.organization_id);
    const toAddr = original.from || "";
    const reSubject = (original.subject || "").toLowerCase().startsWith("re:") ? (original.subject || "") : `Re: ${original.subject || ""}`;
    const refs = [original.references, original.messageId].filter(Boolean).join(" ");
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
    const { messageId: sentMessageId } = await sendViaMailApp({
      from, replyTo, to: [toAddr], subject: reSubject,
      text: text || "", html: html || undefined,
      inReplyTo: original.messageId || undefined, references: refs || undefined, messageId,
    });
    const emailRecord = await prisma.email.create({
      data: {
        organization_id: original.organization_id,
        from: replyTo,
        to: JSON.stringify([toAddr]),
        subject: reSubject,
        text: text || null,
        html: html || null,
        direction: "outbound",
        messageId: sentMessageId,
        in_reply_to: original.messageId || undefined,
        references: refs || undefined,
        sent_at: new Date(),
        receivedAt: null,
      },
    });
    res.json({ success: true, data: { id: emailRecord.id, messageId: sentMessageId } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/emails/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, include: { attachments: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });

    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    let emailSize = 0;
    if (email.text) emailSize += Buffer.byteLength(email.text, "utf8");
    if (email.html) emailSize += Buffer.byteLength(email.html, "utf8");

    const attachments = (email as typeof email & { attachments: { size?: number; r2Key?: string }[] }).attachments ?? [];
    for (const att of attachments) {
      if (att.size) emailSize += att.size;
      if (att.r2Key && s3.isStorageConfigured()) {
        try { await s3.remove(att.r2Key); } catch {}
      }
    }

    const orgId = email.organization_id;
    await prisma.email.delete({ where: { id: id! } });

    if (orgId) {
      const { updateOrganizationStorage } = await import("../lib/utils/storage.js");
      await updateOrganizationStorage(orgId, -emailSize);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/emails/:id/attachment/:index — returns proxy URL for the attachment (client can GET that URL with auth to stream or download)
router.get("/:id/attachment/:index", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, include: { attachments: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });

    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const attachments = (email as typeof email & { attachments: { r2Key?: string; filename?: string; contentType?: string }[] }).attachments ?? [];
    const idx = parseInt(pathParam(req, "index") ?? "", 10);
    if (Number.isNaN(idx) || idx >= attachments.length) return res.status(404).json({ success: false, error: "Attachment not found" });

    const att = attachments[idx];
    if (!att.r2Key) return res.status(400).json({ success: false, error: "No storage key" });

    const base = config.apiUrl.replace(/\/$/, "");
    const url = `${base}/api/files/${encodeURIComponent(att.r2Key)}`;
    res.json({ success: true, url, filename: att.filename, contentType: att.contentType });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as emailsRouter };
