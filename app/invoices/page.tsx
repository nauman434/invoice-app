import { requireUserId } from "@/lib/session";
import { listInvoices } from "@/lib/repository";
import { redirect } from "next/navigation";
import InvoiceHistoryList from "@/components/InvoiceHistoryList";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { client?: string; from?: string; to?: string; currency?: string; tab?: string };
}) {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const status: "DRAFT" | "FINAL" = searchParams.tab === "draft" ? "DRAFT" : "FINAL";

  const [invoices, draftCount, finalCount] = await Promise.all([
    listInvoices(userId, {
      clientName: searchParams.client,
      from: searchParams.from,
      to: searchParams.to,
      currency: searchParams.currency,
      status,
    }),
    listInvoices(userId, { status: "DRAFT" }).then((r) => r.length),
    listInvoices(userId, { status: "FINAL" }).then((r) => r.length),
  ]);

  const serialized = invoices.map((inv: (typeof invoices)[number]) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    billedTo: inv.billedTo,
    invoiceDate: inv.invoiceDate.toISOString(),
    currency: inv.currency,
    totalHours: Number(inv.totalHours),
    totalAmount: Number(inv.totalAmount),
  }));

  return (
    <InvoiceHistoryList
      invoices={serialized}
      filters={searchParams}
      activeTab={status === "DRAFT" ? "draft" : "final"}
      draftCount={draftCount}
      finalCount={finalCount}
    />
  );
}
