"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

export default function ProductsListPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── filter & search states ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL | IN_STOCK | OUT_OF_STOCK

  // ── fetch products & live inventory count ────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Wait until tenant context is resolved
      if (ctxLoading) return;

      // 2. If no businessId resolved, set empty array (never query global records)
      if (!businessId) {
        if (isMounted) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 3. Strictly fetch products for THIS tenant workspace
        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });

        if (pErr) throw pErr;

        const prodList = prods || [];
        const inStockCountMap = {};
        const totalItemsMap = {};

        // 4. Fetch inventory items ONLY for this tenant's products
        const prodIds = prodList.map((p) => p.id);

        if (prodIds.length > 0) {
          const { data: items, error: iErr } = await supabase
            .from("inventory_items")
            .select("product_id, status")
            .in("product_id", prodIds);

          if (!iErr && items) {
            items.forEach((item) => {
              totalItemsMap[item.product_id] =
                (totalItemsMap[item.product_id] || 0) + 1;
              if (item.status === "IN_STOCK") {
                inStockCountMap[item.product_id] =
                  (inStockCountMap[item.product_id] || 0) + 1;
              }
            });
          }
        }

        // 5. Merge products with live inventory quantities
        const enriched = prodList.map((p) => ({
          ...p,
          inStockCount: inStockCountMap[p.id] ?? 0,
          totalCount: totalItemsMap[p.id] ?? 0,
        }));

        if (isMounted) {
          setProducts(enriched);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load inventory products.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [businessId, ctxLoading]);

  // ── unique categories for dropdown filter ────────────────
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  // ── filtered products ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search term match (Name or SKU)
      const matchesSearch =
        searchTerm === "" ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.base_sku?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Category filter
      const matchesCategory =
        selectedCategory === "ALL" || p.category === selectedCategory;

      // 3. Stock status filter
      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "IN_STOCK" && p.inStockCount > 0) ||
        (stockFilter === "OUT_OF_STOCK" && p.inStockCount === 0);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // ── stats calculations ───────────────────────────────────
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalInStockUnits = products.reduce((sum, p) => sum + p.inStockCount, 0);
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + (Number(p.price) || 0) * p.inStockCount,
      0
    );
    const outOfStockCount = products.filter((p) => p.inStockCount === 0).length;

    return {
      totalProducts,
      totalInStockUnits,
      totalInventoryValue,
      outOfStockCount,
    };
  }, [products]);

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Page Header ────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
              <span>🏢</span> {businessName || "Pro-Level Inventory"}
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Inventory Catalog
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage physical products, live serialized stock levels, and thermal barcode labels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/products/import"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>📄</span> Bulk Import (CSV)
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition"
            >
              <span>+</span> Add Product Intake
            </Link>
          </div>
        </div>

        {/* ── Summary Stat Cards ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon="📦"
            color="indigo"
          />
          <StatCard
            title="Available Units"
            value={stats.totalInStockUnits.toLocaleString()}
            icon="🏷️"
            color="emerald"
          />
          <StatCard
            title="Stock Value"
            value={`$${stats.totalInventoryValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon="💵"
            color="violet"
          />
          <StatCard
            title="Out of Stock"
            value={stats.outOfStockCount}
            icon="⚠️"
            color={stats.outOfStockCount > 0 ? "rose" : "slate"}
          />
        </div>

        {/* ── Search & Filter Controls ───────────────────── */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Product Name or Base SKU…"
              className="block w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2.5">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Stock Status Select */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* ── Error Banner ───────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Data Table Card ────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/80">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner size={32} />
              <p className="text-sm font-medium">Loading inventory records…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* ── Empty State ──────────────────────────────── */
            <div className="py-16 px-4 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📦
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {searchTerm || selectedCategory !== "ALL" || stockFilter !== "ALL"
                    ? "No matching products found"
                    : "No products in inventory catalog yet"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {searchTerm || selectedCategory !== "ALL" || stockFilter !== "ALL"
                    ? "Try adjusting your search criteria or clear the filters to view all records."
                    : "Get started by adding your first product and generating unique thermal barcodes for physical stock."}
                </p>
              </div>

              {searchTerm || selectedCategory !== "ALL" || stockFilter !== "ALL" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("ALL");
                    setStockFilter("ALL");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Reset Filters
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/dashboard/products/import"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    <span>📄</span> Bulk Import (CSV)
                  </Link>
                  <Link
                    href="/dashboard/products/add"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
                  >
                    <span>+</span> Add Your First Product
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* ── Table Content ────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-600">
                      Product Name
                    </th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-600">
                      Category
                    </th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-600">
                      Base SKU
                    </th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-600">
                      Price
                    </th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-600">
                      In Stock
                    </th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-600 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProducts.map((p, idx) => {
                    const isAvailable = p.inStockCount > 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-indigo-50/30 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        {/* 1. Product Name */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          {p.created_at && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Added {new Date(p.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* 2. Category */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200/60">
                            {p.category || "Uncategorized"}
                          </span>
                        </td>

                        {/* 3. Base SKU */}
                        <td className="px-6 py-4 font-mono font-bold text-xs text-indigo-950">
                          {p.base_sku || "—"}
                        </td>

                        {/* 4. Price */}
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {p.price !== undefined && p.price !== null
                            ? `$${Number(p.price).toFixed(2)}`
                            : "—"}
                        </td>

                        {/* 5. In Stock (Highlighted Badge) */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                              isAvailable
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isAvailable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                              }`}
                            />
                            {p.inStockCount.toLocaleString()} Units
                          </span>
                        </td>

                        {/* 6. Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {/* Print Labels Button */}
                            <Link
                              href={`/dashboard/products/${p.id}/print`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm transition"
                            >
                              <span>🏷️</span> Print Labels
                            </Link>

                            {/* Dispatch / Sell Button */}
                            <Link
                              href={`/dashboard/products/${p.id}/dispatch`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm transition"
                            >
                              <span>⚡</span> Dispatch / Sell
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Stat Card Component ──────────────────────────────────────
function StatCard({ title, value, icon, color }) {
  const colorStyles = {
    indigo: "border-indigo-100 bg-indigo-50/50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50/50 text-violet-700",
    rose: "border-rose-100 bg-rose-50/50 text-rose-700",
    slate: "border-slate-200 bg-slate-50/50 text-slate-700",
  };

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm ${
            colorStyles[color] || colorStyles.indigo
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

// ── Search Icon ──────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

// ── Spinner Icon ─────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-indigo-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
