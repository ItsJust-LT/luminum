"use client"

import { useState, useCallback } from "react"
import { OrganizationSidebar } from "./organization-sidebar"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { api } from "@/lib/api"

interface Organization {
  id: string
  name: string
  logo?: string | null
  emails_enabled?: boolean
  whatsapp_enabled?: boolean
  analytics_enabled?: boolean
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
  initialUnreadWhatsappCount?: number
  initialEmailsEnabled?: boolean
  initialWhatsappEnabled?: boolean
  initialAnalyticsEnabled?: boolean
}

export function OrganizationSidebarWrapper({
  organization,
  sessionUser,
  onSignOut,
  initialUnseenFormsCount = 0,
  initialUnreadEmailsCount = 0,
  initialUnreadWhatsappCount = 0,
  initialEmailsEnabled = false,
  initialWhatsappEnabled = false,
  initialAnalyticsEnabled = false,
}: OrganizationSidebarWrapperProps) {
  const [unseenFormsCount, setUnseenFormsCount] = useState(initialUnseenFormsCount)
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(initialUnreadEmailsCount)
  const [unreadWhatsappCount, setUnreadWhatsappCount] = useState(initialUnreadWhatsappCount)

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
          const emailResult = await api.emails.getUnreadCount(organization.id)
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
          const formsResult = await api.forms.getUnseenCount(organization.id)
          if (formsResult.success) {
            setUnseenFormsCount(formsResult.count || 0)
          }
          break
        case OrganizationEvents.FORM_SUBMISSION_DELETED:
          // Refresh unseen forms count
          const formsResult2 = await api.forms.getUnseenCount(organization.id)
          if (formsResult2.success) {
            setUnseenFormsCount(formsResult2.count || 0)
          }
          break
        case OrganizationEvents.WHATSAPP_MESSAGE:
          setUnreadWhatsappCount((prev) => prev + 1)
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
      initialUnreadWhatsappCount={unreadWhatsappCount}
      initialEmailsEnabled={initialEmailsEnabled}
      initialWhatsappEnabled={initialWhatsappEnabled}
      isLoading={false}
    />
  )
}

