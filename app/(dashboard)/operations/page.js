"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import ThermalAndInvoiceModal from "@/components/ThermalAndInvoiceModal";

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
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedTxForPrint, setSelectedTxForPrint] = useState(null);
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

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
    <main className="min-h-screen bg-[#f8fafc] py-6 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* ── Header ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Stock Operations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Restock incoming shipments and record stock adjustments.
            </p>
          </div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            ← Return to catalog
          </Link>
        </div>

        {/* ── Toast ────────────────────────────────── */}
        {toast && (
          <div
            className={`rounded-md border px-3 py-2 text-xs flex items-center gap-2 ${
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
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
        >
          {/* Row 1: Product + Variant */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
              >
                <option value="">Select catalog product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `(${p.category})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Variant
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProductId}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <option value="">
                  {selectedProductId
                    ? "Select SKU variant"
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
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3.5 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500">Current stock</p>
                <p
                  className={`text-lg font-semibold font-mono mt-0.5 ${
                    selectedVariant.stock_quantity > 0
                      ? "text-slate-900"
                      : "text-rose-600"
                  }`}
                >
                  {selectedVariant.stock_quantity} units
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Unit price</p>
                <p className="text-lg font-semibold font-mono text-slate-900 mt-0.5">
                  ৳{Number(selectedVariant.price).toLocaleString()}
                </p>
              </div>
              {selectedVariant.attributes &&
                Object.entries(selectedVariant.attributes).map(([k, val]) => (
                  <div key={k}>
                    <p className="text-xs font-medium text-slate-500">
                      {k}
                    </p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">{val}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Row 2: Action + Quantity + Note */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Operation type
              </label>
              <div className="flex rounded-md overflow-hidden border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setAction("IN")}
                  className={`flex-1 rounded-sm py-1 text-xs font-medium transition ${
                    action === "IN"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  + Restock (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setAction("OUT")}
                  className={`flex-1 rounded-sm py-1 text-xs font-medium transition ${
                    action === "OUT"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  - Deduct (OUT)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity units
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono shadow-2xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reference note{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. PO-8839 / Warehouse transfer"
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-md py-2 text-[13px] font-medium text-white shadow-2xs focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition ${
              action === "IN"
                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30"
                : "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} /> Processing…
              </span>
            ) : action === "IN" ? (
              "Confirm restock intake"
            ) : (
              "Confirm stock deduction"
            )}
          </button>
        </form>

        {/* ── Recent Activity ──────────────────────── */}
        {recent.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200">
              <h2 className="text-xs font-medium text-slate-700">
                Recent stock operations
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                  <tr>
                    {["Timestamp", "Product", "Variant", "Operation", "Units", "Reference Note", "Consignment Label"].map(
                      (h) => (
                        <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recent.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {new Date(tx.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                        {tx.products?.name || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {tx.variants?.attributes
                          ? Object.entries(tx.variants.attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                            tx.transaction_type === "IN"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {tx.transaction_type === "IN" ? "+ IN" : "- OUT"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono font-medium text-slate-900">
                        {tx.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">
                        {tx.reference_note || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {tx.transaction_type === "OUT" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxForPrint({
                                id: tx.id,
                                customer_name: tx.reference_note ? tx.reference_note.split("-")[0].trim() : "Store Consignee",
                                customer_phone: "017XXXXXXXX",
                                customer_address: "Fulfillment Destination",
                                total_amount: (tx.variants?.price || 1250) * (Number(tx.quantity) || 1),
                                product_name: tx.products?.name,
                                product_sku: `SKU-${String(tx.product_id).slice(0, 6)}`,
                                quantity: tx.quantity,
                                created_at: tx.created_at,
                              });
                              setPrintModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 shadow-2xs transition"
                          >
                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>4×6 Label</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">Restock intake</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Thermal & Commercial Invoice Modal ─────────────────── */}
        {printModalOpen && selectedTxForPrint && (
          <ThermalAndInvoiceModal
            isOpen={printModalOpen}
            onClose={() => {
              setPrintModalOpen(false);
              setSelectedTxForPrint(null);
            }}
            order={selectedTxForPrint}
            businessName={businessName || "My Store"}
          />
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
