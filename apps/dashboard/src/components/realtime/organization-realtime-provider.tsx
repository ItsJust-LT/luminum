"use client"

import { useEffect, useCallback } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import { toast } from "sonner"

interface OrganizationRealtimeProviderProps {
  children: React.ReactNode
  onEmailCreated?: (data: any) => void
  onEmailRead?: (data: any) => void
  onEmailDeleted?: (data: any) => void
  onFormCreated?: (data: any) => void
  onFormUpdated?: (data: any) => void
  onFormDeleted?: (data: any) => void
}

export function OrganizationRealtimeProvider({
  children,
  onEmailCreated,
  onEmailRead,
  onEmailDeleted,
  onFormCreated,
  onFormUpdated,
  onFormDeleted,
}: OrganizationRealtimeProviderProps) {
  const { organization } = useOrganization()

  const handleEvent = useCallback(
    (eventType: string, data: any) => {
      switch (eventType) {
        case OrganizationEvents.EMAIL_CREATED:
          onEmailCreated?.(data)
          break
        case OrganizationEvents.EMAIL_READ:
          onEmailRead?.(data)
          break
        case OrganizationEvents.EMAIL_DELETED:
          onEmailDeleted?.(data)
          break
        case OrganizationEvents.FORM_SUBMISSION_CREATED:
          onFormCreated?.(data)
          break
        case OrganizationEvents.FORM_SUBMISSION_UPDATED:
          onFormUpdated?.(data)
          break
        case OrganizationEvents.FORM_SUBMISSION_DELETED:
          onFormDeleted?.(data)
          break
        default:
          console.log(`[Realtime] Unhandled event: ${eventType}`, data)
      }
    },
    [onEmailCreated, onEmailRead, onEmailDeleted, onFormCreated, onFormUpdated, onFormDeleted]
  )

  useOrganizationChannel(organization?.id || null, handleEvent)

  return <>{children}</>
}

