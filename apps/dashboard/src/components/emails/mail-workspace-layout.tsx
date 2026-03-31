"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useOrganization } from "@/lib/contexts/organization-context"
import { orgNavPath } from "@/lib/org-nav-path"
import { useCustomDomain } from "@/lib/hooks/use-custom-domain"
import { api } from "@/lib/api"
import type { EmailSetupStatus } from "@/lib/types/emails"
import { MailWorkspaceProvider, useMailWorkspace } from "@/lib/contexts/mail-workspace-context"
import { MailboxSidebar } from "@/components/emails/mailbox-sidebar"

function MailWorkspaceChrome({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization()
  const { isCustomDomain } = useCustomDomain()
  const pathname = usePathname() ?? ""
  const slug = organization?.slug ?? ""
  const flatRoutes = isCustomDomain
  const emailsBase = orgNavPath(slug, flatRoutes, "emails")
  const composeHref = `${emailsBase}/compose`
  const settingsHref = `${emailsBase}/settings`

  const { mailbox, setMailbox, folderCounts, refreshFolderCounts } = useMailWorkspace()

  let section: "inbox" | "compose" | "settings" | null = "inbox"
  if (pathname === composeHref || pathname.startsWith(`${composeHref}/`)) section = "compose"
  else if (pathname === settingsHref || pathname.startsWith(`${settingsHref}/`)) section = "settings"

  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-[calc(100dvh-4rem)] md:max-h-[calc(100dvh-4rem)] md:flex-row">
      <MailboxSidebar
        active={mailbox}
        onSelect={(m) => {
          setMailbox(m)
          refreshFolderCounts()
        }}
        counts={folderCounts}
        emailsBasePath={emailsBase}
        composeHref={composeHref}
        settingsHref={settingsHref}
        activeSection={section}
        className="md:h-full md:max-h-none md:w-[220px] md:min-w-[220px] md:shrink-0 md:border-b-0 md:border-r md:border-border/60 md:bg-muted/20 md:py-0"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background/40">{children}</div>
    </div>
  )
}

export function MailWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization()
  const [setupStatus, setSetupStatus] = useState<EmailSetupStatus | null>(null)

  useEffect(() => {
    if (!organization?.id) return
    void api.emails.getSetupStatus(organization.id).then((s) => setSetupStatus(s as EmailSetupStatus))
  }, [organization?.id])

  const showShell =
    setupStatus != null &&
    setupStatus.access !== false &&
    setupStatus.setupComplete === true &&
    setupStatus.emailSystemUnavailable !== true

  return (
    <MailWorkspaceProvider>
      {showShell ? <MailWorkspaceChrome>{children}</MailWorkspaceChrome> : children}
    </MailWorkspaceProvider>
  )
}
