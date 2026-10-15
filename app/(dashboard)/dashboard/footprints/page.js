"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── Action badge styling (Swiss-Industrial Trust Palette) ───────
const ACTION_BADGES = {
  PAYMENT_CONFIRMED: {
    label: "Payment Confirmed",
    style: "bg-emerald-950/40 text-emerald-300 border-emerald-800/80",
    dot: "bg-emerald-400",
  },
  PAYMENT_INIT: {
    label: "Payment Initiated",
    style: "bg-amber-950/40 text-amber-300 border-amber-800/80",
    dot: "bg-amber-400",
  },
  PAYMENT_FAILED: {
    label: "Payment Failed",
    style: "bg-rose-950/40 text-rose-300 border-rose-800/80",
    dot: "bg-rose-400",
  },
  ORDER_DISPATCHED: {
    label: "Order Dispatched",
    style: "bg-orange-950/40 text-orange-300 border-orange-800/80",
    dot: "bg-orange-400",
  },
  ORDER_CREATED: {
    label: "Order Created",
    style: "bg-blue-950/40 text-blue-300 border-blue-800/80",
    dot: "bg-blue-400",
  },
  PRODUCT_CREATED: {
    label: "Product Created",
    style: "bg-teal-950/40 text-teal-300 border-teal-800/80",
    dot: "bg-teal-400",
  },
  PRODUCT_UPDATED: {
    label: "Product Updated",
    style: "bg-slate-800 text-slate-300 border-slate-700",
    dot: "bg-slate-400",
  },
  PRODUCT_DELETED: {
    label: "Product Deleted",
    style: "bg-rose-950/40 text-rose-300 border-rose-800/80",
    dot: "bg-rose-400",
  },
  STOCK_CHECKIN: {
    label: "Stock Received",
    style: "bg-emerald-950/40 text-emerald-300 border-emerald-800/80",
    dot: "bg-emerald-400",
  },
  BULK_IMPORT: {
    label: "Bulk Import",
    style: "bg-teal-950/40 text-teal-300 border-teal-800/80",
    dot: "bg-teal-400",
  },
  SETTINGS_UPDATED: {
    label: "Settings Updated",
    style: "bg-slate-800 text-slate-300 border-slate-700",
    dot: "bg-slate-400",
  },
  COURIER_CONFIGURED: {
    label: "Courier Configured",
    style: "bg-amber-950/40 text-amber-300 border-amber-800/80",
    dot: "bg-amber-400",
  },
  USER_LOGIN: {
    label: "User Sign-in",
    style: "bg-slate-800 text-slate-400 border-slate-700",
    dot: "bg-slate-500",
  },
};

function getBadgeProps(actionType) {
  const norm = (actionType || "GENERIC").toUpperCase();
  if (ACTION_BADGES[norm]) return ACTION_BADGES[norm];
  if (norm.includes("CREATE")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-teal-950/40 text-teal-300 border-teal-800/80",
      dot: "bg-teal-400",
    };
  }
  if (norm.includes("DELETE") || norm.includes("FAIL")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-rose-950/40 text-rose-300 border-rose-800/80",
      dot: "bg-rose-400",
    };
  }
  if (norm.includes("PAYMENT")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-emerald-950/40 text-emerald-300 border-emerald-800/80",
      dot: "bg-emerald-400",
    };
  }
  return {
    label: norm.replace(/_/g, " "),
    style: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  };
}

