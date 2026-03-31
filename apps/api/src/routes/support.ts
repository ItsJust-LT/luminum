import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { hasOrgPermissions, requireOrgPermissions } from "../lib/org-permission-http.js";
import { resolveOrgMemberPermissions } from "../lib/org-permissions-resolve.js";
import { pathParam, queryParam } from "../lib/req-params.js";
import { notifySupportTicketCreated, notifySupportMessage, notifySupportTicketResolved, notifySupportTicketUpdated } from "../lib/notifications/helpers.js";
import { broadcastToTicket } from "../lib/realtime-ws.js";

const router = Router();
router.use(requireAuth);

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
  next();
}

const VALID_STATUSES = ["open", "in_progress", "waiting_for_user", "resolved", "closed"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];
const VALID_CATEGORIES = ["general", "technical", "billing", "feature_request", "bug_report", "website_issue", "account_issue"];

async function orgIdsWhereUserHasSupportRead(user: { id: string; role?: string }): Promise<string[]> {
  if (user.role === "admin") return [];
  const members = await prisma.member.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  const out: string[] = [];
  for (const m of members) {
    const r = await resolveOrgMemberPermissions(prisma, m.organizationId, user);
    if (r && hasOrgPermissions(r.effectivePermissions, ["support:read"])) out.push(m.organizationId);
  }
  return out;
}

async function assertTicketReadable(
  req: Request,
  res: Response,
  ticket: { user_id: string | null; organization_id: string | null },
): Promise<boolean> {
  if (req.user!.role === "admin") return true;
  if (ticket.user_id && ticket.user_id === req.user!.id) return true;
  if (!ticket.organization_id) {
    res.status(403).json({ success: false, error: "Access denied" });
    return false;
  }
  return !!(await requireOrgPermissions(ticket.organization_id, req.user!, res, ["support:read"]));
}

async function assertTicketCanReply(
  req: Request,
  res: Response,
  ticket: { user_id: string | null; organization_id: string | null },
): Promise<boolean> {
  if (req.user!.role === "admin") return true;
  if (ticket.user_id && ticket.user_id === req.user!.id) return true;
  if (!ticket.organization_id) {
    res.status(403).json({ success: false, error: "Access denied" });
    return false;
  }
  return !!(await requireOrgPermissions(ticket.organization_id, req.user!, res, ["support:reply"]));
}

// POST /api/support/tickets
router.post("/tickets", async (req: Request, res: Response) => {
  try {
    const { title, description, priority, category, organization_id } = req.body;
    if (!title?.trim() || !description?.trim()) return res.status(400).json({ success: false, error: "Title and description are required" });

    const p = priority || "medium";
    const c = category || "general";
    if (!VALID_PRIORITIES.includes(p)) return res.status(400).json({ success: false, error: "Invalid priority" });
    if (!VALID_CATEGORIES.includes(c)) return res.status(400).json({ success: false, error: "Invalid category" });

    if (organization_id) {
      if (!(await requireOrgPermissions(organization_id, req.user!, res, ["support:create"]))) return;
    }

    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const ticket = await prisma.support_tickets.create({
      data: { title: title.trim(), description: description.trim(), priority: p, category: c, ticket_number: ticketNumber, user_id: req.user.id, organization_id: organization_id || null },
    });
    await prisma.support_ticket_participants.create({ data: { ticket_id: ticket.id, user_id: req.user.id, role: "creator" } });

    await prisma.support_messages.create({
      data: { ticket_id: ticket.id, sender_id: req.user.id, message: description.trim(), message_type: "text" },
    });

    await notifySupportTicketCreated(ticket.id, ticketNumber, title.trim(), c, p);
    res.json({ success: true, ticket });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/tickets?organizationId=...&status=open,in_progress&assignedTo=...&priority=...&search=...&limit=50&offset=0
router.get("/tickets", async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (queryParam(req, "organizationId")) where.organization_id = queryParam(req, "organizationId");
    if (queryParam(req, "userId")) where.user_id = queryParam(req, "userId");
    if (req.query.status) where.status = { in: (req.query.status as string).split(",") };
    if (req.query.priority) where.priority = { in: (req.query.priority as string).split(",") };
    if (queryParam(req, "assignedTo")) {
      const at = queryParam(req, "assignedTo");
      where.assigned_to = at === "unassigned" ? null : at;
    }
    if (queryParam(req, "category")) where.category = queryParam(req, "category");
    if (queryParam(req, "search")) {
      const s = queryParam(req, "search")!;
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { ticket_number: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
      ];
    }

    if (req.user.role !== "admin") {
      const orgsWithRead = await orgIdsWhereUserHasSupportRead(req.user);
      where.OR = [{ user_id: req.user.id }, { organization_id: { in: orgsWithRead } }];
    }

    const orgFilter = queryParam(req, "organizationId");
    if (orgFilter && req.user.role !== "admin") {
      if (!(await requireOrgPermissions(orgFilter, req.user, res, ["support:read"]))) return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [tickets, total] = await Promise.all([
      prisma.support_tickets.findMany({
        where, orderBy: [{ priority: "asc" }, { updated_at: "desc" }],
        include: {
          user_support_tickets_user_idTouser: { select: { id: true, name: true, email: true, image: true } },
          user_support_tickets_assigned_toTouser: { select: { id: true, name: true, email: true, image: true } },
          organization: { select: { id: true, name: true, slug: true } },
          _count: { select: { support_messages: true } },
        },
        take: limit, skip: offset,
      }),
      prisma.support_tickets.count({ where }),
    ]);

    const formatted = tickets.map(t => ({
      ...t,
      user: t.user_support_tickets_user_idTouser,
      assigned_user: t.user_support_tickets_assigned_toTouser,
      message_count: t._count?.support_messages || 0,
    }));

    res.json({ success: true, tickets: formatted, total, limit, offset });
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
        user_support_tickets_assigned_toTouser: { select: { id: true, name: true, email: true, image: true } },
        organization: { select: { id: true, name: true, slug: true } },
        support_messages: {
          where: { message_type: { not: "internal" } },
          include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } }, support_attachments: true },
          orderBy: { created_at: "asc" },
        },
        support_ticket_participants: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } },
      },
    });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    if (!(await assertTicketReadable(req, res, { user_id: ticket.user_id, organization_id: ticket.organization_id }))) {
      return;
    }

    const internalNotes = req.user.role === "admin" ? await prisma.support_messages.findMany({
      where: { ticket_id: id, message_type: "internal" },
      include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } } },
      orderBy: { created_at: "asc" },
    }) : [];

    res.json({
      success: true,
      ticket: {
        ...ticket,
        user: ticket.user_support_tickets_user_idTouser,
        assigned_user: ticket.user_support_tickets_assigned_toTouser,
        messages: ticket.support_messages.map(m => ({ ...m, sender: m.user_support_messages_sender_idTouser })),
        participants: ticket.support_ticket_participants,
        internal_notes: internalNotes.map(m => ({ ...m, sender: m.user_support_messages_sender_idTouser })),
      },
    });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// PATCH /api/support/tickets/:id
