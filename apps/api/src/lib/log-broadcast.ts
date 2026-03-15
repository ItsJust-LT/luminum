/**
 * Optional broadcaster for new log entries. Set from index after attachRealtimeWS
 * so admins receive log:new over WebSocket without polling.
 */
export interface SerializedLog {
  id: string;
  created_at: string;
  service: string;
  level: string;
  message: string;
  meta?: Record<string, unknown> | null;
  request_id?: string | null;
}

let broadcaster: ((log: SerializedLog) => void) | null = null;

export function setLogBroadcaster(fn: (log: SerializedLog) => void): void {
  broadcaster = fn;
}

export function getLogBroadcaster(): ((log: SerializedLog) => void) | null {
  return broadcaster;
}
