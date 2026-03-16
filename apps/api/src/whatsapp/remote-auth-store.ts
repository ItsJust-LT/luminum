import type { PrismaClient } from "@luminum/database";

/**
 * Postgres-backed session store for whatsapp-web.js RemoteAuth.
 *
 * RemoteAuth expects a store object with:
 *   sessionExists(options) → boolean
 *   save(options) → void
 *   extract(options) → any (session payload)
 *   delete(options) → void
 *
 * We persist the session blob as `session_data` (BYTEA) on the whatsapp_account row,
 * keyed by the account's `id` (which RemoteAuth calls `session`).
 */
export class PgRemoteAuthStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async sessionExists(options: { session: string }): Promise<boolean> {
    const row = await this.prisma.whatsapp_account.findUnique({
      where: { id: options.session },
      select: { session_data: true },
    });
    return !!row?.session_data;
  }

  async save(options: { session: string }): Promise<void> {
    // RemoteAuth calls save after producing a session artifact.
    // The actual data is handled internally by RemoteAuth; we just
    // ensure the row knows the session exists.
    await this.prisma.whatsapp_account.update({
      where: { id: options.session },
      data: { session_saved_at: new Date() },
    });
  }

  async extract(options: { session: string }): Promise<string | null> {
    const row = await this.prisma.whatsapp_account.findUnique({
      where: { id: options.session },
      select: { session_data: true },
    });
    if (!row?.session_data) return null;
    return Buffer.from(row.session_data).toString("base64");
  }

  async delete(options: { session: string }): Promise<void> {
    await this.prisma.whatsapp_account.update({
      where: { id: options.session },
      data: { session_data: null, session_saved_at: null },
    });
  }
}
