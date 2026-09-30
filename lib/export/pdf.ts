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

    lineItems: {
      description: string;
      hours: any;
      total: any;
    }[];
  }[];
};

export function generateInvoicePdf(
  invoice: InvoiceWithRelations
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: invoice.fromName,
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ==================================================
    // PAGE SETTINGS
    // ==================================================

    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;

    const LEFT = 62;
    const RIGHT = 62;

    const CONTENT_RIGHT = PAGE_WIDTH - RIGHT;
    const CONTENT_WIDTH = CONTENT_RIGHT - LEFT;

    // ==================================================
    // COLORS
    // ==================================================

    const NAVY = "#243F70";
    const BLACK = "#111111";
    const DARK_GREY = "#444444";
    const GREY = "#808080";
    const LIGHT_GREY = "#D8D8D8";

    // ==================================================
    // FORMATTERS
    // ==================================================

    const sym = currencySymbol(invoice.currency);

    const money = (value: any) =>
      `${sym}${Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;

    const formatHours = (value: any) =>
      Number(value).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });

    const date = new Date(invoice.invoiceDate).toLocaleDateString(
      "en-GB"
    );

    // ==================================================
    // HELPERS
    // ==================================================

    const drawLine = (
      y: number,
      color: string = NAVY,
      width: number = 0.7
    ) => {
      doc
        .moveTo(LEFT, y)
        .lineTo(CONTENT_RIGHT, y)
        .strokeColor(color)
        .lineWidth(width)
        .stroke();
    };

    const drawSectionTitle = (
      title: string,
      y: number
    ) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(NAVY)
        .text(title, LEFT, y);
    };

    // ==================================================
    // TABLE COLUMNS
    // ==================================================

    const DESC_X = LEFT;

    const HOURS_X = 350;
    const HOURS_WIDTH = 55;

    const TOTAL_X = 445;
    const TOTAL_WIDTH = CONTENT_RIGHT - TOTAL_X;

    const DESC_WIDTH = HOURS_X - DESC_X - 25;

    // ==================================================
    // HEADER
    // ==================================================

    let y = 38;

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(NAVY)
      .text("INVOICE SUMMARY", LEFT, y);

    y += 23;

    // Period + rate

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(DARK_GREY)
      .text(
        `${invoice.periodLabel}  ·  Rate ${sym}${Number(
          invoice.rate
        ).toFixed(0)}/hr`,
        LEFT,
        y
      );

    y += 15;

    drawLine(y, NAVY, 0.8);

    // ==================================================
    // BILLING INFORMATION
    // ==================================================

    y += 11;

    const INFO_FONT_SIZE = 8.5;

    // --------------------------------------------------
    // BILLED TO
    // --------------------------------------------------

    const BILL_X = LEFT;

    doc
      .font("Helvetica")
      .fontSize(INFO_FONT_SIZE)
      .fillColor(DARK_GREY)
      .text("Billed To:", BILL_X, y, {
        continued: true,
      })
      .font("Helvetica-Bold")
      .fillColor(BLACK)
      .text(` ${invoice.billedTo}`);

    // --------------------------------------------------
    // FROM
    // --------------------------------------------------

    const FROM_X = 280;

    doc
      .font("Helvetica")
      .fontSize(INFO_FONT_SIZE)
      .fillColor(DARK_GREY)
      .text("From:", FROM_X, y, {
        continued: true,
      })
      .font("Helvetica-Bold")
      .fillColor(BLACK)
      .text(` ${invoice.fromName}`);

    // --------------------------------------------------
    // DATE
    // --------------------------------------------------

    const DATE_X = 440;
    const DATE_LABEL_WIDTH = 25;
    const DATE_VALUE_X = DATE_X + DATE_LABEL_WIDTH;

    const DATE_VALUE_WIDTH =
      CONTENT_RIGHT - DATE_VALUE_X;

    doc
      .font("Helvetica")
      .fontSize(INFO_FONT_SIZE)
      .fillColor(DARK_GREY)
      .text("Date:", DATE_X, y);

    doc
      .font("Helvetica-Bold")
      .fontSize(INFO_FONT_SIZE)
      .fillColor(BLACK)
      .text(date, DATE_VALUE_X, y, {
        width: DATE_VALUE_WIDTH,
        align: "right",
      });

    y += 24;

    // ==================================================
    // CATEGORY TABLES
    // ==================================================

    invoice.categories.forEach(
      (category, categoryIndex) => {
        // ----------------------------------------------
        // DIVIDER BETWEEN CATEGORIES
        // ----------------------------------------------

        if (categoryIndex > 0) {
          y += 8;

          drawLine(y, LIGHT_GREY, 0.7);

          y += 13;
        }

        // ----------------------------------------------
        // CATEGORY TITLE
        // ----------------------------------------------

        drawSectionTitle(category.name, y);

        y += 16;

        // ----------------------------------------------
        // TABLE HEADER
        // ----------------------------------------------

        doc
          .font("Helvetica-Bold")
          .fontSize(7.2)
          .fillColor(GREY);

        doc.text(
          category.name.toLowerCase() === "graphics"
            ? "Projects"
            : "Project Name",
          DESC_X,
          y
        );

        doc.text("Hours", HOURS_X, y, {
          width: HOURS_WIDTH,
          align: "right",
        });

        doc.text("Total", TOTAL_X, y, {
          width: TOTAL_WIDTH,
          align: "right",
        });

        y += 12;

        drawLine(y, NAVY, 0.65);

        y += 6;

        // ==============================================
        // LINE ITEMS
        // ==============================================

        for (const item of category.lineItems) {
          const descriptionHeight =
            doc.heightOfString(item.description, {
              width: DESC_WIDTH,
            });

          const rowHeight = Math.max(
            14,
            descriptionHeight + 4
          );

          // Description

          doc
            .font("Helvetica")
            .fontSize(8.6)
            .fillColor(BLACK)
            .text(item.description, DESC_X, y, {
              width: DESC_WIDTH,
            });

          // Hours

          doc
            .font("Helvetica")
            .fontSize(8.6)
            .fillColor(BLACK)
            .text(
              formatHours(item.hours),
              HOURS_X,
              y,
              {
                width: HOURS_WIDTH,
                align: "right",
              }
            );

          // Total

          doc
            .font("Helvetica")
            .fontSize(8.6)
            .fillColor(BLACK)
            .text(
              money(item.total),
              TOTAL_X,
              y,
              {
                width: TOTAL_WIDTH,
                align: "right",
              }
            );

          y += rowHeight;
        }

        // ==============================================
        // CATEGORY SUBTOTAL
        // ==============================================

        y += 3;

        drawLine(y, NAVY, 0.65);

        y += 8;

        doc
          .font("Helvetica-Bold")
          .fontSize(8.7)
          .fillColor(BLACK);

        doc.text(
          `${category.name} Subtotal`,
          DESC_X,
          y
        );

        doc.text(
          formatHours(category.subtotalHours),
          HOURS_X,
          y,
          {
            width: HOURS_WIDTH,
            align: "right",
          }
        );

        doc.text(
          money(category.subtotalAmount),
          TOTAL_X,
          y,
          {
            width: TOTAL_WIDTH,
            align: "right",
          }
        );

        y += 14;
      }
    );

    // ==================================================
    // GRAND TOTAL
    // ==================================================

    y += 4;

    const GRAND_TOTAL_HEIGHT = 19;

    doc
      .rect(
        LEFT,
        y,
        CONTENT_WIDTH,
        GRAND_TOTAL_HEIGHT
      )
      .fill(NAVY);

    // Label

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#FFFFFF")
      .text(
        "GRAND TOTAL",
        LEFT + 3,
        y + 5
      );

    // Total hours

    doc.text(
      formatHours(invoice.totalHours),
      HOURS_X,
      y + 5,
      {
        width: HOURS_WIDTH,
        align: "right",
      }
    );

    // Total amount

    doc.text(
      money(invoice.totalAmount),
      TOTAL_X,
      y + 5,
      {
        width: TOTAL_WIDTH,
        align: "right",
      }
    );

    y += GRAND_TOTAL_HEIGHT + 14;

    // ==================================================
    // BANK DETAILS
    // ==================================================

    drawLine(y, LIGHT_GREY, 0.7);

    y += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(NAVY)
      .text("BANK DETAILS", LEFT, y);

    y += 18;

    // Three-column bank layout

    const BANK_COL_1 = LEFT;
    const BANK_COL_2 = 200;
    const BANK_COL_3 = 330;

    const BANK_WIDTH_1 = 120;
    const BANK_WIDTH_2 = 110;
    const BANK_WIDTH_3 =
      CONTENT_RIGHT - BANK_COL_3;

    const drawBankField = (
      label: string,
      value: string | null,
      x: number,
      yPosition: number,
      width: number
    ) => {
      if (!value) return;

      // Label

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(GREY)
        .text(label, x, yPosition, {
          width,
        });

      // Value

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(BLACK)
        .text(value, x, yPosition + 13, {
          width,
        });
    };

    // --------------------------------------------------
    // BANK ROW 1
    // --------------------------------------------------

    drawBankField(
      "Account Title",
      invoice.bankAccountTitle,
      BANK_COL_1,
      y,
      BANK_WIDTH_1
    );

    drawBankField(
      "Swift Code",
      invoice.bankSwiftCode,
      BANK_COL_2,
      y,
      BANK_WIDTH_2
    );

    drawBankField(
      "IBAN",
      invoice.bankIban,
      BANK_COL_3,
      y,
      BANK_WIDTH_3
    );

    y += 38;

    // --------------------------------------------------
    // BANK ROW 2
    // --------------------------------------------------

    drawBankField(
      "Bank Name",
      invoice.bankName,
      BANK_COL_1,
      y,
      BANK_WIDTH_1
    );

    drawBankField(
      "Branch Code",
      invoice.bankBranchCode,
      BANK_COL_2,
      y,
      BANK_WIDTH_2
    );

    drawBankField(
      "Account Number",
      invoice.bankAccountNumber,
      BANK_COL_3,
      y,
      BANK_WIDTH_3
    );

    // ==================================================
    // FOOTER NOTE
    // ==================================================

    if (invoice.footerNote) {
      y += 45;

      if (y < PAGE_HEIGHT - 50) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(8)
          .fillColor(GREY)
          .text(
            invoice.footerNote,
            LEFT,
            y,
            {
              width: CONTENT_WIDTH,
            }
          );
      }
    }

    // ==================================================
    // FINISH
    // ==================================================

    doc.end();
  });
}