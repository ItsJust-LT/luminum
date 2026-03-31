import { DateTime } from "luxon";

export const SCHEDULE_FREQUENCIES = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export function isScheduleFrequency(s: string): s is ScheduleFrequency {
  return (SCHEDULE_FREQUENCIES as readonly string[]).includes(s);
}

export function parseTimeLocal(s: string): { hour: number; minute: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  if (!m) return null;
  return { hour: parseInt(m[1]!, 10), minute: parseInt(m[2]!, 10) };
}

export function bumpIssueStart(issueStartOfDayZoned: DateTime, frequency: string): DateTime {
  switch (frequency) {
    case "daily":
      return issueStartOfDayZoned.plus({ days: 1 });
    case "weekly":
      return issueStartOfDayZoned.plus({ weeks: 1 });
    case "biweekly":
      return issueStartOfDayZoned.plus({ weeks: 2 });
    case "monthly":
      return issueStartOfDayZoned.plus({ months: 1 });
    case "quarterly":
      return issueStartOfDayZoned.plus({ months: 3 });
    case "yearly":
      return issueStartOfDayZoned.plus({ years: 1 });
    default:
      return issueStartOfDayZoned.plus({ months: 1 });
  }
}

/** Next wall-clock run in UTC after this issue date, for recurring schedules. */
export function computeNextRunUtcAfterIssue(
  issueStartOfDayZoned: DateTime,
  frequency: string,
  hour: number,
  minute: number
): Date {
  const nextIssue = bumpIssueStart(issueStartOfDayZoned, frequency);
  return nextIssue.set({ hour, minute, second: 0, millisecond: 0 }).toUTC().toJSDate();
}

/** First run: next occurrence of `timeLocal` in `timezone` strictly after now. */
export function computeInitialNextRunUtc(timeLocal: string, timezone: string, from?: Date): Date {
  const tm = parseTimeLocal(timeLocal);
  if (!tm) throw new Error("Invalid time (use HH:mm, 24h)");
  const zone = timezone?.trim() || "UTC";
  let dt = DateTime.fromJSDate(from ?? new Date(), { zone }).set({
    hour: tm.hour,
    minute: tm.minute,
    second: 0,
    millisecond: 0,
  });
  const nowZ = DateTime.now().setZone(zone);
  while (dt <= nowZ) {
    dt = dt.plus({ days: 1 });
  }
  return dt.toUTC().toJSDate();
}
