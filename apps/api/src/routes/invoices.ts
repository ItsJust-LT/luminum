import { Router, type Request, type Response } from "express";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { Prisma } from "@luminum/database";
import { requireAuth } from "../middleware/require-auth.js";
import { canAccessOrganization } from "../lib/access.js";
import { prisma } from "../lib/prisma.js";
import * as s3 from "../lib/storage/s3.js";
import { orgInvoiceKey } from "../lib/storage/keys.js";
import { updateOrganizationStorage } from "../lib/utils/storage.js";
import { calculateTotals, type InvoiceItem, type CustomAdjustment } from "../lib/invoice/calculations.js";
import { generateInvoicePdf } from "../lib/invoice/pdf-generator.js";
import type { InvoiceTemplateData } from "../lib/invoice/html-template.js";
import { getOrgReplyAddress, sendOutboundViaResend } from "../lib/email-send.js";
import { mergeOutboundWithSignature } from "../lib/email-outbound-body.js";
import { broadcastOrgEmailOutboundSent } from "../lib/org-ws-broadcast.js";
import { sendDocumentMessage } from "../whatsapp/manager.js";
import { normalizePhoneDigitsForWhatsApp } from "../lib/phone-whatsapp-normalize.js";
import { invoiceWhatsAppClientMessageId } from "../lib/invoice-whatsapp-read-receipt.js";

const router = Router();
router.use(requireAuth);

function paramId(req: Request): string {
  return req.params.id as string;
}

async function ensureInvoicesEnabled(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { invoices_enabled: true },
  });
  return org?.invoices_enabled === true;
}

/** WhatsApp JID from user input (normalizes SA numbers: leading 0 → +27, etc.). */
function phoneToWhatsappJid(raw: string): string | null {
  const digits = normalizePhoneDigitsForWhatsApp(raw);
  if (!digits) return null;
  return `${digits}@c.us`;
}

type InvoiceWithItems = Prisma.invoiceGetPayload<{ include: { items: true } }>;

function invoiceToTemplateData(invoice: InvoiceWithItems): InvoiceTemplateData {
  return {
    documentType: invoice.document_type === "quote" ? "quote" : "invoice",
    company: {
      name: invoice.company_name,
      email: invoice.company_email || undefined,
      phone: invoice.company_phone || undefined,
      vat: invoice.company_vat || undefined,
      logo: invoice.company_logo || undefined,
      address: invoice.company_address as any,
    },
    client: {
      name: invoice.client_name,
      email: invoice.client_email || undefined,
      phone: invoice.client_phone || undefined,
      address: invoice.client_address as any,
    },
    invoiceNumber: invoice.invoice_number,
    date: invoice.date.toISOString().split("T")[0]!,
    dueDate: invoice.due_date?.toISOString().split("T")[0],
    currency: invoice.currency,
    language: invoice.language,
    items: invoice.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      tax_percent: it.tax_percent ?? undefined,
      tax_exempt: it.tax_exempt,
      special_tax_rate: it.special_tax_rate ?? undefined,
      sort_order: it.sort_order,
    })),
    subtotal: Number(invoice.subtotal),
    totalTax: Number(invoice.total_tax),
    discount: Number(invoice.discount_amount),
    shipping: Number(invoice.shipping_amount),
    grandTotal: Number(invoice.grand_total),
    taxInclusive: invoice.tax_inclusive,
    globalTaxPercent: invoice.global_tax_percent ?? undefined,
    customAdjustments: (invoice.custom_adjustments as unknown as CustomAdjustment[] | null) ?? undefined,
    notes: invoice.notes || undefined,
    terms: invoice.terms || undefined,
  };
}

