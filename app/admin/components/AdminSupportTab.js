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

function WhatsAppIcon({ className = "w-3.5 h-3.5 text-emerald-600" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.173.449.741.964 1.2.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
    </svg>
  );
}

export default function AdminSupportTab({
  tickets = [],
  loading = false,
  onRefresh,
  triggerToast,
}) {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTicketId, setReplyingTicketId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("RESOLVED");
  const [updatingId, setUpdatingId] = useState(null);

  // Status Counts
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === "OPEN" && t.status !== "OPEN") return false;
    if (filterStatus === "IN_PROGRESS" && t.status !== "IN_PROGRESS") return false;
    if (filterStatus === "RESOLVED" && t.status !== "RESOLVED" && t.status !== "CLOSED") return false;
    if (filterStatus === "URGENT" && t.priority !== "urgent") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = String(t.id || "").toLowerCase().includes(q);
      const matchStore = String(t.store_name || "").toLowerCase().includes(q);
      const matchEmail = String(t.user_email || "").toLowerCase().includes(q);
      const matchPhone = String(t.phone || "").toLowerCase().includes(q);
      const matchSubject = String(t.subject || "").toLowerCase().includes(q);
      const matchDesc = String(t.description || "").toLowerCase().includes(q);
      return matchId || matchStore || matchEmail || matchPhone || matchSubject || matchDesc;
    }

    return true;
  });

  async function handleUpdateTicket(ticketId, newStatus, adminReply) {
    setUpdatingId(ticketId);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status: newStatus,
          adminReply: adminReply || undefined,
          notifyMerchant: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update ticket.");
      }
      triggerToast("success", `Ticket #${ticketId} updated to ${newStatus}.`);
      setReplyingTicketId(null);
      setReplyText("");
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Failed to update ticket.");
    } finally {
      setUpdatingId(null);
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "high":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "low":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getCategoryLabel = (category) => {
    switch (category?.toLowerCase()) {
      case "courier":
      case "courier_sync":
        return "Courier API Sync";
      case "inventory":
      case "inventory_stock":
        return "Stock & Inventory";
      case "billing":
      case "billing_plan":
        return "Billing & Subscription";
      case "bug":
      case "bug_report":
        return "Bug Report";
      case "feature":
      case "feature_request":
        return "Feature Request";
      default:
        return "General Help";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header & Hotlines ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#EA580C]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Merchant Support &amp; Issue Resolution Desk
            </h2>
            {openCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {openCount} Awaiting Response
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Resolve merchant technical issues, courier webhook delays, or billing inquiries with instant responses and direct WhatsApp hotline chat.
          </p>
        </div>

        {/* Admin Quick Action Hotline Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://wa.me/8801753082749"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium transition"
            title="Open Super Admin WhatsApp"
          >
            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            <span className="font-mono">01753082749</span>
          </a>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-50"
            title="Refresh ticket queue"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total Tickets</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 font-mono">
            {totalCount}
          </div>
        </div>

        <div className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-rose-600">Open &amp; Pending</div>
          <div className="mt-1 text-2xl font-semibold text-rose-700 font-mono">
            {openCount}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-amber-700">In Progress</div>
          <div className="mt-1 text-2xl font-semibold text-amber-800 font-mono">
            {inProgressCount}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-700">Resolved / Closed</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-800 font-mono">
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "All Tickets", count: totalCount },
            { id: "OPEN", label: "Open", count: openCount },
            { id: "IN_PROGRESS", label: "In Progress", count: inProgressCount },
            { id: "RESOLVED", label: "Resolved", count: resolvedCount },
            {
              id: "URGENT",
              label: "Urgent",
              count: tickets.filter((t) => t.priority === "urgent").length,
            },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
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

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search store, email, phone, ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-orange-500 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Tickets List ────────────────────────────────────────── */}
      <div className="space-y-3.5">
        {filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckIcon className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No support tickets found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No tickets match "${searchQuery}". Clear your search query to see all submissions.`
                : "All merchant issues have been resolved. The queue is completely clear!"}
            </p>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const isReplying = replyingTicketId === t.id;
            const isUpdating = updatingId === t.id;
            const cleanPhone = String(t.phone || "").replace(/\D/g, "");
            const whatsappUrl = cleanPhone
              ? `https://wa.me/88${cleanPhone.startsWith("88") ? cleanPhone.slice(2) : cleanPhone}?text=${encodeURIComponent(
                  `Hello from SmartInventory Super Admin regarding your ticket #${t.id} (${t.subject}):\n\n`
                )}`
              : null;

            return (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition hover:border-slate-300"
              >
                {/* Ticket Card Header Strip */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {t.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] border capitalize ${getPriorityBadge(
                        t.priority
                      )}`}
                    >
                      {t.priority || "normal"} priority
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                      {getCategoryLabel(t.category)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                    <span>
                      {t.created_at ? new Date(t.created_at).toLocaleString() : "Just now"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        t.status === "OPEN"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : t.status === "IN_PROGRESS"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {t.status || "OPEN"}
                    </span>
                  </div>
                </div>

                {/* Ticket Content Body */}
                <div className="p-5 space-y-4">
                  {/* Store & Contact Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{t.store_name || "Merchant Store"}</span>
                      </div>

                      {t.user_email && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{t.user_email}</span>
                        </div>
                      )}

                      {t.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <a href={`tel:${t.phone}`} className="hover:text-blue-600 underline">
                            {t.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Direct WhatsApp Action */}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium transition"
                        title="Chat directly with merchant on WhatsApp"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chat WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {/* Subject & Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                      {t.subject}
                    </h3>
                    <div className="mt-2 p-3.5 rounded-lg bg-slate-50/80 border-l-4 border-slate-300 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                      {t.description}
                    </div>
                  </div>

                  {/* Existing Admin Response Box */}
                  {t.admin_reply && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Admin Response (Visible to Merchant):</span>
                      </div>
                      <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed pl-5 font-sans">
                        {t.admin_reply}
                      </p>
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {isReplying ? (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">
                          Reply &amp; Notify Merchant ({t.store_name}):
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">Set Status:</span>
                          <select
                            value={replyStatus}
                            onChange={(e) => setReplyStatus(e.target.value)}
                            className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 font-medium focus:outline-none focus:border-orange-500"
                          >
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write clear instructions or resolution note for the merchant. They will receive this response on their dashboard & notifications..."
                        rows={3}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-orange-500"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTicketId(null);
                            setReplyText("");
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!replyText.trim() || isUpdating}
                          onClick={() => handleUpdateTicket(t.id, replyStatus, replyText)}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs disabled:opacity-50"
                        >
                          {isUpdating ? "Submitting..." : "Send Reply & Update"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Ticket Action Bar */
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTicketId(t.id);
                            setReplyText(t.admin_reply || "");
                            setReplyStatus(t.status === "RESOLVED" ? "RESOLVED" : "IN_PROGRESS");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span>{t.admin_reply ? "Edit Reply" : "Reply to Merchant"}</span>
                        </button>

                        {t.status === "OPEN" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateTicket(t.id, "IN_PROGRESS")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-800 text-xs font-medium transition cursor-pointer"
                          >
                            <span>Mark In Progress</span>
                          </button>
                        )}

                        {t.status !== "RESOLVED" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleUpdateTicket(
                                t.id,
                                "RESOLVED",
                                t.admin_reply || "Issue inspected and resolved by engineering team."
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition cursor-pointer"
                          >
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>1-Click Resolve</span>
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        Merchant: {t.business_id ? t.business_id.slice(0, 8) : "System"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
