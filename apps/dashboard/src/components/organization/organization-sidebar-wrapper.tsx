"use client"

import { useState, useCallback } from "react"
import { OrganizationSidebar } from "./organization-sidebar"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { getUnreadEmailCount } from "@/lib/actions/emails"
import { getUnseenFormsCount } from "@/lib/actions/forms"

interface Organization {
  id: string
  name: string
  logo?: string | null
  emails_enabled?: boolean
}

interface SessionUser {
  name?: string | null
  image?: string | null
}

interface OrganizationSidebarWrapperProps {
  organization: Organization
  sessionUser?: SessionUser
  onSignOut: () => Promise<void> | void
  initialUnseenFormsCount?: number
  initialUnreadEmailsCount?: number
  initialEmailsEnabled?: boolean
}

export function OrganizationSidebarWrapper({
  organization,
  sessionUser,
  onSignOut,
  initialUnseenFormsCount = 0,
  initialUnreadEmailsCount = 0,
  initialEmailsEnabled = false,
}: OrganizationSidebarWrapperProps) {
  const [unseenFormsCount, setUnseenFormsCount] = useState(initialUnseenFormsCount)
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(initialUnreadEmailsCount)

  // Listen to real-time events and update counts
  const handleRealtimeEvent = useCallback(
    async (eventType: string, data: any) => {
      switch (eventType) {
        case OrganizationEvents.EMAIL_CREATED:
          // Increment unread emails count
          setUnreadEmailsCount((prev) => prev + 1)
          break
        case OrganizationEvents.EMAIL_READ:
          // Decrement unread emails count
          setUnreadEmailsCount((prev) => Math.max(0, prev - 1))
          break
        case OrganizationEvents.EMAIL_DELETED:
          // Refresh unread emails count (email might have been unread)
          const emailResult = await getUnreadEmailCount(organization.id)
          if (emailResult.success) {
            setUnreadEmailsCount(emailResult.count || 0)
          }
          break
        case OrganizationEvents.FORM_SUBMISSION_CREATED:
          // Increment unseen forms count
          setUnseenFormsCount((prev) => prev + 1)
          break
        case OrganizationEvents.FORM_SUBMISSION_UPDATED:
          // Refresh unseen forms count (form might have been marked as seen)
          const formsResult = await getUnseenFormsCount(organization.id)
          if (formsResult.success) {
            setUnseenFormsCount(formsResult.count || 0)
          }
          break
        case OrganizationEvents.FORM_SUBMISSION_DELETED:
          // Refresh unseen forms count
          const formsResult2 = await getUnseenFormsCount(organization.id)
          if (formsResult2.success) {
            setUnseenFormsCount(formsResult2.count || 0)
          }
          break
      }
    },
    [organization.id]
  )

  useOrganizationChannel(organization.id, handleRealtimeEvent)

  return (
    <OrganizationSidebar
      organization={organization}
      sessionUser={sessionUser}
      onSignOut={onSignOut}
      initialUnseenFormsCount={unseenFormsCount}
      initialUnreadEmailsCount={unreadEmailsCount}
      initialEmailsEnabled={initialEmailsEnabled}
      isLoading={false}
    />
  )
}

