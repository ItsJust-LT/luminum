import { translate, formatCurrency, formatDate, TranslationKey } from "./locale.js";
import type { InvoiceItem, CustomAdjustment } from "./calculations.js";

export interface InvoiceTemplateData {
  documentType?: "invoice" | "quote";
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
  const isQuote = data.documentType === "quote";
  const t = (key: string) => translate(data.language, key);
  const fc = (amount: number) => formatCurrency(amount, data.currency, data.language);
  const fd = (dateStr: string) => formatDate(dateStr, data.language);

  const docTitle = isQuote ? t(TranslationKey.quote) : t(TranslationKey.invoice);
  const numberLabel = isQuote ? t(TranslationKey.quoteNumber) : t(TranslationKey.invoiceNumber);
  const toLabel = isQuote ? t(TranslationKey.quoteTo) : t(TranslationKey.billTo);
  const dateLabel = isQuote ? t(TranslationKey.validUntil) : t(TranslationKey.dueDate);
  const thankYou = isQuote ? t(TranslationKey.thankYouQuote) : t(TranslationKey.thankYou);

  const showQty = data.items.some((i) => i.quantity !== 1);

  const companyLines: string[] = [];
  const companyAddr = formatAddress(data.company.address);
  if (companyAddr) companyLines.push(companyAddr);
  if (data.company.phone) companyLines.push(escapeHtml(data.company.phone));
  if (data.company.email) companyLines.push(escapeHtml(data.company.email));
  if (data.company.vat) companyLines.push(`VAT: ${escapeHtml(data.company.vat)}`);

  const clientLines: string[] = [];
  const clientAddr = formatAddress(data.client.address);
  if (clientAddr) clientLines.push(clientAddr);
  if (data.client.phone) clientLines.push(escapeHtml(data.client.phone));
  if (data.client.email) clientLines.push(escapeHtml(data.client.email));

  const itemRows = data.items.map((item) => {
    const qty = Math.floor(item.quantity);
    const lineTotal = qty * item.unit_price;
    if (showQty) {
      return `<tr>
        <td class="desc">${escapeHtml(item.description)}</td>
        <td class="num">${qty}</td>
        <td class="num">${fc(item.unit_price)}</td>
        <td class="num amt">${fc(lineTotal)}</td>
      </tr>`;
    }
    return `<tr>
      <td class="desc">${escapeHtml(item.description)}</td>
      <td class="num amt">${fc(lineTotal)}</td>
    </tr>`;
  }).join("\n");

  const totalRows: string[] = [];
  totalRows.push(`<tr><td>${t(TranslationKey.subtotal)}</td><td>${fc(data.subtotal)}</td></tr>`);
  if (data.totalTax > 0) {
    const taxLabel = data.taxInclusive
      ? `${t(TranslationKey.tax)} <span class="note">(included)</span>`
      : t(TranslationKey.tax);
    totalRows.push(`<tr><td>${taxLabel}</td><td>${fc(data.totalTax)}</td></tr>`);
  }
  if (data.shipping > 0) totalRows.push(`<tr><td>${t(TranslationKey.shipping)}</td><td>${fc(data.shipping)}</td></tr>`);
  if (data.discount > 0) totalRows.push(`<tr><td>${t(TranslationKey.discount)}</td><td>-${fc(data.discount)}</td></tr>`);
  if (data.customAdjustments) {
    for (const adj of data.customAdjustments) {
      const val = adj.amount < 0 ? `-${fc(Math.abs(adj.amount))}` : fc(adj.amount);
      totalRows.push(`<tr><td>${escapeHtml(adj.label)}</td><td>${val}</td></tr>`);
    }
  }

  const logoHtml = data.company.logo
    ? `<img src="${escapeHtml(data.company.logo)}" class="logo" crossorigin="anonymous" />`
    : "";

  const termsHtml = data.terms
    ? `<div class="terms"><div class="section-label">${t(TranslationKey.terms)}</div><div class="section-body">${escapeHtml(data.terms)}</div></div>`
    : "";

  const notesHtml = data.notes
    ? `<div class="notes"><div class="section-label">${t(TranslationKey.notes)}</div><div class="section-body">${escapeHtml(data.notes)}</div></div>`
    : "";

