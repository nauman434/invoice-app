import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  TableLayoutType,
} from "docx";
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

function heading(text: string, size: number) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size })],
    alignment: AlignmentType.LEFT,
    tabStops: [],
    spacing: { before: 200, after: 120 },
  });
}

function cell(text: string, opts: { bold?: boolean; widthDxa: number }) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
    width: { size: opts.widthDxa, type: WidthType.DXA },
  });
}

const COL_WIDTHS = { desc: 6200, hours: 1400, total: 1800 }; // in DXA (twips), sums to ~9400 (~6.5in content width)

function itemsTable(cat: InvoiceWithRelations["categories"][number], sym: string) {
  const headerRow = new TableRow({
    children: [
      cell("Description", { bold: true, widthDxa: COL_WIDTHS.desc }),
      cell("Hours", { bold: true, widthDxa: COL_WIDTHS.hours }),
      cell("Total", { bold: true, widthDxa: COL_WIDTHS.total }),
    ],
  });
  const rows = cat.lineItems.map(
    (li) =>
      new TableRow({
        children: [
          cell(li.description, { widthDxa: COL_WIDTHS.desc }),
          cell(String(Number(li.hours)), { widthDxa: COL_WIDTHS.hours }),
          cell(`${sym}${Number(li.total).toFixed(2)}`, { widthDxa: COL_WIDTHS.total }),
        ],
      })
  );
  const subtotalRow = new TableRow({
    children: [
      cell(`${cat.name} Subtotal`, { bold: true, widthDxa: COL_WIDTHS.desc }),
      cell(String(Number(cat.subtotalHours)), { bold: true, widthDxa: COL_WIDTHS.hours }),
      cell(`${sym}${Number(cat.subtotalAmount).toFixed(2)}`, { bold: true, widthDxa: COL_WIDTHS.total }),
    ],
  });

  return new Table({
    width: { size: COL_WIDTHS.desc + COL_WIDTHS.hours + COL_WIDTHS.total, type: WidthType.DXA },
    columnWidths: [COL_WIDTHS.desc, COL_WIDTHS.hours, COL_WIDTHS.total],
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...rows, subtotalRow],
  });
}

export async function generateInvoiceDocx(invoice: InvoiceWithRelations): Promise<Buffer> {
  const sym = currencySymbol(invoice.currency);

  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: "INVOICE SUMMARY", bold: true, size: 36 })], tabStops: [] }),
    new Paragraph({
      text: `${invoice.periodLabel}  ·  Rate ${sym}${Number(invoice.rate).toFixed(2)}/hr`,
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({ text: "Billed To: ", bold: true }),
        new TextRun({ text: invoice.billedTo, bold: true }),
        new TextRun({ text: "    From: " , bold: true}),
        new TextRun({ text: invoice.fromName, bold: true }),
        new TextRun({ text: "    Date: ", bold: true }),
        new TextRun({ text: new Date(invoice.invoiceDate).toLocaleDateString("en-GB"), bold: true }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const cat of invoice.categories) {
    children.push(heading(cat.name.toUpperCase(), 26));
    children.push(itemsTable(cat, sym));
    children.push(new Paragraph({ text: "" }));
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "GRAND TOTAL   ", bold: true, size: 26 }),
        new TextRun({ text: `${Number(invoice.totalHours)} hrs   `, bold: true, size: 26 }),
        new TextRun({ text: `${sym}${Number(invoice.totalAmount).toFixed(2)}`, bold: true, size: 26 }),
      ],
    }),
    new Paragraph({ text: "" }),
    heading("BANK DETAILS", 26)
  );

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
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value, bold: true })],
      })
    );
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: invoice.footerNote ?? "Thank you!", italics: true })],
      alignment: AlignmentType.LEFT,
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5in margins, in twips
          },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}