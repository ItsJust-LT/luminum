"use client"

import { useEffect, useState, useCallback } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useRealtime } from "@/components/realtime/realtime-provider"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageCircle,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Trash2,
  Phone,
  Clock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

interface WhatsAppAccount {
  id: string
  organization_id: string
  phone_number: string
  status: string
  qr_code: string | null
  last_error: string | null
  connected_at: string | null
  last_seen_at: string | null
  session_saved_at: string | null
  retry_count: number
  clientReady: boolean
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    CONNECTED: {
      label: "Connected",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: <Wifi className="h-3 w-3" />,
    },
    DISCONNECTED: {
      label: "Disconnected",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      icon: <WifiOff className="h-3 w-3" />,
    },
    CONNECTING: {
      label: "Connecting",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    QR_PENDING: {
      label: "Awaiting QR Scan",
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: <QrCode className="h-3 w-3" />,
    },
    ERROR: {
      label: "Error",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: <XCircle className="h-3 w-3" />,
    },
  }

  const info = map[status] || map.DISCONNECTED
  return (
    <Badge className={`${info.className} gap-1.5`} variant="secondary">
      {info.icon}
      {info.label}
    </Badge>
  )
}

export default function WhatsAppSettingsPage() {
  const { organization } = useOrganization()
  const { onMessage } = useRealtime()
  const pathname = usePathname()
  const slug = pathname?.split("/")[1] || ""

  const [account, setAccount] = useState<WhatsAppAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const orgId = organization?.id

  const loadAccount = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await api.whatsapp.getAccount(orgId) as any
      setAccount(res.account || null)
    } catch {
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  // Poll while connecting
  useEffect(() => {
    if (!account || (account.status !== "QR_PENDING" && account.status !== "CONNECTING")) return
    const timer = setInterval(loadAccount, 3000)
    return () => clearInterval(timer)
  }, [account?.status, loadAccount])

  // Realtime status updates
  useEffect(() => {
    const unsub = onMessage("whatsapp:status", () => {
      loadAccount()
    })
    return unsub
  }, [onMessage, loadAccount])

  const handleConnect = async () => {
    if (!orgId) return
    setActionLoading("connect")
    try {
      await api.whatsapp.createAccount(orgId)
      toast.success("Connecting... QR code will appear shortly.")
      await loadAccount()
    } catch (err: any) {
      toast.error(err.message || "Failed to start connection")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReconnect = async () => {
    if (!orgId) return
    setActionLoading("reconnect")
    try {
      await api.whatsapp.reconnect(orgId)
      toast.success("Reconnecting...")
      await loadAccount()
    } catch (err: any) {
      toast.error(err.message || "Failed to reconnect")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisconnect = async () => {
    if (!orgId) return
    setActionLoading("disconnect")
    try {
      await api.whatsapp.disconnect(orgId)
      toast.success("Disconnected.")
      await loadAccount()
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async () => {
    if (!account) return
    setActionLoading("remove")
    try {
      await api.whatsapp.deleteAccount(account.id)
      toast.success("WhatsApp account removed.")
      setAccount(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to remove account")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/whatsapp`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">WhatsApp Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your WhatsApp connection</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Connection Status
          </CardTitle>
          <CardDescription>
            {account
              ? "Your WhatsApp account is configured."
              : "No WhatsApp account connected."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {account ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</p>
                  <div className="mt-1"><StatusBadge status={account.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{account.phone_number || "Not linked"}</span>
                  </div>
                </div>
                {account.connected_at && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Connected Since</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{new Date(account.connected_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
                {account.last_seen_at && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Last Active</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{new Date(account.last_seen_at).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {account.status === "QR_PENDING" && account.qr_code && (
                <div className="mt-4 p-4 border rounded-xl bg-muted/30 text-center space-y-3">
                  <p className="text-sm font-medium">Scan this QR code with WhatsApp</p>
                  <div className="bg-white p-3 rounded-lg inline-block">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(account.qr_code)}`}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {account.last_error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{account.last_error}</span>
                </div>
              )}

              {account.session_saved_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Session durably saved at {new Date(account.session_saved_at).toLocaleString()}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">Connect a WhatsApp number to get started.</p>
              <Button
                onClick={handleConnect}
                disabled={actionLoading === "connect"}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {actionLoading === "connect" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Connect WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      {account && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account.status === "CONNECTED" && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDisconnect}
                disabled={!!actionLoading}
              >
                {actionLoading === "disconnect" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <WifiOff className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
            )}

            {(account.status === "DISCONNECTED" || account.status === "ERROR") && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleReconnect}
                disabled={!!actionLoading}
              >
                {actionLoading === "reconnect" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reconnect
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  disabled={!!actionLoading}
                >
                  {actionLoading === "remove" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove WhatsApp Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove WhatsApp Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently disconnect and remove this WhatsApp account. All chat history
                    stored in the database will also be deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground">
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
