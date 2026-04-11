import { render } from "@react-email/render";
import { Resend } from "resend";

import FormSubmissionNotificationEmail from "../emails/form-submission-notification.js";
import { prisma } from "./prisma.js";

const FORMS_FROM_DEFAULT = "Luminum Forms <forms@luminum.agency>";

function appBaseUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function humanizeFieldKey(key: string): string {
  const s = key.replace(/[_-]+/g, " ").trim();
  if (!s) return key;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSubmissionValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw.trim() || "—";
  if (Array.isArray(raw)) {
    const parts = raw.map((v) => formatSubmissionValue(v)).filter((x) => x !== "—");
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof raw === "object") {
    try {
      const json = JSON.stringify(raw, null, 2);
      return json.length > 4000 ? `${json.slice(0, 4000)}…` : json;
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

function submissionDataToRows(
  data: Record<string, unknown>,
  maxFields = 45,
): { label: string; value: string }[] {
  const entries = Object.entries(data || {}).filter(([k]) => k && !k.startsWith("_"));
  const rows: { label: string; value: string }[] = [];
  const slice = entries.slice(0, maxFields);
  for (const [key, raw] of slice) {
    rows.push({
      label: humanizeFieldKey(key),
      value: formatSubmissionValue(raw),
    });
  }
  if (entries.length > maxFields) {
    rows.push({
      label: "More fields",
      value: `${entries.length - maxFields} additional field(s) — open the dashboard to see the full submission.`,
    });
  }
  return rows;
}

function disabledTypesList(raw: unknown): string[] {
  return Array.isArray(raw) ? (raw as string[]) : [];
}

export interface SendFormSubmissionNotificationEmailsInput {
  organizationId: string;
  organizationName: string;
  websiteName?: string | null;
  formName: string;
  formSubmissionId: string;
  submissionData: Record<string, unknown>;
  /** Dashboard path, e.g. `/{slug}/forms/{id}` */
  dashboardPath: string;
  submittedAtIso?: string;
}

/**
 * Sends one transactional email per organization member (user.email) who has
 * email notifications enabled and has not disabled `form_submission`.
 * Uses platform Resend (RESEND_API_KEY) and From: forms@luminum.agency by default.
 */
export async function sendFormSubmissionNotificationEmails(
  input: SendFormSubmissionNotificationEmailsInput,
): Promise<{ sent: number; skipped: number }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[sendFormSubmissionNotificationEmails] RESEND_API_KEY missing; skipping email",
    );
    return { sent: 0, skipped: 0 };
  }

  const from =
    process.env.FORMS_NOTIFICATION_FROM?.trim() || FORMS_FROM_DEFAULT;

  const members = await prisma.member.findMany({
    where: { organizationId: input.organizationId },
    include: {
      user: { select: { id: true, email: true, name: true, banned: true } },
    },
  });

  const userIds = [...new Set(members.map((m) => m.userId))];
  const prefsRows = await prisma.notification_preferences.findMany({
    where: { user_id: { in: userIds } },
  });
  const prefsByUser = new Map(prefsRows.map((p) => [p.user_id, p]));

  const base = appBaseUrl();
  const path = input.dashboardPath.startsWith("/")
    ? input.dashboardPath
    : `/${input.dashboardPath}`;
  const submissionUrl = `${base}${path}`;

  const submittedAt = input.submittedAtIso
    ? new Date(input.submittedAtIso)
    : new Date();
  const submittedAtLabel = `${submittedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;

  const submissionRows = submissionDataToRows(input.submissionData);

  const resend = new Resend(apiKey);
  let sent = 0;
  let skipped = 0;
  const seenEmails = new Set<string>();

  for (const m of members) {
    const u = m.user;
    if (!u?.email || u.banned) {
      skipped++;
      continue;
    }
    const email = u.email.trim().toLowerCase();
    if (seenEmails.has(email)) {
      skipped++;
      continue;
    }
    seenEmails.add(email);

    const prefs = prefsByUser.get(u.id);
    if (prefs?.email_enabled === false) {
      skipped++;
      continue;
    }
    if (disabledTypesList(prefs?.disabled_types).includes("form_submission")) {
      skipped++;
      continue;
    }

    const html = await render(
      <FormSubmissionNotificationEmail
        recipientName={u.name}
        organizationName={input.organizationName}
        websiteName={input.websiteName}
        formName={input.formName}
        formSubmissionId={input.formSubmissionId}
        submissionRows={submissionRows}
        submissionUrl={submissionUrl}
        submittedAtLabel={submittedAtLabel}
      />,
    );

    const subject = `${input.formName} · ${input.organizationName}`;

    const { error } = await resend.emails.send({
      from,
      to: [u.email],
      subject,
      html,
    });

    if (error) {
      console.error(
        "[sendFormSubmissionNotificationEmails] Resend error:",
        error,
        { to: u.email },
      );
      skipped++;
      continue;
    }
    sent++;
  }

  return { sent, skipped };
}
