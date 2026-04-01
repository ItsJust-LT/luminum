"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { currencies } from "@/lib/currencies";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, FileDown, CalendarIcon,
  ChevronsUpDown, Check, Building2, User, ImageIcon, X, Upload,
  Receipt, Info, Hash, Globe,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
}

interface PreviousClient {
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: { line1?: string; city?: string; country?: string };
}

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "ZAR", "CAD", "AUD", "JPY", "CHF", "INR", "BRL", "NGN", "KES"];

const LANGUAGES = [
  { value: "en", label: "English" }, { value: "es", label: "Spanish" },
  { value: "fr", label: "French" }, { value: "de", label: "German" },
  { value: "it", label: "Italian" }, { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" }, { value: "zh", label: "Chinese" },
  { value: "ru", label: "Russian" }, { value: "ar", label: "Arabic" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function NewInvoicePage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const documentType =
    searchParams.get("type") === "quote"
      ? "quote"
      : searchParams.get("type") === "receipt"
        ? "receipt"
        : "invoice";
  const isQuote = documentType === "quote";
  const isReceipt = documentType === "receipt";
  const docNoun = isReceipt ? "Receipt" : isQuote ? "Quote" : "Invoice";
  const fromSourceInvoiceId = searchParams.get("from")?.trim() ?? "";
  const logoInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [currency, setCurrency] = useState("ZAR");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [language, setLanguage] = useState("en");

  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyVat, setCompanyVat] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientTaxNumber, setClientTaxNumber] = useState("");
  const [clientAddressLine1, setClientAddressLine1] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientCountry, setClientCountry] = useState("");

  const [previousClients, setPreviousClients] = useState<PreviousClient[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<ItemRow[]>([
    { id: generateId(), description: "", quantity: 1, unit_price: 0, tax_percent: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  /** Persist API link: receipt → source invoice; shared job_reference across the chain. */
  const [receiptSourceInvoiceId, setReceiptSourceInvoiceId] = useState<string | null>(null);
  const [chainJobReference, setChainJobReference] = useState("");

  useEffect(() => {
    if (!isReceipt || !fromSourceInvoiceId) {
      setReceiptSourceInvoiceId(null);
      setChainJobReference("");
    }
  }, [isReceipt, fromSourceInvoiceId]);

  useEffect(() => {
    if (!organization?.id) return;
    if (isReceipt && fromSourceInvoiceId) return;

    setCurrency((organization as any).currency || "ZAR");

    const loadData = async () => {
      try {
        const [nextRes, companyRes] = await Promise.all([
          api.invoices.getNextNumber(organization.id, documentType) as Promise<any>,
          api.invoices.getLastCompany(organization.id) as Promise<any>,
        ]);
        if (nextRes?.nextNumber) setInvoiceNumber(nextRes.nextNumber);

        if (companyRes?.company) {
          const c = companyRes.company;
          setCompanyName(c.company_name || organization.name || "");
          setCompanyEmail(c.company_email || "");
          setCompanyPhone(c.company_phone || "");
          setCompanyVat(c.company_vat || "");
          setCompanyLogo(c.company_logo || (organization as any).logo || null);
        } else {
          setCompanyName(organization.name || "");
          if ((organization as any).logo) setCompanyLogo((organization as any).logo);
        }
      } catch {
        setCompanyName(organization.name || "");
        if ((organization as any).logo) setCompanyLogo((organization as any).logo);
      }
    };
    loadData();
  }, [organization?.id, organization?.name, documentType, isReceipt, fromSourceInvoiceId]);

  useEffect(() => {
    if (!organization?.id || !isReceipt || !fromSourceInvoiceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = (await api.invoices.get(fromSourceInvoiceId)) as { invoice?: Record<string, unknown> };
        const inv = res.invoice;
        if (!inv || cancelled) return;
        if (inv.document_type !== "invoice") {
          toast.error("Create a receipt only from an invoice.");
          return;
        }
        setCurrency(String(inv.currency || "ZAR"));
        const nextRes = (await api.invoices.getNextNumber(organization.id, "receipt")) as { nextNumber?: string };
        if (!cancelled && nextRes?.nextNumber) setInvoiceNumber(nextRes.nextNumber);
        setDate(new Date());
        setDueDate(undefined);
        setLanguage(String(inv.language || "en"));
        setCompanyName(String(inv.company_name || ""));
        setCompanyEmail(String(inv.company_email || ""));
        setCompanyPhone(String(inv.company_phone || ""));
        setCompanyVat(String(inv.company_vat || ""));
        setCompanyLogo((inv.company_logo as string) || null);
        setClientName(String(inv.client_name || ""));
        setClientEmail(String(inv.client_email || ""));
        setClientPhone(String(inv.client_phone || ""));
        setClientTaxNumber(String(inv.client_tax_number || ""));
        const addr = inv.client_address as { line1?: string; city?: string; country?: string } | null;
        setClientAddressLine1(addr?.line1 || "");
        setClientCity(addr?.city || "");
        setClientCountry(addr?.country || "");
        const mapped = ((inv.items as Record<string, unknown>[]) || []).map((it) => ({
          id: generateId(),
          description: String(it.description || ""),
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          tax_percent: Number(it.tax_percent) || 0,
        }));
        setItems(
          mapped.length > 0
            ? mapped
            : [{ id: generateId(), description: "", quantity: 1, unit_price: 0, tax_percent: 0 }]
        );
        setDiscountAmount(Number(inv.discount_amount) || 0);
        setShippingAmount(Number(inv.shipping_amount) || 0);
        setTaxInclusive(!!inv.tax_inclusive);
        const invNum = String(inv.invoice_number || "");
        const prevNotes = String(inv.notes || "").trim();
        const paymentLine = invNum ? `Payment for invoice ${invNum}` : "Payment for invoice";
        setNotes(prevNotes ? `${paymentLine}\n\n${prevNotes}` : paymentLine);
        setTerms(String(inv.terms || ""));
        setReceiptSourceInvoiceId(fromSourceInvoiceId);
        setChainJobReference(String(inv.job_reference || inv.invoice_number || ""));
        toast.success("Receipt prefilled from invoice — review and save");
      } catch {
        if (!cancelled) toast.error("Could not load invoice");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from URL
  }, [organization?.id, isReceipt, fromSourceInvoiceId]);

  function handleClientNameChange(value: string) {
    setClientName(value);
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    if (!organization?.id || value.trim().length < 2) {
      setPreviousClients([]);
      setShowClientSuggestions(false);
      return;
    }
    clientSearchTimer.current = setTimeout(async () => {
      try {
        const res = (await api.invoices.searchClients(organization.id, value.trim())) as any;
        const clients = (res?.clients || []) as PreviousClient[];
        setPreviousClients(clients);
        setShowClientSuggestions(clients.length > 0);
      } catch {
        setPreviousClients([]);
      }
    }, 250);
  }

  function selectClient(client: PreviousClient) {
    setClientName(client.name);
    setClientEmail(client.email || "");
    setClientPhone(client.phone || "");
    setClientTaxNumber(client.taxNumber || "");
    const addr = client.address as any;
    setClientAddressLine1(addr?.line1 || "");
    setClientCity(addr?.city || "");
    setClientCountry(addr?.country || "");
    setShowClientSuggestions(false);
    setPreviousClients([]);
  }

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const totalTax = items.reduce((sum, it) => {
    if (!it.tax_percent) return sum;
    const line = it.quantity * it.unit_price;
    return sum + (taxInclusive ? line * (it.tax_percent / (100 + it.tax_percent)) : line * (it.tax_percent / 100));
  }, 0);
  const grandTotal = taxInclusive
    ? subtotal + shippingAmount - discountAmount
    : subtotal + totalTax + shippingAmount - discountAmount;

  const currencyData = currencies[currency as keyof typeof currencies];

  function formatMoney(amt: number) {
    try { return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amt); }
    catch { return `${currency} ${amt.toFixed(2)}`; }
  }

  function updateItem(index: number, field: keyof Omit<ItemRow, "id">, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { id: generateId(), description: "", quantity: 1, unit_price: 0, tax_percent: 0 }]);
  }
  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo must be under 5MB"); return; }
    setLogoUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
      const logoBase64 = btoa(binary);
      if (organization?.id) {
        const res = (await api.uploads.uploadLogo({ logoBase64, fileName: file.name, contentType: file.type, organizationName: organization.name, organizationId: organization.id })) as any;
        setCompanyLogo(res.url);
      } else {
        const reader = new FileReader();
        reader.onload = () => setCompanyLogo(reader.result as string);
        reader.readAsDataURL(file);
      }
      toast.success("Logo uploaded");
    } catch { toast.error("Failed to upload logo"); }
    finally { setLogoUploading(false); if (logoInputRef.current) logoInputRef.current.value = ""; }
  }

  const buildPayload = useCallback(() => ({
    organizationId: organization?.id, documentType, invoiceNumber,
    date: format(date, "yyyy-MM-dd"),
    dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
    currency, language, companyName,
    companyEmail: companyEmail || undefined, companyPhone: companyPhone || undefined,
    companyVat: companyVat || undefined, companyLogo: companyLogo || undefined,
    clientName, clientEmail: clientEmail || undefined, clientPhone: clientPhone || undefined,
    clientTaxNumber: clientTaxNumber.trim() || undefined,
    clientAddress: clientAddressLine1 || clientCity || clientCountry
      ? { line1: clientAddressLine1, city: clientCity, country: clientCountry } : undefined,
    items: items.map((it) => ({ description: it.description, quantity: it.quantity, unit_price: it.unit_price, tax_percent: it.tax_percent || undefined })),
    discountAmount, shippingAmount, taxInclusive, notes: notes || undefined, terms: terms || undefined,
    ...(isReceipt && receiptSourceInvoiceId ? { sourceDocumentId: receiptSourceInvoiceId } : {}),
    ...(chainJobReference.trim() ? { jobReference: chainJobReference.trim() } : {}),
  }), [organization?.id, documentType, invoiceNumber, date, dueDate, currency, language, companyName, companyEmail, companyPhone, companyVat, companyLogo, clientName, clientEmail, clientPhone, clientTaxNumber, clientAddressLine1, clientCity, clientCountry, items, discountAmount, shippingAmount, taxInclusive, notes, terms, isReceipt, receiptSourceInvoiceId, chainJobReference]);

  async function handleSave() {
    if (!organization?.id) return;
    if (!companyName.trim()) { toast.error("Company name is required"); return; }
    if (!clientName.trim()) { toast.error("Client name is required"); return; }
    if (items.some((it) => !it.description.trim())) { toast.error("All items need a description"); return; }
    setSaving(true);
    try {
      const res = (await api.invoices.create(buildPayload())) as any;
      toast.success(`${docNoun} saved as draft`);
      router.push(`/${slug}/invoices/${res.invoice.id}`);
    } catch (err: any) { toast.error(err?.message || "Failed to create"); }
    finally { setSaving(false); }
  }

  async function handleSaveAndGenerate() {
    if (!organization?.id) return;
    if (!companyName.trim()) { toast.error("Company name is required"); return; }
    if (!clientName.trim()) { toast.error("Client name is required"); return; }
    setSaving(true); setGenerating(true);
    try {
      const res = (await api.invoices.create(buildPayload())) as any;
      await api.invoices.generatePdf(res.invoice.id);
      toast.success(`${docNoun} created & PDF generated`);
      router.push(`/${slug}/invoices/${res.invoice.id}`);
    } catch (err: any) { toast.error(err?.message || "Failed to create"); }
    finally { setSaving(false); setGenerating(false); }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) { router.push("/sign-in"); return null; }

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href={`/${slug}/invoices`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">New {docNoun}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
              {isReceipt
                ? "Record a payment received — PDF uses a clear receipt layout."
                : `Fill in the details below to create a new ${isQuote ? "quote" : "invoice"}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="hidden sm:flex">
              {saving && !generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button size="sm" onClick={handleSaveAndGenerate} disabled={saving}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
              <span className="hidden sm:inline">Save & Generate PDF</span>
              <span className="sm:hidden">Generate</span>
            </Button>
          </div>
        </div>
      </div>

      {receiptSourceInvoiceId && chainJobReference.trim() && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-500/[0.07] to-teal-500/[0.05] dark:border-emerald-900/45 dark:from-emerald-950/25 dark:to-teal-950/15 px-4 py-3">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Connected to your invoice</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              PDFs will show the same client reference as your invoice (
              <span className="font-mono font-semibold text-foreground">{chainJobReference.trim()}</span>
              ) while this receipt keeps its own number.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Receipt className="h-4 w-4 text-primary" /></div>
                  <div>
                    <CardTitle className="text-base">{docNoun} details</CardTitle>
                    <CardDescription>Basic information for your {docNoun.toLowerCase()}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-muted-foreground" />{docNoun} number</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={isQuote ? "QUO-0001" : isReceipt ? "REC-0001" : "INV-0001"} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />Currency</Label>
                  <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={currencyOpen} className="w-full justify-between font-normal">
                        <span className="flex items-center gap-2 truncate">
                          <span className="text-base">{currencyData?.symbol || currency}</span>
                          <span>{currency}</span>
                          <span className="text-muted-foreground text-xs truncate">{currencyData?.name || ""}</span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search currencies..." />
                        <CommandList>
                          <CommandEmpty>No currency found.</CommandEmpty>
                          <CommandGroup heading="Popular">
                            {POPULAR_CURRENCIES.map((code) => { const c = currencies[code as keyof typeof currencies]; if (!c) return null; return (
                              <CommandItem key={code} value={`${code} ${c.name}`} onSelect={() => { setCurrency(code); setCurrencyOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", currency === code ? "opacity-100" : "opacity-0")} />
                                <span className="w-8 text-base">{c.symbol}</span><span className="font-medium">{code}</span>
                                <span className="ml-2 text-muted-foreground text-xs truncate">{c.name}</span>
                              </CommandItem>
                            ); })}
                          </CommandGroup>
                          <CommandGroup heading="All Currencies">
                            {Object.entries(currencies).filter(([code]) => !POPULAR_CURRENCIES.includes(code)).map(([code, c]) => (
                              <CommandItem key={code} value={`${code} ${c.name}`} onSelect={() => { setCurrency(code); setCurrencyOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", currency === code ? "opacity-100" : "opacity-0")} />
                                <span className="w-8 text-base">{c.symbol}</span><span className="font-medium">{code}</span>
                                <span className="ml-2 text-muted-foreground text-xs truncate">{c.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />{isReceipt ? "Payment date" : "Date"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />{format(date, "PPP")}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                {!isReceipt && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />{isQuote ? "Valid Until" : "Due Date"} <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !dueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />{dueDate ? format(dueDate, "PPP") : "Select a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(d) => setDueDate(d ?? undefined)} initialFocus />
                      {dueDate && <div className="p-2 border-t"><Button variant="ghost" size="sm" className="w-full" onClick={() => setDueDate(undefined)}>Clear date</Button></div>}
                    </PopoverContent>
                  </Popover>
                </div>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Company & Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-blue-500" /></div>
                    <div><CardTitle className="text-base">From</CardTitle><CardDescription>Your company details</CardDescription></div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 transition-colors", companyLogo ? "border-transparent bg-muted/30" : "border-muted-foreground/20 hover:border-muted-foreground/40 cursor-pointer")} onClick={() => !companyLogo && logoInputRef.current?.click()}>
                        {companyLogo ? <img src={companyLogo} alt="Logo" className="h-full w-full object-contain p-1" /> : logoUploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/40" />}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        {companyLogo ? (
                          <div className="flex gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}><Upload className="h-3 w-3 mr-1" /> Change</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => setCompanyLogo(null)}><X className="h-3 w-3 mr-1" /> Remove</Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>{logoUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}Upload Logo</Button>
                        )}
                        <span className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Company Name <span className="text-destructive">*</span></Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} type="email" placeholder="billing@company.com" /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+1 (555) 000-0000" /></div>
                  <div className="space-y-1.5"><Label>VAT / Tax Number</Label><Input value={companyVat} onChange={(e) => setCompanyVat(e.target.value)} placeholder="VAT123456" /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><User className="h-4 w-4 text-emerald-500" /></div>
                    <div><CardTitle className="text-base">{isQuote ? "Quote To" : isReceipt ? "Received from" : "Bill To"}</CardTitle><CardDescription>Client / customer details</CardDescription></div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="space-y-1.5 relative">
                    <Label>Client Name <span className="text-destructive">*</span></Label>
                    <Input
                      ref={clientInputRef}
                      value={clientName}
                      onChange={(e) => handleClientNameChange(e.target.value)}
                      onFocus={() => previousClients.length > 0 && setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      placeholder="Start typing to search..."
                      autoComplete="off"
                    />
                    <AnimatePresence>
                      {showClientSuggestions && previousClients.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden"
                        >
                          <div className="px-3 py-2 border-b bg-muted/30">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Previous Clients</p>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {previousClients.map((client, i) => (
                              <motion.button
                                key={`${client.name}-${i}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors flex items-center gap-3 cursor-pointer"
                                onMouseDown={(e) => { e.preventDefault(); selectClient(client); }}
                              >
                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                  <User className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{client.name}</p>
                                  {client.email && <p className="text-xs text-muted-foreground truncate">{client.email}</p>}
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-1.5"><Label>Email</Label><Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" placeholder="client@example.com" /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+1 (555) 000-0000" /></div>
                  <div className="space-y-1.5"><Label>Tax / VAT number <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label><Input value={clientTaxNumber} onChange={(e) => setClientTaxNumber(e.target.value)} placeholder="Customer tax ID" /></div>
                  <Separator />
                  <div className="space-y-1.5"><Label>Street Address</Label><Input value={clientAddressLine1} onChange={(e) => setClientAddressLine1(e.target.value)} placeholder="123 Main Street" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>City</Label><Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="Cape Town" /></div>
                    <div className="space-y-1.5"><Label>Country</Label><Input value={clientCountry} onChange={(e) => setClientCountry(e.target.value)} placeholder="South Africa" /></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Receipt className="h-4 w-4 text-amber-500" /></div>
                    <div><CardTitle className="text-base">Line Items</CardTitle><CardDescription>{items.length} item{items.length !== 1 ? "s" : ""}</CardDescription></div>
                  </div>
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="hidden sm:grid grid-cols-[1fr_80px_110px_80px_36px] gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-3">
                  <span>Description</span><span>Qty</span><span>Unit Price</span><span>Tax %</span><span></span>
                </div>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={item.id} className="group">
                      <div className="hidden sm:grid grid-cols-[1fr_80px_110px_80px_36px] gap-3 items-center">
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item description" />
                        <Input type="number" min={1} value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencyData?.symbol || currency}</span>
                          <Input type="number" min={0} step={0.01} value={item.unit_price || ""} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} className="pl-8" />
                        </div>
                        <Input type="number" min={0} max={100} step={0.5} value={item.tax_percent || ""} onChange={(e) => updateItem(i, "tax_percent", parseFloat(e.target.value) || 0)} />
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)} disabled={items.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger><TooltipContent>Remove item</TooltipContent></Tooltip>
                      </div>
                      <div className="sm:hidden rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)} disabled={items.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item description" />
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Qty</Label><Input type="number" min={1} value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} /></div>
                          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Price</Label><Input type="number" min={0} step={0.01} value={item.unit_price || ""} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} /></div>
                          <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Tax %</Label><Input type="number" min={0} max={100} value={item.tax_percent || ""} onChange={(e) => updateItem(i, "tax_percent", parseFloat(e.target.value) || 0)} /></div>
                        </div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Line total</span><span className="font-medium">{formatMoney(item.quantity * item.unit_price)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 sm:hidden" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
              </CardContent>
            </Card>

            {/* Additional */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center"><Info className="h-4 w-4 text-violet-500" /></div>
                  <div><CardTitle className="text-base">Additional Details</CardTitle><CardDescription>Discounts, shipping, notes and terms</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Discount Amount</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencyData?.symbol || currency}</span>
                      <Input type="number" min={0} step={0.01} value={discountAmount || ""} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} className="pl-8" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Shipping</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencyData?.symbol || currency}</span>
                      <Input type="number" min={0} step={0.01} value={shippingAmount || ""} onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)} className="pl-8" placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5"><Label htmlFor="tax-inclusive" className="text-sm font-medium cursor-pointer">Tax Inclusive Pricing</Label><p className="text-xs text-muted-foreground">Prices already include tax</p></div>
                  <Switch id="tax-inclusive" checked={taxInclusive} onCheckedChange={setTaxInclusive} />
                </div>
                <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment instructions, thank you note, bank details..." rows={3} className="resize-none" /></div>
                <div className="space-y-1.5"><Label>Terms & Conditions</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms, late fees, etc." rows={3} className="resize-none" /></div>
              </CardContent>
            </Card>

            <div className="sm:hidden flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleSave} disabled={saving}>{saving && !generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Draft</Button>
              <Button className="flex-1" onClick={handleSaveAndGenerate} disabled={saving}>{generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}Generate PDF</Button>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-20">
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">Summary<Badge variant="secondary" className="text-[10px] font-normal">Live</Badge></CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {(companyLogo || companyName) && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      {companyLogo && <img src={companyLogo} alt="" className="h-8 w-8 rounded object-contain" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{companyName || "Your Company"}</p>
                        {invoiceNumber && <p className="text-xs text-muted-foreground font-mono">{invoiceNumber}</p>}
                      </div>
                    </div>
                  )}
                  {clientName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-medium truncate">{clientName}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-2">{items.filter((it) => it.description).map((it, i) => (
                    <div key={i} className="flex justify-between text-sm gap-2"><span className="text-muted-foreground truncate">{it.description}</span><span className="font-medium shrink-0 tabular-nums">{formatMoney(it.quantity * it.unit_price)}</span></div>
                  ))}</div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium tabular-nums">{formatMoney(subtotal)}</span></div>
                    {totalTax > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax{taxInclusive ? " (included)" : ""}</span><span className="font-medium tabular-nums">{formatMoney(totalTax)}</span></div>}
                    {discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span className="font-medium text-red-500 tabular-nums">-{formatMoney(discountAmount)}</span></div>}
                    {shippingAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span className="font-medium tabular-nums">{formatMoney(shippingAmount)}</span></div>}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center"><span className="font-semibold">{isReceipt ? "Amount received" : "Grand Total"}</span><span className="text-2xl font-bold tabular-nums tracking-tight">{formatMoney(Math.max(0, grandTotal))}</span></div>
                  <div className="text-xs text-muted-foreground space-y-1 pt-1">
                    <div className="flex justify-between"><span>{isReceipt ? "Payment date" : "Date"}</span><span>{format(date, "PP")}</span></div>
                    {!isReceipt && dueDate && <div className="flex justify-between"><span>{isQuote ? "Valid Until" : "Due"}</span><span>{format(dueDate, "PP")}</span></div>}
                    <div className="flex justify-between"><span>Currency</span><span>{currency}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
