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
  const htmlLang = data.language.toLowerCase().split("-")[0] || "en";
  const htmlDir = htmlLang === "ar" ? "rtl" : "ltr";

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
    ? `<div class="meta-row"><span class="meta-k">${dateLabel}</span><span class="meta-v">${fd(data.dueDate)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(htmlLang)}" dir="${htmlDir}">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --ink: #0c0c0c;
    --ink-soft: #262626;
    --muted: #525252;
    --faint: #737373;
    --line: #e5e5e5;
    --line-strong: #d4d4d4;
    --surface: #fafafa;
    --surface-2: #f5f5f5;
  }

  body {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--ink-soft);
    font-size: 12px;
    line-height: 1.55;
    font-weight: 400;
    width: 794px;
    min-height: 1123px;
    position: relative;
    background: #fff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page { padding: 44px 52px 36px 52px; }

  .accent-bar {
    height: 3px;
    background: var(--ink);
    width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 32px;
    margin-bottom: 36px;
  }
  .header-left { flex: 1; min-width: 0; }
  .company-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin-bottom: 8px;
  }
  .company-details {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.65;
    font-weight: 400;
  }
  .logo-wrap {
    flex-shrink: 0;
    padding: 10px 14px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: #fff;
  }
  .logo {
    display: block;
    max-width: 120px;
    max-height: 64px;
    object-fit: contain;
  }

  .doc-hero {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 28px;
    margin-bottom: 28px;
  }
  .doc-title-wrap { flex: 1; min-width: 0; padding-top: 4px; }
  .doc-title {
    font-size: 28px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.045em;
    line-height: 1.08;
    margin: 0;
  }

  .meta-panel {
    flex-shrink: 0;
    width: 248px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    padding: 14px 16px 12px;
    background: var(--surface);
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
  }
  .meta-row:last-child { border-bottom: none; padding-bottom: 0; }
  .meta-row:first-child { padding-top: 0; }
  .meta-k {
    font-size: 9px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    flex-shrink: 0;
  }
  .meta-v {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    text-align: right;
    font-variant-numeric: tabular-nums lining-nums;
  }

  .party-card {
    margin-bottom: 28px;
    padding: 18px 20px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: linear-gradient(180deg, #fff 0%, var(--surface) 100%);
    border-left: 3px solid var(--ink);
  }
  html[dir="rtl"] .party-card {
    border-left: 1px solid var(--line);
    border-right: 3px solid var(--ink);
  }
  .party-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 10px;
  }
  .party-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.02em;
    margin-bottom: 6px;
    line-height: 1.3;
  }
  .party-info {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.65;
  }

  .table-wrap {
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 0;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .items-table col.desc { width: auto; }
  .items-table col.qty { width: 64px; }
  .items-table col.rate { width: 22%; }
  .items-table col.amt { width: 24%; }
  .items-table thead th {
    background: var(--surface-2);
    padding: 11px 14px 10px;
    font-size: 9px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.11em;
    text-align: left;
    border-bottom: 1px solid var(--line-strong);
  }
  .items-table thead th.num {
    text-align: right;
    font-variant-numeric: tabular-nums lining-nums;
  }
  .items-table tbody td {
    padding: 13px 14px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  .items-table tbody tr:last-child td { border-bottom: none; }
  .items-table tbody tr:nth-child(even) td { background: #fcfcfc; }
  .items-table tbody td.desc {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-soft);
    line-height: 1.5;
    word-wrap: break-word;
  }
  .items-table tbody td.num {
    text-align: right;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums lining-nums;
  }
  .items-table tbody td.amt {
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums lining-nums;
  }

  .totals-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
  .totals-inner {
    width: 100%;
    max-width: 320px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  .totals-table {
    width: 100%;
    border-collapse: collapse;
  }
  .totals-table td {
    padding: 9px 16px;
    font-size: 12px;
    border-bottom: 1px solid var(--line);
    font-variant-numeric: tabular-nums lining-nums;
  }
  .totals-table tr:last-child td { border-bottom: none; }
  .totals-table td:first-child {
    text-align: left;
    font-weight: 500;
    color: var(--muted);
  }
  .totals-table td:last-child {
    text-align: right;
    font-weight: 600;
    color: var(--ink-soft);
    min-width: 112px;
  }
  .totals-table .note {
    font-weight: 400;
    color: var(--faint);
    font-size: 10px;
  }
  .totals-table .grand-total td {
    background: var(--surface-2);
    padding: 14px 16px;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    border-top: 1px solid var(--line-strong);
  }
  .totals-table .grand-total td:first-child { font-weight: 600; color: var(--ink); }

  .bottom-section {
    margin-top: 32px;
    display: flex;
    gap: 28px;
    align-items: flex-start;
  }
  .notes, .terms { flex: 1; min-width: 0; }
  .section-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }
  .section-body {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.65;
    white-space: pre-wrap;
    padding-left: 12px;
    border-left: 2px solid var(--line-strong);
  }
  html[dir="rtl"] .section-body {
    padding-left: 0;
    padding-right: 12px;
    border-left: none;
    border-right: 2px solid var(--line-strong);
  }

  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
    text-align: center;
  }
  .footer-text {
    font-size: 10px;
    color: var(--faint);
    font-weight: 500;
    letter-spacing: 0.02em;
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
      ${data.company.logo ? `<div class="logo-wrap">${logoHtml}</div>` : ""}
    </div>

    <div class="doc-hero">
      <div class="doc-title-wrap">
        <h1 class="doc-title">${docTitle}</h1>
      </div>
      <div class="meta-panel">
        <div class="meta-row"><span class="meta-k">${numberLabel}</span><span class="meta-v">${escapeHtml(data.invoiceNumber)}</span></div>
        <div class="meta-row"><span class="meta-k">${t(TranslationKey.date)}</span><span class="meta-v">${fd(data.date)}</span></div>
        ${dueDateHtml}
      </div>
    </div>

    <div class="party-card">
      <div class="party-label">${toLabel}</div>
      <div class="party-name">${escapeHtml(data.client.name)}</div>
      <div class="party-info">${clientLines.join("<br/>")}</div>
    </div>

    <div class="table-wrap">
      <table class="items-table">
        <colgroup>
          <col class="desc" />
          ${showQty ? `<col class="qty" /><col class="rate" />` : ""}
          <col class="amt" />
        </colgroup>
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
    </div>

    <div class="totals-section">
      <div class="totals-inner">
        <table class="totals-table">
          ${totalRows.join("\n")}
          <tr class="grand-total">
            <td>${isQuote ? t(TranslationKey.grandTotal) : t(TranslationKey.totalDue)}</td>
            <td>${fc(data.grandTotal)}</td>
          </tr>
        </table>
      </div>
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
