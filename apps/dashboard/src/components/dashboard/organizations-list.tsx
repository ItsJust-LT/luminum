"use client"

import { useState, useEffect } from "react"
import { Building2, Search, MoreHorizontal, Users, Settings, Trash2, Calendar, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authClient } from "@/lib/auth/client"
import { PageDataSpinner } from "@/components/shell/page-data-spinner"

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null // Allow null values
  metadata?: any
  createdAt: string | Date // Allow both string and Date
  members?: any[]
  subscription_status?: string
  primary_subscription_id?: string
  domain?: string
}

export function OrganizationsList() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const result = (await authClient.organization.list()) as { data?: Array<{ id: string; name?: string; slug?: string; createdAt?: Date | string; [key: string]: unknown }> }
      if (result.data) {
        const transformedOrgs = result.data.map((org) => ({
          ...org,
          createdAt: typeof org.createdAt === "string" ? org.createdAt : (org.createdAt instanceof Date ? org.createdAt : new Date()).toISOString(),
        }))
        setOrganizations(transformedOrgs as Organization[])
      }
    } catch (error: any) {
      console.error("Error fetching organizations:", error)
      setError("Failed to load organizations")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOrganization = async (organizationId: string) => {
    if (confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      try {
        await authClient.organization.delete({
          organizationId,
        })
        await fetchOrganizations() // Refresh the list
      } catch (error: any) {
        console.error("Error deleting organization:", error)
      }
    }
  }

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Organizations Management</span>
          </CardTitle>
          <CardDescription>Manage all organizations in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <PageDataSpinner label="Loading organizations…" className="py-12" />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <span>Organizations Management</span>
        </CardTitle>
        <CardDescription>Manage all organizations in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search organizations by name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredOrganizations.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
            <p className="text-gray-600">No organizations match your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrganizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-6 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center space-x-6 flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900 text-lg">{org.name}</h4>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 font-medium">
                        Active
                      </Badge>
                      {org.subscription_status && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {org.subscription_status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 font-medium">@{org.slug}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {formatDate(org.createdAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{org.members?.length || 0} members</span>
                      </span>
                      {org.domain && (
                        <span className="flex items-center space-x-1">
                          <Globe className="w-4 h-4" />
                          <span>{org.domain}</span>
                        </span>
                      )}
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
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Organization
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Users className="mr-2 h-4 w-4" />
                      View Members
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteOrganization(org.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Organization
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
