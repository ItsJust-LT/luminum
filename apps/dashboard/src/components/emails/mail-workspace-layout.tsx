"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useOrganization } from "@/lib/contexts/organization-context"
import { orgNavPath } from "@/lib/org-nav-path"
import { useCustomDomain } from "@/lib/hooks/use-custom-domain"
import { api } from "@/lib/api"
import type { EmailSetupStatus } from "@/lib/types/emails"
import { MailWorkspaceProvider, useMailWorkspace } from "@/lib/contexts/mail-workspace-context"
import { MailboxSidebar } from "@/components/emails/mailbox-sidebar"
import type { MailboxId } from "@/components/emails/mailbox-sidebar"
import { mergeSearchParams } from "@/lib/url-state/list-query"

const MAILBOX_IDS: MailboxId[] = ["inbox", "sent", "starred", "drafts", "scheduled"]

function MailWorkspaceChrome({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization()
  const { isCustomDomain } = useCustomDomain()
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = organization?.slug ?? ""
  const flatRoutes = isCustomDomain
  const emailsBase = orgNavPath(slug, flatRoutes, "emails")
  const composeHref = `${emailsBase}/compose`
  const settingsHref = `${emailsBase}/settings`

  const { mailbox, setMailbox, folderCounts, refreshFolderCounts } = useMailWorkspace()

  const folderFromUrl = searchParams.get("folder") as MailboxId | null

  useEffect(() => {
    if (pathname !== emailsBase) return
    if (folderFromUrl && MAILBOX_IDS.includes(folderFromUrl)) {
      setMailbox(folderFromUrl)
    }
  }, [pathname, emailsBase, folderFromUrl, setMailbox])

  let section: "inbox" | "compose" | "settings" | null = "inbox"
  if (pathname === composeHref || pathname.startsWith(`${composeHref}/`)) section = "compose"
  else if (pathname === settingsHref || pathname.startsWith(`${settingsHref}/`)) section = "settings"

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-[calc(100dvh-4rem)] md:max-h-[calc(100dvh-4rem)] md:flex-row">
      <MailboxSidebar
        active={mailbox}
        onSelect={(m) => {
          setMailbox(m)
          refreshFolderCounts()
          const qs =
            typeof window !== "undefined" ? window.location.search.slice(1) : searchParams.toString()
          const merged = mergeSearchParams(qs, { folder: m })
          const withFolder = merged ? `${emailsBase}?${merged}` : `${emailsBase}?folder=${encodeURIComponent(m)}`
          if (pathname !== emailsBase) {
            router.push(withFolder)
          } else {
            router.replace(withFolder, { scroll: false })
          }
        }}
        counts={folderCounts}
        emailsBasePath={emailsBase}
        composeHref={composeHref}
        settingsHref={settingsHref}
        activeSection={section}
        className="md:h-full md:max-h-none md:w-[220px] md:min-w-[220px] md:shrink-0 md:border-b-0 md:border-r md:border-border/60 md:bg-muted/20 md:py-0"
      />
      <div className="scrollbar-app flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background max-md:pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:overflow-hidden md:pb-0">
        {children}
      </div>
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

  // Render the mail shell immediately to avoid first-paint flicker/jump from no-sidebar -> sidebar.
  // If setup later resolves to unavailable/disabled, child routes handle that state.
  const showShell =
    setupStatus == null ||
    (setupStatus.access !== false &&
      setupStatus.setupComplete === true &&
      setupStatus.emailSystemUnavailable !== true)

  return (
    <MailWorkspaceProvider>
      {showShell ? (
        <Suspense fallback={<div className="min-h-[200px] w-full" />}>
          <MailWorkspaceChrome>{children}</MailWorkspaceChrome>
        </Suspense>
      ) : (
        children
      )}
    </MailWorkspaceProvider>
  )
}
