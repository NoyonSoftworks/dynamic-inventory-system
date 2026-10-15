"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

function OperationsPageContent() {
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

  const searchParams = useSearchParams();
  const urlSku = searchParams.get("sku");
  const urlAction = searchParams.get("action");

  // ── fetch products on mount & handle URL deep links ──
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
        .select("id, name, category, base_sku")
        .eq("business_id", businessId)
        .order("name");
      const list = data || [];
      setProducts(list);
      setPageLoading(false);

      if (urlSku && list.length > 0) {
        const match = list.find(
          (p) =>
            p.base_sku?.toLowerCase() === urlSku.toLowerCase() ||
            p.id === urlSku
        );
        if (match) {
          setSelectedProductId(match.id);
        }
      }
      if (urlAction && (urlAction === "IN" || urlAction === "OUT")) {
        setAction(urlAction);
      }
    }
    load();
  }, [urlSku, urlAction, businessId, ctxLoading]);

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
    if (!businessId) return;
    const { data } = await supabase
      .from("stock_transactions")
      .select("*, products(name), variants(attributes)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent(data || []);
  }, [businessId]);

  useEffect(() => {
    async function loadInitialRecent() {
      if (!businessId) return;
      const { data } = await supabase
        .from("stock_transactions")
        .select("*, products(name), variants(attributes)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(10);
      setRecent(data || []);
    }
    loadInitialRecent();
  }, [businessId]);

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
      <main className="min-h-screen bg-zinc-50/60 flex items-center justify-center font-sans">
        <Spinner size={24} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ── Header ───────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider">
              <span>Operations</span>
              <span>/</span>
              <span className="text-zinc-900 font-medium">Stock Adjustments</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Stock Operations
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Restock incoming shipments or record manual stock deductions for SKU variants.
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

        {/* ── Form Card ────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5"
        >
          {/* Row 1: Product + Variant */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition"
              >
                <option value="">— Select Catalog Product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `(${p.category})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Variant
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProductId}
                className="block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 shadow-xs focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <option value="">
                  {selectedProductId
                    ? "— Select SKU Variant —"
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

          {/* Stock Info Card */}
          {selectedVariant && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Current Stock</p>
                <p
                  className={`text-xl font-bold font-mono mt-0.5 ${
                    selectedVariant.stock_quantity > 0
                      ? "text-zinc-900"
                      : "text-rose-600"
                  }`}
                >
                  {selectedVariant.stock_quantity} units
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Unit Price</p>
                <p className="text-base font-semibold font-mono text-zinc-900 mt-0.5">
                  ${Number(selectedVariant.price).toFixed(2)}
                </p>
              </div>
              {selectedVariant.attributes &&
                Object.entries(selectedVariant.attributes).map(([k, val]) => (
                  <div key={k}>
                    <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      {k}
                    </p>
                    <p className="text-xs font-semibold text-zinc-800 mt-0.5">{val}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Row 2: Action + Quantity + Note */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Operation Type
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setAction("IN")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    action === "IN"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  + Restock (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setAction("OUT")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    action === "OUT"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  - Deduct (OUT)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Quantity Units
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 font-mono shadow-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Reference Note{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. PO-8839 / Warehouse transfer"
                className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-xs focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition ${
              action === "IN"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 focus:ring-emerald-500/30"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 focus:ring-rose-500/30"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} /> Processing…
              </span>
            ) : action === "IN" ? (
              "Confirm Restock Intake"
            ) : (
              "Confirm Stock Deduction"
            )}
          </button>
        </form>

        {/* ── Recent Activity ──────────────────────── */}
        {recent.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100">
              <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                Recent Stock Operations
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-xs text-left">
                <thead className="bg-zinc-50/60 font-mono text-zinc-500 uppercase tracking-wider">
                  <tr>
                    {["Timestamp", "Product", "Variant", "Operation", "Units", "Reference Note"].map(
                      (h) => (
                        <th key={h} className="px-5 py-3 font-medium">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {recent.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-zinc-500">
                        {new Date(tx.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900">
                        {tx.products?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-500">
                        {tx.variants?.attributes
                          ? Object.entries(tx.variants.attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono font-medium border ${
                            tx.transaction_type === "IN"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {tx.transaction_type === "IN" ? "+ IN" : "- OUT"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono font-semibold text-zinc-900">
                        {tx.quantity}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 max-w-[200px] truncate">
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

export default function OperationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Spinner size={32} />
        </main>
      }
    >
      <OperationsPageContent />
    </Suspense>
  );
}
