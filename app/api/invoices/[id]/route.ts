import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { getInvoice, saveInvoice, deleteInvoice } from "@/lib/repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await getInvoice(userId, params.id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const invoice = await saveInvoice(userId, { ...body, id: params.id });
  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteInvoice(userId, params.id);
  return NextResponse.json({ ok: true });
}
