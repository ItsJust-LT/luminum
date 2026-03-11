"use server"

import { serverPost } from "@/lib/api-server"

export async function uploadLogoToCloudinary(formData: FormData, organizationName?: string, organizationId?: string) {
  const file = formData.get("logo") as File
  if (!file) return { success: false, error: "No file provided" }
  const bytes = await file.arrayBuffer()
  const logoBase64 = Buffer.from(bytes).toString("base64")
  return serverPost("/api/uploads/logo-cloudinary", { logoBase64, organizationName, organizationId })
}
