import { Prisma } from "@luminum/database";
import { DateTime } from "luxon";
import { prisma } from "./prisma.js";
import * as s3 from "./storage/s3.js";
import { logger } from "./logger.js";
import type { CustomAdjustment, InvoiceItem, InvoiceTotals } from "./invoice/calculations.js";
import { getNextInvoiceNumber } from "./invoice-next-number.js";
import {
  computeNextRunUtcAfterIssue,
  isScheduleFrequency,
  parseTimeLocal,
} from "./invoice-schedule-time.js";
import {
  buildTotalsFromInvoiceRow,
  buildTotalsFromPayload,
  parseScheduleTemplatePayload,
  templatePayloadToInvoiceItems,
} from "./invoice-schedule-template.js";
import { sendInvoiceEmailSystem, sendInvoiceWhatsAppSystem } from "./invoice-outbound-send.js";
import { ensureInvoicePdfBuffer } from "./invoice-pdf-helpers.js";

type ScheduleWithRelations = Prisma.invoice_scheduleGetPayload<{
  include: {
    template_invoice: { include: { items: true } };
  };
}>;

async function deleteInvoiceCleanup(invoiceId: string, pdfKey: string | null | undefined) {
  if (pdfKey) await s3.remove(pdfKey).catch(() => {});
  await prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {});
}

