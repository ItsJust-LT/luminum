"use server"

import { serverGet, serverPost } from "@/lib/api-server"

export async function getSubscriptionDetails(organizationId: string) {
  return serverGet("/api/paystack/subscription-details", { organizationId })
}

export async function getCustomerTransactions(organizationId: string) {
  return serverGet("/api/paystack/customer-transactions", { organizationId })
}

export async function generateUpdateCardLink(subscriptionCode: string) {
  return serverPost("/api/paystack/update-card-link", { subscriptionCode })
}
