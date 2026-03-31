"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { api } from "@/lib/api"
import type { MailboxId, FolderCounts } from "@/components/emails/mailbox-sidebar"

interface MailWorkspaceContextValue {
  mailbox: MailboxId
  setMailbox: React.Dispatch<React.SetStateAction<MailboxId>>
  folderCounts: FolderCounts
  setFolderCounts: React.Dispatch<React.SetStateAction<FolderCounts>>
  refreshFolderCounts: () => Promise<void>
}

const MailWorkspaceContext = createContext<MailWorkspaceContextValue | null>(null)

export function MailWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization()
  const [mailbox, setMailbox] = useState<MailboxId>("inbox")
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({
    inboxUnread: 0,
    sent: 0,
    starred: 0,
    drafts: 0,
    scheduled: 0,
  })

  const refreshFolderCounts = useCallback(async () => {
    if (!organization?.id) return
    try {
      const r = (await api.emails.folderCounts(organization.id)) as {
        success?: boolean
        data?: FolderCounts
      }
      if (r?.success && r.data) setFolderCounts(r.data)
    } catch {
      /* ignore */
    }
  }, [organization?.id])

  useEffect(() => {
    void refreshFolderCounts()
  }, [refreshFolderCounts])

  const value: MailWorkspaceContextValue = {
    mailbox,
    setMailbox,
    folderCounts,
    setFolderCounts,
    refreshFolderCounts,
  }

  return <MailWorkspaceContext.Provider value={value}>{children}</MailWorkspaceContext.Provider>
}

export function useMailWorkspace() {
  const ctx = useContext(MailWorkspaceContext)
  if (!ctx) throw new Error("useMailWorkspace must be used within MailWorkspaceProvider")
  return ctx
}
