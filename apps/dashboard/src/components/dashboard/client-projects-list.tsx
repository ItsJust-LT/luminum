"use client"

import { useState, useEffect } from "react"
import { Globe, Search, MoreHorizontal, Users, Settings, Trash2, ExternalLink, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { authClient } from "@/lib/auth/client"
import { api } from "@/lib/api"
import { Website } from "@/lib/types/websites"

interface ClientProject {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: any
  createdAt: string | Date
  members?: any[]
  status?: "active" | "maintenance" | "offline"
  lastUpdated?: string
  website?: Website
}

export function ClientProjectsList() {
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingDeleteProject, setPendingDeleteProject] = useState<ClientProject | null>(null)
  const [deletingProject, setDeletingProject] = useState(false)

  useEffect(() => {
    fetchClientProjects()
  }, [])

  const fetchClientProjects = async () => {
    try {
      // Get organizations
      const orgResult = (await authClient.organization.list()) as { data?: Array<{ id: string; name?: string; slug?: string; createdAt?: Date | string; [key: string]: unknown }> }

      // Get websites
      const websitesRes = await api.websites.list() as { data?: any[]; error?: string }
      const websites = websitesRes?.data

      if (websitesRes?.error) {
        console.error("Error fetching websites:", websitesRes.error)
      }

      if (orgResult.data) {
        const transformedProjects = orgResult.data.map((project) => {
          // Find matching website for this organization
          const website = websites?.find((w) => w.organization_id === project.id)

          return {
            ...project,
            createdAt: typeof project.createdAt === "string" ? project.createdAt : (project.createdAt instanceof Date ? project.createdAt : new Date()).toISOString(),
            status: "active" as const,
            website,
          }
        })
        setProjects(transformedProjects as ClientProject[])
      }
    } catch (error: any) {
      console.error("Error fetching client projects:", error)
      setError("Failed to load client projects")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (project: ClientProject) => {
    setDeletingProject(true)
    try {
      // Delete website first if it exists
      if (project.website) {
        try {
          await api.websites.delete(project.website.id)
        } catch (websiteError) {
          console.error("Error deleting website:", websiteError)
          // Continue with organization deletion even if website deletion fails
        }
      }

      // Delete organization
      await authClient.organization.delete({
        organizationId: project.id,
      })

      setPendingDeleteProject(null)
      await fetchClientProjects()
    } catch (error: any) {
      console.error("Error deleting project:", error)
      setError("Failed to delete project")
    } finally {
      setDeletingProject(false)
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.website?.domain && project.website.domain.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Live
          </Badge>
        )
      case "maintenance":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Maintenance
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Offline
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProjectTypeIcon = (metadata: any) => {
    const type = metadata?.type || "Website"
    switch (type) {
      case "E-commerce":
        return "🛒"
      case "Portfolio":
        return "🎨"
      case "Business Website":
        return "🏢"
      case "Landing Page":
        return "🚀"
      case "Web Application":
        return "⚡"
      case "Blog":
        return "📝"
      default:
        return "🌐"
    }
  }

  const getDomainFromProject = (project: ClientProject) => {
    return project.website?.domain ? `${project.website.domain}.com` : `${project.slug}.com`
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
            <p className="text-gray-600">Loading client projects...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <span>Client Projects</span>
        </CardTitle>
        <CardDescription>Manage websites and applications built for your clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects by name, slug, or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No client projects found</h3>
            <p className="text-gray-600">No projects match your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl">
                    {getProjectTypeIcon(project.metadata)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      {getStatusBadge(project.status || "active")}
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {project.metadata?.type || "Website"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-1">
                      <span>Slug: @{project.slug}</span>
                      <span>•</span>
                      <span>Domain: {getDomainFromProject(project)}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Created {formatDate(project.createdAt)}</span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{project.members?.length || 0} clients</span>
                      </span>
                      {project.website && <span>Website ID: {project.website.id.slice(0, 8)}...</span>}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.open(`https://${getDomainFromProject(project)}`, "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Website
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Project
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Clients
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPendingDeleteProject(project)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    <AlertDialog open={pendingDeleteProject !== null} onOpenChange={(open) => !open && !deletingProject && setPendingDeleteProject(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client project?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the project organization and related website data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletingProject}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deletingProject || !pendingDeleteProject}
            onClick={(e) => {
              e.preventDefault()
              if (!pendingDeleteProject) return
              void handleDeleteProject(pendingDeleteProject)
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deletingProject ? "Deleting..." : "Delete project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
