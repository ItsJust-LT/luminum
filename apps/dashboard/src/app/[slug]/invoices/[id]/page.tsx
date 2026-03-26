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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  FileDown,
  Pencil,
  Trash2,
  Loader2,
  Send,
  CheckCircle,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Draft", variant: "secondary" },
  sent: { label: "Sent", variant: "default", className: "bg-blue-500" },
  paid: { label: "Paid", variant: "default", className: "bg-green-500" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
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
        const res = await api.invoices.get(invoiceId) as any;
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
      const res = await api.invoices.get(invoiceId) as any;
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
      const res = await api.invoices.updateStatus(invoiceId, status) as any;
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
  if (!invoice) return <div className="p-6 text-center text-muted-foreground">Invoice not found</div>;

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft!;
  const currency = invoice.currency || "ZAR";
  const fmt = (v: number | string) => new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(v));
  const hasPdf = !!invoice.pdf_storage_key;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${slug}/invoices`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Invoice #{invoice.invoice_number}</h1>
            <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{invoice.client_name} &middot; {new Date(invoice.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {hasPdf ? "Regenerate PDF" : "Generate PDF"}
          </Button>
          {hasPdf && (
            <Button variant="outline" onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")}>
              <FileDown className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${invoiceId}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={() => handleStatusChange("sent")}><Send className="h-4 w-4 mr-2" /> Mark as Sent</DropdownMenuItem>
              )}
              {(invoice.status === "sent" || invoice.status === "overdue") && (
                <DropdownMenuItem onClick={() => handleStatusChange("paid")}><CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid</DropdownMenuItem>
              )}
              {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}><Clock className="h-4 w-4 mr-2" /> Cancel Invoice</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {hasPdf ? (
            <Card className="overflow-hidden">
              <iframe
                src={api.invoices.getPdfUrl(invoiceId)}
                className="w-full border-0"
                style={{ height: "80vh", minHeight: 600 }}
                title="Invoice PDF Preview"
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-semibold">No PDF generated yet</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">Generate a PDF to preview your invoice</p>
                <Button onClick={handleGeneratePdf} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Generate PDF
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Company</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-semibold">{invoice.company_name}</div>
              {invoice.company_email && <div className="text-muted-foreground">{invoice.company_email}</div>}
              {invoice.company_phone && <div className="text-muted-foreground">{invoice.company_phone}</div>}
              {invoice.company_vat && <div className="text-muted-foreground">VAT: {invoice.company_vat}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Client</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-semibold">{invoice.client_name}</div>
              {invoice.client_email && <div className="text-muted-foreground">{invoice.client_email}</div>}
              {invoice.client_phone && <div className="text-muted-foreground">{invoice.client_phone}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Items ({invoice.items?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {invoice.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span className="truncate flex-1 mr-2">{item.description}</span>
                  <span className="font-medium whitespace-nowrap">{fmt(item.quantity * Number(item.unit_price))}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
              </div>
              {Number(invoice.total_tax) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax{invoice.tax_inclusive ? " (incl.)" : ""}</span><span>{fmt(invoice.total_tax)}</span>
                </div>
              )}
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span><span className="text-red-500">-{fmt(invoice.discount_amount)}</span>
                </div>
              )}
              {Number(invoice.shipping_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span><span>{fmt(invoice.shipping_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>{fmt(invoice.grand_total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{new Date(invoice.date).toLocaleDateString()}</span></div>
              {invoice.due_date && <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{new Date(invoice.due_date).toLocaleDateString()}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(invoice.created_at).toLocaleDateString()}</span></div>
              {invoice.pdf_generated_at && <div className="flex justify-between"><span className="text-muted-foreground">PDF Generated</span><span>{new Date(invoice.pdf_generated_at).toLocaleDateString()}</span></div>}
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{invoice.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this invoice and its PDF. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
