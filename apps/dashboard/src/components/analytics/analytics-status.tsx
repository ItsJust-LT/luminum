"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { BarChart3, AlertCircle, CheckCircle, Settings, Shield } from "lucide-react"
import { toggleWebsiteAnalytics } from "@/lib/supabase/websites"
import { useSession } from "@/lib/auth/client"
import type { Website } from "@/lib/types/websites"

interface AnalyticsStatusProps {
  website: Website
  onAnalyticsToggle?: (enabled: boolean) => void
  userRole?: string
  showToggle?: boolean
  compact?: boolean
}

export function AnalyticsStatus({
  website,
  onAnalyticsToggle,
  userRole,
  showToggle = true,
  compact = false,
}: AnalyticsStatusProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(website.analytics)
  const { data: session } = useSession()

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin" || userRole === "admin"
  const shouldShowToggle = showToggle && isAdmin

  const handleToggleAnalytics = async (enabled: boolean) => {
    if (!isAdmin) return

    setIsToggling(true)
    try {
      const result = await toggleWebsiteAnalytics(website.id, enabled)
      if (result.data) {
        setAnalyticsEnabled(enabled)
        onAnalyticsToggle?.(enabled)
      }
    } catch (error) {
      console.error("Error toggling analytics:", error)
    } finally {
      setIsToggling(false)
    }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {analyticsEnabled ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-sm font-medium">{analyticsEnabled ? "Analytics Active" : "Analytics Disabled"}</span>
          </div>
          <Badge variant={analyticsEnabled ? "default" : "secondary"} className="text-xs">
            {analyticsEnabled ? "Tracking" : "Off"}
          </Badge>
        </div>

        {analyticsEnabled ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Visitors</span>
              <p className="font-semibold">--</p>
            </div>
            <div>
              <span className="text-muted-foreground">Views</span>
              <p className="font-semibold">--</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isAdmin ? "Enable analytics to track metrics" : "Contact admin to enable tracking"}
          </p>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Website Analytics
        </CardTitle>
        <CardDescription>Track visitor behavior and website performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {analyticsEnabled ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
            <span className="font-medium">Analytics {analyticsEnabled ? "Enabled" : "Disabled"}</span>
          </div>
          <Badge variant={analyticsEnabled ? "default" : "secondary"}>{analyticsEnabled ? "Active" : "Inactive"}</Badge>
        </div>

        {!analyticsEnabled && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Analytics Not Set Up</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {isAdmin
                    ? "Enable analytics to track page views, visitor behavior, and website performance metrics."
                    : "Analytics tracking is currently disabled. Contact an administrator to enable analytics."}
                </p>
              </div>
            </div>
          </div>
        )}

        {shouldShowToggle ? (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Enable Analytics Tracking</p>
              <p className="text-sm text-muted-foreground">Collect visitor data and performance metrics</p>
            </div>
            <Switch checked={analyticsEnabled} onCheckedChange={handleToggleAnalytics} disabled={isToggling} />
          </div>
        ) : !isAdmin ? (
          <div className="p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">Admin Only Setting</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Only administrators can enable or disable analytics tracking for websites.
            </p>
          </div>
        ) : null}

        {analyticsEnabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Monthly Visitors</p>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Data loading...</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Page Views</p>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Data loading...</p>
              </div>
            </div>

            <Button variant="outline" className="w-full bg-transparent">
              <Settings className="w-4 h-4 mr-2" />
              Configure Analytics Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
