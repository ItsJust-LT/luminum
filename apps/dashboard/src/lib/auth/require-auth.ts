import { cookies } from "next/headers"
import { getInternalApiBaseUrl } from "@/lib/internal-api-url"

/**
 * Get the current session from the API server. Use in server actions that require authentication.
 */
export async function requireAuth() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const res = await fetch(`${getInternalApiBaseUrl()}/api/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Unauthorized")
  }

  const session = await res.json()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session
}
