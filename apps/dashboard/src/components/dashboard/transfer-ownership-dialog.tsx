"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

type TransferOwnershipDialogProps = {
  organizationId: string
  organizationName: string
  onSent?: () => void
}

export function TransferOwnershipDialog({ organizationId, organizationName, onSent }: TransferOwnershipDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast.error("Enter an email address")
      return
    }
    setLoading(true)
    try {
      const res = (await api.organizationActions.requestOwnershipTransfer({
        organizationId,
        email: trimmed,
      })) as { success?: boolean; error?: string }
      if (!res.success) {
        throw new Error(res.error || "Could not start transfer")
      }
      toast.success(`Ownership transfer email sent to ${trimmed}`)
      setEmail("")
      setOpen(false)
      onSent?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not start transfer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Transfer ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            Transfer ownership
          </DialogTitle>
          <DialogDescription>
            Enter the email of the next owner of <strong>{organizationName}</strong>. They can be new or already registered — we will email them a
            link to accept. When they accept, they become owner and current owners become admins.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              Only start a transfer if you trust this person. You can cancel a pending transfer from pending invitations on the team page.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="transfer-email">Recipient email</Label>
            <Input
              id="transfer-email"
              type="email"
              autoComplete="email"
              placeholder="future.owner@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              "Send transfer invitation"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
