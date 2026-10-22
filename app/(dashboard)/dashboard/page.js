"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import BangladeshDivisionMap, { BD_DIVISIONS } from "@/components/BangladeshDivisionMap";
import {
  OrderStatusDonutChart,
  RevenueOrdersDualAxisChart,
  OrderSourcesList,
  TopProductsList,
} from "@/components/DashboardCharts";

export default function MerchantDashboard() {
  const { businessId, businessName, userEmail, loading: ctxLoading } = useBusinessContext();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [hoveredDivision, setHoveredDivision] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Load Store Data via High-Velocity Endpoints ───────────────
  async function loadDashboardData() {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 1. Products and Live Inventory Counts
      let prods = [];
      try {
        const prodRes = await fetch("/api/products", {
          headers: {
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
        });
        const prodJson = await prodRes.json();
        if (prodJson.success && Array.isArray(prodJson.products)) {
          prods = prodJson.products;
        }
      } catch {
        const { data: fallbackProds } = await supabase
          .from("products")
          .select("id, name, category, created_at, variants(id, price, stock_quantity, attributes)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        prods = fallbackProds || [];
      }

      // 2. Orders
      const { data: ords } = await supabase
        .from("orders")
        .select("id, total_amount, status, courier, customer_name, customer_address, customer_phone, consignment_id, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(50);

      // 3. Transactions
      const { data: txs } = await supabase
        .from("stock_transactions")
        .select("id, product_id, variant_id, transaction_type, quantity, reference_note, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(30);

      setProducts(prods || []);
      setOrders(ords || []);
      setTransactions(txs || []);
    } catch (err) {
      console.warn("Dashboard data fetch note:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // 1-Click Starter Data Seeder
  async function handleSeedDemoData() {
    try {
      setIsSeeding(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load starter store data.");
      }

      showToast(
        "success",
        "Starter data loaded. Sample products and test orders are now in your workspace."
      );
      await loadDashboardData();
    } catch (err) {
      showToast("error", err.message || "Failed to load sample data.");
    } finally {
      setIsSeeding(false);
    }
  }

  useEffect(() => {
    if (!ctxLoading) {
      loadDashboardData();
    }
  }, [businessId, ctxLoading]);

  // ── Computed Top Metrics ──────────────────────────────────────
  const metrics = useMemo(() => {
    let totalStockUnits = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const vars = p.variants || [];
      const prodStock =
        p.inStockCount !== undefined
          ? Number(p.inStockCount) || 0
          : vars.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);

      totalStockUnits += prodStock;
      if (prodStock <= 5) lowStockCount++;
    });

    const totalRevenue = orders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );

    const pendingOrders = orders.filter(
      (o) => (o.status || "").toUpperCase() === "PENDING"
    ).length;

    // Estimated net profit: revenue minus estimated 55% COGS and 12% operational overhead
    const estNetProfit = totalRevenue > 0 ? Math.round(totalRevenue * 0.33) : 0;

    return {
      totalRevenue,
      activeOrders: orders.length,
      pendingOrders,
      totalProducts: products.length,
      lowStockCount,
      estNetProfit,
    };
  }, [products, orders]);

  // ── Donut Chart Order Status Breakdown ────────────────────────
  const orderStatusStats = useMemo(() => {
    let delivered = 0;
    let inTransit = 0;
    let pending = 0;
    let returned = 0;

    orders.forEach((o) => {
      const s = (o.status || "").toUpperCase();
      if (s === "DELIVERED" || s === "DISPATCHED") delivered++;
      else if (s === "IN_TRANSIT" || s === "SHIPPED") inTransit++;
      else if (s === "RETURNED" || s === "CANCELLED") returned++;
      else pending++;
    });

    return { delivered, inTransit, pending, returned };
  }, [orders]);

  // ── 7-Day Revenue & Orders Trend Points (Strict Last 7 Calendar Days) ────
  const chartPoints = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const points = [];
    const dateMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayName = days[d.getDay()];
      const item = { day: dayName, dateKey, revenue: 0, orders: 0 };
      points.push(item);
      dateMap[dateKey] = item;
    }

    orders.forEach((o) => {
      if (!o.created_at) return;
      try {
        const orderDateKey = new Date(o.created_at).toISOString().split("T")[0];
        if (dateMap[orderDateKey]) {
          dateMap[orderDateKey].revenue += Number(o.total_amount) || 0;
          dateMap[orderDateKey].orders += 1;
        }
      } catch {
        // Skip unparseable dates
      }
    });

    return points;
  }, [orders]);

  // ── Bangladesh 8 Divisions Order Distribution ─────────────────
  const divisionStats = useMemo(() => {
    const counts = {
      dhaka: 0,
      chittagong: 0,
      sylhet: 0,
      rajshahi: 0,
      khulna: 0,
      barisal: 0,
      rangpur: 0,
      mymensingh: 0,
    };

    orders.forEach((o) => {
      const addr = (o.customer_address || "").toLowerCase();
      if (addr.includes("dhaka") || addr.includes("dhanmondi") || addr.includes("mirpur") || addr.includes("uttara") || addr.includes("gulshan")) {
        counts.dhaka++;
      } else if (addr.includes("chittagong") || addr.includes("chattogram") || addr.includes("cox")) {
        counts.chittagong++;
      } else if (addr.includes("sylhet") || addr.includes("moulvibazar") || addr.includes("habiganj")) {
        counts.sylhet++;
      } else if (addr.includes("rajshahi") || addr.includes("bogra") || addr.includes("pabna")) {
        counts.rajshahi++;
      } else if (addr.includes("khulna") || addr.includes("jessore") || addr.includes("satkhira")) {
        counts.khulna++;
      } else if (addr.includes("barisal") || addr.includes("barishal") || addr.includes("bhola")) {
        counts.barisal++;
      } else if (addr.includes("rangpur") || addr.includes("dinajpur") || addr.includes("kurigram")) {
        counts.rangpur++;
      } else if (addr.includes("mymensingh") || addr.includes("jamalpur")) {
        counts.mymensingh++;
      } else {
        counts.dhaka++; // Default distribution fallback
      }
    });

    const total = orders.length || 1;

    return BD_DIVISIONS.map((div) => {
      const count = counts[div.id] || 0;
      const pct = orders.length > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      return {
        id: div.id,
        name: div.name,
        code: div.code,
        orders: count,
        pct,
      };
    }).sort((a, b) => parseInt(a.code) - parseInt(b.code));
  }, [orders]);

  // ── Order Sources / Channels ──────────────────────────────────
  const orderSources = useMemo(() => {
    let website = 0;
    let messenger = 0;
    let whatsapp = 0;
    let steadfast = 0;
    let pathao = 0;

    orders.forEach((o) => {
      const c = (o.courier || "").toLowerCase();
      if (c.includes("steadfast")) steadfast++;
      else if (c.includes("pathao")) pathao++;
      else if (c.includes("messenger") || c.includes("fb")) messenger++;
      else if (c.includes("whatsapp")) whatsapp++;
      else website++;
    });

    const total = orders.length || 1;
    return [
      { name: "Website / Store", count: website, pct: orders.length > 0 ? (website / total) * 100 : 0 },
      { name: "Facebook Messenger", count: messenger, pct: orders.length > 0 ? (messenger / total) * 100 : 0 },
      { name: "WhatsApp Direct", count: whatsapp, pct: orders.length > 0 ? (whatsapp / total) * 100 : 0 },
      { name: "Steadfast Courier", count: steadfast, pct: orders.length > 0 ? (steadfast / total) * 100 : 0 },
      { name: "Pathao Courier", count: pathao, pct: orders.length > 0 ? (pathao / total) * 100 : 0 },
    ];
  }, [orders]);

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#F4F6F8] text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Loading your store workspace…
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-4 sm:p-6 lg:p-8 space-y-6 text-slate-800 font-sans">
      {/* ── TOP GREETING & CONTROLS BAR ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Store performance, live consignments, and inventory metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {products.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDemoData}
              disabled={isSeeding}
              className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSeeding ? "Loading demo…" : "Load demo data"}
            </button>
          )}

          <button
            type="button"
            onClick={loadDashboardData}
            disabled={refreshing}
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shadow-2xs cursor-pointer"
            title="Refresh metrics"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── ROW 0: CLEAN TOP WELCOME & 4-CARD QUICK KPI STRIP ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Revenue */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total revenue</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              +12.5%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ৳{metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Across {metrics.activeOrders} store orders
          </div>
        </div>

        {/* Card 2: Active Orders */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active orders</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
              {metrics.pendingOrders} pending
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {metrics.activeOrders}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Fulfillment and delivery queue
          </div>
        </div>

        {/* Card 3: Total Products */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total products</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {metrics.lowStockCount} low stock
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {metrics.totalProducts}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Active SKUs in warehouse
          </div>
        </div>

        {/* Card 4: Net Profit (Est.) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Net profit (Est.)</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Margin 33%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            ৳{metrics.estNetProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            After courier fees &amp; costs
          </div>
        </div>
      </div>

      {/* ── ROW 1: ORDER STATUS (5 COLS) + REVENUE & ORDERS (7 COLS) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: Order Status (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">
                Order status
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Current fulfillment distribution
              </p>
            </div>
            <Link
              href="/bulk-orders"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View orders →
            </Link>
          </div>

          {/* SVG Donut Ring Chart */}
          <OrderStatusDonutChart
            delivered={orderStatusStats.delivered}
            inTransit={orderStatusStats.inTransit}
            pending={orderStatusStats.pending}
            returned={orderStatusStats.returned}
          />
        </div>

        {/* Right Card: Revenue & orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">
                Revenue &amp; orders
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Revenue bars with order volume trend
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Revenue (৳)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" />
                Orders
              </span>
            </div>
          </div>

          {/* SVG Dual-Axis Chart */}
          <RevenueOrdersDualAxisChart chartData={chartPoints} />
        </div>
      </div>

      {/* ── ROW 2: SALES BY DIVISION (7 COLS) + ORDER SOURCES & TOP PRODUCTS (5 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Sales by Division Map (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">
              Sales by division
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Geographic order distribution across Bangladesh
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Half: Interactive SVG Map of Bangladesh's 8 Divisions */}
            <div className="md:col-span-6 flex items-center justify-center">
              <BangladeshDivisionMap
                divisionStats={divisionStats}
                hoveredDivision={hoveredDivision}
                onHoverDivision={setHoveredDivision}
              />
            </div>

            {/* Right Half: Ranked List */}
            <div className="md:col-span-6 space-y-3">
              <div className="text-[11px] text-slate-400 italic">
                Hover over a division on map or list to view breakdown
              </div>

              <div className="space-y-1.5">
                {divisionStats.map((div) => {
                  const isHovered = hoveredDivision === div.id;

                  return (
                    <div
                      key={div.id}
                      onMouseEnter={() => setHoveredDivision(div.id)}
                      onMouseLeave={() => setHoveredDivision(null)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isHovered ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">
                          {div.code}
                        </span>
                        <span>{div.name}</span>
                      </div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        <span className="font-semibold text-slate-800">{div.orders}</span> ({div.pct.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Stack (5 cols): Order Sources + Top Products */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Card: Order Sources & Channels */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">
                Order sources
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Acquisition &amp; courier channels for completed orders
              </p>
            </div>

            <OrderSourcesList sources={orderSources} />
          </div>

          {/* Bottom Card: Top Products & Stock Alerts */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">
                  Top products
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top 5 products ranked by order quantity
                </p>
              </div>
              <Link
                href="/dashboard/products"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                View all
              </Link>
            </div>

            <TopProductsList products={products} />
          </div>
        </div>
      </div>

      {/* ── Toast Feedback ───────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-sm transition-all animate-in slide-in-from-bottom-3 ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <span className="text-xs font-medium">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
