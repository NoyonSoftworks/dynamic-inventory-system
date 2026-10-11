"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

function emptyRow() {
  return { productId: "", variantId: "", quantity: "" };
}

export default function BulkOrdersPage() {
  const [products, setProducts] = useState([]);
  const [variantsMap, setVariantsMap] = useState({}); // productId -> variants[]
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const { businessId, loading: ctxLoading } = useBusinessContext();

  // fetch products
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("id, name, category")
        .order("name");
      setProducts(data || []);
      setPageLoading(false);
    }
    load();
  }, []);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // fetch variants for a product (cached)
  const fetchVariants = useCallback(
    async (productId) => {
      if (variantsMap[productId]) return;
      const { data } = await supabase
        .from("variants")
        .select("id, price, stock_quantity, attributes")
        .eq("product_id", productId);
      setVariantsMap((prev) => ({ ...prev, [productId]: data || [] }));
    },
    [variantsMap]
  );

  function variantLabel(v) {
    const attrs = v.attributes || {};
    const parts = Object.entries(attrs).map(([k, val]) => `${k}: ${val}`);
    return parts.length > 0 ? parts.join(", ") : `Variant (Stock: ${v.stock_quantity})`;
  }

  // row helpers
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i, field, value) {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const updated = { ...r, [field]: value };
        if (field === "productId") {
          updated.variantId = "";
          if (value) fetchVariants(value);
        }
        return updated;
      })
    );
  }

  // process bulk orders
  async function handleProcess() {
    setLoading(true);
    setToast(null);

    try {
      // 1. Filter valid rows
      const validRows = rows.filter(
        (r) => r.productId && r.variantId && Number(r.quantity) > 0
      );

      if (validRows.length === 0) {
        throw new Error("No valid order rows. Fill in at least one complete row.");
      }

      // 2. Fetch current stock for all selected variants
      const variantIds = validRows.map((r) => r.variantId);
      const { data: currentVariants, error: fetchErr } = await supabase
        .from("variants")
        .select("id, stock_quantity")
        .in("id", variantIds);

      if (fetchErr) throw fetchErr;

      const stockMap = {};
      for (const v of currentVariants || []) {
        stockMap[v.id] = v.stock_quantity;
      }

      // 3. Validate stock
      for (const [i, row] of validRows.entries()) {
        const qty = Number(row.quantity);
        const available = stockMap[row.variantId] ?? 0;
        if (qty > available) {
          throw new Error(
            `Row ${i + 1}: Insufficient stock. Requested ${qty}, available ${available}.`
          );
        }
      }

      // 4. Process each order: update stock + insert transaction
      const transactionRows = [];
      const updatePromises = [];

      for (const row of validRows) {
        const qty = Number(row.quantity);
        const newStock = stockMap[row.variantId] - qty;

        updatePromises.push(
          supabase
            .from("variants")
            .update({ stock_quantity: newStock })
            .eq("id", row.variantId)
        );

        transactionRows.push({
          product_id: row.productId,
          variant_id: row.variantId,
          transaction_type: "OUT",
          quantity: qty,
          reference_note: `Bulk daily order - ${new Date().toLocaleDateString()}`,
          business_id: businessId,
        });

        // Update local stock map for subsequent checks
        stockMap[row.variantId] = newStock;
      }

      // Execute all stock updates
      const updateResults = await Promise.all(updatePromises);
      for (const result of updateResults) {
        if (result.error) throw result.error;
      }

      // Batch insert all transactions
      const { error: txErr } = await supabase
        .from("stock_transactions")
        .insert(transactionRows);

      if (txErr) throw txErr;

      // 5. Success
      const totalQty = validRows.reduce((s, r) => s + Number(r.quantity), 0);
      setToast({
        type: "success",
        message: `Processed ${validRows.length} orders! Total ${totalQty} units deducted.`,
      });

      // Reset rows
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      // Clear variant cache to refresh stock numbers
      setVariantsMap({});
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading || ctxLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Spinner size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Daily Bulk Orders
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter all daily sales at once. Each row deducts stock for a specific variant.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            \u2190 Dashboard
          </Link>
        </div>

        {/* toast */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.type === "success" ? "\u2713" : "\u2717"} {toast.message}
          </div>
        )}

        {/* order rows card */}
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 space-y-4">
          {/* header row */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1">
            <span className="col-span-4 text-xs font-semibold uppercase text-gray-500">
              Product
            </span>
            <span className="col-span-4 text-xs font-semibold uppercase text-gray-500">
              Variant
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase text-gray-500">
              Quantity
            </span>
            <span className="col-span-2" />
          </div>

          {/* rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-lg border border-gray-100 bg-slate-50/50 p-3"
            >
              <div className="sm:col-span-4">
                <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                  Product
                </label>
                <select
                  value={row.productId}
                  onChange={(e) => updateRow(i, "productId", e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  <option value="">\u2014 Product \u2014</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                  Variant
                </label>
                <select
                  value={row.variantId}
                  onChange={(e) => updateRow(i, "variantId", e.target.value)}
                  disabled={!row.productId}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-50"
                >
                  <option value="">
                    {row.productId ? "\u2014 Variant \u2014" : "Select product first"}
                  </option>
                  {(variantsMap[row.productId] || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantLabel(v)} | Stock: {v.stock_quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex gap-2 justify-end">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* add row */}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition"
          >
            + Add Row
          </button>
        </div>

        {/* process button */}
        <button
          onClick={handleProcess}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-8 py-5 text-lg font-bold text-white shadow-xl hover:from-red-700 hover:to-rose-700 focus:ring-4 focus:ring-red-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="inline-flex items-center gap-3">
              <Spinner /> Processing Orders\u2026
            </span>
          ) : (
            <span>\u26a1 Process Daily Orders ({rows.filter((r) => r.productId && r.variantId && Number(r.quantity) > 0).length} valid rows)</span>
          )}
        </button>
      </div>
    </main>
  );
}

function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
