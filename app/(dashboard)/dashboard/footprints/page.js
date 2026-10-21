"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── Action badge styling (Warm Light Palette) ──────────────────
const ACTION_BADGES = {
  PAYMENT_CONFIRMED: {
    label: "Payment Confirmed",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  PAYMENT_INIT: {
    label: "Payment Initiated",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  PAYMENT_FAILED: {
    label: "Payment Failed",
    style: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  ORDER_DISPATCHED: {
    label: "Order Dispatched",
    style: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  ORDER_CREATED: {
    label: "Order Created",
    style: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  PRODUCT_CREATED: {
    label: "Product Created",
    style: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  PRODUCT_UPDATED: {
    label: "Product Updated",
    style: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
  PRODUCT_DELETED: {
    label: "Product Deleted",
    style: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  STOCK_CHECKIN: {
    label: "Stock Received",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  BULK_IMPORT: {
    label: "Bulk Import",
    style: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  SETTINGS_UPDATED: {
    label: "Settings Updated",
    style: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
  COURIER_CONFIGURED: {
    label: "Courier Configured",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  USER_LOGIN: {
    label: "User Sign-in",
    style: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

function getBadgeProps(actionType) {
  const norm = (actionType || "GENERIC").toUpperCase();
  if (ACTION_BADGES[norm]) return ACTION_BADGES[norm];
  if (norm.includes("CREATE")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-teal-50 text-teal-700 border-teal-200",
      dot: "bg-teal-500",
    };
  }
  if (norm.includes("DELETE") || norm.includes("FAIL")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    };
  }
  if (norm.includes("PAYMENT")) {
    return {
      label: norm.replace(/_/g, " "),
      style: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
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
        console.warn("Activity logs notice:", error.message);
        setLogs([]);
      } else {
        setLogs(data || []);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Footprints exception:", err);
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

  // ── Derived Metrics ──────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = logs.length;
    const paymentLogs = logs.filter((l) =>
      (l.action_type || "").toUpperCase().includes("PAYMENT")
    ).length;
    const dispatchLogs = logs.filter(
      (l) =>
        (l.action_type || "").toUpperCase().includes("ORDER") ||
        (l.action_type || "").toUpperCase().includes("DISPATCH")
    ).length;
    const uniqueIps = new Set(
      logs.map((l) => l.ip_address).filter(Boolean)
    ).size;

    return { total, paymentLogs, dispatchLogs, uniqueIps };
  }, [logs]);

  // ── Filtering Engine ─────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Category Filter
      if (categoryFilter === "PAYMENTS") {
        if (!log.action_type?.toUpperCase().includes("PAYMENT")) return false;
      } else if (categoryFilter === "ORDERS") {
        const a = log.action_type?.toUpperCase() || "";
        if (!a.includes("ORDER") && !a.includes("DISPATCH")) return false;
      } else if (categoryFilter === "CATALOG") {
        const a = log.action_type?.toUpperCase() || "";
        if (!a.includes("PRODUCT") && !a.includes("STOCK") && !a.includes("IMPORT"))
          return false;
      } else if (categoryFilter === "SECURITY") {
        const a = log.action_type?.toUpperCase() || "";
        if (
          !a.includes("USER") &&
          !a.includes("LOGIN") &&
          !a.includes("SETTINGS") &&
          !a.includes("COURIER")
        )
          return false;
      }

      // 2. Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = (log.action_type || "").toLowerCase().includes(q);
        const matchDesc = (log.description || log.details || "")
          .toLowerCase()
          .includes(q);
        const matchIp = (log.ip_address || "").toLowerCase().includes(q);
        if (!matchAction && !matchDesc && !matchIp) return false;
      }

      return true;
    });
  }, [logs, categoryFilter, searchQuery]);

  // ── Export CSV Handler ───────────────────────────────────────
  function handleExportCsv() {
    if (filteredLogs.length === 0) return;
    const headers = [
      "Timestamp",
      "Action Type",
      "Description",
      "IP Address",
      "User Agent",
    ];
    const rows = filteredLogs.map((l) => [
      `"${l.created_at}"`,
      `"${l.action_type}"`,
      `"${(l.description || l.details || "").replace(/"/g, '""')}"`,
      `"${l.ip_address || "N/A"}"`,
      `"${(l.user_agent || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `activity_footprints_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Loading security and audit activity logs…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        {/* ── TOP HEADER SECTION ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Activity Footprints &amp; Audit Trail
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent log of user operations, inventory changes, and system updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-40"
              title="Export filtered records as CSV"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchFootprints}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
              title="Refresh audit trail"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-600" : ""}`}
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
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-4">
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Total audit events
            </span>
            <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
              {metrics.total}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Recorded in workspace history
            </div>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Billing &amp; payments
            </span>
            <div className="text-xl font-semibold text-emerald-600 tracking-tight font-mono mt-1">
              {metrics.paymentLogs}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Checkout &amp; plan changes
            </div>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Dispatches &amp; orders
            </span>
            <div className="text-xl font-semibold text-teal-700 tracking-tight font-mono mt-1">
              {metrics.dispatchLogs}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Courier consignment dispatches
            </div>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Client network IPs
            </span>
            <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
              {metrics.uniqueIps}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Distinct client IP origins
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold btn-tactile transition ${
                  categoryFilter === id
                    ? "bg-orange-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
              className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none"
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
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── AUDIT LOG TABLE ────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-900">RECORDED EVENTS ({filteredLogs.length})</span>
            </div>
            {lastRefreshed && (
              <span className="text-[11px] text-slate-500">
                Last checked: {lastRefreshed}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-mono tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3 font-bold">Timestamp</th>
                  <th className="px-5 py-3 font-bold">Event Type</th>
                  <th className="px-5 py-3 font-bold">Description</th>
                  <th className="px-5 py-3 font-bold font-mono">Origin IP</th>
                  <th className="px-5 py-3 font-bold">User Agent</th>
                  <th className="px-5 py-3 font-bold text-right font-mono">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
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
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                          <div className="font-bold">
                            {new Date(log.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
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
                        <td className="px-5 py-3.5 text-slate-900 max-w-md">
                          <div className="line-clamp-2 leading-relaxed text-xs">
                            {description}
                          </div>
                          {isExpanded && hasMetadata && (
                            <div className="mt-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner">
                              <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                          {log.ip_address || "127.0.0.1"}
                        </td>

                        {/* User Agent */}
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate text-[11px] font-mono">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:text-orange-600 hover:border-orange-300 btn-tactile transition shadow-2xs"
                            >
                              {isExpanded ? "Hide JSON" : "View JSON"}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-mono">None</span>
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
