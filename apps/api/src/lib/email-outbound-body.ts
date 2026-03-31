import sanitizeHtml from "sanitize-html";
import { prisma } from "./prisma.js";

export function outboundHtmlFromPlainText(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const body = esc.replace(/\r\n/g, "\n").split("\n").join("<br />\n");
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#111827;">${body}</div>`;
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripHtmlToPlain(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
}

const signatureSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "h3", "img", "font"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "style", "class"],
    font: ["color", "face", "size"],
    table: ["class", "style"],
    thead: ["class", "style"],
    tbody: ["class", "style"],
    tr: ["class", "style"],
    td: ["class", "style", "colspan", "rowspan"],
    th: ["class", "style", "colspan", "rowspan"],
    "*": ["style", "class"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

export function sanitizeSignatureHtml(raw: string): string {
  return sanitizeHtml(raw, signatureSanitizeOptions);
}

const composeSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "h1",
    "h2",
    "h3",
    "h4",
    "img",
    "font",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "style", "class"],
    font: ["color", "face", "size"],
    table: ["class", "style", "border", "cellpadding", "cellspacing"],
    thead: ["class", "style"],
    tbody: ["class", "style"],
    tr: ["class", "style"],
    td: ["class", "style", "colspan", "rowspan"],
    th: ["class", "style", "colspan", "rowspan"],
    "*": ["style", "class"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

export function sanitizeComposeHtml(raw: string): string {
  return sanitizeHtml(raw, composeSanitizeOptions);
}

/**
 * Append signature to user body (personal member signature when set, else organization default).
 * User HTML is sanitized. Stored/sent rows should use the merged result; drafts keep raw user content without signature.
 */
export async function mergeOutboundWithSignature(
  organizationId: string,
  body: { text: string; html?: string | null },
  options?: { actorUserId?: string | null }
): Promise<{ text: string; html: string | undefined }> {
  const mainText =
    (body.text?.trim() ? body.text : body.html?.trim() ? stripHtmlToPlain(body.html) : "") || "";

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      email_signature_enabled: true,
      email_signature_html: true,
      email_signature_text: true,
    },
  });

  const userHtmlRaw = body.html?.trim() || "";
  const innerHtml = userHtmlRaw ? sanitizeComposeHtml(userHtmlRaw) : outboundHtmlFromPlainText(mainText);

  if (!org?.email_signature_enabled) {
    return {
      text: mainText,
      html: userHtmlRaw ? innerHtml : mainText ? outboundHtmlFromPlainText(mainText) : undefined,
    };
  }

  let sigHtmlStored = "";
  let sigTextStored = "";
  if (options?.actorUserId) {
    const member = await prisma.member.findFirst({
      where: { organizationId, userId: options.actorUserId },
      select: { personalEmailSignatureHtml: true, personalEmailSignatureText: true },
    });
    const pHtml = member?.personalEmailSignatureHtml?.trim() ?? "";
    const pText = member?.personalEmailSignatureText?.trim() ?? "";
    if (pHtml || pText) {
      sigHtmlStored = pHtml;
      sigTextStored = pText;
    }
  }
  if (!sigHtmlStored && !sigTextStored) {
    sigHtmlStored = org.email_signature_html?.trim() || "";
    sigTextStored = org.email_signature_text?.trim() || "";
  }
  if (!sigHtmlStored && !sigTextStored) {
    return {
      text: mainText,
      html: userHtmlRaw ? innerHtml : mainText ? outboundHtmlFromPlainText(mainText) : undefined,
    };
  }

  const sigHtmlSafe = sigHtmlStored ? sanitizeSignatureHtml(sigHtmlStored) : "";
  const sigText =
    sigTextStored || (sigHtmlSafe ? stripHtmlToPlain(sigHtmlSafe) : "");

  const sepText = "\n\n--\n";
  const finalText = mainText + (sigText ? sepText + sigText : "");

  const sigBlock = sigHtmlSafe
    ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:14px;color:#374151;">${sigHtmlSafe}</div>`
    : sigText
      ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;"><p>${escapeHtmlText(sigText).split("\n").join("<br/>")}</p></div>`
      : "";

  const finalHtml = innerHtml + sigBlock;
  return { text: finalText, html: finalHtml };
}
