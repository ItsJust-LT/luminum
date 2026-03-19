import type WAWebJS from "whatsapp-web.js";

/**
 * Map a whatsapp-web.js Message to a Redis-storable shape.
 */
export function mapWaMessageToRedis(
  msg: WAWebJS.Message,
  contactId: string,
): {
  wa_message_id: string;
  from_me: boolean;
  from_number: string | null;
  body: string | null;
  type: string;
  timestamp: string;
  ack: number;
  media_url: string | null;
  mime_type: string | null;
  media_size: number | null;
  quoted_wa_message_id: string | null;
  quoted_body: string | null;
  quoted_from: string | null;
  is_starred: boolean;
  chat_id: string;
} {
  const fromNumber = (msg.author ?? (msg as any).from ?? null) as string | null;
  const quotedMsg = (msg as any).hasQuotedMsg ? (msg as any)._data?.quotedMsg : null;
  return {
    wa_message_id: msg.id._serialized,
    from_me: msg.fromMe,
    from_number: fromNumber,
    body: msg.body || null,
    type: mapMessageType(msg.type),
    timestamp: new Date(msg.timestamp * 1000).toISOString(),
    ack: msg.ack ?? 0,
    media_url: null,
    mime_type: null,
    media_size: null,
    quoted_wa_message_id: quotedMsg?.id?._serialized ?? null,
    quoted_body: quotedMsg?.body ? String(quotedMsg.body).slice(0, 500) : null,
    quoted_from: quotedMsg?.author ?? quotedMsg?.from ?? null,
    is_starred: !!(msg as any).isStarred,
    chat_id: contactId,
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
 * Map a whatsapp-web.js Chat to Redis-storable fields.
 */
export function mapWaChatToRedis(
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
