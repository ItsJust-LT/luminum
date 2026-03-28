import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization, getMemberOrAdmin } from "../lib/access.js";
import { checkDomainDkim, checkDomainDmarc, checkDomainMx, checkDomainSpf } from "../lib/email-dns.js";
import { config } from "../config.js";
import * as s3 from "../lib/storage/s3.js";
import { pathParam, queryParam } from "../lib/req-params.js";
import {
  getPrescribedInboundMxHost,
  getExpectedSpfRecordForDomain,
  getDkimRecordName,
  getExpectedDmarcRecord,
} from "../lib/email-dns.js";
import { getOrgReplyAddress, sendOutboundWithFallback } from "../lib/email-send.js";
import { syncOrganizationSesDomainInDb } from "../lib/email-ses.js";
import { logger } from "../lib/logger.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "../lib/email-system.js";

const MAIL_DKIM_DNS_VALUE = (process.env.MAIL_DKIM_DNS_VALUE || "").trim();

const router = Router();
router.use(requireAuth);

function jsonEmailSystemDisabled(res: Response) {
  return res.json({ success: false, emailSystemUnavailable: true, error: EMAIL_SYSTEM_UNAVAILABLE_MESSAGE });
}

function jsonEmailSystemDisabledList(res: Response) {
  return res.json({
    success: false,
    emailSystemUnavailable: true,
    error: EMAIL_SYSTEM_UNAVAILABLE_MESSAGE,
    data: {
      emails: [],
      pagination: { page: 1, limit: 50, total: 0, unreadCount: 0, totalPages: 0, hasMore: false },
    },
  });
}

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
    const sys = isEmailSystemEnabled();
    res.json({
      success: true,
      enabled: sys && (org?.emails_enabled || false),
      systemEmailAvailable: sys,
    });
  } catch (error: any) {
    res.json({ success: false, enabled: false, systemEmailAvailable: false, error: error.message });
  }
});

