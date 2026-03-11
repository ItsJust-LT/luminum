"use client"

import { useState, useEffect } from "react"
import { Globe, Users, Mail, Settings, Crown, Shield, User, BarChart3, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth/client"

interface ClientProject {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
}

interface ProjectMember {
  id: string
  userId: string
  organizationId: string
  role: string
  createdAt: string | Date
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

interface ClientProjectManagementProps {
  onProjectChange?: () => void
}

export function ClientProjectManagement({ onProjectChange }: ClientProjectManagementProps) {
  const [activeProject, setActiveProject] = useState<ClientProject | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchActiveProject()
  }, [])

  const fetchActiveProject = async () => {
    try {
      const result = (await authClient.organization.getFullOrganization()) as { data?: { organization?: unknown; members?: unknown[]; [key: string]: unknown } }
      if (result.data) {
        const projectData = result.data

        if (projectData.organization) {
          setActiveProject(projectData.organization as ClientProject)
        } else {
          setActiveProject(projectData as unknown as ClientProject)
        }

        const members = projectData.members || []
        const transformedMembers = members.map((member: any) => ({
          ...member,
          createdAt:
            typeof member.createdAt === "string"
              ? member.createdAt
              : member.createdAt?.toISOString() || new Date().toISOString(),
          user: {
            ...member.user,
            id: member.user.id || member.userId,
          },
        }))
        setMembers(transformedMembers)
      }
    } catch (error: any) {
      console.error("Error fetching active project:", error)
      setError("No active project selected")
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <Crown className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        )
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case "member":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <User className="w-3 h-3 mr-1" />
            Client
          </Badge>
        )
      default:
        return <Badge variant="secondary">{role}</Badge>
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !activeProject) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              {error || "No active project selected. Please select a project to view details."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Website Details</span>
            </CardTitle>
            <CardDescription>View analytics and manage your website</CardDescription>
          </div>
          <Button variant="outline" className="bg-transparent">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Website Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{activeProject.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Domain:</span>
                    <span className="text-sm font-medium">{activeProject.slug}.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">{activeProject.metadata?.type || "Website"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Launched:</span>
                    <span className="text-sm font-medium">{formatDate(activeProject.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Live
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Uptime:</span>
                    <span className="text-sm font-medium">99.9%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm font-medium">2 days ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">SSL Certificate:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Valid
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Access & Team</h3>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.image || ""} />
                        <AvatarFallback>{member.user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                        <p className="text-xs text-gray-600">{member.user.email}</p>
                      </div>
                    </div>
                    {getRoleBadge(member.role)}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Monthly Visitors</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">12,543</p>
                  <p className="text-xs text-green-600">+15% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Page Views</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">45,231</p>
                  <p className="text-xs text-green-600">+8% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Bounce Rate</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">32%</p>
                  <p className="text-xs text-red-600">+2% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Avg. Session</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">2m 34s</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Page Load Speed</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                    <span className="text-sm font-medium">1.2s</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SEO Score</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                    <span className="text-sm font-medium">92/100</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mobile Friendly</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Excellent
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Get Support</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Luminum Agency
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Settings className="w-4 h-4 mr-2" />
                  Request Website Changes
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Request Analytics Report
                </Button>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Support Tickets</h3>
              <div className="text-center py-4">
                <p className="text-gray-600">No support tickets yet.</p>
                <p className="text-sm text-gray-500">Contact us if you need any assistance!</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
