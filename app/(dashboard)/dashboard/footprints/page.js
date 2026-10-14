"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── Action badge styling (Refined Swiss / Stripe palette) ───────
const ACTION_BADGES = {
  PAYMENT_CONFIRMED: {
    label: "Payment Confirmed",
    style: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60",
    dot: "bg-emerald-400",
  },
  PAYMENT_INIT: {
    label: "Payment Initiated",
    style: "bg-amber-950/40 text-amber-300 border-amber-800/60",
    dot: "bg-amber-400",
  },
  PAYMENT_FAILED: {
    label: "Payment Failed",
    style: "bg-rose-950/40 text-rose-300 border-rose-800/60",
    dot: "bg-rose-400",
  },
  ORDER_DISPATCHED: {
    label: "Order Dispatched",
    style: "bg-blue-950/40 text-blue-300 border-blue-800/60",
    dot: "bg-blue-400",
  },
  ORDER_CREATED: {
    label: "Order Created",
    style: "bg-zinc-800 text-zinc-200 border-zinc-700",
    dot: "bg-zinc-400",
  },
  PRODUCT_CREATED: {
    label: "Product Created",
    style: "bg-teal-950/40 text-teal-300 border-teal-800/60",
    dot: "bg-teal-400",
  },
  PRODUCT_UPDATED: {
    label: "Product Updated",
    style: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dot: "bg-zinc-400",
  },
  PRODUCT_DELETED: {
    label: "Product Deleted",
    style: "bg-rose-950/40 text-rose-300 border-rose-800/60",
    dot: "bg-rose-400",
  },
  STOCK_CHECKIN: {
    label: "Stock Received",
    style: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60",
    dot: "bg-emerald-400",
  },
  BULK_IMPORT: {
    label: "Bulk Import",
    style: "bg-indigo-950/40 text-indigo-300 border-indigo-800/60",
    dot: "bg-indigo-400",
  },
  SETTINGS_UPDATED: {
    label: "Settings Updated",
    style: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dot: "bg-zinc-400",
  },
  COURIER_CONFIGURED: {
    label: "Courier Configured",
    style: "bg-amber-950/40 text-amber-300 border-amber-800/60",
    dot: "bg-amber-400",
  },
  USER_LOGIN: {
    label: "User Sign-in",
    style: "bg-zinc-800 text-zinc-400 border-zinc-700/60",
    dot: "bg-zinc-500",
  },
};

function getBadgeProps(actionType) {
  const norm = (actionType || "GENERIC").toUpperCase();
  if (ACTION_BADGES[norm]) return ACTION_BADGES[norm];
  if (norm.includes("CREATE")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-teal-950/40 text-teal-300 border-teal-800/60",
      dot: "bg-teal-400",
    };
  }
  if (norm.includes("DELETE") || norm.includes("FAIL")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-rose-950/40 text-rose-300 border-rose-800/60",
      dot: "bg-rose-400",
    };
  }
  if (norm.includes("PAYMENT")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60",
      dot: "bg-emerald-400",
    };
  }
  return {
    label: norm.replace(/_/g, " "),
    style: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dot: "bg-zinc-400",
  };
}

export default function TenantFootprintsPage() {
  const { businessId, businessName, loading: ctxLoading } =
    useBusinessContext();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Fetch Activity Logs for Current Tenant ───────────────────
  async function fetchFootprints() {
    if (!businessId) {
      setLogs([]);
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
        .limit(100);

      if (!error && data) {
        setLogs(data);
      } else if (error) {
        console.warn("Audit log fetch note:", error.message);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Audit log fetch error:", err);
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

  // ── Filtered & Searched Logs ─────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (categoryFilter !== "ALL") {
        const action = (log.action_type || "").toUpperCase();
        if (categoryFilter === "PAYMENTS" && !action.includes("PAYMENT")) return false;
        if (categoryFilter === "ORDERS" && !action.includes("ORDER") && !action.includes("DISPATCH")) return false;
        if (categoryFilter === "CATALOG" && !action.includes("PRODUCT") && !action.includes("STOCK") && !action.includes("IMPORT")) return false;
        if (categoryFilter === "SECURITY" && !action.includes("SETTINGS") && !action.includes("LOGIN") && !action.includes("TASK")) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const actionMatch = (log.action_type || "").toLowerCase().includes(q);
        const descMatch = (log.description || log.details || "").toLowerCase().includes(q);
        const ipMatch = (log.ip_address || "").toLowerCase().includes(q);
        const userMatch = (log.user_email || "").toLowerCase().includes(q);
        if (!actionMatch && !descMatch && !ipMatch && !userMatch) return false;
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
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <p className="text-xs font-mono text-zinc-400">
            Loading audit records…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-white pb-24">
      {/* ── TOP HEADER (Swiss Minimalist Bar) ───────────────────── */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3.5 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition"
              title="Return to Dashboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <span>{businessName || "Workspace"}</span>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-300">Compliance &amp; Security</span>
              </div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
                Audit Trail &amp; Activity Log
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition disabled:opacity-40"
              title="Export filtered records as CSV"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchFootprints}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition disabled:opacity-50"
              title="Refresh audit trail"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 pt-8 space-y-6">
        {/* ── METRIC TILES ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">Total Audit Events</div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {metrics.total}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Recorded in workspace history
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">Billing &amp; Payments</div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {metrics.paymentLogs}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Checkout &amp; subscription events
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">Fulfillment Dispatches</div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {metrics.dispatchLogs}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Courier consignment dispatches
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">Origin Network IPs</div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {metrics.uniqueIps}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Distinct client IP addresses
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
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
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  categoryFilter === id
                    ? "bg-zinc-100 text-zinc-900 font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
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
              className="w-full sm:w-64 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 pl-8 text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:border-zinc-600 focus:outline-none transition"
            />
            <svg
              className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2 pointer-events-none"
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
                className="absolute right-2.5 top-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── AUDIT LOG TABLE ────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>RECORDED EVENTS ({filteredLogs.length})</span>
            </div>
            {lastRefreshed && (
              <span className="text-[11px] text-zinc-500">
                Last checked: {lastRefreshed}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-zinc-800/80 text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Event Type</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold font-mono">Origin IP</th>
                  <th className="px-5 py-3 font-semibold">User Agent</th>
                  <th className="px-5 py-3 font-semibold text-right font-mono">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-transparent">
                {filteredLogs.map((log) => {
                  const badge = getBadgeProps(log.action_type);
                  const isExpanded = expandedLogId === log.id;
                  const description = log.description || log.details || "–";
                  const hasMetadata =
                    log.metadata &&
                    typeof log.metadata === "object" &&
                    Object.keys(log.metadata).length > 0;

                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        <div>
                          {new Date(log.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-zinc-600">
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
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.style}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3.5 text-zinc-200 max-w-md">
                        <div className="line-clamp-2 leading-relaxed text-xs">
                          {description}
                        </div>
                        {isExpanded && hasMetadata && (
                          <div className="mt-2.5 p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
                          {log.ip_address || "127.0.0.1"}
                        </span>
                      </td>

                      {/* User Agent */}
                      <td className="px-5 py-3.5 text-zinc-400 text-[11px] max-w-xs truncate" title={log.user_agent}>
                        {log.user_agent ? (
                          log.user_agent.includes("Mozilla") ? (
                            <span>Web Client</span>
                          ) : (
                            log.user_agent
                          )
                        ) : (
                          "–"
                        )}
                      </td>

                      {/* Payload Toggle */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono">
                        {hasMetadata ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                          >
                            {isExpanded ? "Hide" : "Inspect"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-600">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-xs text-zinc-400 font-mono">
                      No activity logs match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
