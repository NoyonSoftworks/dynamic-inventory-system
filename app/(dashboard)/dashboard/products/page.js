"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import PurchaseOrderModal from "@/components/PurchaseOrderModal";

export default function ProductsListPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Purchase Order Modal State (Module 3) ───────────────────
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poSelectedItems, setPoSelectedItems] = useState([]);

  // ── Filter & Search States ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL | IN_STOCK | OUT_OF_STOCK
  const [isSeeding, setIsSeeding] = useState(false);

  // ── 1-Click Frictionless Starter Seeder ──────────────────
  async function handleSeedDemo() {
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
        throw new Error(json.error || "Failed to load sample products.");
      }

      // Reload products
      const prodRes = await fetch("/api/products", {
        headers: {
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
      });
      const prodJson = await prodRes.json();
      if (prodJson.success) {
        setProducts(prodJson.products || []);
      }
    } catch (err) {
      alert(err.message || "Failed to load sample products.");
    } finally {
      setIsSeeding(false);
    }
  }

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

        const {
          data: { session },
        } = await supabase.auth.getSession();

        // High-velocity server endpoint bypassing RLS recursion
        const res = await fetch("/api/products", {
          headers: {
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load products.");
        }

        if (isMounted) {
          setProducts(json.products || []);
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
    <main className="min-h-screen bg-[#f8fafc] py-6 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* ── Page Header ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Products & Inventory
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical SKU records, live stock counts, and barcode labels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/products/import"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Bulk import (CSV)
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-2xs transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add product
            </Link>
          </div>
        </div>

        {/* ── Unified Metric Strip ───────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-4">
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">Total products</span>
            <div className="text-xl font-semibold font-mono text-slate-900 mt-1">{stats.totalProducts}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active catalog items</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">Available units</span>
            <div className="text-xl font-semibold font-mono text-slate-900 mt-1">{stats.totalInStockUnits.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ready to dispatch</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">Stock value</span>
            <div className="text-xl font-semibold font-mono text-slate-900 mt-1">৳{stats.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="text-[11px] text-slate-500 mt-1">Retail value</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-xs font-medium text-slate-500">Out of stock</span>
            <div className={`text-xl font-semibold font-mono mt-1 ${stats.outOfStockCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{stats.outOfStockCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">{stats.outOfStockCount > 0 ? "Needs reordering" : "All SKUs stocked"}</div>
          </div>
        </div>

        {/* ── Search & Filter Controls ───────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name or base SKU…"
              className="block w-full rounded-md border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
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
              className="rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
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
              className="rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* ── Error Banner ───────────────────────────────── */}
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Data Table Card ────────────────────────────── */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner size={24} />
              <p className="text-xs font-mono text-slate-500">Loading catalog records…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* ── Empty State ──────────────────────────────── */
            <div className="py-16 px-4 text-center space-y-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Reset filters
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleSeedDemo}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-teal-500 transition cursor-pointer disabled:opacity-60"
                  >
                    {isSeeding ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Loading sample products…</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Load sample data</span>
                      </>
                    )}
                  </button>
                  <Link
                    href="/dashboard/products/import"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                  >
                    Bulk import (CSV)
                  </Link>
                  <Link
                    href="/dashboard/products/add"
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-3 py-1.5 text-xs font-medium text-white shadow-2xs transition"
                  >
                    Add product
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
                    <th className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Base SKU
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      In Stock
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider text-right">
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
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 hover:text-orange-600 transition-colors">{p.name}</div>
                          {p.created_at && (
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Added {new Date(p.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* 2. Category */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                            {p.category || "Uncategorized"}
                          </span>
                        </td>

                        {/* 3. Base SKU */}
                        <td className="px-4 py-3">
                          <span className="inline-flex font-mono font-medium text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {p.base_sku || "—"}
                          </span>
                        </td>

                        {/* 4. Price */}
                        <td className="px-4 py-3 font-mono text-slate-900 font-medium">
                          {p.price !== undefined && p.price !== null
                            ? `৳${Number(p.price).toLocaleString()}`
                            : "—"}
                        </td>

                        {/* 5. In Stock (High-contrast Status Badge) */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
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
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* Print Labels Button */}
                            <Link
                              href={`/dashboard/products/${p.id}/print`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Labels
                            </Link>

                            {/* Restock PO Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setPoSelectedItems([
                                  {
                                    id: p.id,
                                    name: p.name,
                                    sku: p.base_sku || `SKU-${String(p.id).slice(0, 6)}`,
                                    category: p.category || "General",
                                    currentStock: p.inStockCount || 0,
                                    price: p.price || 950,
                                    unitCost: Math.round((Number(p.price) || 950) * 0.6),
                                    recommendedRestock: Math.max(15, 30 - (p.inStockCount || 0)),
                                    dailyVelocity: 1.5,
                                  },
                                ]);
                                setPoModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100 transition shadow-2xs cursor-pointer"
                              title="Generate purchase order"
                            >
                              <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Restock PO
                            </button>

                            {/* Dispatch / Sell Button */}
                            <Link
                              href={`/dashboard/products/${p.id}/dispatch`}
                              className="inline-flex items-center gap-1 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-2.5 py-1 text-xs font-medium text-white shadow-2xs transition"
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

      {/* ── Purchase Order Modal (Module 3) ────────────────────── */}
      {poModalOpen && (
        <PurchaseOrderModal
          isOpen={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          items={poSelectedItems}
          businessName={businessName || "My Store"}
        />
      )}
    </main>
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
