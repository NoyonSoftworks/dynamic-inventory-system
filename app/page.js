"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("products")
        .select("*, variants(*)")
        .order("created_at", { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    }

    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* ── header ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Inventory Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of all products and their variants.
            </p>
          </div>

          <Link
            href="/add-product"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none transition"
          >
            <PlusIcon />
            Add New Product
          </Link>
        </div>

        {/* ── error ──────────────────────────────────── */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── table card ─────────────────────────────── */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
          {loading ? (
            <SkeletonTable />
          ) : products.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-600 to-indigo-500">
                  <tr>
                    {[
                      "Product Name",
                      "Category",
                      "Total Variants",
                      "Total Stock",
                      "Created Date",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-indigo-100"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {products.map((product, idx) => {
                    const variants = product.variants || [];
                    const totalStock = variants.reduce(
                      (sum, v) => sum + (v.stock_quantity ?? 0),
                      0
                    );

                    return (
                      <tr
                        key={product.id}
                        className={
                          idx % 2 === 0
                            ? "bg-white hover:bg-indigo-50/40 transition"
                            : "bg-slate-50/60 hover:bg-indigo-50/40 transition"
                        }
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                            {product.category}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {variants.length}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={
                              totalStock > 0
                                ? "font-semibold text-emerald-600"
                                : "font-semibold text-red-500"
                            }
                          >
                            {totalStock.toLocaleString()}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(product.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── summary cards ──────────────────────────── */}
        {!loading && products.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Products"
              value={products.length}
              color="indigo"
            />
            <StatCard
              label="Total Variants"
              value={products.reduce(
                (s, p) => s + (p.variants?.length || 0),
                0
              )}
              color="violet"
            />
            <StatCard
              label="Total Stock"
              value={products
                .reduce(
                  (s, p) =>
                    s +
                    (p.variants || []).reduce(
                      (vs, v) => vs + (v.stock_quantity ?? 0),
                      0
                    ),
                  0
                )
                .toLocaleString()}
              color="emerald"
            />
          </div>
        )}
      </div>
    </main>
  );
}

// ── stat card ────────────────────────────────────────────
const palette = {
  indigo: "from-indigo-500 to-indigo-600",
  violet: "from-violet-500 to-violet-600",
  emerald: "from-emerald-500 to-emerald-600",
};

function StatCard({ label, value, color }) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${palette[color]} p-5 text-white shadow-lg`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ── empty state ──────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BoxIcon />
      <h3 className="mt-4 text-lg font-semibold text-gray-700">
        No products yet
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Get started by adding your first product.
      </p>
      <Link
        href="/add-product"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
      >
        <PlusIcon size={16} /> Add Product
      </Link>
    </div>
  );
}

// ── skeleton table ───────────────────────────────────────
function SkeletonTable() {
  const rows = Array.from({ length: 5 });
  const cols = Array.from({ length: 5 });

  return (
    <div className="animate-pulse">
      {/* header */}
      <div className="flex gap-4 bg-indigo-100 px-6 py-4">
        {cols.map((_, i) => (
          <div key={i} className="h-3 w-28 rounded bg-indigo-200" />
        ))}
      </div>
      {/* rows */}
      {rows.map((_, ri) => (
        <div
          key={ri}
          className="flex gap-4 border-b border-gray-100 px-6 py-4"
        >
          {cols.map((_, ci) => (
            <div
              key={ci}
              className="h-3 rounded bg-gray-200"
              style={{ width: `${60 + ci * 20}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── icons ────────────────────────────────────────────────
function PlusIcon({ size = 18 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={48}
      height={48}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      className="text-gray-300"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}
