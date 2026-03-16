import type WAWebJS from "whatsapp-web.js";
import { Prisma } from "@luminum/database";

/**
 * Map a whatsapp-web.js Message to a shape suitable for DB insertion.
 */
export function mapWaMessageToDb(
  msg: WAWebJS.Message,
  chatId: string,
) {
  return {
    wa_message_id: msg.id._serialized,
    from_me: msg.fromMe,
    from_number: msg.author ?? null,
    body: msg.body || null,
    type: mapMessageType(msg.type),
    timestamp: new Date(msg.timestamp * 1000),
    ack: msg.ack ?? 0,
    raw_metadata: {
      hasMedia: msg.hasMedia,
      isForwarded: msg.isForwarded,
      deviceType: msg.deviceType,
    } satisfies Prisma.InputJsonValue,
    chat_id: chatId,
  };
}

function mapMessageType(type: string): string {
  const typeMap: Record<string, string> = {
    chat: "text",
    image: "image",
    video: "video",
    audio: "audio",
    ptt: "audio",
    document: "document",
    sticker: "sticker",
    location: "location",
    vcard: "contact",
    multi_vcard: "contact",
    revoked: "revoked",
  };
  return typeMap[type] || "text";
}

/**
 * Map a whatsapp-web.js Chat to a shape suitable for DB upsertion.
 */
export function mapWaChatToDb(
  chat: WAWebJS.Chat,
  accountId: string,
): {
  contact_id: string;
  name: string | null;
  is_group: boolean;
  account_id: string;
} {
  return {
    contact_id: chat.id._serialized,
    name: chat.name || null,
    is_group: chat.isGroup,
    account_id: accountId,
  };
}

/**
 * Map ack level (int) to human-readable status.
 */
export function ackToStatus(ack: number): string {
  switch (ack) {
    case -1: return "error";
    case 0: return "pending";
    case 1: return "sent";
    case 2: return "delivered";
    case 3: return "read";
    case 4: return "played";
    default: return "unknown";
  }
}
