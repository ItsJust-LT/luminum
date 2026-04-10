"use client"

import type React from "react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/lib/auth/client"
import { signUpWithGoogle } from "@/lib/auth/sign-up"
import { useIsBrandedDashboardHost } from "@/lib/is-branded-dashboard-host"

interface InvitationSignupFormProps {
  invitationId: string
}

export function InvitationSignupForm({ invitationId }: InvitationSignupFormProps) {
  const showGoogleSignIn = !useIsBrandedDashboardHost()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [invitationLoading, setInvitationLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const result = await authClient.getAppInvitation({
          query: { id: invitationId },
        }) as { data?: { email?: string; name?: string; [key: string]: unknown } }

        if (result.data) {
          setInvitation(result.data)
          setEmail(result.data.email || "")
          setName(result.data.name || "")
        } else {
          setError("Invalid or expired invitation")
        }
      } catch (error) {
        console.error("Error fetching invitation:", error)
        setError("Failed to load invitation")
      } finally {
        setInvitationLoading(false)
      }
    }

    fetchInvitation()
  }, [invitationId])

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await authClient.acceptInvitation({
        invitationId,
        name,
        email,
        password,
      })
      setSuccess(true)
    } catch (error: any) {
      console.error("Sign up error:", error)
      setError(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setError("")

    try {
      // Store invitation ID in localStorage for the callback
      localStorage.setItem("pendingInvitationId", invitationId)

      // Use the sign-up function with special callback URL for invitation flow
      await signUpWithGoogle(`/accept-invitation/callback?invitationId=${invitationId}`)
    } catch (error: any) {
      console.error("Google sign up error:", error)
      setError(error.message || "Failed to sign up with Google")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="mx-auto w-full max-w-md border-0 bg-card shadow-xl">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="mx-auto w-full max-w-md border-0 bg-card shadow-xl">
          <CardContent className="text-center py-16">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Luminum Agency!</h2>
            <p className="text-gray-600 mb-6">Your account has been created successfully.</p>
            <Button onClick={() => (window.location.href = "/dashboard")} className="bg-blue-600 hover:bg-blue-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="mx-auto w-full max-w-md border-0 bg-card shadow-xl">
          <CardContent className="text-center py-16">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button variant="outline" onClick={() => (window.location.href = "/sign-in")} className="bg-transparent">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="border-0 bg-card shadow-xl">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="flex justify-center mb-2">
              <Image
                src="/images/logo.png"
                alt="Luminum Agency"
                width={48}
                height={48}
                className="rounded-lg shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Complete Your Registration
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                You've been invited to join Luminum Agency
                {invitation?.inviter && (
                  <span className="block mt-1 text-sm">
                    by <strong>{invitation.inviter.name}</strong>
                  </span>
                )}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showGoogleSignIn ? (
              <>
                <Button
                  variant="outline"
                  className="w-full h-12 text-foreground border-border hover:bg-accent hover:border-border/80 transition-all duration-200 bg-transparent"
                  onClick={handleGoogleSignUp}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
              </>
            ) : null}

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 focus:border-primary focus:ring-primary"
                    required
                    disabled={!!invitation?.name}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 focus:border-primary focus:ring-primary"
                    required
                    disabled={!!invitation?.email}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 focus:border-primary focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground mt-8 max-w-sm mx-auto">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-primary hover:text-primary/80 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:text-primary/80 hover:underline">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  )
}
