import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { canAccessOrganization, getMemberOrAdmin } from "../lib/access.js";
import { checkDomainDmarc, checkDomainSpf, getExpectedDmarcRecord } from "../lib/email-dns.js";
import { config } from "../config.js";
import * as s3 from "../lib/storage/s3.js";
import { pathParam, queryParam } from "../lib/req-params.js";
import { getOrgReplyAddress, sendOutboundViaResend } from "../lib/email-send.js";
import { logger } from "../lib/logger.js";
import { isEmailSystemEnabled, EMAIL_SYSTEM_UNAVAILABLE_MESSAGE } from "../lib/email-system.js";
import { decryptEmailSecret, getEmailSecretsKeyIssue, isEmailSecretsKeyConfigured } from "../lib/email-secrets.js";
import { getOrgWithResendFields, validateOrgResendDomain } from "../lib/resend-org.js";
import { mailboxOrderBy, mailboxWhere, parseMailbox } from "../lib/email-mailbox.js";
import {
  broadcastOrgEmailDeleted,
  broadcastOrgEmailOutboundSent,
  broadcastOrgEmailUpdated,
} from "../lib/org-ws-broadcast.js";
import { loadEmailThread } from "../lib/email-thread.js";
import { mergeOutboundWithSignature, sanitizeComposeHtml } from "../lib/email-outbound-body.js";
import { normalizeAttachmentsFromRequest } from "../lib/email-attachments.js";

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

/** Who should receive a reply when threading ends on this row. */
function replyToAddressForEmail(row: {
  from: string | null;
  to: string | null;
  direction: string;
}): string | null {
  if (row.direction === "outbound") {
    if (!row.to?.trim()) return null;
    try {
      const p = JSON.parse(row.to);
      const list = Array.isArray(p) ? p : [p];
      const first = list[0];
      if (first != null && String(first).trim()) {
        return extractEmailAddress(String(first));
      }
    } catch {
      return extractEmailAddress(row.to);
    }
    return null;
  }
  return row.from ? extractEmailAddress(row.from) : null;
}

function extractDomainFromEmail(addr: string): string | null {
  const parts = addr.split("@");
  return parts.length === 2 ? parts[1].toLowerCase().trim() : null;
}

function senderDisplayName(req: Request): string | undefined {
  const u = (req as Request & { user?: { name?: string | null } }).user;
  const n = u?.name?.trim();
  return n || undefined;
}

