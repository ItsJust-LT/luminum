/**
 * Field detection utilities for form submissions
 * Automatically detects field types based on key names and values
 */

export type FieldType = 'email' | 'name' | 'phone' | 'number' | 'date' | 'url' | 'text' | 'textarea' | 'unknown'

export interface DetectedField {
  key: string
  value: any
  type: FieldType
  displayName: string
  icon: string
  priority: number // Higher number = more important, shown first
}

/**
 * Common field name patterns and their types
 */
const FIELD_PATTERNS: Record<string, { type: FieldType; icon: string; priority: number }> = {
  // Email fields
  'email': { type: 'email', icon: '📧', priority: 10 },
  'e-mail': { type: 'email', icon: '📧', priority: 10 },
  'mail': { type: 'email', icon: '📧', priority: 10 },
  'email_address': { type: 'email', icon: '📧', priority: 10 },
  
  // Name fields
  'name': { type: 'name', icon: '👤', priority: 9 },
  'full_name': { type: 'name', icon: '👤', priority: 9 },
  'first_name': { type: 'name', icon: '👤', priority: 8 },
  'last_name': { type: 'name', icon: '👤', priority: 8 },
  'fname': { type: 'name', icon: '👤', priority: 8 },
  'lname': { type: 'name', icon: '👤', priority: 8 },
  'username': { type: 'name', icon: '👤', priority: 7 },
  
  // Phone fields
  'phone': { type: 'phone', icon: '📞', priority: 8 },
  'telephone': { type: 'phone', icon: '📞', priority: 8 },
  'mobile': { type: 'phone', icon: '📱', priority: 8 },
  'cell': { type: 'phone', icon: '📱', priority: 8 },
  'phone_number': { type: 'phone', icon: '📞', priority: 8 },
  
  // Number fields
  'age': { type: 'number', icon: '🔢', priority: 6 },
  'quantity': { type: 'number', icon: '🔢', priority: 6 },
  'amount': { type: 'number', icon: '💰', priority: 7 },
  'price': { type: 'number', icon: '💰', priority: 7 },
  'count': { type: 'number', icon: '🔢', priority: 6 },
  'number': { type: 'number', icon: '🔢', priority: 6 },
  
  // Date fields
  'date': { type: 'date', icon: '📅', priority: 6 },
  'birthday': { type: 'date', icon: '🎂', priority: 6 },
  'birth_date': { type: 'date', icon: '🎂', priority: 6 },
  'dob': { type: 'date', icon: '🎂', priority: 6 },
  'created_at': { type: 'date', icon: '📅', priority: 5 },
  'updated_at': { type: 'date', icon: '📅', priority: 5 },
  
  // URL fields
  'url': { type: 'url', icon: '🔗', priority: 5 },
  'website': { type: 'url', icon: '🌐', priority: 5 },
  'link': { type: 'url', icon: '🔗', priority: 5 },
  'homepage': { type: 'url', icon: '🏠', priority: 5 },
  
  // Message/Text fields
  'message': { type: 'textarea', icon: '💬', priority: 7 },
  'comment': { type: 'textarea', icon: '💬', priority: 6 },
  'feedback': { type: 'textarea', icon: '💬', priority: 6 },
  'description': { type: 'textarea', icon: '📝', priority: 6 },
  'notes': { type: 'textarea', icon: '📝', priority: 5 },
  'details': { type: 'textarea', icon: '📝', priority: 5 },
}

/**
 * Detect field type based on key name and value
 */
export function detectFieldType(key: string, value: any): FieldType {
  const lowerKey = key.toLowerCase().replace(/[_-]/g, ' ')
  
  // Check against known patterns
  for (const [pattern, config] of Object.entries(FIELD_PATTERNS)) {
    if (lowerKey.includes(pattern)) {
      return config.type
    }
  }
  
  // Value-based detection
  if (typeof value === 'string') {
    // Email detection
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'email'
    }
    
    // Phone detection
    if (/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return 'phone'
    }
    
    // URL detection
    if (/^https?:\/\/.+/.test(value)) {
      return 'url'
    }
    
    // Date detection
    if (!isNaN(Date.parse(value)) && value.length > 8) {
      return 'date'
    }
    
    // Number detection
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return 'number'
    }
    
    // Textarea detection (long text)
    if (value.length > 100) {
      return 'textarea'
    }
  }
  
  // Number detection
  if (typeof value === 'number') {
    return 'number'
  }
  
  return 'text'
}

/**
 * Get field configuration based on type
 */