export default function AuditFootprintsPage() {
  const { businessId, businessName, loading: ctxLoading } =
    useBusinessContext();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Fetch Footprints ─────────────────────────────────────────
  async function fetchFootprints() {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.warn("Footprint fetch warning:", error.message);
      } else {
        setLogs(data || []);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Unexpected footprint fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!ctxLoading && businessId) {
      fetchFootprints();
    }
  }, [businessId, ctxLoading]);

  // ── Filtered Logs Computation ────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const action = (log.action_type || "").toUpperCase();

      // Category tab filtering
      if (categoryFilter === "PAYMENTS" && !action.includes("PAYMENT")) {
        return false;
      }
      if (
        categoryFilter === "ORDERS" &&
        !action.includes("ORDER") &&
        !action.includes("DISPATCH")
      ) {
        return false;
      }
      if (
        categoryFilter === "CATALOG" &&
        !action.includes("PRODUCT") &&
        !action.includes("STOCK") &&
        !action.includes("BULK")
      ) {
        return false;
      }
      if (
        categoryFilter === "SECURITY" &&
        !action.includes("LOGIN") &&
        !action.includes("SETTINGS") &&
        !action.includes("AUTH")
      ) {
        return false;
      }

      // Free text search (action_type, description, ip, user_agent)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = action.toLowerCase().includes(q);
        const matchDesc = (log.description || log.details || "")
          .toLowerCase()
          .includes(q);
        const matchIp = (log.ip_address || "").toLowerCase().includes(q);
        const matchUa = (log.user_agent || "").toLowerCase().includes(q);

        if (!matchAction && !matchDesc && !matchIp && !matchUa) {
          return false;
        }
      }

      return true;
    });
  }, [logs, categoryFilter, searchQuery]);

  // ── KPI Metrics ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = logs.length;
    const paymentLogs = logs.filter((l) => (l.action_type || "").includes("PAYMENT")).length;
    const dispatchLogs = logs.filter((l) => (l.action_type || "").includes("DISPATCH") || (l.action_type || "").includes("ORDER")).length;
    const uniqueIps = new Set(logs.map((l) => l.ip_address).filter(Boolean)).size;

    return { total, paymentLogs, dispatchLogs, uniqueIps };
  }, [logs]);

  // ── Export CSV Handler ───────────────────────────────────────
  function handleExportCsv() {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Action Type", "Description", "IP Address", "User Agent"];
    const rows = filteredLogs.map((l) => [
      new Date(l.created_at).toISOString(),
      `"${l.action_type || ""}"`,
      `"${(l.description || l.details || "").replace(/"/g, '""')}"`,
      `"${l.ip_address || "127.0.0.1"}"`,
      `"${(l.user_agent || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `audit_trail_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#0b1120] text-[#fafafa] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs font-mono text-slate-400">
            Loading cryptographic audit records…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-[#fafafa] pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── TOP HEADER SECTION ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#1e293b]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span className="font-semibold text-slate-200">{businessName || "Workspace"}</span>
              <span className="text-slate-600">/</span>
              <span className="text-orange-500 font-semibold">Security &amp; Audit Logs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fafafa]">
              Activity Footprints &amp; Audit Trail
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable telemetry tracking user operations, transactions, and system mutations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#131d31] px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-xs hover:bg-[#1e293b] hover:text-[#fafafa] btn-tactile transition disabled:opacity-40"
              title="Export filtered records as CSV"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchFootprints}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-[#1e293b] bg-[#131d31] text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] btn-tactile transition shadow-xs disabled:opacity-50"
              title="Refresh audit trail"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-400" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── METRIC TILES ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Total Audit Events
              </span>
              <span className="p-1.5 rounded-lg bg-orange-950/60 border border-orange-800/80 text-orange-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-orange-400 tracking-tight font-mono">
              {metrics.total}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Recorded in workspace history
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Billing &amp; Payments
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight font-mono">
              {metrics.paymentLogs}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Checkout &amp; subscription events
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Dispatches &amp; Orders
              </span>
              <span className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-800/80 text-teal-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1m-6 0a1 1 0 11-2 0 1 1 0 012 0zm10 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-teal-400 tracking-tight font-mono">
              {metrics.dispatchLogs}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Courier consignment dispatches
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Client Network IPs
              </span>
              <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-3-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-3 3-3m-9 9a9 9 0 019-9" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight font-mono">
              {metrics.uniqueIps}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Distinct client IP origins
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Events" },
              { id: "PAYMENTS", label: "Billing & Plans" },
              { id: "ORDERS", label: "Orders & Dispatches" },
              { id: "CATALOG", label: "Catalog & Stock" },
              { id: "SECURITY", label: "Security & Settings" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold btn-tactile transition ${
                  categoryFilter === id
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, action, keyword…"
              className="w-full sm:w-64 rounded-xl border border-[#1e293b] bg-[#0b1120] px-3 py-1.5 pl-8 text-xs text-[#fafafa] placeholder-slate-500 font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── AUDIT LOG TABLE ────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1e293b] flex items-center justify-between text-xs font-mono text-slate-400 bg-[#0b1120]/80">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-200">RECORDED EVENTS ({filteredLogs.length})</span>
            </div>
            {lastRefreshed && (
              <span className="text-[11px] text-slate-500">
                Last checked: {lastRefreshed}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-[#1e293b] text-left text-xs">
              <thead className="bg-[#0b1120] text-slate-400 uppercase text-[10px] font-mono tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3 font-bold">Timestamp</th>
                  <th className="px-5 py-3 font-bold">Event Type</th>
                  <th className="px-5 py-3 font-bold">Description</th>
                  <th className="px-5 py-3 font-bold font-mono">Origin IP</th>
                  <th className="px-5 py-3 font-bold">User Agent</th>
                  <th className="px-5 py-3 font-bold text-right font-mono">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] bg-[#131d31]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-slate-500 font-mono">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const badge = getBadgeProps(log.action_type);
                    const isExpanded = expandedLogId === log.id;
                    const description = log.description || log.details || "–";
                    const hasMetadata =
                      log.metadata &&
                      typeof log.metadata === "object" &&
                      Object.keys(log.metadata).length > 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                          <div>
                            {new Date(log.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(log.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Action Type Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.style}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-3.5 text-[#fafafa] max-w-md">
                          <div className="line-clamp-2 leading-relaxed text-xs">
                            {description}
                          </div>
                          {isExpanded && hasMetadata && (
                            <div className="mt-2.5 p-3 rounded-xl bg-[#0b1120] border border-[#1e293b] font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner">
                              <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                          {log.ip_address || "127.0.0.1"}
                        </td>

                        {/* User Agent */}
                        <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate text-[11px] font-mono">
                          {log.user_agent || "Direct API Agent"}
                        </td>

                        {/* Actions / Metadata */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {hasMetadata ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLogId(isExpanded ? null : log.id)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1e293b] bg-slate-800 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 btn-tactile transition shadow-xs"
                            >
                              {isExpanded ? "Hide JSON" : "View JSON"}
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px] font-mono">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
