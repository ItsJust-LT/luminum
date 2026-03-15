"use server"

import { serverGet, serverPatch, serverPost } from "@/lib/api-server"

// Dashboard stats
export async function getAdminDashboardStats() {
  return serverGet("/api/admin/dashboard-stats")
}

// Analytics
export async function getAdminAnalyticsOverview(start: string, end: string) {
  return serverGet("/api/admin/analytics/overview", { start, end })
}

export async function getAdminAnalyticsTimeseries(start: string, end: string, granularity: string = "day") {
  return serverGet("/api/admin/analytics/timeseries", { start, end, granularity })
}

export async function getAdminAnalyticsBreakdown(start: string, end: string, by: string = "organization", limit: number = 20) {
  return serverGet("/api/admin/analytics/breakdown", { start, end, by, limit })
}

export async function getAdminAnalyticsTopPages(start: string, end: string, limit: number = 10) {
  return serverGet("/api/admin/analytics/top-pages", { start, end, limit })
}

export async function getAdminAnalyticsCountries(start: string, end: string, limit: number = 10) {
  return serverGet("/api/admin/analytics/countries", { start, end, limit })
}

export async function getAdminAnalyticsDevices(start: string, end: string, limit: number = 5) {
  return serverGet("/api/admin/analytics/devices", { start, end, limit })
}

// Forms
export async function getAdminFormSubmissions(params?: {
  organizationId?: string
  websiteId?: string
  seen?: boolean
  contacted?: boolean
  start?: string
  end?: string
  limit?: number
  offset?: number
}) {
  return serverGet("/api/admin/forms/submissions", params)
}

export async function getAdminFormStats() {
  return serverGet("/api/admin/forms/stats")
}

export async function updateAdminFormSubmissionStatus(id: string, data: { seen?: boolean; contacted?: boolean }) {
  return serverPatch(`/api/admin/forms/submissions/${id}/status`, data)
}

// Emails
export async function getAdminEmailStats(start?: string, end?: string) {
  return serverGet("/api/admin/emails/stats", { start, end })
}

export async function getAdminEmails(params?: {
  organizationId?: string
  read?: boolean
  direction?: string
  search?: string
  limit?: number
  offset?: number
}) {
  return serverGet("/api/admin/emails", params)
}

// Websites
export async function getAdminWebsites(params?: {
  organizationId?: string
  analytics?: boolean
  search?: string
  limit?: number
  offset?: number
}) {
  return serverGet("/api/admin/websites", params)
}

export async function getAdminWebsiteStats() {
  return serverGet("/api/admin/websites/stats")
}

// User management
export async function reactivateUser(userId: string) {
  return serverPost(`/api/user-management/users/${userId}/reactivate`)
}

export async function getUserManagementStats() {
  return serverGet("/api/user-management/stats")
}

export async function getUserDetails(userId: string) {
  return serverGet(`/api/user-management/users/${userId}`)
}

export async function updateUser(userId: string, data: any) {
  return serverPatch(`/api/user-management/users/${userId}`, data)
}

export async function deactivateUser(userId: string, reason?: string) {
  return serverPost(`/api/user-management/users/${userId}/deactivate`, { reason })
}

// Activity analytics
export async function getActivityOverview() {
  return serverGet("/api/admin/activity/overview")
}

export async function getActivityUsers(period: string = "week", search?: string, limit: number = 50, offset: number = 0) {
  return serverGet("/api/admin/activity/users", { period, search, limit, offset })
}

export async function getActivityUser(userId: string, period: string = "month") {
  return serverGet(`/api/admin/activity/user/${userId}`, { period })
}

// Server monitoring
export async function getServerMetrics() {
  return serverGet("/api/admin/monitoring/metrics")
}
