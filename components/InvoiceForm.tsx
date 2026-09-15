"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES, currencySymbol } from "@/lib/types";
import InvoicePreviewModal from "@/components/InvoicePreviewModal";

type LineItem = { id: string; description: string; hours: string; total: string; isManualTotal: boolean };
type Category = { id: string; name: string; items: LineItem[] };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyCategory(name = ""): Category {
  return { id: uid(), name, items: [emptyLineItem()] };
}
function emptyLineItem(): LineItem {
  return { id: uid(), description: "", hours: "", total: "", isManualTotal: false };
}

export type InvoiceFormInitial = {
  id?: string;
  invoiceNumber?: string;
  status?: "DRAFT" | "FINAL";
  periodLabel?: string;
  billedTo?: string;
  fromName?: string;
  invoiceDate?: string;
  currency?: string;
  rate?: number;
  footerNote?: string;
  bankAccountTitle?: string;
  bankSwiftCode?: string;
  bankIban?: string;
  bankName?: string;
  bankBranchCode?: string;
  bankAccountNumber?: string;
  categories?: { name: string; lineItems: { description: string; hours: number; total: number; isManualTotal: boolean }[] }[];
};

export default function InvoiceForm({ initial }: { initial?: InvoiceFormInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? "");
  const [status, setStatus] = useState<"DRAFT" | "FINAL">(initial?.status ?? "DRAFT");
  const [periodLabel, setPeriodLabel] = useState(initial?.periodLabel ?? "");
  const [billedTo, setBilledTo] = useState(initial?.billedTo ?? "");
  const [fromName, setFromName] = useState(initial?.fromName ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [rate, setRate] = useState(String(initial?.rate ?? "30"));
  const [footerNote, setFooterNote] = useState(initial?.footerNote ?? "Thank you!");

  const [bankAccountTitle, setBankAccountTitle] = useState(initial?.bankAccountTitle ?? "");
  const [bankSwiftCode, setBankSwiftCode] = useState(initial?.bankSwiftCode ?? "");
  const [bankIban, setBankIban] = useState(initial?.bankIban ?? "");
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [bankBranchCode, setBankBranchCode] = useState(initial?.bankBranchCode ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initial?.bankAccountNumber ?? "");

  const [categories, setCategories] = useState<Category[]>(
    initial?.categories?.length
      ? initial.categories.map((c) => ({
          id: uid(),
          name: c.name,
          items: c.lineItems.map((li) => ({
            id: uid(),
            description: li.description,
            hours: String(li.hours),
            total: String(li.total),
            isManualTotal: li.isManualTotal,
          })),
        }))
      : [emptyCategory("Emails")]
  );

  const [clientNames, setClientNames] = useState<string[]>([]);
  const [autofillNotice, setAutofillNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Load known client names for the datalist suggestion.
  useEffect(() => {
    fetch("/api/clients/autofill")
      .then((r) => r.json())
      .then((d) => setClientNames(d.names ?? []))
      .catch(() => {});
  }, []);

  // Suggest next invoice number for brand-new invoices only.
  useEffect(() => {
    if (!isEdit && !invoiceNumber) {
      fetch("/api/invoices")
        .then(() => {}) // no-op, number generated server-side on save if left blank
        .catch(() => {});
    }
  }, []);

  const sym = currencySymbol(currency);

  async function handleClientBlur() {
    if (isEdit || !billedTo.trim()) return; // don't clobber data when editing an existing invoice
    const res = await fetch(`/api/clients/autofill?name=${encodeURIComponent(billedTo)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.lastInvoice) {
      setAutofillNotice("New client - starting fresh.");
      return;
    }
    const inv = data.lastInvoice;
    setRate(String(Number(inv.rate)));
    setCurrency(inv.currency);
    setBankAccountTitle(inv.bankAccountTitle ?? "");
    setBankSwiftCode(inv.bankSwiftCode ?? "");
    setBankIban(inv.bankIban ?? "");
    setBankName(inv.bankName ?? "");
    setBankBranchCode(inv.bankBranchCode ?? "");
    setBankAccountNumber(inv.bankAccountNumber ?? "");
    setCategories(
      inv.categories.map((c: any) => ({
        id: uid(),
        name: c.name,
        items: c.lineItems.map(() => emptyLineItem()), // fresh blank items, same category structure
      }))
    );
    setAutofillNotice(`Autofilled from ${billedTo}'s last invoice.`);
  }

  function updateCategory(catId: string, patch: Partial<Category>) {
    setCategories((cs) => cs.map((c) => (c.id === catId ? { ...c, ...patch } : c)));
  }
  function updateItem(catId: string, itemId: string, patch: Partial<LineItem>) {
    setCategories((cs) =>
      cs.map((c) =>
        c.id !== catId
          ? c
          : { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
      )
    );
  }
  function addCategory() {
    setCategories((cs) => [...cs, emptyCategory("")]);
  }
  function removeCategory(catId: string) {
    setCategories((cs) => cs.filter((c) => c.id !== catId));
  }
  function addItem(catId: string) {
    setCategories((cs) => cs.map((c) => (c.id === catId ? { ...c, items: [...c.items, emptyLineItem()] } : c)));
  }
  function removeItem(catId: string, itemId: string) {
    setCategories((cs) =>
      cs.map((c) => (c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c))
    );
  }

  function lineTotal(item: LineItem): number {
    if (item.isManualTotal) return Number(item.total) || 0;
    return Math.round((Number(item.hours) || 0) * (Number(rate) || 0) * 100) / 100;
  }

  const categoryTotals = useMemo(
    () =>
      categories.map((c) => {
        const hours = c.items.reduce((s, i) => s + (Number(i.hours) || 0), 0);
        const amount = c.items.reduce((s, i) => s + lineTotal(i), 0);
        return { hours, amount };
      }),
    [categories, rate]
  );
  const grandHours = categoryTotals.reduce((s, c) => s + c.hours, 0);
  const grandAmount = categoryTotals.reduce((s, c) => s + c.amount, 0);

  async function handleSave(saveStatus: "DRAFT" | "FINAL", andExport?: "pdf" | "docx") {
    setError("");
    if (!billedTo.trim() || !fromName.trim()) {
      setError("Billed To and From are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: initial?.id,
        invoiceNumber: invoiceNumber || undefined,
        status: saveStatus,
        periodLabel,
        billedTo,
        fromName,
        invoiceDate,
        currency,
        rate: Number(rate) || 0,
        footerNote,
        bankAccountTitle,
        bankSwiftCode,
        bankIban,
        bankName,
        bankBranchCode,
        bankAccountNumber,
        categories: categories.map((c) => ({
          name: c.name,
          lineItems: c.items
            .filter((i) => i.description.trim() || i.hours || i.total)
            .map((i) => ({
              description: i.description,
              hours: Number(i.hours) || 0,
              total: lineTotal(i),
              isManualTotal: i.isManualTotal,
            })),
        })),
      };

      const res = await fetch(isEdit ? `/api/invoices/${initial!.id}` : "/api/invoices", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setStatus(saveStatus);

      if (andExport) {
        window.open(`/api/invoices/${saved.id}/${andExport}`, "_blank");
      }
      router.push(`/invoices?tab=${saveStatus === "DRAFT" ? "draft" : "final"}`);
      router.refresh();
    } catch (e) {
      setError("Something went wrong saving the invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <div className="breadcrumb">Invoices / {isEdit ? "Edit" : "New"}</div>
      <h1 className="page-title" style={{ marginBottom: 20 }}>
        {isEdit ? "Edit invoice" : "New invoice"}
      </h1>

      <div className="card" style={{ marginBottom: 20 }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label className="label">Period Label</label>
            <input
              className="input"
              placeholder="e.g. Wellow · August 2026"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Invoice Number (optional, auto-generated if blank)</label>
            <input className="input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>

          <div>
            <label className="label">Billed To (Client)</label>
            <input
              className="input"
              list="client-names"
              value={billedTo}
              onChange={(e) => setBilledTo(e.target.value)}
              onBlur={handleClientBlur}
              placeholder="Client name"
            />
            <datalist id="client-names">
              {clientNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {autofillNotice && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{autofillNotice}</p>}
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>

          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rate / hr ({sym})</label>
              <input className="input" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {categories.map((cat, ci) => (
        <div className="card" key={cat.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <input
              className="input"
              style={{ fontWeight: 600, fontSize: 15, maxWidth: 300 }}
              placeholder="Category name (e.g. Emails, UI/UX)"
              value={cat.name}
              onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
            />
            {categories.length > 1 && (
              <button className="btn danger" onClick={() => removeCategory(cat.id)}>
                Remove Category
              </button>
            )}
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: "55%" }}>Description</th>
                <th>Hours</th>
                <th>Total ({sym})</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cat.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="input"
                      value={item.description}
                      onChange={(e) => updateItem(cat.id, item.id, { description: e.target.value })}
                    />
                  </td>
                  <td style={{ width: 100 }}>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={item.hours}
                      onChange={(e) => updateItem(cat.id, item.id, { hours: e.target.value })}
                    />
                  </td>
                  <td style={{ width: 140 }}>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={item.isManualTotal ? item.total : lineTotal(item).toFixed(2)}
                      onChange={(e) => updateItem(cat.id, item.id, { total: e.target.value, isManualTotal: true })}
                    />
                    {item.isManualTotal && (
                      <button
                        style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", padding: "2px 0" }}
                        onClick={() => updateItem(cat.id, item.id, { isManualTotal: false })}
                      >
                        reset to auto
                      </button>
                    )}
                  </td>
                  <td style={{ width: 40 }}>
                    <button className="btn danger" onClick={() => removeItem(cat.id, item.id)} title="Remove line">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="subtotal">
                <td>{cat.name || "Category"} Subtotal</td>
                <td>{categoryTotals[ci]?.hours ?? 0}</td>
                <td>
                  {sym}
                  {(categoryTotals[ci]?.amount ?? 0).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <button className="btn secondary" onClick={() => addItem(cat.id)}>
            + Add Line
          </button>
        </div>
      ))}

      <button className="btn secondary" onClick={addCategory} style={{ marginBottom: 20 }}>
        + Add Category
      </button>

      <div className="card" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 18 }}>GRAND TOTAL</strong>
        <strong style={{ fontSize: 18 }}>
          {grandHours} hrs &nbsp;·&nbsp; {sym}
          {grandAmount.toFixed(2)}
        </strong>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Bank Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label className="label">Account Title</label>
            <input className="input" value={bankAccountTitle} onChange={(e) => setBankAccountTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Swift Code</label>
            <input className="input" value={bankSwiftCode} onChange={(e) => setBankSwiftCode(e.target.value)} />
          </div>
          <div>
            <label className="label">IBAN</label>
            <input className="input" value={bankIban} onChange={(e) => setBankIban(e.target.value)} />
          </div>
          <div>
            <label className="label">Bank Name</label>
            <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div>
            <label className="label">Branch Code</label>
            <input className="input" value={bankBranchCode} onChange={(e) => setBankBranchCode(e.target.value)} />
          </div>
          <div>
            <label className="label">Account Number</label>
            <input className="input" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <label className="label">Footer Note</label>
        <input className="input" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} />
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Status: </strong>
            <span style={{ color: status === "DRAFT" ? "var(--text-muted)" : "var(--accent)" }}>
              {status === "DRAFT" ? "Draft (work in progress)" : "Finalized"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn secondary" onClick={() => setShowPreview(true)}>
          Preview
        </button>
        <button className="btn secondary" disabled={saving} onClick={() => handleSave("DRAFT")}>
          {saving ? "Saving..." : "Save Draft"}
        </button>
        <button className="btn" disabled={saving} onClick={() => handleSave("FINAL")}>
          {saving ? "Saving..." : "Finalize Invoice"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <button className="btn secondary" disabled={saving} onClick={() => handleSave("FINAL", "pdf")}>
          Finalize & Download PDF
        </button>
        <button className="btn secondary" disabled={saving} onClick={() => handleSave("FINAL", "docx")}>
          Finalize & Download DOCX
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 60 }}>
        Drafts are saved to your history but excluded from Analytics until finalized. Save as draft anytime while
        you're still building the invoice out over the month.
      </p>

      {showPreview && (
        <InvoicePreviewModal
          onClose={() => setShowPreview(false)}
          data={{
            periodLabel,
            billedTo,
            fromName,
            invoiceDate,
            currency,
            rate: Number(rate) || 0,
            footerNote,
            bankAccountTitle,
            bankSwiftCode,
            bankIban,
            bankName,
            bankBranchCode,
            bankAccountNumber,
            categories: categories.map((cat, ci) => ({
              name: cat.name,
              items: cat.items
                .filter((i) => i.description.trim() || i.hours || i.total)
                .map((i) => ({ description: i.description, hours: Number(i.hours) || 0, total: lineTotal(i) })),
              subtotalHours: categoryTotals[ci]?.hours ?? 0,
              subtotalAmount: categoryTotals[ci]?.amount ?? 0,
            })),
            grandHours,
            grandAmount,
          }}
        />
      )}
    </div>
  );
}
