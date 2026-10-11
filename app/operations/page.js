"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

export default function OperationsPage() {
  // ── data state ──────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [variants, setVariants] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [action, setAction] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  // ── ui state ────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState(null); // { type, message }

  // ── recent transactions ─────────────────────────────
  const [recent, setRecent] = useState([]);
  const { businessId, loading: ctxLoading } = useBusinessContext();

  // ── fetch products on mount ─────────────────────────
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

  // ── fetch variants when product changes ─────────────
  useEffect(() => {
    if (!selectedProductId) {
      queueMicrotask(() => {
        setVariants([]);
        setSelectedVariantId("");
      });
      return;
    }
    async function load() {
      const { data } = await supabase
        .from("variants")
        .select("id, price, stock_quantity, attributes")
        .eq("product_id", selectedProductId);
      setVariants(data || []);
      setSelectedVariantId("");
    }
    load();
  }, [selectedProductId]);

  // ── fetch recent transactions ───────────────────────
  const fetchRecent = useCallback(async () => {
    const { data } = await supabase
      .from("stock_transactions")
      .select("*, products(name), variants(attributes)")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent(data || []);
  }, []);

  useEffect(() => {
    async function loadInitialRecent() {
      const { data } = await supabase
        .from("stock_transactions")
        .select("*, products(name), variants(attributes)")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecent(data || []);
    }
    loadInitialRecent();
  }, []);

  // ── auto-dismiss toast ──────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── format variant label from JSONB attributes ──────
  function variantLabel(v) {
    if (!v) return "";
    const attrs = v.attributes || {};
    const parts = Object.entries(attrs).map(([k, val]) => `${k}: ${val}`);
    return parts.length > 0
      ? parts.join(", ")
      : `Variant (Stock: ${v.stock_quantity})`;
  }

  // ── submit ──────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const qty = Number(quantity);
      if (!selectedProductId) throw new Error("Select a product.");
      if (!selectedVariantId) throw new Error("Select a variant.");
      if (!qty || qty <= 0) throw new Error("Quantity must be positive.");

      const variant = variants.find((v) => v.id === selectedVariantId);
      if (!variant) throw new Error("Variant not found.");

      if (action === "OUT" && qty > variant.stock_quantity) {
        throw new Error(
          `Insufficient stock. Available: ${variant.stock_quantity}`
        );
      }

      const newStock =
        action === "IN"
          ? variant.stock_quantity + qty
          : variant.stock_quantity - qty;

      // 1. Update variant stock
      const { error: updateErr } = await supabase
        .from("variants")
        .update({ stock_quantity: newStock })
        .eq("id", selectedVariantId);

      if (updateErr) throw updateErr;

      // 2. Insert transaction record
      const { error: txErr } = await supabase
        .from("stock_transactions")
        .insert({
          product_id: selectedProductId,
          variant_id: selectedVariantId,
          transaction_type: action,
          quantity: qty,
          reference_note: note.trim() || null,
          business_id: businessId,
        });

      if (txErr) throw txErr;

      // 3. Success
      setToast({
        type: "success",
        message: `${action === "IN" ? "Restocked" : "Deducted"} ${qty} units. New stock: ${newStock}`,
      });

      // Reset form partially
      setQuantity("");
      setNote("");

      // Refresh variants to show updated stock
      const { data: refreshed } = await supabase
        .from("variants")
        .select("id, price, stock_quantity, attributes")
        .eq("product_id", selectedProductId);
      setVariants(refreshed || []);

      // Refresh recent transactions
      fetchRecent();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  // ── selected variant info ───────────────────────────
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  if (pageLoading || ctxLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Spinner size={32} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* ── header ───────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Stock Operations
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Restock or deduct inventory for any product variant.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            ← Dashboard
          </Link>
        </div>

        {/* ── toast ────────────────────────────────── */}
        {toast && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {toast.type === "success" ? "✓" : "✗"} {toast.message}
          </div>
        )}

        {/* ── form card ────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 space-y-6"
        >
          {/* row 1: product + variant */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="">— Select Product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variant
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProductId}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedProductId
                    ? "— Select Variant —"
                    : "Select a product first"}
                </option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {variantLabel(v)} — Stock: {v.stock_quantity}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* stock info card */}
          {selectedVariant && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Current Stock</p>
                <p
                  className={`text-2xl font-bold ${
                    selectedVariant.stock_quantity > 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {selectedVariant.stock_quantity}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Price</p>
                <p className="text-lg font-semibold text-gray-800">
                  ${Number(selectedVariant.price).toFixed(2)}
                </p>
              </div>
              {selectedVariant.attributes &&
                Object.entries(selectedVariant.attributes).map(([k, val]) => (
                  <div key={k}>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      {k}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">{val}</p>
                  </div>
                ))}
            </div>
          )}

          {/* row 2: action + quantity + note */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAction("IN")}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold transition ${
                    action === "IN"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  ↑ Restock (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setAction("OUT")}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold transition border-l border-gray-300 ${
                    action === "OUT"
                      ? "bg-red-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  ↓ Deduct (OUT)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Note{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Order #1234"
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl px-6 py-3 text-base font-semibold text-white shadow-sm focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition ${
              action === "IN"
                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/40"
                : "bg-red-600 hover:bg-red-700 focus:ring-red-500/40"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Processing…
              </span>
            ) : action === "IN" ? (
              "↑ Restock Inventory"
            ) : (
              "↓ Deduct Inventory"
            )}
          </button>
        </form>

        {/* ── recent activity ──────────────────────── */}
        {recent.length > 0 && (
          <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Transactions
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Time", "Product", "Variant", "Type", "Qty", "Note"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900">
                        {tx.products?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {tx.variants?.attributes
                          ? Object.entries(tx.variants.attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            tx.transaction_type === "IN"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                          }`}
                        >
                          {tx.transaction_type === "IN" ? "↑ IN" : "↓ OUT"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-gray-800">
                        {tx.quantity}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {tx.reference_note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── spinner ──────────────────────────────────────────────
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
