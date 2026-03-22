import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export type WhatsAppClientEventInput = {
  organizationId: string;
  accountId?: string | null;
  reasonCode: string;
  /** Human-readable explanation (required — never empty). */
  detail: string;
  waDisconnectReason?: string | null;
  instanceId?: string | null;
  alwaysOn?: boolean;
  metadata?: Record<string, unknown> | null;
};

export class WhatsAppNotReadyError extends Error {
  readonly code: string;
  readonly detail: string;
  readonly context?: string;

  constructor(code: string, message: string, detail: string, context?: string) {
    super(message);
    this.name = "WhatsAppNotReadyError";
    this.code = code;
    this.detail = detail;
    this.context = context;
  }
}

export async function recordWhatsAppClientEvent(input: WhatsAppClientEventInput): Promise<void> {
  const detail = (input.detail || "").trim() || "(no detail — this should not happen)";
  try {
    await prisma.whatsapp_client_event.create({
      data: {
        organization_id: input.organizationId,
        account_id: input.accountId ?? undefined,
        reason_code: input.reasonCode.slice(0, 64),
        detail: detail.slice(0, 50_000),
        wa_disconnect_reason: input.waDisconnectReason?.slice(0, 10_000) ?? undefined,
        instance_id: input.instanceId?.slice(0, 255) ?? undefined,
        always_on: input.alwaysOn ?? false,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
  } catch (err) {
    logger.logError(err, "Failed to persist whatsapp_client_event", {
      organizationId: input.organizationId,
      reasonCode: input.reasonCode,
    });
  }
  logger.warn("WhatsApp client event", {
    organizationId: input.organizationId,
    reasonCode: input.reasonCode,
    detail: detail.slice(0, 500),
    alwaysOn: input.alwaysOn,
  });
}

export async function listWhatsAppClientEventsForAdmin(opts: { limit: number; organizationId?: string }) {
  const take = Math.min(500, Math.max(1, opts.limit));
  const where = opts.organizationId ? { organization_id: opts.organizationId } : {};
  const rows = await prisma.whatsapp_client_event.findMany({
    where,
    orderBy: { created_at: "desc" },
    take,
    include: {
      organization: { select: { name: true, slug: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization?.name ?? null,
    organizationSlug: r.organization?.slug ?? null,
    accountId: r.account_id,
    reasonCode: r.reason_code,
    detail: r.detail,
    waDisconnectReason: r.wa_disconnect_reason,
    instanceId: r.instance_id,
    alwaysOn: r.always_on,
    metadata: r.metadata,
    createdAt: r.created_at.toISOString(),
  }));
}
