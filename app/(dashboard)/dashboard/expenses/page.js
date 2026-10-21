"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useBusinessContext } from "@/utils/supabase/business";

const EXPENSE_CATEGORIES = [
  {
    id: "ad_spend",
    label: "Digital Ad Spend",
    subtext: "Facebook, TikTok, Google Ads",
    color: "orange",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    id: "packaging",
    label: "Packaging & Bags",
    subtext: "Poly mailers, bubble wrap, tape",
    color: "teal",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: "salaries_rent",
    label: "Rent & Salaries",
    subtext: "Store rent, staff packing wages",
    color: "purple",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: "utilities_misc",
    label: "Tea & Utilities",
    subtext: "Chai/snacks, internet, electricity",
    color: "amber",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const QUICK_EXPENSE_PILLS = [
  { label: "+৳1,500 Meta Ads", amount: 1500, category: "ad_spend", platform: "Facebook / Meta Ads", notes: "Daily conversions ad budget" },
  { label: "+৳650 Poly Mailers (500 pcs)", amount: 650, category: "packaging", platform: "Packaging Mart", notes: "500 standard delivery flyers" },
  { label: "+৳150 Afternoon Chai & Snacks", amount: 150, category: "utilities_misc", platform: "Office Pantry", notes: "Chai and biscuits for dispatch packing crew" },
  { label: "+৳2,500 Day Wages", amount: 2500, category: "salaries_rent", platform: "Payroll", notes: "Warehouse dispatch team daily wages" },
  { label: "+৳1,200 TikTok Video Boost", amount: 1200, category: "ad_spend", platform: "TikTok Ads", notes: "Viral product UGC video spark ad" },
];

const TIMEFRAMES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "This Month (30d)" },
  { id: "all", label: "All Time" },
];

