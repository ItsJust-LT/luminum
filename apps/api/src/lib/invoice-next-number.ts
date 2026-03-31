import { prisma } from "./prisma.js";

export async function getNextInvoiceNumber(
  organizationId: string,
  documentType: "invoice" | "quote" = "invoice"
): Promise<string> {
  const prefix = documentType === "quote" ? "QUO" : "INV";
  const last = await prisma.invoice.findFirst({
    where: { organization_id: organizationId, document_type: documentType },
    orderBy: { created_at: "desc" },
    select: { invoice_number: true },
  });
  let nextNum = 1;
  if (last?.invoice_number) {
    const match = last.invoice_number.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]!, 10) + 1;
  }
  return `${prefix}-${String(nextNum).padStart(4, "0")}`;
}
