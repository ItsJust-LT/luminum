import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { organizationClient } from "better-auth/client/plugins"
import { jwtClient } from "better-auth/client/plugins"
import { appInviteClient } from "@better-auth-kit/app-invite/client"

const client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  plugins: [
    adminClient(),
    organizationClient(),
    appInviteClient() as any,
    jwtClient()
  ],
})
// Cast so plugin APIs (organization, acceptInvitation, admin, etc.) are accepted by TypeScript
export const authClient = client as typeof client & {
  organization: { list: () => Promise<unknown>; getFullOrganization: (opts?: unknown) => Promise<unknown>; create: (opts: unknown) => Promise<unknown>; delete: (opts: unknown) => Promise<unknown>; acceptInvitation: (opts: unknown) => Promise<unknown>; cancelInvitation: (opts: unknown) => Promise<unknown> }
  acceptInvitation: (opts: unknown) => Promise<unknown>
  getAppInvitation: (opts: unknown) => Promise<unknown>
  listInvitations: (opts?: unknown) => Promise<unknown>
  cancelInvitation: (opts: unknown) => Promise<unknown>
  inviteUser: (opts: unknown) => Promise<unknown>
  admin: { listUsers: (opts: unknown) => Promise<unknown>; setRole: (opts: unknown) => Promise<unknown>; banUser: (opts: unknown) => Promise<unknown>; unbanUser: (opts: unknown) => Promise<unknown>; removeUser: (opts: unknown) => Promise<unknown> }
}

// Optional: export specific hooks or methods for convenience
export const { signIn, signUp, useSession } = authClient
