/**
 * S3-compatible object storage (MinIO or Cloudflare R2).
 * Single bucket; keys use namespaces: logos/, support/, emails/, files/.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET ?? "luminum-storage";
const S3_REGION = process.env.S3_REGION ?? "us-east-1";

/** R2 compatibility: if S3_ENDPOINT is not set but R2_* are, use R2 endpoint */
function getEndpoint(): string | undefined {
  if (S3_ENDPOINT) return S3_ENDPOINT;
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  if (r2AccountId)
    return `https://${r2AccountId}.r2.cloudflarestorage.com`;
  return undefined;
}

function getCredentials(): { accessKeyId: string; secretAccessKey: string } | undefined {
  if (S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)
    return { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY };
  const r2Key = process.env.R2_ACCESS_KEY_ID;
  const r2Secret = process.env.R2_SECRET_ACCESS_KEY;
  if (r2Key && r2Secret)
    return { accessKeyId: r2Key, secretAccessKey: r2Secret };
  return undefined;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    const endpoint = getEndpoint();
    const credentials = getCredentials();
    if (!endpoint || !credentials)
      throw new Error("Storage not configured: set S3_ENDPOINT and S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY (or R2_* for R2)");
    const isR2 = endpoint.includes("r2.cloudflarestorage.com");
    client = new S3Client({
      region: S3_REGION,
      endpoint,
      credentials,
      forcePathStyle: !isR2, // MinIO requires path-style
    });
  }
  return client;
}

export function isStorageConfigured(): boolean {
  return !!(getEndpoint() && getCredentials());
}

/** Ensure bucket exists (call on first use). */
export async function ensureBucket(): Promise<void> {
  const c = getClient();
  try {
    await c.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NotFound" || code === "NoSuchBucket") {
      await c.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } else {
      throw err;
    }
  }
}

export interface UploadResult {
  key: string;
  url: string;
  bytes: number;
}

/**
 * Upload a buffer to the given key (e.g. "logos/org-123.png").
 * Returns the storage key and the public/proxy URL to use in the app.
 */
export async function upload(
  buffer: Buffer | Uint8Array,
  key: string,
  options: { contentType?: string } = {}
): Promise<UploadResult> {
  const c = getClient();
  await ensureBucket();
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  await c.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: options.contentType ?? "application/octet-stream",
    })
  );
  const apiUrl = process.env.API_URL ?? process.env.API_WS_URL ?? "http://localhost:4000";
  const base = apiUrl.replace(/\/$/, "");
  const url = `${base}/api/files/${encodeURIComponent(key)}`;
  return { key, url, bytes: body.length };
}

/**
 * Delete an object by key.
 */
export async function remove(key: string): Promise<boolean> {
  try {
    const c = getClient();
    await c.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch (err) {
    console.error("Storage delete error:", err);
    return false;
  }
}

/**
 * Get a presigned GET URL (for backward compatibility or external use).
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const c = getClient();
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(c, cmd, { expiresIn: expiresInSeconds });
}

/**
 * Stream the object body from S3 (for proxy route).
 * Returns { stream, contentType, contentLength, etag } or null if not found.
 */
export async function getObject(key: string): Promise<{
  stream: Readable;
  contentType: string;
  contentLength: number;
  etag?: string;
} | null> {
  try {
    const c = getClient();
    const out = await c.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
    if (!out.Body) return null;
    return {
      stream: out.Body as Readable,
      contentType: out.ContentType ?? "application/octet-stream",
      contentLength: out.ContentLength ?? 0,
      etag: out.ETag ? out.ETag.replace(/"/g, "") : undefined,
    };
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NoSuchKey") return null;
    throw err;
  }
}

/**
 * Head object (for conditional GET / cache validation).
 */
export async function headObject(key: string): Promise<{
  contentType: string;
  contentLength: number;
  etag?: string;
} | null> {
  try {
    const c = getClient();
    const out = await c.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
    return {
      contentType: out.ContentType ?? "application/octet-stream",
      contentLength: out.ContentLength ?? 0,
      etag: out.ETag ? out.ETag.replace(/"/g, "") : undefined,
    };
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NotFound" || code === "NoSuchKey") return null;
    throw err;
  }
}

export { S3_BUCKET };
