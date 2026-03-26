"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  FileDown,
} from "lucide-react";
import Link from "next/link";

interface ItemRow {
  description: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
}

export default function NewInvoicePage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("ZAR");
  const [language, setLanguage] = useState("en");

  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyVat, setCompanyVat] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddressLine1, setClientAddressLine1] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientCountry, setClientCountry] = useState("");

  const [items, setItems] = useState<ItemRow[]>([{ description: "", quantity: 1, unit_price: 0, tax_percent: 0 }]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!organization?.id) return;
    setCompanyName(organization.name || "");
    setCurrency((organization as any).currency || "ZAR");
    api.invoices.getNextNumber(organization.id).then((res: any) => {
      if (res.nextNumber) setInvoiceNumber(res.nextNumber);
    }).catch(() => {});
  }, [organization?.id, organization?.name]);

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const totalTax = items.reduce((sum, it) => {
    if (!it.tax_percent) return sum;
    const line = it.quantity * it.unit_price;
    return sum + (taxInclusive ? line * (it.tax_percent / (100 + it.tax_percent)) : line * (it.tax_percent / 100));
  }, 0);
  const grandTotal = taxInclusive
    ? subtotal + shippingAmount - discountAmount
    : subtotal + totalTax + shippingAmount - discountAmount;

  function formatMoney(amt: number) {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(amt);
  }

  function updateItem(index: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, tax_percent: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const buildPayload = useCallback(() => ({
    organizationId: organization?.id,
    invoiceNumber,
    date,
    dueDate: dueDate || undefined,
    currency,
    language,
    companyName,
    companyEmail: companyEmail || undefined,
    companyPhone: companyPhone || undefined,
    companyVat: companyVat || undefined,
    clientName,
    clientEmail: clientEmail || undefined,
    clientPhone: clientPhone || undefined,
    clientAddress: clientAddressLine1 || clientCity || clientCountry
      ? { line1: clientAddressLine1, city: clientCity, country: clientCountry }
      : undefined,
    items: items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      tax_percent: it.tax_percent || undefined,
    })),
    discountAmount,
    shippingAmount,
    taxInclusive,
    notes: notes || undefined,
    terms: terms || undefined,
  }), [organization?.id, invoiceNumber, date, dueDate, currency, language, companyName, companyEmail, companyPhone, companyVat, clientName, clientEmail, clientPhone, clientAddressLine1, clientCity, clientCountry, items, discountAmount, shippingAmount, taxInclusive, notes, terms]);

  async function handleSave() {
    if (!organization?.id) return;
    if (!companyName.trim()) { toast.error("Company name is required"); return; }
    if (!clientName.trim()) { toast.error("Client name is required"); return; }
    if (items.some((it) => !it.description.trim())) { toast.error("All items need a description"); return; }

    setSaving(true);
    try {
      const res = await api.invoices.create(buildPayload()) as any;
      toast.success("Invoice created");
      router.push(`/${slug}/invoices/${res.invoice.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndGenerate() {
    if (!organization?.id) return;
    if (!companyName.trim()) { toast.error("Company name is required"); return; }
    if (!clientName.trim()) { toast.error("Client name is required"); return; }

    setSaving(true);
    setGenerating(true);
    try {
      const res = await api.invoices.create(buildPayload()) as any;
      await api.invoices.generatePdf(res.invoice.id);
      toast.success("Invoice created and PDF generated");
      router.push(`/${slug}/invoices/${res.invoice.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) { router.push("/sign-in"); return null; }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${slug}/invoices`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
          <p className="text-muted-foreground text-sm">Fill in the details to create a new invoice</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving && !generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handleSaveAndGenerate} disabled={saving}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Save & Generate PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-0001" />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="ZAR" maxLength={3} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">From (Company)</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div><Label>Company Name *</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                <div><Label>Email</Label><Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} type="email" /></div>
                <div><Label>Phone</Label><Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} /></div>
                <div><Label>VAT Number</Label><Input value={companyVat} onChange={(e) => setCompanyVat(e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">Bill To (Client)</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div><Label>Client Name *</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
                <div><Label>Email</Label><Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" /></div>
                <div><Label>Phone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} /></div>
                <div><Label>Address</Label><Input value={clientAddressLine1} onChange={(e) => setClientAddressLine1(e.target.value)} placeholder="Street address" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} /></div>
                  <div><Label>Country</Label><Input value={clientCountry} onChange={(e) => setClientCountry(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_80px_100px_80px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Description</span><span>Qty</span><span>Unit Price</span><span>Tax %</span><span></span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_100px_80px_36px] gap-2 items-center">
                    <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Item description" />
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
                    <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} />
                    <Input type="number" min={0} max={100} step={0.5} value={item.tax_percent} onChange={(e) => updateItem(i, "tax_percent", parseFloat(e.target.value) || 0)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">Additional</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Discount</Label><Input type="number" min={0} step={0.01} value={discountAmount} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} /></div>
                <div><Label>Shipping</Label><Input type="number" min={0} step={0.01} value={shippingAmount} onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="taxInclusive" checked={taxInclusive} onChange={(e) => setTaxInclusive(e.target.checked)} className="rounded" />
                <Label htmlFor="taxInclusive" className="text-sm font-normal cursor-pointer">Prices include tax (tax-inclusive)</Label>
              </div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment instructions, thank you note, etc." rows={3} /></div>
              <div><Label>Terms</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms and conditions" rows={3} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-4"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatMoney(subtotal)}</span>
              </div>
              {totalTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax{taxInclusive ? " (included)" : ""}</span>
                  <span className="font-medium">{formatMoney(totalTax)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-red-600">-{formatMoney(discountAmount)}</span>
                </div>
              )}
              {shippingAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatMoney(shippingAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Grand Total</span>
                <span className="text-xl font-bold">{formatMoney(Math.max(0, grandTotal))}</span>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{items.length} item{items.length !== 1 ? "s" : ""}</div>
                {invoiceNumber && <div>#{invoiceNumber}</div>}
                {clientName && <div>To: {clientName}</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
