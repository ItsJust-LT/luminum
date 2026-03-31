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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { currencies } from "@/lib/currencies";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Loader2, CalendarClock, Building2, User, ImageIcon, X, Upload,
  Receipt, Info, Globe, ChevronsUpDown, Check, FileStack, Link2,
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
  address?: { line1?: string; city?: string; country?: string };
}

const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "ZAR", "CAD", "AUD", "JPY", "CHF", "INR", "BRL", "NGN", "KES"];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

const TIMEZONES = [
  "UTC",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function NewRecurringSchedulePage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const orgId = organization?.id;
  const fromInvoiceId = searchParams.get("from");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tab, setTab] = useState<"build" | "link">("build");
  const [saving, setSaving] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [previousClients, setPreviousClients] = useState<PreviousClient[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const [scheduleName, setScheduleName] = useState("");
  const [formFrequency, setFormFrequency] = useState<string>("monthly");
  const [formTime, setFormTime] = useState("09:00");
  const [formTz, setFormTz] = useState("Africa/Johannesburg");
  const [formEmail, setFormEmail] = useState(false);
  const [formWa, setFormWa] = useState(false);
  const [formEmailTo, setFormEmailTo] = useState("");
  const [formWaPhone, setFormWaPhone] = useState("");
  const [formFromLocal, setFormFromLocal] = useState("");
  const [formEmailMsg, setFormEmailMsg] = useState("");
  const [formWaMsg, setFormWaMsg] = useState("");

  const [linkTemplateId, setLinkTemplateId] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState<{ id: string; invoice_number: string; client_name: string }[]>([]);

  const [currency, setCurrency] = useState("ZAR");
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
  const [clientAddressLine1, setClientAddressLine1] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { id: generateId(), description: "", quantity: 1, unit_price: 0, tax_percent: 0 },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!orgId) return;
    setCurrency((organization as { currency?: string })?.currency || "ZAR");
    (async () => {
      try {
        const companyRes = (await api.invoices.getLastCompany(orgId)) as { company?: Record<string, unknown> };
        if (companyRes?.company) {
          const c = companyRes.company;
          setCompanyName(String(c.company_name || organization?.name || ""));
          setCompanyEmail(String(c.company_email || ""));
          setCompanyPhone(String(c.company_phone || ""));
          setCompanyVat(String(c.company_vat || ""));
          setCompanyLogo((c.company_logo as string) || (organization as { logo?: string })?.logo || null);
        } else {
          setCompanyName(organization?.name || "");
          if ((organization as { logo?: string })?.logo) setCompanyLogo((organization as { logo?: string }).logo!);
        }
      } catch {
        setCompanyName(organization?.name || "");
      }
    })();
  }, [orgId, organization]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const invRes = (await api.invoices.list(orgId, { page: 1, limit: 100, document_type: "invoice" })) as {
          invoices: { id: string; invoice_number: string; client_name: string; document_type: string }[];
        };
        setInvoiceOptions((invRes.invoices ?? []).filter((i) => i.document_type === "invoice"));
      } catch {
        setInvoiceOptions([]);
      }
    })();
  }, [orgId]);

  useEffect(() => {
    if (!fromInvoiceId || !orgId) return;
    (async () => {
      try {
        const res = (await api.invoices.get(fromInvoiceId)) as { invoice?: Record<string, unknown> };
        const inv = res.invoice;
        if (!inv) return;
        setTab("build");
        setCurrency(String(inv.currency || "ZAR"));
        setLanguage(String(inv.language || "en"));
        setCompanyName(String(inv.company_name || ""));
        setCompanyEmail(String(inv.company_email || ""));
        setCompanyPhone(String(inv.company_phone || ""));
        setCompanyVat(String(inv.company_vat || ""));
        setCompanyLogo((inv.company_logo as string) || null);
        setClientName(String(inv.client_name || ""));
        setClientEmail(String(inv.client_email || ""));
        setClientPhone(String(inv.client_phone || ""));
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
        setNotes(String(inv.notes || ""));
        setTerms(String(inv.terms || ""));
        toast.success("Imported invoice into template");
      } catch {
        toast.error("Could not load invoice to import");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from URL
  }, [fromInvoiceId, orgId]);

  function handleClientNameChange(value: string) {
    setClientName(value);
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    if (!orgId || value.trim().length < 2) {
      setPreviousClients([]);
      setShowClientSuggestions(false);
      return;
    }
    clientSearchTimer.current = setTimeout(async () => {
      try {
        const res = (await api.invoices.searchClients(orgId, value.trim())) as { clients?: PreviousClient[] };
        const clients = res?.clients || [];
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
    const addr = client.address;
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
    try {
      return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amt);
    } catch {
      return `${currency} ${amt.toFixed(2)}`;
    }
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
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB");
      return;
    }
    setLogoUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
      const logoBase64 = btoa(binary);
      if (organization?.id) {
        const res = (await api.uploads.uploadLogo({
          logoBase64,
          fileName: file.name,
          contentType: file.type,
          organizationName: organization.name,
          organizationId: organization.id,
        })) as { url: string };
        setCompanyLogo(res.url);
      }
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const buildTemplateObject = useCallback(() => {
    return {
      companyName: companyName.trim(),
      companyEmail: companyEmail.trim() || undefined,
      companyPhone: companyPhone.trim() || undefined,
      companyVat: companyVat.trim() || undefined,
      companyLogo: companyLogo || undefined,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientAddress:
        clientAddressLine1 || clientCity || clientCountry
          ? { line1: clientAddressLine1, city: clientCity, country: clientCountry }
          : undefined,
      currency,
      language,
      taxInclusive,
      discountAmount,
      shippingAmount,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: it.quantity,
        unit_price: it.unit_price,
        tax_percent: it.tax_percent || undefined,
      })),
    };
  }, [
    companyName,
    companyEmail,
    companyPhone,
    companyVat,
    companyLogo,
    clientName,
    clientEmail,
    clientPhone,
    clientAddressLine1,
    clientCity,
    clientCountry,
    currency,
    language,
    taxInclusive,
    discountAmount,
    shippingAmount,
    notes,
    terms,
    items,
  ]);

  async function submitSchedule() {
    if (!orgId) return;
    if (!formEmail && !formWa) {
      toast.error("Enable at least one of email or WhatsApp delivery");
      return;
    }

    setSaving(true);
    try {
      if (tab === "link") {
        if (!linkTemplateId) {
          toast.error("Select an invoice to use as template");
          setSaving(false);
          return;
        }
        await api.invoiceSchedules.create({
          organizationId: orgId,
          name: scheduleName.trim() || undefined,
          templateInvoiceId: linkTemplateId,
          frequency: formFrequency,
          timeLocal: formTime,
          timezone: formTz,
          dueDaysAfterIssue: null,
          sendEmail: formEmail,
          sendWhatsapp: formWa,
          emailToOverride: formEmailTo.trim() || undefined,
          whatsappPhoneOverride: formWaPhone.trim() || undefined,
          emailFromLocalPart: formFromLocal.trim() || undefined,
          emailMessage: formEmailMsg.trim() || undefined,
          whatsappMessage: formWaMsg.trim() || undefined,
          active: true,
        });
      } else {
        if (!companyName.trim()) {
          toast.error("Company name is required");
          setSaving(false);
          return;
        }
        if (!clientName.trim()) {
          toast.error("Client name is required");
          setSaving(false);
          return;
        }
        if (items.some((it) => !it.description.trim())) {
          toast.error("Each line item needs a description");
          setSaving(false);
          return;
        }
        await api.invoiceSchedules.create({
          organizationId: orgId,
          name: scheduleName.trim() || undefined,
          template: buildTemplateObject(),
          frequency: formFrequency,
          timeLocal: formTime,
          timezone: formTz,
          dueDaysAfterIssue: null,
          sendEmail: formEmail,
          sendWhatsapp: formWa,
          emailToOverride: formEmailTo.trim() || undefined,
          whatsappPhoneOverride: formWaPhone.trim() || undefined,
          emailFromLocalPart: formFromLocal.trim() || undefined,
          emailMessage: formEmailMsg.trim() || undefined,
          whatsappMessage: formWaMsg.trim() || undefined,
          active: true,
        });
      }
      toast.success("Recurring schedule created");
      router.push(`/${slug}/invoices/schedules`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen pb-12 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href={`/${slug}/invoices/schedules`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </span>
                New recurring schedule
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Each run creates a new invoice from this template. Due date is left blank on generated invoices.
              </p>
            </div>
          </div>
          <Button className="sm:ml-auto shrink-0" onClick={() => void submitSchedule()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarClock className="h-4 w-4 mr-2" />}
            Create schedule
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-base">Schedule & delivery</CardTitle>
            <CardDescription>How often to issue a new invoice and how to deliver it</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sch-label">Label (optional)</Label>
              <Input
                id="sch-label"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g. Acme retainer"
              />
            </div>
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={formFrequency} onValueChange={setFormFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-time">Send time (24h)</Label>
              <Input
                id="sch-time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                placeholder="09:00"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Timezone</Label>
              <Select value={formTz} onValueChange={setFormTz}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {TIMEZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-3 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery</p>
              <div className="flex items-center gap-2">
                <Checkbox id="sch-em" checked={formEmail} onCheckedChange={(v) => setFormEmail(!!v)} />
                <Label htmlFor="sch-em" className="font-normal cursor-pointer">
                  Email (org mail must be configured)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sch-wa" checked={formWa} onCheckedChange={(v) => setFormWa(!!v)} />
                <Label htmlFor="sch-wa" className="font-normal cursor-pointer">
                  WhatsApp (workspace connected)
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-emailto">Override email</Label>
              <Input
                id="sch-emailto"
                type="email"
                value={formEmailTo}
                onChange={(e) => setFormEmailTo(e.target.value)}
                placeholder="Defaults to client email on template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-waphone">Override WhatsApp</Label>
              <Input
                id="sch-waphone"
                value={formWaPhone}
                onChange={(e) => setFormWaPhone(e.target.value)}
                placeholder="Defaults to client phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-from">Email from local-part</Label>
              <Input
                id="sch-from"
                value={formFromLocal}
                onChange={(e) => setFormFromLocal(e.target.value)}
                placeholder="billing"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sch-emmsg">Email message</Label>
              <Textarea
                id="sch-emmsg"
                value={formEmailMsg}
                onChange={(e) => setFormEmailMsg(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sch-wamsg">WhatsApp caption</Label>
              <Textarea
                id="sch-wamsg"
                value={formWaMsg}
                onChange={(e) => setFormWaMsg(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "build" | "link")} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
            <TabsTrigger value="build" className="gap-2">
              <FileStack className="h-4 w-4" />
              Build template
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Use invoice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-0 space-y-4">
            <Card className="border-dashed border-primary/20 bg-primary/[0.03]">
              <CardHeader>
                <CardTitle className="text-base">Linked invoice</CardTitle>
                <CardDescription>
                  Each run clones line items, totals, and branding from that invoice. Or use{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline font-medium"
                    onClick={() => setTab("build")}
                  >
                    build template
                  </button>{" "}
                  to define content without creating a draft first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-w-xl">
                <Label>Template invoice</Label>
                <Select value={linkTemplateId} onValueChange={setLinkTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice…" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.invoice_number} — {t.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invoiceOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No invoices yet — switch to Build template.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="build" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Document</CardTitle>
                        <CardDescription>Currency and language for each generated invoice</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Currency
                      </Label>
                      <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            <span className="flex items-center gap-2 truncate">
                              <span className="text-base">{currencyData?.symbol || currency}</span>
                              <span>{currency}</span>
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search currencies…" />
                            <CommandList>
                              <CommandEmpty>No currency found.</CommandEmpty>
                              <CommandGroup heading="Popular">
                                {POPULAR_CURRENCIES.map((code) => {
                                  const c = currencies[code as keyof typeof currencies];
                                  if (!c) return null;
                                  return (
                                    <CommandItem
                                      key={code}
                                      value={`${code} ${c.name}`}
                                      onSelect={() => {
                                        setCurrency(code);
                                        setCurrencyOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn("mr-2 h-4 w-4", currency === code ? "opacity-100" : "opacity-0")}
                                      />
                                      <span className="font-medium">{code}</span>
                                      <span className="ml-2 text-muted-foreground text-xs truncate">{c.name}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">From</CardTitle>
                          <CardDescription>Your business</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0",
                              companyLogo ? "border-transparent bg-muted/30" : "border-muted-foreground/20"
                            )}
                          >
                            {companyLogo ? (
                              <img src={companyLogo} alt="" className="h-full w-full object-contain p-1" />
                            ) : logoUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs w-fit"
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={logoUploading}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Upload
                            </Button>
                            {companyLogo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                type="button"
                                onClick={() => setCompanyLogo(null)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>
                          Company <span className="text-destructive">*</span>
                        </Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>VAT / tax number</Label>
                        <Input value={companyVat} onChange={(e) => setCompanyVat(e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Bill to</CardTitle>
                          <CardDescription>Customer</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="space-y-1.5 relative">
                        <Label>
                          Client <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          ref={clientInputRef}
                          value={clientName}
                          onChange={(e) => handleClientNameChange(e.target.value)}
                          onFocus={() => previousClients.length > 0 && setShowClientSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                          placeholder="Search previous clients…"
                          autoComplete="off"
                        />
                        <AnimatePresence>
                          {showClientSuggestions && previousClients.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-[200px] overflow-y-auto"
                            >
                              {previousClients.map((client, i) => (
                                <button
                                  key={`${client.name}-${i}`}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectClient(client);
                                  }}
                                >
                                  {client.name}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                      </div>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label>Street</Label>
                        <Input value={clientAddressLine1} onChange={(e) => setClientAddressLine1(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>City</Label>
                          <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Country</Label>
                          <Input value={clientCountry} onChange={(e) => setClientCountry(e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-amber-500" />
                      </div>
                      <CardTitle className="text-base">Line items</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" type="button" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="hidden sm:grid grid-cols-[1fr_72px_100px_72px_36px] gap-2 text-xs font-medium text-muted-foreground uppercase px-1">
                      <span>Description</span>
                      <span>Qty</span>
                      <span>Price</span>
                      <span>Tax %</span>
                      <span />
                    </div>
                    {items.map((item, i) => (
                      <div key={item.id} className="group">
                        <div className="hidden sm:grid grid-cols-[1fr_72px_100px_72px_36px] gap-2 items-center">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder="Description"
                          />
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                            className="tabular-nums"
                          />
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unit_price || ""}
                            onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                            className="tabular-nums"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.tax_percent || ""}
                            onChange={(e) => updateItem(i, "tax_percent", parseFloat(e.target.value) || 0)}
                            className="tabular-nums"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="h-9 opacity-0 group-hover:opacity-100"
                                onClick={() => removeItem(i)}
                                disabled={items.length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="sm:hidden rounded-lg border p-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Item {i + 1}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              className="h-8 w-8"
                              onClick={() => removeItem(i)}
                              disabled={items.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                            />
                            <Input
                              type="number"
                              placeholder="Price"
                              value={item.unit_price || ""}
                              onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                            />
                            <Input
                              type="number"
                              placeholder="Tax"
                              value={item.tax_percent || ""}
                              onChange={(e) => updateItem(i, "tax_percent", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Info className="h-4 w-4 text-violet-500" />
                      </div>
                      <CardTitle className="text-base">Adjustments & notes</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Discount</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={discountAmount || ""}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Shipping</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={shippingAmount || ""}
                          onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                          className="tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="cursor-pointer">Tax-inclusive pricing</Label>
                        <p className="text-xs text-muted-foreground">Line prices include tax</p>
                      </div>
                      <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Terms</Label>
                      <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} className="resize-none" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <Card className="border-primary/15 shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        Preview
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Live
                        </Badge>
                      </CardTitle>
                      <CardDescription>Totals match each run</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {(companyLogo || companyName) && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                          {companyLogo && <img src={companyLogo} alt="" className="h-8 w-8 rounded object-contain" />}
                          <span className="font-medium truncate">{companyName || "Company"}</span>
                        </div>
                      )}
                      {clientName && (
                        <div className="flex gap-2 text-muted-foreground">
                          <User className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{clientName}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="space-y-1.5">
                        {items
                          .filter((it) => it.description)
                          .map((it, idx) => (
                            <div key={idx} className="flex justify-between gap-2">
                              <span className="text-muted-foreground truncate">{it.description}</span>
                              <span className="tabular-nums font-medium shrink-0">
                                {formatMoney(it.quantity * it.unit_price)}
                              </span>
                            </div>
                          ))}
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="tabular-nums">{formatMoney(subtotal)}</span>
                        </div>
                        {totalTax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax</span>
                            <span className="tabular-nums">{formatMoney(totalTax)}</span>
                          </div>
                        )}
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount</span>
                            <span className="tabular-nums">−{formatMoney(discountAmount)}</span>
                          </div>
                        )}
                        {shippingAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="tabular-nums">{formatMoney(shippingAmount)}</span>
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold">Total</span>
                        <span className="text-xl font-bold tabular-nums">{formatMoney(Math.max(0, grandTotal))}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">{currency}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
