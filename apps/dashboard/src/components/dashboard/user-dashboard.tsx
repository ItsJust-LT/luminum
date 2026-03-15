"use client"

import { useSession } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LogOut,
  User,
  ExternalLink,
  Globe,
  Building2,
  Zap,
  BarChart3,
  Activity,
  ChevronDown,
  Settings,
} from "lucide-react"
import Image from "next/image"
import { authClient } from "@/lib/auth/client"
import { useState, useEffect } from "react"
import { CardSkeleton } from "@/components/ui/skeleton-loader"
import { ClientProjectManagement } from "@/components/dashboard/client-project-management"
import { api } from "@/lib/api"
import type { Website } from "@/lib/types/websites"
import { AnalyticsOverview } from "@/components/analytics/analytics-overview"

interface ClientProject {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
  website?: Website
}

export function UserDashboard() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClientProjects()
  }, [])

  const fetchClientProjects = async () => {
    try {
      const result = (await authClient.organization.list()) as { data?: Array<{ id: string; createdAt?: Date | string; [key: string]: unknown }> }
      if (result.data) {
        const projectsWithWebsites = await Promise.all(
          result.data.map(async (project) => {
            // Get website data for this organization using server action
            const res = await api.websites.list(project.id) as { data?: Website[] }
            const websites = res?.data
            const website = websites?.[0] // Assuming one website per organization for now

            return {
              ...project,
              createdAt:
                typeof project.createdAt === "string" ? project.createdAt : (project.createdAt instanceof Date ? project.createdAt : new Date()).toISOString(),
              website,
            }
          }),
        )
        setProjects(projectsWithWebsites as ClientProject[])
      }
    } catch (error) {
      console.error("Error fetching client projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = "/sign-in"
  }

  const getProjectTypeIcon = (metadata: any) => {
    const type = metadata?.type || "Website"
    switch (type) {
      case "E-commerce":
        return <Globe className="w-4 h-4" />
      case "Portfolio":
        return <User className="w-4 h-4" />
      case "Business":
        return <Building2 className="w-4 h-4" />
      case "Landing Page":
        return <Zap className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDomainFromProject = (project: ClientProject) => {
    return project.website?.domain ? `${project.website.domain}.com` : `${project.slug}.com`
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/50 backdrop-blur-sm shadow-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Image src="/images/logo.png" alt="Luminum" width={24} height={24} className="rounded-md" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">made by Luminum Agency</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.user?.image || ""} />
                      <AvatarFallback>{session?.user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{session?.user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, {session?.user?.name}!</h2>
          <p className="text-muted-foreground">Monitor your website performance and manage your digital presence</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="hover:shadow-md transition-all duration-200 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary/70" />
                <span>Client Profile</span>
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback>{session?.user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{session?.user?.name || "Client"}</p>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                  <Badge
                    variant="secondary"
                    className="mt-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    Active Client
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-200 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-primary/70" />
                <span>Your Websites</span>
              </CardTitle>
              <CardDescription>Projects we've built for you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Websites</span>
                  <span className="font-medium">{loading ? "--" : projects.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Projects</span>
                  <span className="font-medium">{loading ? "--" : projects.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-200 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary/70" />
                <span>Analytics Overview</span>
              </CardTitle>
              <CardDescription>Website performance insights</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length > 0 && projects[0].website ? (
                <AnalyticsOverview
                  websiteId={projects[0].website.id}
                  analyticsEnabled={projects[0].website.analytics || false}
                />
              ) : (
                <div className="text-center py-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No website data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-200 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-primary/70" />
                <span>Support</span>
              </CardTitle>
              <CardDescription>Get help from our team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start hover:bg-muted/50 bg-transparent">
                Contact Support
              </Button>
              <Button variant="outline" className="w-full justify-start hover:bg-muted/50 bg-transparent">
                Request Changes
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-1 mb-8">
          <Card className="hover:shadow-md transition-all duration-200 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-primary/70" />
                <span>Your Websites</span>
              </CardTitle>
              <CardDescription>Websites and applications built by Luminum Agency</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8">
                  <CardSkeleton />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No websites yet</h3>
                  <p className="text-muted-foreground">Your websites will appear here once they're ready.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer group border-border/50"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary/80 to-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold text-foreground truncate">{project.name}</h3>
                              <Badge
                                variant="secondary"
                                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              >
                                Live
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{getDomainFromProject(project)}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                {getProjectTypeIcon(project.metadata)}
                                <span>{project.metadata?.type || "Website"}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50 bg-transparent"
                                onClick={() => window.open(`https://${getDomainFromProject(project)}`, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Visit
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Launched {formatDate(project.createdAt)}
                            </p>
                            {project.website && (
                              <p className="text-xs text-primary/70 mt-1">
                                Website ID: {project.website.id.slice(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-1">
          <ClientProjectManagement onProjectChange={fetchClientProjects} />
        </div>
      </main>
    </div>
  )
}
