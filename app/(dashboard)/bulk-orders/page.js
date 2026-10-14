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
      if (ctxLoading) return;
      if (!businessId) {
        setProducts([]);
        setPageLoading(false);
        return;
      }
      const { data } = await supabase
        .from("products")
        .select("id, name, category")
        .eq("business_id", businessId)
        .order("name");
      setProducts(data || []);
      setPageLoading(false);
    }
    load();
  }, [businessId, ctxLoading]);

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
      <main className="min-h-screen bg-zinc-50/60 flex items-center justify-center font-sans">
        <Spinner size={24} />
      </main>
    );
  }

  const validRowsCount = rows.filter(
    (r) => r.productId && r.variantId && Number(r.quantity) > 0
  ).length;

  return (
    <main className="min-h-screen bg-zinc-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Header ───────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider">
              <span>Operations</span>
              <span>/</span>
              <span className="text-zinc-900 font-medium">Batch Processing</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Bulk Sales Order Entry
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Record multiple SKU sales transactions at once. Each entry deducts stock from the specified variant.
            </p>
          </div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
          >
            ← Return to Catalog
          </Link>
        </div>

        {/* ── Toast ────────────────────────────────── */}
        {toast && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs flex items-center gap-2.5 ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Order Rows Card ──────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
          {/* Header Row */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1 text-xs font-mono text-zinc-500 uppercase tracking-wider">
            <span className="col-span-5 font-medium">Catalog Product</span>
            <span className="col-span-4 font-medium">SKU Variant</span>
            <span className="col-span-2 font-medium">Quantity</span>
            <span className="col-span-1" />
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
            >
              <div className="sm:col-span-5">
                <label className="sm:hidden block text-xs font-medium text-zinc-700 mb-1">
                  Product
                </label>
                <select
                  value={row.productId}
                  onChange={(e) => updateRow(i, "productId", e.target.value)}
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition"
                >
                  <option value="">— Select Catalog Product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.category ? `(${p.category})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="sm:hidden block text-xs font-medium text-zinc-700 mb-1">
                  Variant
                </label>
                <select
                  value={row.variantId}
                  onChange={(e) => updateRow(i, "variantId", e.target.value)}
                  disabled={!row.productId}
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none disabled:opacity-50 transition"
                >
                  <option value="">
                    {row.productId ? "— Select Variant —" : "Select product first"}
                  </option>
                  {(variantsMap[row.productId] || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantLabel(v)} | Stock: {v.stock_quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="sm:hidden block text-xs font-medium text-zinc-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, "quantity", e.target.value)}
                  placeholder="0"
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Remove row"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition"
          >
            <span>+</span> Add Another Row
          </button>
        </div>

        {/* Process Button */}
        <button
          onClick={handleProcess}
          disabled={loading || validRowsCount === 0}
          className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-xs shadow-indigo-600/30 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-600/30 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={16} /> Processing Batch Deductions…
            </span>
          ) : (
            <span>Commit Bulk Sales Orders ({validRowsCount} valid items)</span>
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
