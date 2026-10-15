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

  // ── Filter & Search States ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL | IN_STOCK | OUT_OF_STOCK

  // ── Fetch Products & Live Inventory Count ────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (ctxLoading) return;

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

        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });

        if (pErr) throw pErr;

        const prodList = prods || [];
        const inStockCountMap = {};
        const totalItemsMap = {};

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

  // ── Unique Categories ────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  // ── Filtered Products ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchTerm === "" ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.base_sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "ALL" || p.category === selectedCategory;

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "IN_STOCK" && p.inStockCount > 0) ||
        (stockFilter === "OUT_OF_STOCK" && p.inStockCount === 0);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // ── Stats Calculations ───────────────────────────────────
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
    <main className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Page Header ────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
              <span className="font-bold text-slate-700">{businessName || "Workspace"}</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-900 font-semibold">Catalog</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Inventory Catalog
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage physical SKU records, serialized stock levels, and thermal barcode labels.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/products/import"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 btn-tactile transition"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Bulk Import (CSV)
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-500 btn-tactile transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Product Intake
            </Link>
          </div>
        </div>

        {/* ── Summary Stat Cards ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            accentColor="orange"
            icon={
              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <StatCard
            title="Available Units"
            value={stats.totalInStockUnits.toLocaleString()}
            accentColor="emerald"
            icon={
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
          <StatCard
            title="Stock Value"
            value={`$${stats.totalInventoryValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            accentColor="teal"
            icon={
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Out of Stock"
            value={stats.outOfStockCount}
            isAlert={stats.outOfStockCount > 0}
            accentColor={stats.outOfStockCount > 0 ? "rose" : "slate"}
            icon={
              <svg className={`w-4 h-4 ${stats.outOfStockCount > 0 ? "text-rose-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>

        {/* ── Search & Filter Controls ───────────────────── */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
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
          <div className="flex items-center gap-2">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
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
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* ── Error Banner ───────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Data Table Card ────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner size={24} />
              <p className="text-xs font-mono text-slate-500">Loading catalog records…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* ── Empty State ──────────────────────────────── */
            <div className="py-16 px-4 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {searchTerm || selectedCategory !== "ALL" || stockFilter !== "ALL"
                    ? "No matching products found"
                    : "No products in inventory catalog yet"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {searchTerm || selectedCategory !== "ALL" || stockFilter !== "ALL"
                    ? "Try adjusting your search criteria or clear filters to view all records."
                    : "Add your first product to generate unique thermal barcodes for physical stock management."}
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 btn-tactile transition"
                >
                  Reset Filters
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Link
                    href="/dashboard/products/import"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 btn-tactile transition"
                  >
                    Bulk Import (CSV)
                  </Link>
                  <Link
                    href="/dashboard/products/add"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-500 btn-tactile transition"
                  >
                    Add Product Intake
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* ── Table Content ────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-mono font-medium uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-5 py-3 font-mono font-medium uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-5 py-3 font-mono font-medium uppercase tracking-wider">
                      Base SKU
                    </th>
                    <th className="px-5 py-3 font-mono font-medium uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-5 py-3 font-mono font-medium uppercase tracking-wider">
                      In Stock
                    </th>
                    <th className="px-5 py-3 font-mono font-medium uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProducts.map((p) => {
                    const isAvailable = p.inStockCount > 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* 1. Product Name */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 hover:text-orange-600 transition-colors">{p.name}</div>
                          {p.created_at && (
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Added {new Date(p.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* 2. Category */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                            {p.category || "Uncategorized"}
                          </span>
                        </td>

                        {/* 3. Base SKU */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex font-mono font-bold text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {p.base_sku || "—"}
                          </span>
                        </td>

                        {/* 4. Price */}
                        <td className="px-5 py-3.5 font-mono text-slate-900 font-bold">
                          {p.price !== undefined && p.price !== null
                            ? `$${Number(p.price).toFixed(2)}`
                            : "—"}
                        </td>

                        {/* 5. In Stock (High-contrast Status Badge) */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                              isAvailable
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isAvailable ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            {p.inStockCount.toLocaleString()} units
                          </span>
                        </td>

                        {/* 6. Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* Print Labels Button */}
                            <Link
                              href={`/dashboard/products/${p.id}/print`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 btn-tactile transition shadow-2xs"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Labels
                            </Link>

                            {/* Dispatch / Sell Button */}
                            <Link
                              href={`/dashboard/products/${p.id}/dispatch`}
                              className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-orange-500 btn-tactile transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                              Dispatch
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
function StatCard({ title, value, icon, isAlert = false, accentColor = "orange" }) {
  const badgeColors = {
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    teal: "bg-teal-50 border-teal-200 text-teal-600",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-600",
    rose: "bg-rose-50 border-rose-200 text-rose-600",
    slate: "bg-slate-100 border-slate-200 text-slate-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 card-lift transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-medium">
          {title}
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${badgeColors[accentColor] || badgeColors.orange}`}>
          {icon}
        </span>
      </div>
      <div
        className={`mt-2 text-xl sm:text-2xl font-bold font-mono tracking-tight ${
          isAlert ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Search Icon ──────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
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
      className="animate-spin text-orange-500"
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
