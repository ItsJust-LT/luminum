"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cancelOrganizationInvitation } from "@/lib/actions/organization-actions"

interface CancelInvitationDialogProps {
  isOpen: boolean
  onClose: () => void
  invitation: {
    id: string
    email: string
    role: string
    createdAt: string
    expiresAt: string
  }
  onInvitationCancelled: () => void
}

export function CancelInvitationDialog({
  isOpen,
  onClose,
  invitation,
  onInvitationCancelled,
}: CancelInvitationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCancel = async () => {
    setIsLoading(true)
    setError("")

    try {
      const result = await cancelOrganizationInvitation(invitation.id)

      if (!result.success) {
        throw new Error(result.error || "Failed to cancel invitation")
      }

      toast.success(`Invitation to ${invitation.email} has been cancelled`)
      onInvitationCancelled()
      onClose()
    } catch (error: any) {
      console.error("Error cancelling invitation:", error)
      setError(error.message || "Failed to cancel invitation")
      toast.error(error.message || "Failed to cancel invitation")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isExpired = new Date(invitation.expiresAt) < new Date()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-orange-500" />
            Cancel Invitation
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this invitation?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {invitation.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {invitation.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {invitation.role}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Sent: {formatDate(invitation.createdAt)}</p>
                <p className={isExpired ? "text-red-500" : ""}>
                  Expires: {formatDate(invitation.expiresAt)}
                  {isExpired && " (Expired)"}
                </p>
              </div>
            </div>
          </div>

          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Warning:</strong> This will cancel the invitation to {invitation.email}. 
              They will no longer be able to use the invitation link to join the organization.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Keep Invitation
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? "Cancelling..." : "Cancel Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