// GET /api/emails/addresses?organizationId=...
router.get("/addresses", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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
    if (!isEmailSystemEnabled()) {
      return res.json({
        success: true,
        access: false,
        setupComplete: false,
        emailSystemUnavailable: true,
        error: EMAIL_SYSTEM_UNAVAILABLE_MESSAGE,
      });
    }
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
        email_ses_verified_at: true,
        email_ses_last_error: true,
        email_domain: { select: { domain: true } },
      },
    });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });
    const access = !!org.emails_enabled;
    const hasDomain = !!org.email_domain_id && !!org.email_domain;
    const setupComplete = access && hasDomain && !!org.email_dns_verified_at && !org.email_dns_last_error;
    const domain = org.email_domain?.domain ?? "";
    const expectedMxHost = domain ? getPrescribedInboundMxHost(domain) : "";
    const expectedSpfRecord = domain ? getExpectedSpfRecordForDomain(domain) : "";
    const dkimInfo = domain ? getDkimRecordName(domain) : null;
    const expectedDmarcRecord = domain ? getExpectedDmarcRecord(domain) : "";
    const dmarcRecordName = domain ? `_dmarc.${domain}` : "";

    const mailSendIp = (process.env.MAIL_SEND_IP || "").trim();
    let mailHostA: {
      type: "A";
      name: string;
      fqdn: string;
      value: string;
    } | undefined;
    if (domain && mailSendIp && expectedMxHost) {
      const d = domain.toLowerCase().replace(/\.$/, "");
      const suffix = `.${d}`;
      const fqdn = expectedMxHost.toLowerCase().replace(/\.$/, "");
      const relative =
        fqdn.endsWith(suffix) && fqdn.length > suffix.length ? fqdn.slice(0, -suffix.length) : fqdn;
      mailHostA = {
        type: "A",
        name: relative,
        fqdn: expectedMxHost,
        value: mailSendIp,
      };
    }

    const dkimValueNote =
      "Set MAIL_DKIM_DNS_VALUE on the API host to show the exact TXT value here, or paste the public key from your DKIM pair (private key lives in MAIL_DKIM_PRIVATE_KEY on the mail service).";

    const dnsRecords = domain
      ? {
          mx: {
            type: "MX" as const,
            name: "@",
            value: expectedMxHost || "mail.yourdomain.com",
            priority: 10,
          },
          ...(mailHostA ? { mailHostA } : {}),
          spf: {
            type: "TXT" as const,
            name: "@",
            value: expectedSpfRecord,
            ...(!expectedSpfRecord
              ? {
                  valueNote:
                    "SPF must authorize your sending server by IPv4. Set MAIL_SEND_IP on the API host to your server’s public IPv4, then add the TXT value shown here once it appears.",
                }
              : {}),
          },
          dkim: {
            type: "TXT" as const,
            name: dkimInfo?.name ?? "",
            selector: dkimInfo?.selector ?? "default",
            ...(MAIL_DKIM_DNS_VALUE ? { value: MAIL_DKIM_DNS_VALUE } : {}),
            valueNote: MAIL_DKIM_DNS_VALUE
              ? "Paste this TXT value at your DNS provider (from MAIL_DKIM_DNS_VALUE on the server)."
              : dkimValueNote,
          },
          dmarc: {
            type: "TXT" as const,
            name: dmarcRecordName,
            value: expectedDmarcRecord,
          },
        }
      : undefined;

    const setupNotes = domain
      ? [
          "Use only the MX target below for this domain. Remove conflicting MX records (e.g. registrar forwarding or another provider).",
          mailSendIp
            ? `Point the A record for the mail host (${expectedMxHost}) to ${mailSendIp}. If you use Cloudflare, use DNS only (grey cloud), not proxied, so SMTP reaches your server.`
            : "Set MAIL_SEND_IP in the API environment to the server’s public IPv4 so we can show the exact A record and SPF line.",
          "Your host must allow inbound TCP 25 to the mail container for receiving mail.",
          process.env.EMAIL_SEND_FALLBACK_SES_ENABLED === "true"
            ? "For SES fallback: add this domain as a verified identity in Amazon SES (same domain as below), publish SES DKIM CNAMEs, and include Amazon SES in SPF. Click Verify DNS to sync SES status."
            : "",
        ].filter(Boolean)
      : undefined;

    const sesFallbackEnabled = process.env.EMAIL_SEND_FALLBACK_SES_ENABLED === "true";
    const sesDomainReady = !!org.email_ses_verified_at;

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
      setupNotes,
      sesFallback: sesFallbackEnabled
        ? {
            enabled: true,
            domainVerified: sesDomainReady,
            verifiedAt: org.email_ses_verified_at?.toISOString(),
            lastError: org.email_ses_last_error ?? undefined,
          }
        : { enabled: false, domainVerified: false },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/setup-domain — set email domain (website) for org. Owner/admin or platform admin only.
