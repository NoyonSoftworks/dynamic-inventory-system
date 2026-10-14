"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── helper: generate random 5-character alphanumeric string ──
const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes easily confused 0/O and 1/I

function generateRandomCode(length = 5) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    result += CHARACTERS[randomIndex];
  }
  return result;
}

export default function AddProductPage() {
  const { businessId, loading: ctxLoading } = useBusinessContext();

  // ── form fields ──────────────────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [baseSku, setBaseSku] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");

  // ── ui states ────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const [createdSummary, setCreatedSummary] = useState(null); // details of last created product & barcodes

  // ── clean & format SKU ───────────────────────────────────
  const formattedSku = useMemo(() => {
    return baseSku
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
  }, [baseSku]);

  // ── live barcode sample preview ──────────────────────────
  const sampleBarcodes = useMemo(() => {
    const qty = parseInt(quantity, 10);
    if (!formattedSku || isNaN(qty) || qty <= 0) return [];

    const previewCount = Math.min(qty, 4);
    const samples = [];
    for (let i = 0; i < previewCount; i++) {
      samples.push(`${formattedSku}-${generateRandomCode(5)}`);
    }
    return samples;
  }, [formattedSku, quantity]);

  // ── auto-dismiss toast ───────────────────────────────────
  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // ── submit handler ───────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setToast(null);

    // 1. Validation
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(quantity, 10);

    if (!trimmedName) {
      triggerToast("error", "Please provide a product name.");
      return;
    }
    if (!trimmedCategory) {
      triggerToast("error", "Please specify a product category.");
      return;
    }
    if (!formattedSku) {
      triggerToast("error", "Please provide a valid Base SKU.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      triggerToast("error", "Price must be a valid positive number.");
      return;
    }
    if (isNaN(parsedQty) || parsedQty < 1) {
      triggerToast("error", "Quantity must be at least 1.");
      return;
    }
    if (parsedQty > 1000) {
      triggerToast("error", "Maximum quantity per batch is 1,000 units.");
      return;
    }

    setLoading(true);

    try {
      // 2. Insert product into 'products' table
      const productPayload = {
        name: trimmedName,
        category: trimmedCategory,
        base_sku: formattedSku,
        price: parsedPrice,
      };

      if (businessId) {
        productPayload.business_id = businessId;
      }

      let { data: product, error: productErr } = await supabase
        .from("products")
        .insert(productPayload)
        .select()
        .single();

      // Fallback: If products table does not have business_id column, retry without it
      if (productErr && productErr.message?.includes("business_id")) {
        delete productPayload.business_id;
        const retryRes = await supabase
          .from("products")
          .insert(productPayload)
          .select()
          .single();
        product = retryRes.data;
        productErr = retryRes.error;
      }

      if (productErr || !product) {
        throw new Error(productErr?.message || "Failed to create product record.");
      }

      // 3. Generate unique barcodes in memory
      const inventoryRows = [];
      const usedBarcodes = new Set();

      for (let i = 0; i < parsedQty; i++) {
        let uniqueBarcode;
        do {
          uniqueBarcode = `${formattedSku}-${generateRandomCode(5)}`;
        } while (usedBarcodes.has(uniqueBarcode));

        usedBarcodes.add(uniqueBarcode);

        const itemRow = {
          product_id: product.id,
          unique_barcode: uniqueBarcode,
          status: "IN_STOCK",
        };

        if (businessId) {
          itemRow.business_id = businessId;
        }

        inventoryRows.push(itemRow);
      }

      // 4. Bulk insert into 'inventory_items' table
      let { error: itemsErr } = await supabase
        .from("inventory_items")
        .insert(inventoryRows);

      // Fallback: If inventory_items table does not have business_id column, retry without it
      if (itemsErr && itemsErr.message?.includes("business_id")) {
        const strippedRows = inventoryRows.map((row) => ({
          product_id: row.product_id,
          unique_barcode: row.unique_barcode,
          status: row.status,
        }));
        const retryItems = await supabase
          .from("inventory_items")
          .insert(strippedRows);
        itemsErr = retryItems.error;
      }

      if (itemsErr) {
        throw new Error(
          `Product created (ID: ${product.id}), but failed to generate inventory barcodes: ${itemsErr.message}`
        );
      }

      // 5. Success State & Summary
      triggerToast(
        "success",
        `🎉 Successfully created "${trimmedName}" and generated ${parsedQty} serialized inventory items!`
      );

      setCreatedSummary({
        productId: product.id,
        name: trimmedName,
        baseSku: formattedSku,
        quantity: parsedQty,
        sampleBarcodes: Array.from(usedBarcodes).slice(0, 8),
      });

      // Reset form fields
      setName("");
      setCategory("");
      setBaseSku("");
      setPrice("");
      setQuantity("1");
    } catch (err) {
      triggerToast("error", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* ── Breadcrumb & Page Header ─────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
              <Link href="/" className="hover:text-indigo-600 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-400">Products</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">Add Product</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              New Inventory Product
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a catalog product and automatically generate serialized unique barcodes for incoming stock.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* ── Toast Notifications ──────────────────────── */}
        {toast && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm shadow-md transition-all ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <span className="text-base shrink-0">
              {toast.type === "success" ? "✓" : "⚠️"}
            </span>
            <p className="font-medium">{toast.message}</p>
          </div>
        )}

        {/* ── Success Summary Card ─────────────────────── */}
        {createdSummary && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
                  📦
                </span>
                <div>
                  <h3 className="text-base font-bold text-indigo-950">
                    Product Saved: {createdSummary.name}
                  </h3>
                  <p className="text-xs text-indigo-700">
                    Base SKU: <code className="font-mono font-bold">{createdSummary.baseSku}</code> · {createdSummary.quantity} Barcodes Generated
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedSummary(null)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900/70">
                Generated Barcode Samples:
              </p>
              <div className="flex flex-wrap gap-2">
                {createdSummary.sampleBarcodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center rounded-md bg-white border border-indigo-200 px-2.5 py-1 text-xs font-mono font-semibold text-indigo-900 shadow-2xl"
                  >
                    🏷️ {code}
                  </span>
                ))}
                {createdSummary.quantity > createdSummary.sampleBarcodes.length && (
                  <span className="inline-flex items-center text-xs text-indigo-700 italic px-1 self-center">
                    + {createdSummary.quantity - createdSummary.sampleBarcodes.length} more in stock
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Main Form Card ───────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl ring-1 ring-slate-200/80 space-y-8"
        >
          {/* Section: Product Information */}
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Product Specifications</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary catalog details displayed in reports and inventory searches.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ergonomic Mechanical Keyboard"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Electronics, Apparel, Accessories"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Price ($ USD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={loading}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="49.99"
                    className="block w-full rounded-xl border border-slate-300 pl-8 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Serialization & Barcode Logistics */}
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Serialization &amp; Stock Intake</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define the Base SKU and intake quantity. Each unit receives a unique 5-character suffix barcode.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Base SKU */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Base SKU Prefix <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={baseSku}
                    onChange={(e) => setBaseSku(e.target.value.toUpperCase())}
                    placeholder="e.g. TSHIRT, KEYB-PRO"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono font-semibold uppercase text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Letters, numbers, and dashes only. All items will prefix with this code.
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Arriving Quantity (Units) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  disabled={loading}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="10"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  How many physical units are arriving to be cataloged.
                </p>
              </div>
            </div>

            {/* Live Barcode Preview Box */}
            {sampleBarcodes.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Live Barcode Generation Preview:
                  </span>
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200/60 rounded-full px-2 py-0.5">
                    {parseInt(quantity, 10) || 0} Total Barcodes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {sampleBarcodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 shadow-sm"
                    >
                      <span className="text-slate-400 font-normal">#{idx + 1}</span>
                      <span className="truncate">{code}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Format: <code className="font-mono text-indigo-700 font-bold">{formattedSku}-[5-CHAR-CODE]</code>. Barcodes are unique and marked as <code className="font-bold text-emerald-700">IN_STOCK</code>.
                </p>
              </div>
            )}
          </div>

          {/* ── Submit & Action Buttons ────────────────── */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
            <Link
              href="/dashboard/products"
              className="w-full sm:w-auto text-center rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || ctxLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/40 focus:ring-2 focus:ring-indigo-600/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>
                    Saving &amp; Generating {parseInt(quantity, 10) || 0} Barcodes…
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Product &amp; Generate Barcodes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

// ── spinner icon ──────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
