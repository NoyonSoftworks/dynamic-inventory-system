"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── date helpers ─────────────────────────────────────────
function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

const FILTERS = [
  { label: "Today", from: () => startOfDay(new Date()) },
  { label: "Last 7 Days", from: () => daysAgo(7) },
  { label: "Last 30 Days", from: () => daysAgo(30) },
  { label: "All Time", from: () => null },
];

const LOW_STOCK_THRESHOLD = 5;

function ReportsContent() {
  const { businessId, loading: ctxLoading } = useBusinessContext();
  const [transactions, setTransactions] = useState([]);
  const [lowStockVariants, setLowStockVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0);

  // ── fetch transactions ─────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      if (ctxLoading) return;
      if (!businessId) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const from = FILTERS[activeFilter].from();

      let query = supabase
        .from("stock_transactions")
        .select("*, products(name, category), variants(attributes, price, stock_quantity)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (from) {
        query = query.gte("created_at", from.toISOString());
      }

      const { data } = await query;
      setTransactions(data || []);
      setLoading(false);
    }
    fetchData();
  }, [activeFilter, businessId, ctxLoading]);

  // ── fetch low stock variants ───────────────────────────
  useEffect(() => {
    async function fetchLow() {
      if (!businessId) {
        setLowStockVariants([]);
        return;
      }

      let vQuery = supabase
        .from("variants")
        .select("id, price, stock_quantity, attributes, products(name, category, business_id)")
        .lt("stock_quantity", LOW_STOCK_THRESHOLD)
        .order("stock_quantity", { ascending: true });

      // If variants has business_id column, filter by it directly
      const { data, error } = await vQuery.eq("business_id", businessId);

      if (!error && data) {
        setLowStockVariants(data);
      } else {
        // Fallback filter by joined product business_id
        const fallback = await supabase
          .from("variants")
          .select("id, price, stock_quantity, attributes, products(name, category, business_id)")
          .lt("stock_quantity", LOW_STOCK_THRESHOLD)
          .order("stock_quantity", { ascending: true });
        const filtered = (fallback.data || []).filter(
          (v) => v.products?.business_id === businessId
        );
        setLowStockVariants(filtered);
      }
    }
    fetchLow();
  }, [transactions, businessId]); // re-fetch when transactions change

  // ── computed stats ─────────────────────────────────────
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let inCount = 0;
    let outCount = 0;

    for (const tx of transactions) {
      if (tx.transaction_type === "IN") {
        totalIn += tx.quantity;
        inCount++;
      } else {
        totalOut += tx.quantity;
        outCount++;
      }
    }
    return { totalIn, totalOut, inCount, outCount, total: transactions.length };
  }, [transactions]);

  // ── today's sales summary (grouped by variant) ────────
  const todaySummary = useMemo(() => {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayTx = transactions.filter(
      (tx) =>
        tx.transaction_type === "OUT" &&
        tx.created_at >= todayStart
    );

    const grouped = {};
    for (const tx of todayTx) {
      const attrs = tx.variants?.attributes || {};
      const label =
        Object.values(attrs).join(", ") ||
        `Variant`;
      const productName = tx.products?.name || "Unknown";
      const key = `${productName} — ${label}`;

      grouped[key] = (grouped[key] || 0) + tx.quantity;
    }

    return Object.entries(grouped).map(([name, qty]) => ({ name, qty }));
  }, [transactions]);

  // ── CSV export ─────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (transactions.length === 0) return;

    const headers = [
      "Date/Time",
      "Product",
      "Category",
      "Variant Details",
      "Type",
      "Quantity",
      "Note",
    ];

    const rows = transactions.map((tx) => {
      const variantDetails = tx.variants?.attributes
        ? Object.entries(tx.variants.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ")
        : "";

      return [
        new Date(tx.created_at).toLocaleString(),
        tx.products?.name || "",
        tx.products?.category || "",
        variantDetails,
        tx.transaction_type,
        tx.quantity,
        tx.reference_note || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-report-${FILTERS[activeFilter].label.replace(/\s/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactions, activeFilter]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── header ───────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Daily Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Transaction history, stock alerts, and exportable reports.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <DownloadIcon /> Download CSV
            </button>
          </div>
        </div>

        {/* ── low stock alerts ─────────────────────── */}
        {lowStockVariants.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h2 className="text-lg font-bold text-amber-800">
                Low Stock Alerts
              </h2>
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {lowStockVariants.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockVariants.map((v) => {
                const attrs = v.attributes || {};
                const attrStr = Object.entries(attrs)
                  .map(([k, val]) => `${k}: ${val}`)
                  .join(", ");
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg bg-white border border-amber-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {v.products?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">{attrStr || "No attributes"}</p>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        v.stock_quantity === 0
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      {v.stock_quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── today's sales summary ───────────────── */}
        {todaySummary.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg">
            <h2 className="text-lg font-bold opacity-90">
              Today&apos;s Sales Summary
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {todaySummary.map((item) => (
                <span
                  key={item.name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1.5 text-sm font-medium"
                >
                  {item.name}{" "}
                  <span className="rounded-full bg-white text-indigo-700 px-2 py-0.5 text-xs font-bold">
                    {item.qty}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm opacity-70">
              Total:{" "}
              {todaySummary.reduce((s, i) => s + i.qty, 0)} units sold today
            </p>
          </div>
        )}

        {/* ── stat cards ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Sold (OUT)"
            value={stats.totalOut.toLocaleString()}
            sub={`${stats.outCount} transactions`}
            gradient="from-red-500 to-rose-600"
            icon="↓"
          />
          <StatCard
            label="Total Restocked (IN)"
            value={stats.totalIn.toLocaleString()}
            sub={`${stats.inCount} transactions`}
            gradient="from-emerald-500 to-green-600"
            icon="↑"
          />
          <StatCard
            label="Net Movement"
            value={(stats.totalIn - stats.totalOut).toLocaleString()}
            sub={
              stats.totalIn - stats.totalOut >= 0
                ? "Stock grew"
                : "Stock reduced"
            }
            gradient="from-indigo-500 to-violet-600"
            icon="⇅"
          />
          <StatCard
            label="Total Transactions"
            value={stats.total}
            sub={FILTERS[activeFilter].label}
            gradient="from-amber-500 to-orange-600"
            icon="#"
          />
        </div>

        {/* ── filter tabs + CSV ────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(i)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                i === activeFilter
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── table ────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
          {loading ? (
            <SkeletonRows />
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-4xl">📭</p>
              <h3 className="mt-3 text-lg font-semibold text-gray-700">
                No transactions found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try a different date filter or record a stock operation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-600">
                  <tr>
                    {[
                      "Date / Time",
                      "Product",
                      "Category",
                      "Variant Details",
                      "Type",
                      "Quantity",
                      "Note",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-200"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      } hover:bg-indigo-50/30 transition`}
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900">
                        {tx.products?.name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                          {tx.products?.category || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {tx.variants?.attributes
                          ? Object.entries(tx.variants.attributes).map(
                              ([k, v]) => (
                                <span
                                  key={k}
                                  className="inline-flex mr-1.5 mb-1 items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                >
                                  {k}: {v}
                                </span>
                              )
                            )
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            tx.transaction_type === "IN"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                          }`}
                        >
                          {tx.transaction_type === "IN" ? "↑ IN" : "↓ OUT"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-bold text-gray-800">
                        {tx.quantity.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {tx.reference_note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── stat card ────────────────────────────────────────────
function StatCard({ label, value, sub, gradient, icon }) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <span className="text-2xl opacity-60">{icon}</span>
      </div>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs opacity-70">{sub}</p>
    </div>
  );
}

// ── skeleton rows ────────────────────────────────────────
function SkeletonRows() {
  const rows = Array.from({ length: 6 });
  const cols = Array.from({ length: 7 });
  return (
    <div className="animate-pulse">
      <div className="flex gap-4 bg-slate-200 px-5 py-4">
        {cols.map((_, i) => (
          <div key={i} className="h-3 w-20 rounded bg-slate-300" />
        ))}
      </div>
      {rows.map((_, ri) => (
        <div
          key={ri}
          className="flex gap-4 border-b border-gray-100 px-5 py-4"
        >
          {cols.map((_, ci) => (
            <div
              key={ci}
              className="h-3 rounded bg-gray-200"
              style={{ width: `${50 + ci * 15}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── download icon ────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </main>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
