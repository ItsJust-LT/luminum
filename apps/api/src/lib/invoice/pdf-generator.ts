import { buffer as streamToBuffer } from "node:stream/consumers";
import puppeteer, { type Browser } from "puppeteer";
import * as s3 from "../storage/s3.js";
import { buildInvoiceHtml, type InvoiceTemplateData } from "./html-template.js";

let browserInstance: Browser | null = null;

/** Parse S3 storage key from our authenticated file proxy URL (`/api/files/...`). */
function storageKeyFromFilesProxyUrl(url: string): string | null {
  const marker = "/api/files/";
  try {
    const u = new URL(url);
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    const encoded = u.pathname.slice(i + marker.length);
    if (!encoded) return null;
    return decodeURIComponent(encoded).replace(/\.\./g, "");
  } catch {
    if (url.startsWith(marker)) {
      return decodeURIComponent(url.slice(marker.length)).replace(/\.\./g, "");
    }
    const i = url.indexOf(marker);
    if (i !== -1) {
      const encoded = url.slice(i + marker.length).split(/[?#]/)[0] ?? "";
      if (!encoded) return null;
      return decodeURIComponent(encoded).replace(/\.\./g, "");
    }
    return null;
  }
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;
  browserInstance = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    ...(process.env.PUPPETEER_EXECUTABLE_PATH
      ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
      : {}),
  });
  return browserInstance;
}

async function resolveLogoToBase64(url: string): Promise<string> {
  const key = storageKeyFromFilesProxyUrl(url);
  if (key && s3.isStorageConfigured()) {
    try {
      const obj = await s3.getObject(key);
      if (obj) {
        const buf = await streamToBuffer(obj.stream);
        const contentType = obj.contentType || "image/png";
        return `data:${contentType};base64,${buf.toString("base64")}`;
      }
    } catch {
      // fall through to fetch for external URLs
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return url;
  }
}

export async function generateInvoicePdf(data: InvoiceTemplateData): Promise<Buffer> {
  if (data.company.logo && !data.company.logo.startsWith("data:")) {
    data = { ...data, company: { ...data.company, logo: await resolveLogoToBase64(data.company.logo) } };
  }
  const html = buildInvoiceHtml(data);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}