async function ensureInvoicePdfBuffer(invoice: InvoiceWithItems): Promise<Buffer> {
  if (invoice.pdf_storage_key) {
    const obj = await s3.getObject(invoice.pdf_storage_key);
    if (!obj?.stream) throw new Error("PDF file missing in storage");
    return streamToBuffer(obj.stream);
  }

  const templateData = invoiceToTemplateData(invoice);
  const pdfBuffer = await generateInvoicePdf(templateData);
  const oldSize = 0;
  const storageKey = orgInvoiceKey(invoice.organization_id, invoice.id);

  await s3.upload(pdfBuffer, storageKey, { contentType: "application/pdf" });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdf_storage_key: storageKey, pdf_generated_at: new Date() },
  });

  await updateOrganizationStorage(invoice.organization_id, pdfBuffer.length - oldSize);

  return pdfBuffer;
}

// GET /api/invoices?organizationId=&status=&search=&page=&limit=&document_type=
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(organizationId))) return res.status(403).json({ error: "Invoices not enabled" });

    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const documentType = req.query.document_type as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const where: any = { organization_id: organizationId };
    if (status && status !== "all") where.status = status;
    if (documentType && documentType !== "all") where.document_type = documentType;
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: "insensitive" } },
        { client_name: { contains: search, mode: "insensitive" } },
        { client_email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { items: { orderBy: { sort_order: "asc" } } },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ success: true, invoices, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/stats?organizationId=&document_type=
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });

    const documentType = req.query.document_type as string | undefined;
    const baseWhere: any = { organization_id: organizationId };
    if (documentType && documentType !== "all") baseWhere.document_type = documentType;

    const [total, draft, sent, paid, overdue, cancelled, accepted, expired, allRecords] = await Promise.all([
      prisma.invoice.count({ where: baseWhere }),
      prisma.invoice.count({ where: { ...baseWhere, status: "draft" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "sent" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "paid" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "overdue" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "cancelled" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "accepted" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "expired" } }),
      prisma.invoice.findMany({
        where: baseWhere,
        select: { grand_total: true, status: true, created_at: true },
      }),
    ]);

    let totalRevenue = 0;
    let paidRevenue = 0;
    let outstandingRevenue = 0;
    for (const inv of allRecords) {
      const gt = Number(inv.grand_total);
      totalRevenue += gt;
      if (inv.status === "paid") paidRevenue += gt;
      if (inv.status === "sent" || inv.status === "overdue") outstandingRevenue += gt;
    }

    res.json({
      success: true,
      stats: { total, draft, sent, paid, overdue, cancelled, accepted, expired, totalRevenue, paidRevenue, outstandingRevenue },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/next-number?organizationId=&document_type=
router.get("/next-number", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });

    const documentType = (req.query.document_type as string) || "invoice";
    const prefix = documentType === "quote" ? "QUO" : "INV";

    const last = await prisma.invoice.findFirst({
      where: { organization_id: organizationId, document_type: documentType },
      orderBy: { created_at: "desc" },
      select: { invoice_number: true },
    });

    let nextNum = 1;
    if (last?.invoice_number) {
      const match = last.invoice_number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]!) + 1;
    }

    res.json({ success: true, nextNumber: `${prefix}-${String(nextNum).padStart(4, "0")}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/clients?organizationId=&q=
router.get("/clients", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });

    const q = (req.query.q as string || "").trim();

    const invoices = await prisma.invoice.findMany({
      where: {
        organization_id: organizationId,
        ...(q ? { client_name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      select: {
        client_name: true,
        client_email: true,
        client_phone: true,
        client_address: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    const seen = new Map<string, any>();
    for (const inv of invoices) {
      const key = inv.client_name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          name: inv.client_name,
          email: inv.client_email || undefined,
          phone: inv.client_phone || undefined,
          address: inv.client_address || undefined,
        });
      }
    }

    res.json({ success: true, clients: Array.from(seen.values()).slice(0, 20) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/last-company?organizationId=
router.get("/last-company", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });

    const last = await prisma.invoice.findFirst({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
      select: {
        company_name: true,
        company_email: true,
        company_phone: true,
        company_vat: true,
        company_logo: true,
        company_address: true,
      },
    });

    res.json({ success: true, company: last || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sort_order: "asc" } }, organization: { select: { id: true, name: true, currency: true } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    res.json({ success: true, invoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const organizationId = body.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(organizationId))) return res.status(403).json({ error: "Invoices not enabled" });

    const items: InvoiceItem[] = (body.items || []).map((it: any, i: number) => ({
      description: it.description || "",
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      tax_percent: it.tax_percent != null ? Number(it.tax_percent) : undefined,
      tax_exempt: !!it.tax_exempt,
      special_tax_rate: it.special_tax_rate != null ? Number(it.special_tax_rate) : undefined,
      sort_order: i,
    }));

    if (items.length === 0) return res.status(400).json({ error: "At least one item required" });
    if (!body.companyName || !body.clientName) return res.status(400).json({ error: "companyName and clientName required" });

    const customAdj: CustomAdjustment[] = (body.customAdjustments || []).map((a: any) => ({
      label: a.label || "",
      amount: Number(a.amount) || 0,
    }));

    const totals = calculateTotals(items, {
      globalTaxPercent: body.globalTaxPercent ? Number(body.globalTaxPercent) : undefined,
      globalDiscountAmount: body.discountAmount ? Number(body.discountAmount) : undefined,
      shippingAmount: body.shippingAmount ? Number(body.shippingAmount) : undefined,
      taxInclusive: !!body.taxInclusive,
      customAdjustments: customAdj.length > 0 ? customAdj : undefined,
    });

    const documentType = body.documentType === "quote" ? "quote" : "invoice";

    const invoice = await prisma.invoice.create({
      data: {
        organization_id: organizationId,
        document_type: documentType,
        invoice_number: body.invoiceNumber || (documentType === "quote" ? "QUO-0001" : "INV-0001"),
        status: "draft",
        date: body.date ? new Date(body.date) : new Date(),
        due_date: body.dueDate ? new Date(body.dueDate) : null,
        currency: body.currency || "ZAR",
        language: body.language || "en",
        company_name: body.companyName,
        company_email: body.companyEmail || null,
        company_phone: body.companyPhone || null,
        company_vat: body.companyVat || null,
        company_logo: body.companyLogo || null,
        company_address: body.companyAddress ?? Prisma.JsonNull,
        client_name: body.clientName,
        client_email: body.clientEmail || null,
        client_phone: body.clientPhone || null,
        client_address: body.clientAddress ?? Prisma.JsonNull,
        subtotal: totals.subtotal,
        total_tax: totals.totalTax,
        discount_amount: totals.discount,
        shipping_amount: totals.shipping,
        grand_total: totals.grandTotal,
        tax_inclusive: !!body.taxInclusive,
        global_tax_percent: body.globalTaxPercent ? Number(body.globalTaxPercent) : null,
        custom_adjustments: customAdj.length > 0 ? (customAdj as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        notes: body.notes || null,
        terms: body.terms || null,
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

    res.json({ success: true, invoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const existing = await prisma.invoice.findUnique({
      where: { id },
      select: { organization_id: true },
    });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(existing.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    const body = req.body;
    const items: InvoiceItem[] | undefined = body.items
      ? body.items.map((it: any, i: number) => ({
          description: it.description || "",
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          tax_percent: it.tax_percent != null ? Number(it.tax_percent) : undefined,
          tax_exempt: !!it.tax_exempt,
          special_tax_rate: it.special_tax_rate != null ? Number(it.special_tax_rate) : undefined,
          sort_order: i,
        }))
      : undefined;

    const customAdj: CustomAdjustment[] | undefined = body.customAdjustments
      ? body.customAdjustments.map((a: any) => ({ label: a.label || "", amount: Number(a.amount) || 0 }))
      : undefined;

    let totalsData: any = {};
    if (items) {
      const totals = calculateTotals(items, {
        globalTaxPercent: body.globalTaxPercent != null ? Number(body.globalTaxPercent) : undefined,
        globalDiscountAmount: body.discountAmount != null ? Number(body.discountAmount) : undefined,
        shippingAmount: body.shippingAmount != null ? Number(body.shippingAmount) : undefined,
        taxInclusive: body.taxInclusive != null ? !!body.taxInclusive : undefined,
        customAdjustments: customAdj,
      });
      totalsData = {
        subtotal: totals.subtotal,
        total_tax: totals.totalTax,
        discount_amount: totals.discount,
        shipping_amount: totals.shipping,
        grand_total: totals.grandTotal,
      };
    }

    const updateData: any = { ...totalsData };
    if (body.invoiceNumber !== undefined) updateData.invoice_number = body.invoiceNumber;
    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate ? new Date(body.dueDate) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.companyName !== undefined) updateData.company_name = body.companyName;
    if (body.companyEmail !== undefined) updateData.company_email = body.companyEmail || null;
    if (body.companyPhone !== undefined) updateData.company_phone = body.companyPhone || null;
    if (body.companyVat !== undefined) updateData.company_vat = body.companyVat || null;
    if (body.companyLogo !== undefined) updateData.company_logo = body.companyLogo || null;
    if (body.companyAddress !== undefined) updateData.company_address = body.companyAddress ?? Prisma.JsonNull;
    if (body.clientName !== undefined) updateData.client_name = body.clientName;
    if (body.clientEmail !== undefined) updateData.client_email = body.clientEmail || null;
    if (body.clientPhone !== undefined) updateData.client_phone = body.clientPhone || null;
    if (body.clientAddress !== undefined) updateData.client_address = body.clientAddress ?? Prisma.JsonNull;
    if (body.taxInclusive !== undefined) updateData.tax_inclusive = !!body.taxInclusive;
    if (body.globalTaxPercent !== undefined) updateData.global_tax_percent = body.globalTaxPercent != null ? Number(body.globalTaxPercent) : null;
    if (customAdj !== undefined) updateData.custom_adjustments = customAdj.length > 0 ? (customAdj as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.terms !== undefined) updateData.terms = body.terms || null;

    if (items) {
      await prisma.invoice_item.deleteMany({ where: { invoice_id: id } });
      updateData.items = {
        create: items.map((it, i) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tax_percent: it.tax_percent ?? null,
          tax_exempt: it.tax_exempt,
          special_tax_rate: it.special_tax_rate ?? null,
          sort_order: i,
        })),
      };
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { items: { orderBy: { sort_order: "asc" } } },
    });

    res.json({ success: true, invoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { organization_id: true, pdf_storage_key: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    if (invoice.pdf_storage_key) {
      await s3.remove(invoice.pdf_storage_key);
    }

    await prisma.invoice.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/generate-pdf
router.post("/:id/generate-pdf", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    const templateData = invoiceToTemplateData(invoice);
    const pdfBuffer = await generateInvoicePdf(templateData);
    const oldSize = invoice.pdf_storage_key ? pdfBuffer.length : 0;
    const storageKey = orgInvoiceKey(invoice.organization_id, invoice.id);

    if (invoice.pdf_storage_key && invoice.pdf_storage_key !== storageKey) {
      await s3.remove(invoice.pdf_storage_key);
    }

    await s3.upload(pdfBuffer, storageKey, { contentType: "application/pdf" });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdf_storage_key: storageKey, pdf_generated_at: new Date() },
    });

    await updateOrganizationStorage(invoice.organization_id, pdfBuffer.length - oldSize);

    const apiUrl = process.env.API_URL ?? process.env.API_WS_URL ?? "http://localhost:4000";
    const pdfUrl = `${apiUrl.replace(/\/$/, "")}/api/invoices/${invoice.id}/pdf`;

    res.json({ success: true, pdfUrl, storageKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/send-email
router.post("/:id/send-email", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const { to, message, fromLocalPart, markSent } = req.body as {
      to?: string;
      message?: string;
      fromLocalPart?: string;
      markSent?: boolean;
    };

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(invoice.organization_id))) return res.status(403).json({ error: "Invoices not enabled" });

    const org = await prisma.organization.findUnique({
      where: { id: invoice.organization_id },
      select: { emails_enabled: true, whatsapp_enabled: true },
    });
    if (!org?.whatsapp_enabled) {
      return res.status(400).json({
        error:
          "Sending invoices by email is available when both Invoices and WhatsApp are enabled for this organization.",
      });
    }
    if (!org?.emails_enabled) {
      return res.status(400).json({
        error:
          "Organization email is not enabled. Turn on mail and complete domain setup before sending invoices by email.",
      });
    }

    const recipient = (to && String(to).trim()) || invoice.client_email?.trim() || "";
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return res.status(400).json({
        error: 'A valid recipient email is required. Add a client email on the invoice or pass "to".',
      });
    }

    let from: string;
    let replyTo: string;
    try {
      ({ from, replyTo } = await getOrgReplyAddress(invoice.organization_id, fromLocalPart, {
        displayName: (req as Request & { user?: { name?: string | null } }).user?.name?.trim() || undefined,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ error: msg });
    }

    const isQuote = invoice.document_type === "quote";
    const docWord = isQuote ? "Quote" : "Invoice";
    const subject = `${docWord} ${invoice.invoice_number} from ${invoice.company_name}`;
    const text =
      (message && String(message).trim()) ||
      `Please find your ${docWord.toLowerCase()} attached.\n\nThank you.`;

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const invoiceBodyHtml =
      `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.55;color:#111827;max-width:560px;">` +
      `<p style="margin:0 0 10px;font-size:17px;font-weight:600;color:#111827;">${escapeHtml(docWord)} ${escapeHtml(invoice.invoice_number)}</p>` +
      `<p style="margin:0 0 18px;color:#374151;">${escapeHtml(text).replace(/\n/g, "<br/>")}</p>` +
      `<p style="margin:0;font-size:14px;color:#6b7280;">${escapeHtml(invoice.company_name)}</p></div>`;

    const merged = await mergeOutboundWithSignature(
      invoice.organization_id,
      { text, html: invoiceBodyHtml },
      { actorUserId: req.user?.id ?? null }
    );

    const pdfBuffer = await ensureInvoicePdfBuffer(invoice);
    const prefix = isQuote ? "quote" : "invoice";
    const filename = `${prefix}-${invoice.invoice_number.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;

    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@outbound>`;
    const sendResult = await sendOutboundViaResend(invoice.organization_id, {
      from,
      replyTo,
      to: [recipient],
      subject,
      text: merged.text,
      html: merged.html,
      attachments: [
        {
          filename,
          contentType: "application/pdf",
          contentBase64: pdfBuffer.toString("base64"),
        },
      ],
      messageId,
    });

    const emailRecord = await prisma.email.create({
      data: {
        organization_id: invoice.organization_id,
        from,
        to: JSON.stringify([recipient]),
        subject,
        text: merged.text,
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
    broadcastOrgEmailOutboundSent(invoice.organization_id, emailRecord.id);

    let updatedInvoice: InvoiceWithItems = invoice;
    if (markSent !== false && invoice.status === "draft") {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status: "sent" },
        include: { items: { orderBy: { sort_order: "asc" } } },
      });
    }

    res.json({ success: true, invoice: updatedInvoice, providerMessageId: sendResult.providerMessageId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/send-whatsapp — PDF document to client WhatsApp (requires invoices + WhatsApp enabled)
router.post("/:id/send-whatsapp", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const { phone, message, markSent } = req.body as {
      phone?: string;
      message?: string;
      markSent?: boolean;
    };

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(invoice.organization_id))) return res.status(403).json({ error: "Invoices not enabled" });

    const org = await prisma.organization.findUnique({
      where: { id: invoice.organization_id },
      select: { whatsapp_enabled: true },
    });
    if (!org?.whatsapp_enabled) {
      return res.status(400).json({
        error: "WhatsApp is not enabled for this organization.",
      });
    }

    const rawPhone = (phone && String(phone).trim()) || invoice.client_phone?.trim() || "";
    const jid = phoneToWhatsappJid(rawPhone);
    if (!jid) {
      return res.status(400).json({
        error:
          'A valid phone number is required (10–15 digits). South African numbers can be entered as 0662236440 or 662236440 — we add +27 automatically. Add a phone on the invoice or pass "phone".',
      });
    }

    const pdfBuffer = await ensureInvoicePdfBuffer(invoice);
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    const isQuote = invoice.document_type === "quote";
    const docWord = isQuote ? "Quote" : "Invoice";
    const prefix = isQuote ? "quote" : "invoice";
    const filename = `${prefix}-${invoice.invoice_number.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
    const caption =
      (message && String(message).trim()) ||
      `Here is your ${docWord.toLowerCase()} ${invoice.invoice_number} from ${invoice.company_name}.`;

    const clientMessageId = invoiceWhatsAppClientMessageId(invoice.id);
    await sendDocumentMessage({
      organizationId: invoice.organization_id,
      chatId: jid,
      dataUrl,
      filename,
      caption,
      clientMessageId,
    });

    let updatedInvoice: InvoiceWithItems = invoice;
    if (markSent !== false && invoice.status === "draft") {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status: "sent" },
        include: { items: { orderBy: { sort_order: "asc" } } },
      });
    }

    res.json({ success: true, invoice: updatedInvoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id/pdf
router.get("/:id/pdf", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { organization_id: true, pdf_storage_key: true, invoice_number: true, document_type: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    if (!invoice.pdf_storage_key) {
      return res.status(404).json({ error: "PDF not generated yet" });
    }

    const obj = await s3.getObject(invoice.pdf_storage_key);
    if (!obj) return res.status(404).json({ error: "PDF file not found" });

    const prefix = (invoice as any).document_type === "quote" ? "quote" : "invoice";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${prefix}-${invoice.invoice_number}.pdf"`);
    if (obj.contentLength) res.setHeader("Content-Length", obj.contentLength);
    obj.stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/status
router.post("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const { status } = req.body;
    const allowed = ["draft", "sent", "paid", "overdue", "cancelled", "accepted", "expired", "rejected"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(", ")}` });

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { organization_id: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });

    res.json({ success: true, invoice: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/convert-to-invoice
router.post("/:id/convert-to-invoice", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const quote = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    if (!(await canAccessOrganization(quote.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (quote.document_type !== "quote") return res.status(400).json({ error: "Only quotes can be converted to invoices" });

    const lastInvoice = await prisma.invoice.findFirst({
      where: { organization_id: quote.organization_id, document_type: "invoice" },
      orderBy: { created_at: "desc" },
      select: { invoice_number: true },
    });
    let nextNum = 1;
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]!) + 1;
    }

    const invoice = await prisma.invoice.create({
      data: {
        organization_id: quote.organization_id,
        document_type: "invoice",
        invoice_number: `INV-${String(nextNum).padStart(4, "0")}`,
        status: "draft",
        date: new Date(),
        due_date: quote.due_date,
        currency: quote.currency,
        language: quote.language,
        company_name: quote.company_name,
        company_email: quote.company_email,
        company_phone: quote.company_phone,
        company_vat: quote.company_vat,
        company_logo: quote.company_logo,
        company_address: quote.company_address ?? Prisma.JsonNull,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_address: quote.client_address ?? Prisma.JsonNull,
        subtotal: quote.subtotal,
        total_tax: quote.total_tax,
        discount_amount: quote.discount_amount,
        shipping_amount: quote.shipping_amount,
        grand_total: quote.grand_total,
        tax_inclusive: quote.tax_inclusive,
        global_tax_percent: quote.global_tax_percent,
        custom_adjustments: quote.custom_adjustments ?? Prisma.JsonNull,
        notes: quote.notes,
        terms: quote.terms,
        items: {
          create: (quote as any).items.map((it: any, i: number) => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_percent: it.tax_percent,
            tax_exempt: it.tax_exempt,
            special_tax_rate: it.special_tax_rate,
            sort_order: i,
          })),
        },
      },
      include: { items: { orderBy: { sort_order: "asc" } } },
    });

    await prisma.invoice.update({
      where: { id: quote.id },
      data: { status: "accepted" },
    });

    res.json({ success: true, invoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const invoicesRouter = router;