  const dueDateHtml = data.dueDate
    ? `<div class="meta-item"><span class="meta-label">${dateLabel}</span><span class="meta-value">${fd(data.dueDate)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
    font-size: 11px;
    line-height: 1.5;
    width: 794px;
    min-height: 1123px;
    position: relative;
    background: #fff;
  }

  .page { padding: 48px 56px 40px 56px; }

  .accent-bar {
    height: 5px;
    background: #111827;
    width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
  }
  .header-left { flex: 1; }
  .company-name {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .company-details {
    font-size: 10px;
    color: #6b7280;
    line-height: 1.7;
  }
  .logo {
    max-width: 110px;
    max-height: 70px;
    object-fit: contain;
    margin-left: 24px;
  }

  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 28px;
    padding-bottom: 18px;
    border-bottom: 1px solid #e5e7eb;
  }
  .doc-title {
    font-size: 32px;
    font-weight: 800;
    color: #111827;
    letter-spacing: 0.5px;
    line-height: 1;
    text-transform: uppercase;
  }
  .doc-meta { text-align: right; }
  .meta-item { margin-bottom: 5px; }
  .meta-label {
    font-size: 8px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-right: 10px;
  }
  .meta-value {
    font-size: 12px;
    font-weight: 600;
    color: #111827;
  }

  .parties {
    display: flex;
    gap: 48px;
    margin-bottom: 32px;
  }
  .party { flex: 1; }
  .party-label {
    font-size: 8px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid #111827;
    display: inline-block;
  }
  .party-name {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }
  .party-info {
    font-size: 10px;
    color: #6b7280;
    line-height: 1.7;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  .items-table thead th {
    background: #f9fafb;
    padding: 10px 16px;
    font-size: 8px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    text-align: left;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }
  .items-table thead th.num { text-align: right; }
  .items-table tbody td {
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }
  .items-table tbody td.desc {
    font-size: 11px;
    font-weight: 500;
    color: #111827;
  }
  .items-table tbody td.num {
    text-align: right;
    font-size: 11px;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
  }
  .items-table tbody td.amt {
    font-weight: 700;
    color: #111827;
  }

  .totals-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .totals-table {
    border-collapse: collapse;
    min-width: 280px;
  }
  .totals-table td {
    padding: 7px 16px;
    font-size: 11px;
  }
  .totals-table td:first-child {
    text-align: right;
    font-weight: 500;
    color: #6b7280;
  }
  .totals-table td:last-child {
    text-align: right;
    font-weight: 600;
    color: #1f2937;
    min-width: 120px;
  }
  .totals-table .note {
    font-weight: 400;
    color: #9ca3af;
    font-size: 9px;
  }
  .totals-table .grand-total td {
    border-top: 2px solid #111827;
    padding: 14px 16px;
    font-size: 14px;
    font-weight: 800;
    color: #111827;
  }

  .bottom-section {
    margin-top: 36px;
    display: flex;
    gap: 36px;
  }
  .notes, .terms { flex: 1; }
  .section-label {
    font-size: 8px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
  }
  .section-body {
    font-size: 10px;
    color: #6b7280;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .footer {
    margin-top: 48px;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
  }
  .footer-text {
    font-size: 10px;
    color: #9ca3af;
    font-weight: 500;
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="company-name">${escapeHtml(data.company.name)}</div>
        <div class="company-details">${companyLines.join("<br/>")}</div>
      </div>
      ${logoHtml}
    </div>

    <div class="doc-header">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-meta">
        <div class="meta-item">
          <span class="meta-label">${numberLabel}</span>
          <span class="meta-value">${escapeHtml(data.invoiceNumber)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">${t(TranslationKey.date)}</span>
          <span class="meta-value">${fd(data.date)}</span>
        </div>
        ${dueDateHtml}
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">${toLabel}</div>
        <div class="party-name">${escapeHtml(data.client.name)}</div>
        <div class="party-info">${clientLines.join("<br/>")}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>${t(TranslationKey.description)}</th>
          ${showQty ? `<th class="num">${t(TranslationKey.quantity)}</th><th class="num">${t(TranslationKey.rate)}</th>` : ""}
          <th class="num">${t(TranslationKey.amount)}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals-table">
        ${totalRows.join("\n")}
        <tr class="grand-total">
          <td>${isQuote ? t(TranslationKey.grandTotal) : t(TranslationKey.totalDue)}</td>
          <td>${fc(data.grandTotal)}</td>
        </tr>
      </table>
    </div>

    <div class="bottom-section">
      ${notesHtml}
      ${termsHtml}
    </div>

    <div class="footer">
      <div class="footer-text">${thankYou}</div>
    </div>
  </div>
</body>
</html>`;
}
