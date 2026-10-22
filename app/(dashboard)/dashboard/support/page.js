"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusinessContext } from "@/utils/supabase/business";

export default function MerchantSupportPage() {
  const { businessName, userEmail } = useBusinessContext();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [supportInfo, setSupportInfo] = useState({
    supportPhone: "01753082749",
    whatsappNumber: "8801753082749",
    supportEmail: "support@smartinventory.app",
    supportHours: "10:00 AM - 11:00 PM (Daily)",
  });

  // Form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("bug");
  const [priority, setPriority] = useState("normal");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const triggerToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  async function fetchTickets() {
    try {
      setLoading(true);
      const res = await fetch("/api/tenant/support");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTickets(json.tickets || []);
          if (json.supportPhone || json.whatsappNumber) {
            setSupportInfo({
              supportPhone: json.supportPhone || "01753082749",
              whatsappNumber: json.whatsappNumber || "8801753082749",
              supportEmail: json.supportEmail || "support@smartinventory.app",
              supportHours: json.supportHours || "10:00 AM - 11:00 PM (Daily)",
            });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  async function handleSubmitTicket(e) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      triggerToast("error", "Please provide a subject and detailed description.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          phone: phone.trim(),
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit ticket.");
      }

      triggerToast("success", "Ticket submitted! Our technical team will assist you shortly.");
      setSubject("");
      setDescription("");
      setPhone("");
      fetchTickets();
    } catch (err) {
      triggerToast("error", err.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div
            className={`px-4 py-2.5 rounded-lg border text-xs font-medium shadow-lg flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-slate-900 transition">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Help &amp; Support</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Support Desk &amp; Issue Reporting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Report bugs, request courier assistance, or chat directly with our technical support team.
          </p>
        </div>

        {/* Live Chat & Hotline Banner */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`https://wa.me/${(supportInfo.whatsappNumber || "8801753082749").replace(/[^0-9]/g, "").startsWith("88") ? (supportInfo.whatsappNumber || "8801753082749").replace(/[^0-9]/g, "") : "88" + (supportInfo.whatsappNumber || "01753082749").replace(/[^0-9]/g, "")}?text=Hello%20SmartInventory%20Support%2C%20I%20need%20assistance%20with%20my%20store`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-2xs transition"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.101.005.232-.038.362.275.144.346.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
            </svg>
            <span>WhatsApp Live Support</span>
          </a>

          <a
            href={`tel:${(supportInfo.supportPhone || "01753082749").replace(/[^0-9+]/g, "")}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-medium shadow-2xs transition"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Hotline: {supportInfo.supportPhone || "01753082749"}</span>
          </a>

          {supportInfo.supportHours && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{supportInfo.supportHours}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Raise a New Ticket */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Submit a Ticket / Report an Issue</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Have an issue or bug? Submit details below and our team will respond directly.
            </p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Issue Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Steadfast tracking ID not syncing on dispatched order"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                >
                  <option value="bug">Bug / Error Report</option>
                  <option value="courier">Courier API / Sync Problem</option>
                  <option value="billing">Billing &amp; Subscription</option>
                  <option value="feature">Feature Request</option>
                  <option value="help">General Assistance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white font-medium"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Operational Blocker</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Contact Phone (for fast call/WhatsApp)
              </label>
              <input
                type="text"
                placeholder="e.g. 01711223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Detailed Description *
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened, what page you were on, or what order/consignment had an issue…"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              <span>Submit Ticket to Support Team</span>
            </button>
          </form>
        </div>

        {/* Right List: Support Tickets History */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Your Support Tickets ({tickets.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track resolution status and read developer responses to your inquiries.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTickets}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xs font-semibold text-slate-800">No Support Tickets Raised</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Everything looks clean! If you ever face an error, bug, or courier delay, submit a ticket using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        #{t.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-200/80 text-slate-700">
                        {t.category}
                      </span>
                      {t.priority === "urgent" && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                          URGENT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          t.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === "RESOLVED"
                              ? "bg-emerald-500"
                              : t.status === "IN_PROGRESS"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {t.status === "RESOLVED" ? "Resolved" : t.status === "IN_PROGRESS" ? "In Progress" : "Open"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      {t.subject}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                      {t.description}
                    </p>
                  </div>

                  {/* Admin Reply if present */}
                  {t.admin_reply && (
                    <div className="rounded-md border border-blue-200 bg-blue-50/80 p-3 text-xs space-y-1">
                      <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span>Support Team Response:</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed">
                        {t.admin_reply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
