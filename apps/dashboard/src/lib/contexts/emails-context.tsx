"use client"

import React, { createContext, useCallback, useContext, useState } from "react"

export interface EmailListItem {
  id: string
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  date: Date
  textBody: string | null
  htmlBody: string | null
  read: boolean
  createdAt: Date
  attachments: any[]
  inlineImages: any[]
  direction?: string
  outbound_provider?: string | null
  fallback_used?: boolean
  provider_message_id?: string | null
}

interface EmailsContextValue {
  loadedForOrgId: string | null
  setLoadedForOrgId: React.Dispatch<React.SetStateAction<string | null>>
  emails: EmailListItem[]
  setEmails: React.Dispatch<React.SetStateAction<EmailListItem[]>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  loadingMore: boolean
  setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  hasMore: boolean
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>
  totalCount: number | null
  setTotalCount: React.Dispatch<React.SetStateAction<number | null>>
  unreadCountFromApi: number | null
  setUnreadCountFromApi: React.Dispatch<React.SetStateAction<number | null>>
  filterRead: boolean | undefined
  setFilterRead: React.Dispatch<React.SetStateAction<boolean | undefined>>
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  debouncedSearch: string
  setDebouncedSearch: React.Dispatch<React.SetStateAction<string>>
  selectedEmailAddresses: string[]
  setSelectedEmailAddresses: React.Dispatch<React.SetStateAction<string[]>>
  availableEmailAddresses: string[]
  setAvailableEmailAddresses: React.Dispatch<React.SetStateAction<string[]>>
  scrollPosition: number | null
  setScrollPosition: React.Dispatch<React.SetStateAction<number | null>>
  saveScrollPosition: (scrollTop: number) => void
  clearScrollPosition: () => void
  hasCachedList: (organizationId: string) => boolean
  clearCache: () => void
}

const EmailsContext = createContext<EmailsContextValue | null>(null)

export function EmailsProvider({ children }: { children: React.ReactNode }) {
  const [loadedForOrgId, setLoadedForOrgId] = useState<string | null>(null)
  const [emails, setEmails] = useState<EmailListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [unreadCountFromApi, setUnreadCountFromApi] = useState<number | null>(null)
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedEmailAddresses, setSelectedEmailAddresses] = useState<string[]>([])
  const [availableEmailAddresses, setAvailableEmailAddresses] = useState<string[]>([])
  const [scrollPosition, setScrollPosition] = useState<number | null>(null)

  const saveScrollPosition = useCallback((scrollTop: number) => {
    setScrollPosition(scrollTop)
  }, [])

  const clearScrollPosition = useCallback(() => {
    setScrollPosition(null)
  }, [])

  const hasCachedList = useCallback(
    (organizationId: string) => {
      return loadedForOrgId === organizationId && emails.length > 0
    },
    [loadedForOrgId, emails.length]
  )

  const clearCache = useCallback(() => {
    setLoadedForOrgId(null)
    setEmails([])
    setScrollPosition(null)
    setPage(1)
    setHasMore(false)
    setTotalCount(null)
    setUnreadCountFromApi(null)
  }, [])

  const value: EmailsContextValue = {
    loadedForOrgId,
    setLoadedForOrgId,
    emails,
    setEmails,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    page,
    setPage,
    hasMore,
    setHasMore,
    totalCount,
    setTotalCount,
    unreadCountFromApi,
    setUnreadCountFromApi,
    filterRead,
    setFilterRead,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    setDebouncedSearch,
    selectedEmailAddresses,
    setSelectedEmailAddresses,
    availableEmailAddresses,
    setAvailableEmailAddresses,
    scrollPosition,
    setScrollPosition,
    saveScrollPosition,
    clearScrollPosition,
    hasCachedList,
    clearCache,
  }

  return <EmailsContext.Provider value={value}>{children}</EmailsContext.Provider>
}

export function useEmailsContext() {
  const ctx = useContext(EmailsContext)
  if (!ctx) throw new Error("useEmailsContext must be used within EmailsProvider")
  return ctx
}

export function useEmailsContextOptional() {
  return useContext(EmailsContext)
}
