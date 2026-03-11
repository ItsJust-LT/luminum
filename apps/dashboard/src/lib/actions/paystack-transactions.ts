"use server"

import { serverGet } from "@/lib/api-server"

export interface PaystackTransactionFilters {
  page?: number
  perPage?: number
  status?: string
  from?: string
  to?: string
  currency?: string
}

export async function getTransactions(filters?: PaystackTransactionFilters) {
  return serverGet("/api/paystack/transactions", filters)
}

export async function getTransactionDetails(id: string) {
  return serverGet(`/api/paystack/transactions/${id}`)
}

export async function getRevenueAnalytics(params?: { from?: string; to?: string }) {
  return serverGet("/api/paystack/revenue-analytics", params)
}

export async function getTransactionTimeline(id: string) {
  return serverGet(`/api/paystack/transaction-timeline/${id}`)
}
