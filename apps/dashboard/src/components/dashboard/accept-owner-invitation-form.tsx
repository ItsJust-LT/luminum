"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Mail, User, Lock, AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { acceptOwnerInvitation } from "@/lib/actions/admin-organization-actions"
import { toast } from "sonner"
import { signUpWithGoogle } from "@/lib/auth/sign-up"
import { Separator } from "@/components/ui/separator"

interface AcceptOwnerInvitationFormProps {
  invitation: {
    id: string
    email: string
    organizationId: string
    organizationName?: string
    expiresAt: string
  }
}

export function AcceptOwnerInvitationForm({ invitation }: AcceptOwnerInvitationFormProps) {
  const [loading, setLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: invitation.email,
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" }
    if (password.length < 6) return { strength: 1, label: "Weak", color: "bg-red-500" }
    if (password.length < 8) return { strength: 2, label: "Fair", color: "bg-yellow-500" }
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 4, label: "Strong", color: "bg-green-500" }
    }
    return { strength: 3, label: "Good", color: "bg-blue-500" }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (formData.email !== invitation.email) {
      newErrors.email = "Email must match the invitation email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const result = await acceptOwnerInvitation({
        invitationId: invitation.id,
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })

      if (result.success) {
        setSuccess(true)
        toast.success("🎉 Welcome! Your account has been created and you are now the owner of the organization.")

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 3000)
      } else {
        const errorMessage = result.error || "Failed to accept invitation"
        toast.error(errorMessage)
        
        // Handle specific error cases
        if (errorMessage.includes("expired")) {
          toast.error("This invitation has expired. Please contact the organization administrator for a new invitation.")
        } else if (errorMessage.includes("email")) {
          toast.error("Email mismatch. Please ensure you're using the correct email address.")
        } else if (errorMessage.includes("account")) {
          toast.error("Failed to create account. Please try again or contact support.")
        }
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast.error("An unexpected error occurred. Please try again or contact support if the problem persists.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    try {
      // Store invitation ID in localStorage for the callback
      localStorage.setItem("pendingOwnerInvitationId", invitation.id)

      // Use the sign-up function with special callback URL for owner invitation flow
      await signUpWithGoogle(`/accept-owner-invitation/callback?invitationId=${invitation.id}`)
    } catch (error: any) {
      console.error("Google sign up error:", error)
      toast.error(error.message || "Failed to sign up with Google")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            🎉 Welcome, Owner!
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
            Your account has been created successfully and you are now the owner of{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{invitation.organizationName || "the organization"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Account created successfully!</strong> You now have full administrative access to your organization.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What's next?</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Set up your organization profile and branding</li>
                <li>• Invite team members and assign roles</li>
                <li>• Configure your subscription and billing</li>
                <li>• Start building your digital presence</li>
              </ul>
            </div>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                You will be redirected to the dashboard in a few seconds...
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Building2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Complete Your Setup
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
          Create your account to become the owner of{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{invitation.organizationName || "the organization"}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {/* Google Sign-up Option */}
        <div className="mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-foreground border-border hover:bg-accent hover:border-accent-foreground/20 transition-all duration-300 bg-background/50 backdrop-blur-sm font-medium"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
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
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-800 px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`h-12 px-4 text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"}`}
            />
            {errors.name && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>}
          </div>

          <div className="space-y-3">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`h-12 px-4 text-base bg-gray-50 dark:bg-slate-600 text-gray-900 dark:text-gray-100 ${errors.email ? "border-red-500" : "border-gray-300 dark:border-slate-600"}`}
              disabled // Email should match invitation
            />
            {errors.email && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>}
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              This must match the email address the invitation was sent to
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a secure password (min. 8 characters)"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`h-12 px-4 pr-12 text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.strength <= 1 ? 'text-red-600 dark:text-red-400' :
                    passwordStrength.strength <= 2 ? 'text-yellow-600 dark:text-yellow-400' :
                    passwordStrength.strength <= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
              </div>
            )}
            {errors.password && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.password}
            </p>}
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className={`h-12 px-4 pr-12 text-base bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${errors.confirmPassword ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Passwords match
              </p>
            )}
            {errors.confirmPassword && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.confirmPassword}
            </p>}
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Owner privileges:</strong> You'll have full administrative access to manage members, settings, billing, and all organization resources.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </div>
            ) : (
              "Accept Ownership & Create Account"
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This invitation expires on <strong>{new Date(invitation.expiresAt).toLocaleDateString()}</strong>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
