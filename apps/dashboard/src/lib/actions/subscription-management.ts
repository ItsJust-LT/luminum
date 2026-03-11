"use server"

import { serverGet, serverPost } from "@/lib/api-server"

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

export async function createSubscription(data: any) {
  return serverPost("/api/subscriptions", data)
}

export async function setPrimarySubscription(organizationId: string, subscriptionId: string) {
  return serverPost("/api/subscriptions/set-primary", { organizationId, subscriptionId })
}

export async function getOrganizationSubscriptions(organizationId: string) {
  return serverGet("/api/subscriptions", { organizationId })
}

/** Alias for getOrganizationSubscriptions used by organization context. */
export const getOrganizationSubscriptionsEnhanced = getOrganizationSubscriptions

export async function recordPayment(data: any) {
  return serverPost("/api/subscriptions/record-payment", data)
}

export async function syncSubscription(subscriptionId: string) {
  return serverPost("/api/subscriptions/sync", { subscriptionId })
}
