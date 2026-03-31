"use client"

import { createContext, useContext, type ReactNode, useState, useEffect, useCallback, useMemo } from "react"
import { isInsufficientPermissionsError } from "@luminum/api-client"
import { hasAllPermissions } from "@luminum/org-permissions"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { SubscriptionData, PaymentData } from "@/lib/types/subscription"

export type OrganizationRoleDisplay = {
  id: string
  name: string
  color: string
  iconKey: string
  kind: string
}

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
  members?: any[]
  role?: string
  primary_subscription_id?: string
  subscription_status?: string
  emails_enabled?: boolean
  whatsapp_enabled?: boolean
  analytics_enabled?: boolean
  blogs_enabled?: boolean
  invoices_enabled?: boolean
}

interface SubscriptionInfo extends SubscriptionData {
  payments?: PaymentData[]
  external_details?: any
}

interface BillingInfo {
  totalSpent: number
  currency: string
  activeSubscriptions: number
  nextPaymentDate?: string
  paymentMethod?: {
    last4: string
    brand: string
    type: string
  }
  recentTransactions: any[]
}

interface OrganizationContextType {
  // Core organization data
  organization: Organization | null
  userRole: string | null
  loading: boolean
  error: string | null
  /** Effective permission ids for the current user in this org (expanded server-side). */
  permissionSet: Set<string>
  /** False until member access has been loaded for this org. */
  permissionsReady: boolean
  organizationRole: OrganizationRoleDisplay | null
  organizationRoleId: string | null
  hasAllPermissions: (required: readonly string[]) => boolean

  // Subscription data
  subscriptions: SubscriptionInfo[]
  primarySubscription: SubscriptionInfo | null
  subscriptionsLoading: boolean
  subscriptionsError: string | null

  // Billing data
  billingInfo: BillingInfo | null
  billingLoading: boolean
  billingError: string | null

  // Actions
  refreshOrganization: () => Promise<void>
  refreshSubscriptions: () => Promise<void>
  refreshBilling: () => Promise<void>
  syncSubscriptionWithProvider: (subscriptionId: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

const EMPTY_PERMISSION_SET = new Set<string>()

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider")
  }
  return context
}

// Convenience hooks for specific data
export const useSubscriptions = () => {
  const { subscriptions, subscriptionsLoading, subscriptionsError, refreshSubscriptions } = useOrganization()
  return { subscriptions, loading: subscriptionsLoading, error: subscriptionsError, refresh: refreshSubscriptions }
}

export const usePrimarySubscription = () => {
  const { primarySubscription, subscriptionsLoading, subscriptionsError } = useOrganization()
  return { subscription: primarySubscription, loading: subscriptionsLoading, error: subscriptionsError }
}

export const useBillingInfo = () => {
  const { billingInfo, billingLoading, billingError, refreshBilling } = useOrganization()
  return { billingInfo, loading: billingLoading, error: billingError, refresh: refreshBilling }
}

interface OrganizationProviderProps {
  children: ReactNode
  organization: Organization | null
  userRole: string | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => Promise<void>
  permissionSet?: Set<string>
  permissionsReady?: boolean
  organizationRole?: OrganizationRoleDisplay | null
  organizationRoleId?: string | null
}

