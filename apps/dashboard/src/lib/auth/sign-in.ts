import { authClient } from "@/lib/auth/client"

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
      callbackURL: "/dashboard", // redirect after sign-in
    },
    {
      onRequest: () => {
        console.log("Signing in user with email/password...")
      },
      onSuccess: (ctx) => {
        console.log("Sign-in successful, redirecting...")
        window.location.href = ctx.data?.callbackURL || "/dashboard"
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
      callbackURL: "/dashboard",
    },
    {
      onRequest: () => {
        console.log("Redirecting to Google OAuth...")
      },
      onSuccess: (ctx) => {
        console.log("Google sign-in complete!")
        // Redirect to dashboard after successful authentication
        window.location.href = ctx.data?.callbackURL || "/dashboard"
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
