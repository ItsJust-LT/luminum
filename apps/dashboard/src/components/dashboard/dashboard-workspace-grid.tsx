"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useOrganization } from "@/lib/contexts/organization-context"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { AuditListItem } from "@/lib/types/audits"
import type { FolderCounts } from "@/components/emails/mailbox-sidebar"
import { FormSubmissionsInfo } from "@/components/analytics/form-submissions-info"
import { useOrganizationChannel } from "@/lib/ably/client"
import { OrganizationEvents } from "@/lib/ably/events"
import {
  ClipboardList,
  Gauge,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  Receipt,
  RefreshCw,
  BookOpen,
  ArrowRight,
  CheckCheck,
} from "lucide-react"

type BlogRow = { status: string }
type InvoiceStats = {
  total: number
  draft: number
  sent: number
  paid: number
  overdue: number
  outstandingRevenue: number
  paidRevenue: number
}

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

function gradeBadgeClass(grade?: string) {
  switch (grade) {
    case "A":
      return "border-chart-2/40 bg-chart-2/12 text-chart-2"
    case "B":
      return "border-chart-5/40 bg-chart-5/12 text-chart-5"
    case "C":
      return "border-chart-3/40 bg-chart-3/12 text-chart-3"
    case "D":
      return "border-chart-4/40 bg-chart-4/12 text-chart-4"
    default:
      return "border-muted text-muted-foreground"
  }
}

interface DashboardWorkspaceGridProps {
  websiteId: string
  websiteDomain?: string
  organizationSlug: string
}

