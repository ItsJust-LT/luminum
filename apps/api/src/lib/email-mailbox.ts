import type { Prisma } from "@luminum/database";

export type Mailbox = "inbox" | "sent" | "starred" | "drafts" | "scheduled";

export function parseMailbox(raw: string | undefined): Mailbox {
  const m = (raw || "inbox").toLowerCase().trim();
  if (m === "sent" || m === "starred" || m === "drafts" || m === "scheduled") return m;
  return "inbox";
}

export function mailboxWhere(organizationId: string, mailbox: Mailbox): Prisma.emailWhereInput {
  const base: Prisma.emailWhereInput = { organization_id: organizationId };
  switch (mailbox) {
    case "inbox":
      return { ...base, direction: "inbound", is_draft: false };
    case "sent":
      return { ...base, direction: "outbound", is_draft: false, sent_at: { not: null } };
    case "drafts":
      return { ...base, is_draft: true };
    case "scheduled":
      return {
        ...base,
        direction: "outbound",
        is_draft: false,
        sent_at: null,
        scheduled_send_at: { not: null },
      };
    case "starred":
      return { ...base, starred: true, is_draft: false };
    default:
      return { ...base, direction: "inbound", is_draft: false };
  }
}

export function mailboxOrderBy(mailbox: Mailbox): Prisma.emailOrderByWithRelationInput[] {
  switch (mailbox) {
    case "sent":
      return [{ sent_at: "desc" }];
    case "drafts":
      return [{ updatedAt: "desc" }];
    case "scheduled":
      return [{ scheduled_send_at: "asc" }];
    case "starred":
      return [{ updatedAt: "desc" }];
    default:
      return [{ receivedAt: "desc" }, { createdAt: "desc" }];
  }
}
