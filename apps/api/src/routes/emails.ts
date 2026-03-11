import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { getR2PresignedUrl } from "../lib/utils/r2.js";
import { pathParam, queryParam } from "../lib/req-params.js";

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
    const member = await prisma.member.findFirst({ where: { organizationId, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

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
    const member = await prisma.member.findFirst({ where: { organizationId: organizationId!, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });
    const count = await prisma.email.count({ where: { organization_id: organizationId!, read: false } });
    res.json({ success: true, count });
  } catch (error: any) {
    res.json({ success: false, error: error.message, count: 0 });
  }
});

// GET /api/emails?organizationId=...&page=1&limit=20&read=true&search=...&from=...&emailAddresses=a,b
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = queryParam(req, "organizationId");
    const page = parseInt(queryParam(req, "page") ?? "", 10) || 1;
    const limit = parseInt(queryParam(req, "limit") ?? "", 10) || 20;
    const readParam = queryParam(req, "read");
    const read = readParam !== undefined ? readParam === "true" : undefined;
    const search = queryParam(req, "search");
    const from = queryParam(req, "from");
    const emailAddressesRaw = queryParam(req, "emailAddresses");
    const emailAddresses = emailAddressesRaw ? emailAddressesRaw.split(",") : undefined;

    const member = await prisma.member.findFirst({ where: { organizationId, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

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
        attachments: e.attachments.map((a: any) => ({ filename: a.filename, file_size: a.size || 0, mime_type: a.contentType, r2_key: a.r2Key, r2_url: a.url, r2_bucket: "mail-attachments" })),
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

    const member = await prisma.member.findFirst({ where: { organizationId: email.organization_id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

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

    const member = await prisma.member.findFirst({ where: { organizationId: email.organization_id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

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

    const member = await prisma.member.findFirst({ where: { organizationId: email.organization_id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    await prisma.email.update({ where: { id: id! }, data: { read: false } });

    res.json({ success: true });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// DELETE /api/emails/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, include: { attachments: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });

    const member = await prisma.member.findFirst({ where: { organizationId: email.organization_id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    let emailSize = 0;
    if (email.text) emailSize += Buffer.byteLength(email.text, "utf8");
    if (email.html) emailSize += Buffer.byteLength(email.html, "utf8");

    const attachments = (email as typeof email & { attachments: { size?: number; r2Key?: string }[] }).attachments ?? [];
    for (const att of attachments) {
      if (att.size) emailSize += att.size;
      if (att.r2Key) {
        try { const { deleteFromR2 } = await import("../lib/utils/r2.js"); await deleteFromR2(att.r2Key, "mail-attachments"); } catch {}
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

// GET /api/emails/:id/attachment/:index
router.get("/:id/attachment/:index", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const email = await prisma.email.findUnique({ where: { id }, include: { attachments: true } });
    if (!email?.organization_id) return res.status(404).json({ success: false, error: "Email not found" });

    const member = await prisma.member.findFirst({ where: { organizationId: email.organization_id, userId: req.user.id } });
    if (!member) return res.status(403).json({ success: false, error: "Access denied" });

    const attachments = (email as typeof email & { attachments: { r2Key?: string; filename?: string; contentType?: string }[] }).attachments ?? [];
    const idx = parseInt(pathParam(req, "index") ?? "", 10);
    if (Number.isNaN(idx) || idx >= attachments.length) return res.status(404).json({ success: false, error: "Attachment not found" });

    const att = attachments[idx];
    if (!att.r2Key) return res.status(400).json({ success: false, error: "No R2 key" });

    const url = await getR2PresignedUrl(att.r2Key, "mail-attachments", 3600);
    res.json({ success: true, url, filename: att.filename, contentType: att.contentType });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

export { router as emailsRouter };
