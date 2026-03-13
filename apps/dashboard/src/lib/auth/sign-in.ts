import { authClient } from "@/lib/auth/client"

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || ""
const DASHBOARD_CALLBACK = APP_BASE ? `${APP_BASE.replace(/\/$/, "")}/dashboard` : "/dashboard"

// Email & password sign-in
export async function signInWithEmail({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const { data, error } = await authClient.signIn.email(
    {
      email,
      password,
      callbackURL: DASHBOARD_CALLBACK, // redirect after sign-in
    },
    {
      onRequest: () => {
        console.log("Signing in user with email/password...")
      },
      onSuccess: (ctx) => {
        console.log("Sign-in successful, redirecting...")
        window.location.href = ctx.data?.callbackURL || DASHBOARD_CALLBACK
      },
      onError: (ctx) => {
        alert(`Sign-in failed: ${ctx.error.message}`)
      },
    },
  )
  return { data, error }
}

// Google OAuth sign-in (only for existing users)
export async function signInWithGoogle() {
  const { data, error } = await authClient.signIn.social(
    {
      provider: "google",
      callbackURL: DASHBOARD_CALLBACK,
    },
    {
      onRequest: () => {
        console.log("Redirecting to Google OAuth...")
      },
      onSuccess: (ctx) => {
        console.log("Google sign-in complete!")
        // Redirect to dashboard after successful authentication
        window.location.href = ctx.data?.callbackURL || DASHBOARD_CALLBACK
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
