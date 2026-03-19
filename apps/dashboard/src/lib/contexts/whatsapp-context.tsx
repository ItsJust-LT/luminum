"use client"

import { createContext, useContext, useMemo, useState } from "react"

export interface CachedChatState<TMessage = any> {
  messages: TMessage[]
  nextCursor: string | null
  hasLoaded: boolean
}

interface WhatsAppContextValue {
  selectedChatId: string | null
  setSelectedChatId: (id: string | null) => void
  chatListCache: any[]
  setChatListCache: (items: any[]) => void
  chatStateById: Record<string, CachedChatState>
  setChatStateById: (next: Record<string, CachedChatState>) => void
}

const WhatsAppContext = createContext<WhatsAppContextValue | null>(null)

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chatListCache, setChatListCache] = useState<any[]>([])
  const [chatStateById, setChatStateById] = useState<Record<string, CachedChatState>>({})

  const value = useMemo(
    () => ({
      selectedChatId,
      setSelectedChatId,
      chatListCache,
      setChatListCache,
      chatStateById,
      setChatStateById,
    }),
    [selectedChatId, chatListCache, chatStateById],
  )

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>
}

export function useWhatsAppCache() {
  const ctx = useContext(WhatsAppContext)
  if (!ctx) throw new Error("useWhatsAppCache must be used within WhatsAppProvider")
  return ctx
}