export function getFieldConfig(type: FieldType): { icon: string; priority: number } {
  const configs = {
    email: { icon: '📧', priority: 10 },
    name: { icon: '👤', priority: 9 },
    phone: { icon: '📞', priority: 8 },
    number: { icon: '🔢', priority: 6 },
    date: { icon: '📅', priority: 6 },
    url: { icon: '🔗', priority: 5 },
    text: { icon: '📝', priority: 4 },
    textarea: { icon: '💬', priority: 7 },
    unknown: { icon: '❓', priority: 1 }
  }
  
  return configs[type] || configs.unknown
}

/**
 * Detect and organize form fields
 */
export function detectFormFields(data: Record<string, any>): DetectedField[] {
  const fields: DetectedField[] = []
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    
    const type = detectFieldType(key, value)
    const config = getFieldConfig(type)
    
    // Check if we have a specific pattern match for better icon/priority
    const lowerKey = key.toLowerCase().replace(/[_-]/g, ' ')
    for (const [pattern, patternConfig] of Object.entries(FIELD_PATTERNS)) {
      if (lowerKey.includes(pattern)) {
        fields.push({
          key,
          value,
          type,
          displayName: formatFieldName(key),
          icon: patternConfig.icon,
          priority: patternConfig.priority
        })
        break
      }
    }
    
    // If no pattern match, use generic config
    if (!fields.some(f => f.key === key)) {
      fields.push({
        key,
        value,
        type,
        displayName: formatFieldName(key),
        icon: config.icon,
        priority: config.priority
      })
    }
  }
  
  // Sort by priority (highest first), then alphabetically
  return fields.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    return a.displayName.localeCompare(b.displayName)
  })
}

/**
 * Format field name for display
 */
export function formatFieldName(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim()
}

/**
 * Get primary fields (name, email, phone) for table display
 */
export function getPrimaryFields(fields: DetectedField[]): DetectedField[] {
  return fields.filter(field => 
    field.type === 'name' || 
    field.type === 'email' || 
    field.type === 'phone'
  ).slice(0, 3) // Limit to 3 primary fields
}

/**
 * Get secondary fields (everything else)
 */
export function getSecondaryFields(fields: DetectedField[]): DetectedField[] {
  return fields.filter(field => 
    field.type !== 'name' && 
    field.type !== 'email' && 
    field.type !== 'phone'
  )
}

/**
 * Format field value for display
 */
export function formatFieldValue(field: DetectedField): string {
  const { value, type } = field
  
  switch (type) {
    case 'email':
      return value
    case 'phone':
      return formatPhoneNumber(value)
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : value
    case 'date':
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return value
      }
    case 'url':
      return value
    case 'textarea':
      return value.length > 100 ? value.substring(0, 100) + '...' : value
    default:
      return String(value)
  }
}

/**
 * Format phone number for display (South African format)
 */
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  // South African numbers
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Local format: 012 345 6789
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('27')) {
    // International format: +27 12 345 6789
    return `+27 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  } else if (cleaned.length === 12 && cleaned.startsWith('27')) {
    // International format with leading 0: +27 12 345 6789
    return `+27 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  
  return phone
}

/**
 * Get contact methods available for a submission
 */
export function getContactMethods(fields: DetectedField[]): {
  email?: string
  phone?: string
  whatsapp?: string
} {
  const contactMethods: { email?: string; phone?: string; whatsapp?: string } = {}
  
  for (const field of fields) {
    if (field.type === 'email' && field.value) {
      contactMethods.email = field.value
    } else if (field.type === 'phone' && field.value) {
      contactMethods.phone = field.value
      // Also set as WhatsApp if it's a valid phone number
      const cleaned = field.value.replace(/\D/g, '')
      if (cleaned.length >= 10) {
        contactMethods.whatsapp = field.value
      }
    }
  }
  
  return contactMethods
}

/**
 * Format phone number for WhatsApp URL (South African format)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  // Handle South African numbers
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Convert local format (0123456789) to international (+27123456789)
    return `27${cleaned.slice(1)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('27')) {
    // Already in international format
    return cleaned
  } else if (cleaned.length === 12 && cleaned.startsWith('27')) {
    // International format with extra digit
    return cleaned
  }
  
  return cleaned
}

/**
 * Generate WhatsApp URL
 */
export function getWhatsAppUrl(phone: string, message?: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone)
  const encodedMessage = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

/**
 * Generate tel: URL for phone calls
 */
export function getTelUrl(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  return `tel:${cleaned}`
}
