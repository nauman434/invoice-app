"use client";

import { X } from "lucide-react";
import { currencySymbol } from "@/lib/types";

type PreviewCategory = {
  name: string;
  items: { description: string; hours: number; total: number }[];
  subtotalHours: number;
  subtotalAmount: number;
};

export type InvoicePreviewData = {
  periodLabel: string;
  billedTo: string;
  fromName: string;
  invoiceDate: string;
  currency: string;
  rate: number;
  footerNote: string;
  bankAccountTitle: string;
  bankSwiftCode: string;
  bankIban: string;
  bankName: string;
  bankBranchCode: string;
  bankAccountNumber: string;
  categories: PreviewCategory[];
  grandHours: number;
  grandAmount: number;
};

export default function InvoicePreviewModal({ data, onClose }: { data: InvoicePreviewData; onClose: () => void }) {
  const sym = currencySymbol(data.currency);
  const bankLines: [string, string][] = [
    ["Account Title", data.bankAccountTitle],
    ["Swift Code", data.bankSwiftCode],
    ["IBAN", data.bankIban],
    ["Bank Name", data.bankName],
    ["Branch Code", data.bankBranchCode],
    ["Account Number", data.bankAccountNumber],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-shell" onClick={(e) => e.stopPropagation()}>
        <div className="preview-toolbar">
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Preview — matches your PDF/DOCX export</span>
          <button onClick={onClose} className="btn secondary" style={{ padding: "5px 10px" }}>
            <X size={14} /> Close
          </button>
        </div>
        <div className="preview-scroll">
          <div className="paper">
            <div style={{ fontSize: 22, fontWeight: 700 }}>INVOICE SUMMARY</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
              {data.periodLabel || "—"} &nbsp;·&nbsp; Rate {sym}
              {data.rate.toFixed(2)}/hr
            </div>
            <div style={{ fontSize: 12, marginTop: 12, fontWeight: 700 }}>
              Billed To: <span style={{ fontWeight: 400 }}>{data.billedTo || "—"}</span> &nbsp;&nbsp; From:{" "}
              <span style={{ fontWeight: 400 }}>{data.fromName || "—"}</span> &nbsp;&nbsp; Date:{" "}
              <span style={{ fontWeight: 400 }}>
                {data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString("en-GB") : "—"}
              </span>
            </div>

            {data.categories.map((cat, ci) => (
              <div key={ci} style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{(cat.name || "Category").toUpperCase()}</div>
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Hours</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, ii) => (
                      <tr key={ii}>
                        <td>{item.description || "—"}</td>
                        <td>{item.hours}</td>
                        <td>
                          {sym}
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700 }}>
                      <td>{cat.name || "Category"} Subtotal</td>
                      <td>{cat.subtotalHours}</td>
                      <td>
                        {sym}
                        {cat.subtotalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            <div style={{ marginTop: 18, fontSize: 16, fontWeight: 700 }}>
              GRAND TOTAL &nbsp; {data.grandHours} hrs &nbsp;·&nbsp; {sym}
              {data.grandAmount.toFixed(2)}
            </div>

            {bankLines.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>BANK DETAILS</div>
                {bankLines.map(([label, value]) => (
                  <div key={label} style={{ fontSize: 12, fontWeight: 700 }}>
                    {label}: <span style={{ fontWeight: 400 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: 12, fontStyle: "italic", color: "#333" }}>
              {data.footerNote || "Thank you!"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
