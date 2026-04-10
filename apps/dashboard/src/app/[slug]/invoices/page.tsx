"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "@/lib/auth/client"
import { useOrganization } from "@/lib/contexts/organization-context"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import LoadingAnimation from "@/components/LoadingAnimation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AppPageContainer } from "@/components/app-shell/app-page-container"
import { cn } from "@/lib/utils"
import {
  Receipt, Loader2, MoreHorizontal, Plus, Search, Trash2,
  FileDown, Eye, Pencil, Send, CheckCircle, Clock, FileText,
  AlertCircle, TrendingUp, DollarSign,
  ChevronDown, FileCheck, ArrowRightLeft, CalendarClock, Banknote, Link2, X,
  ArrowDownUp,
} from "lucide-react"
import { mergeSearchParams } from "@/lib/url-state/list-query"

type InvoiceRow = {
  id: string;
  invoice_number: string;
  document_type: string;
  client_name: string;
  client_email?: string;
  date: string;
  due_date?: string | null;
  currency: string;
  grand_total: string | number;
  status: string;
  pdf_storage_key?: string | null;
  job_reference?: string | null;
};

type InvoiceStats = {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
  accepted: number;
  expired: number;
  totalRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
};

type StatusFilter = "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled" | "accepted" | "expired";

type InvoiceSortKey = "date_desc" | "date_asc" | "amount_desc" | "client_asc";
const INVOICE_SORT_CHOICES: InvoiceSortKey[] = ["date_desc", "date_asc", "amount_desc", "client_asc"];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Receipt; badgeClass: string }> = {
  draft: { label: "Draft", icon: FileText, badgeClass: "border-border bg-muted/60 text-muted-foreground border" },
  sent: { label: "Sent", icon: Send, badgeClass: "border-chart-1/40 bg-chart-1/12 text-chart-1 border" },
  paid: { label: "Paid", icon: CheckCircle, badgeClass: "border-chart-2/40 bg-chart-2/12 text-chart-2 border" },
  overdue: { label: "Overdue", icon: AlertCircle, badgeClass: "border-destructive/45 bg-destructive/10 text-destructive border" },
  cancelled: { label: "Cancelled", icon: Clock, badgeClass: "border-border text-muted-foreground border" },
  accepted: { label: "Accepted", icon: FileCheck, badgeClass: "border-chart-2/40 bg-chart-2/12 text-chart-2 border" },
  expired: { label: "Expired", icon: Clock, badgeClass: "border-border text-muted-foreground border" },
  rejected: { label: "Rejected", icon: AlertCircle, badgeClass: "border-destructive/45 bg-destructive/10 text-destructive border" },
}

function docTypeBadgeClass(documentType: string) {
  if (documentType === "quote") return "border-chart-1/40 bg-chart-1/10 text-chart-1 border"
  if (documentType === "receipt") return "border-chart-2/40 bg-chart-2/10 text-chart-2 border"
  return "border-primary/35 bg-primary/10 text-primary border"
}

function formatMoney(amount: number | string, currency: string = "ZAR") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

function chainRefLabel(inv: InvoiceRow): string | null {
  const r = inv.job_reference?.trim();
  if (!r || r === inv.invoice_number.trim()) return null;
  return r;
}

