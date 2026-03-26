import { Router, type Request, type Response } from "express";
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

// GET /api/invoices?organizationId=&status=&search=&page=&limit=
router.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });
    if (!(await ensureInvoicesEnabled(organizationId))) return res.status(403).json({ error: "Invoices not enabled" });

    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const where: any = { organization_id: organizationId };
    if (status && status !== "all") where.status = status;
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

// GET /api/invoices/stats?organizationId=
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });

    const baseWhere = { organization_id: organizationId };
    const [total, draft, sent, paid, overdue, cancelled, allInvoices] = await Promise.all([
      prisma.invoice.count({ where: baseWhere }),
      prisma.invoice.count({ where: { ...baseWhere, status: "draft" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "sent" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "paid" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "overdue" } }),
      prisma.invoice.count({ where: { ...baseWhere, status: "cancelled" } }),
      prisma.invoice.findMany({
        where: baseWhere,
        select: { grand_total: true, status: true, created_at: true },
      }),
    ]);

    let totalRevenue = 0;
    let paidRevenue = 0;
    let outstandingRevenue = 0;
    for (const inv of allInvoices) {
      const gt = Number(inv.grand_total);
      totalRevenue += gt;
      if (inv.status === "paid") paidRevenue += gt;
      if (inv.status === "sent" || inv.status === "overdue") outstandingRevenue += gt;
    }

    res.json({
      success: true,
      stats: { total, draft, sent, paid, overdue, cancelled, totalRevenue, paidRevenue, outstandingRevenue },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/next-number?organizationId=
router.get("/next-number", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) return res.status(400).json({ error: "organizationId required" });
    if (!(await canAccessOrganization(organizationId, req.user))) return res.status(403).json({ error: "Forbidden" });

    const last = await prisma.invoice.findFirst({
      where: { organization_id: organizationId },
      orderBy: { created_at: "desc" },
      select: { invoice_number: true },
    });

    let nextNum = 1;
    if (last?.invoice_number) {
      const match = last.invoice_number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]!) + 1;
    }

    res.json({ success: true, nextNumber: `INV-${String(nextNum).padStart(4, "0")}` });
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

    const invoice = await prisma.invoice.create({
      data: {
        organization_id: organizationId,
        invoice_number: body.invoiceNumber || "INV-0001",
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

    const invoiceWithItems = invoice as typeof invoice & { items: Array<{ description: string; quantity: number; unit_price: any; tax_percent: number | null; tax_exempt: boolean; special_tax_rate: number | null; sort_order: number }> };

    const templateData: InvoiceTemplateData = {
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
      items: invoiceWithItems.items.map((it) => ({
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

// GET /api/invoices/:id/pdf
router.get("/:id/pdf", async (req: Request, res: Response) => {
  try {
    const id = paramId(req);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { organization_id: true, pdf_storage_key: true, invoice_number: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!(await canAccessOrganization(invoice.organization_id, req.user))) return res.status(403).json({ error: "Forbidden" });

    if (!invoice.pdf_storage_key) {
      return res.status(404).json({ error: "PDF not generated yet" });
    }

    const obj = await s3.getObject(invoice.pdf_storage_key);
    if (!obj) return res.status(404).json({ error: "PDF file not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="invoice-${invoice.invoice_number}.pdf"`);
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
    const allowed = ["draft", "sent", "paid", "overdue", "cancelled"];
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

export const invoicesRouter = router;
