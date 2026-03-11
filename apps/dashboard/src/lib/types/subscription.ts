export interface Subscription {
    id: string
    organization_id: string
    provider: string
    provider_subscription_id?: string
    provider_customer_id?: string
    plan_name?: string
    plan_id?: string
    status: "active" | "trialing" | "free" | "canceled" | "expired" | "past_due"
    type: "paid" | "trial" | "free"
    amount?: number
    currency: string
    billing_cycle?: string
    trial_start_date?: string
    trial_end_date?: string
    current_period_start?: string
    current_period_end?: string
    canceled_at?: string
    created_at: string
    updated_at: string
    metadata?: Record<string, any>
  }
  
  export interface Payment {
    id: string
    subscription_id: string
    provider: string
    provider_payment_id?: string
    provider_transaction_id?: string
    amount: number
    currency: string
    status: "success" | "failed" | "pending" | "refunded"
    payment_method?: string
    paid_at?: string
    created_at: string
    metadata?: Record<string, any>
  }
  
  export interface Organization {
    id: string
    name: string
    slug: string
    logo?: string
    country: string
    currency: string
    payment_provider: string
    subscription_status?: string
    primary_subscription_id?: string
    max_subscriptions?: number
    billing_email?: string
    tax_id?: string
    billing_address?: Record<string, any>
    createdAt: string
    metadata?: string
  }
  
  export interface SubscriptionWithPayments extends Subscription {
    payments: Payment[]
  }
  
  export interface OrganizationWithSubscriptions extends Organization {
    subscriptions: SubscriptionWithPayments[]
    primary_subscription?: Subscription
    members: Array<{
      id: string
      userId: string
      role: string
      createdAt: string
      user: {
        id: string
        name: string
        email: string
      }
    }>
  }
  
  export interface SubscriptionConfig {
    type: "trial" | "free" | "existing_paid"
    trialEndDate?: string
    paystackSubscriptionId?: string
  }
  
  export interface CreateOrganizationWithOwnerParams {
    organizationData: {
      name: string
      slug: string
      logo: string
      domain?: string
      country: string
      currency: string
      paymentProvider: string
    }
    ownerAssignment: {
      type: "existing_user" | "invitation"
      userId?: string
      email?: string
      name?: string
    }
    subscriptionData?: SubscriptionConfig
  }
  
  export interface PaystackCustomer {
    id: number
    customer_code: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
  }
  
  export interface PaystackSubscription {
    id: number
    subscription_code: string
    email_token: string
    amount: number
    cron_expression: string
    next_payment_date: string
    open_invoice?: string
    createdAt: string
    plan: {
      id: number
      name: string
      plan_code: string
      description?: string
      amount: number
      interval: string
      send_invoices: boolean
      send_sms: boolean
      currency: string
    }
    customer: PaystackCustomer
    status: "active" | "non-renewing" | "cancelled"
  }
  
  export interface PaystackCustomerWithSubscriptions {
    customer: PaystackCustomer
    activeSubscriptions: PaystackSubscription[]
  }
  