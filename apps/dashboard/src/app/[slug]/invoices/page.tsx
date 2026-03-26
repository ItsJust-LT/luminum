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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  FileDown,
  Eye,
  Pencil,
  Send,
  CheckCircle,
  DollarSign,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";

type InvoiceRow = {
  id: string;
  invoice_number: string;
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
  totalRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
};

type StatusFilter = "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Receipt }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Sent", variant: "default", icon: Send },
  paid: { label: "Paid", variant: "default", icon: CheckCircle },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Clock },
};

function formatMoney(amount: number | string, currency: string = "ZAR") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(num);
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [listRes, statsRes] = await Promise.all([
          api.invoices.list(organization.id, { page: 1, limit: 100 }) as Promise<{ invoices: InvoiceRow[] }>,
          api.invoices.getStats(organization.id) as Promise<{ stats: InvoiceStats }>,
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
  }, [organization?.id]);

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
      toast.success("Invoice deleted");
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.invoices.updateStatus(id, status);
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      toast.success(`Invoice marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) { router.push("/sign-in"); return null; }

  const currency = (organization as any)?.currency || "ZAR";
  const statusTabs: { value: StatusFilter; label: string; count?: number }[] = [
    { value: "all", label: "All", count: stats?.total },
    { value: "draft", label: "Draft", count: stats?.draft },
    { value: "sent", label: "Sent", count: stats?.sent },
    { value: "paid", label: "Paid", count: stats?.paid },
    { value: "overdue", label: "Overdue", count: stats?.overdue },
    { value: "cancelled", label: "Cancelled", count: stats?.cancelled },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Create, manage, and track invoices</p>
        </div>
        <Button asChild>
          <Link href={`/${slug}/invoices/new`}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Link>
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground font-medium">Total Invoices</div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground font-medium">Total Revenue</div>
              <div className="text-2xl font-bold mt-1">{formatMoney(stats.totalRevenue, currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Paid</div>
              <div className="text-2xl font-bold mt-1 text-green-600">{formatMoney(stats.paidRevenue, currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> Outstanding</div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">{formatMoney(stats.outstandingRevenue, currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-500" /> Overdue</div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className="text-xs"
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{tab.count}</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No invoices found</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              {query || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first invoice to get started"}
            </p>
            {!query && statusFilter === "all" && (
              <Button asChild size="sm">
                <Link href={`/${slug}/invoices/new`}><Plus className="h-4 w-4 mr-2" /> New Invoice</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft!;
                  return (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}
                    >
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div>{inv.client_name}</div>
                        {inv.client_email && <div className="text-xs text-muted-foreground">{inv.client_email}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(inv.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(inv.grand_total, inv.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="text-xs gap-1">
                          <cfg.icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${inv.id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {inv.pdf_storage_key && (
                              <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(inv.id), "_blank")}>
                                <FileDown className="h-4 w-4 mr-2" /> Download PDF
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {inv.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "sent")}>
                                <Send className="h-4 w-4 mr-2" /> Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {(inv.status === "sent" || inv.status === "overdue") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "paid")}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(inv.id)}>
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
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this invoice and its PDF. This action cannot be undone.</AlertDialogDescription>
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
