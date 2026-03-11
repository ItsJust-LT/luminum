"use server"

import { serverGet } from "@/lib/api-server"

export async function getAdminDashboardStats() {
  return serverGet("/api/admin/dashboard-stats")
}
