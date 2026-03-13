import { authClient } from "@/lib/auth/client";

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || ""
const DASHBOARD_CALLBACK = APP_BASE ? `${APP_BASE.replace(/\/$/, "")}/dashboard` : "/dashboard"

export async function signUpUser({
  email,
  password,
  name,
  image,
}: {
  email: string;
  password: string;
  name: string;
  image?: string;
}) {
  const { data, error } = await authClient.signUp.email(
    {
      email,
      password,
      name,
      image,
      callbackURL: DASHBOARD_CALLBACK,
    },
    {
      onRequest: () => {
        console.log("Signing up user with email/password...");
      },
      onSuccess: async (ctx) => {
        console.log("Signup successful, redirecting...");
        window.location.href = ctx.data?.callbackURL || DASHBOARD_CALLBACK;
      },
      onError: (ctx) => {
        alert(`Signup failed: ${ctx.error.message}`);
      },
    }
  );

  return { data, error };
}

export async function signUpWithGoogle(callbackURL: string = DASHBOARD_CALLBACK) {
  const { data, error } = await authClient.signIn.social(
    {
      provider: "google",
      callbackURL,
    },
    {
      onRequest: () => {
        console.log("Redirecting to Google OAuth for sign-up...");
      },
      onSuccess: async (ctx) => {
        console.log("Google sign-up complete!");
        window.location.href = ctx.data?.callbackURL || callbackURL;
      },
      onError: (ctx) => {
        console.error("Google sign-up error:", ctx.error);
        alert(`Google sign-up failed: ${ctx.error.message}`);
      },
    }
  );
  return { data, error };
}
