import { prisma } from "./prisma.js";
import { normalizeMessageIdForStorage } from "./email-message-id.js";

/** Normalize subject for loose thread matching (Re:, Fwd:, etc.). */
export function normalizeThreadSubject(subject: string | null | undefined): string {
  if (!subject?.trim()) return "";
  let t = subject.trim();
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/^\s*(re|fw|fwd)(\s*\[[^\]]*\])?\s*:\s*/i, "").trim();
    if (next === t) break;
    t = next;
  }
  return t.toLowerCase();
}

export type ThreadEmailRow = {
  id: string;
  organization_id: string | null;
  from: string | null;
  to: string | null;
  subject: string | null;
  text: string | null;
  html: string | null;
  messageId: string | null;
  in_reply_to: string | null;
  references: string | null;
  direction: string;
  read: boolean;
  receivedAt: Date | null;
  sent_at: Date | null;
  createdAt: Date;
  scheduled_send_at: Date | null;
  starred: boolean;
  is_draft: boolean;
  outbound_provider: string | null;
  fallback_used: boolean;
  provider_message_id: string | null;
  sender_avatar_url: string | null;
};

/**
 * Collect all emails in the same organization linked by In-Reply-To / Message-ID chain,
 * plus same-thread matches by normalized subject among participants.
 */
export async function loadEmailThread(organizationId: string, seedId: string): Promise<ThreadEmailRow[]> {
  const seed = await prisma.email.findFirst({
    where: { id: seedId, organization_id: organizationId },
    select: {
      id: true,
      organization_id: true,
      from: true,
      to: true,
      subject: true,
      text: true,
      html: true,
      messageId: true,
      in_reply_to: true,
      references: true,
      direction: true,
      read: true,
      receivedAt: true,
      sent_at: true,
      createdAt: true,
      scheduled_send_at: true,
      starred: true,
      is_draft: true,
      outbound_provider: true,
      fallback_used: true,
      provider_message_id: true,
      sender_avatar_url: true,
    },
  });
  if (!seed?.organization_id) return [];

  const byId = new Map<string, ThreadEmailRow>();
  const messageIds = new Set<string>();
  const inReplyTos = new Set<string>();

  const add = (row: ThreadEmailRow) => {
    if (byId.has(row.id)) return;
    byId.set(row.id, row);
    if (row.messageId) {
      const n = normalizeMessageIdForStorage(row.messageId) ?? row.messageId.trim().toLowerCase();
      messageIds.add(n);
    }
    if (row.in_reply_to) {
      const n = normalizeMessageIdForStorage(row.in_reply_to) ?? row.in_reply_to.trim().toLowerCase();
      inReplyTos.add(n);
    }
  };

  add(seed as ThreadEmailRow);

  let grew = true;
  while (grew) {
    grew = false;
    const mids = [...messageIds];
    const irts = [...inReplyTos];

    const orClause: object[] = [];
    for (const mid of mids) {
      if (!mid) continue;
      orClause.push({ in_reply_to: { equals: mid, mode: "insensitive" } });
      orClause.push({ messageId: { equals: mid, mode: "insensitive" } });
    }
    for (const irt of irts) {
      if (!irt) continue;
      orClause.push({ messageId: { equals: irt, mode: "insensitive" } });
      orClause.push({ in_reply_to: { equals: irt, mode: "insensitive" } });
    }
    if (orClause.length === 0) break;

    const linked = await prisma.email.findMany({
      where: {
        organization_id: organizationId,
        is_draft: false,
        OR: orClause,
      },
      select: {
        id: true,
        organization_id: true,
        from: true,
        to: true,
        subject: true,
        text: true,
        html: true,
        messageId: true,
        in_reply_to: true,
        references: true,
        direction: true,
        read: true,
        receivedAt: true,
        sent_at: true,
        createdAt: true,
        scheduled_send_at: true,
        starred: true,
        is_draft: true,
        outbound_provider: true,
        fallback_used: true,
        provider_message_id: true,
        sender_avatar_url: true,
      },
    });

    for (const row of linked) {
      const r = row as ThreadEmailRow;
      if (!byId.has(r.id)) {
        add(r);
        grew = true;
      }
    }

    // Expand: references header may list parent IDs
    for (const row of byId.values()) {
      if (!row.references?.trim()) continue;
      const parts = row.references.split(/\s+/).map((p) => p.trim()).filter(Boolean);
      for (const p of parts) {
        const n = normalizeMessageIdForStorage(p) ?? p.toLowerCase();
        if (!messageIds.has(n)) {
          messageIds.add(n);
          grew = true;
        }
      }
    }
  }

  // Subject + participant overlap (catches some clients with broken Message-IDs)
  const subj = normalizeThreadSubject(seed.subject);
  if (subj.length > 0) {
    const participants = new Set<string>();
    const collectAddr = (raw: string | null) => {
      if (!raw) return;
      const m = raw.match(/<([^>]+)>/);
      const addr = (m ? m[1] : raw).trim().toLowerCase();
      if (addr.includes("@")) participants.add(addr);
    };
    collectAddr(seed.from);
    if (seed.to) {
      try {
        const p = JSON.parse(seed.to);
        const arr = Array.isArray(p) ? p : [p];
        for (const x of arr) collectAddr(String(x));
      } catch {
        collectAddr(seed.to);
      }
    }

    const since = new Date(seed.createdAt);
    since.setDate(since.getDate() - 180);

    const loose = await prisma.email.findMany({
      where: {
        organization_id: organizationId,
        is_draft: false,
        subject: { not: null },
        createdAt: { gte: since },
      },
      take: 400,
      select: {
        id: true,
        organization_id: true,
        from: true,
        to: true,
        subject: true,
        text: true,
        html: true,
        messageId: true,
        in_reply_to: true,
        references: true,
        direction: true,
        read: true,
        receivedAt: true,
        sent_at: true,
        createdAt: true,
        scheduled_send_at: true,
        starred: true,
        is_draft: true,
        outbound_provider: true,
        fallback_used: true,
        provider_message_id: true,
        sender_avatar_url: true,
      },
    });

    for (const row of loose) {
      if (byId.has(row.id)) continue;
      if (normalizeThreadSubject(row.subject) !== subj) continue;
      const rowParticipants = new Set<string>();
      collectAddr(row.from);
      if (row.to) {
        try {
          const p = JSON.parse(row.to);
          const arr = Array.isArray(p) ? p : [p];
          for (const x of arr) collectAddr(String(x));
        } catch {
          collectAddr(row.to);
        }
      }
      for (const p of participants) {
        if (rowParticipants.has(p)) {
          add(row as ThreadEmailRow);
          break;
        }
      }
    }
  }

  const list = [...byId.values()];
  list.sort((a, b) => {
    const ta = (a.sent_at || a.receivedAt || a.scheduled_send_at || a.createdAt).getTime();
    const tb = (b.sent_at || b.receivedAt || b.scheduled_send_at || b.createdAt).getTime();
    return ta - tb;
  });

  return list;
}
