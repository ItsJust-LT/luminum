"use server"

import { serverGet } from "@/lib/api-server"

export interface AvatarResult {
  imageUrl: string | null
  bimi: string | null
  gravatar: string | null
}

export async function getAvatarForEmail(email: string): Promise<AvatarResult> {
  return serverGet("/api/avatar", { email })
}
