"use client";

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "@/lib/useTheme";

type Analytics = {
  totalInvoices: number;
  totalEarned: number;
  totalHours: number;
  monthly: { month: string; hours: number; amount: number }[];
  clients: { client: string; hours: number; amount: number }[];
};

const CHART_COLORS = {
  light: { grid: "#F0EFEB", axis: "#9B9A96", line: "#2F2E2B", bar: "#D9C2F0" },
  dark: { grid: "#2A2A2A", axis: "#6F6E69", line: "#E9E9E7", bar: "#7B5C99" },
};

export default function AnalyticsDashboard({ data }: { data: Analytics }) {
  const theme = useTheme();
  const colors = CHART_COLORS[theme];
  return (
    <div className="container">
      <div className="breadcrumb">Invoices / Analytics</div>
      <h1 className="page-title" style={{ marginBottom: 22 }}>
        Analytics
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Earned (Finalized)" value={`$${data.totalEarned.toFixed(2)}`} />
        <StatCard label="Total Hours (Finalized)" value={String(data.totalHours)} />
        <StatCard label="Finalized Invoices" value={String(data.totalInvoices)} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontWeight: 500, fontSize: 14 }}>Monthly Earnings</h3>
        {data.monthly.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="month" fontSize={12} stroke={colors.axis} />
              <YAxis fontSize={12} stroke={colors.axis} />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke={colors.line} strokeWidth={2} name="Earnings" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontWeight: 500, fontSize: 14 }}>Hours Over Time</h3>
        {data.monthly.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="month" fontSize={12} stroke={colors.axis} />
              <YAxis fontSize={12} stroke={colors.axis} />
              <Tooltip />
              <Bar dataKey="hours" fill={colors.bar} radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontWeight: 500, fontSize: 14 }}>Top Clients</h3>
        {data.clients.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No data yet.</p>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Hours</th>
                <th>Earned</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <tr key={c.client}>
                  <td>{c.client}</td>
                  <td>{c.hours}</td>
                  <td>${c.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 30, marginTop: 4 }}>{value}</div>
    </div>
  );
}