router.patch("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const id = pathParam(req, "id")!;
    const ticket = await prisma.support_tickets.findUnique({ where: { id }, select: { id: true, status: true, user_id: true, organization_id: true, ticket_number: true, title: true, assigned_to: true } });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    if (req.user.role !== "admin" && ticket.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized to update this ticket" });
    }

    const { status, priority, category, assigned_to, title, description } = req.body;
    const updates: any = { updated_at: new Date() };

    if (status && VALID_STATUSES.includes(status)) {
      updates.status = status;
      if (status === "resolved" && ticket.status !== "resolved") updates.resolved_at = new Date();
      if (status === "closed" && ticket.status !== "closed") updates.closed_at = new Date();
      if (status === "open" || status === "in_progress") { updates.resolved_at = null; updates.closed_at = null; }
    }
    if (priority && VALID_PRIORITIES.includes(priority)) updates.priority = priority;
    if (category && VALID_CATEGORIES.includes(category)) updates.category = category;
    if (title?.trim()) updates.title = title.trim();
    if (description?.trim()) updates.description = description.trim();

    if (req.user.role === "admin") {
      if (assigned_to !== undefined) {
        updates.assigned_to = assigned_to === "unassigned" || assigned_to === null ? null : assigned_to;
        updates.assigned_at = updates.assigned_to ? new Date() : null;

        if (updates.assigned_to && updates.assigned_to !== ticket.assigned_to) {
          const exists = await prisma.support_ticket_participants.findFirst({ where: { ticket_id: id, user_id: updates.assigned_to } });
          if (!exists) {
            await prisma.support_ticket_participants.create({ data: { ticket_id: id, user_id: updates.assigned_to, role: "assignee" } });
          }
        }
      }
    }

    const updated = await prisma.support_tickets.update({ where: { id }, data: updates });

    const changes: string[] = [];
    if (status && status !== ticket.status) changes.push(`Status changed to ${status.replace(/_/g, " ")}`);
    if (priority) changes.push(`Priority set to ${priority}`);
    if (assigned_to !== undefined && assigned_to !== ticket.assigned_to) {
      if (assigned_to && assigned_to !== "unassigned") {
        const assignee = await prisma.user.findUnique({ where: { id: assigned_to }, select: { name: true } });
        changes.push(`Assigned to ${assignee?.name || "admin"}`);
      } else {
        changes.push("Unassigned");
      }
    }

    if (changes.length > 0) {
      await prisma.support_messages.create({
        data: { ticket_id: id, sender_id: req.user.id, message: changes.join(". ") + ".", message_type: "system" },
      });

      if (req.user.role === "admin" && ticket.user_id) {
        if (status === "resolved") {
          await notifySupportTicketResolved(ticket.id, ticket.ticket_number, ticket.title, ticket.user_id, ticket.organization_id || undefined);
        } else {
          await notifySupportTicketUpdated(ticket.id, ticket.ticket_number, ticket.title, ticket.user_id, ticket.organization_id || undefined);
        }
      }

      broadcastToTicket(id, {
        type: "support:status",
        data: { ticketId: id, status: updates.status || ticket.status, changes, updatedBy: req.user.name },
      });
    }

    res.json({ success: true, ticket: updated });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/support/tickets/:id/messages
router.post("/tickets/:id/messages", async (req: Request, res: Response) => {
  try {
    const { message, attachments, message_type } = req.body;
    const ticketId = pathParam(req, "id")!;
    if (!message?.trim()) return res.status(400).json({ success: false, error: "Message is required" });

    const ticket = await prisma.support_tickets.findUnique({ where: { id: ticketId }, select: { id: true, ticket_number: true, title: true, user_id: true, organization_id: true, status: true } });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    if (!(await assertTicketCanReply(req, res, { user_id: ticket.user_id, organization_id: ticket.organization_id }))) {
      return;
    }

    if (ticket.status === "closed") return res.status(400).json({ success: false, error: "Cannot add messages to a closed ticket" });

    const isInternal = message_type === "internal" && req.user.role === "admin";
    const msgType = isInternal ? "internal" : "text";

    const msg = await prisma.support_messages.create({
      data: { ticket_id: ticketId, sender_id: req.user.id, message: message.trim(), message_type: msgType, attachments: attachments || [] },
      include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });

    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const a of attachments) {
        const storageKey = a.storage_key ?? (typeof a.cloudinary_public_id === "string" ? a.cloudinary_public_id : null);
        const url = a.cloudinary_url ?? a.secure_url ?? a.url;
        if (storageKey && url) {
          try {
            await prisma.support_attachments.create({
              data: {
                ticket_id: ticketId, message_id: msg.id, uploaded_by: req.user.id,
                filename: a.filename ?? a.original_filename ?? "file",
                original_filename: a.original_filename ?? a.filename ?? "file",
                file_size: a.file_size ?? a.bytes ?? 0,
                mime_type: a.mime_type ?? a.contentType ?? "application/octet-stream",
                cloudinary_public_id: storageKey, cloudinary_url: url, storage_key: storageKey,
              },
            });
          } catch {}
        }
      }
    }

    const ticketUpdates: any = { updated_at: new Date() };
    if (!isInternal) {
      if (req.user.role === "admin" && ticket.status === "open") {
        ticketUpdates.status = "in_progress";
      } else if (req.user.role !== "admin" && ticket.status === "waiting_for_user") {
        ticketUpdates.status = "in_progress";
      }
    }
    await prisma.support_tickets.update({ where: { id: ticketId }, data: ticketUpdates });

    if (!isInternal) {
      if (req.user.role === "admin" && ticket.user_id) {
        await notifySupportMessage(ticket.id, ticket.ticket_number, ticket.title, message, req.user.name || "Support", ticket.user_id, ticket.organization_id || undefined);
      } else {
        const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
        for (const admin of admins) {
          await notifySupportMessage(ticket.id, ticket.ticket_number, ticket.title, message, req.user.name || "User", admin.id);
        }
      }
    }

    const formattedMsg = { ...msg, sender: msg.user_support_messages_sender_idTouser };
    if (!isInternal) {
      broadcastToTicket(ticketId, { type: "support:message", data: formattedMsg }, req.user.id);
    }

    res.json({ success: true, message: formattedMsg });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/support/tickets/:id/internal-notes (admin only)
router.post("/tickets/:id/internal-notes", adminOnly, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const ticketId = pathParam(req, "id")!;
    if (!message?.trim()) return res.status(400).json({ success: false, error: "Note is required" });

    const ticket = await prisma.support_tickets.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    const note = await prisma.support_messages.create({
      data: { ticket_id: ticketId, sender_id: req.user.id, message: message.trim(), message_type: "internal" },
      include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });

    res.json({ success: true, note: { ...note, sender: note.user_support_messages_sender_idTouser } });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/tickets/:id/messages?since=ISO_DATE (for polling)
router.get("/tickets/:id/messages", async (req: Request, res: Response) => {
  try {
    const ticketId = pathParam(req, "id")!;
    const ticket = await prisma.support_tickets.findUnique({
      where: { id: ticketId },
      select: { id: true, user_id: true, organization_id: true },
    });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });
    if (!(await assertTicketReadable(req, res, { user_id: ticket.user_id, organization_id: ticket.organization_id }))) {
      return;
    }

    const since = req.query.since as string | undefined;

    const where: any = { ticket_id: ticketId };
    if (req.user.role !== "admin") where.message_type = { not: "internal" };
    if (since) where.created_at = { gt: new Date(since) };

    const messages = await prisma.support_messages.findMany({
      where,
      include: { user_support_messages_sender_idTouser: { select: { id: true, name: true, email: true, image: true, role: true } }, support_attachments: true },
      orderBy: { created_at: "asc" },
    });

    res.json({ success: true, messages: messages.map(m => ({ ...m, sender: m.user_support_messages_sender_idTouser })) });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// POST /api/support/tickets/:id/read
router.post("/tickets/:id/read", async (req: Request, res: Response) => {
  try {
    const ticketId = pathParam(req, "id")!;
    const ticket = await prisma.support_tickets.findUnique({
      where: { id: ticketId },
      select: { id: true, user_id: true, organization_id: true },
    });
    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });
    if (!(await assertTicketReadable(req, res, { user_id: ticket.user_id, organization_id: ticket.organization_id }))) {
      return;
    }

    await prisma.support_messages.updateMany({
      where: { ticket_id: ticketId, sender_id: { not: req.user.id }, is_read: false },
      data: { is_read: true, read_at: new Date(), read_by: req.user.id },
    });
    res.json({ success: true });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/stats
router.get("/stats", adminOnly, async (_req: Request, res: Response) => {
  try {
    const [total, open, inProgress, waitingForUser, resolved, closed, urgent, high] = await Promise.all([
      prisma.support_tickets.count(),
      prisma.support_tickets.count({ where: { status: "open" } }),
      prisma.support_tickets.count({ where: { status: "in_progress" } }),
      prisma.support_tickets.count({ where: { status: "waiting_for_user" } }),
      prisma.support_tickets.count({ where: { status: "resolved" } }),
      prisma.support_tickets.count({ where: { status: "closed" } }),
      prisma.support_tickets.count({ where: { priority: "urgent", status: { notIn: ["resolved", "closed"] } } }),
      prisma.support_tickets.count({ where: { priority: "high", status: { notIn: ["resolved", "closed"] } } }),
    ]);

    const unassigned = await prisma.support_tickets.count({ where: { assigned_to: null, status: { notIn: ["resolved", "closed"] } } });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentlyResolved = await prisma.support_tickets.findMany({
      where: { resolved_at: { gte: thirtyDaysAgo } },
      select: { created_at: true, resolved_at: true },
    });
    let avgResolutionMs = 0;
    if (recentlyResolved.length > 0) {
      const totalMs = recentlyResolved.reduce((sum, t) => sum + ((t.resolved_at?.getTime() || 0) - (t.created_at?.getTime() || 0)), 0);
      avgResolutionMs = totalMs / recentlyResolved.length;
    }
    const avgResolutionHours = Math.round(avgResolutionMs / (1000 * 60 * 60));

    const firstResponseTimes = await prisma.support_tickets.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      select: { id: true, created_at: true, support_messages: { where: { sender_id: { not: undefined }, message_type: "text" }, orderBy: { created_at: "asc" }, take: 2, select: { created_at: true, sender_id: true } } },
    });
    let avgFirstResponseMs = 0;
    let responseCount = 0;
    for (const t of firstResponseTimes) {
      const adminReply = t.support_messages.find((m, i) => i > 0);
      if (adminReply) {
        avgFirstResponseMs += (adminReply.created_at?.getTime() || 0) - (t.created_at?.getTime() || 0);
        responseCount++;
      }
    }
    const avgResponseHours = responseCount > 0 ? Math.round(avgFirstResponseMs / responseCount / (1000 * 60 * 60)) : 0;

    res.json({
      success: true, stats: {
        total_tickets: total, open_tickets: open, in_progress_tickets: inProgress,
        waiting_for_user_tickets: waitingForUser, resolved_tickets: resolved, closed_tickets: closed,
        urgent_tickets: urgent, high_priority_tickets: high, unassigned_tickets: unassigned,
        avg_response_time: avgResponseHours, avg_resolution_time: avgResolutionHours,
      },
    });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/admin-users
router.get("/admin-users", adminOnly, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true, name: true, email: true, image: true } });
    res.json({ success: true, users });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

// GET /api/support/org-by-slug?slug=...
router.get("/org-by-slug", async (req: Request, res: Response) => {
  try {
    const slug = queryParam(req, "slug");
    if (!slug) return res.status(400).json({ success: false, error: "slug is required" });
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } });
    if (!org) {
      res.json({ success: true, organization: null });
      return;
    }
    if (!(await requireOrgPermissions(org.id, req.user!, res, ["support:read"]))) return;
    res.json({ success: true, organization: org });
  } catch (error: any) { res.json({ success: false, error: error.message }); }
});

export { router as supportRouter };
