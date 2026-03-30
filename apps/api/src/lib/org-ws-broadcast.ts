export type OrgWsPayload = { type: string; data?: unknown };

let broadcastToOrgImpl: ((orgId: string, message: OrgWsPayload, excludeUserId?: string) => void) | null = null;

/** Called once at startup with the Redis-fanout-wrapped broadcaster. */
export function setOrgBroadcast(fn: (orgId: string, message: OrgWsPayload, excludeUserId?: string) => void): void {
  broadcastToOrgImpl = fn;
}

export function broadcastOrgEmailCreated(organizationId: string, emailId: string): void {
  broadcastToOrgImpl?.(organizationId, {
    type: "email:created",
    data: { emailId, organizationId, direction: "inbound" },
  });
}

export function broadcastOrgEmailOutboundSent(organizationId: string, emailId: string): void {
  broadcastToOrgImpl?.(organizationId, {
    type: "email:created",
    data: { emailId, organizationId, direction: "outbound" },
  });
}

export function broadcastOrgEmailUpdated(
  organizationId: string,
  emailId: string,
  patch?: { read?: boolean; starred?: boolean }
): void {
  broadcastToOrgImpl?.(organizationId, {
    type: "email:updated",
    data: { emailId, organizationId, ...patch },
  });
}

export function broadcastOrgEmailDeleted(organizationId: string, emailId: string): void {
  broadcastToOrgImpl?.(organizationId, {
    type: "email:deleted",
    data: { emailId, organizationId },
  });
}
