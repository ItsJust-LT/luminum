"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, FileDown, Pencil, Trash2, Loader2, Send,
  CheckCircle, MoreHorizontal, RefreshCw, FileText, Clock,
  AlertCircle, Building2, User, Calendar, Receipt, ExternalLink,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string; icon: typeof Receipt }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Sent", variant: "default", className: "bg-blue-500 hover:bg-blue-600", icon: Send },
  paid: { label: "Paid", variant: "default", className: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Clock },
};

export default function InvoiceViewPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const res = (await api.invoices.get(invoiceId)) as any;
        setInvoice(res.invoice);
      } catch {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  async function handleGeneratePdf() {
    setGenerating(true);
    try {
      await api.invoices.generatePdf(invoiceId);
      const res = (await api.invoices.get(invoiceId)) as any;
      setInvoice(res.invoice);
      toast.success("PDF generated successfully");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      const res = (await api.invoices.updateStatus(invoiceId, status)) as any;
      setInvoice(res.invoice);
      toast.success(`Invoice marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.invoices.delete(invoiceId);
      toast.success("Invoice deleted");
      router.push(`/${slug}/invoices`);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (sessionPending || orgLoading || loading) return <LoadingAnimation />;
  if (!session) { router.push("/sign-in"); return null; }
  if (!invoice) return (
    <div className="flex flex-col items-center justify-center py-20">
      <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground">Invoice not found</p>
    </div>
  );

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft!;
  const StatusIcon = cfg.icon;
  const cur = invoice.currency || "ZAR";
  const fmt = (v: number | string) => {
    try { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: cur }).format(Number(v)); }
    catch { return `${cur} ${Number(v).toFixed(2)}`; }
  };
  const hasPdf = !!invoice.pdf_storage_key;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href={`/${slug}/invoices`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {invoice.invoice_number}
              </h1>
              <Badge variant={cfg.variant} className={cfg.className}>
                <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">
              {invoice.client_name} &middot; {new Date(invoice.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={generating} className="hidden sm:flex">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {hasPdf ? "Regenerate" : "Generate PDF"}
            </Button>
            {hasPdf && (
              <Button variant="outline" size="sm" onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")} className="hidden sm:flex">
                <FileDown className="h-4 w-4 mr-2" /> Download
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${invoiceId}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGeneratePdf} disabled={generating} className="sm:hidden">
                  <RefreshCw className="h-4 w-4 mr-2" /> {hasPdf ? "Regenerate PDF" : "Generate PDF"}
                </DropdownMenuItem>
                {hasPdf && (
                  <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")} className="sm:hidden">
                    <FileDown className="h-4 w-4 mr-2" /> Download PDF
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {invoice.status === "draft" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("sent")}>
                    <Send className="h-4 w-4 mr-2" /> Mark as Sent
                  </DropdownMenuItem>
                )}
                {(invoice.status === "sent" || invoice.status === "overdue") && (
                  <DropdownMenuItem onClick={() => handleStatusChange("paid")}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                  </DropdownMenuItem>
                )}
                {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}>
                    <Clock className="h-4 w-4 mr-2" /> Cancel Invoice
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PDF Preview */}
          <div className="lg:col-span-8">
            {hasPdf ? (
              <Card className="overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b">
                  <span className="text-xs text-muted-foreground font-medium">PDF Preview</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open in new tab
                  </Button>
                </div>
                <iframe
                  src={api.invoices.getPdfUrl(invoiceId)}
                  className="w-full border-0"
                  style={{ height: "calc(100vh - 200px)", minHeight: 500 }}
                  title="Invoice PDF"
                />
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-semibold">No PDF generated yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-5 max-w-sm">
                    Generate a PDF to preview and share your invoice with your client
                  </p>
                  <Button onClick={handleGeneratePdf} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                    Generate PDF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar details */}
          <div className="lg:col-span-4 space-y-4">
            {/* Amount card */}
            <Card className="border-primary/20">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Grand Total</p>
                <p className="text-3xl font-bold tracking-tight tabular-nums">{fmt(invoice.grand_total)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={cfg.variant} className={cfg.className}>
                    <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{invoice.currency}</span>
                </div>
              </CardContent>
            </Card>

            {/* Company */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> From
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {invoice.company_logo && (
                    <img src={invoice.company_logo} alt="" className="h-8 w-8 rounded object-contain shrink-0" />
                  )}
                  <span className="font-semibold">{invoice.company_name}</span>
                </div>
                {invoice.company_email && <div className="text-muted-foreground">{invoice.company_email}</div>}
                {invoice.company_phone && <div className="text-muted-foreground">{invoice.company_phone}</div>}
                {invoice.company_vat && <div className="text-muted-foreground">VAT: {invoice.company_vat}</div>}
              </CardContent>
            </Card>

            {/* Client */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Bill To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-semibold">{invoice.client_name}</div>
                {invoice.client_email && <div className="text-muted-foreground">{invoice.client_email}</div>}
                {invoice.client_phone && <div className="text-muted-foreground">{invoice.client_phone}</div>}
                {invoice.client_address && (
                  <div className="text-muted-foreground">
                    {(invoice.client_address as any).line1 && <span>{(invoice.client_address as any).line1}, </span>}
                    {(invoice.client_address as any).city && <span>{(invoice.client_address as any).city}, </span>}
                    {(invoice.client_address as any).country}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Items ({invoice.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {invoice.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate">{item.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.quantity} x {fmt(item.unit_price)}
                        {item.tax_percent ? ` (${item.tax_percent}% tax)` : ""}
                      </div>
                    </div>
                    <span className="font-medium whitespace-nowrap tabular-nums">{fmt(item.quantity * Number(item.unit_price))}</span>
                  </div>
                ))}
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span className="tabular-nums">{fmt(invoice.subtotal)}</span>
                  </div>
                  {Number(invoice.total_tax) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax{invoice.tax_inclusive ? " (incl.)" : ""}</span><span className="tabular-nums">{fmt(invoice.total_tax)}</span>
                    </div>
                  )}
                  {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount</span><span className="text-red-500 tabular-nums">-{fmt(invoice.discount_amount)}</span>
                    </div>
                  )}
                  {Number(invoice.shipping_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span><span className="tabular-nums">{fmt(invoice.shipping_amount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span><span className="tabular-nums">{fmt(invoice.grand_total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span>{new Date(invoice.date).toLocaleDateString()}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
                {invoice.pdf_generated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PDF Generated</span>
                    <span>{new Date(invoice.pdf_generated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {invoice.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}

            {invoice.terms && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice <span className="font-mono font-medium">{invoice.invoice_number}</span> and its PDF. This cannot be undone.
            </AlertDialogDescription>
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
