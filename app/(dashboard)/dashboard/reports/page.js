"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

const TIMEFRAMES = [
  { id: 7, label: "Last 7 days" },
  { id: 14, label: "Last 14 days" },
  { id: 30, label: "Last 30 days" },
];

export default function InventoryRunwayReport() {
  const { businessId, businessName, loading: ctxLoading } =
    useBusinessContext();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDays, setSelectedDays] = useState(14);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // ── Fetch Telemetry Data ─────────────────────────────────────
  async function loadData() {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);

      // 1. Fetch Orders
      const { data: ords } = await supabase
        .from("orders")
        .select("id, total_amount, status, courier, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      // 2. Fetch Products with Variants
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, category, variants(id, price, stock_quantity, attributes)")
        .eq("business_id", businessId);

      // 3. Fetch Stock Transactions (OUT dispatches)
      const { data: txs } = await supabase
        .from("stock_transactions")
        .select("product_id, variant_id, transaction_type, quantity, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      setOrders(ords || []);
      setProducts(prods || []);
      setTransactions(txs || []);
    } catch (err) {
      console.warn("Inventory report data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!ctxLoading && businessId) {
      loadData();
    }
  }, [businessId, ctxLoading]);

  // ── Executive Metrics Computation ───────────────────────────
  const executiveMetrics = useMemo(() => {
    const totalGmv = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const orderCount = orders.length;
    const aov = orderCount > 0 ? totalGmv / orderCount : 0;
    const dispatchedCount = orders.filter(
      (o) => (o.status || "").toUpperCase() === "DISPATCHED"
    ).length;

    const totalUnitsShipped = transactions
      .filter((t) => (t.transaction_type || "").toUpperCase() === "OUT")
      .reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);

    return {
      totalGmv,
      orderCount,
      aov,
      dispatchedOrders: dispatchedCount,
      unitsShipped: totalUnitsShipped || dispatchedCount,
    };
  }, [orders, transactions]);

  // ── Sales Velocity & Stock Runway Engine ────────────────────
  const forecastItems = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);

    const recentTx = transactions.filter(
      (t) =>
        new Date(t.created_at) >= cutoffDate &&
        (t.transaction_type || "").toUpperCase() === "OUT"
    );

    return products.map((product) => {
      const variants = product.variants || [];
      const totalStock = variants.reduce(
        (sum, v) => sum + (Number(v.stock_quantity) || 0),
        0
      );

      const unitsSold = recentTx
        .filter((t) => t.product_id === product.id)
        .reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);

      const dailyVelocity = parseFloat(
        (unitsSold / Math.max(1, selectedDays)).toFixed(2)
      );

      let daysUntilStockout = 999;
      let riskLevel = "OPTIMAL";

      if (totalStock <= 0) {
        daysUntilStockout = 0;
        riskLevel = "OUT_OF_STOCK";
      } else if (dailyVelocity > 0) {
        daysUntilStockout = Math.round(totalStock / dailyVelocity);
        if (daysUntilStockout <= 5) {
          riskLevel = "CRITICAL";
        } else if (daysUntilStockout <= 14) {
          riskLevel = "WARNING";
        } else {
          riskLevel = "HEALTHY";
        }
      } else {
        riskLevel = totalStock > 0 ? "DEADSTOCK" : "OUT_OF_STOCK";
      }

      // 30-day recommended restock buffer
      const target30DayBuffer = Math.ceil(dailyVelocity * 30);
      const recommendedRestock = Math.max(
        0,
        target30DayBuffer > 0 ? target30DayBuffer - totalStock : 0
      );

      return {
        id: product.id,
        name: product.name || "Unnamed SKU",
        category: product.category || "General",
        totalStock,
        unitsSold,
        dailyVelocity,
        daysUntilStockout,
        riskLevel,
        recommendedRestock,
      };
    });
  }, [products, transactions, selectedDays]);

  // ── Restock Recommendations ──────────────────────────────────
  const restockAdvisories = useMemo(() => {
    const advisories = [];

    const criticalItems = forecastItems.filter(
      (item) => item.riskLevel === "CRITICAL"
    );
    criticalItems.slice(0, 2).forEach((item) => {
      advisories.push({
        level: "critical",
        badge: "Stockout Imminent",
        dotColor: "bg-rose-500",
        borderColor: "border-rose-900/60 bg-rose-950/30",
        textColor: "text-rose-300 font-semibold",
        headline: `${item.name} · ~${item.daysUntilStockout} days remaining`,
        detail: `Depleting at ${item.dailyVelocity} units/day with ${item.totalStock} units left. Reorder ${item.recommendedRestock} units immediately to sustain a 30-day buffer.`,
      });
    });

    const warningItems = forecastItems.filter(
      (item) => item.riskLevel === "WARNING"
    );
    if (warningItems.length > 0) {
      const top = warningItems[0];
      advisories.push({
        level: "warning",
        badge: "Low Runway Buffer",
        dotColor: "bg-amber-500",
        borderColor: "border-amber-900/60 bg-amber-950/30",
        textColor: "text-amber-300 font-semibold",
        headline: `${top.name} · ~${top.daysUntilStockout} days remaining`,
        detail: `Runway is below target safety threshold. Current inventory will sustain fulfillment for approximately two weeks at current sales velocity.`,
      });
    }

    const deadstock = forecastItems.filter(
      (item) => item.riskLevel === "DEADSTOCK" && item.totalStock > 10
    );
    if (deadstock.length > 0) {
      const sample = deadstock[0];
      advisories.push({
        level: "stagnant",
        badge: "Capital Optimization",
        dotColor: "bg-slate-500",
        borderColor: "border-slate-800 bg-slate-900/60",
        textColor: "text-slate-200 font-semibold",
        headline: `${sample.name} · 0 dispatches in ${selectedDays} days`,
        detail: `${sample.totalStock} units idle in warehouse. Consider discount promotions or bundle placement to release working capital.`,
      });
    }

    if (advisories.length === 0) {
      advisories.push({
        level: "healthy",
        badge: "Optimal Equilibrium",
        dotColor: "bg-emerald-500",
        borderColor: "border-emerald-900/60 bg-emerald-950/30",
        textColor: "text-emerald-300 font-semibold",
        headline: "Inventory runways are balanced across active catalog SKUs",
        detail: "Current stock quantities maintain safe coverage buffers based on rolling fulfillment trends.",
      });
    }

    return advisories;
  }, [forecastItems, selectedDays]);

  // ── Filtered Rows ────────────────────────────────────────────
  const filteredForecast = useMemo(() => {
    return forecastItems.filter((item) => {
      if (riskFilter !== "ALL" && item.riskLevel !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [forecastItems, riskFilter, searchQuery]);

  // ── Export CSV Handler ───────────────────────────────────────
  function handleExportCsv() {
    if (forecastItems.length === 0) return;
    const headers = [
      "Product SKU",
      "Category",
      "Current Stock",
      "Sales Velocity (units/day)",
      "Units Dispatched in Window",
      "Runway Days",
      "Risk Status",
      "Recommended Reorder",
    ];
    const rows = forecastItems.map((f) => [
      `"${f.name}"`,
      `"${f.category}"`,
      f.totalStock,
      f.dailyVelocity,
      f.unitsSold,
      f.daysUntilStockout === 999 ? "Stable" : f.daysUntilStockout,
      `"${f.riskLevel}"`,
      f.recommendedRestock,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `inventory_forecast_${new Date().toISOString().split("T")[0]}.csv`
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
            Calculating stock velocity and runway projections…
          </p>
        </div>
      </main>
    );
  }

  const catalogHealthPercent =
    products.length > 0
      ? Math.round(
          (forecastItems.filter(
            (i) => i.riskLevel === "HEALTHY" || i.riskLevel === "OPTIMAL"
          ).length /
            products.length) *
            100
        )
      : 100;

  return (
    <main className="min-h-screen bg-[#0b1120] text-[#fafafa] pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── TOP HEADER SECTION ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#1e293b]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span className="font-semibold text-slate-200">{businessName || "Workspace"}</span>
              <span className="text-slate-600">/</span>
              <span className="text-orange-500 font-semibold">Demand Forecasting &amp; Runway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fafafa]">
              Inventory Intelligence &amp; Forecasting
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time sales velocity, runway depletion projections, and restock advisories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Selector */}
            <div className="flex items-center p-1 rounded-xl bg-[#131d31] border border-[#1e293b]">
              {TIMEFRAMES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedDays(id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold btn-tactile transition ${
                    selectedDays === id
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1e293b] bg-[#131d31] px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-xs hover:bg-[#1e293b] hover:text-[#fafafa] btn-tactile transition"
              title="Export report as CSV"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-[#1e293b] bg-[#131d31] text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] btn-tactile transition shadow-xs disabled:opacity-50"
              title="Refresh dataset"
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

        {/* ── METRIC CARDS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Gross Merchandise Value
              </span>
              <span className="p-1.5 rounded-lg bg-orange-950/60 border border-orange-800/80 text-orange-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-orange-400 tracking-tight font-mono">
              ৳{Math.round(executiveMetrics.totalGmv).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              From {executiveMetrics.orderCount} customer orders
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Dispatched Units
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight font-mono">
              {executiveMetrics.unitsShipped.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {executiveMetrics.dispatchedOrders} consignments delivered
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Average Order Value
              </span>
              <span className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-800/80 text-teal-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-teal-400 tracking-tight font-mono">
              ৳{Math.round(executiveMetrics.aov).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Per finalized checkout
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs card-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Safe Buffer Coverage
              </span>
              <span className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-800/80 text-teal-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight font-mono">
              {catalogHealthPercent}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              SKUs maintaining safe inventory
            </div>
          </div>
        </div>

        {/* ── RESTOCK ADVISORIES (Clean Pro Panel) ─────────────── */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#131d31] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Inventory Replenishment Advisories
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Computed over rolling {selectedDays}-day sales velocity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {restockAdvisories.map((adv, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${adv.borderColor} space-y-1.5 transition`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${adv.dotColor}`} />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      {adv.badge}
                    </span>
                  </div>
                </div>
                <div className={`text-xs ${adv.textColor}`}>
                  {adv.headline}
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {adv.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All SKUs" },
              { id: "CRITICAL", label: "Stockout Imminent" },
              { id: "WARNING", label: "Low Runway" },
              { id: "HEALTHY", label: "Healthy Buffer" },
              { id: "DEADSTOCK", label: "Stagnant" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRiskFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold btn-tactile transition ${
                  riskFilter === id
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
              placeholder="Filter by product or category…"
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
          </div>
        </div>

        {/* ── PREDICTIVE MATRIX TABLE ───────────────────────────── */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1e293b] flex items-center justify-between text-xs font-mono text-slate-400 bg-[#0b1120]/80">
            <span className="font-bold text-slate-200">RUNWAY MATRIX ({filteredForecast.length} SKUs)</span>
            <span className="text-[11px] text-slate-500">
              Runway = Available Stock ÷ Rolling Daily Velocity
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-[#1e293b] text-left text-xs">
              <thead className="bg-[#0b1120] text-slate-400 uppercase text-[10px] font-mono tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3 font-bold">SKU / Product</th>
                  <th className="px-5 py-3 font-bold">Category</th>
                  <th className="px-5 py-3 font-bold font-mono">Stock</th>
                  <th className="px-5 py-3 font-bold font-mono">Velocity</th>
                  <th className="px-5 py-3 font-bold font-mono">Runway</th>
                  <th className="px-5 py-3 font-bold font-mono">Reorder Target</th>
                  <th className="px-5 py-3 font-bold text-right font-mono">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] bg-[#131d31]">
                {filteredForecast.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-500 font-mono">
                      No matching products found in catalog.
                    </td>
                  </tr>
                ) : (
                  filteredForecast.map((item) => {
                    const isCritical = item.riskLevel === "CRITICAL" || item.riskLevel === "OUT_OF_STOCK";
                    const isWarning = item.riskLevel === "WARNING";
                    const isHealthy = item.riskLevel === "HEALTHY" || item.riskLevel === "OPTIMAL";

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 text-[#fafafa] font-semibold">
                          {item.name}
                        </td>

                        <td className="px-5 py-3.5 text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono font-medium border border-slate-700">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-slate-100 font-mono font-bold">
                          {item.totalStock} <span className="text-[10px] text-slate-500 font-normal">units</span>
                        </td>

                        <td className="px-5 py-3.5 text-slate-300 font-mono">
                          {item.dailyVelocity}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">/ day</span>
                        </td>

                        <td className="px-5 py-3.5">
                          {item.daysUntilStockout === 999 ? (
                            <span className="text-slate-500 font-mono text-[11px]">No burn rate</span>
                          ) : (
                            <div className="space-y-1 w-28">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span
                                  className={
                                    isCritical
                                      ? "text-rose-400 font-bold"
                                      : isWarning
                                      ? "text-amber-400 font-bold"
                                      : "text-emerald-400 font-bold"
                                  }
                                >
                                  {item.daysUntilStockout} days
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    isCritical
                                      ? "bg-rose-500"
                                      : isWarning
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(5, (item.daysUntilStockout / 30) * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 font-mono">
                          {item.recommendedRestock > 0 ? (
                            <span className="text-rose-300 font-bold bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-800/80 text-[11px]">
                              +{item.recommendedRestock} units
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Adequate</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? "bg-rose-950/40 text-rose-300 border border-rose-800/80"
                                : isWarning
                                ? "bg-amber-950/40 text-amber-300 border border-amber-800/80"
                                : isHealthy
                                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/80"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isCritical
                                  ? "bg-rose-400"
                                  : isWarning
                                  ? "bg-amber-400"
                                  : isHealthy
                                  ? "bg-emerald-400"
                                  : "bg-slate-500"
                              }`}
                            />
                            {item.riskLevel.replace(/_/g, " ")}
                          </span>
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