export function DashboardWorkspaceGrid({ websiteId, websiteDomain, organizationSlug }: DashboardWorkspaceGridProps) {
  const { organization, hasAllPermissions } = useOrganization()
  const orgId = organization?.id ?? ""

  const canForms = hasAllPermissions(["forms:read"])
  const canAudits = hasAllPermissions(["audits:read"])
  const canRunAudit = hasAllPermissions(["audits:run"])
  const canInvoices = organization?.invoices_enabled === true && hasAllPermissions(["invoices:read"])
  const canWhatsapp = organization?.whatsapp_enabled === true && hasAllPermissions(["whatsapp:read"])
  const canEmail = organization?.emails_enabled === true && hasAllPermissions(["email:read"])
  const canBlog = organization?.blogs_enabled === true && hasAllPermissions(["blog:read"])

  const [formsUnseen, setFormsUnseen] = useState<number | null>(null)
  const [audits, setAudits] = useState<AuditListItem[]>([])
  const [auditsLoading, setAuditsLoading] = useState(false)
  const [auditRunning, setAuditRunning] = useState(false)
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null)
  const [waUnread, setWaUnread] = useState(0)
  const [waConnected, setWaConnected] = useState<boolean | null>(null)
  const [folderCounts, setFolderCounts] = useState<FolderCounts | null>(null)
  const [emailUnreadTotal, setEmailUnreadTotal] = useState(0)
  const [markingRead, setMarkingRead] = useState(false)
  const [blogSlices, setBlogSlices] = useState<{ name: string; value: number; fill: string }[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(true)

  const refreshWorkspace = useCallback(async () => {
    if (!orgId) return
    setWorkspaceLoading(true)
    try {
      const tasks: Promise<void>[] = []

      if (canForms) {
        tasks.push(
          (async () => {
            const r = (await api.forms.getUnseenCount(orgId)) as { success?: boolean; count?: number }
            if (r?.success) setFormsUnseen(r.count ?? 0)
          })()
        )
      }

      if (canAudits) {
        tasks.push(
          (async () => {
            setAuditsLoading(true)
            try {
              const res = (await api.websiteAudits.list({ websiteId, limit: 8 })) as { data?: AuditListItem[] }
              setAudits(res?.data ?? [])
            } finally {
              setAuditsLoading(false)
            }
          })()
        )
      }

      if (canInvoices) {
        tasks.push(
          (async () => {
            const r = (await api.invoices.getStats(orgId)) as { stats?: InvoiceStats }
            setInvoiceStats(r?.stats ?? null)
          })()
        )
      }

      if (canWhatsapp) {
        tasks.push(
          (async () => {
            try {
              const [u, acc] = await Promise.all([
                api.whatsapp.getUnreadCount(orgId) as Promise<{ success?: boolean; count?: number }>,
                api.whatsapp.getAccount(orgId) as Promise<{ account?: { status?: string } | null }>,
              ])
              setWaUnread(u?.count ?? 0)
              setWaConnected(acc?.account?.status === "CONNECTED")
            } catch {
              setWaUnread(0)
              setWaConnected(null)
            }
          })()
        )
      }

      if (canEmail) {
        tasks.push(
          (async () => {
            try {
              const [fc, ur] = await Promise.all([
                api.emails.folderCounts(orgId) as Promise<{ success?: boolean; data?: FolderCounts }>,
                api.emails.getUnreadCount(orgId) as Promise<{ success?: boolean; count?: number }>,
              ])
              if (fc?.success && fc.data) setFolderCounts(fc.data)
              if (ur?.success) setEmailUnreadTotal(ur.count ?? 0)
            } catch {
              /* ignore */
            }
          })()
        )
      }

      if (canBlog) {
        tasks.push(
          (async () => {
            const r = (await api.blog.listPosts(orgId, 1, 200)) as { posts?: BlogRow[] }
            const posts = r?.posts ?? []
            const tally: Record<string, number> = {}
            for (const p of posts) {
              const s = p.status || "draft"
              tally[s] = (tally[s] || 0) + 1
            }
            const order = ["published", "scheduled", "draft"]
            const slices = order
              .filter((k) => (tally[k] || 0) > 0)
              .map((k, i) => ({
                name: k.charAt(0).toUpperCase() + k.slice(1),
                value: tally[k] || 0,
                fill: PIE_COLORS[i % PIE_COLORS.length],
              }))
            setBlogSlices(slices.length ? slices : [{ name: "No posts", value: 1, fill: "var(--color-muted)" }])
          })()
        )
      }

      await Promise.allSettled(tasks)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [orgId, websiteId, canForms, canAudits, canInvoices, canWhatsapp, canEmail, canBlog])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  const onOrgEvent = useCallback(
    (eventType: string) => {
      if (
        eventType === OrganizationEvents.FORM_SUBMISSION_CREATED ||
        eventType === OrganizationEvents.FORM_SUBMISSION_UPDATED ||
        eventType === OrganizationEvents.WHATSAPP_MESSAGE
      ) {
        void refreshWorkspace()
      }
    },
    [refreshWorkspace]
  )
  useOrganizationChannel(orgId || null, onOrgEvent)

  const latestCompletedAudit = useMemo(
    () => audits.find((a) => a.status === "completed" && a.summary) ?? null,
    [audits]
  )

  const invoiceStatusBars = useMemo(() => {
    if (!invoiceStats) return []
    const rows = [
      { key: "paid", label: "Paid", n: invoiceStats.paid, className: "bg-chart-2" },
      { key: "sent", label: "Sent", n: invoiceStats.sent, className: "bg-chart-1" },
      { key: "draft", label: "Draft", n: invoiceStats.draft, className: "bg-muted-foreground/50" },
      { key: "overdue", label: "Overdue", n: invoiceStats.overdue, className: "bg-destructive" },
    ].filter((r) => r.n > 0)
    const max = Math.max(1, ...rows.map((r) => r.n))
    return rows.map((r) => ({ ...r, pct: (r.n / max) * 100 }))
  }, [invoiceStats])

  const mailBarData = useMemo(() => {
    if (!folderCounts) return [] as { folder: string; n: number }[]
    return [
      { folder: "Inbox unread", n: folderCounts.inboxUnread },
      { folder: "Sent", n: folderCounts.sent },
      { folder: "Drafts", n: folderCounts.drafts },
      { folder: "Starred", n: folderCounts.starred },
      { folder: "Scheduled", n: folderCounts.scheduled },
    ].filter((x) => x.n > 0)
  }, [folderCounts])

  const mailChartConfig = {
    n: { label: "Messages", color: "var(--color-chart-1)" },
  } satisfies ChartConfig

  const blogChartConfig = useMemo(() => {
    const c: ChartConfig = { count: { label: "Posts" } }
    blogSlices.forEach((s, i) => {
      c[`s${i}`] = { label: s.name, color: s.fill }
    })
    return c
  }, [blogSlices])

  const handleRunAudit = async () => {
    if (!canRunAudit || auditRunning) return
    setAuditRunning(true)
    try {
      const r = (await api.websiteAudits.create(websiteId)) as { data?: { auditId?: string }; error?: string }
      if ((r as { error?: string }).error) throw new Error((r as { error?: string }).error)
      toast.success("Audit started — results appear in Site audits when ready.")
      await refreshWorkspace()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start audit")
    } finally {
      setAuditRunning(false)
    }
  }

  const handleMarkAllMailRead = async () => {
    if (!canEmail || markingRead) return
    setMarkingRead(true)
    try {
      await api.emails.markAllAsRead(orgId)
      toast.success("Inbox marked as read")
      await refreshWorkspace()
    } catch {
      toast.error("Could not mark all as read")
    } finally {
      setMarkingRead(false)
    }
  }

  const base = `/${organizationSlug}`

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight">Workspace snapshot</h2>
          <p className="text-muted-foreground mt-0.5 max-w-2xl text-sm">
            Forms, quality checks, billing, messaging, content — prioritized by what usually needs attention first.
            {websiteDomain ? (
              <>
                {" "}
                Site: <span className="text-foreground font-medium">{websiteDomain}</span>
              </>
            ) : null}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => void refreshWorkspace()} disabled={workspaceLoading}>
          <RefreshCw className={cn("h-4 w-4", workspaceLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 xl:gap-5">
        {canForms ? (
          <Card
            className={cn(
              "app-card md:col-span-2",
              formsUnseen != null && formsUnseen > 0 ? "xl:col-span-8" : "xl:col-span-12"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="text-primary h-4 w-4" />
                    Form submissions
                  </CardTitle>
                  <CardDescription>Latest entries from your site forms</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {formsUnseen != null && formsUnseen > 0 ? (
                    <Badge variant="secondary" className="bg-primary/12 text-primary">
                      {formsUnseen} new
                    </Badge>
                  ) : null}
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <Link href={`${base}/forms`}>
                      All forms
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FormSubmissionsInfo websiteId={websiteId} />
            </CardContent>
          </Card>
        ) : null}

        {canForms && formsUnseen != null && formsUnseen > 0 ? (
          <Card className="app-card xl:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">New leads</CardTitle>
              <CardDescription>Unseen submissions waiting for review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-foreground text-4xl font-semibold tabular-nums">{formsUnseen}</div>
              <Progress value={Math.min(100, formsUnseen * 10)} className="h-2" />
              <p className="text-muted-foreground text-xs">Open the forms workspace to mark items as seen or follow up.</p>
              <Button className="w-full" size="sm" asChild>
                <Link href={`${base}/forms`}>Review submissions</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canAudits ? (
          <Card className="app-card xl:col-span-4">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="text-primary h-4 w-4" />
                    Site audits
                  </CardTitle>
                  <CardDescription>Performance & quality runs</CardDescription>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0" asChild>
                  <Link href={`${base}/audits`}>Open</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              ) : latestCompletedAudit?.summary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm">Latest grade</span>
                    <Badge variant="outline" className={cn("font-mono text-sm", gradeBadgeClass(latestCompletedAudit.summary.grade))}>
                      {latestCompletedAudit.summary.grade}
                    </Badge>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Overall score</span>
                      <span className="font-medium tabular-nums">{latestCompletedAudit.summary.overallScore}</span>
                    </div>
                    <Progress value={latestCompletedAudit.summary.overallScore} className="h-2" />
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-xs">{latestCompletedAudit.targetUrl}</p>
                </div>
              ) : (
                <p className="text-muted-foreground py-2 text-sm">No completed audits yet for this site.</p>
              )}
              <Separator />
              {canRunAudit ? (
                <Button className="w-full gap-2" size="sm" variant="secondary" disabled={auditRunning} onClick={() => void handleRunAudit()}>
                  {auditRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
                  Run new audit
                </Button>
              ) : (
                <Button className="w-full" size="sm" variant="outline" asChild>
                  <Link href={`${base}/audits`}>View audits</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canInvoices && invoiceStats ? (
          <Card className="app-card xl:col-span-4">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="text-primary h-4 w-4" />
                    Invoices
                  </CardTitle>
                  <CardDescription>Status mix · {invoiceStats.total} documents</CardDescription>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`${base}/invoices`}>Open</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">Outstanding</p>
                  <p className="text-chart-3 mt-0.5 font-semibold tabular-nums">
                    {Number(invoiceStats.outstandingRevenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">Collected</p>
                  <p className="text-chart-2 mt-0.5 font-semibold tabular-nums">
                    {Number(invoiceStats.paidRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {invoiceStatusBars.map((r) => (
                  <div key={r.key}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span>{r.label}</span>
                      <span className="tabular-nums">{r.n}</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div className={cn("h-full rounded-full transition-all", r.className)} style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" className="w-full gap-2" asChild>
                <Link href={`${base}/invoices/new?type=invoice`}>
                  <Receipt className="h-4 w-4" />
                  New invoice
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canWhatsapp ? (
          <Card className="app-card xl:col-span-4">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="text-primary h-4 w-4" />
                    WhatsApp
                  </CardTitle>
                  <CardDescription>Unread chats and link status</CardDescription>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`${base}/whatsapp`}>Open</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Unread</p>
                  <p className="text-foreground text-3xl font-semibold tabular-nums">{waUnread}</p>
                </div>
                <div className="flex-1">
                  <ChartContainer
                    config={{ a: { label: "Unread", color: "var(--color-chart-2)" }, b: { label: "Rest", color: "var(--color-muted)" } }}
                    className="mx-auto aspect-square max-h-[140px] w-full"
                  >
                    <PieChart>
                      <Pie
                        data={[
                          { name: "unread", value: Math.max(1, waUnread), fill: "var(--color-chart-2)" },
                          { name: "rest", value: Math.max(1, 5), fill: "var(--color-muted)" },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={44}
                        outerRadius={62}
                        strokeWidth={2}
                      >
                        {null}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
              </div>
              <Badge variant="outline" className={cn(waConnected ? "border-chart-2/40 text-chart-2" : "text-muted-foreground")}>
                {waConnected === null ? "Status unknown" : waConnected ? "Connected" : "Not connected"}
              </Badge>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href={`${base}/whatsapp`}>{waConnected ? "Open inbox" : "Connect WhatsApp"}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canEmail && folderCounts ? (
          <Card className="app-card xl:col-span-4">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="text-primary h-4 w-4" />
                    Mail
                  </CardTitle>
                  <CardDescription>Folder volumes · {emailUnreadTotal} unread (workspace)</CardDescription>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`${base}/emails`}>Inbox</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mailBarData.length > 0 ? (
                <ChartContainer config={mailChartConfig} className="h-[180px] w-full">
                  <BarChart data={mailBarData} accessibilityLayer>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="folder" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="n" radius={6} fill="var(--color-chart-1)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No folder data yet.</p>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="w-full gap-2"
                disabled={markingRead || emailUnreadTotal === 0}
                onClick={() => void handleMarkAllMailRead()}
              >
                {markingRead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Mark inbox read
              </Button>
              <Button size="sm" variant="outline" className="w-full gap-2" asChild>
                <Link href={`${base}/emails/compose`}>
                  <Inbox className="h-4 w-4" />
                  Compose
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canBlog && blogSlices.length > 0 ? (
          <Card className="app-card xl:col-span-4">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="text-primary h-4 w-4" />
                    Blog
                  </CardTitle>
                  <CardDescription>Posts by status (not traffic)</CardDescription>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`${base}/blogs`}>Open</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={blogChartConfig} className="mx-auto aspect-square max-h-[200px] w-full">
                <PieChart>
                  <Pie data={blogSlices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={2}>
                    {blogSlices.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="flex-1" asChild>
                  <Link href={`${base}/blogs/new`}>New post</Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href={`${base}/blogs`}>Manage posts</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!canForms && !canAudits && !canInvoices && !canWhatsapp && !canEmail && !canBlog ? (
          <Card className="app-card xl:col-span-12">
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No additional workspace modules are enabled or you do not have access. Ask an admin if you need forms, audits,
              billing, or messaging.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
