import { Prisma } from "@luminum/database";
import { calculateTotals, type CustomAdjustment, type InvoiceItem } from "./invoice/calculations.js";

/** Stored on invoice_schedule.template_payload (JSON). */
export type ScheduleTemplatePayload = {
  companyName: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyVat?: string | null;
  companyLogo?: string | null;
  companyAddress?: Record<string, unknown> | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: Record<string, unknown> | null;
  currency: string;
  language: string;
  taxInclusive: boolean;
  globalTaxPercent?: number | null;
  discountAmount: number;
  shippingAmount: number;
  customAdjustments?: CustomAdjustment[] | null;
  notes?: string | null;
  terms?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_percent?: number | null;
    tax_exempt?: boolean;
    special_tax_rate?: number | null;
  }>;
};

export function parseScheduleTemplatePayload(input: unknown): ScheduleTemplatePayload | null {
  if (input == null || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const companyName = String(p.companyName ?? "").trim();
  const clientName = String(p.clientName ?? "").trim();
  const itemsRaw = p.items;
  if (!companyName || !clientName || !Array.isArray(itemsRaw) || itemsRaw.length === 0) return null;
  for (const row of itemsRaw) {
    if (row == null || typeof row !== "object") return null;
    const it = row as Record<string, unknown>;
    if (!String(it.description ?? "").trim()) return null;
  }

  const currency = String(p.currency ?? "ZAR").trim().slice(0, 3) || "ZAR";
  const language = String(p.language ?? "en").trim().slice(0, 5) || "en";

  const items = itemsRaw.map((row) => {
    const it = row as Record<string, unknown>;
    return {
      description: String(it.description ?? "").trim(),
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      tax_percent: it.tax_percent != null && it.tax_percent !== "" ? Number(it.tax_percent) : null,
      tax_exempt: !!it.tax_exempt,
      special_tax_rate:
        it.special_tax_rate != null && it.special_tax_rate !== "" ? Number(it.special_tax_rate) : null,
    };
  });

  let customAdjustments: CustomAdjustment[] | null = null;
  if (Array.isArray(p.customAdjustments)) {
    const adj: CustomAdjustment[] = [];
    for (const a of p.customAdjustments) {
      if (a == null || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      const label = String(o.label ?? "").trim();
      if (!label) continue;
      adj.push({ label, amount: Number(o.amount) || 0 });
    }
    customAdjustments = adj.length > 0 ? adj : null;
  }

  return {
    companyName,
    companyEmail: p.companyEmail != null ? String(p.companyEmail).trim() || null : null,
    companyPhone: p.companyPhone != null ? String(p.companyPhone).trim() || null : null,
    companyVat: p.companyVat != null ? String(p.companyVat).trim() || null : null,
    companyLogo: p.companyLogo != null ? String(p.companyLogo).trim() || null : null,
    companyAddress:
      p.companyAddress != null && typeof p.companyAddress === "object"
        ? (p.companyAddress as Record<string, unknown>)
        : null,
    clientName,
    clientEmail: p.clientEmail != null ? String(p.clientEmail).trim() || null : null,
    clientPhone: p.clientPhone != null ? String(p.clientPhone).trim() || null : null,
    clientAddress:
      p.clientAddress != null && typeof p.clientAddress === "object"
        ? (p.clientAddress as Record<string, unknown>)
        : null,
    currency,
    language,
    taxInclusive: !!p.taxInclusive,
    globalTaxPercent:
      p.globalTaxPercent != null && p.globalTaxPercent !== "" ? Number(p.globalTaxPercent) : null,
    discountAmount: Number(p.discountAmount) || 0,
    shippingAmount: Number(p.shippingAmount) || 0,
    customAdjustments,
    notes: p.notes != null ? String(p.notes) || null : null,
    terms: p.terms != null ? String(p.terms) || null : null,
    items,
  };
}

export function templatePayloadToInvoiceItems(payload: ScheduleTemplatePayload): InvoiceItem[] {
  return payload.items.map((it, i) => ({
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    tax_percent: it.tax_percent ?? undefined,
    tax_exempt: !!it.tax_exempt,
    special_tax_rate: it.special_tax_rate ?? undefined,
    sort_order: i,
  }));
}

export function buildTotalsFromPayload(payload: ScheduleTemplatePayload) {
  const items = templatePayloadToInvoiceItems(payload);
  const customAdj = payload.customAdjustments?.filter((a) => a && String(a.label || "").length > 0) ?? [];
  return calculateTotals(items, {
    globalTaxPercent: payload.globalTaxPercent ?? undefined,
    globalDiscountAmount: payload.discountAmount,
    shippingAmount: payload.shippingAmount,
    taxInclusive: payload.taxInclusive,
    customAdjustments: customAdj.length > 0 ? customAdj : undefined,
  });
}

export type TemplateInvoiceWithItems = Prisma.invoiceGetPayload<{ include: { items: true } }>;

export function buildTotalsFromInvoiceRow(tmpl: TemplateInvoiceWithItems) {
  const items: InvoiceItem[] = tmpl.items.map((it, i) => ({
    description: it.description,
    quantity: it.quantity,
    unit_price: Number(it.unit_price),
    tax_percent: it.tax_percent ?? undefined,
    tax_exempt: it.tax_exempt,
    special_tax_rate: it.special_tax_rate ?? undefined,
    sort_order: i,
  }));
  const customAdj =
    (tmpl.custom_adjustments as unknown as CustomAdjustment[] | null)?.filter(
      (a) => a && String(a.label || "").length > 0
    ) ?? [];
  return {
    items,
    customAdj,
    totals: calculateTotals(items, {
      globalTaxPercent: tmpl.global_tax_percent ?? undefined,
      globalDiscountAmount: Number(tmpl.discount_amount),
      shippingAmount: Number(tmpl.shipping_amount),
      taxInclusive: tmpl.tax_inclusive,
      customAdjustments: customAdj.length > 0 ? customAdj : undefined,
    }),
  };
}

export function schedulePayloadToPrismaJson(payload: ScheduleTemplatePayload): Prisma.InputJsonValue {
  return payload as unknown as Prisma.InputJsonValue;
}
