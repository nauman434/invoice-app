import PDFDocument from "pdfkit";
import { currencySymbol } from "@/lib/types";

type InvoiceWithRelations = {
  invoiceNumber: string;
  periodLabel: string;
  billedTo: string;
  fromName: string;
  invoiceDate: Date;
  currency: string;
  rate: any;
  bankAccountTitle: string | null;
  bankSwiftCode: string | null;
  bankIban: string | null;
  bankName: string | null;
  bankBranchCode: string | null;
  bankAccountNumber: string | null;
  footerNote: string | null;
  totalHours: any;
  totalAmount: any;
  categories: {
    name: string;
    subtotalHours: any;
    subtotalAmount: any;
    lineItems: { description: string; hours: any; total: any }[];
  }[];
};

export function generateInvoicePdf(invoice: InvoiceWithRelations): Promise<Buffer> {
  const sym = currencySymbol(invoice.currency);
  const MARGIN_X = 50;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("INVOICE SUMMARY", MARGIN_X, doc.y, { align: "left" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${invoice.periodLabel}  ·  Rate ${sym}${Number(invoice.rate).toFixed(2)}/hr`, MARGIN_X, doc.y);
    doc.moveDown(0.8);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Billed To: ", MARGIN_X, doc.y, { continued: true })
      .font("Helvetica")
      .text(invoice.billedTo);
    doc.font("Helvetica-Bold").text("From: ", MARGIN_X, doc.y, { continued: true }).font("Helvetica").text(invoice.fromName);
    doc
      .font("Helvetica-Bold")
      .text("Date: ", MARGIN_X, doc.y, { continued: true })
      .font("Helvetica")
      .text(new Date(invoice.invoiceDate).toLocaleDateString("en-GB"));
    doc.moveDown(1);

    for (const cat of invoice.categories) {
      doc.fontSize(12).font("Helvetica-Bold").text(cat.name.toUpperCase(), MARGIN_X, doc.y);
      doc.moveDown(0.3);

      const colX = { desc: 50, hours: 380, total: 460 };
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Description", colX.desc, doc.y, { continued: false });
      doc.text("Hours", colX.hours, doc.y - 12);
      doc.text("Total", colX.total, doc.y - 12);
      doc.moveDown(0.3);

      doc.font("Helvetica").fontSize(9);
      for (const li of cat.lineItems) {
        const y = doc.y;
        doc.text(li.description, colX.desc, y, { width: 320 });
        doc.text(String(Number(li.hours)), colX.hours, y);
        doc.text(`${sym}${Number(li.total).toFixed(2)}`, colX.total, y);
        doc.moveDown(0.4);
      }

      doc.font("Helvetica-Bold").fontSize(9);
      const y = doc.y;
      doc.text(`${cat.name} Subtotal`, colX.desc, y);
      doc.text(String(Number(cat.subtotalHours)), colX.hours, y);
      doc.text(`${sym}${Number(cat.subtotalAmount).toFixed(2)}`, colX.total, y);
      doc.moveDown(1);
    }

    doc.fontSize(12).font("Helvetica-Bold");
    const gy = doc.y;
    doc.text("GRAND TOTAL", 50, gy);
    doc.text(String(Number(invoice.totalHours)), 380, gy);
    doc.text(`${sym}${Number(invoice.totalAmount).toFixed(2)}`, 460, gy);
    doc.moveDown(1.5);

    doc.fontSize(11).font("Helvetica-Bold").text("BANK DETAILS", MARGIN_X, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica");
    const bankLines: [string, string | null][] = [
      ["Account Title", invoice.bankAccountTitle],
      ["Swift Code", invoice.bankSwiftCode],
      ["IBAN", invoice.bankIban],
      ["Bank Name", invoice.bankName],
      ["Branch Code", invoice.bankBranchCode],
      ["Account Number", invoice.bankAccountNumber],
    ];
    for (const [label, value] of bankLines) {
      if (!value) continue;
      doc.font("Helvetica-Bold").text(`${label}: `, MARGIN_X, doc.y, { continued: true }).font("Helvetica").text(value);
    }

    doc.moveDown(1.5);
    doc.fontSize(10).font("Helvetica-Oblique").text(invoice.footerNote ?? "Thank you!", MARGIN_X, doc.y);

    doc.end();
  });
}