router.post("/setup-domain", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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

// POST /api/emails/sync-ses — refresh Amazon SES domain verification status for the org (no DNS checks).
router.post("/sync-ses", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    if (process.env.EMAIL_SEND_FALLBACK_SES_ENABLED !== "true") {
      return res.status(400).json({ success: false, error: "SES fallback is not enabled on this server" });
    }
    const { organizationId } = req.body as { organizationId?: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const sync = await syncOrganizationSesDomainInDb(organizationId);
    if (sync.ok) {
      return res.json({ success: true, message: "SES domain identity verified", domain: sync.domain });
    }
    return res.json({
      success: false,
      error: sync.error || "SES domain not verified",
      domain: sync.domain,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "SES sync failed";
    res.status(400).json({ success: false, error: msg });
  }
});

// POST /api/emails/verify-dns — check MX for org's email domain and update verified flag if ok.
router.post("/verify-dns", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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
    let sesSync: { ok: boolean; error?: string } | undefined;
    if (process.env.EMAIL_SEND_FALLBACK_SES_ENABLED === "true") {
      try {
        const s = await syncOrganizationSesDomainInDb(organizationId);
        sesSync = { ok: s.ok, error: s.error };
      } catch (e) {
        sesSync = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
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
        sesSync,
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
      sesSync,
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
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const { organizationId, to: toInput, subject, text, html, attachments: attachmentsInput, fromLocalPart } = req.body as {
      organizationId?: string; to?: string | string[]; subject?: string; text?: string; html?: string;
      attachments?: { storageKey?: string; filename?: string; contentType?: string; contentBase64?: string }[];
      /** Mailbox name only (before @); must match org email domain on the server. */
      fromLocalPart?: string;
    };
    if (!organizationId || !subject || (!text && !html)) {
      return res.status(400).json({ success: false, error: "organizationId, subject, and text or html required" });
    }
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    let from: string;
    let replyTo: string;
    try {
      ({ from, replyTo } = await getOrgReplyAddress(organizationId, fromLocalPart));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Invalid From")) {
        return res.status(400).json({ success: false, error: msg });
      }
      throw err;
    }
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
    const sendResult = await sendOutboundWithFallback(organizationId, {
      from, replyTo, to: toList, subject,
      text: text || "", html: html || undefined,
      attachments: attachments.length ? attachments : undefined,
      messageId,
    });
    const emailRecord = await prisma.email.create({
      data: {
        organization_id: organizationId,
        from,
        to: JSON.stringify(toList),
        subject,
        text: text || null,
        html: html || null,
        direction: "outbound",
        messageId: sendResult.messageId,
        sent_at: new Date(),
        receivedAt: null,
        outbound_provider: sendResult.provider,
        fallback_used: sendResult.fallbackUsed,
        fallback_reason: sendResult.fallbackUsed ? sendResult.primaryError ?? null : null,
        provider_message_id: sendResult.providerMessageId ?? null,
      },
    });
    const reqWithId = req as Request & { requestId?: string };
    logger.info("Email sent (outbound)", {
      to: toList,
      subject,
      messageId: sendResult.messageId,
      emailId: emailRecord.id,
      organizationId,
      provider: sendResult.provider,
      fallbackUsed: sendResult.fallbackUsed,
      providerMessageId: sendResult.providerMessageId,
      primaryErrorCategory: sendResult.fallbackUsed ? "mail_app_delivery" : undefined,
    }, reqWithId.requestId);
    res.json({
      success: true,
      data: {
        id: emailRecord.id,
        messageId: sendResult.messageId,
        provider: sendResult.provider,
        fallbackUsed: sendResult.fallbackUsed,
        providerMessageId: sendResult.providerMessageId,
      },
    });
  } catch (error: unknown) {
    const reqWithId = req as Request & { requestId?: string };
    logger.logError(error, "Emails send failed", { organizationId: (req.body as any)?.organizationId }, reqWithId.requestId);
    const msg = error instanceof Error ? error.message : "Send failed";
    const isUnavailable = msg === EMAIL_SYSTEM_UNAVAILABLE_MESSAGE;
    res.status(400).json({
      success: false,
      error: isUnavailable ? EMAIL_SYSTEM_UNAVAILABLE_MESSAGE : msg,
      ...(isUnavailable && { emailSystemUnavailable: true }),
    });
  }
});

// GET /api/emails?organizationId=...&page=1&limit=20&read=true&search=...&from=...&emailAddresses=a,b
router.get("/", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabledList(res);
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
        outbound_provider: (e as any).outbound_provider ?? null,
        fallback_used: !!(e as any).fallback_used,
        provider_message_id: (e as any).provider_message_id ?? null,
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
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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

// POST /api/emails/mark-all-read
router.post("/mark-all-read", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const { organizationId } = req.body as { organizationId?: string };
    if (!organizationId) {
      return res.status(400).json({ success: false, error: "organizationId required" });
    }
    if (!(await canAccessOrganization(organizationId, req.user))) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const result = await prisma.email.updateMany({
      where: { organization_id: organizationId, read: false },
      data: { read: true },
    });

    const unreadNotifications = await prisma.notifications.findMany({
      where: { user_id: req.user.id, read: false },
      select: { id: true, data: true },
    });
    const emailIds = await prisma.email.findMany({
      where: { organization_id: organizationId },
      select: { id: true },
    });
    const emailIdSet = new Set(emailIds.map((e) => e.id));
    const matchingNotificationIds = unreadNotifications
      .filter((n: any) => emailIdSet.has((n.data as any)?.emailId))
      .map((n) => n.id);
    if (matchingNotificationIds.length > 0) {
      await prisma.notifications.updateMany({
        where: { id: { in: matchingNotificationIds } },
        data: { read: true },
      });
    }

    res.json({ success: true, updated: result.count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/emails/:id/reply
router.post("/:id/reply", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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
    const sendResult = await sendOutboundWithFallback(original.organization_id, {
      from, replyTo, to: [toAddr], subject: reSubject,
      text: text || "", html: html || undefined,
      inReplyTo: original.messageId || undefined, references: refs || undefined, messageId,
    });
    const emailRecord = await prisma.email.create({
      data: {
        organization_id: original.organization_id,
        from,
        to: JSON.stringify([toAddr]),
        subject: reSubject,
        text: text || null,
        html: html || null,
        direction: "outbound",
        messageId: sendResult.messageId,
        in_reply_to: original.messageId || undefined,
        references: refs || undefined,
        sent_at: new Date(),
        receivedAt: null,
        outbound_provider: sendResult.provider,
        fallback_used: sendResult.fallbackUsed,
        fallback_reason: sendResult.fallbackUsed ? sendResult.primaryError ?? null : null,
        provider_message_id: sendResult.providerMessageId ?? null,
      },
    });
    const reqWithId = req as Request & { requestId?: string };
    logger.info("Email sent (reply)", {
      emailId: emailRecord.id,
      organizationId: original.organization_id,
      messageId: sendResult.messageId,
      provider: sendResult.provider,
      fallbackUsed: sendResult.fallbackUsed,
      providerMessageId: sendResult.providerMessageId,
    }, reqWithId.requestId);
    res.json({
      success: true,
      data: {
        id: emailRecord.id,
        messageId: sendResult.messageId,
        provider: sendResult.provider,
        fallbackUsed: sendResult.fallbackUsed,
        providerMessageId: sendResult.providerMessageId,
      },
    });
  } catch (error: any) {
    const reqWithId = req as Request & { requestId?: string };
    const replyEmailId = pathParam(req, "id");
    logger.logError(error, "Emails reply failed", { emailId: replyEmailId }, reqWithId.requestId);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/emails/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
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

// GET /api/emails/:id/attachment/:index — streams attachment bytes with auth.
router.get("/:id/attachment/:index", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, include: { attachments: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });

    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const attachments = (email as typeof email & { attachments: { r2Key?: string; filename?: string; contentType?: string }[] }).attachments ?? [];
    const idx = parseInt(pathParam(req, "index") ?? "", 10);
    if (Number.isNaN(idx) || idx >= attachments.length) return res.status(404).json({ success: false, error: "Attachment not found" });

    const att = attachments[idx];
    if (!att.r2Key) return res.status(400).json({ success: false, error: "No storage key" });

    if (!s3.isStorageConfigured()) {
      return res.status(503).json({ success: false, error: "Storage not configured" });
    }

    const head = await s3.headObject(att.r2Key);
    if (!head) return res.status(404).json({ success: false, error: "Attachment not found" });
    const obj = await s3.getObject(att.r2Key);
    if (!obj) return res.status(404).json({ success: false, error: "Attachment not found" });

    const download = /^1|true|yes$/i.test((req.query.download as string) ?? "");
    const filename = (att.filename || att.r2Key.split("/").pop() || "attachment").replace(/"/g, "%22");
    res.setHeader("Content-Type", obj.contentType || att.contentType || "application/octet-stream");
    if (obj.contentLength) res.setHeader("Content-Length", obj.contentLength);
    if (obj.etag) res.setHeader("ETag", `"${obj.etag}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader(
      "Content-Disposition",
      download ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`
    );
    obj.stream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as emailsRouter };
