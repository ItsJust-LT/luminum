import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PrismaClient } from "@luminum/database";

/**
 * Postgres-backed session store for whatsapp-web.js RemoteAuth.
 *
 * RemoteAuth uses:
 *   sessionExists({ session }) - session is "RemoteAuth-{clientId}" (clientId = account.id)
 *   save({ session }) - session is the *directory* path (e.g. ./.wwebjs_auth/RemoteAuth-{id}); the zip is at session + '.zip'
 *   extract({ session, path }) - session is "RemoteAuth-{clientId}", path is where to write the zip file
 *   delete({ session }) - session is "RemoteAuth-{clientId}"
 *
 * We persist the compressed session (zip) as `session_data` (BYTEA) on whatsapp_account,
 * keyed by account id parsed from the session name/path.
 */
const SESSION_PREFIX = "RemoteAuth-";

function getAccountId(session: string): string {
  const name = session.includes(path.sep) ? path.basename(session) : session;
  return name.startsWith(SESSION_PREFIX) ? name.slice(SESSION_PREFIX.length) : name;
}

export class PgRemoteAuthStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async sessionExists(options: { session: string }): Promise<boolean> {
    const accountId = getAccountId(options.session);
    const row = await this.prisma.whatsapp_account.findUnique({
      where: { id: accountId },
      select: { session_data: true },
    });
    return !!row?.session_data;
  }

  async save(options: { session: string }): Promise<void> {
    const accountId = getAccountId(options.session);
    const zipPath = `${options.session}.zip`;
    let buf: Buffer;
    try {
      buf = await fs.readFile(zipPath);
    } catch (err) {
      return;
    }
    await this.prisma.whatsapp_account.update({
      where: { id: accountId },
      data: { session_data: new Uint8Array(buf), session_saved_at: new Date() },
    });
  }

  async extract(options: { session: string; path?: string }): Promise<void> {
    const accountId = getAccountId(options.session);
    const row = await this.prisma.whatsapp_account.findUnique({
      where: { id: accountId },
      select: { session_data: true },
    });
    if (!row?.session_data || !options.path) return;
    await fs.writeFile(options.path, row.session_data);
  }

  async delete(options: { session: string }): Promise<void> {
    const accountId = getAccountId(options.session);
    await this.prisma.whatsapp_account.update({
      where: { id: accountId },
      data: { session_data: null, session_saved_at: null },
    });
  }
}
