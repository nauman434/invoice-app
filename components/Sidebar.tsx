"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { FileText, CheckSquare, Plus, BarChart3, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  if (pathname === "/login") return null;

  const onInvoicesPage = pathname === "/invoices";
  const tab = searchParams.get("tab");
  const draftsActive = onInvoicesPage && tab === "draft";
  const finalActive = onInvoicesPage && tab !== "draft";
  const newActive = pathname === "/invoices/new";
  const analyticsActive = pathname === "/analytics";

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">I</div>
        <span className="sidebar-brand-name">Invoice space</span>
      </div>
      <nav className="sidebar-nav">
        <Link href="/invoices?tab=draft" className={`sidebar-item${draftsActive ? " active" : ""}`}>
          <FileText size={15} strokeWidth={1.75} />
          <span>Drafts</span>
        </Link>
        <Link href="/invoices?tab=final" className={`sidebar-item${finalActive ? " active" : ""}`}>
          <CheckSquare size={15} strokeWidth={1.75} />
          <span>Finalized</span>
        </Link>
        <Link href="/invoices/new" className={`sidebar-item${newActive ? " active" : ""}`}>
          <Plus size={15} strokeWidth={1.75} />
          <span>New invoice</span>
        </Link>
        <Link href="/analytics" className={`sidebar-item${analyticsActive ? " active" : ""}`}>
          <BarChart3 size={15} strokeWidth={1.75} />
          <span>Analytics</span>
        </Link>
      </nav>
      {session && (
        <div className="sidebar-footer">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
