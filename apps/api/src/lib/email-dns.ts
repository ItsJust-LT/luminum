import dns from "dns/promises";

/** Inbound and outbound org email use Amazon SES only (no self-hosted SMTP). */
export function isSesInboundMode(): boolean {
  return true;
}

function domainFromMailFrom(defaultFrom: string): string {
  const match = defaultFrom.match(/@([a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : "";
}

/** Regional SES inbound SMTP endpoint hostname (receiving). */
export function getSesInboundMxHost(): string {
  const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "").trim();
  if (!region) return "";
  return `inbound-smtp.${region}.amazonaws.com`.toLowerCase();
}

/**
 * Hostname that should appear in the customer's MX record for SES receiving.
 */
export function getPrescribedInboundMxHost(_emailDomain: string): string {
  return getSesInboundMxHost();
}

/** SPF TXT for SES sending. */
export function getExpectedSpfRecordForDomain(_emailDomain: string): string {
  return "v=spf1 include:amazonses.com -all";
}

/** @deprecated Prefer getPrescribedInboundMxHost(domain) with the org email domain. */
export async function getExpectedMxHost(): Promise<string> {
  const fallback = domainFromMailFrom(process.env.MAIL_FROM_DEFAULT || "noreply@luminum.agency");
  if (!fallback) return getSesInboundMxHost();
  return getPrescribedInboundMxHost(fallback);
}

/** SES Easy DKIM CNAME targets per token from GetEmailIdentity. */
export function getSesDkimCnameRecords(domain: string, tokens: string[]): { name: string; target: string }[] {
  const d = domain.toLowerCase().replace(/\.$/, "").trim();
  const out: { name: string; target: string }[] = [];
  for (const t of tokens) {
    const token = String(t).trim();
    if (!token) continue;
    out.push({
      name: `${token}._domainkey.${d}`,
      target: `${token}.dkim.amazonses.com`,
    });
  }
  return out;
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
    return {
      ok: false,
      expectedHost: "",
      actualHosts: [],
      error: "Could not determine SES inbound host (set AWS_REGION or AWS_DEFAULT_REGION)",
    };
  }
  try {
    const records = await dns.resolveMx(domain);
    const actualHosts = (records || []).map((r) => ({
      exchange: (r.exchange || "").toLowerCase().replace(/\.$/, ""),
      priority: r.priority ?? 0,
    }));
    const expectedLower = expected.toLowerCase().replace(/\.$/, "");
    const ok = actualHosts.some(
      (r) => r.exchange === expectedLower || r.exchange.endsWith("." + expectedLower) || r.exchange === expected
    );
    return {
      ok,
      expectedHost: expected,
      actualHosts,
      error: ok ? undefined : actualHosts.length === 0 ? "No MX records found" : `MX does not point to ${expected}`,
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
      error: hasSes ? undefined : "SPF must include Amazon SES (e.g. include:amazonses.com)",
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

/** Legacy hook; SES DKIM is validated via checkSesDkimCnames. */
export async function checkDomainDkim(_domain: string): Promise<DkimCheckResult> {
  return { ok: true, selector: "", record: undefined };
}

export interface SesDkimDnsCheckResult {
  ok: boolean;
  records: { name: string; target: string; ok: boolean; error?: string }[];
  error?: string;
}

/**
 * Verify SES Easy DKIM CNAMEs: each `{token}._domainkey.domain` should point at `{token}.dkim.amazonses.com`.
 */
export async function checkSesDkimCnames(domain: string, tokens: string[]): Promise<SesDkimDnsCheckResult> {
  const rows = getSesDkimCnameRecords(domain, tokens);
  if (rows.length === 0) {
    return { ok: false, records: [], error: "No DKIM tokens from SES yet (create/register the domain in SES first)" };
  }
  const results: SesDkimDnsCheckResult["records"] = [];
  let allOk = true;
  for (const row of rows) {
    try {
      const cnames = await dns.resolveCname(row.name);
      const flat = (cnames || []).map((c) => c.toLowerCase().replace(/\.$/, ""));
      const want = row.target.toLowerCase().replace(/\.$/, "");
      const ok = flat.some((c) => c === want || c.endsWith("." + want));
      if (!ok) allOk = false;
      results.push({
        name: row.name,
        target: row.target,
        ok,
        error: ok ? undefined : flat.length ? `CNAME points to ${flat.join(", ")}, expected ${row.target}` : "CNAME not found",
      });
    } catch (e: unknown) {
      allOk = false;
      const message = e instanceof Error ? e.message : String(e);
      results.push({ name: row.name, target: row.target, ok: false, error: message });
    }
  }
  return { ok: allOk, records: results };
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
