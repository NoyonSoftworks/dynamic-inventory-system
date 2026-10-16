"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useBusinessContext } from "@/utils/supabase/business";
import CourierClaimModal from "@/components/CourierClaimModal";

const COURIER_PRESETS = [
  { id: "ALL", name: "All Couriers" },
  { id: "Steadfast", name: "Steadfast Courier", badge: "API Linked" },
  { id: "Pathao", name: "Pathao Courier", badge: "Weekly Batch" },
  { id: "RedX", name: "RedX Logistics", badge: "Auto-Payout" },
];

const STATUS_TABS = [
  { id: "ALL", label: "All Consignments" },
  { id: "SHORT_PAID", label: "Short-Paid / Mismatched", highlight: "rose" },
  { id: "PENDING_PAYOUT", label: "Pending Payout", highlight: "amber" },
  { id: "LOST_STUCK", label: "Stuck >7 Days", highlight: "violet" },
  { id: "SETTLED", label: "Settled & Paid", highlight: "emerald" },
];

export default function CourierReconciliationPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [records, setRecords] = useState([]);
  const [telemetry, setTelemetry] = useState({
    totalSettledAmount: 0,
    pendingPayoutAmount: 0,
    shortPaidVariance: 0,
    stuckCount: 0,
    stuckAtRiskValue: 0,
    totalParcels: 0,
    settledCount: 0,
    shortPaidCount: 0,
    pendingCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("ALL");
  const [selectedStatusTab, setSelectedStatusTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Claim Modal State
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedRecordForClaim, setSelectedRecordForClaim] = useState(null);

  // File Upload State
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  function triggerToast(text, type = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Load Reconciled Records from API ─────────────────────────
  async function loadReconciliationData() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/reconciliation");
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.telemetry) setTelemetry(data.telemetry);
      }
    } catch (err) {
      console.warn("Failed to load reconciliation records:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!ctxLoading) {
      loadReconciliationData();
    }
  }, [ctxLoading]);

  // ── CSV Ingestion Engine ────────────────────────────────────
  function handleCsvFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") throw new Error("Invalid file content.");

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          throw new Error("CSV file must contain a header and at least one data row.");
        }

        // Header mapping heuristic
        const headers = lines[0].toLowerCase().split(",").map((h) => h.replace(/["']/g, "").trim());
        const findColIdx = (aliases) => headers.findIndex((h) => aliases.some((a) => h.includes(a)));

        const consignmentIdx = findColIdx(["consignment", "invoice", "invoice_no", "order_id", "tracking"]);
        const courierIdx = findColIdx(["courier", "partner", "carrier"]);
        const customerIdx = findColIdx(["customer", "recipient", "name"]);
        const phoneIdx = findColIdx(["phone", "contact", "mobile"]);
        const orderAmountIdx = findColIdx(["expected", "order_amount", "cod", "collected_amount"]);
        const payoutIdx = findColIdx(["payout", "paid", "remitted", "net_amount", "bank"]);
        const deliveryChargeIdx = findColIdx(["charge", "delivery_fee", "shipping"]);

        const parsedRows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.replace(/["']/g, "").trim());
          if (cols.length < 2) continue;

          const consignmentId = cols[consignmentIdx] || `IMP-${Date.now()}-${i}`;
          const courierName = cols[courierIdx] || (selectedCourier !== "ALL" ? selectedCourier : "Steadfast");
          const customerName = cols[customerIdx] || "Customer";
          const customerPhone = cols[phoneIdx] || "01700000000";
          const orderAmount = Number(cols[orderAmountIdx]) || 1500;
          const deliveryCharge = deliveryChargeIdx >= 0 ? Number(cols[deliveryChargeIdx]) || 70 : 70;
          const codFee = Math.round(orderAmount * 0.01);
          const payoutAmount = payoutIdx >= 0 ? Number(cols[payoutIdx]) || 0 : Math.max(0, orderAmount - deliveryCharge - codFee);

          parsedRows.push({
            consignment_id: consignmentId,
            tracking_code: consignmentId,
            courier: courierName,
            customer_name: customerName,
            customer_phone: customerPhone,
            order_amount: orderAmount,
            collected_amount: orderAmount,
            delivery_charge: deliveryCharge,
            cod_fee: codFee,
            payout_amount: payoutAmount,
            days_in_transit: 2,
            batch_reference: `CSV-BATCH-${file.name.slice(0, 15)}`,
          });
        }

        // Send to backend discrepancy processor
        const res = await fetch("/api/reconciliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: parsedRows }),
        });

        const json = await res.json();
        if (json.success) {
          triggerToast(`Successfully processed & reconciled ${json.processedCount} courier consignments!`);
          await loadReconciliationData();
        } else {
          throw new Error(json.error || "Server rejected CSV data.");
        }
      } catch (uploadErr) {
        triggerToast(uploadErr.message || "Failed to process CSV file.", "error");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  }

  // ── 1-Click Demo Settlement Seeder ──────────────────────────
  async function handleLoadDemoSettlement() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      await loadReconciliationData();
      triggerToast("Loaded live Steadfast, Pathao & RedX settlement audit data.");
    } catch {
      triggerToast("Error reloading settlement demonstration data.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  // ── Download CSV Template ───────────────────────────────────
  function handleDownloadTemplate() {
    const headers = [
      "consignment_id",
      "courier",
      "customer_name",
      "customer_phone",
      "cod_amount",
      "delivery_charge",
      "payout_amount",
      "days_in_transit",
    ];
    const sampleRows = [
      ["SF-991024", "Steadfast", "Rahim Uddin", "01712345678", "2500", "70", "2405", "2"],
      ["PTH-882190", "Pathao", "Nabila Khan", "01899887766", "3800", "120", "3642", "1"],
      ["REDX-10294", "RedX", "Tanvir Ahmed", "01655443322", "1900", "60", "1420", "3"],
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...sampleRows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "courier_settlement_reconciliation_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Filtered Records Pipeline ───────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Status Filter
      if (selectedStatusTab !== "ALL") {
        if (selectedStatusTab === "LOST_STUCK") {
          const isLost = r.status === "LOST_STUCK" || (r.days_in_transit || 0) >= 7;
          if (!isLost) return false;
        } else if (r.status !== selectedStatusTab) {
          return false;
        }
      }

      // 2. Courier Filter
      if (selectedCourier !== "ALL") {
        if ((r.courier || "").toLowerCase() !== selectedCourier.toLowerCase()) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchConsignment = (r.consignment_id || "").toLowerCase().includes(q);
        const matchTracking = (r.tracking_code || "").toLowerCase().includes(q);
        const matchCustomer = (r.customer_name || "").toLowerCase().includes(q);
        const matchPhone = (r.customer_phone || "").includes(q);
        if (!matchConsignment && !matchTracking && !matchCustomer && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [records, selectedStatusTab, selectedCourier, searchQuery]);

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Reconciling Steadfast, Pathao &amp; RedX COD settlement statements…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 font-sans">
      {/* ── Courier Claim Modal ──────────────────────────────── */}
      {claimModalOpen && selectedRecordForClaim && (
        <CourierClaimModal
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          record={selectedRecordForClaim}
          businessName={businessName || "My Store"}
          onClaimSubmitted={(updated) => {
            setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            triggerToast(`Dispute ticket recorded for Consignment ${updated.consignment_id}!`);
          }}
        />
      )}

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
            } animate-pulse`}
          />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Hidden File Input for CSV Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCsvFileUpload}
        accept=".csv"
        className="hidden"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── PAGE HEADER ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">{businessName || "Workspace"}</span>
              <span className="text-slate-400">/</span>
              <span className="text-orange-600 font-semibold">Fintech Intelligence</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 font-semibold">COD Reconciliation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Courier &amp; COD Payment Reconciliation Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated settlement audit for Steadfast, Pathao &amp; RedX. Detect missing cash, hidden return deductions, and stuck parcels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Upload Courier CSV Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 text-xs font-bold shadow-xs shadow-orange-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{uploading ? "Ingesting Statement…" : "Upload Settlement CSV"}</span>
            </button>

            {/* Template & Demo Buttons */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs btn-tactile transition"
              title="Download standardized reconciliation CSV template"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Sample CSV</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemoSettlement}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs btn-tactile transition"
              title="Load sample Steadfast, Pathao & RedX settlement test cases"
            >
              <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Load Demo Data</span>
            </button>

            <button
              type="button"
              onClick={loadReconciliationData}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 btn-tactile transition shadow-2xs disabled:opacity-50"
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

        {/* ── 4 SUMMARY TELEMETRY METRIC CARDS ───────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Settled & Paid */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Settled &amp; Deposited COD
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight font-mono">
              ৳{Math.round(telemetry.totalSettledAmount).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {telemetry.settledCount} consignments reconciled &amp; remitted
            </div>
          </div>

          {/* Card 2: Pending Courier Payout */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Pending Courier Payouts
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-amber-600 tracking-tight font-mono">
              ৳{Math.round(telemetry.pendingPayoutAmount).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {telemetry.pendingCount} delivered parcels awaiting disbursement
            </div>
          </div>

          {/* Card 3: Short-Paid & Mismatched Variance */}
          <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-800 font-bold">
                Short-Paid Discrepancies
              </span>
              <span className="p-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-rose-600 tracking-tight font-mono">
              -৳{Math.round(telemetry.shortPaidVariance).toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-700 mt-1 font-mono font-semibold">
              {telemetry.shortPaidCount} orders short-paid • Claim recoverable
            </div>
          </div>

          {/* Card 4: Stuck & Lost Parcels (>7 Days) */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Stuck In-Transit (&gt;7 Days)
              </span>
              <span className="p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-purple-700 tracking-tight font-mono">
              {telemetry.stuckCount} <span className="text-sm font-semibold text-slate-500">Parcels</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              ৳{Math.round(telemetry.stuckAtRiskValue).toLocaleString()} trapped goods at risk
            </div>
          </div>
        </div>

        {/* ── COURIER PARTNER PRESET SELECTOR & FILTER BAR ────── */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Courier Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {COURIER_PRESETS.map((courier) => (
                <button
                  key={courier.id}
                  type="button"
                  onClick={() => setSelectedCourier(courier.id)}
                  className={`btn-tactile px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    selectedCourier === courier.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  <span>{courier.name}</span>
                  {courier.badge && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase ${
                        selectedCourier === courier.id
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {courier.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] max-w-sm">
              <input
                type="text"
                placeholder="Search Consignment, Tracking, Phone…"
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

          {/* Status Sub-Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto no-scrollbar">
            {STATUS_TABS.map((tab) => {
              const active = selectedStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatusTab(tab.id)}
                  className={`btn-tactile text-xs font-semibold px-3 py-1 rounded-lg transition whitespace-nowrap ${
                    active
                      ? "bg-orange-600 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── HIGH-PRECISION RECONCILIATION TABLE ──────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Dispatched Consignments &amp; Remittance Audit Log ({filteredRecords.length} Items)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Auto-Matched via Tracking &amp; Phone Hash
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-mono text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">Consignment &amp; Courier</th>
                  <th className="py-3 px-4 font-bold">Customer Recipient</th>
                  <th className="py-3 px-4 font-bold text-right">Expected COD</th>
                  <th className="py-3 px-4 font-bold text-right">Courier Fee (D+COD)</th>
                  <th className="py-3 px-4 font-bold text-right">Courier Payout</th>
                  <th className="py-3 px-4 font-bold text-right">Discrepancy (৳)</th>
                  <th className="py-3 px-4 font-bold text-center">Status Badge</th>
                  <th className="py-3 px-4 font-bold text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-semibold text-slate-600">No matching reconciliation records found.</p>
                        <p className="text-[11px]">Upload a courier CSV settlement statement or click "Load Demo Data" above.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isShortPaid = r.status === "SHORT_PAID";
                    const isSettled = r.status === "SETTLED";
                    const isPending = r.status === "PENDING_PAYOUT";
                    const isStuck = r.status === "LOST_STUCK" || (r.days_in_transit || 0) >= 7;

                    const totalCourierFee = (Number(r.delivery_charge) || 0) + (Number(r.cod_fee) || 0);

                    return (
                      <tr
                        key={r.id}
                        className={`transition hover:bg-slate-50/80 ${
                          isShortPaid
                            ? "bg-rose-50/30"
                            : isStuck
                            ? "bg-purple-50/20"
                            : ""
                        }`}
                      >
                        {/* Consignment & Courier */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{r.consignment_id}</span>
                            {r.claim_status === "CLAIM_FILED" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-bold uppercase">
                                Claim Filed
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-orange-600">{r.courier}</span>
                            <span>•</span>
                            <span>{r.tracking_code || r.consignment_id}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{r.customer_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{r.customer_phone}</div>
                        </td>

                        {/* Expected COD */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          ৳{Number(r.order_amount).toLocaleString()}
                        </td>

                        {/* Courier Deductions */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          <span title={`Delivery ৳${r.delivery_charge} + 1% COD ৳${r.cod_fee}`}>
                            -৳{totalCourierFee.toLocaleString()}
                          </span>
                        </td>

                        {/* Courier Payout */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {r.payout_amount > 0 ? `৳${Number(r.payout_amount).toLocaleString()}` : "৳0"}
                        </td>

                        {/* Discrepancy Variance */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {r.variance < 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-black">
                              -৳{Math.abs(r.variance).toLocaleString()} Short
                            </span>
                          ) : r.variance > 0 ? (
                            <span className="text-teal-600">+৳{r.variance.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600">৳0 Exact</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isSettled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Settled &amp; Paid
                            </span>
                          ) : isShortPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Short-Paid Mismatch
                            </span>
                          ) : isStuck ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                              Stuck {r.days_in_transit}d
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Pending Payout
                            </span>
                          )}
                        </td>

                        {/* Audit Action */}
                        <td className="py-3.5 px-4 text-right">
                          {isShortPaid || isStuck ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecordForClaim(r);
                                setClaimModalOpen(true);
                              }}
                              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-2xs transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>Raise Claim</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecordForClaim(r);
                                setClaimModalOpen(true);
                              }}
                              className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                            >
                              <span>View Audit</span>
                            </button>
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

        {/* ── DIRECT CASH-PROTECTION FOOTER CARD ──────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Connect Discrepancies with True Net-Profit Intelligence
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Unreconciled courier fee deductions silently bleed 4% to 8% off your monthly take-home profit. View your full financial telemetry and operating overhead breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/expenses"
              className="btn-tactile px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            >
              Expense &amp; Ad Splitter →
            </Link>
            <Link
              href="/dashboard/reports"
              className="btn-tactile px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs shadow-orange-600/20 transition"
            >
              True Net-Profit Runway →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
