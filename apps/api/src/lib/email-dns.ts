import dns from "dns/promises";

const MAIL_MX_HOST = (process.env.MAIL_MX_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_MX_DOMAIN = (process.env.MAIL_MX_DOMAIN || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_HOST_RAW = (process.env.MAIL_SEND_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_IP = process.env.MAIL_SEND_IP || "";

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
  return "";
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
  if (!expectedHost && !expectedIp) {
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
    const hasInclude = expectedHost && (lower.includes(`include:${expectedHost}`) || lower.includes(`a:${expectedHost}`));
    const hasIp = expectedIp && lower.includes(expectedIp);
    const ok = hasInclude || hasIp || lower.includes("include:_spf.");
    return { ok, record, error: ok ? undefined : "SPF does not authorize this server" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
