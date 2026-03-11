"use server"

import { serverPost } from "@/lib/api-server"

export async function uploadFileToCloudinary(formData: FormData) {
  const file = formData.get("file") as File
  if (!file) return { success: false, error: "No file provided" }
  const bytes = await file.arrayBuffer()
  const fileBase64 = Buffer.from(bytes).toString("base64")
  return serverPost("/api/uploads/file-cloudinary", { fileBase64, contentType: file.type })
}
