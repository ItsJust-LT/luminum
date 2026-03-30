import dns from "dns/promises";

/** Org email uses Resend per-tenant; inbound MX is configured in the customer’s Resend project. */
export function isSesInboundMode(): boolean {
  return false;
}

function domainFromMailFrom(defaultFrom: string): string {
  const match = defaultFrom.match(/@([a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : "";
}

/** No single platform MX; return empty (admin/tools may still list actual MX via checkDomainMx). */
export function getSesInboundMxHost(): string {
  return "";
}

export function getPrescribedInboundMxHost(_emailDomain: string): string {
  return "";
}

/** SPF guidance for domains that send via Resend (Resend may show a different record in-dashboard). */
export function getExpectedSpfRecordForDomain(_emailDomain: string): string {
  return "v=spf1 include:amazonses.com ~all";
}

/** @deprecated No platform-prescribed MX. */
export async function getExpectedMxHost(): Promise<string> {
  return "";
}

export interface MxCheckResult {
  ok: boolean;
  expectedHost: string;
  actualHosts: { exchange: string; priority: number }[];
  error?: string;
}

/** Lists public MX for the domain (advisory only; no comparison to a fixed SES host). */
export async function checkDomainMx(domain: string): Promise<MxCheckResult> {
  try {
    const records = await dns.resolveMx(domain);
    const actualHosts = (records || []).map((r) => ({
      exchange: (r.exchange || "").toLowerCase().replace(/\.$/, ""),
      priority: r.priority ?? 0,
    }));
    return {
      ok: true,
      expectedHost: "",
      actualHosts,
      error: actualHosts.length ? undefined : "No MX records found (add receiving MX in Resend for inbound)",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, expectedHost: "", actualHosts: [], error: message };
  }
}

export interface SpfCheckResult {
  ok: boolean;
  record?: string;
  error?: string;
}

export async function checkDomainSpf(domain: string): Promise<SpfCheckResult> {
  try {
    const records = await dns.resolveTxt(domain);
    const flattened = (records || []).flat();
    const spf = flattened.find((r) => String(r).trim().toLowerCase().startsWith("v=spf1 "));
    if (!spf) {
      return { ok: false, error: "No SPF record found" };
    }
    const record = String(spf).trim();
    const lower = record.toLowerCase();
    const hasSes = lower.includes("include:amazonses.com") || lower.includes("include:_spf.amazonaws.com");
    return {
      ok: hasSes,
      record,
      error: hasSes ? undefined : "SPF should include Amazon SES / Resend sending (e.g. include:amazonses.com)",
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface DkimCheckResult {
  ok: boolean;
  selector: string;
  record?: string;
  error?: string;
}

export async function checkDomainDkim(_domain: string): Promise<DkimCheckResult> {
  return { ok: true, selector: "", record: undefined };
}

export interface SesDkimDnsCheckResult {
  ok: boolean;
  records: { name: string; target: string; ok: boolean; error?: string }[];
  error?: string;
}

/** Kept for cron compatibility; with no SES tokens returns not applicable. */
export async function checkSesDkimCnames(_domain: string, tokens: string[]): Promise<SesDkimDnsCheckResult> {
  if (!tokens.length) {
    return { ok: true, records: [], error: undefined };
  }
  return { ok: false, records: [], error: "DKIM is managed in Resend; use the Resend dashboard for this domain." };
}

export interface DmarcCheckResult {
  ok: boolean;
  record?: string;
  error?: string;
}

export function getExpectedDmarcRecord(domain: string): string {
  const d = domain.toLowerCase().replace(/\.$/, "").trim();
  const rua = `mailto:dmarc@${d}`;
  return `v=DMARC1; p=quarantine; rua=${rua}; pct=100`;
}

export function parseDmarcPolicy(record: string): "none" | "quarantine" | "reject" | null {
  const m = String(record).match(/\bp\s*=\s*(none|quarantine|reject)\b/i);
  if (!m) return null;
  return m[1].toLowerCase() as "none" | "quarantine" | "reject";
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