export const OrganizationProvider = ({
  children,
  organization,
  userRole,
  loading = false,
  error = null,
  onRefresh,
  permissionSet: permissionSetProp,
  permissionsReady = false,
  organizationRole = null,
  organizationRoleId = null,
}: OrganizationProviderProps) => {
  const permissionSet = permissionSetProp ?? EMPTY_PERMISSION_SET
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([])
  const [primarySubscription, setPrimarySubscription] = useState<SubscriptionInfo | null>(null)
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false)
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null)

  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const loadSubscriptions = useCallback(async () => {
    if (!organization?.id) return

    setSubscriptionsLoading(true)
    setSubscriptionsError(null)

    try {
      const result = await api.subscriptions.list(organization.id)

      if (result.success) {
        const enhancedSubscriptions: SubscriptionInfo[] = []

        // Fetch Paystack details once for the org (used for active subscription)
        let paystackData: any = null
        try {
          const extRes = await api.paystack.getSubscriptionDetails(organization.id)
          if (extRes.success && extRes.paystackData) paystackData = extRes.paystackData
        } catch (e) {
          console.warn("Failed to fetch Paystack subscription details:", e)
        }

        for (const sub of result.subscriptions || []) {
          const enhancedSub = {
            ...sub,
            payments: (sub.payments || []).map((p: any) => ({
              ...p,
              subscription_id: sub.id,
              provider: sub.provider,
              amount: Number(p.amount),
              created_at: p.created_at ? (typeof p.created_at === "string" ? p.created_at : p.created_at.toISOString()) : new Date().toISOString(),
              paid_at: p.paid_at ? (typeof p.paid_at === "string" ? p.paid_at : p.paid_at.toISOString()) : undefined,
              payment_method: p.payment_method ?? undefined,
              metadata: p.metadata && typeof p.metadata === "object" ? p.metadata : {},
            })),
            external_details: sub.provider === "paystack" && paystackData ? paystackData : undefined,
          }
          enhancedSubscriptions.push(enhancedSub as any)
        }

        setSubscriptions(enhancedSubscriptions)

        const primary = enhancedSubscriptions.find((sub) => sub.id === organization.primary_subscription_id) ?? enhancedSubscriptions[0]
        setPrimarySubscription(primary || null)
      } else {
        setSubscriptionsError(result.error || "Failed to load subscriptions")
      }
    } catch (error) {
      setSubscriptionsError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setSubscriptionsLoading(false)
    }
  }, [organization?.id])

  const loadBillingInfo = useCallback(async () => {
    if (!organization?.id || subscriptions.length === 0) return

    setBillingLoading(true)
    setBillingError(null)

    try {
      let totalSpent = 0
      let currency = "ZAR"
      let activeSubscriptions = 0
      let nextPaymentDate: string | undefined
      let paymentMethod: BillingInfo["paymentMethod"]
      let recentTransactions: any[] = []

      // Calculate billing info from subscriptions
      for (const subscription of subscriptions) {
        if (subscription.status === "active") {
          activeSubscriptions++
        }

        // Get payment history
        if (subscription.payments) {
          const successfulPayments = subscription.payments.filter((p) => p.status === "success")
          totalSpent += successfulPayments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)

          if (successfulPayments.length > 0) {
            currency = successfulPayments[0].currency ?? currency
          }
        }

        // Get external billing data
        if (subscription.external_details) {
          const external = subscription.external_details

          // Set next payment date from the most recent active subscription
          if (subscription.status === "active" && external.next_payment_date) {
            if (!nextPaymentDate || new Date(external.next_payment_date) < new Date(nextPaymentDate)) {
              nextPaymentDate = external.next_payment_date
            }
          }

          // Set payment method from authorization
          if (external.authorization && !paymentMethod) {
            paymentMethod = {
              last4: external.authorization.last4,
              brand: external.authorization.brand,
              type: external.authorization.card_type,
            }
          }

          // Get recent transactions
          if (external.customer?.customer_code) {
            try {
              const transactionsResult = await api.paystack.getCustomerTransactions(organization.id)
              const tx = transactionsResult as { success?: boolean; transactions?: any[]; data?: any[] }
              if (tx.success && (tx.transactions || tx.data)) {
                recentTransactions = [...recentTransactions, ...(tx.transactions || tx.data || [])]
              }
            } catch (error) {
              console.warn("Failed to fetch transactions:", error)
            }
          }
        }
      }

      // Sort recent transactions by date
      recentTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setBillingInfo({
        totalSpent,
        currency,
        activeSubscriptions,
        nextPaymentDate,
        paymentMethod,
        recentTransactions: recentTransactions.slice(0, 10), // Keep only 10 most recent
      })
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Failed to load billing info")
    } finally {
      setBillingLoading(false)
    }
  }, [organization?.id, subscriptions])

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isInsufficientPermissionsError(e.reason)) {
        e.preventDefault()
        const req = e.reason.required.length ? e.reason.required.join(", ") : "additional access"
        toast.error(`You need: ${req}`)
      }
    }
    window.addEventListener("unhandledrejection", onRejection)
    return () => window.removeEventListener("unhandledrejection", onRejection)
  }, [])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  useEffect(() => {
    loadBillingInfo()
  }, [loadBillingInfo])

  const refreshOrganization = useCallback(async () => {
    if (onRefresh) {
      await onRefresh()
    }
    await loadSubscriptions()
  }, [onRefresh, loadSubscriptions])

  const refreshSubscriptions = useCallback(async () => {
    await loadSubscriptions()
  }, [loadSubscriptions])

  const refreshBilling = useCallback(async () => {
    await loadBillingInfo()
  }, [loadBillingInfo])

  const checkPermissions = useMemo(
    () => (required: readonly string[]) => hasAllPermissions(permissionSet, required),
    [permissionSet],
  )

  const syncSubscriptionWithProvider = useCallback(
    async (subscriptionId: string) => {
      // This would call the sync function from subscription-management.ts
      // and then refresh the subscriptions
      try {
        await api.subscriptions.sync(subscriptionId)
        await loadSubscriptions()
      } catch (error) {
        console.error("Failed to sync subscription:", error)
      }
    },
    [loadSubscriptions],
  )

  const value: OrganizationContextType = {
    // Core organization data
    organization,
    userRole,
    loading,
    error,
    permissionSet,
    permissionsReady,
    organizationRole: organizationRole ?? null,
    organizationRoleId: organizationRoleId ?? null,
    hasAllPermissions: checkPermissions,

    // Subscription data
    subscriptions,
    primarySubscription,
    subscriptionsLoading,
    subscriptionsError,

    // Billing data
    billingInfo,
    billingLoading,
    billingError,

    // Actions
    refreshOrganization,
    refreshSubscriptions,
    refreshBilling,
    syncSubscriptionWithProvider,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}
