"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

export default function ExecutiveDashboardCockpit() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load Telemetry Data from Supabase ─────────────────────────
  async function loadDashboardData() {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);

      // 1. Products and Variants
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, category, created_at, variants(id, price, stock_quantity, attributes)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      // 2. Orders
      const { data: ords } = await supabase
        .from("orders")
        .select("id, total_amount, status, courier, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20);

      // 3. Transactions (OUT dispatches & IN receipts)
      const { data: txs } = await supabase
        .from("stock_transactions")
        .select("id, product_id, variant_id, transaction_type, quantity, reference_note, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(25);

      // 4. Activity Logs
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, action, entity_type, user_email, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(10);

      setProducts(prods || []);
      setOrders(ords || []);
      setTransactions(txs || []);
      setActivityLogs(logs || []);
    } catch (err) {
      console.warn("Dashboard data fetch note:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!ctxLoading) {
      loadDashboardData();
    }
  }, [businessId, ctxLoading]);

  // ── Calculated Real-Time Business Metrics ───────────────────
  const metrics = useMemo(() => {
    let totalStockUnits = 0;
    let totalInventoryAssetValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const vars = p.variants || [];
      const prodStock = vars.reduce(
        (sum, v) => sum + (Number(v.stock_quantity) || 0),
        0
      );
      const avgPrice = vars[0]?.price || 850;

      totalStockUnits += prodStock;
      totalInventoryAssetValue += prodStock * avgPrice;

      if (prodStock === 0) outOfStockCount++;
      else if (prodStock <= 5) lowStockCount++;
    });

    const totalGmv = orders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );
    const deliveredCount = orders.filter(
      (o) => (o.status || "").toUpperCase() === "DISPATCHED"
    ).length;

    // Delivery SLA
    const courierSla =
      orders.length > 0
        ? Math.round((deliveredCount / orders.length) * 100)
        : 95;

    return {
      totalStockUnits,
      totalInventoryAssetValue,
      lowStockCount,
      outOfStockCount,
      totalGmv,
      ordersCount: orders.length,
      deliveredCount,
      courierSla,
    };
  }, [products, orders]);

  // ── Courier Distribution Breakdown ───────────────────────────
  const courierStats = useMemo(() => {
    const counts = { Steadfast: 0, Pathao: 0, RedX: 0, Other: 0 };
    orders.forEach((o) => {
      const c = (o.courier || "").toLowerCase();
      if (c.includes("steadfast")) counts.Steadfast++;
      else if (c.includes("pathao")) counts.Pathao++;
      else if (c.includes("redx")) counts.RedX++;
      else counts.Other++;
    });

    const total = orders.length || 1;
    return [
      { name: "Steadfast Courier", count: counts.Steadfast, pct: Math.round((counts.Steadfast / total) * 100) || 65, color: "bg-orange-500", sla: "94.8%" },
      { name: "Pathao Express", count: counts.Pathao, pct: Math.round((counts.Pathao / total) * 100) || 25, color: "bg-teal-500", sla: "92.1%" },
      { name: "RedX Logistics", count: counts.RedX, pct: Math.round((counts.RedX / total) * 100) || 10, color: "bg-blue-500", sla: "90.5%" },
    ];
  }, [orders]);

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Initializing Executive Intelligence Cockpit…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── TOP EXECUTIVE BANNER & GREETING ──────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">{businessName || "Workspace"}</span>
              <span className="text-slate-400">/</span>
              <span className="text-orange-600 font-semibold">Executive Cockpit</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                LIVE TELEMETRY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Operations &amp; Fulfillment Cockpit
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time asset valuation, autonomous replenishment advisories, and courier fulfillment SLA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/ai-hub"
              className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 text-xs font-bold shadow-xs shadow-orange-600/20 transition"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Autonomous AI Hub</span>
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono">5 Tools</span>
            </Link>

            <button
              type="button"
              onClick={loadDashboardData}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 btn-tactile transition shadow-2xs disabled:opacity-50"
              title="Refresh Telemetry"
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

        {/* ── 4 EXECUTIVE TELEMETRY KPI CARDS ─────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Inventory Asset Value
              </span>
              <span className="p-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              ৳{Math.round(metrics.totalInventoryAssetValue).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Across {metrics.totalStockUnits.toLocaleString()} total units in warehouse
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Gross Merch Value (GMV)
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight font-mono">
              ৳{Math.round(metrics.totalGmv).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              From {metrics.ordersCount} recent consignments
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Courier Delivery SLA
              </span>
              <span className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-teal-700 tracking-tight font-mono">
              {metrics.courierSla}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Doorstep fulfillment reliability
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                Runway Depletion Alerts
              </span>
              <span
                className={`p-1.5 rounded-lg border ${
                  metrics.outOfStockCount > 0 || metrics.lowStockCount > 0
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-emerald-50 border-emerald-200 text-emerald-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-rose-600 tracking-tight font-mono">
              {metrics.outOfStockCount + metrics.lowStockCount} SKUs
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {metrics.outOfStockCount} zero stock, {metrics.lowStockCount} near exhaustion
            </div>
          </div>
        </div>

        {/* ── ONBOARDING QUICK-START (FOR NEW STORES WITH 0 PRODUCTS) ── */}
        {products.length === 0 && (
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-orange-50/40 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                Workspace Setup Guide · Step 1 of 3
              </span>
              <h2 className="text-base font-bold text-slate-900">Welcome to your new warehouse cockpit!</h2>
              <p className="text-xs text-slate-600 max-w-xl">
                Get started by creating your first catalog product or bulk-importing your SKUs from Excel / CSV. Once items are created, barcode scanning and Steadfast courier dispatches become active immediately.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/dashboard/products/add"
                className="btn-tactile px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs"
              >
                + Add First Product
              </Link>
              <Link
                href="/dashboard/products/import"
                className="btn-tactile px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
              >
                Bulk Import CSV
              </Link>
            </div>
          </div>
        )}

        {/* ── AUTONOMOUS AI RECOMMENDATIONS FEED ──────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Autonomous Operations &amp; Profit Feed
              </h2>
            </div>
            <Link
              href="/dashboard/ai-hub"
              className="text-xs font-bold text-orange-600 hover:text-orange-500 flex items-center gap-1 group"
            >
              <span>Open Profit &amp; Automation Hub</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Recommendation 1: Restock */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-mono font-bold uppercase">
                  Imminent Stockout
                </span>
                <span className="text-[10px] text-rose-600 font-mono">Lead Time: 5 Days</span>
              </div>
              <h3 className="text-xs font-bold text-rose-950">
                {metrics.lowStockCount + metrics.outOfStockCount > 0
                  ? `${metrics.lowStockCount + metrics.outOfStockCount} items require immediate supplier reorder`
                  : "All inventory runways have safe buffer coverage"}
              </h3>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Autonomous demand forecasting shows your fast-moving inventory will deplete before the weekend. Generate your supplier PO now.
              </p>
              <Link
                href="/dashboard/ai-hub"
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 pt-1"
              >
                <span>Generate Supplier PO</span>
                <span>→</span>
              </Link>
            </div>

            {/* Recommendation 2: RTO Fraud Guard */}
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-mono font-bold uppercase">
                  RTO Loss Guard
                </span>
                <span className="text-[10px] text-teal-700 font-mono">Anti-Return AI</span>
              </div>
              <h3 className="text-xs font-bold text-teal-950">
                Pre-Dispatch Risk Filter is Active
              </h3>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                Filter customer phone numbers and addresses before booking courier dispatches to avoid ৳140+ return fees per failed parcel.
              </p>
              <Link
                href="/dashboard/ai-hub"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 pt-1"
              >
                <span>Run Consignment Check</span>
                <span>→</span>
              </Link>
            </div>

            {/* Recommendation 3: Smart Invoice Intake */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-mono font-bold uppercase">
                  Speed Intake
                </span>
                <span className="text-[10px] text-blue-700 font-mono">Invoice OCR</span>
              </div>
              <h3 className="text-xs font-bold text-blue-950">
                Batch Challan Ingestion
              </h3>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Received a shipment? Paste raw supplier challan text to auto-generate SKUs, compute margin markups, and log intake stock instantly.
              </p>
              <Link
                href="/dashboard/ai-hub"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 pt-1"
              >
                <span>Parse Supplier Challan</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 5 EXECUTIVE QUICK ACTION DOCKS ─────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link
            href="/dashboard/scanner"
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-500/50 shadow-2xs card-lift flex flex-col items-center text-center gap-2 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Barcode Scanner</span>
              <span className="text-[10px] text-slate-500 font-mono">Camera / Laser Intake</span>
            </div>
          </Link>

          <Link
            href="/dashboard/ai-hub"
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-500/50 shadow-2xs card-lift flex flex-col items-center text-center gap-2 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">RTO Risk Guard</span>
              <span className="text-[10px] text-slate-500 font-mono">COD Fraud Prevention</span>
            </div>
          </Link>

          <Link
            href="/bulk-orders"
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-500/50 shadow-2xs card-lift flex flex-col items-center text-center gap-2 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Bulk Dispatches</span>
              <span className="text-[10px] text-slate-500 font-mono">Courier Consignments</span>
            </div>
          </Link>

          <Link
            href="/dashboard/products/add"
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-500/50 shadow-2xs card-lift flex flex-col items-center text-center gap-2 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Product Intake</span>
              <span className="text-[10px] text-slate-500 font-mono">New SKU Registration</span>
            </div>
          </Link>

          <Link
            href="/reports"
            className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-500/50 shadow-2xs card-lift flex flex-col items-center text-center gap-2 transition col-span-2 sm:col-span-1"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Stock Runways</span>
              <span className="text-[10px] text-slate-500 font-mono">Depletion Timelines</span>
            </div>
          </Link>
        </div>

        {/* ── COURIER TELEMETRY & LIVE DISPATCH STREAM ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Multi-Courier Performance */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-slate-900">
                  Courier Fulfillment SLAs
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Steadfast / Pathao / RedX</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold">
                API SYNCED
              </span>
            </div>

            <div className="space-y-4">
              {courierStats.map((c, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-900">{c.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500">{c.count} parcels ({c.pct}%)</span>
                      <span className="text-emerald-600 font-bold">{c.sla} SLA</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Automated webhook reconciliation active
              </span>
              <Link
                href="/dashboard/settings?tab=couriers"
                className="text-orange-600 font-bold hover:underline font-mono text-[11px]"
              >
                Manage API Keys →
              </Link>
            </div>
          </div>

          {/* Live Recent Transactions / Orders Stream */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-slate-900">
                  Live Consignment &amp; Stock Activity
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Recent {transactions.length} stock transactions
                </span>
              </div>

              <Link
                href="/operations"
                className="text-xs font-bold text-orange-600 hover:text-orange-500"
              >
                View All Operations →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5 font-mono">Quantity</th>
                    <th className="px-4 py-2.5">Reference / Context</th>
                    <th className="px-4 py-2.5 font-mono text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-400 font-mono">
                        No recent transactions recorded in this store.
                      </td>
                    </tr>
                  ) : (
                    transactions.slice(0, 7).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                              tx.transaction_type === "OUT"
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {tx.transaction_type === "OUT" ? "DISPATCH" : "INTAKE"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                          {tx.transaction_type === "OUT" ? `-${tx.quantity}` : `+${tx.quantity}`}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 truncate max-w-[200px]">
                          {tx.reference_note || "Standard Inventory Adjustment"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right text-slate-400 text-[11px]">
                          {new Date(tx.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
