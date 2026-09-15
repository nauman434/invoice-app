import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { listInvoices, saveInvoice, nextInvoiceNumber } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const invoices = await listInvoices(userId, {
    clientName: searchParams.get("client") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    currency: searchParams.get("currency") ?? undefined,
    status: statusParam === "DRAFT" || statusParam === "FINAL" ? statusParam : undefined,
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.invoiceNumber) {
    body.invoiceNumber = await nextInvoiceNumber(userId);
  }
  const invoice = await saveInvoice(userId, body);
  return NextResponse.json(invoice, { status: 201 });
}
