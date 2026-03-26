"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Building2,
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Plus,
  RefreshCw,
  AlertCircle,
  Globe,
  CreditCard,
  TrendingUp,
  ExternalLink,
  Mail,
  FileText,
  MessageCircle,
  BarChart3,
  BookOpen,
  Receipt,
  Layout,
  Copy,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react"
import { api } from "@/lib/api"
import { AdminOrganizationCreatorDialog } from "@/components/dashboard/admin-organization-creator-dialog"
import { formatDate, formatNumber } from "@/lib/utils"
import { toast } from "sonner"

export default function AdminOrganizationsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null)
  const [domainDialogOrg, setDomainDialogOrg] = useState<any | null>(null)
  const [domainPrefix, setDomainPrefix] = useState("admin")
  const [domainBase, setDomainBase] = useState("")
  const [dnsDialogOrg, setDnsDialogOrg] = useState<any | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)

  const fetchOrganizations = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.admin.getOrganizations() as { success?: boolean; organizations?: any[]; data?: any[]; error?: string }
      if (result.success) {
        setOrganizations(result.organizations || result.data || [])
      } else {
        setError(result.error || "Failed to load")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrganizations() }, [])

  const handleOrganizationCreated = () => {
    fetchOrganizations()
    toast.success("Organization created successfully!")
  }

  const getSubscriptionBadge = (org: any) => {
    const sub = org.subscriptions_subscriptions_organization_idToorganization?.[0] || org.primary_subscription || org.subscriptions?.[0]
    if (!sub) return <Badge variant="secondary" className="text-xs">No Sub</Badge>
    if (sub.status === "active") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Active</Badge>
    if (sub.status === "trialing") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Trial</Badge>
    return <Badge variant="secondary" className="text-xs">{sub.status}</Badge>
  }

  const toggleFeature = async (org: any, feature: "analytics" | "email" | "whatsapp" | "blogs" | "invoices", enable: boolean) => {
    const key = `${org.id}-${feature}`
    setTogglingFeature(key)
    try {
      if (feature === "analytics") {
        await (enable ? api.admin.enableAnalytics(org.id) : api.admin.disableAnalytics(org.id))
      } else if (feature === "email") {
        await (enable ? api.admin.enableEmailAccess(org.id) : api.admin.disableEmail(org.id))
      } else if (feature === "blogs") {
        await (enable ? api.admin.enableBlogs(org.id) : api.admin.disableBlogs(org.id))
      } else if (feature === "invoices") {
        await (enable ? api.admin.enableInvoices(org.id) : api.admin.disableInvoices(org.id))
      } else {
        await (enable ? api.admin.enableWhatsapp(org.id) : api.admin.disableWhatsapp(org.id))
      }
      const featureLabels: Record<string, string> = { analytics: "Analytics", email: "Email", blogs: "Blogs", whatsapp: "WhatsApp", invoices: "Invoices" }
      toast.success(`${featureLabels[feature]} ${enable ? "enabled" : "disabled"}`)
      fetchOrganizations()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update")
    } finally {
      setTogglingFeature(null)
    }
  }

  const toggleBrandedDashboard = async (org: any, enable: boolean) => {
    setTogglingFeature(`${org.id}-branded`)
    try {
      await (enable ? api.admin.enableBrandedDashboard(org.id) : api.admin.disableBrandedDashboard(org.id))
      toast.success(`Branded dashboard ${enable ? "enabled" : "disabled"}`)
      fetchOrganizations()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update")
    } finally {
      setTogglingFeature(null)
    }
  }

  const handleSetCustomDomain = async () => {
    if (!domainDialogOrg) return
    setTogglingFeature(`${domainDialogOrg.id}-domain`)
    try {
      const result = await api.admin.setCustomDomain(domainDialogOrg.id, domainPrefix, domainBase) as any
      if (result.success === false) {
        toast.error(result.error || "Failed to set domain")
      } else {
        toast.success(`Custom domain set: ${domainPrefix}.${domainBase}`)
        setDomainDialogOrg(null)
        fetchOrganizations()
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to set domain")
    } finally {
      setTogglingFeature(null)
    }
  }

  const handleRemoveCustomDomain = async (org: any) => {
    setTogglingFeature(`${org.id}-domain`)
    try {
      await api.admin.removeCustomDomain(org.id)
      toast.success("Custom domain removed")
      fetchOrganizations()
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove domain")
    } finally {
      setTogglingFeature(null)
    }
  }

  const handleVerifyDomain = async (org: any) => {
    setVerifying(org.id)
    try {
      const result = await api.admin.verifyCustomDomain(org.id) as any
      if (result.verified) {
        toast.success("Domain verified successfully!")
      } else {
        toast.info(result.message || "DNS not yet configured")
      }
      fetchOrganizations()
    } catch (err: any) {
      toast.error(err?.message || "Verification failed")
    } finally {
      setVerifying(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const filtered = organizations.filter((org) => {
    const matchesSearch = !search.trim() ||
      org.name?.toLowerCase().includes(search.toLowerCase()) ||
      org.slug?.toLowerCase().includes(search.toLowerCase())
    const sub = org.subscriptions_subscriptions_organization_idToorganization?.[0] || org.primary_subscription || org.subscriptions?.[0]
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && sub?.status === "active") ||
      (statusFilter === "trial" && sub?.status === "trialing") ||
      (statusFilter === "none" && !sub)
    return matchesSearch && matchesStatus
  })

  const totalMembers = organizations.reduce((acc, org) => acc + (org.members?.length || org._count?.members || 0), 0)
  const activeCount = organizations.filter(org => {
    const sub = org.subscriptions_subscriptions_organization_idToorganization?.[0] || org.primary_subscription
    return sub?.status === "active"
  }).length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all organizations on the platform
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <AdminOrganizationCreatorDialog onOrganizationCreated={handleOrganizationCreated} />
          <Button variant="outline" size="sm" onClick={fetchOrganizations} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{formatNumber(organizations.length)}</p>
                <p className="text-xs text-muted-foreground">Total Orgs</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{formatNumber(activeCount)}</p>
                <p className="text-xs text-muted-foreground">Active Subs</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{formatNumber(totalMembers)}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{formatNumber(organizations.reduce((acc, o) => acc + (o.websites?.length || 0), 0))}</p>
                <p className="text-xs text-muted-foreground">Total Websites</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
                <Globe className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Subscription" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="none">No Sub</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Websites</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarImage src={org.logo || ""} />
                          <AvatarFallback className="rounded-lg text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
                            {org.name?.charAt(0).toUpperCase() || "O"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{org.name}</p>
                          <p className="text-xs text-muted-foreground truncate">/{org.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{org.members?.length || org._count?.members || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{org.websites?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getSubscriptionBadge(org)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={org.analytics_enabled ? "default" : "secondary"} className="text-xs gap-0.5">
                          <BarChart3 className="h-3 w-3" /> {org.analytics_enabled ? "On" : "Off"}
                        </Badge>
                        <Badge variant={org.emails_enabled ? "default" : "secondary"} className="text-xs gap-0.5">
                          <Mail className="h-3 w-3" /> {org.emails_enabled ? (org.email_dns_verified_at ? "OK" : "Setup") : "Off"}
                        </Badge>
                        <Badge variant={org.whatsapp_enabled ? "default" : "secondary"} className="text-xs gap-0.5">
                          <MessageCircle className="h-3 w-3" /> {org.whatsapp_enabled ? "On" : "Off"}
                        </Badge>
                        <Badge variant={org.blogs_enabled ? "default" : "secondary"} className="text-xs gap-0.5">
                          <BookOpen className="h-3 w-3" /> {org.blogs_enabled ? "On" : "Off"}
                        </Badge>
                        <Badge variant={org.invoices_enabled ? "default" : "secondary"} className="text-xs gap-0.5">
                          <Receipt className="h-3 w-3" /> {org.invoices_enabled ? "On" : "Off"}
                        </Badge>
                        <Badge
                          variant={org.branded_dashboard_enabled ? "default" : "secondary"}
                          className={`text-xs gap-0.5 ${
                            org.branded_dashboard_enabled && org.custom_domain_verified
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : org.branded_dashboard_enabled && !org.custom_domain_verified
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : ""
                          }`}
                        >
                          <Layout className="h-3 w-3" />
                          {!org.branded_dashboard_enabled
                            ? "Off"
                            : org.custom_domain_verified
                              ? org.custom_domain || "Live"
                              : "Pending DNS"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(org.createdAt, { relative: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!org.analytics_enabled ? (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "analytics", true)} disabled={!!togglingFeature}>
                              <BarChart3 className="h-4 w-4 mr-2" /> Enable Analytics
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "analytics", false)} disabled={!!togglingFeature}>
                              <BarChart3 className="h-4 w-4 mr-2" /> Disable Analytics
                            </DropdownMenuItem>
                          )}
                          {!org.emails_enabled ? (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "email", true)} disabled={!!togglingFeature}>
                              <Mail className="h-4 w-4 mr-2" /> Enable Email
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "email", false)} disabled={!!togglingFeature}>
                              <Mail className="h-4 w-4 mr-2" /> Disable Email
                            </DropdownMenuItem>
                          )}
                          {!org.whatsapp_enabled ? (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "whatsapp", true)} disabled={!!togglingFeature}>
                              <MessageCircle className="h-4 w-4 mr-2" /> Enable WhatsApp
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "whatsapp", false)} disabled={!!togglingFeature}>
                              <MessageCircle className="h-4 w-4 mr-2" /> Disable WhatsApp
                            </DropdownMenuItem>
                          )}
                          {!org.blogs_enabled ? (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "blogs", true)} disabled={!!togglingFeature}>
                              <BookOpen className="h-4 w-4 mr-2" /> Enable Blogs
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "blogs", false)} disabled={!!togglingFeature}>
                              <BookOpen className="h-4 w-4 mr-2" /> Disable Blogs
                            </DropdownMenuItem>
                          )}
                          {!org.invoices_enabled ? (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "invoices", true)} disabled={!!togglingFeature}>
                              <Receipt className="h-4 w-4 mr-2" /> Enable Invoices
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleFeature(org, "invoices", false)} disabled={!!togglingFeature}>
                              <Receipt className="h-4 w-4 mr-2" /> Disable Invoices
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!org.branded_dashboard_enabled ? (
                            <DropdownMenuItem onClick={() => toggleBrandedDashboard(org, true)} disabled={!!togglingFeature}>
                              <Layout className="h-4 w-4 mr-2" /> Enable Branded Dashboard
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleBrandedDashboard(org, false)} disabled={!!togglingFeature}>
                              <Layout className="h-4 w-4 mr-2" /> Disable Branded Dashboard
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setDomainPrefix(org.custom_domain_prefix || "admin")
                            setDomainBase(org.custom_domain ? org.custom_domain.replace(`${org.custom_domain_prefix || "admin"}.`, "") : "")
                            setDomainDialogOrg(org)
                          }} disabled={!!togglingFeature}>
                            <Globe className="h-4 w-4 mr-2" /> Set Custom Domain
                          </DropdownMenuItem>
                          {org.custom_domain && (
                            <>
                              <DropdownMenuItem onClick={() => handleRemoveCustomDomain(org)} disabled={!!togglingFeature}>
                                <AlertCircle className="h-4 w-4 mr-2" /> Remove Custom Domain
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerifyDomain(org)} disabled={!!verifying}>
                                {verifying === org.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                Verify Domain DNS
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDnsDialogOrg(org)}>
                                <Info className="h-4 w-4 mr-2" /> Show DNS Setup
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/${org.slug}/dashboard`}>
                              <ExternalLink className="h-4 w-4 mr-2" /> View Dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/${org.slug}/analytics`}>
                              <TrendingUp className="h-4 w-4 mr-2" /> Analytics
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/${org.slug}/forms`}>
                              <FileText className="h-4 w-4 mr-2" /> Forms
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/${org.slug}/settings`}>
                              <Eye className="h-4 w-4 mr-2" /> Settings
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all" ? "No organizations match your filters" : "No organizations yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Custom Domain Dialog */}
      <Dialog open={!!domainDialogOrg} onOpenChange={(open) => !open && setDomainDialogOrg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Custom Domain</DialogTitle>
            <DialogDescription>
              Configure a custom branded domain for <strong>{domainDialogOrg?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="domain-prefix">Subdomain prefix</Label>
              <Input
                id="domain-prefix"
                value={domainPrefix}
                onChange={(e) => setDomainPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="admin"
              />
              <p className="text-xs text-muted-foreground">e.g., admin, dashboard, portal</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain-base">Client domain</Label>
              <Input
                id="domain-base"
                value={domainBase}
                onChange={(e) => setDomainBase(e.target.value.toLowerCase().trim())}
                placeholder="acme.com"
              />
            </div>
            {domainPrefix && domainBase && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">Preview</p>
                <p className="text-lg font-mono mt-1">{domainPrefix}.{domainBase}</p>
              </div>
            )}
            <Button
              onClick={handleSetCustomDomain}
              disabled={!domainPrefix || !domainBase || !!togglingFeature}
              className="w-full"
            >
              {togglingFeature?.endsWith("-domain") ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Custom Domain"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DNS Setup Dialog */}
      <Dialog open={!!dnsDialogOrg} onOpenChange={(open) => !open && setDnsDialogOrg(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>DNS Setup for {dnsDialogOrg?.name}</DialogTitle>
            <DialogDescription>
              Add one of these DNS records at the client&apos;s domain registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={dnsDialogOrg?.custom_domain_verified ? "default" : "secondary"}>
                {dnsDialogOrg?.custom_domain_verified ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                ) : (
                  "Not Verified"
                )}
              </Badge>
              <span className="text-sm font-mono text-muted-foreground">{dnsDialogOrg?.custom_domain}</span>
            </div>

            <Card>
              <CardContent className="pt-4 pb-3 space-y-2">
                <p className="text-sm font-semibold">Option 1: CNAME record (recommended)</p>
                <div className="flex items-center gap-2 bg-muted rounded-md p-2">
                  <code className="text-sm flex-1 font-mono">CNAME {dnsDialogOrg?.custom_domain} &rarr; app.luminum.agency</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("app.luminum.agency")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3 space-y-2">
                <p className="text-sm font-semibold">Option 2: A record</p>
                <div className="flex items-center gap-2 bg-muted rounded-md p-2">
                  <code className="text-sm flex-1 font-mono">A {dnsDialogOrg?.custom_domain} &rarr; {process.env.NEXT_PUBLIC_SERVER_IP || "your-server-ip"}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_SERVER_IP || "your-server-ip")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              The client needs to add this DNS record at their domain registrar. Once propagated (usually 5-30 minutes), click Verify Domain DNS from the organizations menu.
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                handleVerifyDomain(dnsDialogOrg)
                setDnsDialogOrg(null)
              }}
              disabled={!!verifying}
            >
              {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Verify Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
