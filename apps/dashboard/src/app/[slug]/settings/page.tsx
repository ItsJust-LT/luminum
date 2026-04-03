"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useOrganization } from "@/lib/contexts/organization-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonLoader, FormSkeleton } from "@/components/ui/skeleton-loader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Building2, 
  CalendarDays, 
  Hash, 
  RefreshCw, 
  Save,
  Upload,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
  Mail,
  MapPin,
  CreditCard,
  Settings as SettingsIcon,
  Lock,
  HelpCircle,
  Users,
  HardDrive,
  AlertTriangle,
  FileText,
  Copy,
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { OrganizationSettings } from "@/lib/types/organization-settings"
import { useOrganizationUpdates } from "@/hooks/use-organization-updates"
import { countries } from "@/lib/countries"
import { currencies } from "@/lib/currencies"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const { organization, userRole, loading, error, refreshOrganization } = useOrganization()
  const { updateOrganizationData, updateOrganizationLogo } = useOrganizationUpdates()
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [formData, setFormData] = useState<Partial<OrganizationSettings>>({})
  const [canEdit, setCanEdit] = useState(false)
  const [storageBreakdown, setStorageBreakdown] = useState<{
    byCategory: {
      images: number;
      blog: number;
      attachments: { support: number; emails: number; forms: number };
    };
  } | null>(null)
  const [workspaceWebsites, setWorkspaceWebsites] = useState<{ id: string; domain: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const copyIdentifier = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  useEffect(() => {
    if (organization?.id) {
      fetchSettings()
    }
  }, [organization?.id])

  const fetchSettings = async () => {
    if (!organization?.id) return

    setIsLoadingSettings(true)
    try {
      const result = await api.organizationSettings.get(organization.id) as { success?: boolean; data?: OrganizationSettings & { canEdit?: boolean }; error?: string }
      if (result.success && result.data) {
        setSettings(result.data)
        setCanEdit(result.data.canEdit ?? false)
        setFormData({
          name: result.data.name,
          slug: result.data.slug,
          billing_email: result.data.billing_email,
          tax_id: result.data.tax_id,
          billing_address: result.data.billing_address,
          metadata: result.data.metadata
        })
        if (result.data.max_storage_bytes && organization?.id) {
          api.organizationSettings.getStorage(organization.id)
            .then((res: any) => { if (res?.success && res?.data?.breakdown) setStorageBreakdown(res.data.breakdown) })
            .catch(() => {})
        }
        try {
          const wsRes = await api.websites.list(organization.id) as { data?: { id: string; domain: string }[] }
          setWorkspaceWebsites(Array.isArray(wsRes?.data) ? wsRes.data : [])
        } catch {
          setWorkspaceWebsites([])
        }
      } else {
        toast.error(result.error || "Failed to load settings")
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handleSave = async () => {
    if (!organization?.id || !canEdit) return

    // Basic validation
    if (!formData.name?.trim()) {
      toast.error("Organization name is required")
      return
    }

    if (!formData.slug?.trim()) {
      toast.error("Organization slug is required")
      return
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(formData.slug)) {
      toast.error("Slug can only contain lowercase letters, numbers, and hyphens")
      return
    }

    setIsSaving(true)
    try {
      const result = await api.organizationSettings.update(organization.id, formData) as { success?: boolean; error?: string }
      if (result.success) {
        setIsEditing(false)
        await fetchSettings()
        await updateOrganizationData(formData)
      } else {
        toast.error(result.error || "Failed to update settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !organization?.id) return

    setIsUploading(true)
    try {
      const bytes = await file.arrayBuffer()
      const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
      const result = await api.organizationSettings.uploadLogo(organization.id, {
        logoBase64,
        fileName: file.name,
        contentType: file.type,
      }) as { success?: boolean; data?: { logoUrl?: string }; error?: string }

      if (result.success) {
        await fetchSettings()
        if (result.data?.logoUrl) {
          await updateOrganizationLogo(result.data.logoUrl)
        }
      } else {
        toast.error(result.error || "Failed to upload logo")
      }
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast.error("Failed to upload logo")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleLogoDelete = async () => {
    if (!organization?.id || !canEdit) return

    try {
      const result = await api.organizationSettings.deleteLogo(organization.id) as { success?: boolean; error?: string }

      if (result.success) {
        await fetchSettings()
        await updateOrganizationLogo("")
      } else {
        toast.error(result.error || "Failed to remove logo")
      }
    } catch (error) {
      console.error("Error deleting logo:", error)
      toast.error("Failed to remove logo")
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 dark:from-violet-950/50 dark:to-purple-950/50 dark:text-violet-300 ring-1 ring-violet-200/50 dark:ring-violet-800/30" variant="secondary">owner</Badge>
      case "admin":
        return <Badge className="bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 dark:from-slate-900/50 dark:to-gray-900/50 dark:text-slate-300 ring-1 ring-slate-200/50 dark:ring-slate-700/30" variant="secondary">admin</Badge>
      default:
        return <Badge className="bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:from-emerald-950/50 dark:to-green-950/50 dark:text-emerald-300 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30" variant="secondary">member</Badge>
    }
  }

  // Skeleton loading component
  const SettingsSkeleton = () => (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Organization Overview Skeleton */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* General Information Skeleton */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Logo Skeleton */}
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-28" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Separator />
              <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick links skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 bg-gradient-to-br from-background to-muted/10 shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  if (loading || isLoadingSettings) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl flex-shrink-0 ring-1 ring-primary/10">
                <Image
                  src="/images/logo.png"
                  alt="Luminum Agency"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Luminum Agency</h3>
            </div>
            <FormSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>{error || "Organization not found"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <AppPageContainer>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-primary/10 rounded-xl shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">Organization Settings</h1>
            {getRoleBadge(userRole || "member")}
          </div>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      name: settings?.name,
                      slug: settings?.slug,
                      billing_email: settings?.billing_email,
                      tax_id: settings?.tax_id,
                      billing_address: settings?.billing_address,
                      metadata: settings?.metadata
                    })
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-11 sm:h-12 app-touch">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          {/* Organization Overview */}
          <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle>Organization Overview</CardTitle>
              <CardDescription>
                Current organization information and statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-6">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={settings?.logo || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xl">
                    {settings?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{settings?.name}</h3>
                  <p className="text-muted-foreground">@{settings?.slug}</p>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDate(organization.createdAt)}
                  </p>
                </div>
                <div className="ml-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchSettings()}
                    disabled={isLoadingSettings}
                  >
                    {isLoadingSettings ? (
                      <SkeletonLoader variant="button" className="mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isLoadingSettings ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Slug</div>
                    <div className="font-medium">@{settings?.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-medium">{formatDate(organization.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Members</div>
                    <div className="font-medium">{Array.isArray(organization.members) ? organization.members.length : "-"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Workspace identifiers</h4>
                <p className="text-xs text-muted-foreground">
                  Use the organization ID for API and support. Website IDs identify each site (e.g. analytics embed).
                </p>
                <div className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground mb-0.5">Organization ID</div>
                      <code className="text-xs sm:text-sm break-all font-mono bg-muted/50 px-2 py-1 rounded block">
                        {organization.id}
                      </code>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void copyIdentifier("Organization ID", organization.id)}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                  {workspaceWebsites.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No websites linked to this organization yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {workspaceWebsites.map((w) => (
                        <div
                          key={w.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/50 p-3"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{w.domain}</span>
                          </div>
                          <div className="text-xs">
                            <div className="text-muted-foreground mb-0.5">Website ID (analytics, blog, forms)</div>
                            <div className="flex items-start gap-1.5">
                              <code className="font-mono break-all flex-1 bg-muted/40 px-1.5 py-0.5 rounded">{w.id}</code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => void copyIdentifier("Website ID", w.id)}
                                aria-label="Copy website ID"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Usage */}
          {settings?.max_storage_bytes && (
            <Card className={`app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm ${settings?.storage_warning ? 'border-amber-500/50' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage Usage
                  {settings?.storage_warning && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Usage across images, blog media, support, email attachments, and form uploads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      {(settings.used_storage_bytes || 0) / (1024 * 1024 * 1024) < 1
                        ? `${((settings.used_storage_bytes || 0) / (1024 * 1024)).toFixed(2)} MB`
                        : `${((settings.used_storage_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`}
                      {" / "}
                      {settings.max_storage_bytes / (1024 * 1024 * 1024)} GB
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${
                        settings.storage_warning
                          ? "bg-gradient-to-r from-amber-500 to-amber-600"
                          : "bg-gradient-to-r from-primary to-primary/80"
                      }`}
                      style={{
                        width: `${Math.min(settings.storage_usage_percent || 0, 100)}%`,
                      }}
                    />
                  </div>
                  {settings.storage_warning && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Storage usage is above 80%. Consider cleaning up old files or upgrading your plan.
                      </span>
                    </div>
                  )}
                  {storageBreakdown && (() => {
                    const b = storageBreakdown.byCategory
                    const blogBytes = b.blog ?? 0
                    const parts = [
                      { key: "images", label: "Images & logos", bytes: b.images, color: "bg-sky-500" },
                      { key: "blog", label: "Blog media", bytes: blogBytes, color: "bg-violet-500" },
                      { key: "support", label: "Support", bytes: b.attachments.support, color: "bg-emerald-500" },
                      { key: "emails", label: "Emails", bytes: b.attachments.emails, color: "bg-amber-500" },
                      { key: "forms", label: "Forms", bytes: b.attachments.forms, color: "bg-rose-500" },
                    ]
                    const sumParts = parts.reduce((a, p) => a + p.bytes, 0) || 1
                    const fmt = (n: number) =>
                      n / (1024 * 1024) < 1 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(2)} MB`
                    return (
                      <div className="pt-4 border-t border-border/50 space-y-4">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">Storage mix</div>
                          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/40">
                            {parts.map((p) => (
                              <div
                                key={p.key}
                                className={`${p.color} transition-all`}
                                style={{ width: `${Math.max(0.5, (p.bytes / sumParts) * 100)}%` }}
                                title={`${p.label}: ${fmt(p.bytes)}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 text-sm">
                          {parts.map((p) => (
                            <div key={p.key} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.color}`} />
                                {p.key === "blog" ? <FileText className="h-3.5 w-3.5" /> : null}
                                {p.key === "images" ? <ImageIcon className="h-3.5 w-3.5" /> : null}
                                {p.key === "emails" ? <Mail className="h-3.5 w-3.5" /> : null}
                                <span className="truncate">{p.label}</span>
                              </span>
                              <strong className="font-mono text-xs tabular-nums">{fmt(p.bytes)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                General Information
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter organization name"
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <span className="font-medium">{settings?.name || "Not set"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Organization Slug</Label>
                  {isEditing ? (
                    <Input
                      id="slug"
                      value={formData.slug || ""}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="organization-slug"
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <span className="font-medium">@{settings?.slug || "Not set"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2">
                    Country
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {settings?.country && settings.country in countries
                          ? `${countries[settings.country as keyof typeof countries].emoji} ${countries[settings.country as keyof typeof countries].name}`
                          : "Not set"
                        }
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${organization.slug}/support`)}
                        className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <HelpCircle className="h-3 w-3 mr-1" />
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency" className="flex items-center gap-2">
                    Currency
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {settings?.currency && settings.currency in currencies ? `${currencies[settings.currency as keyof typeof currencies]?.symbol} ${settings.currency}` : "Not set"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${organization.slug}/support`)}
                        className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <HelpCircle className="h-3 w-3 mr-1" />
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_provider" className="flex items-center gap-2">
                  Payment Provider
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="p-3 rounded-lg bg-muted/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{settings?.payment_provider || "Not set"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/${organization.slug}/support`)}
                      className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Restricted Settings
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Country, currency, and payment provider settings are managed by our support team. 
                      Contact support if you need to make changes to these settings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Logo */}
          <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Organization Logo
              </CardTitle>
              <CardDescription>
                Upload and manage your organization's logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                {isUploading ? (
                  <div className="h-20 w-20 flex items-center justify-center">
                    <SkeletonLoader variant="avatar" className="h-16 w-16" />
                  </div>
                ) : (
                  <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                    <AvatarImage src={settings?.logo || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-2xl">
                      {settings?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="space-y-3">
                  {canEdit && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                      
                      {settings?.logo && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Logo
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Organization Logo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove the organization logo? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleLogoDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Logo
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Recommended size: 200x200px. Max file size: 5MB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, PNG, GIF, WebP
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-4 sm:space-y-6">
          <Card className="app-card bg-card/50 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>
                Billing details and tax information for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="billing_email">Billing Email</Label>
                {isEditing ? (
                  <Input
                    id="billing_email"
                    type="email"
                    value={formData.billing_email || ""}
                    onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                    placeholder="billing@organization.com"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <span className="font-medium">{settings?.billing_email || "Not set"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                {isEditing ? (
                  <Input
                    id="tax_id"
                    value={formData.tax_id || ""}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="Enter tax ID or VAT number"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <span className="font-medium">{settings?.tax_id || "Not set"}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Billing Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    {isEditing ? (
                      <Input
                        id="street"
                        value={formData.billing_address?.street || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billing_address: { ...formData.billing_address, street: e.target.value }
                        })}
                        placeholder="123 Main Street"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 border">
                        <span className="font-medium">{settings?.billing_address?.street || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    {isEditing ? (
                      <Input
                        id="city"
                        value={formData.billing_address?.city || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billing_address: { ...formData.billing_address, city: e.target.value }
                        })}
                        placeholder="City"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 border">
                        <span className="font-medium">{settings?.billing_address?.city || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    {isEditing ? (
                      <Input
                        id="state"
                        value={formData.billing_address?.state || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billing_address: { ...formData.billing_address, state: e.target.value }
                        })}
                        placeholder="State or Province"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 border">
                        <span className="font-medium">{settings?.billing_address?.state || "Not set"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    {isEditing ? (
                      <Input
                        id="postal_code"
                        value={formData.billing_address?.postal_code || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          billing_address: { ...formData.billing_address, postal_code: e.target.value }
                        })}
                        placeholder="12345"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 border">
                        <span className="font-medium">{settings?.billing_address?.postal_code || "Not set"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </AppPageContainer>
  )
}