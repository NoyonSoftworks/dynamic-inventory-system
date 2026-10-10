"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

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

export default function ReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(0); // index into FILTERS

  // ── fetch on mount + filter change ──────────────────
  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const from = FILTERS[activeFilter].from();

      let query = supabase
        .from("stock_transactions")
        .select("*, products(name, category), variants(attributes, price)")
        .order("created_at", { ascending: false });

      if (from) {
        query = query.gte("created_at", from.toISOString());
      }

      const { data } = await query;
      setTransactions(data || []);
      setLoading(false);
    }
    fetch();
  }, [activeFilter]);

  // ── computed stats ──────────────────────────────────
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── header ───────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Daily Reports
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Transaction history and stock movement analytics.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/operations"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              ⚙ Operations
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

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
            sub={stats.totalIn - stats.totalOut >= 0 ? "Stock grew" : "Stock reduced"}
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

        {/* ── filter tabs ──────────────────────────── */}
        <div className="flex flex-wrap gap-2">
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
                          ? Object.entries(tx.variants.attributes)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="inline-flex mr-1.5 mb-1 items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                >
                                  {k}: {v}
                                </span>
                              ))
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
