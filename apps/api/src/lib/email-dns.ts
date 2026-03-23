import dns from "dns/promises";

const MAIL_MX_HOST = (process.env.MAIL_MX_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_HOST_RAW = (process.env.MAIL_SEND_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_IP = (process.env.MAIL_SEND_IP || "").trim();
const MAIL_DKIM_SELECTOR = (process.env.MAIL_DKIM_SELECTOR || "default").toLowerCase().replace(/\.$/, "");

function domainFromMailFrom(defaultFrom: string): string {
  const match = defaultFrom.match(/@([a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Hostname that should appear in the customer's MX record (where inbound SMTP is delivered).
 * Never inferred from live DNS (that mirrored registrar forwarding and broke self-hosted setups).
 *
 * - If MAIL_MX_HOST is set (single-tenant / operator override), use it for all orgs.
 * - Otherwise use mail.<emailDomain> for the org's chosen email domain.
 */
export function getPrescribedInboundMxHost(emailDomain: string): string {
  const d = emailDomain.toLowerCase().trim().replace(/\.$/, "");
  if (!d) return MAIL_MX_HOST || "";
  if (MAIL_MX_HOST) return MAIL_MX_HOST;
  return `mail.${d}`;
}

/**
 * SPF TXT we ask users to add: ip4 to the mail server’s public IPv4 only.
 * Requires MAIL_SEND_IP on the API; there is no a:/mx fallback in setup instructions.
 */
export function getExpectedSpfRecordForDomain(_emailDomain: string): string {
  if (!MAIL_SEND_IP) return "";
  return `v=spf1 ip4:${MAIL_SEND_IP} -all`;
}

/** @deprecated Prefer getPrescribedInboundMxHost(domain) with the org email domain. */
export async function getExpectedMxHost(): Promise<string> {
  const fallback = domainFromMailFrom(process.env.MAIL_FROM_DEFAULT || "noreply@luminum.agency");
  if (!fallback) return MAIL_MX_HOST || "";
  return getPrescribedInboundMxHost(fallback);
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
  return `v=DMARC1; p=quarantine; rua=${rua}; pct=100`;
}

/** Parse DMARC p= tag from a TXT record (case-insensitive). */
export function parseDmarcPolicy(record: string): "none" | "quarantine" | "reject" | null {
  const m = String(record).match(/\bp\s*=\s*(none|quarantine|reject)\b/i);
  if (!m) return null;
  return m[1].toLowerCase() as "none" | "quarantine" | "reject";
}

export interface MxCheckResult {
  ok: boolean;
  expectedHost: string;
  actualHosts: { exchange: string; priority: number }[];
  error?: string;
}

export async function checkDomainMx(domain: string): Promise<MxCheckResult> {
  const expected = getPrescribedInboundMxHost(domain);
  if (!expected) {
    return { ok: false, expectedHost: "", actualHosts: [], error: "Could not determine inbound mail hostname for this domain" };
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
  const mxHost = getPrescribedInboundMxHost(domain);
  const expectedHost = MAIL_SEND_HOST_RAW || MAIL_MX_HOST || mxHost;
  const mailSendIp = (MAIL_SEND_IP || "").trim().replace(/\s/g, "");
  let actualMxHosts: string[] = [];
  try {
    const mxRecords = await dns.resolveMx(domain);
    actualMxHosts = (mxRecords || []).map((r) => (r.exchange || "").toLowerCase().replace(/\.$/, "")).filter(Boolean);
  } catch {
    // ignore
  }
  if (!expectedHost && !mailSendIp && actualMxHosts.length === 0) {
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

    // When API has MAIL_SEND_IP, verification requires that exact ip4: in SPF (org setup uses ip4-only SPF).
    if (mailSendIp) {
      const hasIp = lower.includes(`ip4:${mailSendIp.toLowerCase()}`);
      return {
        ok: hasIp,
        record,
        error: hasIp ? undefined : `SPF must include ip4:${mailSendIp} (sender IPv4)`,
      };
    }

    const authorizes = (host: string) =>
      host && (lower.includes(`include:${host}`) || lower.includes(`a:${host}`));
    const hasExpected = expectedHost && authorizes(expectedHost);
    const hasActualMx = actualMxHosts.some((h) => authorizes(h));
    const hasCloudflare = lower.includes("include:_spf.");
    const ok = hasExpected || hasActualMx || hasCloudflare;
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
    const record = String(dmarc);
    const policy = parseDmarcPolicy(record);
    if (policy === "none") {
      return { ok: false, record, error: "DMARC policy must be quarantine or reject (p=none is not allowed for verification)" };
    }
    if (policy !== "quarantine" && policy !== "reject") {
      return { ok: false, record, error: "DMARC record must include p=quarantine or p=reject" };
    }
    return { ok: true, record };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
