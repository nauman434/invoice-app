"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { currencySymbol, CURRENCIES } from "@/lib/types";

type Row = {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "FINAL";
  billedTo: string;
  invoiceDate: string;
  currency: string;
  totalHours: number;
  totalAmount: number;
};

export default function InvoiceHistoryList({
  invoices,
  filters,
  activeTab,
  draftCount,
  finalCount,
}: {
  invoices: Row[];
  filters: { client?: string; from?: string; to?: string; currency?: string };
  activeTab: "draft" | "final";
  draftCount: number;
  finalCount: number;
}) {
  const router = useRouter();
  const [client, setClient] = useState(filters.client ?? "");
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [currency, setCurrency] = useState(filters.currency ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);

  function buildParams(tab: "draft" | "final") {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (client) params.set("client", client);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (currency) params.set("currency", currency);
    return params;
  }

  function applyFilters() {
    router.push(`/invoices?${buildParams(activeTab).toString()}`);
  }

  function clearFilters() {
    setClient("");
    setFrom("");
    setTo("");
    setCurrency("");
    router.push(`/invoices?tab=${activeTab}`);
  }

  function switchTab(tab: "draft" | "final") {
    router.push(`/invoices?${buildParams(tab).toString()}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice? This can't be undone.")) return;
    setBusyId(id);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/invoices/${id}`);
    const inv = await res.json();
    const payload = {
      periodLabel: inv.periodLabel,
      billedTo: inv.billedTo,
      fromName: inv.fromName,
      invoiceDate: new Date().toISOString().slice(0, 10),
      currency: inv.currency,
      rate: Number(inv.rate),
      status: "DRAFT",
      footerNote: inv.footerNote,
      bankAccountTitle: inv.bankAccountTitle,
      bankSwiftCode: inv.bankSwiftCode,
      bankIban: inv.bankIban,
      bankName: inv.bankName,
      bankBranchCode: inv.bankBranchCode,
      bankAccountNumber: inv.bankAccountNumber,
      categories: inv.categories.map((c: any) => ({
        name: c.name,
        lineItems: c.lineItems.map((li: any) => ({
          description: li.description,
          hours: Number(li.hours),
          total: Number(li.total),
          isManualTotal: li.isManualTotal,
        })),
      })),
    };
    const created = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    setBusyId(null);
    router.push(`/invoices/${created.id}`);
  }

  return (
    <div className="container">
      <div className="breadcrumb">Invoices / {activeTab === "draft" ? "Drafts" : "Finalized"}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title">{activeTab === "draft" ? "Drafts" : "Finalized"}</h1>
        <Link href="/invoices/new" className="btn">
          + New
        </Link>
      </div>

      <div className="tabs">
        <button className={`tab${activeTab === "draft" ? " active" : ""}`} onClick={() => switchTab("draft")}>
          Drafts ({draftCount})
        </button>
        <button className={`tab${activeTab === "final" ? " active" : ""}`} onClick={() => switchTab("final")}>
          Finalized ({finalCount})
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontWeight: 500, fontSize: 14 }}>Filter</h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto", gap: 12, alignItems: "end" }}>
          <div>
            <label className="label">Client</label>
            <input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Search client..." />
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">All</option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={applyFilters}>
            Apply
          </button>
          <button className="btn secondary" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="card">
          <p>
            {activeTab === "draft" ? (
              <>No drafts in progress. <Link href="/invoices/new">Start one</Link>.</>
            ) : (
              <>No finalized invoices yet. <Link href="/invoices/new">Create your first one</Link>.</>
            )}
          </p>
        </div>
      ) : (
        <div className="card">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNumber}</td>
                  <td>{inv.billedTo}</td>
                  <td>{new Date(inv.invoiceDate).toLocaleDateString("en-GB")}</td>
                  <td>{inv.totalHours}</td>
                  <td>
                    {currencySymbol(inv.currency)}
                    {inv.totalAmount.toFixed(2)}
                  </td>
                  <td>
                    <span className={`pill${inv.status === "FINAL" ? " final" : ""}`}>
                      {inv.status === "FINAL" ? "Final" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn secondary" href={`/invoices/${inv.id}`}>
                        {inv.status === "DRAFT" ? "Continue" : "Edit"}
                      </Link>
                      <button className="btn secondary" disabled={busyId === inv.id} onClick={() => handleDuplicate(inv.id)}>
                        Duplicate
                      </button>
                      <a className="btn secondary" href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer">
                        PDF
                      </a>
                      <a className="btn secondary" href={`/api/invoices/${inv.id}/docx`} target="_blank" rel="noreferrer">
                        DOCX
                      </a>
                      <button className="btn danger" disabled={busyId === inv.id} onClick={() => handleDelete(inv.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
