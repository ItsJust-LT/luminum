import dns from "dns/promises";

const MAIL_MX_HOST = (process.env.MAIL_MX_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_MX_DOMAIN = (process.env.MAIL_MX_DOMAIN || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_HOST_RAW = (process.env.MAIL_SEND_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_IP = process.env.MAIL_SEND_IP || "";
const MAIL_DKIM_SELECTOR = (process.env.MAIL_DKIM_SELECTOR || "default").toLowerCase().replace(/\.$/, "");

const MX_CACHE_MS = 5 * 60 * 1000;
let cachedMxHost: string | null = null;
let cachedMxAt = 0;

function domainFromMailFrom(defaultFrom: string): string {
  const match = defaultFrom.match(/@([a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : "";
}

/** Resolve expected MX host: from MAIL_MX_HOST, or by looking up MX for MAIL_MX_DOMAIN (or domain from MAIL_FROM_DEFAULT). */
export async function getExpectedMxHost(): Promise<string> {
  if (MAIL_MX_HOST) return MAIL_MX_HOST;
  const domain = MAIL_MX_DOMAIN || domainFromMailFrom(process.env.MAIL_FROM_DEFAULT || "noreply@luminum.agency");
  if (!domain) return "";
  if (cachedMxHost !== null && Date.now() - cachedMxAt < MX_CACHE_MS) return cachedMxHost;
  try {
    const records = await dns.resolveMx(domain);
    const sorted = (records || []).slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const first = sorted[0]?.exchange;
    if (first) {
      cachedMxHost = first.toLowerCase().replace(/\.$/, "");
      cachedMxAt = Date.now();
      return cachedMxHost;
    }
  } catch {
    // ignore
  }
  // No MX yet for domain (e.g. initial setup): suggest common convention so UI can show a target
  return `mail.${domain}`;
}

/** Suggested SPF TXT value. Prefer MAIL_SEND_HOST / MAIL_MX_HOST so the suggestion matches your mail server; only use domain's MX when env is not set. */
export async function getExpectedSpfRecord(domain?: string): Promise<string> {
  const ip = MAIL_SEND_IP;
  if (ip) return `v=spf1 ip4:${ip} -all`;
  let host = MAIL_SEND_HOST_RAW || MAIL_MX_HOST;
  if (!host && domain) {
    try {
      const records = await dns.resolveMx(domain);
      const first = (records || []).slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))[0]?.exchange;
      if (first) host = first.toLowerCase().replace(/\.$/, "");
    } catch {
      // ignore
    }
  }
  if (!host) host = (await getExpectedMxHost()) || "";
  if (host) return `v=spf1 include:${host} -all`;
  return "v=spf1 -all";
}

/** DKIM TXT record name (selector._domainkey.domain) and selector for setup instructions. */
export function getDkimRecordName(domain: string): { name: string; selector: string } {
  const selector = MAIL_DKIM_SELECTOR || "default";
  return {
    name: `${selector}._domainkey.${domain}`,
    selector,
  };
}

/** Suggested DMARC TXT value for _dmarc.domain (for setup instructions). */
export function getExpectedDmarcRecord(domain: string): string {
  const rua = `mailto:dmarc@${domain}`;
  return `v=DMARC1; p=none; rua=${rua}; pct=100`;
}

export interface MxCheckResult {
  ok: boolean;
  expectedHost: string;
  actualHosts: { exchange: string; priority: number }[];
  error?: string;
}

export async function checkDomainMx(domain: string): Promise<MxCheckResult> {
  const expected = await getExpectedMxHost();
  if (!expected) {
    return { ok: false, expectedHost: "", actualHosts: [], error: "MAIL_MX_HOST or MAIL_MX_DOMAIN (or MAIL_FROM_DEFAULT domain) not configured" };
  }
  try {
    const records = await dns.resolveMx(domain);
    const actualHosts = (records || []).map((r) => ({
      exchange: (r.exchange || "").toLowerCase().replace(/\.$/, ""),
      priority: r.priority ?? 0,
    }));
    const ok = actualHosts.some(
      (r) => r.exchange === expected || r.exchange.endsWith("." + expected)
    );
    return {
      ok,
      expectedHost: expected,
      actualHosts,
      error: ok ? undefined : (actualHosts.length === 0 ? "No MX records found" : `MX does not point to ${expected}`),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, expectedHost: expected, actualHosts: [], error: message };
  }
}

export interface SpfCheckResult {
  ok: boolean;
  record?: string;
  error?: string;
}

export async function checkDomainSpf(domain: string): Promise<SpfCheckResult> {
  const expectedHost = MAIL_SEND_HOST_RAW || (await getExpectedMxHost()) || MAIL_MX_HOST;
  const expectedIp = MAIL_SEND_IP;
  let actualMxHosts: string[] = [];
  try {
    const mxRecords = await dns.resolveMx(domain);
    actualMxHosts = (mxRecords || []).map((r) => (r.exchange || "").toLowerCase().replace(/\.$/, "")).filter(Boolean);
  } catch {
    // ignore
  }
  if (!expectedHost && !expectedIp && actualMxHosts.length === 0) {
    return { ok: true, record: undefined };
  }
  try {
    const records = await dns.resolveTxt(domain);
    const flattened = (records || []).flat();
    const spf = flattened.find((r) => String(r).trim().toLowerCase().startsWith("v=spf1 "));
    if (!spf) {
      return { ok: false, error: "No SPF record found" };
    }
    const record = String(spf).trim();
    const lower = record.toLowerCase();
    const authorizes = (host: string) =>
      host && (lower.includes(`include:${host}`) || lower.includes(`a:${host}`));
    const hasExpected = expectedHost && authorizes(expectedHost);
    const hasActualMx = actualMxHosts.some((h) => authorizes(h));
    const hasIp = expectedIp && lower.includes(expectedIp);
    const hasCloudflare = lower.includes("include:_spf.");
    const ok = hasExpected || hasActualMx || hasIp || hasCloudflare;
    return { ok, record, error: ok ? undefined : "SPF does not authorize this server" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export interface DkimCheckResult {
  ok: boolean;
  selector: string;
  record?: string;
  error?: string;
}

export async function checkDomainDkim(domain: string): Promise<DkimCheckResult> {
  if (!MAIL_DKIM_SELECTOR) {
    // DKIM selector not configured; treat as "not enforced"
    return { ok: true, selector: "", record: undefined };
  }
  const name = `${MAIL_DKIM_SELECTOR}._domainkey.${domain}`;
  try {
    const records = await dns.resolveTxt(name);
    const flattened = (records || []).flat();
    const dkim = flattened.find((r) => String(r).toLowerCase().includes("v=dkim1"));
    if (!dkim) {
      return { ok: false, selector: MAIL_DKIM_SELECTOR, error: "No DKIM record found" };
    }
    return { ok: true, selector: MAIL_DKIM_SELECTOR, record: String(dkim) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, selector: MAIL_DKIM_SELECTOR, error: message };
  }
}

export interface DmarcCheckResult {
  ok: boolean;
  record?: string;
  error?: string;
}

export async function checkDomainDmarc(domain: string): Promise<DmarcCheckResult> {
  const name = `_dmarc.${domain}`;
  try {
    const records = await dns.resolveTxt(name);
    const flattened = (records || []).flat();
    const dmarc = flattened.find((r) => String(r).trim().toLowerCase().startsWith("v=dmarc1"));
    if (!dmarc) {
      return { ok: false, error: "No DMARC record found" };
    }
    return { ok: true, record: String(dmarc) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
