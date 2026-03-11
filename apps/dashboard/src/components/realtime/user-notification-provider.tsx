"use client"

import { useCallback } from "react"
import { useUserNotificationChannel } from "@/lib/ably/client"
import { UserNotificationEvents } from "@/lib/ably/events"
import { toast } from "sonner"
import { EmailAvatar } from "@/components/emails/email-avatar"

interface UserNotificationProviderProps {
  children: React.ReactNode
  onNotification?: (eventType: string, data: any) => void
}

export function UserNotificationProvider({
  children,
  onNotification,
}: UserNotificationProviderProps) {
  const handleNotification = useCallback(
    (eventType: string, data: any) => {
      switch (eventType) {
        case UserNotificationEvents.NEW_EMAIL:
          const emailTitle = data.title || (data.fromEmail ? `New email from ${data.fromEmail}` : "New email")
          const emailSubject = data.message || data.subject || "(No subject)"
          toast.info(emailTitle, {
            description: emailSubject,
            icon: data.fromEmail ? (
              <EmailAvatar email={data.fromEmail} imageUrl={data.fromAvatarUrl} size={28} />
            ) : undefined,
            action: {
              label: "Open",
              onClick: () => {
                if (data.url) {
                  window.location.href = data.url
                }
              },
            },
            duration: 5000,
          })
          onNotification?.(eventType, data)
          break
        case UserNotificationEvents.NEW_FORM_SUBMISSION:
          toast.info("New form submission", {
            description: "A new form has been submitted",
          })
          onNotification?.(eventType, data)
          break
        case UserNotificationEvents.SYSTEM_NOTIFICATION:
          toast.info(data.title || "Notification", {
            description: data.message,
          })
          onNotification?.(eventType, data)
          break
        default:
          console.log(`[Notifications] Unhandled notification: ${eventType}`, data)
      }
    },
    [onNotification]
  )

  useUserNotificationChannel(handleNotification)

  return <>{children}</>
}

