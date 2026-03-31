import { Router, type Request, type Response } from "express";
import { Prisma } from "@luminum/database";
import { requireAuth } from "../middleware/require-auth.js";
import { canAccessOrganization } from "../lib/access.js";
import { prisma } from "../lib/prisma.js";
import {
  computeInitialNextRunUtc,
  isScheduleFrequency,
  parseTimeLocal,
  SCHEDULE_FREQUENCIES,
} from "../lib/invoice-schedule-time.js";

const router = Router();
router.use(requireAuth);

async function ensureInvoicesEnabled(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { invoices_enabled: true },
  });
  return org?.invoices_enabled === true;
}

function paramId(req: Request): string {
  return req.params.id as string;
}

// GET /api/invoice-schedules?organizationId=
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(organizationId))) return res.status(403).json({ error: "Invoices not enabled" });

    const rows = await prisma.invoice_schedule.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
      include: {
        template_invoice: {
          select: {
            id: true,
            invoice_number: true,
            client_name: true,
            document_type: true,
            grand_total: true,
            currency: true,
          },
        },
      },
    });

    res.json({ success: true, schedules: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /api/invoice-schedules
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const organizationId = body.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(organizationId))) return res.status(403).json({ error: "Invoices not enabled" });

    const templateInvoiceId = String(body.templateInvoiceId || "").trim();
    if (!templateInvoiceId) return res.status(400).json({ error: "templateInvoiceId required" });

    const tmpl = await prisma.invoice.findFirst({
      where: { id: templateInvoiceId, organization_id: organizationId },
    });
    if (!tmpl) return res.status(404).json({ error: "Template invoice not found" });
    if (tmpl.document_type !== "invoice") {
      return res.status(400).json({ error: "Template must be an invoice (not a quote)" });
    }

    const frequency = String(body.frequency || "").trim();
    if (!isScheduleFrequency(frequency)) {
      return res.status(400).json({
        error: `frequency must be one of: ${SCHEDULE_FREQUENCIES.join(", ")}`,
      });
    }

    const timeLocal = String(body.timeLocal || body.time_local || "09:00").trim();
    if (!parseTimeLocal(timeLocal)) {
      return res.status(400).json({ error: "timeLocal must be HH:mm (24h)" });
    }

    const timezone = String(body.timezone || "UTC").trim() || "UTC";
    const dueDaysAfterIssue = Math.max(0, Math.min(365 * 5, parseInt(String(body.dueDaysAfterIssue ?? 14), 10) || 14));
    const sendEmail = !!body.sendEmail;
    const sendWhatsapp = !!body.sendWhatsapp;

    let nextRunAt: Date;
    if (body.firstRunAt) {
      const d = new Date(String(body.firstRunAt));
      if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid firstRunAt" });
      nextRunAt = d;
    } else {
      try {
        nextRunAt = computeInitialNextRunUtc(timeLocal, timezone);
      } catch {
        return res.status(400).json({ error: "Invalid timezone or time" });
      }
    }

    const schedule = await prisma.invoice_schedule.create({
      data: {
        organization_id: organizationId,
        name: body.name ? String(body.name).slice(0, 200) : null,
        template_invoice_id: templateInvoiceId,
        frequency,
        time_local: timeLocal,
        timezone,
        due_days_after_issue: dueDaysAfterIssue,
        send_email: sendEmail,
        send_whatsapp: sendWhatsapp,
        email_to_override: body.emailToOverride ? String(body.emailToOverride).slice(0, 255) : null,
        whatsapp_phone_override: body.whatsappPhoneOverride ? String(body.whatsappPhoneOverride).slice(0, 32) : null,
        email_from_local_part: body.emailFromLocalPart ? String(body.emailFromLocalPart).slice(0, 64) : null,
        email_message: body.emailMessage ? String(body.emailMessage) : null,
        whatsapp_message: body.whatsappMessage ? String(body.whatsappMessage) : null,
        active: body.active !== false,
        next_run_at: nextRunAt,
      },
      include: {
        template_invoice: {
          select: {
            id: true,
            invoice_number: true,
            client_name: true,
            document_type: true,
            grand_total: true,
            currency: true,
          },
        },
      },
    });

    res.json({ success: true, schedule });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// PATCH /api/invoice-schedules/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const existing = await prisma.invoice_schedule.findUnique({
      where: { id },
      include: { template_invoice: { select: { organization_id: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Schedule not found" });
    const orgId = existing.organization_id;
    if (!(await canAccessOrganization(orgId, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(orgId))) return res.status(403).json({ error: "Invoices not enabled" });

    const body = req.body as Record<string, unknown>;
    const data: Prisma.invoice_scheduleUpdateInput = {};

    if (body.name !== undefined) data.name = body.name ? String(body.name).slice(0, 200) : null;
    if (body.active !== undefined) data.active = !!body.active;
    if (body.frequency !== undefined) {
      const f = String(body.frequency).trim();
      if (!isScheduleFrequency(f)) {
        return res.status(400).json({ error: `frequency must be one of: ${SCHEDULE_FREQUENCIES.join(", ")}` });
      }
      data.frequency = f;
    }
    if (body.timeLocal !== undefined || body.time_local !== undefined) {
      const tl = String(body.timeLocal ?? body.time_local).trim();
      if (!parseTimeLocal(tl)) return res.status(400).json({ error: "Invalid timeLocal" });
      data.time_local = tl;
    }
    if (body.timezone !== undefined) data.timezone = String(body.timezone).trim() || "UTC";
    if (body.dueDaysAfterIssue !== undefined) {
      data.due_days_after_issue = Math.max(0, Math.min(365 * 5, parseInt(String(body.dueDaysAfterIssue), 10) || 14));
    }
    if (body.sendEmail !== undefined) data.send_email = !!body.sendEmail;
    if (body.sendWhatsapp !== undefined) data.send_whatsapp = !!body.sendWhatsapp;
    if (body.emailToOverride !== undefined) {
      data.email_to_override = body.emailToOverride ? String(body.emailToOverride).slice(0, 255) : null;
    }
    if (body.whatsappPhoneOverride !== undefined) {
      data.whatsapp_phone_override = body.whatsappPhoneOverride
        ? String(body.whatsappPhoneOverride).slice(0, 32)
        : null;
    }
    if (body.emailFromLocalPart !== undefined) {
      data.email_from_local_part = body.emailFromLocalPart ? String(body.emailFromLocalPart).slice(0, 64) : null;
    }
    if (body.emailMessage !== undefined) data.email_message = body.emailMessage ? String(body.emailMessage) : null;
    if (body.whatsappMessage !== undefined) {
      data.whatsapp_message = body.whatsappMessage ? String(body.whatsappMessage) : null;
    }
    if (body.nextRunAt !== undefined) {
      const d = new Date(String(body.nextRunAt));
      if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid nextRunAt" });
      data.next_run_at = d;
    }

    if (body.templateInvoiceId !== undefined) {
      const tid = String(body.templateInvoiceId).trim();
      const inv = await prisma.invoice.findFirst({
        where: { id: tid, organization_id: orgId, document_type: "invoice" },
      });
      if (!inv) return res.status(400).json({ error: "Template invoice not found or not an invoice" });
      data.template_invoice = { connect: { id: tid } };
    }

    const schedule = await prisma.invoice_schedule.update({
      where: { id },
      data,
      include: {
        template_invoice: {
          select: {
            id: true,
            invoice_number: true,
            client_name: true,
            document_type: true,
            grand_total: true,
            currency: true,
          },
        },
      },
    });

    res.json({ success: true, schedule });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// DELETE /api/invoice-schedules/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const existing = await prisma.invoice_schedule.findUnique({
      where: { id },
      select: { organization_id: true },
    });
    if (!existing) return res.status(404).json({ error: "Schedule not found" });
    if (!(await canAccessOrganization(existing.organization_id, req.user))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.invoice_schedule.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export { router as invoiceSchedulesRouter };
