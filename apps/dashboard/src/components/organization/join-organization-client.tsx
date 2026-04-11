"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Building2, Loader2, Mail, User, Lock, AlertCircle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"
import { signUpWithGoogle } from "@/lib/auth/sign-up"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type OrgMeta = {
  organizationName: string
  organizationSlug: string
  expiresAt: string
}

export function JoinOrganizationClient({ token }: { token: string }) {
  const { data: session, isPending: sessionLoading } = authClient.useSession()
  const [meta, setMeta] = useState<OrgMeta | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [joinBusy, setJoinBusy] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const sessionJoinAttempted = useRef(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [signUpBusy, setSignUpBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const joinPath = `/join/${token}`
  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(joinPath)}`
  const joinCallbackUrl = `/join/callback?token=${encodeURIComponent(token)}`

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = (await api.organizationActions.getPublicJoinLink(token)) as {
          success?: boolean
          organizationName?: string
          organizationSlug?: string
          expiresAt?: string
        }
        if (cancelled) return
        if (res?.success && res.organizationName && res.organizationSlug && res.expiresAt) {
          setMeta({
            organizationName: res.organizationName,
            organizationSlug: res.organizationSlug,
            expiresAt: res.expiresAt,
          })
        } else {
          setLoadError("This link is not valid anymore.")
        }
      } catch {
        if (!cancelled) setLoadError("This link is not valid or has expired.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const redirectAfterJoin = useCallback((slug: string) => {
    window.location.href = `/${slug}/dashboard`
  }, [])

  useEffect(() => {
    if (!meta || sessionLoading || !session?.user || sessionJoinAttempted.current) return
    sessionJoinAttempted.current = true
    void (async () => {
      setJoinBusy(true)
      setJoinError(null)
      try {
        const res = await api.organizationActions.acceptJoinLink({ token })
        if (res.success && res.organizationSlug) {
          toast.success(res.alreadyMember ? "You are already a member of this organization." : "You have joined the organization.")
          redirectAfterJoin(res.organizationSlug)
          return
        }
        const msg = typeof res.error === "string" ? res.error : "Could not join with this link."
        setJoinError(msg)
        toast.error(msg)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not join."
        setJoinError(msg)
        toast.error(msg)
      } finally {
        setJoinBusy(false)
      }
    })()
  }, [meta, session, sessionLoading, token, redirectAfterJoin])

  const validateSignup = () => {
    const err: Record<string, string> = {}
    if (!name.trim()) err.name = "Name is required"
    if (!email.trim()) err.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(email)) err.email = "Enter a valid email"
    if (password.length < 6) err.password = "Password must be at least 6 characters"
    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (!validateSignup()) return

    setSignUpBusy(true)
    try {
      const check = (await api.organizationActions.checkUserExists(email.trim().toLowerCase())) as {
        exists?: boolean
      }
      if (check?.exists) {
        setFieldErrors({
          email: "This email already has an account. Sign in to continue.",
        })
        return
      }

      await authClient.signUp.email(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          callbackURL: joinCallbackUrl,
        },
        {
          onSuccess: (ctx) => {
            window.location.href = (ctx.data?.callbackURL as string) || joinCallbackUrl
          },
          onError: (ctx) => {
            const m = ctx.error.message || "Sign up failed"
            if (/exists|already|taken|duplicate/i.test(m)) {
              setFieldErrors({ email: "This email already has an account. Sign in to continue." })
            } else {
              toast.error(m)
            }
          },
        },
      )
    } finally {
      setSignUpBusy(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signUpWithGoogle(joinCallbackUrl)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed")
    }
  }

  const expiresLabel = meta
    ? new Date(meta.expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : ""

  if (loadError) {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-6">
        <Card className="border-border/60 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">Link unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="bg-muted/20 flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading invite…</p>
      </div>
    )
  }

  const retrySessionJoin = async () => {
    setJoinBusy(true)
    setJoinError(null)
    try {
      const res = await api.organizationActions.acceptJoinLink({ token })
      if (res.success && res.organizationSlug) {
        toast.success(res.alreadyMember ? "You are already a member." : "You have joined the organization.")
        redirectAfterJoin(res.organizationSlug)
        return
      }
      setJoinError(typeof res.error === "string" ? res.error : "Could not join.")
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : "Could not join.")
    } finally {
      setJoinBusy(false)
    }
  }

  if (sessionLoading || (session?.user && joinBusy && !joinError)) {
    return (
      <div className="bg-muted/20 flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          {session?.user ? "Joining organization…" : "Checking your session…"}
        </p>
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="bg-muted/20 flex min-h-screen items-center justify-center p-6">
        <Card className="border-border/60 w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <div className="bg-primary/10 text-primary mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Join {meta.organizationName}</CardTitle>
            <CardDescription>Signed in as {session.user.email}.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {joinError ? (
              <>
                <p className="text-destructive text-center text-sm">{joinError}</p>
                <Button type="button" onClick={() => void retrySessionJoin()} disabled={joinBusy}>
                  {joinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try again"}
                </Button>
              </>
            ) : (
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-6">
      <Card className="border-border/60 w-full max-w-lg shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-xl">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Join {meta.organizationName}</CardTitle>
          <CardDescription className="text-pretty">
            Create an account or sign in. Anyone with this link can join as a member until{" "}
            <span className="text-foreground font-medium">{expiresLabel}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Already have an account?</AlertTitle>
            <AlertDescription className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground text-sm">Use the same email your admin expects.</span>
              <Button variant="secondary" size="sm" asChild>
                <Link href={signInHref}>Sign in</Link>
              </Button>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => void handleGoogle()}
            >
              Continue with Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">Or create an account</span>
            </div>
          </div>

          <form onSubmit={(e) => void handleEmailSignUp(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-name" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Full name
              </Label>
              <Input
                id="join-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={cn(fieldErrors.name && "border-destructive")}
              />
              {fieldErrors.name ? <p className="text-destructive text-xs">{fieldErrors.name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Work email
              </Label>
              <Input
                id="join-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={cn(fieldErrors.email && "border-destructive")}
              />
              {fieldErrors.email ? (
                <div className="space-y-1">
                  <p className="text-destructive text-xs">{fieldErrors.email}</p>
                  {fieldErrors.email.includes("already") ? (
                    <Button variant="link" className="h-auto p-0 text-xs" asChild>
                      <Link href={signInHref}>Go to sign in</Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-password" className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="join-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={cn("pr-10", fieldErrors.password && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {fieldErrors.password ? <p className="text-destructive text-xs">{fieldErrors.password}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={signUpBusy}>
              {signUpBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create account & join"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
