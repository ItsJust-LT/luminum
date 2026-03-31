"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useMailWorkspace } from "@/lib/contexts/mail-workspace-context"
import { orgNavPath } from "@/lib/org-nav-path"
import { useCustomDomain } from "@/lib/hooks/use-custom-domain"
import type { EmailSetupStatus } from "@/lib/types/emails"
import type { MailboxId } from "@/components/emails/mailbox-sidebar"
import { MailComposeFullscreen } from "@/components/emails/mail-compose-fullscreen"

export default function MailComposePage() {
  const router = useRouter()
  const { organization } = useOrganization()
  const { isCustomDomain } = useCustomDomain()
  const { setMailbox, refreshFolderCounts } = useMailWorkspace()
  const [setupStatus, setSetupStatus] = useState<EmailSetupStatus | null>(null)

  useEffect(() => {
    if (!organization?.id) return
    void api.emails.getSetupStatus(organization.id).then((s) => setSetupStatus(s as EmailSetupStatus))
  }, [organization?.id])

  const base = organization ? orgNavPath(organization.slug, isCustomDomain, "emails") : "/emails"

  useEffect(() => {
    if (setupStatus && setupStatus.setupComplete !== true) {
      router.replace(base)
    }
  }, [setupStatus, router, base])

  const onRefresh = async (opts?: { mailbox?: MailboxId }) => {
    await refreshFolderCounts()
    if (opts?.mailbox) setMailbox(opts.mailbox)
    router.push(base)
  }

  if (!organization) return null

  return (
    <MailComposeFullscreen
      layoutMode="page"
      open
      onOpenChange={(o) => {
        if (!o) router.push(base)
      }}
      organizationId={organization.id}
      domain={setupStatus?.domain}
      onRefresh={onRefresh}
    />
  )
}
