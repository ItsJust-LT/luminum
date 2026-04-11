"use client"

import { SignInForm } from "@/components/auth/sign-in-form"
import { useSession } from "@/lib/auth/client"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import LoadingAnimation from "@/components/LoadingAnimation"
import { safePostAuthRedirect } from "@/lib/safe-post-auth-redirect"

export interface SignInOrgBranding {
  name: string
  logo: string | null
}

export function SignInView({ orgBranding }: { orgBranding: SignInOrgBranding | null }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const afterAuth = safePostAuthRedirect(searchParams.get("callbackUrl"))

  useEffect(() => {
    if (!isPending && session?.user) {
      router.push(afterAuth || "/dashboard")
    }
  }, [session, isPending, router, afterAuth])

  if (isPending) {
    return <LoadingAnimation />
  }

  if (session?.user) {
    return <LoadingAnimation />
  }

  const isCustomDomain = !!orgBranding

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />

      <div className="w-full max-w-md relative z-10">
        <SignInForm orgBranding={orgBranding} />
        {!isCustomDomain && (
          <div className="text-center text-sm text-muted-foreground mt-8 max-w-sm mx-auto leading-relaxed">
            By signing in, you agree to our{" "}
            <a
              href="https://luminum.agency/terms-of-service"
              className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://luminum.agency/privacy-policy"
              className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
            >
              Privacy Policy
            </a>
            .
          </div>
        )}
      </div>
    </div>
  )
}
