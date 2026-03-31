import { randomBytes } from "node:crypto";

export const MAX_FORWARD_RULES = 5;
export const MAX_MAILBOX_SIGNATURES = 20;

export type MailboxSignatureRule = {
  id: string;
  localPart: string;
  signatureHtml?: string | null;
  signatureText?: string | null;
};

export type ForwardRule = {
  id: string;
  enabled: boolean;
  forwardTo: string;
  matchKind: "all" | "exact" | "wildcard";
  pattern?: string | null;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function newId(): string {
  return `r_${randomBytes(8).toString("hex")}`;
}

/** Basic email shape check for forward destinations. */
export function isValidForwardEmail(s: string): boolean {
  const t = s.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 254;
}

export function parseMailboxSignaturesJson(raw: unknown): MailboxSignatureRule[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: MailboxSignatureRule[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, MAX_MAILBOX_SIGNATURES)) {
    if (!isPlainObject(item)) continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : newId();
    const localPart =
      typeof item.localPart === "string" ? item.localPart.trim().toLowerCase().slice(0, 64) : "";
    if (!localPart || seen.has(localPart)) continue;
    seen.add(localPart);
    const signatureHtml = typeof item.signatureHtml === "string" ? item.signatureHtml : null;
    const signatureText = typeof item.signatureText === "string" ? item.signatureText : null;
    out.push({ id, localPart, signatureHtml, signatureText });
  }
  return out;
}

export function parseForwardRulesJson(raw: unknown): ForwardRule[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: ForwardRule[] = [];
  for (const item of raw.slice(0, MAX_FORWARD_RULES)) {
    if (!isPlainObject(item)) continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : newId();
    const enabled = item.enabled !== false;
    const forwardTo = typeof item.forwardTo === "string" ? item.forwardTo.trim().toLowerCase() : "";
    if (!forwardTo || !isValidForwardEmail(forwardTo)) continue;
    const mk = item.matchKind === "exact" || item.matchKind === "wildcard" ? item.matchKind : "all";
    let pattern: string | null =
      typeof item.pattern === "string" && item.pattern.trim() ? item.pattern.trim().slice(0, 200) : null;
    if (mk === "all") pattern = null;
    if ((mk === "exact" || mk === "wildcard") && !pattern) continue;
    if (mk === "exact" && !isValidForwardEmail(pattern!)) {
      const p = pattern!.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) continue;
      pattern = p;
    }
    out.push({ id, enabled, forwardTo, matchKind: mk, pattern });
  }
  return out;
}

export function wildcardToRegex(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (!p) return null;
  try {
    const escaped = p
      .split("*")
      .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`, "i");
  } catch {
    return null;
  }
}
