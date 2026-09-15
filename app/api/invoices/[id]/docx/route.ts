import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { getInvoice } from "@/lib/repository";
import { generateInvoiceDocx } from "@/lib/export/docx";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await getInvoice(userId, params.id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await generateInvoiceDocx(invoice as any);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.docx"`,
    },
  });
}
