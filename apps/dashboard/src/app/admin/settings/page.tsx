"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  Settings, 
  Shield, 
  Mail, 
  Globe, 
  RefreshCw,
  AlertTriangle,
  Crown,
  Info,
  Terminal,
  Users,
  Building2,
  UserCircle,
  ArrowRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemInfo, setSystemInfo] = useState({
    totalOrganizations: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    systemUptime: "N/A",
    lastBackup: "N/A",
    environment: process.env.NODE_ENV || "development"
  })

  useEffect(() => {
    fetchSystemInfo()
  }, [])

  const fetchSystemInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.admin.getOrganizations() as { success?: boolean; data?: any[]; organizations?: any[]; error?: string }
      const orgs = result?.organizations ?? result?.data
      if (result?.success && orgs) {
        
        // Calculate system statistics
        const totalOrgs = orgs.length
        const allUsers = new Set()
        let activeSubscriptions = 0
        
        orgs.forEach((org: any) => {
          if (org.members) {
            org.members.forEach((member: any) => {
              if (member.user) {
                allUsers.add(member.user.id)
              }
            })
          }
          if (org.subscriptions) {
            org.subscriptions.forEach((sub: any) => {
              if (sub.status === 'active') {
                activeSubscriptions++
              }
            })
          }
        })
        
        setSystemInfo({
          totalOrganizations: totalOrgs,
          totalUsers: allUsers.size,
          activeSubscriptions,
          systemUptime: "N/A", // No monitoring system
          lastBackup: "N/A", // No backup system
          environment: process.env.NODE_ENV || "development"
        })
      } else {
        setError(result.error || "Failed to fetch system information")
      }
    } catch (error) {
      console.error("Error fetching system info:", error)
      setError("Failed to fetch system information")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              Admin Settings
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Platform overview, shortcuts, and configuration notes. Per-organization options (name, logo, team) live in each workspace’s settings.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Admin home
              </CardTitle>
              <CardDescription>Dashboards and high-level tools</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/admin">
                  Open admin console
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Users
              </CardTitle>
              <CardDescription>Roles, search, and user records</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/admin/users">
                  Manage users
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Organizations
              </CardTitle>
              <CardDescription>Workspaces across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/admin/organizations">
                  Manage organizations
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Environment
              </CardTitle>
              <CardDescription>Masked server configuration (read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/admin/environment">
                  View environment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-primary" />
                Your login
              </CardTitle>
              <CardDescription>Personal profile (not platform-wide)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/account/settings">
                  Account settings
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="mb-8">
          <Button 
            onClick={fetchSystemInfo} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">Error Loading Data</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>
              Current system status and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant={systemInfo.environment === 'production' ? 'default' : 'secondary'}>
                      {systemInfo.environment}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Organizations</label>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{systemInfo.totalOrganizations}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Users</label>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{systemInfo.totalUsers}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Active Subscriptions</label>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{systemInfo.activeSubscriptions}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication
            </CardTitle>
            <CardDescription>
              Better Auth configuration and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Authentication Provider</h4>
              <p className="text-sm text-muted-foreground">
                Better Auth with email/password and Google OAuth support
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-700 dark:text-green-300">Status</h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                Authentication system is active and functioning properly
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Auth and transactional email (Resend, etc.) and organization inbox are configured via server environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Runtime environment</h4>
              <p className="text-sm text-muted-foreground mb-3">
                View masked secrets and deployment-related variables (read-only). Values come from the API process
                environment (e.g. server .env produced from GitHub Actions).
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/environment" className="inline-flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Open Environment
                </Link>
              </Button>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Typical features</h4>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• User and organization invitations</li>
                <li>• Password reset and email verification</li>
                <li>• Organization email inbox (when enabled)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Database Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Database & Storage
            </CardTitle>
            <CardDescription>
              Database and file storage configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Database</h4>
              <p className="text-sm text-muted-foreground">
                PostgreSQL database via Supabase
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-orange-700 dark:text-orange-300">Note</h4>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Database backups and maintenance are handled by Supabase. 
                No additional backup configuration is needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Limitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              System Limitations
            </CardTitle>
            <CardDescription>
              Features not available in the current system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-300">Not Available</h4>
              <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                <li>• System uptime monitoring</li>
                <li>• Custom SMTP configuration</li>
                <li>• Database backup management</li>
                <li>• API rate limiting</li>
                <li>• Maintenance mode</li>
                <li>• System-wide settings persistence</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">Why These Features Are Not Available</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This system is designed to be simple and focused on core functionality. 
                Advanced system administration features would require additional infrastructure 
                and monitoring systems that are not currently implemented.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