export default function ExpensesManagementPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [expenses, setExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState({
    totalExpenses: 0,
    adSpendTotal: 0,
    packagingTotal: 0,
    salariesRentTotal: 0,
    utilitiesMiscTotal: 0,
    todaySpend: 0,
    recordCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State for Ultra-Fast Expense Logger
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ad_spend");
  const [platform, setPlatform] = useState("Facebook / Meta Ads");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bKash Merchant");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  function triggerToast(text, type = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Load Expenses ───────────────────────────────────────────
  async function loadExpensesData() {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/expenses?timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        if (data.summary) {
          setExpenseSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn("Error loading expenses:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!ctxLoading) {
      loadExpensesData();
    }
  }, [ctxLoading, timeframe]);

  // ── Handle Fast Log Submission ──────────────────────────────
  async function handleLogExpense(e) {
    e?.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      triggerToast("Please enter a valid expense amount.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          category,
          platform,
          notes,
          payment_method: paymentMethod,
          expense_date: expenseDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`Logged ৳${num.toLocaleString()} for ${platform || category}!`);
        setAmount("");
        setNotes("");
        await loadExpensesData();
      } else {
        throw new Error(data.error || "Failed to save expense.");
      }
    } catch (err) {
      triggerToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Handle Quick Pill Click ─────────────────────────────────
  function handleApplyQuickPill(pill) {
    setAmount(String(pill.amount));
    setCategory(pill.category);
    setPlatform(pill.platform);
    setNotes(pill.notes);
  }

  // ── Handle Delete Expense ───────────────────────────────────
  async function handleDeleteExpense(id) {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        triggerToast("Expense entry deleted.");
        loadExpensesData();
      }
    } catch {
      triggerToast("Failed to delete record.", "error");
    }
  }

  // ── Filtered Expenses Pipeline ──────────────────────────────
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategoryFilter !== "all" && e.category !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNotes = (e.notes || "").toLowerCase().includes(q);
        const matchPlatform = (e.platform || "").toLowerCase().includes(q);
        const matchCategory = (e.category || "").toLowerCase().includes(q);
        if (!matchNotes && !matchPlatform && !matchCategory) return false;
      }
      return true;
    });
  }, [expenses, selectedCategoryFilter, searchQuery]);

  // Distribution percentages
  const grandTotal = Math.max(1, expenseSummary.totalExpenses || 0);
  const adPercent = Math.round(((expenseSummary.adSpendTotal || 0) / grandTotal) * 100);
  const packPercent = Math.round(((expenseSummary.packagingTotal || 0) / grandTotal) * 100);
  const rentPercent = Math.round(((expenseSummary.salariesRentTotal || 0) / grandTotal) * 100);
  const utilPercent = Math.max(0, 100 - adPercent - packPercent - rentPercent);

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Loading operational overheads, ad-spend breakdown, and net profit deductions…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* ── Toast Notification ───────────────────────────────── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 border animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "error"
              ? "bg-rose-900 text-white border-rose-700"
              : "bg-slate-900 text-white border-slate-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              toastMessage.type === "error" ? "bg-rose-400" : "bg-emerald-400"
            }`}
          />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── HEADER SECTION ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Expenses &amp; Ad Spend
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track Meta ads, packaging, staff salaries, and operating overheads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Switcher */}
            <div className="flex items-center p-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-medium transition ${
                    timeframe === tf.id
                      ? "bg-[#EA580C] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium shadow-2xs transition"
            >
              <span>Net profit reports →</span>
            </Link>

            <button
              type="button"
              onClick={loadExpensesData}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
              title="Refresh ledger"
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

        {/* ── ARCHITECTURAL FINANCIAL METRIC BAR ──────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Operating Expenses */}
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Total operating spend
            </span>
            <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
              ৳{Math.round(expenseSummary.totalExpenses || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Across {expenseSummary.recordCount || 0} logged entries
            </div>
          </div>

          {/* Card 2: Digital Ad Spend */}
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Digital ad spend
            </span>
            <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
              ৳{Math.round(expenseSummary.adSpendTotal || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              {adPercent}% of total overheads
            </div>
          </div>

          {/* Card 3: Packaging & Consumables */}
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Packaging &amp; materials
            </span>
            <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
              ৳{Math.round(expenseSummary.packagingTotal || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Flyers, bubble rolls &amp; tape
            </div>
          </div>

          {/* Card 4: Staff Wages & Office Rent */}
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">
              Salaries &amp; rent
            </span>
            <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
              ৳{Math.round((expenseSummary.salariesRentTotal || 0) + (expenseSummary.utilitiesMiscTotal || 0)).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Packing crew, utilities &amp; rent
            </div>
          </div>
        </div>

        {/* ── EXPENSE BREAKDOWN VISUAL BAR ────────────────────── */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-900 uppercase">Overhead Distribution Breakdown</span>
            <span className="text-slate-500">Total: ৳{Math.round(expenseSummary.totalExpenses || 0).toLocaleString()}</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div
              style={{ width: `${adPercent}%` }}
              className="bg-teal-500 h-full transition-all duration-300"
              title={`Digital Ad Spend: ${adPercent}%`}
            />
            <div
              style={{ width: `${packPercent}%` }}
              className="bg-orange-500 h-full transition-all duration-300"
              title={`Packaging & Consumables: ${packPercent}%`}
            />
            <div
              style={{ width: `${rentPercent}%` }}
              className="bg-purple-500 h-full transition-all duration-300"
              title={`Staff Salaries & Rent: ${rentPercent}%`}
            />
            <div
              style={{ width: `${utilPercent}%` }}
              className="bg-amber-400 h-full transition-all duration-300"
              title={`Utilities & Tea: ${utilPercent}%`}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono pt-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span className="text-slate-600">Ad Spend ({adPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-slate-600">Packaging ({packPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-slate-600">Salaries &amp; Rent ({rentPercent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-slate-600">Tea &amp; Misc ({utilPercent}%)</span>
            </div>
          </div>
        </div>

        {/* ── ULTRA-FAST DAILY EXPENSE LOGGER COMPONENT ───────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                  Daily Expense Logger
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Log receipts in 3 seconds. Instant impact on real net profit calculations.
              </p>
            </div>

            {/* Quick 1-Click Entry Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold shrink-0">
                1-Click Presets:
              </span>
              {QUICK_EXPENSE_PILLS.map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyQuickPill(pill)}
                  className="btn-tactile text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap shrink-0 transition"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Category Radio Pills */}
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    if (cat.id === "ad_spend" && !platform) setPlatform("Facebook / Meta Ads");
                    if (cat.id === "packaging" && !platform) setPlatform("Packaging Mart");
                  }}
                  className={`btn-tactile p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    category === cat.id
                      ? "border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <span className={`p-1.5 rounded-lg ${category === cat.id ? "bg-orange-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                    {cat.icon}
                  </span>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{cat.label}</span>
                    <span className="text-[10px] text-slate-500 block">{cat.subtext}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {/* Amount Input (BDT) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 font-mono mb-1">
                  Amount in BDT (৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="number"
                    placeholder="1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-7 pr-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Platform / Vendor */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 font-mono mb-1">
                  Platform / Vendor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meta Ads, Islampur Market"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 font-mono mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition"
                >
                  <option value="bKash Merchant">bKash Merchant</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash Handout</option>
                  <option value="Card">Visa / Mastercard</option>
                </select>
              </div>

              {/* Expense Date */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 font-mono mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting || !amount}
                  className="w-full h-9 rounded-md bg-[#EA580C] hover:bg-[#D94E07] text-white font-medium text-[13px] shadow-2xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{submitting ? "Logging…" : "Record Expense (৳)"}</span>
                </button>
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <input
                type="text"
                placeholder="Optional notes: e.g. 'Campaign #Boishakhi-CBO', '500 custom branded packaging flyers'…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition"
              />
            </div>
          </form>
        </div>

        {/* ── EXPENSE LEDGER TABLE ────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("all")}
                className={`btn-tactile px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategoryFilter === "all"
                    ? "bg-slate-900 text-white font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                All Categories
              </button>
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`btn-tactile px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    selectedCategoryFilter === cat.id
                      ? "bg-orange-600 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search notes or vendor…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <svg
                className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-mono text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">Date &amp; ID</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Platform / Vendor</th>
                  <th className="py-3 px-4 font-bold">Notes &amp; Description</th>
                  <th className="py-3 px-4 font-bold text-center">Payment</th>
                  <th className="py-3 px-4 font-bold text-right">Amount (৳)</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-semibold text-slate-600">No matching operational expenses recorded.</p>
                        <p className="text-[11px]">Use the quick buttons above to log daily overheads.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((item) => {
                    const isAd = item.category === "ad_spend";
                    const isPack = item.category === "packaging";
                    const isRent = item.category === "salaries_rent";

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/80">
                        {/* Date & ID */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-slate-900 block">{item.expense_date}</span>
                          <span className="text-[10px] text-slate-400 block">{item.id}</span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          {isAd ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                              Digital Ads
                            </span>
                          ) : isPack ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                              Packaging
                            </span>
                          ) : isRent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                              Rent &amp; Wages
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Tea &amp; Utilities
                            </span>
                          )}
                        </td>

                        {/* Platform / Vendor */}
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {item.platform || "Direct Supplier"}
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {item.notes || "—"}
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-600">
                          {item.payment_method || "bKash Merchant"}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          ৳{Number(item.amount).toLocaleString()}
                        </td>

                        {/* Delete Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(item.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete expense entry"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

        {/* ── PROFIT IMPACT BRIDGE BANNER ─────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Real-Time Financial Connection to Take-Home Profit
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Every expense recorded here is automatically factored into your net margin equation:
              <br />
              <span className="font-mono text-slate-700 font-semibold">
                Gross Sales − COGS − Courier COD Fees − Ad Spend − Operating Overheads = Final Net Profit.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/reconciliation"
              className="btn-tactile px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            >
              Courier Reconciliation →
            </Link>
            <Link
              href="/dashboard/reports"
              className="btn-tactile px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs shadow-orange-600/20 transition"
            >
              Open True Net-Profit Runway →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
