import { translate, formatCurrency, formatDate, TranslationKey } from "./locale.js";
import type { InvoiceItem, CustomAdjustment } from "./calculations.js";

export interface InvoiceTemplateData {
  company: {
    name: string;
    email?: string;
    phone?: string;
    vat?: string;
    logo?: string;
    address?: { line1?: string; line2?: string; city?: string; region?: string; zip?: string; country?: string };
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: { line1?: string; line2?: string; city?: string; region?: string; zip?: string; country?: string };
  };
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  currency: string;
  language: string;
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  taxInclusive: boolean;
  globalTaxPercent?: number;
  customAdjustments?: CustomAdjustment[];
  notes?: string;
  terms?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAddress(addr?: InvoiceTemplateData["company"]["address"]): string {
  if (!addr) return "";
  const lines: string[] = [];
  if (addr.line1) lines.push(escapeHtml(addr.line1));
  if (addr.line2) lines.push(escapeHtml(addr.line2));
  const cityLine = [addr.city, addr.region, addr.zip].filter(Boolean).join(", ");
  if (cityLine) lines.push(escapeHtml(cityLine));
  if (addr.country) lines.push(escapeHtml(addr.country));
  return lines.join("<br/>");
}

export function buildInvoiceHtml(data: InvoiceTemplateData): string {
  const t = (key: string) => translate(data.language, key);
  const fc = (amount: number) => formatCurrency(amount, data.currency, data.language);
  const fd = (dateStr: string) => formatDate(dateStr, data.language);

  const showQty = data.items.some((i) => i.quantity !== 1);

  const companyLines: string[] = [];
  if (data.company.phone) companyLines.push(escapeHtml(data.company.phone));
  if (data.company.email) companyLines.push(escapeHtml(data.company.email));
  if (data.company.vat) companyLines.push(`VAT: ${escapeHtml(data.company.vat)}`);
  const companyAddr = formatAddress(data.company.address);
  if (companyAddr) companyLines.push(companyAddr);

  const clientLines: string[] = [];
  if (data.client.phone) clientLines.push(escapeHtml(data.client.phone));
  if (data.client.email) clientLines.push(escapeHtml(data.client.email));
  const clientAddr = formatAddress(data.client.address);
  if (clientAddr) clientLines.push(clientAddr);

  const itemRows = data.items.map((item) => {
    const qty = Math.floor(item.quantity);
    const lineTotal = qty * item.unit_price;
    if (showQty) {
      return `<tr class="item-row">
        <td class="desc">${escapeHtml(item.description)}</td>
        <td class="qty">${qty}</td>
        <td class="rate">${fc(item.unit_price)}</td>
        <td class="amt">${fc(lineTotal)}</td>
      </tr>`;
    }
    return `<tr class="item-row">
      <td class="desc">${escapeHtml(item.description)}</td>
      <td class="amt">${fc(lineTotal)}</td>
    </tr>`;
  }).join("\n");

  const totalRows: string[] = [];
  totalRows.push(`<tr><td class="total-label">${t(TranslationKey.subtotal)}</td><td class="total-value">${fc(data.subtotal)}</td></tr>`);

  if (data.totalTax > 0) {
    const taxLabel = data.taxInclusive
      ? `${t(TranslationKey.tax)} <span class="tax-note">(included)</span>`
      : t(TranslationKey.tax);
    totalRows.push(`<tr><td class="total-label">${taxLabel}</td><td class="total-value">${fc(data.totalTax)}</td></tr>`);
  }

  if (data.shipping > 0) {
    totalRows.push(`<tr><td class="total-label">${t(TranslationKey.shipping)}</td><td class="total-value">${fc(data.shipping)}</td></tr>`);
  }

  if (data.discount > 0) {
    totalRows.push(`<tr><td class="total-label">${t(TranslationKey.discount)}</td><td class="total-value">-${fc(data.discount)}</td></tr>`);
  }

  if (data.customAdjustments) {
    for (const adj of data.customAdjustments) {
      const label = escapeHtml(adj.label);
      const val = adj.amount < 0 ? `-${fc(Math.abs(adj.amount))}` : fc(adj.amount);
      totalRows.push(`<tr><td class="total-label">${label}</td><td class="total-value">${val}</td></tr>`);
    }
  }

  totalRows.push(`<tr class="grand-total"><td class="total-label">${t(TranslationKey.grandTotal)}</td><td class="total-value">${fc(data.grandTotal)}</td></tr>`);

  const logoHtml = data.company.logo
    ? `<img src="${escapeHtml(data.company.logo)}" class="logo" />`
    : "";

  const notesHtml = data.notes
    ? `<div class="notes-section"><div class="notes-heading">${t(TranslationKey.notes)}</div><div class="notes-body">${escapeHtml(data.notes)}</div></div>`
    : "";

  const dueDateHtml = data.dueDate
    ? `<div class="due-date-section"><span class="due-label">${t(TranslationKey.dueDate)}:</span> <span class="due-value">${fd(data.dueDate)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1a1a1a;
    padding: 40px;
    font-size: 10px;
    line-height: 1.5;
    width: 595px;
    min-height: 842px;
    position: relative;
  }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .company-block { flex: 1; }
  .company-name { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 4px; }
  .company-info { font-size: 10px; color: #666; line-height: 1.6; }
  .logo { max-width: 100px; max-height: 75px; object-fit: contain; }
  .header-rule { border: none; border-top: 1px solid #ddd; margin: 12px 0 20px 0; width: 220px; }

  .title { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .meta-line { font-size: 11px; color: #555; margin-bottom: 20px; }

  .bill-to-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .client-name { font-size: 13px; font-weight: 700; color: #222; margin-bottom: 4px; }
  .client-info { font-size: 10px; color: #555; line-height: 1.6; margin-bottom: 24px; }

  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
  .items-table th {
    background: #f5f5f5;
    padding: 8px 10px;
    font-size: 9px;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }
  .items-table th.qty, .items-table th.rate, .items-table th.amt { text-align: right; }
  .items-table td { padding: 10px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .items-table td.desc { font-size: 12px; font-weight: 600; color: #222; }
  .items-table td.qty, .items-table td.rate, .items-table td.amt { text-align: right; font-size: 11px; font-weight: 600; color: #333; white-space: nowrap; }

  .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals-table { border-collapse: collapse; min-width: 250px; }
  .totals-table td { padding: 6px 12px; font-size: 11px; }
  .total-label { text-align: right; font-weight: 600; color: #444; }
  .total-value { text-align: right; font-weight: 600; color: #222; min-width: 100px; }
  .tax-note { font-weight: 400; color: #888; font-size: 9px; }
  .grand-total td {
    border-top: 2px solid #ddd;
    background: #f7f8f9;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 700;
    color: #111;
  }

  .notes-section { margin-top: 28px; }
  .notes-heading { font-size: 11px; font-weight: 700; color: #333; margin-bottom: 4px; }
  .notes-body { font-size: 10px; color: #555; line-height: 1.6; white-space: pre-wrap; }

  .due-date-section { margin-top: 20px; text-align: right; font-size: 11px; }
  .due-label { font-weight: 600; color: #444; }
  .due-value { font-weight: 700; color: #222; }

  .footer { margin-top: 32px; text-align: center; }
  .footer-text { font-size: 10px; color: #888; }
  .footer-rule { border: none; border-top: 1px solid #eee; margin: 8px auto 0 auto; width: 200px; }
</style>
</head>
<body>
  <div class="header">
    <div class="company-block">
      <div class="company-name">${escapeHtml(data.company.name)}</div>
      <div class="company-info">${companyLines.join("<br/>")}</div>
    </div>
    ${logoHtml}
  </div>
  <hr class="header-rule"/>

  <div class="title">${t(TranslationKey.invoice)}</div>
  <div class="meta-line">#${escapeHtml(data.invoiceNumber)} &bull; ${fd(data.date)}</div>

  <div class="bill-to-label">${t(TranslationKey.billTo)}</div>
  <div class="client-name">${escapeHtml(data.client.name)}</div>
  <div class="client-info">${clientLines.join("<br/>")}</div>

  <table class="items-table">
    <thead>
      <tr>
        <th>${t(TranslationKey.description)}</th>
        ${showQty ? `<th class="qty">${t(TranslationKey.quantity)}</th><th class="rate">${t(TranslationKey.rate)}</th>` : ""}
        <th class="amt">${t(TranslationKey.amount)}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals-wrapper">
    <table class="totals-table">
      ${totalRows.join("\n")}
    </table>
  </div>

  ${notesHtml}
  ${dueDateHtml}

  <div class="footer">
    <div class="footer-text">${t(TranslationKey.thankYou)}</div>
    <hr class="footer-rule"/>
  </div>
</body>
</html>`;
}
