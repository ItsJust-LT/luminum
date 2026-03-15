"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useRealtime } from '@/components/realtime/realtime-provider'
import type { SupportMessage, SupportTicket } from '@/lib/types/support'

interface SupportMessagesContextType {
  messages: SupportMessage[]
  ticket: SupportTicket | null
  loading: boolean
  sending: boolean
  uploading: boolean
  sendMessage: (message: string, attachments?: File[]) => Promise<boolean>
  refreshMessages: () => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  isConnected: boolean
  reconnect: () => void
}

const SupportMessagesContext = createContext<SupportMessagesContextType | undefined>(undefined)

interface SupportMessagesProviderProps {
  children: React.ReactNode
  ticketId: string
  organizationId?: string
}

export function SupportMessagesProvider({
  children,
  ticketId,
  organizationId,
}: SupportMessagesProviderProps) {
  const { data: session } = useSession()
  const { connected, subscribe, unsubscribe, onMessage } = useRealtime()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchTicketAndMessages = useCallback(async () => {
    if (!session || !ticketId) return
    setLoading(true)
    try {
      const result = await api.support.getTicket(ticketId) as { success?: boolean; data?: any; ticket?: any }
      const data = result?.data ?? result?.ticket
      if (result?.success !== false && data) {
        setTicket(data)
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching ticket and messages:', error)
    } finally {
      setLoading(false)
    }
  }, [session, ticketId])

  const sendMessage = useCallback(async (message: string, attachments?: File[]): Promise<boolean> => {
    if (!session || !ticketId || sending) return false
    setSending(true)
    try {
      let attachmentData: any[] = []
      if (attachments && attachments.length > 0) {
        setUploading(true)
        try {
          const uploadPromises = attachments.map(async (file) => {
            const bytes = await file.arrayBuffer()
            const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
            const result = await api.uploads.fileToCloudinary({
              fileBase64,
              contentType: file.type,
            }) as { success?: boolean; data?: { public_id: string; secure_url: string }; error?: string }
            if (!result?.data) throw new Error(result?.error || 'Upload failed')
            return {
              filename: file.name, original_filename: file.name, file_size: file.size,
              mime_type: file.type, cloudinary_public_id: result.data.public_id,
              cloudinary_url: result.data.secure_url,
            }
          })
          attachmentData = await Promise.all(uploadPromises)
        } catch (error) {
          console.error('Error uploading attachments:', error)
          throw new Error('Failed to upload attachments')
        } finally {
          setUploading(false)
        }
      }

      const result = await api.support.addMessage(ticketId, { message, attachments: attachmentData }) as { success?: boolean; data?: any }
      if (result.success && result.data) {
        const newMessage: SupportMessage = {
          id: result.data.id,
          ticket_id: ticketId,
          sender_id: session.user.id,
          message,
          message_type: attachments && attachments.length > 0 ? 'file' : 'text',
          attachments: attachmentData,
          is_read: false,
          created_at: result.data.created_at ? (typeof result.data.created_at === 'string' ? result.data.created_at : result.data.created_at.toISOString()) : new Date().toISOString(),
          updated_at: result.data.created_at ? (typeof result.data.created_at === 'string' ? result.data.created_at : result.data.created_at.toISOString()) : new Date().toISOString(),
          sender: {
            id: session.user.id, name: session.user.name || 'You',
            email: session.user.email, image: session.user.image || undefined,
            role: (session.user as { role?: string }).role || undefined,
          },
        }
        setMessages(prev => [...prev, newMessage])
        return true
      }
      return false
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    } finally {
      setSending(false)
    }
  }, [session, ticketId, sending])

  const refreshMessages = useCallback(async () => {
    await fetchTicketAndMessages()
  }, [fetchTicketAndMessages])

  const markAsRead = useCallback(async (_messageId: string) => {
    if (ticketId) await api.support.markTicketRead(ticketId)
  }, [ticketId])

  const reconnect = useCallback(() => {
    fetchTicketAndMessages()
  }, [fetchTicketAndMessages])

  // Initial fetch
  useEffect(() => {
    fetchTicketAndMessages()
  }, [fetchTicketAndMessages])

  // Subscribe to support ticket channel via unified WS
  useEffect(() => {
    if (!ticketId || !connected) return
    subscribe(`support:${ticketId}`)
    return () => { unsubscribe(`support:${ticketId}`) }
  }, [ticketId, connected, subscribe, unsubscribe])

  // Listen for new messages via WS
  useEffect(() => {
    const unsub = onMessage("support:message", (data: any) => {
      if (data?.ticket_id !== ticketId && data?.ticketId !== ticketId) return
      const msg = data as SupportMessage
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return unsub
  }, [ticketId, onMessage])

  // Listen for status changes
  useEffect(() => {
    const unsub = onMessage("support:status", (data: any) => {
      if (data?.ticketId !== ticketId) return
      setTicket(prev => prev ? { ...prev, status: data.status } : prev)
    })
    return unsub
  }, [ticketId, onMessage])

  const value: SupportMessagesContextType = {
    messages, ticket, loading, sending, uploading,
    sendMessage, refreshMessages, markAsRead,
    isConnected: connected, reconnect,
  }

  return (
    <SupportMessagesContext.Provider value={value}>
      {children}
    </SupportMessagesContext.Provider>
  )
}

export function useSupportMessages() {
  const context = useContext(SupportMessagesContext)
  if (context === undefined) {
    throw new Error('useSupportMessages must be used within a SupportMessagesProvider')
  }
  return context
}