function OrgInvoicesListPageInner() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<"all" | "invoice" | "quote" | "receipt">("all");
  const [sortBy, setSortBy] = useState<InvoiceSortKey>("date_desc");
  const queryFocusRef = useRef(false);

  const pushInvoiceUrl = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const qs = typeof window !== "undefined" ? window.location.search.slice(1) : searchParams.toString();
      const merged = mergeSearchParams(qs, updates);
      router.replace(merged ? `${pathname}?${merged}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (queryFocusRef.current) return;
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "invoice" || t === "quote" || t === "receipt") setDocTypeFilter(t);
    else if (t === "all") setDocTypeFilter("all");

    const st = searchParams.get("status");
    if (!st || st === "all") setStatusFilter("all");
    else setStatusFilter(st as StatusFilter);

    const so = searchParams.get("sort");
    if (so && (INVOICE_SORT_CHOICES as readonly string[]).includes(so)) {
      setSortBy(so as InvoiceSortKey);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const qs = typeof window !== "undefined" ? window.location.search.slice(1) : searchParams.toString();
      const cur = new URLSearchParams(qs).get("q") ?? "";
      if (query === cur) return;
      const merged = mergeSearchParams(qs, { q: query || null });
      router.replace(merged ? `${pathname}?${merged}` : pathname, { scroll: false });
    }, 380);
    return () => window.clearTimeout(t);
  }, [query, pathname, router, searchParams]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadInvoices = useCallback(
    async (mode: "full" | "sync" = "full") => {
      if (!organization?.id) return;
      if (mode === "full") setLoading(true);
      else setSyncing(true);
      try {
        const listParams: Record<string, unknown> = { page: 1, limit: 100 };
        if (docTypeFilter !== "all") listParams.document_type = docTypeFilter;
        const [listRes, statsRes] = await Promise.all([
          api.invoices.list(organization.id, listParams) as Promise<{ invoices: InvoiceRow[] }>,
          api.invoices.getStats(organization.id, docTypeFilter !== "all" ? docTypeFilter : undefined) as Promise<{ stats: InvoiceStats }>,
        ]);
        setInvoices(listRes.invoices ?? []);
        setStats(statsRes.stats ?? null);
      } catch {
        if (mode === "full") toast.error("Failed to load documents");
      } finally {
        if (mode === "full") setLoading(false);
        else setSyncing(false);
      }
    },
    [organization?.id, docTypeFilter]
  );

  useEffect(() => {
    loadInvoices("full");
  }, [loadInvoices]);

  useEffect(() => {
    if (!organization?.id) return;
    const tick = () => {
      if (document.visibilityState === "visible") loadInvoices("sync");
    };
    const id = setInterval(tick, 14_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [organization?.id, loadInvoices]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          i.client_name.toLowerCase().includes(q) ||
          (i.client_email && i.client_email.toLowerCase().includes(q))
      );
    }
    const rows = [...list];
    rows.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount_desc":
          return (
            (typeof b.grand_total === "string" ? parseFloat(b.grand_total) : b.grand_total) -
            (typeof a.grand_total === "string" ? parseFloat(a.grand_total) : a.grand_total)
          );
        case "client_asc":
          return a.client_name.localeCompare(b.client_name, undefined, { sensitivity: "base" });
        case "date_desc":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
    return rows;
  }, [invoices, statusFilter, query, sortBy])

  const filtersActive = useMemo(
    () => query.trim().length > 0 || statusFilter !== "all",
    [query, statusFilter]
  )

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    pushInvoiceUrl({ q: null, status: null });
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.invoices.delete(deleteId);
      setInvoices((prev) => prev.filter((i) => i.id !== deleteId));
      toast.success("Deleted successfully");
      loadInvoices("sync");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.invoices.updateStatus(id, status);
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      toast.success(`Marked as ${status}`);
      loadInvoices("sync");
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleConvertToInvoice(id: string) {
    setConverting(id);
    try {
      const res = (await api.invoices.convertToInvoice(id)) as any;
      toast.success("Quote converted to invoice");
      router.push(`/${slug}/invoices/${res.invoice.id}`);
    } catch {
      toast.error("Failed to convert quote");
    } finally {
      setConverting(null);
    }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />
  if (!session) {
    router.push("/sign-in")
    return null
  }
  if (!organization) return <LoadingAnimation />

  if (!organization.invoices_enabled) {
    return (
      <AppPageContainer fullWidth className="mx-auto max-w-[1600px]">
        <Card className="app-card mx-auto max-w-md">
          <CardContent className="flex flex-col gap-4 py-10 text-center">
            <Receipt className="text-muted-foreground mx-auto h-10 w-10" />
            <h2 className="text-foreground text-lg font-semibold">Invoices are not enabled</h2>
            <p className="text-muted-foreground text-sm">
              Ask an administrator to turn on invoicing for this workspace.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/${slug}/dashboard`)}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </AppPageContainer>
    )
  }

  const currency = (organization as { currency?: string })?.currency || "ZAR"
  const isQuoteView = docTypeFilter === "quote"
  const isReceiptView = docTypeFilter === "receipt"
  const docLabel = isQuoteView ? "Quote" : isReceiptView ? "Receipt" : docTypeFilter === "invoice" ? "Invoice" : "Document"

  const statusTabs: { value: StatusFilter; label: string; count?: number }[] = isQuoteView
    ? [
        { value: "all", label: "All", count: stats?.total },
        { value: "draft", label: "Draft", count: stats?.draft },
        { value: "sent", label: "Sent", count: stats?.sent },
        { value: "accepted", label: "Accepted", count: stats?.accepted },
        { value: "expired", label: "Expired", count: stats?.expired },
      ]
    : [
        { value: "all", label: "All", count: stats?.total },
        { value: "draft", label: "Draft", count: stats?.draft },
        { value: "sent", label: "Sent", count: stats?.sent },
        { value: "paid", label: "Paid", count: stats?.paid },
        ...(isReceiptView ? [] : [{ value: "overdue" as const, label: "Overdue", count: stats?.overdue }]),
      ]

  const searchPlaceholder =
    docTypeFilter === "all"
      ? "Search documents by number, client, or email…"
      : docTypeFilter === "receipt"
        ? "Search receipts…"
        : `Search ${docTypeFilter}s…`

  return (
    <AppPageContainer fullWidth className="mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Invoices & billing</h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
                Quotes, invoices, and receipts in one place—shared client references, PDFs, and recurring schedules when you need them.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" asChild>
              <Link href={`/${slug}/invoices/schedules`}>
                <CalendarClock className="h-4 w-4" />
                Recurring
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="w-full gap-2 sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Create
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/new?type=invoice`)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  New invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/new?type=quote`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  New quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/new?type=receipt`)}>
                  <Banknote className="h-4 w-4 mr-2" />
                  New receipt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs
          value={docTypeFilter}
          onValueChange={(v) => {
            const vt = v as "all" | "invoice" | "quote" | "receipt";
            setDocTypeFilter(vt);
            setStatusFilter("all");
            pushInvoiceUrl({
              type: vt === "all" ? null : vt,
              status: null,
            });
          }}
          className="w-full gap-3"
        >
          <div className="overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto">
              <TabsTrigger value="all" className="px-3 text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="invoice" className="px-3 text-xs sm:text-sm">Invoices</TabsTrigger>
              <TabsTrigger value="quote" className="px-3 text-xs sm:text-sm">Quotes</TabsTrigger>
              <TabsTrigger value="receipt" className="px-3 text-xs sm:text-sm">Receipts</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <Separator />

        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="app-card">
              <CardContent className="flex items-center justify-between gap-2 pt-5 pb-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total</p>
                  <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
                </div>
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="app-card">
              <CardContent className="flex items-center justify-between gap-2 pt-5 pb-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Volume</p>
                  <p className="text-foreground mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl">
                    {formatMoney(stats.totalRevenue, currency)}
                  </p>
                </div>
                <div className="bg-chart-1/12 text-chart-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="app-card">
              <CardContent className="flex items-center justify-between gap-2 pt-5 pb-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Collected</p>
                  <p className="text-chart-2 mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl">
                    {formatMoney(stats.paidRevenue, currency)}
                  </p>
                </div>
                <div className="bg-chart-2/12 text-chart-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
            <Card className="app-card">
              <CardContent className="flex items-center justify-between gap-2 pt-5 pb-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Outstanding</p>
                  <p className="text-chart-3 mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl">
                    {formatMoney(stats.outstandingRevenue, currency)}
                  </p>
                </div>
                <div className="bg-chart-3/12 text-chart-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          role="search"
          aria-label="Filter documents"
        >
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                queryFocusRef.current = true;
              }}
              onBlur={() => {
                queryFocusRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  pushInvoiceUrl({ q: null });
                }
              }}
              className="pr-9 pl-9"
              aria-label="Search documents"
            />
            {query ? (
              <button
                type="button"
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1"
                onClick={() => {
                  setQuery("");
                  pushInvoiceUrl({ q: null });
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Status</span>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  const vf = v as StatusFilter;
                  setStatusFilter(vf);
                  pushInvoiceUrl({ status: vf === "all" ? null : vf });
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusTabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
                      {tab.count != null && tab.count > 0 ? ` (${tab.count})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Sort</span>
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  const sv = v as InvoiceSortKey;
                  setSortBy(sv);
                  pushInvoiceUrl({ sort: sv });
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]" aria-label="Sort documents">
                  <ArrowDownUp className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Newest first</SelectItem>
                  <SelectItem value="date_asc">Oldest first</SelectItem>
                  <SelectItem value="amount_desc">Amount (high → low)</SelectItem>
                  <SelectItem value="client_asc">Client (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {syncing ? (
              <div
                className="text-muted-foreground flex items-center gap-1.5 text-xs sm:mb-0.5"
                aria-live="polite"
              >
                <Loader2 className="text-primary h-3.5 w-3.5 shrink-0 animate-spin" />
                Syncing…
              </div>
            ) : null}
            {filtersActive ? (
              <Button type="button" variant="ghost" size="sm" className="sm:mb-0.5" onClick={clearFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>

        {!loading && stats && stats.total > 0 && (
          <p className="text-muted-foreground text-xs" aria-live="polite">
            Showing{" "}
            <span className="text-foreground font-medium">{filtered.length}</span>
            {filtered.length !== stats.total ? ` of ${stats.total}` : ""} {docLabel.toLowerCase()}
            {filtered.length === 1 ? "" : "s"}
            {docTypeFilter === "all" ? " matching this view" : ""}
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="app-card overflow-hidden">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-24 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="app-card border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Receipt className="text-muted-foreground h-10 w-10" />
            <div className="space-y-1">
              <h2 className="text-foreground text-base font-semibold">
                No {docTypeFilter === "all" ? "documents" : docTypeFilter === "receipt" ? "receipts" : `${docTypeFilter}s`}{" "}
                found
              </h2>
              <p className="text-muted-foreground max-w-md text-sm">
                {filtersActive
                  ? "Try a different search or reset filters."
                  : `Create your first ${docTypeFilter === "quote" ? "quote" : docTypeFilter === "receipt" ? "receipt" : "invoice"} to get started.`}
              </p>
            </div>
            {filtersActive ? (
              <Button type="button" variant="outline" onClick={clearFilters}>
                Reset filters
              </Button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <Button asChild>
                  <Link href={`/${slug}/invoices/new?type=invoice`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New invoice
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${slug}/invoices/new?type=quote`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New quote
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${slug}/invoices/new?type=receipt`}>
                    <Banknote className="mr-2 h-4 w-4" />
                    New receipt
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="app-card hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  {docTypeFilter === "all" && <TableHead>Type</TableHead>}
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
                  const isQuote = inv.document_type === "quote"
                  const isReceipt = inv.document_type === "receipt"
                  const isInvoiceRow = inv.document_type === "invoice"
                  return (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}
                    >
                      <TableCell className="align-top font-mono text-sm font-medium">
                        <div>{inv.invoice_number}</div>
                        {chainRefLabel(inv) && (
                          <div className="mt-1 flex max-w-[220px] items-center gap-1 font-sans text-[10px] font-normal text-muted-foreground">
                            <Link2 className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            <span className="truncate" title={`Shared reference: ${chainRefLabel(inv)}`}>
                              Ref {chainRefLabel(inv)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      {docTypeFilter === "all" && (
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", docTypeBadgeClass(inv.document_type))}>
                            {isQuote ? "Quote" : isReceipt ? "Receipt" : "Invoice"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="font-medium">{inv.client_name}</div>
                        {inv.client_email && (
                          <div className="max-w-[200px] truncate text-xs text-muted-foreground">{inv.client_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(inv.grand_total, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-xs", cfg.badgeClass)}>
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}/edit`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {inv.pdf_storage_key && (
                              <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(inv.id), "_blank")}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!isQuote && inv.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "sent")}>
                                <Send className="mr-2 h-4 w-4" />
                                Mark as sent
                              </DropdownMenuItem>
                            )}
                            {!isQuote && (inv.status === "sent" || inv.status === "overdue") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "paid")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as paid
                              </DropdownMenuItem>
                            )}
                            {isQuote && inv.status !== "accepted" && (
                              <DropdownMenuItem onClick={() => handleConvertToInvoice(inv.id)} disabled={converting === inv.id}>
                                {converting === inv.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                )}
                                Convert to invoice
                              </DropdownMenuItem>
                            )}
                            {isInvoiceRow && (
                              <DropdownMenuItem asChild>
                                <Link href={`/${slug}/invoices/new?type=receipt&from=${inv.id}`}>
                                  <Banknote className="mr-2 h-4 w-4" />
                                  New receipt from this
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(inv.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 sm:hidden">
            {filtered.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
              const isQuote = inv.document_type === "quote"
              const isReceipt = inv.document_type === "receipt"
              const isInvoiceRow = inv.document_type === "invoice"
              const cref = chainRefLabel(inv)
              return (
                <Card
                  key={inv.id}
                  className="app-card cursor-pointer transition-colors hover:border-primary/25"
                  onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}
                >
                  <CardContent className="px-4 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium">{inv.invoice_number}</span>
                          {(docTypeFilter === "all" || docTypeFilter !== inv.document_type) && (
                            <Badge variant="outline" className={cn("h-5 text-[10px]", docTypeBadgeClass(inv.document_type))}>
                              {isQuote ? "Quote" : isReceipt ? "Receipt" : "Invoice"}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("h-5 gap-0.5 text-[10px]", cfg.badgeClass)}>
                            <cfg.icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="mt-1 font-medium">{inv.client_name}</p>
                        {cref && (
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Link2 className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                            <span className="truncate">Ref {cref}</span>
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(inv.date).toLocaleDateString()}
                          {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular-nums">{formatMoney(inv.grand_total, inv.currency)}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="mt-1 h-7 w-7" aria-label="Row actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}/edit`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {inv.pdf_storage_key && (
                              <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(inv.id), "_blank")}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!isQuote && inv.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "sent")}>
                                <Send className="mr-2 h-4 w-4" />
                                Mark sent
                              </DropdownMenuItem>
                            )}
                            {!isQuote && (inv.status === "sent" || inv.status === "overdue") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "paid")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark paid
                              </DropdownMenuItem>
                            )}
                            {isQuote && inv.status !== "accepted" && (
                              <DropdownMenuItem onClick={() => handleConvertToInvoice(inv.id)} disabled={converting === inv.id}>
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Convert to invoice
                              </DropdownMenuItem>
                            )}
                            {isInvoiceRow && (
                              <DropdownMenuItem asChild>
                                <Link href={`/${slug}/invoices/new?type=receipt&from=${inv.id}`}>
                                  <Banknote className="mr-2 h-4 w-4" />
                                  New receipt
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(inv.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the document and its PDF from your workspace. You cannot undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPageContainer>
  )
}

export default function OrgInvoicesListPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <OrgInvoicesListPageInner />
    </Suspense>
  )
}
