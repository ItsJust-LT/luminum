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
  FileStack,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

type TemplatePayload = {
  clientName?: string;
  companyName?: string;
  currency?: string;
} | null;

type ScheduleRow = {
  id: string;
  name: string | null;
  frequency: string;
  time_local: string;
  timezone: string;
  due_days_after_issue: number | null;
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
  } | null;
  template_payload?: TemplatePayload;
};

function payloadSummary(p: TemplatePayload): { title: string; sub: string } | null {
  if (!p || typeof p !== "object") return null;
  const client = String(p.clientName || "").trim();
  const company = String(p.companyName || "").trim();
  const cur = String(p.currency || "").trim();
  if (!client && !company) return null;
  return {
    title: client || "Saved template",
    sub: [company, cur].filter(Boolean).join(" · "),
  };
}

export default function InvoiceSchedulesPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orgId = organization?.id;

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const schRes = (await api.invoiceSchedules.list(orgId)) as { schedules: ScheduleRow[] };
      setSchedules(schRes.schedules ?? []);
    } catch {
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <div className="sticky top-0 z-20 border-b bg-background">
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
                Automate new invoices on a schedule — build a template or link an existing invoice
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" asChild>
              <Link href={`/${slug}/invoices/schedules/new`}>
                <Plus className="h-4 w-4 mr-1.5" /> New schedule
              </Link>
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
          <Card className="border-dashed bg-muted/20 overflow-hidden">
            <CardHeader>
              <CardTitle>No schedules yet</CardTitle>
              <CardDescription>
                Create a full template (company, client, line items) or reuse an invoice. Each run gets a new
                invoice number and PDF; delivery is email and/or WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/${slug}/invoices/schedules/new`}>
                  <Plus className="h-4 w-4 mr-2" /> Create schedule
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          schedules.map((s) => {
            const inline = payloadSummary(s.template_payload as TemplatePayload);
            const title =
              s.name ||
              (s.template_invoice
                ? `From ${s.template_invoice.invoice_number}`
                : inline?.title || "Recurring template");
            return (
              <Card
                key={s.id}
                className={`overflow-hidden border-border/80 shadow-sm transition-opacity ${!s.active ? "opacity-70" : ""}`}
              >
                <CardHeader className="pb-3 space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">{title}</CardTitle>
                      <CardDescription className="mt-1">
                        {s.template_invoice ? (
                          <>
                            Template{" "}
                            <Link
                              href={`/${slug}/invoices/${s.template_invoice.id}`}
                              className="font-mono text-foreground underline-offset-4 hover:underline"
                            >
                              {s.template_invoice.invoice_number}
                            </Link>{" "}
                            · {s.template_invoice.client_name}
                          </>
                        ) : inline ? (
                          <span className="inline-flex items-center gap-1.5">
                            <FileStack className="h-3.5 w-3.5 shrink-0" />
                            {inline.sub ? `${inline.sub} · ` : ""}
                            {inline.title}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Custom saved template</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch checked={s.active} onCheckedChange={(v) => void toggleActive(s, v)} />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {s.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(s.id)}
                      >
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
                    {s.due_days_after_issue != null ? (
                      <Badge variant="outline" className="font-normal">
                        Due +{s.due_days_after_issue}d
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        No due date
                      </Badge>
                    )}
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
            );
          })
        )}
      </div>

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
