"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CreditCard,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
  RefreshCw,
} from "lucide-react"
import { api } from "@/lib/api"
import { useOrganization, usePrimarySubscription, useBillingInfo } from "@/lib/contexts/organization-context"

export function BillingPageContent() {
  const { organization, loading: orgLoading, error: orgError } = useOrganization()
  const { subscription: primarySubscription, loading: subLoading } = usePrimarySubscription()
  const { billingInfo, loading: billingLoading, refresh: refreshBilling } = useBillingInfo()
  const [error, setError] = useState<string | null>(null)

  const loading = orgLoading || subLoading || billingLoading

  const getSubscriptionType = () => {
    if (!primarySubscription) return "free"
    if (primarySubscription.status === "trialing") return "trial"
    if (primarySubscription.status === "active") return "existing_paid"
    return "free"
  }

  const subscriptionType = getSubscriptionType()
  const subscriptionData = primarySubscription?.external_details

  const handleUpdateCard = async () => {
    if (!primarySubscription?.provider_subscription_id) return

    try {
      const result = await api.paystack.generateUpdateCardLink(String(primarySubscription.provider_subscription_id))
      if (result.success && result.data?.link) {
        window.open(result.data.link, "_blank")
      } else {
        setError(result.error || "Failed to generate update link")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update card")
    }
  }

  const formatCurrency = (amount: number, currency = "ZAR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <AppPageContainer>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-base sm:text-lg text-muted-foreground">Loading billing information...</span>
        </div>
      </AppPageContainer>
    )
  }

  return (
    <AppPageContainer>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Billing & Subscription</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">Manage your subscription and payment methods</p>
          </div>
          <Button onClick={refreshBilling} variant="outline" size="sm" className="app-touch shrink-0">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {(error || orgError) && (
          <Card className="app-card border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive font-medium">{error || orgError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Overview */}
        <Card className="app-card bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Current Subscription</CardTitle>
                <CardDescription>Your current plan and billing status</CardDescription>
              </div>
              <Badge
                variant={
                  subscriptionType === "free" ? "secondary" : subscriptionType === "trial" ? "outline" : "default"
                }
                className="text-sm px-3 py-1"
              >
                {subscriptionType === "free"
                  ? "Free Plan"
                  : subscriptionType === "trial"
                    ? "Trial"
                    : subscriptionData?.status === "active"
                      ? "Active"
                      : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
            {subscriptionType === "free" && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
                <p className="text-muted-foreground">
                  You're currently on our free plan with full access to all features.
                </p>
              </div>
            )}

            {subscriptionType === "trial" && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Trial Period</h3>
                <p className="text-muted-foreground mb-4">
                  Your trial expires on{" "}
                  {primarySubscription?.trial_end_date ? formatDate(String(primarySubscription.trial_end_date)) : "N/A"}
                </p>
                <Button className="bg-primary hover:bg-primary/90">Upgrade to Paid Plan</Button>
              </div>
            )}

            {subscriptionType === "existing_paid" && subscriptionData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-medium">Plan</span>
                  </div>
                  <p className="text-2xl font-bold">{subscriptionData.plan?.name || "Premium"}</p>
                  <p className="text-muted-foreground">
                    {subscriptionData.plan
                      ? formatCurrency(subscriptionData.plan.amount, subscriptionData.plan.currency)
                      : "N/A"}{" "}
                    / {subscriptionData.plan?.interval || "month"}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">Next Payment</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {billingInfo?.nextPaymentDate ? formatDate(billingInfo.nextPaymentDate) : "N/A"}
                  </p>
                  <p className="text-muted-foreground">
                    {subscriptionData.plan
                      ? formatCurrency(
                          subscriptionData.amount || subscriptionData.plan.amount,
                          subscriptionData.plan.currency,
                        )
                      : "N/A"}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium">Status</span>
                  </div>
                  <Badge
                    variant={subscriptionData.status === "active" ? "default" : "secondary"}
                    className="text-lg px-3 py-1"
                  >
                    {subscriptionData.status}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        {subscriptionType === "existing_paid" && billingInfo?.paymentMethod && (
          <Card className="app-card">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Method</span>
              </CardTitle>
              <CardDescription>Your current payment method on file</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-primary to-secondary rounded flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {billingInfo.paymentMethod.brand.toUpperCase()} •••• {billingInfo.paymentMethod.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">{billingInfo.paymentMethod.type}</p>
                  </div>
                </div>
                <Button onClick={handleUpdateCard} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Update Card
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {subscriptionType === "existing_paid" &&
          billingInfo?.recentTransactions &&
          billingInfo.recentTransactions.length > 0 && (
            <Card className="app-card">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Your recent payment transactions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="space-y-4">
                  {billingInfo.recentTransactions.slice(0, 10).map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              transaction.status === "success"
                                ? "bg-primary"
                                : transaction.status === "failed"
                                  ? "bg-destructive"
                                  : "bg-muted-foreground"
                            }`}
                          />
                          <div>
                            <p className="font-medium">{formatCurrency(transaction.amount, transaction.currency)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(transaction.paid_at || transaction.created_at)} • {transaction.channel}
                            </p>
                            <p className="text-xs text-muted-foreground">Ref: {transaction.reference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              transaction.status === "success"
                                ? "default"
                                : transaction.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {transaction.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">{transaction.gateway_response}</p>
                          {transaction.fees > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Fee: {formatCurrency(transaction.fees, transaction.currency)}
                            </p>
                          )}
                        </div>
                      </div>
                      {index < billingInfo.recentTransactions.slice(0, 10).length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

      </div>
    </AppPageContainer>
  )
}
