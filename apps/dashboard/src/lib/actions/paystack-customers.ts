"use server"

import { serverGet } from "@/lib/api-server"

export async function getCustomersWithActiveSubscriptions(email?: string) {
  if (email) {
    return serverGet("/api/paystack/customers", { email })
  }
  return serverGet("/api/paystack/customers")
}

export async function getPaystackCustomers() {
  return serverGet("/api/paystack/customers")
}