function mapEmailToClientDto(e: any) {
  let toArray: string[] = [];
  if (e.to) {
    try {
      const p = JSON.parse(e.to);
      toArray = Array.isArray(p) ? p : [p];
    } catch {
      toArray = [e.to];
    }
  }
  const dateRaw = e.sent_at || e.receivedAt || e.scheduled_send_at || e.createdAt;
  return {
    id: e.id,
    from: e.from || "",
    to: toArray,
    cc: [],
    bcc: [],
    subject: e.subject || "",
    date: dateRaw,
    textBody: e.text || null,
    htmlBody: e.html || null,
    read: e.read,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    direction: e.direction ?? "inbound",
    outbound_provider: e.outbound_provider ?? null,
    fallback_used: !!e.fallback_used,
    provider_message_id: e.provider_message_id ?? null,
    in_reply_to: e.in_reply_to ?? undefined,
    references: e.references ?? undefined,
    messageId: e.messageId ?? undefined,
    starred: !!e.starred,
    is_draft: !!e.is_draft,
    scheduled_send_at: e.scheduled_send_at ?? null,
    sent_at: e.sent_at ?? null,
    sender_avatar_url: e.sender_avatar_url ?? null,
    attachments: (e.attachments || []).map((a: any) => {
      const base = config.apiUrl.replace(/\/$/, "");
      const url = a.r2Key ? `${base}/api/files/${encodeURIComponent(a.r2Key)}` : a.url;
      return { filename: a.filename, file_size: a.size || 0, mime_type: a.contentType, r2_key: a.r2Key, r2_url: url, storage_key: a.r2Key };
    }),
    inlineImages: [],
  };
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

// GET /api/emails/setup-status?organizationId=... — Resend + optional SPF/DMARC hints
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
        resend_api_key_ciphertext: true,
        resend_webhook_secret_ciphertext: true,
        resend_last_validated_at: true,
        resend_last_error: true,
        email_domain: { select: { domain: true } },
      },
    });
    if (!org) return res.status(404).json({ success: false, error: "Organization not found" });
    const access = !!org.emails_enabled;
    const hasDomain = !!org.email_domain_id && !!org.email_domain;
    const domain = org.email_domain?.domain ?? "";
    const hasApiKey = Boolean(org.resend_api_key_ciphertext);
    const hasWebhookSecret = Boolean(org.resend_webhook_secret_ciphertext);
    const dnsVerified = Boolean(org.email_dns_verified_at);
    const secretsKeyConfigured = isEmailSecretsKeyConfigured();
    const secretsKeyIssue = getEmailSecretsKeyIssue();
    const inboundPipeline = {
      resendInboundReady: hasApiKey && hasWebhookSecret && dnsVerified,
    };
    const setupComplete = access && hasDomain && inboundPipeline.resendInboundReady;

    const expectedDmarcRecord = domain ? getExpectedDmarcRecord(domain) : "";
    const dmarcRecordName = domain ? `_dmarc.${domain}` : "";
    const [spf, dmarc] = domain
      ? await Promise.all([checkDomainSpf(domain), checkDomainDmarc(domain)])
      : [
          { ok: false, error: "No domain" as string | undefined },
          { ok: false, error: "No domain" as string | undefined },
        ];

    const dnsRecords = domain
      ? {
          spf: {
            type: "TXT" as const,
            name: "@",
            value: "v=spf1 include:amazonses.com ~all",
            valueNote:
              "Use the SPF value your mail provider shows for this domain if it differs from the example below.",
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
          "Add this domain to your mail provider, enable send and receive, and publish the DNS records they provide (including MX for inbound).",
          `Inbound webhook URL (for operator setup): ${config.apiUrl}/api/webhook/resend-inbound`,
          "A platform administrator completes mail credentials in Admin → Organization settings.",
          ...(!secretsKeyConfigured
            ? [
                secretsKeyIssue === "invalid_format"
                  ? "LUMINUM_EMAIL_SECRETS_KEY is set but invalid: use exactly 64 hexadecimal characters (32 bytes), e.g. openssl rand -hex 32."
                  : "Optional: set LUMINUM_EMAIL_SECRETS_KEY (64 hex chars) on the API for AES encryption of stored mail credentials.",
              ]
            : []),
          ...(!hasApiKey || !hasWebhookSecret
            ? ["Mail is not live until a platform administrator finishes setup in the admin console."]
            : []),
        ]
      : undefined;

    const liveChecks = {
      spf,
      dmarc,
      resend: {
        hasApiKey,
        hasWebhookSecret,
        dnsVerified,
        lastError: org.resend_last_error ?? null,
      },
    };

    let resendLive: { ok: boolean; error?: string | null; health?: unknown } | null = null;
    if (hasApiKey && domain && org.resend_api_key_ciphertext) {
      try {
        const k = decryptEmailSecret(org.resend_api_key_ciphertext);
        const v = await validateOrgResendDomain(k, domain);
        resendLive = { ok: v.ok, error: v.error ?? null, health: v.health };
      } catch (e) {
        resendLive = { ok: false, error: e instanceof Error ? e.message : "Could not verify domain with mail provider" };
      }
    }

    res.json({
      success: true,
      access,
      setupComplete,
      domain: domain || undefined,
      lastCheckAt: new Date().toISOString(),
      lastError: org.email_dns_last_error ?? org.resend_last_error ?? undefined,
      emailFromAddress: org.email_from_address ?? undefined,
      dnsRecords,
      setupNotes,
      liveChecks,
      resend: {
        configured: hasApiKey,
        domainVerified: dnsVerified,
        verifiedAt: org.email_dns_verified_at?.toISOString() ?? null,
        lastValidatedAt: org.resend_last_validated_at?.toISOString() ?? null,
        lastError: org.resend_last_error ?? null,
        hasWebhookSecret,
        secretsKeyConfigured,
        secretsKeyIssue: secretsKeyConfigured ? undefined : secretsKeyIssue,
        inboundWebhookUrl: `${config.apiUrl}/api/webhook/resend-inbound`,
        live: resendLive,
      },
      inboundPipeline,
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
    res.json({
      success: true,
      message:
        "Domain set. Configure the domain with your mail provider; a platform administrator must complete credentials under Admin → Organization settings.",
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/verify-dns — Re-validate org domain against stored Resend API key; optional SPF/DMARC advisory
router.post("/verify-dns", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const { organizationId } = req.body as { organizationId?: string };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        email_domain_id: true,
        resend_api_key_ciphertext: true,
        email_domain: { select: { domain: true } },
      },
    });
    if (!org?.email_domain_id || !org.email_domain) return res.status(400).json({ success: false, error: "No email domain set. Select a domain first." });
    const domain = org.email_domain.domain;
    if (!org.resend_api_key_ciphertext) {
      return res.status(400).json({
        success: false,
        error: "Mail is still being configured. A platform administrator must finish setup in Admin → Organization settings.",
      });
    }
    let apiKey: string;
    try {
      apiKey = decryptEmailSecret(org.resend_api_key_ciphertext);
    } catch {
      return res.status(503).json({ success: false, error: "Could not decrypt API key (check LUMINUM_EMAIL_SECRETS_KEY)." });
    }
    const check = await validateOrgResendDomain(apiKey, domain);
    const now = new Date();
    const [spf, dmarc] = await Promise.all([checkDomainSpf(domain), checkDomainDmarc(domain)]);
    if (check.ok) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          email_dns_verified_at: now,
          email_dns_last_check_at: now,
          email_dns_last_error: null,
          resend_last_validated_at: now,
          resend_last_error: null,
        },
      });
      return res.json({
        success: true,
        message: "Domain is verified for send and receive. Ensure the inbound webhook is configured with your provider.",
        checks: { spf, dmarc, resend: { ok: true, health: check.health } },
      });
    }
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        email_dns_last_check_at: now,
        email_dns_last_error: check.error ?? "Mail domain validation failed",
        resend_last_validated_at: now,
        resend_last_error: check.error ?? null,
      },
    });
    return res.json({
      success: false,
      error: check.error || "Mail domain validation failed",
      checks: { spf, dmarc, resend: { ok: false, health: check.health } },
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
    if (!organizationId || !subject || (!text?.trim() && !html?.trim())) {
      return res.status(400).json({ success: false, error: "organizationId, subject, and text or html required" });
    }
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    let from: string;
    let replyTo: string;
    try {
      ({ from, replyTo } = await getOrgReplyAddress(organizationId, fromLocalPart, {
        displayName: senderDisplayName(req),
      }));
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
    const attachments = normalizeAttachmentsFromRequest(attachmentsInput);
    const merged = await mergeOutboundWithSignature(organizationId, {
      text: text?.trim() || "",
      html: html?.trim() || null,
    });
    const sendResult = await sendOutboundViaResend(organizationId, {
      from, replyTo, to: toList, subject,
      text: merged.text,
      html: merged.html,
      attachments: attachments.length ? attachments : undefined,
      messageId,
    });
    const emailRecord = await prisma.email.create({
      data: {
        organization_id: organizationId,
        from,
        to: JSON.stringify(toList),
        subject,
        text: merged.text || null,
        html: merged.html ?? null,
        direction: "outbound",
        messageId: sendResult.messageId,
        sent_at: new Date(),
        receivedAt: null,
        read: true,
        starred: false,
        is_draft: false,
        outbound_provider: sendResult.provider,
        fallback_used: false,
        fallback_reason: null,
        provider_message_id: sendResult.providerMessageId ?? null,
      },
    });
    broadcastOrgEmailOutboundSent(organizationId, emailRecord.id);
    const reqWithId = req as Request & { requestId?: string };
    logger.info("Email sent (outbound)", {
      to: toList,
      subject,
      messageId: sendResult.messageId,
      emailId: emailRecord.id,
      organizationId,
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
    }, reqWithId.requestId);
    res.json({
      success: true,
      data: {
        id: emailRecord.id,
        messageId: sendResult.messageId,
        provider: sendResult.provider,
        fallbackUsed: false,
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

// GET /api/emails/folder-counts?organizationId=...
router.get("/folder-counts", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const organizationId = queryParam(req, "organizationId");
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { emails_enabled: true } });
    if (!org?.emails_enabled) return res.status(400).json({ success: false, error: "Emails not enabled" });
    const base = { organization_id: organizationId };
    const [inboxUnread, sent, starred, drafts, scheduled] = await Promise.all([
      prisma.email.count({ where: { ...base, direction: "inbound", is_draft: false, read: false } }),
      prisma.email.count({ where: { ...base, direction: "outbound", is_draft: false, sent_at: { not: null } } }),
      prisma.email.count({ where: { ...base, starred: true, is_draft: false } }),
      prisma.email.count({ where: { ...base, is_draft: true } }),
      prisma.email.count({
        where: { ...base, direction: "outbound", is_draft: false, sent_at: null, scheduled_send_at: { not: null } },
      }),
    ]);
    res.json({ success: true, data: { inboxUnread, sent, starred, drafts, scheduled } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// POST /api/emails/draft — create or update draft (owner content)
router.post("/draft", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const { organizationId, id, to, subject, text, html, fromLocalPart } = req.body as {
      organizationId?: string;
      id?: string;
      to?: string | string[];
      subject?: string;
      text?: string;
      html?: string;
      fromLocalPart?: string;
    };
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { emails_enabled: true } });
    if (!org?.emails_enabled) return res.status(400).json({ success: false, error: "Emails not enabled" });

    let fromAddr: string;
    let replyTo: string;
    try {
      ({ from: fromAddr, replyTo } = await getOrgReplyAddress(organizationId, fromLocalPart, {
        displayName: senderDisplayName(req),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ success: false, error: msg });
    }

    const toList = Array.isArray(to) ? to : to ? [to] : [];
    const toJson = JSON.stringify(toList);

    if (id) {
      const existing = await prisma.email.findFirst({
        where: { id, organization_id: organizationId, is_draft: true },
      });
      if (!existing) return res.status(404).json({ success: false, error: "Draft not found" });
      const updated = await prisma.email.update({
        where: { id },
        data: {
          from: fromAddr,
          to: toJson,
          subject: subject ?? "",
          text: text ?? null,
          html: html?.trim() ? sanitizeComposeHtml(html) : null,
          read: true,
        },
      });
      broadcastOrgEmailUpdated(organizationId, updated.id);
      return res.json({ success: true, data: { id: updated.id } });
    }

    const created = await prisma.email.create({
      data: {
        organization_id: organizationId,
        from: fromAddr,
        to: toJson,
        subject: subject ?? "",
        text: text ?? null,
        html: html?.trim() ? sanitizeComposeHtml(html) : null,
        direction: "outbound",
        is_draft: true,
        read: true,
        starred: false,
        receivedAt: null,
        sent_at: null,
      },
    });
    broadcastOrgEmailOutboundSent(organizationId, created.id);
    return res.json({ success: true, data: { id: created.id } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/emails/schedule — queue outbound send at scheduledSendAt (ISO)
router.post("/schedule", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const {
      organizationId,
      to: toInput,
      subject,
      text,
      html,
      fromLocalPart,
      scheduledSendAt,
      attachments: attachmentsInput,
    } = req.body as {
      organizationId?: string;
      to?: string | string[];
      subject?: string;
      text?: string;
      html?: string;
      fromLocalPart?: string;
      scheduledSendAt?: string;
      attachments?: unknown;
    };
    if (!organizationId || !subject || (!text?.trim() && !html?.trim()) || !scheduledSendAt) {
      return res.status(400).json({ success: false, error: "organizationId, subject, body, scheduledSendAt required" });
    }
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const when = new Date(scheduledSendAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
      return res.status(400).json({ success: false, error: "Schedule at least 1 minute in the future" });
    }

    const toList = Array.isArray(toInput) ? toInput : toInput ? [toInput] : [];
    if (toList.length === 0) return res.status(400).json({ success: false, error: "At least one recipient required" });

    let from: string;
    try {
      ({ from } = await getOrgReplyAddress(organizationId, fromLocalPart, {
        displayName: senderDisplayName(req),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ success: false, error: msg });
    }

    const attachments = normalizeAttachmentsFromRequest(attachmentsInput);
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@scheduled>`;
    const row = await prisma.email.create({
      data: {
        organization_id: organizationId,
        from,
        to: JSON.stringify(toList),
        subject,
        text: text?.trim() || null,
        html: html?.trim() ? sanitizeComposeHtml(html) : null,
        outbound_pending_attachments: attachments.length ? (attachments as object[]) : undefined,
        direction: "outbound",
        messageId,
        scheduled_send_at: when,
        sent_at: null,
        is_draft: false,
        read: true,
        starred: false,
        receivedAt: null,
      },
    });
    broadcastOrgEmailOutboundSent(organizationId, row.id);
    res.json({ success: true, data: { id: row.id, scheduledSendAt: when.toISOString() } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/emails/:id — starred and/or read
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const id = pathParam(req, "id");
    const { starred, read } = req.body as { starred?: boolean; read?: boolean };
    if (starred === undefined && read === undefined) {
      return res.status(400).json({ success: false, error: "starred and/or read required" });
    }
    const email = await prisma.email.findUnique({ where: { id: id! }, select: { organization_id: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });
    if (!(await canAccessOrganization(email.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const data: { starred?: boolean; read?: boolean } = {};
    if (typeof starred === "boolean") data.starred = starred;
    if (typeof read === "boolean") data.read = read;
    await prisma.email.update({ where: { id: id! }, data });

    broadcastOrgEmailUpdated(email.organization_id, id!, data);
    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/emails?organizationId=...&mailbox=inbox|sent|...&page=...
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
    const mailbox = parseMailbox(queryParam(req, "mailbox") ?? undefined);

    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ success: false, error: "Access denied" });

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { emails_enabled: true } });
    if (!org?.emails_enabled) return res.status(400).json({ success: false, error: "Emails not enabled" });

    const where: Record<string, unknown> = { ...mailboxWhere(organizationId, mailbox) };
    if (read !== undefined) (where as any).read = read;
    if (from) (where as any).from = { contains: from, mode: "insensitive" };

    const andConditions: object[] = [];
    if (emailAddresses && emailAddresses.length > 0) {
      const emailFilters: object[] = [];
      emailAddresses.forEach((em) => {
        emailFilters.push({ from: { contains: em.toLowerCase(), mode: "insensitive" } });
        emailFilters.push({ to: { contains: em.toLowerCase(), mode: "insensitive" } });
      });
      andConditions.push({ OR: emailFilters });
    }
    if (search) {
      andConditions.push({
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { from: { contains: search, mode: "insensitive" } },
          { text: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (andConditions.length > 0) (where as any).AND = andConditions;

    const inboxUnreadWhere = {
      organization_id: organizationId,
      direction: "inbound" as const,
      is_draft: false,
      read: false,
    };

    const [total, unreadInFolder, inboxUnread] = await Promise.all([
      prisma.email.count({ where: where as any }),
      prisma.email.count({ where: { ...(where as object), read: false } as any }),
      prisma.email.count({ where: inboxUnreadWhere }),
    ]);

    const unreadCount = mailbox === "inbox" ? unreadInFolder : 0;

    const emails = await prisma.email.findMany({
      where: where as any,
      orderBy: mailboxOrderBy(mailbox),
      skip: (page - 1) * limit,
      take: limit,
      include: { attachments: true },
    });

    const transformed = emails.map((e: any) => mapEmailToClientDto(e));

    res.json({
      success: true,
      data: {
        mailbox,
        emails: transformed,
        pagination: {
          page,
          limit,
          total,
          unreadCount,
          inboxUnread,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/emails/:id/thread — conversation (must be before /:id)
router.get("/:id/thread", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const id = pathParam(req, "id");
    if (!id) return res.status(400).json({ success: false, error: "Missing id" });
    const seed = await prisma.email.findUnique({
      where: { id },
      select: { organization_id: true },
    });
    if (!seed?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });
    if (!(await canAccessOrganization(seed.organization_id, req.user))) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const chain = await loadEmailThread(seed.organization_id, id);
    const ids = chain.map((c) => c.id);
    if (ids.length === 0) {
      return res.json({ success: true, data: { emails: [] } });
    }
    const full = await prisma.email.findMany({
      where: { id: { in: ids } },
      include: { attachments: true },
    });
    const rank = new Map(ids.map((eid, idx) => [eid, idx]));
    full.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

    res.json({ success: true, data: { emails: full.map((e) => mapEmailToClientDto(e)) } });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// GET /api/emails/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    if (!isEmailSystemEnabled()) return jsonEmailSystemDisabled(res);
    const id = pathParam(req, "id");
    if (!id) return res.status(400).json({ success: false, error: "Missing id" });
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
    broadcastOrgEmailUpdated(email.organization_id, id!, { read: true });

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
    broadcastOrgEmailUpdated(email.organization_id, id!, { read: false });

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
      where: { organization_id: organizationId, read: false, direction: "inbound", is_draft: false },
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
    const { text, html, fromLocalPart, attachments: attachmentsInput } = req.body as {
      text?: string;
      html?: string;
      fromLocalPart?: string;
      attachments?: unknown;
    };
    if (!text?.trim() && !html?.trim()) return res.status(400).json({ success: false, error: "text or html required" });
    const original = await prisma.email.findUnique({
      where: { id },
      select: {
        id: true,
        organization_id: true,
        from: true,
        to: true,
        direction: true,
        subject: true,
        messageId: true,
        references: true,
      },
    });
    if (!original?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });
    if (!(await canAccessOrganization(original.organization_id, req.user))) return res.status(403).json({ success: false, error: "Access denied" });
    const { from, replyTo } = await getOrgReplyAddress(original.organization_id, fromLocalPart, {
      displayName: senderDisplayName(req),
    });
    const toAddr = replyToAddressForEmail(original);
    if (!toAddr || !toAddr.includes("@")) {
      return res.status(400).json({ success: false, error: "Could not determine recipient address for this message" });
    }
    const reSubject = (original.subject || "").toLowerCase().startsWith("re:") ? (original.subject || "") : `Re: ${original.subject || ""}`;
    const refs = [original.references, original.messageId].filter(Boolean).join(" ").trim();
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
    const bodyText = text?.trim() || "";
    const bodyHtmlRaw = html?.trim() || null;
    const merged = await mergeOutboundWithSignature(original.organization_id, {
      text: bodyText,
      html: bodyHtmlRaw,
    });
    const attachments = normalizeAttachmentsFromRequest(attachmentsInput);
    const sendResult = await sendOutboundViaResend(original.organization_id, {
      from, replyTo, to: [toAddr], subject: reSubject,
      text: merged.text,
      html: merged.html,
      attachments: attachments.length ? attachments : undefined,
      inReplyTo: original.messageId || undefined, references: refs || undefined, messageId,
    });
    const emailRecord = await prisma.email.create({
      data: {
        organization_id: original.organization_id,
        from,
        to: JSON.stringify([toAddr.trim()]),
        subject: reSubject,
        text: merged.text || null,
        html: merged.html ?? null,
        direction: "outbound",
        messageId: sendResult.messageId,
        in_reply_to: original.messageId || undefined,
        references: refs || undefined,
        sent_at: new Date(),
        receivedAt: null,
        read: true,
        starred: false,
        is_draft: false,
        outbound_provider: sendResult.provider,
        fallback_used: false,
        fallback_reason: null,
        provider_message_id: sendResult.providerMessageId ?? null,
      },
    });
    broadcastOrgEmailOutboundSent(original.organization_id, emailRecord.id);
    const reqWithId = req as Request & { requestId?: string };
    logger.info("Email sent (reply)", {
      emailId: emailRecord.id,
      organizationId: original.organization_id,
      messageId: sendResult.messageId,
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
    }, reqWithId.requestId);
    res.json({
      success: true,
      data: {
        id: emailRecord.id,
        messageId: sendResult.messageId,
        provider: sendResult.provider,
        fallbackUsed: false,
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
    broadcastOrgEmailDeleted(orgId, id!);

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
