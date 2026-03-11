"use server"

import { serverPost } from "@/lib/api-server"

export async function uploadLogoToR2(formData: FormData, organizationName?: string, organizationId?: string) {
  const file = formData.get("logo") as File
  if (!file) return { success: false, error: "No file provided" }
  const bytes = await file.arrayBuffer()
  const logoBase64 = Buffer.from(bytes).toString("base64")
  return serverPost("/api/uploads/logo-r2", {
    logoBase64, fileName: file.name, contentType: file.type, organizationName, organizationId,
  })
}
