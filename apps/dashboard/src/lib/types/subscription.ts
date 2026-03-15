export interface PaymentData {
  id?: string
  amount?: number
  currency?: string
  status?: string
  created_at?: string | Date
  paid_at?: string | Date
  payment_method?: string | null
  metadata?: Record<string, unknown>
}

export interface SubscriptionData {
  id: string
  organization_id?: string
  provider?: string
  type?: string
  status?: string
  plan_name?: string | null
  amount?: number | null
  currency?: string | null
  payments?: PaymentData[]
  [key: string]: unknown
}

export interface PaystackSubscription {
  id?: string
  subscription_code?: string
  email?: string
  amount?: number
  status?: string
  [key: string]: unknown
}

export interface PaystackCustomerWithSubscriptions {
  id?: string
  email?: string
  customer_code?: string
  subscriptions?: PaystackSubscription[]
  [key: string]: unknown
}
