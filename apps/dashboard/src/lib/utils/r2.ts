import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// R2 configuration (Cloudflare R2 is S3-compatible)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL

// Create S3 client for R2
const getR2Client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials not configured")
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

/**
 * Get a presigned URL for accessing an R2 object
 */
export async function getR2PresignedUrl(
  key: string,
  bucket: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const client = getR2Client()
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const url = await getSignedUrl(client, command, { expiresIn })
    return url
  } catch (error) {
    console.error("Error generating R2 presigned URL:", error)
    throw new Error("Failed to generate presigned URL")
  }
}

/**
 * Delete an object from R2
 */
export async function deleteFromR2(key: string, bucket: string): Promise<boolean> {
  try {
    const client = getR2Client()
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await client.send(command)
    return true
  } catch (error) {
    console.error("Error deleting from R2:", error)
    return false
  }
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  bucket: string,
  contentType?: string
): Promise<string> {
  try {
    const client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    await client.send(command)

    // Return public URL if configured, otherwise return presigned URL
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${bucket}/${key}`
    }

    // Fallback to presigned URL
    return await getR2PresignedUrl(key, bucket, 31536000) // 1 year
  } catch (error) {
    console.error("Error uploading to R2:", error)
    throw new Error("Failed to upload file to R2")
  }
}

