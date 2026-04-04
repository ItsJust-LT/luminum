/**
 * Notification styling utilities
 * Provides colors, badges, and styling based on notification type
 */

export interface NotificationTypeStyle {
  color: string
  bgColor: string
  borderColor: string
  badgeColor: string
  badgeTextColor: string
  icon: string
  /** Solid accent for progress bars, borders (hex). */
  accentHex: string
}

/**
 * Get notification type styling
 */
export function getNotificationTypeStyle(type: string): NotificationTypeStyle {
  const styles: Record<string, NotificationTypeStyle> = {
    // Success types (green)
    'member_joined': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-500',
      badgeTextColor: 'text-white',
      icon: '👥',
      accentHex: '#22c55e',
    },
    'invitation_accepted': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-500',
      badgeTextColor: 'text-white',
      icon: '✅',
      accentHex: '#22c55e',
    },
    'support_ticket_resolved': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-500',
      badgeTextColor: 'text-white',
      icon: '✅',
      accentHex: '#22c55e',
    },
    'new_user_registered': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-500',
      badgeTextColor: 'text-white',
      icon: '🆕',
      accentHex: '#22c55e',
    },
    'support_message': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-500',
      badgeTextColor: 'text-white',
      icon: '💬',
      accentHex: '#22c55e',
    },
    
    // Warning types (orange/yellow)
    'member_left': {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeColor: 'bg-orange-500',
      badgeTextColor: 'text-white',
      icon: '👋',
      accentHex: '#f97316',
    },
    'support_ticket_updated': {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeColor: 'bg-orange-500',
      badgeTextColor: 'text-white',
      icon: '✏️',
      accentHex: '#f97316',
    },
    'maintenance_notice': {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeColor: 'bg-orange-500',
      badgeTextColor: 'text-white',
      icon: '🔧',
      accentHex: '#f97316',
    },
    
    // Error types (red)
    'invitation_cancelled': {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-500',
      badgeTextColor: 'text-white',
      icon: '❌',
      accentHex: '#ef4444',
    },
    'organization_deleted': {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-500',
      badgeTextColor: 'text-white',
      icon: '🗑️',
      accentHex: '#ef4444',
    },
    
    // Info types (blue)
    'form_submission': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '📝',
      accentHex: '#3b82f6',
    },
    'email_received': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '📧',
      accentHex: '#3b82f6',
    },
    'member_invited': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '📧',
      accentHex: '#3b82f6',
    },
    'member_role_changed': {
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      badgeColor: 'bg-purple-500',
      badgeTextColor: 'text-white',
      icon: '🔄',
      accentHex: '#a855f7',
    },
    'new_support_ticket': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '🎫',
      accentHex: '#3b82f6',
    },
    'system_announcement': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '📢',
      accentHex: '#3b82f6',
    },
    'organization_created': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '🏢',
      accentHex: '#3b82f6',
    },
    'invoice_created': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeColor: 'bg-blue-500',
      badgeTextColor: 'text-white',
      icon: '📄',
      accentHex: '#3b82f6',
    },
    'invoice_paid': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-500',
      badgeTextColor: 'text-white',
      icon: '💵',
      accentHex: '#22c55e',
    },
    'blog_post_published': {
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      badgeColor: 'bg-indigo-500',
      badgeTextColor: 'text-white',
      icon: '📰',
      accentHex: '#6366f1',
    },
  }

  // Default styling for unknown types
  return styles[type] || {
    color: 'text-gray-700 dark:text-gray-200',
    bgColor: 'bg-muted/40',
    borderColor: 'border-border',
    badgeColor: 'bg-muted',
    badgeTextColor: 'text-foreground',
    icon: '🔔',
    accentHex: '#64748b',
  }
}

/**
 * Get priority badge styling
 */
export function getPriorityBadgeStyle(priority: string) {
  const styles: Record<string, { color: string; bg: string; text: string }> = {
    low: {
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      text: 'Low',
    },
    normal: {
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      text: 'Normal',
    },
    high: {
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      text: 'High',
    },
    urgent: {
      color: 'text-red-600',
      bg: 'bg-red-100',
      text: 'Urgent',
    },
  }

  return styles[priority] || styles.normal
}

/**
 * Get notification category color
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    organization: 'bg-blue-500',
    forms: 'bg-green-500',
    admin: 'bg-purple-500',
    system: 'bg-yellow-500',
    support: 'bg-orange-500',
  }

  return colors[category] || 'bg-gray-500'
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

