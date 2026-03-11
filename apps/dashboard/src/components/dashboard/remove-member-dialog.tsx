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
import { UserMinus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { removeMemberFromOrganization } from "@/lib/actions/organization-actions"

interface RemoveMemberDialogProps {
  isOpen: boolean
  onClose: () => void
  member: {
    id: string
    name: string
    email: string
    role: string
  }
  organizationName: string
  organizationId: string
  onMemberRemoved: () => void
}

export function RemoveMemberDialog({
  isOpen,
  onClose,
  member,
  organizationName,
  organizationId,
  onMemberRemoved,
}: RemoveMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRemove = async () => {
    setIsLoading(true)
    setError("")

    try {
      const result = await removeMemberFromOrganization({
        memberId: member.id,
        memberEmail: member.email,
        memberName: member.name,
        organizationName,
        organizationId,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to remove member")
      }

      toast.success(`${member.name} has been removed from ${organizationName}`)
      onMemberRemoved()
      onClose()
    } catch (error: any) {
      console.error("Error removing member:", error)
      setError(error.message || "Failed to remove member")
      toast.error(error.message || "Failed to remove member")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-red-500" />
            Remove Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this member from the organization?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {member.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.email}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {member.role}
                </p>
              </div>
            </div>
          </div>

          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action will immediately remove {member.name} from {organizationName}. 
              They will lose access to all organization resources and will be notified via email.
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
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Removing..." : "Remove Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
