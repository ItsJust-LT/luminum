"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/auth/client'
import { addSupportMessage, getSupportTicket, getNewMessages, markTicketRead } from '@/lib/actions/support-actions'
import { uploadFileToCloudinary } from '@/lib/actions/cloudinary-actions'
import type { SupportMessage, SupportTicket } from '@/lib/types/support'

interface SupportMessagesContextType {
  // State
  messages: SupportMessage[]
  ticket: SupportTicket | null
  loading: boolean
  sending: boolean
  uploading: boolean
  
  // Actions
  sendMessage: (message: string, attachments?: File[]) => Promise<boolean>
  refreshMessages: () => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  
  // Real-time
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
  organizationId 
}: SupportMessagesProviderProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Fetch ticket and messages
  const fetchTicketAndMessages = useCallback(async () => {
    if (!session || !ticketId) return

    setLoading(true)
    try {
      const result = await getSupportTicket(ticketId)
      if (result.success && result.data) {
        setTicket(result.data)
        setMessages(result.data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching ticket and messages:', error)
    } finally {
      setLoading(false)
    }
  }, [session, ticketId])

  // Send message
  const sendMessage = useCallback(async (message: string, attachments?: File[]): Promise<boolean> => {
    if (!session || !ticketId || sending) return false

    setSending(true)
    try {
      // Upload attachments if any
      let attachmentData: any[] = []
      if (attachments && attachments.length > 0) {
        setUploading(true)
        try {
          console.log('Starting upload of', attachments.length, 'files')
          const uploadPromises = attachments.map(async (file) => {
            console.log('Uploading file:', file.name, file.size, file.type)
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadFileToCloudinary(formData)
            
            console.log('Upload result:', result)
            
            if (!result.success) {
              throw new Error(result.error || 'Upload failed')
            }
            
            return {
              filename: file.name,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              cloudinary_public_id: result.data!.public_id,
              cloudinary_url: result.data!.secure_url
            }
          })
          attachmentData = await Promise.all(uploadPromises)
          console.log('All uploads completed:', attachmentData)
        } catch (error) {
          console.error('Error uploading attachments:', error)
          throw new Error('Failed to upload attachments')
        } finally {
          setUploading(false)
        }
      }

      // Send message
      const result = await addSupportMessage(ticketId, {
        message,
        attachments: attachmentData
      })

      if (result.success && result.data) {
        // Add message to local state immediately for better UX
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
            id: session.user.id,
            name: session.user.name || 'You',
            email: session.user.email,
            image: session.user.image || undefined,
            role: (session.user as { role?: string }).role || undefined
          }
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

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    await fetchTicketAndMessages()
  }, [fetchTicketAndMessages])

  const markAsRead = useCallback(async (_messageId: string) => {
    if (ticketId) await markTicketRead(ticketId)
  }, [ticketId])

  const reconnect = useCallback(() => {
    setIsConnected(false)
    fetchTicketAndMessages().then(() => setIsConnected(true))
  }, [fetchTicketAndMessages])

  useEffect(() => {
    fetchTicketAndMessages()
  }, [fetchTicketAndMessages])

  // Poll for new messages every 4 seconds
  useEffect(() => {
    if (!session || !ticketId) return
    let lastPoll = new Date().toISOString()
    setIsConnected(true)

    const interval = setInterval(async () => {
      try {
        const result = await getNewMessages(ticketId, lastPoll)
        if (result.success && result.data?.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = result.data.filter((m: any) => !existingIds.has(m.id))
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
          })
          lastPoll = new Date().toISOString()
        }
      } catch {}
    }, 4000)

    return () => clearInterval(interval)
  }, [session, ticketId])

  const value: SupportMessagesContextType = {
    messages,
    ticket,
    loading,
    sending,
    uploading,
    sendMessage,
    refreshMessages,
    markAsRead,
    isConnected,
    reconnect
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
