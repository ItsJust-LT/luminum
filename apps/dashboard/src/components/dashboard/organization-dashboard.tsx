"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, LayoutDashboard, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import type { Website } from "@/lib/types/websites"
import { useOrganization } from "@/lib/contexts/organization-context"
import { Skeleton } from "@/components/ui/skeleton"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

export function OrganizationDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const { organization, userRole, loading, error } = useOrganization()
  const [website, setWebsite] = useState<Website | null>(null)
  const [websiteLoading, setWebsiteLoading] = useState(true)

  useEffect(() => {
    if (organization) {
      fetchWebsite()
    }
  }, [organization?.id])

  const fetchWebsite = async () => {
    if (!organization) return
    
    try {
      setWebsiteLoading(true)
      const res = await api.websites.list(organization.id) as { data?: Website[] }
      const websites = res?.data
      if (websites && websites.length > 0) {
        setWebsite(websites[0])
      }
    } catch (error) {
      console.error("Error fetching website:", error)
    } finally {
      setWebsiteLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "member":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const DashboardSkeleton = () => (
    <div className="space-y-5 sm:space-y-6 md:space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 bg-card/50 shadow-sm app-card overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl mb-3 sm:mb-4" />
              <Skeleton className="h-6 sm:h-8 w-14 sm:w-20 mb-2" />
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-0 bg-card/50 shadow-sm app-card">
          <CardContent className="p-4 sm:p-6">
            <Skeleton className="h-5 w-28 mb-2" />
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-11 sm:h-12 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/50 shadow-sm app-card">
          <CardContent className="p-4 sm:p-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-36 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (loading) {
    return (
      <AppPageContainer fullWidth>
        <DashboardSkeleton />
      </AppPageContainer>
    )
  }

  if (error || !organization) {
    return (
      <AppPageContainer fullWidth className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md border-destructive/20 app-card">
          <CardContent className="pt-6 pb-6 px-4 sm:px-6 text-center">
            <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground text-sm mb-5">{error || "Organization not found"}</p>
            <Button onClick={() => router.push("/dashboard")} className="w-full rounded-lg app-touch">
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer fullWidth className="min-h-0">
      {/* Hero – mobile-first, app-hero radius */}
      <div className="relative overflow-hidden app-hero bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shadow-sm shrink-0">
                <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground truncate">
                  {organization.name}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
                  Overview · Last 7 days
                </p>
              </div>
            </div>
            <Badge variant="secondary" className={`${getRoleColor(userRole || "member")} capitalize text-xs sm:text-sm`}>
              {(userRole || "member").replace(/^./, (c) => c.toUpperCase())}
            </Badge>
          </div>
          {website && (
            <Button size="sm" asChild className="shrink-0 app-touch min-h-0 h-9 sm:h-9 rounded-lg">
              <Link href={`/${organization.slug}/analytics`} className="gap-1.5">
                Full analytics
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {websiteLoading ? (
        <DashboardSkeleton />
      ) : website ? (
        <DashboardOverview
          websiteId={website.id}
          organizationSlug={organization.slug}
          analyticsEnabled={website.analytics ?? false}
          blogsEnabled={organization.blogs_enabled ?? false}
        />
      ) : (
        <div className="app-card border border-dashed border-muted-foreground/25 bg-card/50 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-24 px-4 sm:px-6 text-center">
            <div className="rounded-full bg-muted/50 p-4 sm:p-6 mb-3 sm:mb-4">
              <Globe className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">No website yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-5 sm:mb-6">
              Add a website to this organization to see an overview and form submissions here.
            </p>
            <Button asChild className="rounded-lg app-touch">
              <Link href={`/${organization.slug}/website`}>Add website</Link>
            </Button>
          </div>
        </div>
      )}
    </AppPageContainer>
  )
}
