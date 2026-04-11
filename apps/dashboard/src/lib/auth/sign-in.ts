import { authClient } from "@/lib/auth/client"
import { safePostAuthRedirect } from "@/lib/safe-post-auth-redirect"

const DASHBOARD_CALLBACK = "/dashboard"

function resolvePostAuthRedirect(callbackURL?: string | null) {
  return safePostAuthRedirect(callbackURL ?? null) || DASHBOARD_CALLBACK
}

// Email & password sign-in
export async function signInWithEmail({
  email,
  password,
  callbackURL,
}: {
  email: string
  password: string
  callbackURL?: string | null
}) {
  const target = resolvePostAuthRedirect(callbackURL)
  const { data, error } = await authClient.signIn.email(
    {
      email,
      password,
      callbackURL: target,
    },
    {
      onRequest: () => {
        console.log("Signing in user with email/password...")
      },
      onSuccess: (ctx) => {
        console.log("Sign-in successful, redirecting...")
        window.location.href = ctx.data?.callbackURL || target
      },
      onError: (ctx) => {
        alert(`Sign-in failed: ${ctx.error.message}`)
      },
    },
  )
  return { data, error }
}

// Google OAuth sign-in (only for existing users)
export async function signInWithGoogle(callbackURL?: string | null) {
  const target = resolvePostAuthRedirect(callbackURL)
  const { data, error } = await authClient.signIn.social(
    {
      provider: "google",
      callbackURL: target,
    },
    {
      onRequest: () => {
        console.log("Redirecting to Google OAuth...")
      },
      onSuccess: (ctx) => {
        console.log("Google sign-in complete!")
        window.location.href = ctx.data?.callbackURL || target
      },
      onError: (ctx) => {
        console.error("Google sign-in error:", ctx.error)
        // Handle the specific error when user doesn't exist
        if (ctx.error.message.includes("No account found") || ctx.error.message.includes("not found")) {
          alert("No account found with this Google email. Please contact an administrator for an invitation to create an account.")
        } else {
          alert(`Google sign-in failed: ${ctx.error.message}`)
        }
      },
    },
  )
  return { data, error }
}
