"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, Mail, Shield, Users, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"

interface OrganizationInviteDialogProps {
  organizationId: string
  organizationName: string
  onInvitationSent?: () => void
}

export function OrganizationInviteDialog({ 
  organizationId, 
  organizationName, 
  onInvitationSent 
}: OrganizationInviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [orgRoles, setOrgRoles] = useState<{ id: string; name: string; kind: string }[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const resetForm = () => {
    setEmail("")
    setRole("member")
    setSelectedRoleId("")
    setError("")
    setSuccess(false)
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    api.organizationRoles
      .list(organizationId)
      .then((res) => {
        const r = res as { success?: boolean; roles?: { id: string; name: string; kind: string }[] }
        if (cancelled || !r.success || !r.roles) return
        const invitable = r.roles.filter((x) => x.kind !== "owner")
        setOrgRoles(invitable)
        const memberTemplate = invitable.find((x) => x.kind === "member_template")
        const fallback = memberTemplate?.id ?? invitable.find((x) => x.kind === "admin")?.id ?? invitable[0]?.id ?? ""
        setSelectedRoleId(fallback)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, organizationId])

  const handleClose = () => {
    setOpen(false)
    setTimeout(resetForm, 300) // Reset after dialog animation
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Get current user info for the invitation
      const { data: session } = await authClient.getSession()
      if (!session?.user) {
        throw new Error("You must be logged in to send invitations")
      }

      let resolvedRole: "admin" | "member" = role
      let organizationRoleId: string | undefined
      if (orgRoles.length > 0 && selectedRoleId) {
        const picked = orgRoles.find((x) => x.id === selectedRoleId)
        organizationRoleId = selectedRoleId
        resolvedRole = picked?.kind === "admin" ? "admin" : "member"
      }

      const result = await api.organizationActions.sendInvitation({
        email,
        role: resolvedRole,
        organizationId,
        organizationName,
        ...(organizationRoleId ? { organizationRoleId } : {}),
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to send invitation")
      }

      setSuccess(true)
      onInvitationSent?.()
      toast.success(`Invitation sent to ${email}`)

      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error: any) {
      console.error("Invitation error:", error)
      setError(error.message || "Failed to send invitation")
      toast.error(error.message || "Failed to send invitation")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Invitation Sent!</h3>
            <p className="text-muted-foreground text-center">
              An invitation has been sent to <strong>{email}</strong> to join <strong>{organizationName}</strong>
              {orgRoles.length > 0 && selectedRoleId ? (
                <>
                  {" "}
                  as <strong>{orgRoles.find((r) => r.id === selectedRoleId)?.name ?? "member"}</strong>.
                </>
              ) : (
                <>
                  {" "}
                  as a <strong>{role}</strong>.
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Invite someone to join <strong>{organizationName}</strong> as a team member.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertDescription className="text-destructive font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Role
              </Label>
              {orgRoles.length > 0 ? (
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="font-medium">{r.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={role} onValueChange={(value: "admin" | "member") => setRole(value)}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <div>
                          <div className="font-medium">Member</div>
                          <div className="text-xs text-muted-foreground">Default workspace access</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-500" />
                        <div>
                          <div className="font-medium">Admin</div>
                          <div className="text-xs text-muted-foreground">Full workspace management</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground">What happens next?</h4>
                <p className="text-xs text-muted-foreground">
                  We'll check if this person has an account. If they do, they'll get an invitation to join. 
                  If not, they'll get an invitation to sign up and join the organization.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="bg-background/50 hover:bg-muted/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}