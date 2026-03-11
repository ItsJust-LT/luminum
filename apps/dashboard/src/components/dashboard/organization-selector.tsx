"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronRight, Users, Globe, Calendar, ArrowRight, CreditCard, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth/client"
import { getWebsitesByOrganization } from "@/lib/supabase/websites"
import type { Website } from "@/lib/types/websites"
import LoadingAnimation from "@/components/LoadingAnimation"

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
  members?: any[]
  role?: string
  website?: Website
}

interface OrganizationSelectorProps {
  onOrganizationSelect?: (organization: Organization) => void
}

export function OrganizationSelector({ onOrganizationSelect }: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const result = (await authClient.organization.list()) as { data?: Array<{ id: string; createdAt?: Date | string; [key: string]: unknown }> }
      if (result.data) {
        // Get current user session to find their user ID
        const { data: session } = await authClient.getSession()
        const currentUserId = session?.user?.id

        const orgsWithDetails = await Promise.all(
          result.data.map(async (org) => {
            // Get website data for this organization
            const { data: websites } = await getWebsitesByOrganization(org.id)
            const website = websites?.[0] // Assuming one website per organization for now

            // Get member data using Prisma server action
            const { getMembersByOrganization } = await import('@/lib/prisma/members')
            const { data: members } = await getMembersByOrganization(org.id)

            // Find current user's role in this organization
            const currentUserMember = members?.find((member: any) => 
              member.userId === currentUserId
            )

            const orgWithDetails = {
              ...org,
              createdAt: typeof org.createdAt === "string" ? org.createdAt : (org.createdAt instanceof Date ? org.createdAt : new Date()).toISOString(),
              website,
              members: members || [],
              role: currentUserMember?.role || "member"
            }

            // Debug logging
            console.log(`Organization ${org.name}:`, {
              memberCount: members?.length || 0,
              userRole: currentUserMember?.role || "member",
              currentUserId
            })

            return orgWithDetails
          }),
        )
        setOrganizations(orgsWithDetails as Organization[])
      }
    } catch (error: any) {
      console.error("Error fetching organizations:", error)
      setError("Failed to load organizations")
    } finally {
      setLoading(false)
    }
  }

  const handleOrganizationSelect = (organization: Organization) => {
    if (onOrganizationSelect) {
      onOrganizationSelect(organization)
    }
    router.push(`/${organization.slug}/dashboard`)
  }

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800"
      case "admin":
        return "bg-blue-100 text-blue-800"
      case "member":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <LoadingAnimation />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
          <CardContent className="pt-8 text-center space-y-6">
            <Building2 className="w-16 h-16 text-destructive mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Error Loading Organizations</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchOrganizations} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-dashed border-2">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5 rounded-2xl blur-xl" />
              <div className="relative p-6">
                <Building2 className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Organizations Found</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have access to any organizations yet. Contact your administrator to get invited.
                </p>
                <Button variant="outline" onClick={() => router.push("/sign-in")} className="w-full">
                  Back to Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl blur-xl" />
            <div className="relative p-6">
              <Building2 className="w-20 h-20 text-primary mx-auto mb-6" />
              <h1 className="text-4xl font-bold text-foreground mb-4">Select Organization</h1>
              <p className="text-muted-foreground text-lg">Choose an organization to access your dashboard</p>
            </div>
          </div>
        </div>

        <div className={`grid gap-8 ${
          organizations.length === 1 
            ? 'grid-cols-1 max-w-2xl mx-auto' 
            : organizations.length === 2 
            ? 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto' 
            : 'md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {organizations.map((org) => (
            <Card
              key={org.id}
              className={`group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-card to-muted/20 hover:scale-[1.02] ${
                organizations.length <= 2 ? 'min-h-[400px]' : ''
              }`}
              onClick={() => handleOrganizationSelect(org)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 ring-2 ring-primary/10">
                      <AvatarImage src={org.logo || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg">
                        {org.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{org.name}</CardTitle>
                      <CardDescription className="text-base">@{org.slug}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Badge className={`${getRoleColor(org.role || "member")} px-3 py-1 font-medium`}>
                    {org.role || "member"}
                  </Badge>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(org.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Members</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="font-semibold">
                        {org.members?.length || 0}
                      </Badge>
                      {org.members && org.members.length > 0 && (
                        <div className="flex -space-x-2">
                          {org.members.slice(0, 3).map((member: any, index: number) => (
                            <Avatar key={member.id || index} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={member.user?.image || ""} />
                              <AvatarFallback className="text-xs">
                                {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {org.members.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs font-medium">+{org.members.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {org.website && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">Website</span>
                      </div>
                      <Badge variant="outline" className="font-semibold text-primary border-primary/20">
                        {org.website.domain}
                      </Badge>
                    </div>
                  )}

                  {/* Subscription Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <CreditCard className="w-4 h-4" />
                      <span className="font-medium">Plan</span>
                    </div>
                    <Badge variant="outline" className="font-semibold">
                      {(org as any).subscription?.plan || "Free"}
                    </Badge>
                  </div>

                  {/* Last Activity */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span className="font-medium">Last Activity</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {(org as any).lastActivity ? formatDate((org as any).lastActivity) : "Never"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    className="w-full justify-between group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOrganizationSelect(org)
                    }}
                  >
                    <span className="font-medium">Access Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Don't see your organization?{" "}
            <a href="/support" className="text-primary hover:underline font-medium">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
