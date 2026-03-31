"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  CalendarClock,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

type ScheduleRow = {
  id: string;
  name: string | null;
  frequency: string;
  time_local: string;
  timezone: string;
  due_days_after_issue: number;
  send_email: boolean;
  send_whatsapp: boolean;
  active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_error: string | null;
  template_invoice: {
    id: string;
    invoice_number: string;
    client_name: string;
    document_type: string;
    grand_total: unknown;
    currency: string;
  };
};

type TemplateOpt = { id: string; invoice_number: string; client_name: string };

export default function InvoiceSchedulesPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orgId = organization?.id;

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formFrequency, setFormFrequency] = useState<string>("monthly");
  const [formTime, setFormTime] = useState("09:00");
  const [formTz, setFormTz] = useState("Africa/Johannesburg");
  const [formDueDays, setFormDueDays] = useState("14");
  const [formEmail, setFormEmail] = useState(false);
  const [formWa, setFormWa] = useState(false);
  const [formEmailTo, setFormEmailTo] = useState("");
  const [formWaPhone, setFormWaPhone] = useState("");
  const [formFromLocal, setFormFromLocal] = useState("");
  const [formEmailMsg, setFormEmailMsg] = useState("");
  const [formWaMsg, setFormWaMsg] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [schRes, invRes] = await Promise.all([
        api.invoiceSchedules.list(orgId) as Promise<{ schedules: ScheduleRow[] }>,
        api.invoices.list(orgId, { page: 1, limit: 100, document_type: "invoice" }) as Promise<{
          invoices: { id: string; invoice_number: string; client_name: string; document_type: string }[];
        }>,
      ]);
      setSchedules(schRes.schedules ?? []);
      const invs = (invRes.invoices ?? []).filter((i) => i.document_type === "invoice");
      setTemplates(
        invs.map((i) => ({ id: i.id, invoice_number: i.invoice_number, client_name: i.client_name }))
      );
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setFormName("");
    setFormTemplateId("");
    setFormFrequency("monthly");
    setFormTime("09:00");
    setFormTz("Africa/Johannesburg");
    setFormDueDays("14");
    setFormEmail(false);
    setFormWa(false);
    setFormEmailTo("");
    setFormWaPhone("");
    setFormFromLocal("");
    setFormEmailMsg("");
    setFormWaMsg("");
  }

  async function handleCreate() {
    if (!orgId) return;
    if (!formTemplateId) {
      toast.error("Choose a template invoice");
      return;
    }
    if (!formEmail && !formWa) {
      toast.error("Enable at least one of email or WhatsApp delivery");
      return;
    }
    setSaving(true);
    try {
      await api.invoiceSchedules.create({
        organizationId: orgId,
        name: formName.trim() || undefined,
        templateInvoiceId: formTemplateId,
        frequency: formFrequency,
        timeLocal: formTime,
        timezone: formTz,
        dueDaysAfterIssue: parseInt(formDueDays, 10) || 14,
        sendEmail: formEmail,
        sendWhatsapp: formWa,
        emailToOverride: formEmailTo.trim() || undefined,
        whatsappPhoneOverride: formWaPhone.trim() || undefined,
        emailFromLocalPart: formFromLocal.trim() || undefined,
        emailMessage: formEmailMsg.trim() || undefined,
        whatsappMessage: formWaMsg.trim() || undefined,
        active: true,
      });
      toast.success("Schedule created");
      setCreateOpen(false);
      resetForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: ScheduleRow, active: boolean) {
    try {
      await api.invoiceSchedules.update(s.id, { active });
      setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, active } : x)));
      toast.success(active ? "Schedule resumed" : "Schedule paused");
    } catch {
      toast.error("Failed to update schedule");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.invoiceSchedules.delete(deleteId);
      setSchedules((prev) => prev.filter((x) => x.id !== deleteId));
      toast.success("Schedule removed");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen pb-10">
      <div className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href={`/${slug}/invoices`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary shrink-0" />
                Recurring invoices
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                Clone a template on a cadence, set due dates, send by email and WhatsApp
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> New schedule
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardHeader>
              <CardTitle>No schedules yet</CardTitle>
              <CardDescription>
                Pick an existing invoice as a template. Each run issues a new invoice number, keeps line
                items and totals, applies your due-date offset, generates a PDF, and sends on the channels
                you choose.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Create schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          schedules.map((s) => (
            <Card
              key={s.id}
              className={`overflow-hidden border-border/80 shadow-sm transition-opacity ${!s.active ? "opacity-70" : ""}`}
            >
              <CardHeader className="pb-3 space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {s.name || `From ${s.template_invoice.invoice_number}`}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Template{" "}
                      <Link
                        href={`/${slug}/invoices/${s.template_invoice.id}`}
                        className="font-mono text-foreground underline-offset-4 hover:underline"
                      >
                        {s.template_invoice.invoice_number}
                      </Link>{" "}
                      · {s.template_invoice.client_name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch checked={s.active} onCheckedChange={(v) => void toggleActive(s, v)} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {s.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {FREQUENCIES.find((f) => f.value === s.frequency)?.label ?? s.frequency}
                  </Badge>
                  <Badge variant="outline" className="font-normal tabular-nums">
                    {s.time_local} · {s.timezone}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    Due +{s.due_days_after_issue}d
                  </Badge>
                  {s.send_email && (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Mail className="h-3 w-3" /> Email
                    </Badge>
                  )}
                  {s.send_whatsapp && (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Next run</span>
                    <p className="font-medium tabular-nums">
                      {new Date(s.next_run_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last run</span>
                    <p className="font-medium tabular-nums">
                      {s.last_run_at
                        ? new Date(s.last_run_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                {s.last_error && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
                    {s.last_error}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New recurring schedule</DialogTitle>
            <DialogDescription>
              Uses the same products, prices, notes, and terms as the template. A new invoice number is
              assigned each time. Status is set to sent after delivery succeeds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sch-name">Label (optional)</Label>
              <Input
                id="sch-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Monthly retainer — Acme"
              />
            </div>
            <div className="space-y-2">
              <Label>Template invoice</Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.invoice_number} — {t.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create an invoice first, then return here to schedule it.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="sch-due">Due date (days after invoice date)</Label>
              <Input
                id="sch-due"
                type="number"
                min={0}
                max={1825}
                value={formDueDays}
                onChange={(e) => setFormDueDays(e.target.value)}
              />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery</p>
              <div className="flex items-center gap-2">
                <Checkbox id="sch-em" checked={formEmail} onCheckedChange={(v) => setFormEmail(!!v)} />
                <Label htmlFor="sch-em" className="font-normal cursor-pointer">
                  Send by email (org email must be set up)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="sch-wa" checked={formWa} onCheckedChange={(v) => setFormWa(!!v)} />
                <Label htmlFor="sch-wa" className="font-normal cursor-pointer">
                  Send by WhatsApp (workspace WhatsApp connected)
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-emailto">Override email (optional)</Label>
              <Input
                id="sch-emailto"
                type="email"
                value={formEmailTo}
                onChange={(e) => setFormEmailTo(e.target.value)}
                placeholder="Defaults to client email on template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-waphone">Override WhatsApp number (optional)</Label>
              <Input
                id="sch-waphone"
                value={formWaPhone}
                onChange={(e) => setFormWaPhone(e.target.value)}
                placeholder="Defaults to client phone on template"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-from">Email from local-part (optional)</Label>
              <Input
                id="sch-from"
                value={formFromLocal}
                onChange={(e) => setFormFromLocal(e.target.value)}
                placeholder="e.g. billing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-emmsg">Email message (optional)</Label>
              <Textarea
                id="sch-emmsg"
                value={formEmailMsg}
                onChange={(e) => setFormEmailMsg(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-wamsg">WhatsApp caption (optional)</Label>
              <Textarea
                id="sch-wamsg"
                value={formWaMsg}
                onChange={(e) => setFormWaMsg(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving || templates.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops future automated invoices. Existing invoices are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
