"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

type PaystackTransactionFilters = {
  from?: string
  to?: string
  status?: string
  currency?: string
  perPage?: number
}

function processRevenueResponse(res: { transactions?: any[] }, currencyFilter?: string) {
  const transactions = res?.transactions || []
  const successful = transactions.filter((t: any) => t.status === "success")
  const failed = transactions.filter((t: any) => t.status !== "success")
  const totalRevenue = successful.reduce((sum: number, t: any) => sum + (t.amount || 0) / 100, 0)
  const revenueByCurrency: Record<string, number> = {}
  const revenueByStatus: Record<string, number> = {}
  const revenueByMonth: Record<string, number> = {}
  successful.forEach((t: any) => {
    const c = (t.currency || "ZAR").toUpperCase()
    revenueByCurrency[c] = (revenueByCurrency[c] || 0) + (t.amount || 0) / 100
    const s = t.status || "unknown"
    revenueByStatus[s] = (revenueByStatus[s] || 0) + (t.amount || 0) / 100
    if (t.created_at) {
      const month = new Date(t.created_at).toISOString().slice(0, 7)
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (t.amount || 0) / 100
    }
  })
  const byCustomer: Record<string, { email: string; totalAmount: number; transactionCount: number }> = {}
  successful.forEach((t: any) => {
    const email = t.customer?.email || "Unknown"
    if (!byCustomer[email]) byCustomer[email] = { email, totalAmount: 0, transactionCount: 0 }
    byCustomer[email].totalAmount += (t.amount || 0) / 100
    byCustomer[email].transactionCount += 1
  })
  const topCustomers = Object.values(byCustomer)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
  const recentTransactions = [...successful].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ).slice(0, 20)
  return {
    totalRevenue,
    successfulTransactions: successful.length,
    failedTransactions: failed.length,
    totalTransactions: transactions.length,
    averageTransactionValue: successful.length ? totalRevenue / successful.length : 0,
    revenueByCurrency,
    revenueByStatus,
    revenueByMonth,
    topCustomers,
    recentTransactions,
  }
}

interface SimpleRevenueDashboardProps {
  onRefresh?: () => void
}

export function SimpleRevenueDashboard({ onRefresh }: SimpleRevenueDashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PaystackTransactionFilters>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    status: 'success',
    currency: 'ZAR',
    perPage: 1000
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.paystack.getRevenueAnalytics({ from: filters.from, to: filters.to }) as { success?: boolean; transactions?: any[]; error?: string }
      if (result.success && result.transactions) {
        setAnalytics(processRevenueResponse(result, filters.currency))
      } else {
        setError((result as any).error || "Failed to fetch analytics")
      }
    } catch (err) {
      setError("Failed to fetch analytics")
      console.error("Error fetching analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [filters])

  const handleFilterChange = (key: keyof PaystackTransactionFilters, value: any) => {
    if (value === 'all') {
      setFilters(prev => {
        const newFilters = { ...prev }
        delete newFilters[key as keyof PaystackTransactionFilters]
        return newFilters
      })
    } else {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
  }

  const resetFilters = () => {
    setFilters({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
      status: 'success',
      currency: 'ZAR',
      perPage: 1000
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchAnalytics} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Simple Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Analytics</CardTitle>
          <CardDescription>Track your ZAR revenue and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={filters.from || ''}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={filters.to || ''}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={resetFilters} variant="outline" size="sm">
                Reset
              </Button>
              <Button onClick={fetchAnalytics} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalRevenue, 'ZAR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.successfulTransactions} successful transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.averageTransactionValue, 'ZAR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Per successful transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalTransactions > 0 
                ? Math.round((analytics.successfulTransactions / analytics.totalTransactions) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.successfulTransactions} of {analytics.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {analytics.failedTransactions}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalTransactions > 0 
                ? Math.round((analytics.failedTransactions / analytics.totalTransactions) * 100)
                : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simplified Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Top Customers</span>
            </CardTitle>
            <CardDescription>Highest spending customers this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                <div key={customer.customer} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name || customer.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.transactionCount} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(customer.totalAmount, 'ZAR')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Recent Transactions</span>
            </CardTitle>
            <CardDescription>Latest transaction activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentTransactions.slice(0, 5).map((transaction: any) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">#{transaction.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.customer?.first_name && transaction.customer?.last_name 
                          ? `${transaction.customer.first_name} ${transaction.customer.last_name}`
                          : transaction.customer?.email || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={transaction.status === 'success' ? 'default' : 'secondary'} className="text-xs">
                      {transaction.status}
                    </Badge>
                    <p className="font-bold text-sm mt-1">
                      {formatCurrency(transaction.amount / 100, 'ZAR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
