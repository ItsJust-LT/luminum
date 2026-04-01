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
  ArrowRightLeft, FileCheck, Mail, MessageCircle, Eye,
} from "lucide-react";
import { InvoicePdfPreview } from "./invoice-pdf-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string; icon: typeof Receipt }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Sent", variant: "default", className: "bg-blue-500 hover:bg-blue-600", icon: Send },
  paid: { label: "Paid", variant: "default", className: "bg-green-500 hover:bg-green-600", icon: CheckCircle },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Clock },
  accepted: { label: "Accepted", variant: "default", className: "bg-emerald-500 hover:bg-emerald-600", icon: FileCheck },
  expired: { label: "Expired", variant: "outline", icon: Clock },
  rejected: { label: "Rejected", variant: "destructive", icon: AlertCircle },
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
  const [converting, setConverting] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendFromLocal, setSendFromLocal] = useState("noreply");
  const [markSentAfterEmail, setMarkSentAfterEmail] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendWaOpen, setSendWaOpen] = useState(false);
  const [sendWaPhone, setSendWaPhone] = useState("");
  const [sendWaMessage, setSendWaMessage] = useState("");
  const [markSentAfterWa, setMarkSentAfterWa] = useState(true);
  const [sendingWa, setSendingWa] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      try {
        const res = (await api.invoices.get(invoiceId)) as any;
        setInvoice(res.invoice);
      } catch {
        toast.error("Failed to load document");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  useEffect(() => {
    if (sendEmailOpen && invoice?.client_email) {
      setSendTo(String(invoice.client_email).trim());
    }
  }, [sendEmailOpen, invoice?.client_email]);

  useEffect(() => {
    if (sendWaOpen && invoice?.client_phone) {
      setSendWaPhone(String(invoice.client_phone).trim());
    }
  }, [sendWaOpen, invoice?.client_phone]);

  const isQuote = invoice?.document_type === "quote";
  const isReceipt = invoice?.document_type === "receipt";
  const docLabel = isReceipt ? "Receipt" : isQuote ? "Quote" : "Invoice";

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
      toast.success(`${docLabel} marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleConvertToInvoice() {
    setConverting(true);
    try {
      const res = (await api.invoices.convertToInvoice(invoiceId)) as any;
      toast.success("Quote converted to invoice successfully");
      router.push(`/${slug}/invoices/${res.invoice.id}`);
    } catch {
      toast.error("Failed to convert quote to invoice");
    } finally {
      setConverting(false);
    }
  }

  async function handleSendByWhatsApp() {
    const phone = sendWaPhone.trim();
    if (!phone.replace(/\D/g, "").length) {
      toast.error("Enter a phone number.");
      return;
    }
    setSendingWa(true);
    try {
      const res = (await api.invoices.sendWhatsApp(invoiceId, {
        phone,
        message: sendWaMessage.trim() || undefined,
        markSent: markSentAfterWa,
      })) as { success?: boolean; invoice?: any; error?: string };
      if (!res?.success) throw new Error(res?.error || "Send failed");
      if (res.invoice) setInvoice(res.invoice);
      toast.success(`${docLabel} sent on WhatsApp`);
      setSendWaOpen(false);
      setSendWaMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send on WhatsApp");
    } finally {
      setSendingWa(false);
    }
  }

  async function handleSendByEmail() {
    const to = sendTo.trim();
    if (!to) {
      toast.error("Enter a recipient email address.");
      return;
    }
    setSendingEmail(true);
    try {
      const res = (await api.invoices.sendEmail(invoiceId, {
        to,
        message: sendMessage.trim() || undefined,
        fromLocalPart: sendFromLocal.trim() || undefined,
        markSent: markSentAfterEmail,
      })) as { success?: boolean; invoice?: any; error?: string };
      if (!res?.success) throw new Error(res?.error || "Send failed");
      if (res.invoice) setInvoice(res.invoice);
      toast.success(`${docLabel} emailed to ${to}`);
      setSendEmailOpen(false);
      setSendMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.invoices.delete(invoiceId);
      toast.success(`${docLabel} deleted`);
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
      <p className="text-muted-foreground">Document not found</p>
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
  const invoicesFeatureOn = organization?.invoices_enabled === true;
  const whatsappFeatureOn = organization?.whatsapp_enabled === true;
  const canSendOrgEmail = invoicesFeatureOn && !!organization?.emails_enabled;
  const canSendWhatsapp = invoicesFeatureOn && whatsappFeatureOn;

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
              <Badge
                variant="outline"
                className={`text-xs ${isReceipt ? "border-emerald-300/80 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
              >
                {docLabel}
              </Badge>
              <Badge variant={cfg.variant} className={cfg.className}>
                <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">
              {invoice.client_name} &middot; {new Date(invoice.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {isQuote && invoice.status !== "accepted" && (
              <Button size="sm" onClick={handleConvertToInvoice} disabled={converting} className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700">
                {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                Convert to Invoice
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={generating} className="hidden sm:flex">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {hasPdf ? "Regenerate" : "Generate PDF"}
            </Button>
            {hasPdf && (
              <Button variant="outline" size="sm" onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")} className="hidden sm:flex">
                <FileDown className="h-4 w-4 mr-2" /> Download
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="inline-flex gap-2"
                disabled={!canSendWhatsapp}
                onClick={() => setSendWaOpen(true)}
                title={
                  !invoicesFeatureOn
                    ? "Enable Invoices for this workspace."
                    : !whatsappFeatureOn
                      ? "Connect WhatsApp for this workspace to send on WhatsApp."
                      : "Send the PDF to the client on WhatsApp (connected number in workspace)."
                }
              >
                <MessageCircle className="h-4 w-4" />
                Send on WhatsApp
              </Button>
              {invoice.whatsapp_pdf_seen_at ? (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  title={`Opened on WhatsApp ${new Date(invoice.whatsapp_pdf_seen_at).toLocaleString()}`}
                >
                  <Eye className="h-2.5 w-2.5 opacity-80" aria-hidden />
                  Seen
                </span>
              ) : null}
            </div>
            <Button
              size="sm"
              className="hidden sm:inline-flex gap-2"
              disabled={!canSendOrgEmail}
              onClick={() => setSendEmailOpen(true)}
              title={
                !invoicesFeatureOn
                  ? "Enable Invoices for this workspace to send by email."
                  : !organization?.emails_enabled
                    ? "Enable organization email and complete domain setup to send from the dashboard."
                    : `Email this ${docLabel.toLowerCase()} with PDF attached`
              }
            >
              <Mail className="h-4 w-4" />
              Send by email
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push(`/${slug}/invoices/${invoiceId}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit {docLabel}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGeneratePdf} disabled={generating} className="sm:hidden">
                  <RefreshCw className="h-4 w-4 mr-2" /> {hasPdf ? "Regenerate PDF" : "Generate PDF"}
                </DropdownMenuItem>
                {hasPdf && (
                  <DropdownMenuItem onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")} className="sm:hidden">
                    <FileDown className="h-4 w-4 mr-2" /> Download PDF
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!canSendWhatsapp}
                  onClick={() => setSendWaOpen(true)}
                  className="sm:hidden"
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Send on WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canSendOrgEmail}
                  onClick={() => setSendEmailOpen(true)}
                  className="sm:hidden"
                >
                  <Mail className="h-4 w-4 mr-2" /> Send by email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isQuote && invoice.status !== "accepted" && (
                  <DropdownMenuItem onClick={handleConvertToInvoice} disabled={converting} className="sm:hidden">
                    <ArrowRightLeft className="h-4 w-4 mr-2" /> Convert to Invoice
                  </DropdownMenuItem>
                )}
                {!isQuote && invoice.status === "draft" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("sent")}>
                    <Send className="h-4 w-4 mr-2" /> Mark as Sent
                  </DropdownMenuItem>
                )}
                {!isQuote && (invoice.status === "sent" || invoice.status === "overdue") && (
                  <DropdownMenuItem onClick={() => handleStatusChange("paid")}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                  </DropdownMenuItem>
                )}
                {isQuote && invoice.status === "draft" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("sent")}>
                    <Send className="h-4 w-4 mr-2" /> Mark as Sent
                  </DropdownMenuItem>
                )}
                {isQuote && invoice.status === "sent" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("accepted")}>
                    <FileCheck className="h-4 w-4 mr-2" /> Mark Accepted
                  </DropdownMenuItem>
                )}
                {invoice.status !== "cancelled" && invoice.status !== "paid" && invoice.status !== "accepted" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}>
                    <Clock className="h-4 w-4 mr-2" /> Cancel {docLabel}
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">PDF Preview</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.open(api.invoices.getPdfUrl(invoiceId), "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1.5" /> Open in new tab
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                      <a href={api.invoices.getPdfUrl(invoiceId)} download={`${invoice.invoice_number}.pdf`}>
                        <FileDown className="h-3 w-3 mr-1.5" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 sm:p-6 lg:p-8">
                  <div className="mx-auto shadow-2xl rounded-lg overflow-hidden bg-white" style={{ maxWidth: 794 }}>
                    <InvoicePdfPreview
                      invoiceId={invoiceId}
                      docLabel={docLabel}
                      pdfVersion={invoice.pdf_generated_at ?? invoice.pdf_storage_key ?? undefined}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-semibold">No PDF generated yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-5 max-w-sm">
                    Generate a PDF to preview and share your {isReceipt ? "receipt" : isQuote ? "quote" : "invoice"} with your client
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
            <Card className={canSendWhatsapp ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-muted"}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-tight">WhatsApp</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {canSendWhatsapp
                        ? "Sends the PDF as a document from your connected WhatsApp Business number. A PDF is created automatically if needed. Use the client phone on this document or enter one below."
                        : "Enable Invoices and connect WhatsApp for this workspace."}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={!canSendWhatsapp}
                  onClick={() => setSendWaOpen(true)}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-2" />
                  Send on WhatsApp
                </Button>
              </CardContent>
            </Card>

            <Card className={canSendOrgEmail ? "border-primary/25 bg-primary/[0.03]" : "border-muted"}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-tight">Email</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {!invoicesFeatureOn
                        ? "Enable Invoices for this workspace to send by email."
                        : canSendOrgEmail
                          ? "Delivers the PDF by email from your verified domain. A PDF is created automatically if needed."
                          : "Turn on mail for this organization and finish domain verification in Settings."}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={!canSendOrgEmail}
                  onClick={() => setSendEmailOpen(true)}
                >
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Send by email
                </Button>
              </CardContent>
            </Card>

            {/* Amount card */}
            <Card className="border-primary/20">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  {isReceipt ? "Amount received" : isQuote ? "Quote Total" : "Grand Total"}
                </p>
                <p className="text-3xl font-bold tracking-tight tabular-nums">{fmt(invoice.grand_total)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${isReceipt ? "border-emerald-300/80 text-emerald-700 dark:text-emerald-400" : ""}`}
                  >
                    {docLabel}
                  </Badge>
                  <Badge variant={cfg.variant} className={cfg.className}>
                    <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{invoice.currency}</span>
                </div>
              </CardContent>
            </Card>

            {/* Convert to invoice CTA for quotes */}
            {isQuote && invoice.status !== "accepted" && (
              <Card className="border-emerald-300/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-medium mb-1">Ready to convert?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Convert this quote into an invoice to start billing your client.
                  </p>
                  <Button size="sm" onClick={handleConvertToInvoice} disabled={converting} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                    Convert to Invoice
                  </Button>
                </CardContent>
              </Card>
            )}

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
                  <User className="h-3.5 w-3.5" /> {isQuote ? "Quote To" : isReceipt ? "Received from" : "Bill To"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-semibold">{invoice.client_name}</div>
                {invoice.client_email && <div className="text-muted-foreground">{invoice.client_email}</div>}
                {invoice.client_phone && <div className="text-muted-foreground">{invoice.client_phone}</div>}
                {invoice.client_tax_number && (
                  <div className="text-muted-foreground">Tax ID: {invoice.client_tax_number}</div>
                )}
                {invoice.whatsapp_pdf_seen_at && (
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Eye className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    PDF seen on WhatsApp
                  </p>
                )}
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
                    <span className="text-muted-foreground">{isQuote ? "Valid Until" : "Due"}</span>
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

      <Dialog open={sendWaOpen} onOpenChange={setSendWaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send {docLabel} on WhatsApp</DialogTitle>
            <DialogDescription>
              Delivers the PDF as a WhatsApp document. South African numbers can be entered as{" "}
              <span className="whitespace-nowrap">0662236440</span> or <span className="whitespace-nowrap">662236440</span>{" "}
              (country code +27 is added automatically). Other regions: include the country code. Requires a connected WhatsApp client for this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="inv-wa-phone">Phone</Label>
              <Input
                id="inv-wa-phone"
                type="tel"
                placeholder="0662236440 or +27 66 223 6440"
                value={sendWaPhone}
                onChange={(e) => setSendWaPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-wa-msg">Caption (optional)</Label>
              <Textarea
                id="inv-wa-msg"
                placeholder="Short message shown with the document…"
                value={sendWaMessage}
                onChange={(e) => setSendWaMessage(e.target.value)}
                className="min-h-[72px] resize-y text-sm"
              />
            </div>
            <label className="flex items-start gap-2 text-sm leading-snug cursor-pointer">
              <Checkbox
                checked={markSentAfterWa}
                onCheckedChange={(v) => setMarkSentAfterWa(v === true)}
                className="mt-0.5"
              />
              <span>Mark as sent after the message is sent (when status is draft)</span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSendWaOpen(false)} disabled={sendingWa}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendByWhatsApp()}
              disabled={sendingWa || !sendWaPhone.replace(/\D/g, "").length}
            >
              {sendingWa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send {docLabel} by email</DialogTitle>
            <DialogDescription>
              The recipient receives a short message and a PDF attachment. Uses the same sending domain as Mail in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="inv-send-to">To</Label>
              <Input
                id="inv-send-to"
                type="email"
                placeholder="client@example.com"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-send-from">From (local part)</Label>
              <Input
                id="inv-send-from"
                placeholder="noreply"
                value={sendFromLocal}
                onChange={(e) => setSendFromLocal(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[11px] text-muted-foreground">Address will be <span className="font-mono">{sendFromLocal.trim() || "noreply"}@your-domain</span> on the server.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-send-msg">Message (optional)</Label>
              <Textarea
                id="inv-send-msg"
                placeholder="Add a personal note above the default text…"
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                className="min-h-[88px] resize-y text-sm"
              />
            </div>
            <label className="flex items-start gap-2 text-sm leading-snug cursor-pointer">
              <Checkbox
                checked={markSentAfterEmail}
                onCheckedChange={(v) => setMarkSentAfterEmail(v === true)}
                className="mt-0.5"
              />
              <span>Mark as sent after the email is delivered (when status is draft)</span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSendEmailOpen(false)} disabled={sendingEmail}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSendByEmail()} disabled={sendingEmail || !sendTo.trim()}>
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {docLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {isReceipt ? "receipt" : isQuote ? "quote" : "invoice"}{" "}
              <span className="font-mono font-medium">{invoice.invoice_number}</span> and its PDF. This cannot be undone.
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
