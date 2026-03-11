export interface SupportTicket {
  id: string
  ticket_number: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'website_issue' | 'account_issue'
  
  // User/Organization references
  user_id?: string
  organization_id?: string
  
  // Assignment
  assigned_to?: string
  assigned_at?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  resolved_at?: string
  closed_at?: string
  
  // Metadata
  metadata: Record<string, any>
  
  // Relations
  user?: {
    id: string
    name: string
    email: string
    image?: string
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
  assigned_user?: {
    id: string
    name: string
    email: string
    image?: string
  }
  messages?: SupportMessage[]
  participants?: SupportTicketParticipant[]
  attachments?: SupportAttachment[]
  message_count?: number
  unread_count?: number
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  message_type: 'text' | 'system' | 'file'
  
  // File attachments
  attachments: SupportAttachment[]
  
  // Read status
  is_read: boolean
  read_at?: string
  read_by?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Relations
  sender?: {
    id: string
    name: string
    email: string
    image?: string
    role?: string
  }
}

export interface SupportTicketParticipant {
  id: string
  ticket_id: string
  user_id: string
  role: 'creator' | 'assignee' | 'participant' | 'admin'
  joined_at: string
  
  // Relations
  user?: {
    id: string
    name: string
    email: string
    image?: string
    role?: string
  }
}

export interface SupportAttachment {
  id: string
  ticket_id: string
  message_id?: string
  uploaded_by: string
  
  // File information
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  
  // R2 storage (optional - for R2-based attachments)
  r2_key?: string
  r2_url?: string
  r2_bucket?: string
  
  // Cloudinary storage (optional - for Cloudinary-based attachments)
  cloudinary_public_id?: string
  cloudinary_url?: string
  
  // Timestamps
  created_at: string
  
  // Relations
  uploader?: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export interface CreateSupportTicketData {
  title: string
  description: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'website_issue' | 'account_issue'
  organization_id?: string
  attachments?: File[]
}

export interface UpdateSupportTicketData {
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'website_issue' | 'account_issue'
  assigned_to?: string
}

export interface CreateSupportMessageData {
  ticket_id: string
  message: string
  message_type?: 'text' | 'system' | 'file'
  attachments?: File[]
}

export interface SupportTicketFilters {
  status?: string[]
  priority?: string[]
  category?: string[]
  assigned_to?: string
  user_id?: string
  organization_id?: string
  search?: string
  date_from?: string
  date_to?: string
}

export interface SupportStats {
  total_tickets: number
  open_tickets: number
  in_progress_tickets: number
  resolved_tickets: number
  closed_tickets: number
  urgent_tickets: number
  high_priority_tickets: number
  avg_response_time: number
  avg_resolution_time: number
}

export interface SupportCategory {
  id: string
  name: string
  description: string
  icon: string
  common_issues: string[]
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'general',
    name: 'General Inquiry',
    description: 'General questions or information requests',
    icon: 'HelpCircle',
    common_issues: [
      'How to get started',
      'Account setup questions',
      'General platform questions'
    ]
  },
  {
    id: 'technical',
    name: 'Technical Support',
    description: 'Technical issues, bugs, or platform problems',
    icon: 'Wrench',
    common_issues: [
      'Login issues',
      'Platform not working',
      'Error messages',
      'Performance issues'
    ]
  },
  {
    id: 'billing',
    name: 'Billing & Payments',
    description: 'Questions about billing, payments, or subscriptions',
    icon: 'CreditCard',
    common_issues: [
      'Payment failed',
      'Billing questions',
      'Subscription changes',
      'Refund requests'
    ]
  },
  {
    id: 'feature_request',
    name: 'Feature Request',
    description: 'Suggestions for new features or improvements',
    icon: 'Lightbulb',
    common_issues: [
      'New feature ideas',
      'UI/UX improvements',
      'Integration requests',
      'Workflow enhancements'
    ]
  },
  {
    id: 'bug_report',
    name: 'Bug Report',
    description: 'Report bugs or unexpected behavior',
    icon: 'Bug',
    common_issues: [
      'Unexpected errors',
      'Broken functionality',
      'Data inconsistencies',
      'UI glitches'
    ]
  },
  {
    id: 'website_issue',
    name: 'Website Issues',
    description: 'Problems with your website or domain',
    icon: 'Globe',
    common_issues: [
      'Website not loading',
      'Domain issues',
      'SSL certificate problems',
      'Analytics not working'
    ]
  },
  {
    id: 'account_issue',
    name: 'Account Issues',
    description: 'Problems with your account or organization',
    icon: 'User',
    common_issues: [
      'Account access issues',
      'Organization settings',
      'User permissions',
      'Account deletion'
    ]
  }
]

export const SUPPORT_PRIORITIES = [
  { id: 'low', name: 'Low', color: 'bg-gray-100 text-gray-800', description: 'General questions or minor issues' },
  { id: 'medium', name: 'Medium', color: 'bg-blue-100 text-blue-800', description: 'Standard support requests' },
  { id: 'high', name: 'High', color: 'bg-orange-100 text-orange-800', description: 'Important issues affecting functionality' },
  { id: 'urgent', name: 'Urgent', color: 'bg-red-100 text-red-800', description: 'Critical issues requiring immediate attention' }
]

export const SUPPORT_STATUSES = [
  { id: 'open', name: 'Open', color: 'bg-green-100 text-green-800', description: 'New ticket awaiting response' },
  { id: 'in_progress', name: 'In Progress', color: 'bg-blue-100 text-blue-800', description: 'Ticket is being worked on' },
  { id: 'waiting_for_user', name: 'Waiting for User', color: 'bg-yellow-100 text-yellow-800', description: 'Awaiting user response' },
  { id: 'resolved', name: 'Resolved', color: 'bg-purple-100 text-purple-800', description: 'Issue has been resolved' },
  { id: 'closed', name: 'Closed', color: 'bg-gray-100 text-gray-800', description: 'Ticket has been closed' }
]
