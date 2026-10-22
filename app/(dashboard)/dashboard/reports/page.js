"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import PurchaseOrderModal from "@/components/PurchaseOrderModal";

const TIMEFRAMES = [
  { id: 7, label: "Last 7 days" },
  { id: 14, label: "Last 14 days" },
  { id: 30, label: "Last 30 days" },
];

export default function InventoryRunwayReport() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDays, setSelectedDays] = useState(14);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // ── Purchase Order Modal State (Module 3) ───────────────────
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poItems, setPoItems] = useState([]);

  // ── Real Operational Expenses & Ad Spend State ─────────────
  const [expensesData, setExpensesData] = useState({
    totalExpenses: 0,
    adSpendTotal: 0,
    packagingTotal: 0,
    salariesRentTotal: 0,
    utilitiesMiscTotal: 0,
  });

  // ── Deadstock Bundle Action Plan State (Module 2) ───────────
  const [bundlePlanOpen, setBundlePlanOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Fetch Store Summary Data ─────────────────────────────────
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

      // 2. Fetch Products with Variants (including accurate cost_price)
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, category, cost_price, variants(id, price, cost_price, stock_quantity, attributes)")
        .eq("business_id", businessId);

      // 3. Fetch Stock Transactions (OUT dispatches)
      const { data: txs } = await supabase
        .from("stock_transactions")
        .select("product_id, variant_id, transaction_type, quantity, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      // 4. Fetch Real Recorded Operational Expenses & Digital Ad Spend
      try {
        const expRes = await fetch("/api/expenses?timeframe=all");
        const expJson = await expRes.json();
        if (expJson.success && expJson.summary) {
          setExpensesData(expJson.summary);
        }
      } catch (expErr) {
        console.warn("Expense data load notice:", expErr);
      }

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

  // ── True Unit Economics & Net Profit Engine (Module 2) ────────
  const financialMetrics = useMemo(() => {
    const totalGmv = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const orderCount = orders.length;
    const aov = orderCount > 0 ? totalGmv / orderCount : 0;
    const dispatchedCount = orders.filter(
      (o) => (o.status || "").toUpperCase() === "DISPATCHED"
    ).length;

    const totalUnitsShipped = transactions
      .filter((t) => (t.transaction_type || "").toUpperCase() === "OUT")
      .reduce((sum, t) => sum + (Number(t.quantity) || 1), 0);

    // Accurate COGS: Calculate from real product cost_price if recorded, otherwise standard 60% baseline
    let realCatalogCostRatio = null;
    if (products.length > 0) {
      let sumCost = 0;
      let sumPrice = 0;
      products.forEach((p) => {
        const v = p.variants?.[0];
        const cost = Number(v?.cost_price) || Number(p.cost_price) || 0;
        const price = Number(v?.price) || 0;
        if (cost > 0 && price > 0) {
          sumCost += cost;
          sumPrice += price;
        }
      });
      if (sumPrice > 0 && sumCost > 0) {
        realCatalogCostRatio = sumCost / sumPrice;
      }
    }
    const estimatedCogs = realCatalogCostRatio !== null ? totalGmv * realCatalogCostRatio : totalGmv * 0.6;
    // 1% COD Fee standard in Bangladesh logistics
    const codFees = totalGmv * 0.01;
    // Real Digital Ad Spend from Expense Ledger
    const totalExp = Number(expensesData?.totalExpenses) || 0;
    const realAdSpend = Number(expensesData?.adSpendTotal) || 0;
    // Real Operating Overheads (Packaging, Rent, Staff, Utilities) from Ledger
    const recordedOverheads = Math.max(0, totalExp - realAdSpend);
    // Packaging & overhead buffer
    const packagingBuffer = recordedOverheads > 0 ? recordedOverheads : (dispatchedCount || orderCount) * 45;

    // True Net Profit Formula:
    // Gross Sales − COGS − COD Fees − Real Digital Ad Spend − Operating Overheads
    const totalDeductions = estimatedCogs + codFees + realAdSpend + packagingBuffer;
    const estimatedNetProfit = Math.max(0, totalGmv - totalDeductions);
    const netMarginPercent = totalGmv > 0 ? Number(((estimatedNetProfit / totalGmv) * 100).toFixed(1)) : 0;

    return {
      totalGmv,
      orderCount,
      aov,
      dispatchedOrders: dispatchedCount,
      unitsShipped: totalUnitsShipped || dispatchedCount,
      estimatedCogs,
      codFees,
      realAdSpend,
      packagingBuffer,
      totalDeductions,
      estimatedNetProfit,
      netMarginPercent,
      hasRealExpenses: recordedOverheads > 0 || realAdSpend > 0,
    };
  }, [orders, transactions, expensesData]);

  // ── Sales Velocity & Stock Runway Engine ────────────────────
  const forecastItems = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);

    const productSoldUnits = {};
    transactions.forEach((tx) => {
      const txDate = new Date(tx.created_at);
      if (
        txDate >= cutoffDate &&
        (tx.transaction_type || "").toUpperCase() === "OUT"
      ) {
        const pId = tx.product_id;
        const qty = Number(tx.quantity) || 1;
        productSoldUnits[pId] = (productSoldUnits[pId] || 0) + qty;
      }
    });

    return products.map((product) => {
      const variantsList = product.variants || [];
      const totalStock = variantsList.reduce(
        (sum, v) => sum + (Number(v.stock_quantity) || 0),
        0
      );
      const retailPrice = Number(variantsList[0]?.price) || 850;
      const realCostPrice = Number(variantsList[0]?.cost_price) || Number(product.cost_price) || 0;
      const wholesaleCost = realCostPrice > 0 ? realCostPrice : Math.round(retailPrice * 0.6);

      const unitsSold = productSoldUnits[product.id] || 0;
      const dailyVelocity = unitsSold > 0 ? unitsSold / selectedDays : 0;

      let daysUntilStockout = 999;
      if (dailyVelocity > 0) {
        daysUntilStockout = Math.round(totalStock / dailyVelocity);
      } else if (totalStock === 0) {
        daysUntilStockout = 0;
      }

      // Risk Categorization
      let riskLevel = "HEALTHY";
      let recommendedRestock = 0;

      if (totalStock === 0) {
        riskLevel = "OUT_OF_STOCK";
        recommendedRestock = Math.max(20, Math.round(dailyVelocity * 30));
      } else if (daysUntilStockout <= 5) {
        riskLevel = "CRITICAL";
        recommendedRestock = Math.round(dailyVelocity * 30 - totalStock);
      } else if (daysUntilStockout <= 12) {
        riskLevel = "WARNING";
        recommendedRestock = Math.round(dailyVelocity * 21 - totalStock);
      } else if (unitsSold === 0 && totalStock > 0) {
        riskLevel = "DEADSTOCK";
      } else {
        riskLevel = "OPTIMAL";
      }

      return {
        id: product.id,
        name: product.name,
        category: product.category || "General",
        totalStock,
        price: retailPrice,
        wholesaleCost,
        unitsSold,
        dailyVelocity: Number(dailyVelocity.toFixed(1)),
        daysUntilStockout,
        riskLevel,
        recommendedRestock: Math.max(0, recommendedRestock),
      };
    });
  }, [products, transactions, selectedDays]);

  // ── Slow-Moving Stock & Trapped Working Capital (Module 2) ─────
  const deadstockRadar = useMemo(() => {
    const deadItems = forecastItems.filter(
      (item) => item.riskLevel === "DEADSTOCK" && item.totalStock > 0
    );

    const trappedWorkingCapital = deadItems.reduce(
      (sum, item) => sum + item.totalStock * item.wholesaleCost,
      0
    );

    // Hero items with highest velocity
    const heroItems = forecastItems
      .filter((i) => i.unitsSold > 0)
      .sort((a, b) => b.dailyVelocity - a.dailyVelocity);

    const bestHero = heroItems[0] || {
      name: "Top-Selling Hero SKU",
      price: 1200,
    };

    // Construct 1-click Liquidation / Bundle Action Plan
    const bundlePlans = deadItems.slice(0, 3).map((slow, idx) => {
      const combined = slow.price + bestHero.price;
      const bundlePrice = Math.round(combined * 0.85); // 15% clearance discount
      const cashReleased = slow.totalStock * slow.wholesaleCost;

      return {
        id: `bundle-${idx + 1}`,
        slowItem: slow.name,
        heroItem: bestHero.name,
        title: `${bestHero.name} + ${slow.name} [Clearance Pair]`,
        originalPrice: combined,
        bundlePrice,
        discountLabel: "15% OFF",
        cashReleased,
        idleUnits: slow.totalStock,
        strategy: `Pair slow-moving "${slow.name}" (${slow.totalStock} idle units) with "${bestHero.name}" to unlock ৳${cashReleased.toLocaleString()} in locked capital.`,
      };
    });

    return {
      deadItemsCount: deadItems.length,
      trappedWorkingCapital,
      bundlePlans,
      deadItems,
    };
  }, [forecastItems]);

  // Filtered Rows
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

  // Critical restock items for batch PO
  const criticalItems = useMemo(() => {
    return forecastItems.filter(
      (item) => item.riskLevel === "CRITICAL" || item.riskLevel === "OUT_OF_STOCK"
    );
  }, [forecastItems]);

  // Export CSV Handler
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
      <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Calculating stock velocity, unit economics, and trapped working capital…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* ── Purchase Order Modal (Module 3) ────────────────────── */}
      {poModalOpen && (
        <PurchaseOrderModal
          isOpen={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          items={poItems}
          businessName={businessName || "My Store"}
        />
      )}

      {/* ── Toast Notification ─────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── TOP HEADER SECTION ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Profit Intelligence &amp; Stock Runways
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Net margins, COGS deduction, trapped capital, and supplier reorders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch PO Button for Critical Items */}
            {criticalItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPoItems(criticalItems);
                  setPoModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] text-white px-3.5 py-1.5 text-[13px] font-medium shadow-2xs transition cursor-pointer"
                title="Batch generate Purchase Order for all critical items"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Batch PO ({criticalItems.length} critical SKUs)</span>
              </button>
            )}

            {/* Timeframe Selector */}
            <div className="flex items-center p-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
              {TIMEFRAMES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedDays(id)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-medium transition ${
                    selectedDays === id
                      ? "bg-[#EA580C] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              title="Export report as CSV"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
              title="Refresh dataset"
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

        {/* ── MODULE 2: TRUE TAKE-HOME NET PROFIT & UNIT ECONOMICS STRIP ─── */}
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-5">
            {/* Card 1: Gross Merchandise Value */}
            <div className="p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Gross sales (GMV)
              </span>
              <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
                ৳{Math.round(financialMetrics.totalGmv).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                {financialMetrics.orderCount} customer orders
              </div>
            </div>

            {/* Card 2: Estimated Cost of Goods Sold (COGS) */}
            <div className="p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500">
                COGS (Wholesale)
              </span>
              <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
                ৳{Math.round(financialMetrics.estimatedCogs).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Stock replenishment cost
              </div>
            </div>

            {/* Card 3: Digital Ad Spend (Meta & TikTok) */}
            <div className="p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Digital ad spend
              </span>
              <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
                ৳{Math.round(financialMetrics.realAdSpend).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Meta &amp; TikTok campaigns
              </div>
            </div>

            {/* Card 4: Operating Overheads & Courier Fees */}
            <div className="p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Overhead &amp; COD fees
              </span>
              <div className="text-xl font-semibold text-slate-900 tracking-tight font-mono mt-1">
                ৳{Math.round(financialMetrics.codFees + financialMetrics.packagingBuffer).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                1% COD + packaging + rent/wages
              </div>
            </div>

            {/* Card 5: True Take-Home Net Profit */}
            <div className="p-4 space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Take-home net profit
              </span>
              <div className="text-xl font-semibold text-emerald-600 tracking-tight font-mono mt-1">
                ৳{Math.round(financialMetrics.estimatedNetProfit).toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-700 font-mono font-medium mt-1">
                {financialMetrics.netMarginPercent}% final margin
              </div>
            </div>
          </div>

          {/* Ledger Audit Connection Strip */}
          <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] font-mono">
                <span className="text-white font-medium">Take-Home Formula:</span> Gross Sales (৳{Math.round(financialMetrics.totalGmv).toLocaleString()}) − COGS (৳{Math.round(financialMetrics.estimatedCogs).toLocaleString()}) − Ad Spend (৳{Math.round(financialMetrics.realAdSpend).toLocaleString()}) − Overheads (৳{Math.round(financialMetrics.packagingBuffer).toLocaleString()}) = <span className="text-emerald-400 font-medium">৳{Math.round(financialMetrics.estimatedNetProfit).toLocaleString()} Cash</span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 text-[11px]">
              <Link
                href="/dashboard/expenses"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold transition border border-slate-700"
              >
                Log More Expenses ↗
              </Link>
              <Link
                href="/dashboard/reconciliation"
                className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition"
              >
                Audit Courier COD ↗
              </Link>
            </div>
          </div>
        </div>

        {/* ── MODULE 2: SLOW-MOVING STOCK & TRAPPED CAPITAL ─────── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                  Slow-Moving Stock &amp; Capital Report
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stagnant SKUs with zero movement in {selectedDays} days holding locked cash flow.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Trapped Working Capital
                </span>
                <span className="text-xl font-semibold font-mono text-amber-600">
                  ৳{deadstockRadar.trappedWorkingCapital.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setBundlePlanOpen(!bundlePlanOpen)}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              >
                {bundlePlanOpen ? "Hide Action Plan" : "Liquidation Plan"}
              </button>
            </div>
          </div>

          {/* Expandable Liquidation / Bundle Action Plan */}
          {bundlePlanOpen && (
            <div className="pt-2 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {deadstockRadar.bundlePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-medium uppercase text-orange-600">
                        {plan.discountLabel} Liquidation
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {plan.idleUnits} units idle
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                      {plan.title}
                    </h4>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {plan.strategy}
                    </p>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Cash Flow Released
                        </span>
                        <span className="font-mono font-semibold text-emerald-700">
                          ৳{plan.cashReleased.toLocaleString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerToast(`Bundle action plan for "${plan.title}" activated!`)}
                        className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] transition"
                      >
                        Activate Bundle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FILTER & SEARCH TOOLBAR ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All SKUs" },
              { id: "CRITICAL", label: "Stockout Imminent" },
              { id: "WARNING", label: "Low Runway" },
              { id: "HEALTHY", label: "Healthy Buffer" },
              { id: "DEADSTOCK", label: "Stagnant (Dead)" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRiskFilter(id)}
                className={`h-9 px-3 rounded-md text-[13px] font-medium transition cursor-pointer ${
                  riskFilter === id
                    ? "bg-slate-900 text-white shadow-2xs"
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
              placeholder="Filter by product or category…"
              className="w-full sm:w-72 h-9 rounded-md border border-slate-200 bg-white px-3 pl-8 text-[13px] text-slate-900 placeholder-slate-400 font-mono focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 focus:outline-none transition"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* ── STOCK RUNWAY & RESTOCK TABLE (WITH MODULE 3 PO TRIGGER) ─── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-50">
            <span className="font-bold text-slate-900">
              STOCK RUNWAY &amp; RESTOCK FORECAST ({filteredForecast.length} SKUs)
            </span>
            <span className="text-[11px] text-slate-500">
              Click &quot;Generate PO&quot; on any item to create WhatsApp supplier order
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-mono tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3 font-bold">SKU / Product</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold font-mono">Stock</th>
                  <th className="px-4 py-3 font-bold font-mono">Velocity</th>
                  <th className="px-4 py-3 font-bold font-mono">Runway</th>
                  <th className="px-4 py-3 font-bold font-mono">Reorder Target</th>
                  <th className="px-4 py-3 font-bold font-mono">Status</th>
                  <th className="px-4 py-3 font-bold text-right font-mono">Procurement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredForecast.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-500 font-mono">
                      No matching products found in catalog.
                    </td>
                  </tr>
                ) : (
                  filteredForecast.map((item) => {
                    const isCritical = item.riskLevel === "CRITICAL" || item.riskLevel === "OUT_OF_STOCK";
                    const isWarning = item.riskLevel === "WARNING";
                    const isHealthy = item.riskLevel === "HEALTHY" || item.riskLevel === "OPTIMAL";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-slate-900 font-semibold">
                          {item.name}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-medium border border-slate-200">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-900 font-mono font-bold">
                          {item.totalStock} <span className="text-[10px] text-slate-400 font-normal">units</span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-700 font-mono">
                          {item.dailyVelocity}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">/ day</span>
                        </td>

                        <td className="px-4 py-3.5">
                          {item.daysUntilStockout === 999 ? (
                            <span className="text-slate-400 font-mono text-[11px]">No burn rate</span>
                          ) : (
                            <div className="space-y-1 w-24">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span
                                  className={
                                    isCritical
                                      ? "text-rose-600 font-bold"
                                      : isWarning
                                      ? "text-amber-600 font-bold"
                                      : "text-emerald-600 font-bold"
                                  }
                                >
                                  {item.daysUntilStockout} days
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
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

                        <td className="px-4 py-3.5 font-mono">
                          {item.recommendedRestock > 0 ? (
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                              +{item.recommendedRestock} units
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Adequate</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : isWarning
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : isHealthy
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isCritical
                                  ? "bg-rose-500"
                                  : isWarning
                                  ? "bg-amber-500"
                                  : isHealthy
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            {item.riskLevel.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* MODULE 3: 1-Click PO Trigger */}
                        <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setPoItems([item]);
                              setPoModalOpen(true);
                            }}
                            className="btn-tactile inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-xs shadow-2xs transition cursor-pointer"
                            title="Generate Official Purchase Order"
                          >
                            <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>Generate PO</span>
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
    </main>
  );
}
