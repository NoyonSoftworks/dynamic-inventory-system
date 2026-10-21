"use client";

import { useState } from "react";

function SearchIcon({ className = "w-3.5 h-3.5 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function RefreshIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5 text-emerald-600" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon({ className = "w-3.5 h-3.5 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5 text-rose-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function AdminNotificationsTab({
  notifications = [],
  loading = false,
  stats = {},
  onRefresh,
  onOpenSendModal,
  triggerToast,
}) {
  const [filterTab, setFilterTab] = useState("all"); // "all" | "read" | "unread" | "renewal" | "custom"
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const totalSent = notifications.length;
  const readCount = notifications.filter((n) => n.read).length;
  const unreadCount = totalSent - readCount;
  const readRate = totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0;

  // Filter list
  const filteredList = notifications.filter((n) => {
    if (filterTab === "read" && !n.read) return false;
    if (filterTab === "unread" && n.read) return false;
    if (filterTab === "renewal" && n.category !== "renewal") return false;
    if (filterTab === "custom" && n.category !== "custom") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = String(n.title || "").toLowerCase().includes(q);
      const matchMsg = String(n.message || "").toLowerCase().includes(q);
      const matchStore = String(n.store_name || "").toLowerCase().includes(q);
      const matchEmail = String(n.owner_email || "").toLowerCase().includes(q);
      const matchId = String(n.business_id || "").toLowerCase().includes(q);
      return matchTitle || matchMsg || matchStore || matchEmail || matchId;
    }

    return true;
  });

  async function handleDeleteNotification(notifId, tenantId) {
    if (!confirm("Are you sure you want to remove this notification from the store's inbox?")) {
      return;
    }
    setDeletingId(notifId);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          notificationId: notifId,
          tenantId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete notification.");
      }
      triggerToast("success", "Notification removed.");
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Error deleting notification.");
    } finally {
      setDeletingId(null);
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case "urgent":
      case "alert":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200 font-medium";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header & Actions ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#EA580C]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Store Notifications &amp; Read Receipts
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {totalSent} Sent Logs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track which merchants opened and read your announcements, send customized notifications by store code, or broadcast updates platform-wide.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            title="Refresh notification delivery status"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSendModal && onOpenSendModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Custom Notification</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total Delivered</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 font-mono">
            {totalSent}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-700">Read by Merchants</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-800 font-mono">
            {readCount}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-amber-700">Unread / Pending</div>
          <div className="mt-1 text-2xl font-semibold text-amber-800 font-mono">
            {unreadCount}
          </div>
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-blue-700">Read Rate</div>
          <div className="mt-1 text-2xl font-semibold text-blue-800 font-mono">
            {readRate}%
          </div>
        </div>
      </div>

      {/* ── Filters & Search ────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All Sent", count: totalSent },
            { id: "read", label: "Read", count: readCount },
            { id: "unread", label: "Unread", count: unreadCount },
            { id: "renewal", label: "Renewal Alerts", count: notifications.filter((n) => n.category === "renewal").length },
            { id: "custom", label: "Custom Messages", count: notifications.filter((n) => n.category === "custom").length },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search store, title, ID…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-orange-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* ── Sent Notifications & Read Receipts Table ────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px] font-mono">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Notification Title &amp; Content</th>
                <th className="px-4 py-3.5 font-semibold">Target Merchant Store</th>
                <th className="px-4 py-3.5 font-semibold">Category / Type</th>
                <th className="px-4 py-3.5 font-semibold">Sent Date</th>
                <th className="px-4 py-3.5 font-semibold">Read Status / Timestamp</th>
                <th className="px-4 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-sans">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400 text-xs font-sans">
                    No sent notifications found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((n) => {
                  const isDeleting = deletingId === n.id;
                  const storeCode = String(n.business_id || "").slice(0, 8);

                  return (
                    <tr key={`${n.business_id}-${n.id}`} className="hover:bg-slate-50/70 transition">
                      {/* Notification Title & Content */}
                      <td className="px-5 py-3.5 max-w-sm">
                        <div className="font-semibold text-slate-900 text-xs tracking-tight">
                          {n.title}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </td>

                      {/* Target Store */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs">
                          {n.store_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-slate-400">
                          <span>code: {storeCode}</span>
                          {n.owner_email && <span>· {n.owner_email}</span>}
                        </div>
                      </td>

                      {/* Category & Severity Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border capitalize ${getTypeBadge(n.type)}`}>
                            {n.type || "info"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                            {n.category || "custom"}
                          </span>
                        </div>
                      </td>

                      {/* Sent Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : "Recently"}
                      </td>

                      {/* Read Status & Receipt */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {n.read ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckIcon className="w-3 h-3 text-emerald-600" />
                              <span>Read by Merchant</span>
                            </span>
                            {n.read_at && (
                              <span className="text-[10px] text-slate-400 font-mono pl-1">
                                {new Date(n.read_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <ClockIcon className="w-3 h-3 text-amber-600" />
                            <span>Unread (Pending)</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteNotification(n.id, n.business_id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Revoke / Delete notification"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
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
  );
}
