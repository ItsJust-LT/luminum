"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Send, 
  Paperclip, 
  Image, 
  FileText, 
  Download,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Crown,
  MessageSquare,
  Smile,
  Mic
} from 'lucide-react'
import { useSupportMessages } from '@/contexts/support-messages-context'
import { formatMessageTime, getFileIconType } from '@/lib/utils/chat-utils'
import { cn } from '@/lib/utils'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

interface ChatUIProps {
  className?: string
}

function renderFileIcon(iconType: string) {
  switch (iconType) {
    case 'Image':
      return <Image className="h-4 w-4" />
    case 'Video':
      return <FileText className="h-4 w-4" />
    case 'Music':
      return <FileText className="h-4 w-4" />
    case 'FileText':
      return <FileText className="h-4 w-4" />
    case 'FileSpreadsheet':
      return <FileText className="h-4 w-4" />
    case 'Presentation':
      return <FileText className="h-4 w-4" />
    case 'Archive':
      return <FileText className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

export function ChatUI({ className }: ChatUIProps) {
  const { 
    messages, 
    ticket, 
    loading, 
    sending, 
    uploading, 
    sendMessage,
    isConnected 
  } = useSupportMessages()
  
  const [newMessage, setNewMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() && attachments.length === 0) return

    const success = await sendMessage(newMessage.trim(), attachments)
    if (success) {
      setNewMessage('')
      setAttachments([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setAttachments(prev => [...prev, ...files])
  }

  if (loading) {
    return (
      <Card className={cn("h-[600px] flex items-center justify-center", className)}>
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("h-[600px] flex flex-col", className)}>
      {/* Header */}
      <div className="border-b bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Support Chat
              </h3>
              <Badge variant="outline" className="text-xs font-mono">
                {ticket?.ticket_number}
              </Badge>
            </div>
            <div className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
              isConnected ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isConnected ? "bg-green-500" : "bg-orange-500"
              )} />
              {isConnected ? "Live" : "Connecting..."}
            </div>
          </div>
          {ticket?.status && (
            <Badge 
              variant="secondary" 
              className={cn(
                "capitalize",
                ticket.status === 'open' && "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
                ticket.status === 'in_progress' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
                ticket.status === 'resolved' && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
                ticket.status === 'closed' && "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
              )}
            >
              {ticket.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground">Start the conversation by sending a message below.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={message.id} 
              className={cn(
                "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                message.sender_id === ticket?.user_id ? "flex-row-reverse" : ""
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-background">
                <AvatarImage src={message.sender?.image} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {message.sender?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "flex-1 max-w-[80%]",
                message.sender_id === ticket?.user_id ? "text-right" : ""
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.sender?.name || 'Unknown'}
                  </span>
                  {message.sender?.role === 'admin' && (
                    <Crown className="h-3 w-3 text-yellow-500 animate-pulse" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatMessageTime(message.created_at)}
                  </span>
                </div>
                
                <div className={cn(
                  "inline-block p-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md",
                  message.sender_id === ticket?.user_id 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                    : message.message_type === 'system'
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                    : "bg-muted hover:bg-muted/80"
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
                  
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border hover:bg-background/70 transition-colors">
                          {renderFileIcon(getFileIconType(attachment.mime_type))}
                          <span className="text-sm truncate flex-1">{attachment.original_filename}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(attachment.r2_url, '_blank')}
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-background p-4">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 p-3 bg-muted/50 rounded-xl border border-dashed border-muted-foreground/25">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Attachments ({attachments.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  {renderFileIcon(getFileIconType(file.type))}
                  <span className="text-sm truncate max-w-32">{file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAttachment(index)}
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="space-y-3">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-4 transition-all duration-200",
              dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-muted-foreground/40"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
              disabled={sending || uploading}
            />
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || uploading}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={sending || uploading}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Drag & drop files or click to attach
                </span>
              </div>
              
              <Button 
                type="submit" 
                disabled={sending || uploading || (!newMessage.trim() && attachments.length === 0)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {sending || uploading ? (
                  <>
                    <SkeletonLoader variant="button" className="mr-2" />
                    {uploading ? "Uploading..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Card>
  )
}
