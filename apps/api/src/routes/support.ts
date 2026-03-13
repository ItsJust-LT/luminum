import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { pathParam, queryParam } from "../lib/req-params.js";
import { notifySupportTicketCreated, notifySupportMessage } from "../lib/notifications/helpers.js";

const router = Router();
router.use(requireAuth);

// POST /api/support/tickets
router.post("/tickets", async (req: Request, res: Response) => {
  try {
    const { title, description, priority, category, organization_id } = req.body;
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const ticket = await prisma.support_tickets.create({
      data: { title, description, priority: priority || "medium", category: category || "general", ticket_number: ticketNumber, user_id: req.user.id, organization_id: organization_id || null },
    });
    await prisma.support_ticket_participants.create({ data: { ticket_id: ticket.id, user_id: req.user.id, role: "creator" } });
    await notifySupportTicketCreated(ticket.id, ticketNumber, title, category || "general", priority || "medium");
    res.json({ success: true, ticket });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/tickets?organizationId=...&status=open,in_progress
router.get("/tickets", async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (queryParam(req, "organizationId")) where.organization_id = queryParam(req, "organizationId");
    if (queryParam(req, "userId")) where.user_id = queryParam(req, "userId");
    if (req.query.status) where.status = { in: (req.query.status as string).split(",") };
    if (req.user.role !== "admin") {
      where.OR = [{ user_id: req.user.id }, { organization_id: { in: (await prisma.member.findMany({ where: { userId: req.user.id }, select: { organizationId: true } })).map(m => m.organizationId) } }];
    }
    const tickets = await prisma.support_tickets.findMany({
      where, orderBy: { created_at: "desc" },
      include: { user_support_tickets_user_idTouser: { select: { id: true, name: true, email: true, image: true } }, organization: { select: { id: true, name: true, slug: true } }, _count: { select: { support_messages: true } } },
    });
    res.json({ success: true, tickets });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/tickets/:id
router.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id");
    const ticket = await prisma.support_tickets.findUnique({
      where: { id },
      include: {
        user_support_tickets_user_idTouser: { select: { id: true, name: true, email: true, image: true } },
        organization: { select: { id: true, name: true, slug: true } },
        support_messages: { include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } } }, orderBy: { created_at: "asc" } },
        support_ticket_participants: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } },
      },
    });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });
    res.json({ success: true, ticket });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// PATCH /api/support/tickets/:id
router.patch("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const ticket = await prisma.support_tickets.update({ where: { id: pathParam(req, "id")! }, data: { ...updates, updated_at: new Date() } });
    res.json({ success: true, ticket });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/support/tickets/:id/messages
router.post("/tickets/:id/messages", async (req: Request, res: Response) => {
  try {
    const { message, attachments } = req.body;
    const ticketId = pathParam(req, "id");
    const ticket = await prisma.support_tickets.findUnique({ where: { id: ticketId }, select: { id: true, ticket_number: true, title: true, user_id: true, organization_id: true } });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    const msg = await prisma.support_messages.create({
      data: { ticket_id: ticketId!, sender_id: req.user.id, message, message_type: "text", attachments: attachments || [] },
      include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const a of attachments) {
        const storageKey = a.storage_key ?? (typeof a.cloudinary_public_id === "string" && a.cloudinary_public_id.startsWith("support/") ? a.cloudinary_public_id : null);
        const url = a.cloudinary_url ?? a.secure_url ?? a.url;
        if (storageKey && url) {
          try {
            await prisma.support_attachments.create({
              data: {
                ticket_id: ticketId!,
                message_id: msg.id,
                uploaded_by: req.user.id,
                filename: a.filename ?? a.original_filename ?? "file",
                original_filename: a.original_filename ?? a.filename ?? "file",
                file_size: a.file_size ?? a.bytes ?? 0,
                mime_type: a.mime_type ?? a.contentType ?? "application/octet-stream",
                cloudinary_public_id: storageKey,
                cloudinary_url: url,
                storage_key: storageKey,
              },
            });
          } catch {}
        }
      }
    }

    await prisma.support_tickets.update({ where: { id: ticketId! }, data: { updated_at: new Date() } });

    if (req.user.role === "admin" && ticket.user_id) {
      await notifySupportMessage(ticket.id, ticket.ticket_number, ticket.title, message, req.user.name || "Support", ticket.user_id, ticket.organization_id || undefined);
    } else {
      const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
      for (const admin of admins) {
        await notifySupportMessage(ticket.id, ticket.ticket_number, ticket.title, message, req.user.name || "User", admin.id);
      }
    }

    res.json({ success: true, message: msg });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    const [total, open, inProgress, resolved, closed, urgent, high] = await Promise.all([
      prisma.support_tickets.count(),
      prisma.support_tickets.count({ where: { status: "open" } }),
      prisma.support_tickets.count({ where: { status: "in_progress" } }),
      prisma.support_tickets.count({ where: { status: "resolved" } }),
      prisma.support_tickets.count({ where: { status: "closed" } }),
      prisma.support_tickets.count({ where: { priority: "urgent" } }),
      prisma.support_tickets.count({ where: { priority: "high" } }),
    ]);
    res.json({ success: true, stats: { total_tickets: total, open_tickets: open, in_progress_tickets: inProgress, resolved_tickets: resolved, closed_tickets: closed, urgent_tickets: urgent, high_priority_tickets: high, avg_response_time: 0, avg_resolution_time: 0 } });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/admin-users
router.get("/admin-users", async (req: Request, res: Response) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
    const users = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true, name: true, email: true, image: true } });
    res.json({ success: true, users });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/org-by-slug?slug=...
router.get("/org-by-slug", async (req: Request, res: Response) => {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: queryParam(req, "slug")! }, select: { id: true, name: true, slug: true } });
    res.json({ success: true, organization: org });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as supportRouter };
