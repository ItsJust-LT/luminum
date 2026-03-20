import { getSessionId } from "../analytics/session.js";

export interface SubmitFormOptions {
  websiteId: string;
  /** Base URL for the Go analytics service that hosts POST /form */
  analyticsBaseUrl?: string;
  /** Optional form name for identification in the dashboard */
  formName?: string;
  /** Key-value pairs of form field data */
  fields: Record<string, string>;
}

export interface SubmitFormResult {
  ok: boolean;
  submissionId?: string;
  error?: string;
}

/**
 * Submit form data to the Luminum analytics ingestion endpoint.
 * Automatically includes the session ID from the tracking cookie.
 *
 * Call this from your form's onSubmit handler.
 */
export async function submitForm({
  websiteId,
  analyticsBaseUrl = "https://analytics.luminum.app",
  formName,
  fields,
}: SubmitFormOptions): Promise<SubmitFormResult> {
  const base = analyticsBaseUrl.replace(/\/$/, "");
  const sessionId = getSessionId();

  const payload: Record<string, unknown> = {
    websiteId,
    sessionId: sessionId ?? undefined,
    formName: formName || "Form",
    ...fields,
  };

  try {
    const res = await fetch(`${base}/form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "Request failed");
      return { ok: false, error: text };
    }
    const data = await res.json();
    return { ok: true, submissionId: data.submissionId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
