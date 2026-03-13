import dns from "dns/promises";

const MAIL_MX_HOST = (process.env.MAIL_MX_HOST || "").toLowerCase().replace(/\.$/, "");
const MAIL_SEND_HOST = (process.env.MAIL_SEND_HOST || MAIL_MX_HOST).toLowerCase().replace(/\.$/, "");
const MAIL_SEND_IP = process.env.MAIL_SEND_IP || "";

export function getExpectedMxHost(): string {
  return MAIL_MX_HOST;
}

export interface MxCheckResult {
  ok: boolean;
  expectedHost: string;
  actualHosts: { exchange: string; priority: number }[];
  error?: string;
}

export async function checkDomainMx(domain: string): Promise<MxCheckResult> {
  const expected = MAIL_MX_HOST;
  if (!expected) {
    return { ok: false, expectedHost: "", actualHosts: [], error: "MAIL_MX_HOST not configured" };
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
  const expectedHost = MAIL_SEND_HOST;
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
