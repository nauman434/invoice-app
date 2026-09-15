import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { getInvoice } from "@/lib/repository";
import InvoiceForm from "@/components/InvoiceForm";

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return notFound();

  const invoice = await getInvoice(userId, params.id);
  if (!invoice) return notFound();

  const initial = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    periodLabel: invoice.periodLabel,
    billedTo: invoice.billedTo,
    fromName: invoice.fromName,
    invoiceDate: invoice.invoiceDate.toISOString(),
    currency: invoice.currency,
    rate: Number(invoice.rate),
    footerNote: invoice.footerNote ?? "Thank you!",
    bankAccountTitle: invoice.bankAccountTitle ?? "",
    bankSwiftCode: invoice.bankSwiftCode ?? "",
    bankIban: invoice.bankIban ?? "",
    bankName: invoice.bankName ?? "",
    bankBranchCode: invoice.bankBranchCode ?? "",
    bankAccountNumber: invoice.bankAccountNumber ?? "",
    categories: invoice.categories.map((c: (typeof invoice.categories)[number]) => ({
      name: c.name,
      lineItems: c.lineItems.map((li: (typeof c.lineItems)[number]) => ({
        description: li.description,
        hours: Number(li.hours),
        total: Number(li.total),
        isManualTotal: li.isManualTotal,
      })),
    })),
  };

  return <InvoiceForm initial={initial} />;
}
