import crypto from "crypto";
import { prisma } from "./prisma.js";

/** Extract `addr` from `Name <addr>` or return trimmed string. */
export function parseAddressFromFromHeader(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/);
  return (m ? m[1] : fromHeader).trim().toLowerCase();
}

export function normalizeSenderEmail(fromHeader: string | null | undefined): string | null {
  if (!fromHeader?.trim()) return null;
  const addr = parseAddressFromFromHeader(fromHeader);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return null;
  return addr;
}

export function gravatarUrlForEmail(normalizedEmail: string, size = 80): string {
  const hash = crypto.createHash("md5").update(normalizedEmail).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=${size}`;
}

async function urlReturnsOk(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * If Gravatar has a real image, return its URL and refresh `email_avatar_cache`.
 */
export async function resolveGravatarAvatarUrl(normalizedEmail: string): Promise<string | null> {
  const url = gravatarUrlForEmail(normalizedEmail);
  if (!(await urlReturnsOk(url))) {
    try {
      await prisma.email_avatar_cache.upsert({
        where: { email: normalizedEmail },
        create: { email: normalizedEmail, avatar_url: null },
        update: { avatar_url: null },
      });
    } catch {
      /* ignore */
    }
    return null;
  }
  try {
    await prisma.email_avatar_cache.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail, avatar_url: url },
      update: { avatar_url: url },
    });
  } catch {
    /* ignore */
  }
  return url;
}
