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
        borderColor: "border-rose-900/40 bg-rose-950/20",
        textColor: "text-rose-200",
        headline: `${item.name} · ~${item.daysUntilStockout} days remaining`,
        detail: `Depleting at ${item.dailyVelocity} units/day with ${item.totalStock} units left in catalog. Reorder ${item.recommendedRestock} units to sustain a 30-day fulfillment buffer.`,
      });
    });

    const warningItems = forecastItems.filter(
      (item) => item.riskLevel === "WARNING"
    );
    if (warningItems.length > 0) {
      const top = warningItems[0];
      advisories.push({
        level: "warning",
        badge: "Low Runway",
        dotColor: "bg-amber-400",
        borderColor: "border-amber-900/40 bg-amber-950/20",
        textColor: "text-amber-200",
        headline: `${top.name} · ~${top.daysUntilStockout} days remaining`,
        detail: `Runway is below target threshold. Current stock will sustain demand for approximately two weeks at current fulfillment rate.`,
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
        dotColor: "bg-zinc-400",
        borderColor: "border-zinc-800 bg-zinc-900/40",
        textColor: "text-zinc-300",
        headline: `${sample.name} · 0 orders in ${selectedDays} days`,
        detail: `${sample.totalStock} units currently holding idle inventory value without sales velocity. Consider promotional bundling or targeted channel placement.`,
      });
    }

    if (advisories.length === 0) {
      advisories.push({
        level: "healthy",
        badge: "Equilibrium",
        dotColor: "bg-emerald-400",
        borderColor: "border-emerald-900/40 bg-emerald-950/20",
        textColor: "text-emerald-200",
        headline: "Inventory runways are balanced across all active SKUs",
        detail: "Current stock quantities maintain safe coverage buffers based on rolling customer fulfillment trends.",
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
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <p className="text-xs font-mono text-zinc-400">
            Calculating inventory velocity and runway projections…
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
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <span>{businessName || "Workspace"}</span>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-300">Inventory Analytics</span>
              </div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
                Demand Forecasting &amp; Runway
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Timeframe Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              {TIMEFRAMES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedDays(id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    selectedDays === id
                      ? "bg-zinc-800 text-zinc-100 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition"
              title="Export report as CSV"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition disabled:opacity-50"
              title="Refresh dataset"
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
        {/* ── METRIC CARDS (Clean Stripe/Swiss Grid) ──────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">
              Total Revenue (GMV)
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              ৳{Math.round(executiveMetrics.totalGmv).toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              {executiveMetrics.orderCount} orders recorded
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">
              Dispatched Volume
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {executiveMetrics.unitsShipped.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              {executiveMetrics.dispatchedOrders} consignments delivered
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">
              Average Order Value
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              ৳{Math.round(executiveMetrics.aov).toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Per finalized checkout
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="text-xs font-medium text-zinc-400">
              Catalog Buffer Coverage
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {catalogHealthPercent}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              SKUs maintaining safe stock levels
            </div>
          </div>
        </div>

        {/* ── RESTOCK ADVISORIES (Clean Enterprise Panel) ────────── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                Inventory Replenishment Advisories
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Computed over rolling {selectedDays}-day sales velocity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {restockAdvisories.map((adv, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border ${adv.borderColor} space-y-1.5 transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${adv.dotColor}`} />
                    <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-zinc-400">
                      {adv.badge}
                    </span>
                  </div>
                </div>
                <div className={`text-xs font-medium ${adv.textColor}`}>
                  {adv.headline}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {adv.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
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
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  riskFilter === id
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
              placeholder="Filter by product or category…"
              className="w-full sm:w-60 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 pl-8 text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:border-zinc-600 focus:outline-none transition"
            />
            <svg
              className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* ── PREDICTIVE MATRIX TABLE (Swiss Precision) ─────────── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>RUNWAY PROJECTIONS ({filteredForecast.length} SKUs)</span>
            <span className="text-[11px] text-zinc-500">
              Runway = Available Stock ÷ Rolling Daily Velocity
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-zinc-800/80 text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">SKU / Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold font-mono">Stock</th>
                  <th className="px-5 py-3 font-semibold font-mono">Velocity</th>
                  <th className="px-5 py-3 font-semibold font-mono">Runway</th>
                  <th className="px-5 py-3 font-semibold font-mono">Reorder Target</th>
                  <th className="px-5 py-3 font-semibold text-right font-mono">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-transparent">
                {filteredForecast.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-zinc-500 font-mono">
                      No matching products found in catalog.
                    </td>
                  </tr>
                ) : (
                  filteredForecast.map((item) => {
                    const isCritical = item.riskLevel === "CRITICAL" || item.riskLevel === "OUT_OF_STOCK";
                    const isWarning = item.riskLevel === "WARNING";
                    const isHealthy = item.riskLevel === "HEALTHY" || item.riskLevel === "OPTIMAL";

                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3.5 text-zinc-200 font-medium">
                          {item.name}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-400">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[11px] font-mono">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-zinc-100 font-mono font-medium">
                          {item.totalStock} <span className="text-[10px] text-zinc-500 font-normal">units</span>
                        </td>

                        <td className="px-5 py-3.5 text-zinc-300 font-mono">
                          {item.dailyVelocity}{" "}
                          <span className="text-[10px] text-zinc-500 font-normal">/ day</span>
                        </td>

                        <td className="px-5 py-3.5">
                          {item.daysUntilStockout === 999 ? (
                            <span className="text-zinc-500 font-mono text-[11px]">No burn rate</span>
                          ) : (
                            <div className="space-y-1 w-28">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span
                                  className={
                                    isCritical
                                      ? "text-rose-400 font-semibold"
                                      : isWarning
                                      ? "text-amber-400 font-semibold"
                                      : "text-emerald-400"
                                  }
                                >
                                  {item.daysUntilStockout} days
                                </span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    isCritical
                                      ? "bg-rose-500"
                                      : isWarning
                                      ? "bg-amber-400"
                                      : "bg-emerald-400"
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
                            <span className="text-rose-300 font-medium bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/50 text-[11px]">
                              +{item.recommendedRestock} units
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Adequate</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              isCritical
                                ? "bg-rose-950/50 text-rose-300 border border-rose-800/60"
                                : isWarning
                                ? "bg-amber-950/50 text-amber-300 border border-amber-800/60"
                                : isHealthy
                                ? "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
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
                                  : "bg-zinc-500"
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
