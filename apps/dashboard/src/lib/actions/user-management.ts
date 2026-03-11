"use server"

import { serverGet, serverPatch, serverPost } from "@/lib/api-server"

export async function getAllUsersWithDetails(params?: Record<string, string | number | boolean | undefined>) {
  return serverGet("/api/user-management/users", params)
}

export async function getUserById(userId: string) {
  return serverGet(`/api/user-management/users/${userId}`)
}

export async function updateUser(userId: string, data: any) {
  return serverPatch(`/api/user-management/users/${userId}`, data)
}

export async function deactivateUser(userId: string, reason?: string) {
  return serverPost(`/api/user-management/users/${userId}/deactivate`, { reason })
}

export async function getUserStats() {
  return serverGet("/api/user-management/stats")
}

export async function getUserPaystackPayments(userId: string) {
  return serverGet("/api/user-management/paystack-payments", { userId })
}
