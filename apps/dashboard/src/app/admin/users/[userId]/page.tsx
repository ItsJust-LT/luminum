"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Mail,
  Calendar,
  Building2,
  Users,
  Activity,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Clock,
  ExternalLink,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.userManagement.getUser(userId) as any
      if (result.success) {
        setUser(result.user || result.data || null)
      } else {
        setError(result.error || "Failed to fetch user")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (userId) fetchUser() }, [userId])

  const handleBan = async () => {
    try {
      const res = await api.userManagement.deactivateUser(userId, "Banned by admin") as any
      if (res.success) { toast.success("User banned"); fetchUser() }
      else toast.error(res.error || "Failed")
    } catch { toast.error("Failed to ban user") }
  }

  const handleUnban = async () => {
    try {
      const res = await api.userManagement.reactivateUser(userId) as any
      if (res.success) { toast.success("User reactivated"); fetchUser() }
      else toast.error(res.error || "Failed")
    } catch { toast.error("Failed to reactivate") }
  }

  const handleRoleChange = async (newRole: string) => {
    try {
      await authClient.admin.setRole({ userId, role: newRole })
      toast.success(`Role changed to ${newRole}`)
      fetchUser()
    } catch { toast.error("Failed to change role") }
  }

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2"><Skeleton className="h-64" /></div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">User Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{user.name || "Unknown User"}</h1>
          <p className="text-sm text-muted-foreground">User details and management</p>
        </div>
        <div className="flex items-center gap-2">
          {user.banned ? (
            <Button variant="outline" size="sm" onClick={handleUnban}>
              <UserCheck className="h-4 w-4 mr-2" /> Reactivate
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="text-destructive" onClick={handleBan}>
              <UserX className="h-4 w-4 mr-2" /> Ban
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || ""} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-lg font-semibold">{user.name || "Unknown"}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              {user.role === "admin" ? (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Shield className="h-3 w-3 mr-1" /> Admin
                </Badge>
              ) : (
                <Badge variant="secondary">User</Badge>
              )}

              <div className="w-full space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  {user.banned ? (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Banned</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Active</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium">{formatDate(user.createdAt, { format: "short" })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Organizations</span>
                  <span className="font-medium">{user.member?.length || 0}</span>
                </div>
              </div>

              {/* Role actions */}
              <div className="w-full pt-2 border-t">
                {user.role !== "admin" ? (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleRoleChange("admin")}>
                    <Crown className="h-4 w-4 mr-2" /> Make Admin
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleRoleChange("user")}>
                    <Users className="h-4 w-4 mr-2" /> Remove Admin
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="organizations">
            <TabsList>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>

            <TabsContent value="organizations" className="mt-4 space-y-3">
              {user.member && user.member.length > 0 ? (
                user.member.map((m: any) => (
                  <Card key={m.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 rounded-lg flex-shrink-0">
                          <AvatarFallback className="rounded-lg text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
                            {m.organization?.name?.charAt(0).toUpperCase() || "O"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.organization?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">/{m.organization?.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs capitalize">{m.role}</Badge>
                        {m.organization?.slug && (
                          <Link href={`/${m.organization.slug}/dashboard`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No organizations</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="mt-4 space-y-3">
              {user.session && user.session.length > 0 ? (
                user.session.map((s: any) => (
                  <Card key={s.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{s.userAgent ? s.userAgent.substring(0, 60) + "..." : "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{s.ipAddress || "Unknown IP"}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(s.createdAt, { relative: true })}</span>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent sessions</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
