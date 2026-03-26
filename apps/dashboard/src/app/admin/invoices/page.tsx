"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Receipt, DollarSign, FileText, Send, CheckCircle, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#3b82f6",
  paid: "#22c55e",
  overdue: "#ef4444",
  cancelled: "#a1a1aa",
};

interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
  recentMonth: number;
  totalRevenue: number;
  paidRevenue: number;
  topOrganizations: { id: string; name: string; slug: string; invoiceCount: number; revenue: number }[];
  monthlyTrend: Record<string, { count: number; revenue: number }>;
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);
}

export default function AdminInvoicesPage() {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, listRes] = await Promise.all([
          api.admin.getAdminInvoiceStats() as Promise<{ success: boolean; stats: InvoiceStats }>,
          api.admin.getAdminInvoices({ page: 1, limit: 10 }) as Promise<{ success: boolean; invoices: any[] }>,
        ]);
        if (statsRes.success) setStats(statsRes.stats);
        if (listRes.success) setRecentInvoices(listRes.invoices ?? []);
      } catch {
        toast.error("Failed to load invoice stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Failed to load statistics. Please try again.
      </div>
    );
  }

  const statusPieData = [
    { name: "Draft", value: stats.draft, color: STATUS_COLORS.draft },
    { name: "Sent", value: stats.sent, color: STATUS_COLORS.sent },
    { name: "Paid", value: stats.paid, color: STATUS_COLORS.paid },
    { name: "Overdue", value: stats.overdue, color: STATUS_COLORS.overdue },
    { name: "Cancelled", value: stats.cancelled, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  const monthlyData = Object.entries(stats.monthlyTrend || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en", { month: "short", year: "2-digit" }),
      count: data.count,
      revenue: data.revenue,
    }));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide invoice statistics and trends</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Receipt className="h-3 w-3" /> Total</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><DollarSign className="h-3 w-3" /> Revenue</div>
            <div className="text-xl font-bold mt-1">{formatMoney(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Paid</div>
            <div className="text-xl font-bold mt-1 text-green-600">{formatMoney(stats.paidRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><FileText className="h-3 w-3" /> Draft</div>
            <div className="text-2xl font-bold mt-1">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Send className="h-3 w-3 text-blue-500" /> Sent</div>
            <div className="text-2xl font-bold mt-1">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-500" /> Overdue</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1"><TrendingUp className="h-3 w-3" /> This Month</div>
            <div className="text-2xl font-bold mt-1">{stats.recentMonth}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Trend</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: number) => [value, "Invoices"]} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.topOrganizations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Organizations by Revenue</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-right">{org.invoiceCount}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(org.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No invoices yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.organization?.name ?? "—"}</TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell className="text-sm">{new Date(inv.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(Number(inv.grand_total))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