async function processOneSchedule(schedule: ScheduleWithRelations) {
  if (!isScheduleFrequency(schedule.frequency)) {
    throw new Error(`Invalid frequency: ${schedule.frequency}`);
  }

  const hasPayload = schedule.template_payload != null;
  const hasLinked = !!schedule.template_invoice_id;

  if (hasPayload === hasLinked) {
    throw new Error("Schedule must have either an inline template or a linked invoice (not both, not neither)");
  }

  const orgId = schedule.organization_id;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { invoices_enabled: true, emails_enabled: true, whatsapp_enabled: true },
  });
  if (!org?.invoices_enabled) throw new Error("Invoices are disabled for this organization");
  if (schedule.send_email && !org.emails_enabled) {
    throw new Error("Email delivery is enabled on the schedule but organization email is not set up");
  }
  if (schedule.send_whatsapp && !org.whatsapp_enabled) {
    throw new Error("WhatsApp delivery is enabled on the schedule but WhatsApp is not connected");
  }

  const tm = parseTimeLocal(schedule.time_local);
  if (!tm) throw new Error("Invalid schedule time (expected HH:mm)");

  const zone = schedule.timezone?.trim() || "UTC";
  const issueZ = DateTime.now().setZone(zone).startOf("day");

  let items: InvoiceItem[];
  let totals: InvoiceTotals;
  let currency: string;
  let language: string;
  let company_name: string;
  let company_email: string | null;
  let company_phone: string | null;
  let company_vat: string | null;
  let company_logo: string | null;
  let company_address: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  let client_name: string;
  let client_email: string | null;
  let client_phone: string | null;
  let client_tax_number: string | null;
  let client_address: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  let tax_inclusive: boolean;
  let global_tax_percent: number | null;
  let custom_adjustments_json: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  let notes: string | null;
  let terms: string | null;

  if (hasLinked) {
    const tmpl = schedule.template_invoice;
    if (!tmpl) throw new Error("Linked template invoice not found");
    if (tmpl.document_type !== "invoice") throw new Error("Linked template must be an invoice");

    const built = buildTotalsFromInvoiceRow(tmpl);
    items = built.items;
    totals = built.totals;
    currency = tmpl.currency;
    language = tmpl.language;
    company_name = tmpl.company_name;
    company_email = tmpl.company_email;
    company_phone = tmpl.company_phone;
    company_vat = tmpl.company_vat;
    company_logo = tmpl.company_logo;
    company_address = tmpl.company_address ?? Prisma.JsonNull;
    client_name = tmpl.client_name;
    client_email = tmpl.client_email;
    client_phone = tmpl.client_phone;
    client_tax_number = tmpl.client_tax_number;
    client_address = tmpl.client_address ?? Prisma.JsonNull;
    tax_inclusive = tmpl.tax_inclusive;
    global_tax_percent = tmpl.global_tax_percent;
    const customAdj =
      (tmpl.custom_adjustments as unknown as CustomAdjustment[] | null)?.filter(
        (a) => a && String(a.label || "").length > 0
      ) ?? [];
    custom_adjustments_json =
      customAdj.length > 0 ? (customAdj as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
    notes = tmpl.notes;
    terms = tmpl.terms;
  } else {
    const parsed = parseScheduleTemplatePayload(schedule.template_payload);
    if (!parsed) throw new Error("Invalid or missing inline template");
    items = templatePayloadToInvoiceItems(parsed);
    totals = buildTotalsFromPayload(parsed);
    currency = parsed.currency;
    language = parsed.language;
    company_name = parsed.companyName;
    company_email = parsed.companyEmail ?? null;
    company_phone = parsed.companyPhone ?? null;
    company_vat = parsed.companyVat ?? null;
    company_logo = parsed.companyLogo ?? null;
    company_address = parsed.companyAddress
      ? (parsed.companyAddress as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    client_name = parsed.clientName;
    client_email = parsed.clientEmail ?? null;
    client_phone = parsed.clientPhone ?? null;
    client_tax_number = parsed.clientTaxNumber ?? null;
    client_address = parsed.clientAddress
      ? (parsed.clientAddress as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    tax_inclusive = parsed.taxInclusive;
    global_tax_percent = parsed.globalTaxPercent ?? null;
    const customAdj = parsed.customAdjustments?.filter((a) => a && String(a.label || "").length > 0) ?? [];
    custom_adjustments_json =
      customAdj.length > 0 ? (customAdj as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
    notes = parsed.notes ?? null;
    terms = parsed.terms ?? null;
  }

  const invoiceNumber = await getNextInvoiceNumber(orgId, "invoice");
  const issueIso = issueZ.toISODate()!;
  const date = new Date(`${issueIso}T12:00:00.000Z`);
  const dueDate =
    schedule.due_days_after_issue != null && schedule.due_days_after_issue >= 0
      ? new Date(
          `${issueZ.plus({ days: schedule.due_days_after_issue }).toISODate()}T12:00:00.000Z`
        )
      : null;

  const created = await prisma.invoice.create({
    data: {
      organization_id: orgId,
      document_type: "invoice",
      invoice_number: invoiceNumber,
      status: "draft",
      date,
      due_date: dueDate,
      currency,
      language,
      company_name,
      company_email,
      company_phone,
      company_vat,
      company_logo,
      company_address,
      client_name,
      client_email,
      client_phone,
      client_tax_number,
      client_address,
      subtotal: totals.subtotal,
      total_tax: totals.totalTax,
      discount_amount: totals.discount,
      shipping_amount: totals.shipping,
      grand_total: totals.grandTotal,
      tax_inclusive,
      global_tax_percent,
      custom_adjustments: custom_adjustments_json,
      notes,
      terms,
      items: {
        create: items.map((it, i) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tax_percent: it.tax_percent ?? null,
          tax_exempt: it.tax_exempt,
          special_tax_rate: it.special_tax_rate ?? null,
          sort_order: i,
        })),
      },
    },
    include: { items: { orderBy: { sort_order: "asc" } } },
  });

  try {
    await ensureInvoicePdfBuffer(created);
    let full = await prisma.invoice.findUniqueOrThrow({
      where: { id: created.id },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });

    if (schedule.send_email) {
      const emailTo =
        (schedule.email_to_override?.trim() || full.client_email?.trim() || "") || "";
      if (!emailTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
        throw new Error("Scheduled email requires a valid address (client email or override)");
      }
      const r = await sendInvoiceEmailSystem({
        organizationId: orgId,
        invoice: full,
        to: emailTo,
        message: schedule.email_message ?? undefined,
        fromLocalPart: schedule.email_from_local_part ?? undefined,
      });
      if (!r.ok) throw new Error(`Email: ${r.error}`);
    }

    if (schedule.send_whatsapp) {
      full = await prisma.invoice.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: { orderBy: { sort_order: "asc" } } },
      });
      const phone =
        (schedule.whatsapp_phone_override?.trim() || full.client_phone?.trim() || "") || "";
      if (!phone.replace(/\D/g, "").length) {
        throw new Error("Scheduled WhatsApp requires a phone number (client phone or override)");
      }
      const r = await sendInvoiceWhatsAppSystem({
        organizationId: orgId,
        invoice: full,
        phone,
        message: schedule.whatsapp_message ?? undefined,
      });
      if (!r.ok) throw new Error(`WhatsApp: ${r.error}`);
    }

    await prisma.invoice.update({
      where: { id: created.id },
      data: { status: "sent" },
    });
  } catch (e) {
    const row = await prisma.invoice.findUnique({
      where: { id: created.id },
      select: { pdf_storage_key: true },
    });
    await deleteInvoiceCleanup(created.id, row?.pdf_storage_key ?? null);
    throw e;
  }

  const nextRun = computeNextRunUtcAfterIssue(issueZ, schedule.frequency, tm.hour, tm.minute);

  await prisma.invoice_schedule.update({
    where: { id: schedule.id },
    data: {
      last_run_at: new Date(),
      last_error: null,
      next_run_at: nextRun,
    },
  });
}

export async function runScheduledInvoices(): Promise<{
  processed: number;
  succeeded: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let succeeded = 0;
  const now = new Date();

  const schedules = await prisma.invoice_schedule.findMany({
    where: { active: true, next_run_at: { lte: now } },
    include: {
      template_invoice: { include: { items: { orderBy: { sort_order: "asc" } } } },
    },
    orderBy: { next_run_at: "asc" },
    take: 25,
  });

  for (const schedule of schedules) {
    try {
      await processOneSchedule(schedule);
      succeeded += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${schedule.id}: ${msg}`);
      logger.warn("Invoice schedule run failed", { scheduleId: schedule.id, error: msg });
      try {
        await prisma.invoice_schedule.update({
          where: { id: schedule.id },
          data: {
            last_error: msg.slice(0, 2000),
            next_run_at: DateTime.now().plus({ hours: 1 }).toJSDate(),
          },
        });
      } catch (updateErr) {
        logger.warn("Failed to update schedule after error", {
          scheduleId: schedule.id,
          error: String(updateErr),
        });
      }
    }
  }

  return { processed: schedules.length, succeeded, errors };
}
