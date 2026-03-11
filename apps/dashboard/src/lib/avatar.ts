import * as dns from "dns/promises"
import * as crypto from "crypto"

const GRAVATAR_BASE = "https://www.gravatar.com/avatar"

/**
 * Fetch BIMI logo URL for domain (DNS TXT default._bimi.<domain>).
 */
export async function fetchBimiForDomain(domain: string): Promise<string | null> {
  if (!domain) return null
  try {
    const recordName = `default._bimi.${domain}`
    const records = await dns.resolveTxt(recordName).catch(() => [] as string[][])
    for (const r of records) {
      const line = Array.isArray(r) ? r.join("") : String(r)
      const logoMatch = line.match(/l\s*=\s*([^\s;]+)/i)
      if (logoMatch?.[1]) {
        const url = logoMatch[1].trim()
        if (url.startsWith("https://")) return url
      }
    }
  } catch {
    // No BIMI record or DNS error
  }
  return null
}

/**
 * Compute Gravatar URL for email (does not verify it exists).
 */
export function getGravatarUrl(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const hash = crypto.createHash("md5").update(trimmed).digest("hex")
  return `${GRAVATAR_BASE}/${hash}?s=128&d=404`
}

/**
 * Resolve avatar URLs for an email: BIMI (if domain has it) and Gravatar.
 * Does not hit the database.
 */
export async function resolveAvatarUrls(email: string): Promise<{ bimi: string | null; gravatar: string }> {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.indexOf("@")
  const domain = at === -1 ? "" : trimmed.slice(at + 1)
  const bimi = domain ? await fetchBimiForDomain(domain) : null
  const gravatar = getGravatarUrl(trimmed)
  return { bimi, gravatar }
}

/**
 * HEAD request to check if URL returns 2xx (e.g. for avatar image).
 */
export async function urlReturnsOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" })
    return res.ok
  } catch {
    return false
  }
}
