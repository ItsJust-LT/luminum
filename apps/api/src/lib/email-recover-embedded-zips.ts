import crypto from "crypto";
import { prisma } from "./prisma.js";
import { upload, isStorageConfigured } from "./storage/s3.js";
import { emailAttachmentKey, orgAttachmentsEmailsKey } from "./storage/keys.js";
import { updateOrganizationStorage } from "./utils/storage.js";
import { config } from "../config.js";
import { extractZipsFromBodies } from "./email-binary-body.js";

export interface RecoverOneResult {
  emailId: string;
  recovered: number;
  skipped?: string;
}

/**
 * Move ZIP blobs wrongly stored in text/html into attachments and replace body with a short notice.
 */
export async function recoverEmbeddedZipsForEmail(emailId: string): Promise<RecoverOneResult> {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { attachments: true },
  });
  if (!email) return { emailId, recovered: 0, skipped: "not_found" };
  if (email.direction !== "inbound") return { emailId, recovered: 0, skipped: "not_inbound" };

  const { text, html, extracted } = extractZipsFromBodies(email.text, email.html);
  if (extracted.length === 0) return { emailId, recovered: 0, skipped: "no_zip_in_body" };

  if (!isStorageConfigured()) {
    return { emailId, recovered: 0, skipped: "storage_not_configured" };
  }

  const base = config.apiUrl.replace(/\/$/, "");
  const orgId = email.organization_id;
  let startIdx = email.attachments.length;
  const rows: { emailId: string; filename: string; contentType: string; size: number | null; r2Key: string; url: string }[] = [];

  for (let i = 0; i < extracted.length; i++) {
    const z = extracted[i]!;
    const idx = startIdx + i;
    const filename = z.filename.replace(/[/\\]/g, "_");
    const storageKey = orgId
      ? orgAttachmentsEmailsKey(orgId, emailId, String(idx), filename)
      : emailAttachmentKey(emailId, String(idx), filename);
    try {
      const result = await upload(z.buffer, storageKey, { contentType: z.contentType });
      if (orgId) {
        try {
          await updateOrganizationStorage(orgId, result.bytes);
        } catch {
          /* ignore */
        }
      }
      rows.push({
        emailId,
        filename,
        contentType: z.contentType,
        size: z.buffer.length,
        r2Key: result.key,
        url: `${base}/api/files/${encodeURIComponent(result.key)}`,
      });
    } catch {
      return { emailId, recovered: 0, skipped: "upload_failed" };
    }
  }

  const newCanonical = [
    orgId ?? "",
    email.from ?? "",
    email.to ?? "",
    email.subject ?? "",
    text ?? "",
    html ?? "",
  ].join("\n");
  const contentHash = crypto.createHash("md5").update(newCanonical).digest("hex");
  const hashConflict = await prisma.email.findFirst({
    where: { contentHash, NOT: { id: emailId } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.attachment.createMany({ data: rows }),
    prisma.email.update({
      where: { id: emailId },
      data: {
        text,
        html,
        contentHash: hashConflict ? null : contentHash,
      },
    }),
  ]);

  return { emailId, recovered: extracted.length };
}

export async function recoverEmbeddedZipsBatch(options: { limit?: number; skip?: number } = {}): Promise<{
  scanned: number;
  fixed: number;
  results: RecoverOneResult[];
  nextSkip: number;
}> {
  const take = Math.min(Math.max(options.limit ?? 500, 1), 5000);
  const skip = Math.max(options.skip ?? 0, 0);
  const candidates = await prisma.email.findMany({
    where: {
      direction: "inbound",
      OR: [{ text: { not: null } }, { html: { not: null } }],
    },
    select: { id: true, text: true, html: true },
    take,
    skip,
    orderBy: { id: "asc" },
  });

  const results: RecoverOneResult[] = [];
  let fixed = 0;
  for (const c of candidates) {
    const { extracted } = extractZipsFromBodies(c.text, c.html);
    if (extracted.length === 0) continue;
    const r = await recoverEmbeddedZipsForEmail(c.id);
    results.push(r);
    if (r.recovered > 0) fixed += 1;
  }

  return { scanned: candidates.length, fixed, results, nextSkip: skip + candidates.length };
}
