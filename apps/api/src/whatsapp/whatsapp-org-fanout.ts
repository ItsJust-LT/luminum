import { logger } from "../lib/logger.js";
import { getRedisClient, isRedisConfigured } from "../lib/redis.js";

const FANOUT_CHANNEL = "luminum:wa:org-fanout";

export type OrgWsMessage = { type: string; data?: unknown };

function fanoutInstanceId(): string {
  return (
    process.env.API_INSTANCE_ID?.trim() ||
    process.env.WHATSAPP_FANOUT_INSTANCE_ID?.trim() ||
    `pid-${process.pid}-${Math.random().toString(36).slice(2, 9)}`
  );
}

async function startFanoutSubscriber(
  instanceId: string,
  broadcastToOrg: (orgId: string, message: OrgWsMessage, excludeUserId?: string) => void
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    const sub = redis.duplicate();
    sub.on("error", (err) => logger.warn("WhatsApp fanout subscriber Redis error", { error: String(err) }));
    await sub.connect();
    await sub.subscribe(FANOUT_CHANNEL, (message: string) => {
      try {
        const payload = JSON.parse(message) as {
          source?: string;
          orgId?: string;
          type?: string;
          data?: unknown;
          excludeUserId?: string;
        };
        if (!payload.orgId || !payload.type) return;
        if (payload.source === instanceId) return;
        broadcastToOrg(payload.orgId, { type: payload.type, data: payload.data }, payload.excludeUserId);
      } catch {
        /* malformed */
      }
    });
    logger.info("WhatsApp org fanout subscriber connected", { instanceId, channel: FANOUT_CHANNEL });
  } catch (e) {
    logger.warn("WhatsApp org fanout subscriber failed to start", { error: String(e) });
  }
}

async function publishFanout(
  source: string,
  orgId: string,
  message: OrgWsMessage,
  excludeUserId?: string
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.publish(
      FANOUT_CHANNEL,
      JSON.stringify({
        source,
        orgId,
        type: message.type,
        data: message.data,
        ...(excludeUserId ? { excludeUserId } : {}),
      })
    );
  } catch (e) {
    logger.warn("WhatsApp org fanout publish failed", { error: String(e) });
  }
}

/**
 * Wraps org WebSocket broadcast so WhatsApp events reach every API instance (Redis pub/sub).
 * Without this, horizontal scaling drops realtime updates when WA runs on instance A and WS clients on B.
 */
export function createWhatsAppOrgFanout(
  broadcastToOrg: (orgId: string, message: OrgWsMessage, excludeUserId?: string) => void
): (orgId: string, message: OrgWsMessage, excludeUserId?: string) => void {
  const instanceId = fanoutInstanceId();

  if (isRedisConfigured()) {
    void startFanoutSubscriber(instanceId, broadcastToOrg);
  } else {
    logger.warn("WhatsApp org fanout disabled: REDIS_URL not set");
  }

  return (orgId: string, message: OrgWsMessage, excludeUserId?: string) => {
    broadcastToOrg(orgId, message, excludeUserId);
    void publishFanout(instanceId, orgId, message, excludeUserId);
  };
}
