import { cookies } from "next/headers"

const API_URL = process.env.API_URL || "http://localhost:4000"

/**
 * Get the current session from the API server. Use in server actions that require authentication.
 */
export async function requireAuth() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const res = await fetch(`${API_URL}/api/me`, {
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
