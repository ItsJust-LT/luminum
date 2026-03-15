export interface OrganizationSettings {
  name: string
  slug: string
  logo?: string
  country: string
  currency: string
  payment_provider: string
  billing_email?: string
  tax_id?: string
  billing_address?: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
  metadata?: {
    type?: string
    industry?: string
    description?: string
    website?: string
    phone?: string
  }
  max_storage_bytes?: number
  used_storage_bytes?: number
  storage_usage_percent?: number
  storage_warning?: boolean
  analytics?: boolean
  emails?: boolean
}
