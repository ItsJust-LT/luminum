import { buffer as streamToBuffer } from "node:stream/consumers";
import { Prisma } from "@luminum/database";
import { prisma } from "./prisma.js";
import * as s3 from "./storage/s3.js";
import { orgInvoiceKey } from "./storage/keys.js";
import { updateOrganizationStorage } from "./utils/storage.js";
import { generateInvoicePdf } from "./invoice/pdf-generator.js";
import type { InvoiceTemplateData } from "./invoice/html-template.js";
import type { CustomAdjustment } from "./invoice/calculations.js";

export type InvoiceWithItems = Prisma.invoiceGetPayload<{ include: { items: true } }>;

export function invoiceToTemplateData(invoice: InvoiceWithItems): InvoiceTemplateData {
  const dt = invoice.document_type;
  const documentType: InvoiceTemplateData["documentType"] =
    dt === "quote" ? "quote" : dt === "receipt" ? "receipt" : "invoice";
  return {
    documentType,
    company: {
      name: invoice.company_name,
      email: invoice.company_email || undefined,
      phone: invoice.company_phone || undefined,
      vat: invoice.company_vat || undefined,
      logo: invoice.company_logo || undefined,
      address: invoice.company_address as Record<string, unknown> | undefined,
    },
    client: {
      name: invoice.client_name,
      email: invoice.client_email || undefined,
      phone: invoice.client_phone || undefined,
      taxNumber: invoice.client_tax_number || undefined,
      address: invoice.client_address as Record<string, unknown> | undefined,
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

export async function ensureInvoicePdfBuffer(invoice: InvoiceWithItems): Promise<Buffer> {
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
