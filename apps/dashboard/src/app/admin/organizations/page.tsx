"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Building2, 
  Users, 
  DollarSign, 
  Calendar, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Settings,
  Plus,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react"
import { getOrganizationsAsAdmin } from "@/lib/actions/admin-organization-actions"
import { getOrganizationStats } from "@/lib/actions/organization-management"
import { formatCurrency } from "@/lib/utils"
import { AdminOrganizationCreatorDialog } from "@/components/dashboard/admin-organization-creator-dialog"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  domain?: string
  country: string
  currency: string
  payment_provider: string
  subscription_status: string
  max_subscriptions: number
  createdAt: string
  updatedAt: string
  members?: any[]
  subscriptions?: any[]
  primary_subscription?: any
}

interface OrganizationStats {
  totalOrgs: number
  activeOrgs: number
  trialOrgs: number
  newOrgsThisMonth: number
  totalRevenue: number
  activeRevenue: number
  averageRevenuePerOrg: number
  countryStats: Record<string, number>
  currencyStats: Record<string, number>
}

export default function OrganizationsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [stats, setStats] = useState<OrganizationStats>({
    totalOrgs: 0,
    activeOrgs: 0,
    trialOrgs: 0,
    newOrgsThisMonth: 0,
    totalRevenue: 0,
    activeRevenue: 0,
    averageRevenuePerOrg: 0,
    countryStats: {},
    currencyStats: {}
  })

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch organizations and stats in parallel
      const [orgsResult, statsResult] = await Promise.all([
        getOrganizationsAsAdmin(),
        getOrganizationStats()
      ])
      
      if (orgsResult.success) {
        setOrganizations(orgsResult.data || [])
      } else {
        setError(orgsResult.error || "Failed to fetch organizations")
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Error fetching organizations:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleOrganizationCreated = () => {
    fetchOrganizations()
    toast.success("Organization created successfully!")
  }

  const getSubscriptionStatus = (org: Organization) => {
    const primarySub = org.primary_subscription || org.subscriptions?.[0]
    
    if (!primarySub) {
      return { status: "No Subscription", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }
    }

    switch (primarySub.status) {
      case "active":
        return { status: "Active", color: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200" }
      case "trialing":
        return { status: "Trial", color: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200" }
      case "past_due":
        return { status: "Past Due", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200" }
      case "canceled":
        return { status: "Canceled", color: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200" }
      default:
        return { status: "Unknown", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const filteredOrganizations = organizations
    .filter((org) => {
      const matchesSearch = !search || 
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.slug.toLowerCase().includes(search.toLowerCase()) ||
        org.domain?.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && org.subscription_status === "active") ||
        (statusFilter === "trial" && org.subscriptions?.some(sub => sub.status === "trialing")) ||
        (statusFilter === "inactive" && org.subscription_status !== "active")
      
      const matchesCountry = countryFilter === "all" || org.country === countryFilter
      
      return matchesSearch && matchesStatus && matchesCountry
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "createdAt":
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case "members":
          aValue = a.members?.length || 0
          bValue = b.members?.length || 0
          break
        case "revenue":
          aValue = (a.primary_subscription || a.subscriptions?.[0])?.amount || 0
          bValue = (b.primary_subscription || b.subscriptions?.[0])?.amount || 0
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleSelectOrg = (orgId: string) => {
    setSelectedOrgs(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrgs.length === filteredOrganizations.length) {
      setSelectedOrgs([])
    } else {
      setSelectedOrgs(filteredOrganizations.map(org => org.id))
    }
  }

  const handleBulkAction = (action: string) => {
    if (selectedOrgs.length === 0) {
      toast.error("Please select organizations first")
      return
    }
    
    switch (action) {
      case "export":
        toast.success(`Exporting ${selectedOrgs.length} organizations...`)
        break
      case "delete":
        toast.error("Bulk delete not implemented yet")
        break
      default:
        toast.error("Action not implemented yet")
    }
  }

  const countries = Array.from(new Set(organizations.map(org => org.country))).sort()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Organizations
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Manage and monitor all client organizations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrganizations}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <AdminOrganizationCreatorDialog onOrganizationCreated={handleOrganizationCreated} />
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Organizations</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.totalOrgs}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Active</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.activeOrgs}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Trial</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                {loading ? <Skeleton className="h-8 w-16" /> : stats.trialOrgs}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Revenue</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats.totalRevenue, 'ZAR')}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700 dark:text-teal-300">Avg. Revenue</CardTitle>
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-700 dark:text-teal-300">
                {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats.averageRevenuePerOrg, 'ZAR')}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <Label htmlFor="search">Search Organizations</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search by name, slug, or domain..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="country">Country</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sort">Sort By</Label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-')
                  setSortBy(field)
                  setSortOrder(order as "asc" | "desc")
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="members-desc">Most Members</SelectItem>
                    <SelectItem value="revenue-desc">Highest Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Bulk Actions */}
        {selectedOrgs.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedOrgs.length} organization{selectedOrgs.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("export")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrgs([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organizations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organizations ({filteredOrganizations.length})</CardTitle>
                <CardDescription>
                  {selectedOrgs.length > 0 && `${selectedOrgs.length} selected`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedOrgs.length === filteredOrganizations.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/6" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Organizations</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchOrganizations}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== "all" || countryFilter !== "all"
                    ? "Try adjusting your filters or search terms."
                    : "Get started by creating your first organization."}
                </p>
                {!search && statusFilter === "all" && countryFilter === "all" && (
                  <AdminOrganizationCreatorDialog onOrganizationCreated={handleOrganizationCreated} />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrganizations.map((org, index) => {
                  const subscriptionInfo = getSubscriptionStatus(org)
                  const primarySub = org.primary_subscription || org.subscriptions?.[0]
                  const isSelected = selectedOrgs.includes(org.id)
                  
                  return (
                    <motion.div
                      key={org.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className={cn(
                        "flex items-center space-x-4 p-4 border rounded-lg transition-all hover:shadow-md hover:border-primary/50",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOrg(org.id)}
                          className="rounded border-border"
                        />
                        
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={org.logo || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {org.name?.[0]?.toUpperCase() || "O"}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{org.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              @{org.slug}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {org.members?.length || 0} members
                            </div>
                            {org.domain && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {org.domain}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {org.country}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(org.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge className={`mb-2 ${subscriptionInfo.color}`}>
                            {subscriptionInfo.status}
                          </Badge>
                          {primarySub && (
                            <div className="text-sm">
                              <div className="font-medium text-foreground">
                                {formatCurrency(primarySub.amount, 'ZAR')}
                              </div>
                              <div className="text-muted-foreground">
                                {primarySub.plan_name || 'Unknown Plan'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/${org.slug}/dashboard`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  )
}

