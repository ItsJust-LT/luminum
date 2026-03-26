"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt, Loader2, MoreHorizontal, Plus, Search, Trash2,
  FileDown, Eye, Pencil, Send, CheckCircle, Clock, FileText,
  AlertCircle, TrendingUp, DollarSign, ArrowUpRight,
  ChevronDown, FileCheck, ArrowRightLeft,
} from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Receipt; className?: string }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Sent", variant: "default", icon: Send, className: "bg-blue-500 hover:bg-blue-600" },
  paid: { label: "Paid", variant: "default", icon: CheckCircle, className: "bg-green-500 hover:bg-green-600" },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Clock },
  accepted: { label: "Accepted", variant: "default", icon: FileCheck, className: "bg-emerald-500 hover:bg-emerald-600" },
  expired: { label: "Expired", variant: "outline", icon: Clock },
  rejected: { label: "Rejected", variant: "destructive", icon: AlertCircle },
};

function formatMoney(amount: number | string, currency: string = "ZAR") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

export default function OrgInvoicesListPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<"all" | "invoice" | "quote">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const listParams: any = { page: 1, limit: 100 };
        if (docTypeFilter !== "all") listParams.document_type = docTypeFilter;

        const [listRes, statsRes] = await Promise.all([
          api.invoices.list(organization.id, listParams) as Promise<{ invoices: InvoiceRow[] }>,
          api.invoices.getStats(organization.id, docTypeFilter !== "all" ? docTypeFilter : undefined) as Promise<{ stats: InvoiceStats }>,
        ]);
        if (!cancelled) {
          setInvoices(listRes.invoices ?? []);
          setStats(statsRes.stats ?? null);
        }
      } catch {
        toast.error("Failed to load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [organization?.id, docTypeFilter]);

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
    return list;
  }, [invoices, statusFilter, query]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.invoices.delete(deleteId);
      setInvoices((prev) => prev.filter((i) => i.id !== deleteId));
      toast.success("Deleted successfully");
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

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) { router.push("/sign-in"); return null; }

  const currency = (organization as any)?.currency || "ZAR";
  const isQuoteView = docTypeFilter === "quote";
  const docLabel = isQuoteView ? "Quote" : docTypeFilter === "invoice" ? "Invoice" : "Document";

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
        { value: "overdue", label: "Overdue", count: stats?.overdue },
      ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Invoices & Quotes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create, manage, and track your invoices and quotes</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Create New <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/new?type=invoice`)}>
              <Receipt className="h-4 w-4 mr-2" /> New Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/new?type=quote`)}>
              <FileText className="h-4 w-4 mr-2" /> New Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Document type tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {(["all", "invoice", "quote"] as const).map((t) => (
          <Button
            key={t}
            variant={docTypeFilter === t ? "default" : "ghost"}
            size="sm"
            className="text-xs h-8 px-4"
            onClick={() => { setDocTypeFilter(t); setStatusFilter("all"); setLoading(true); }}
          >
            {t === "all" ? "All" : t === "invoice" ? "Invoices" : "Quotes"}
          </Button>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total</p>
                  <p className="text-2xl font-bold mt-0.5 tabular-nums">{stats.total}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Revenue</p>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5 tabular-nums truncate">{formatMoney(stats.totalRevenue, currency)}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Paid
                  </p>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5 text-green-600 tabular-nums truncate">
                    {formatMoney(stats.paidRevenue, currency)}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" /> Outstanding
                  </p>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5 text-amber-600 tabular-nums truncate">
                    {formatMoney(stats.outstandingRevenue, currency)}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${docTypeFilter === "all" ? "invoices & quotes" : docTypeFilter + "s"}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap w-full sm:w-auto overflow-x-auto pb-0.5">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className="text-xs shrink-0"
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <Badge
                  variant={statusFilter === tab.value ? "outline" : "secondary"}
                  className="ml-1.5 text-[10px] px-1.5 py-0 h-4"
                >
                  {tab.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Receipt className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold">No {docTypeFilter === "all" ? "documents" : docTypeFilter + "s"} found</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-5 max-w-sm">
              {query || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : `Create your first ${docTypeFilter === "quote" ? "quote" : "invoice"} to get started`}
            </p>
            {!query && statusFilter === "all" && (
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href={`/${slug}/invoices/new?type=invoice`}><Plus className="h-4 w-4 mr-2" /> New Invoice</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${slug}/invoices/new?type=quote`}><Plus className="h-4 w-4 mr-2" /> New Quote</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  {docTypeFilter === "all" && <TableHead>Type</TableHead>}
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft!;
                    const isQuote = inv.document_type === "quote";
                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}
                      >
                        <TableCell className="font-medium font-mono text-sm">{inv.invoice_number}</TableCell>
                        {docTypeFilter === "all" && (
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${isQuote ? "border-blue-300 text-blue-600" : ""}`}>
                              {isQuote ? "Quote" : "Invoice"}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">{inv.client_name}</div>
                          {inv.client_email && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{inv.client_email}</div>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "\u2014"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatMoney(inv.grand_total, inv.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className={`text-xs gap-1 ${cfg.className || ""}`}>
                            <cfg.icon className="h-3 w-3" /> {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}/edit`)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                              {inv.pdf_storage_key && (
                                <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(inv.id), "_blank")}><FileDown className="h-4 w-4 mr-2" /> Download PDF</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {!isQuote && inv.status === "draft" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "sent")}><Send className="h-4 w-4 mr-2" /> Mark as Sent</DropdownMenuItem>
                              )}
                              {!isQuote && (inv.status === "sent" || inv.status === "overdue") && (
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "paid")}><CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid</DropdownMenuItem>
                              )}
                              {isQuote && inv.status !== "accepted" && (
                                <DropdownMenuItem onClick={() => handleConvertToInvoice(inv.id)} disabled={converting === inv.id}>
                                  {converting === inv.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                                  Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(inv.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            <AnimatePresence>
              {filtered.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft!;
                const isQuote = inv.document_type === "quote";
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Card
                      className="cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
                      onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}
                    >
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-medium text-sm">{inv.invoice_number}</span>
                              <Badge variant="outline" className={`text-[10px] h-5 ${isQuote ? "border-blue-300 text-blue-600" : ""}`}>
                                {isQuote ? "Quote" : "Invoice"}
                              </Badge>
                              <Badge variant={cfg.variant} className={`text-[10px] h-5 gap-0.5 ${cfg.className || ""}`}>
                                <cfg.icon className="h-2.5 w-2.5" /> {cfg.label}
                              </Badge>
                            </div>
                            <p className="font-medium mt-1">{inv.client_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(inv.date).toLocaleDateString()}
                              {inv.due_date && ` \u00b7 Due ${new Date(inv.due_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold tabular-nums">{formatMoney(inv.grand_total, inv.currency)}</p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 mt-1"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}/edit`)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                {inv.pdf_storage_key && (
                                  <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(inv.id), "_blank")}><FileDown className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {isQuote && inv.status !== "accepted" && (
                                  <DropdownMenuItem onClick={() => handleConvertToInvoice(inv.id)} disabled={converting === inv.id}>
                                    <ArrowRightLeft className="h-4 w-4 mr-2" /> Convert to Invoice
                                  </DropdownMenuItem>
                                )}
                                {!isQuote && inv.status === "draft" && <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "sent")}><Send className="h-4 w-4 mr-2" /> Mark Sent</DropdownMenuItem>}
                                {!isQuote && (inv.status === "sent" || inv.status === "overdue") && <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "paid")}><CheckCircle className="h-4 w-4 mr-2" /> Mark Paid</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(inv.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this document and its PDF. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
