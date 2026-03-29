"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  invoiceId: string;
  docLabel: string;
  /** Bumps when PDF is regenerated so we refetch the blob. */
  pdfVersion: string | null | undefined;
};

/**
 * Chrome often fails to embed PDFs from same-origin proxy URLs in <object>/<iframe>
 * (shows the host "refused to connect"). Fetch with session cookies and use a blob URL instead.
 */
export function InvoicePdfPreview({ invoiceId, docLabel, pdfVersion }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(api.invoices.getPdfUrl(invoiceId), {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("bad status");
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!ct.includes("application/pdf")) throw new Error("not pdf");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (ac.signal.aborted) {
          URL.revokeObjectURL(url);
          return;
        }
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        if (!ac.signal.aborted) setError(true);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => {
      ac.abort();
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [invoiceId, pdfVersion]);

  const pdfUrl = api.invoices.getPdfUrl(invoiceId);
  const frameHeight = { height: "calc(100vh - 180px)", minHeight: 600 } as const;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-muted/40 rounded-lg border border-border/60"
        style={frameHeight}
      >
        <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" aria-label="Loading PDF" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 bg-muted/40 rounded-lg border border-border/60 p-8 text-center"
        style={{ minHeight: 400 }}
      >
        <p className="text-sm text-muted-foreground max-w-sm">
          Could not load the PDF preview in the page. You can still open or download it.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}>
            Open in new tab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full border-0 bg-white"
      style={frameHeight}
      title={`${docLabel} PDF preview`}
    />
  );
}
