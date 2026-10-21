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
  const { businessId, businessName, role, userEmail, loading: ctxLoading } = useBusinessContext();

  const searchParams = useSearchParams();
  const urlSku = searchParams.get("sku");
  const urlAction = searchParams.get("action");
  const urlTab = searchParams.get("tab");

  // ── Team & Staff Permissions State ──────────────────
  const canManageTeam = role === "owner" || role === "admin" || role === "manager";
  const isOwner = role === "owner" || role === "admin";
  const [activeSection, setActiveSection] = useState(urlTab === "team" ? "team" : "stock");
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("staff");
  const [createdStaffCreds, setCreatedStaffCreds] = useState(null);

  const fetchTeam = useCallback(async () => {
    if (!businessId) return;
    try {
      setTeamLoading(true);
      const res = await fetch("/api/team");
      if (res.ok) {
        const json = await res.json();
        if (json.team) {
          setTeamMembers(json.team);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch team members:", err);
    } finally {
      setTeamLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (activeSection === "team" || canManageTeam) {
      fetchTeam();
    }
  }, [activeSection, canManageTeam, fetchTeam]);

  async function handleAddStaff(e) {
    e.preventDefault();
    if (!newStaffEmail || !newStaffPassword) {
      setToast({ type: "error", message: "Email and password are required." });
      return;
    }
    setStaffSaving(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStaffEmail,
          password: newStaffPassword,
          role: newStaffRole,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to provision staff account.");
      }
      setToast({ type: "success", message: `Staff member "${newStaffEmail}" created!` });
      setCreatedStaffCreds({
        email: newStaffEmail,
        password: newStaffPassword,
        role: newStaffRole === "manager" ? "Store Manager" : "Packing Staff",
      });
      setNewStaffEmail("");
      setNewStaffPassword("");
      setShowAddStaffModal(false);
      fetchTeam();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setStaffSaving(false);
    }
  }

  async function handleDeleteStaff(staffId, staffEmail) {
    if (!confirm(`Are you sure you want to revoke access for ${staffEmail}?`)) return;
    try {
      const res = await fetch(`/api/team?id=${staffId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to remove staff member.");
      }
      setToast({ type: "success", message: `Access revoked for ${staffEmail}.` });
      fetchTeam();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  }

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

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStaffPassword(pwd);
  };

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
              {activeSection === "team" ? "Team & Staff Access" : "Stock Operations"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSection === "team"
                ? "Manage warehouse staff, packing operators, and granular operational permissions."
                : "Restock incoming shipments and record stock adjustments."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              ← Return to catalog
            </Link>
          </div>
        </div>

        {/* ── Section Navigation Tabs ──────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <button
            type="button"
            onClick={() => setActiveSection("stock")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeSection === "stock"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Stock Intake & Adjust</span>
          </button>

          {canManageTeam && (
            <button
              type="button"
              onClick={() => setActiveSection("team")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSection === "team"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Team & Staff Access</span>
              {teamMembers.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeSection === "team" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}>
                  {teamMembers.length}
                </span>
              )}
            </button>
          )}
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

        {/* ── VIEW 1: STOCK INTAKE & ADJUSTMENT ────── */}
        {activeSection === "stock" && (
          <>
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
          </>
        )}

        {/* ── VIEW 2: TEAM & STAFF ACCESS MANAGEMENT ─ */}
        {activeSection === "team" && (
          <div className="space-y-4">
            {/* Roles Matrix Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900">Store Owner</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-white">
                    Full Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Full control across store billing, courier credentials, team invitations, profits, and catalog exports.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900">Store Manager</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Operations + Reports
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Operational control over inventory, orders, courier booking, and daily expenses. Billing and team creation restricted.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900">Packing Staff</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Fulfillment Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Fast packing view: barcode scanner, bulk orders, dispatch stickers, and restock. Zero financial or margin visibility.
                </p>
              </div>
            </div>

            {/* Team Directory Header & Action */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Store Staff Directory</h2>
                  <p className="text-[11px] text-slate-500">
                    Staff members can sign in with their email and assigned password.
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewStaffEmail("");
                      generateRandomPassword();
                      setNewStaffRole("staff");
                      setShowAddStaffModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Staff Member</span>
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500 uppercase tracking-wider text-[11px]">
                        Account Email
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500 uppercase tracking-wider text-[11px]">
                        Assigned Role
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500 uppercase tracking-wider text-[11px]">
                        Fulfillment Scope
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500 uppercase tracking-wider text-[11px]">
                        Date Added
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500 uppercase tracking-wider text-[11px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {teamLoading ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                          <div className="inline-flex items-center gap-2">
                            <Spinner size={16} />
                            <span>Loading staff members...</span>
                          </div>
                        </td>
                      </tr>
                    ) : teamMembers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          <p className="font-medium text-slate-700">No additional staff members yet.</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Click &quot;Add Staff Member&quot; to provision an operator account for your packing team.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      teamMembers.map((member) => {
                        const isSelf = member.email?.toLowerCase() === userEmail?.toLowerCase();
                        const memberRole = member.role || "staff";
                        return (
                          <tr key={member.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-medium text-[11px] border border-slate-200">
                                  {member.email?.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-900">{member.email}</span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  memberRole === "owner" || memberRole === "admin"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : memberRole === "manager"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {memberRole === "owner" || memberRole === "admin"
                                  ? "Store Owner"
                                  : memberRole === "manager"
                                  ? "Store Manager"
                                  : "Packing Staff"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">
                              {memberRole === "owner" || memberRole === "admin"
                                ? "Full Platform Administration"
                                : memberRole === "manager"
                                ? "Orders, Inventory & Daily Reports"
                                : "Scanner, Bulk Orders & Packing Labels"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {member.created_at ? new Date(member.created_at).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {isSelf ? (
                                <span className="text-slate-400 text-[11px] italic">Active account</span>
                              ) : isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(member.id, member.email)}
                                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition"
                                >
                                  Revoke Access
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Protected</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD STAFF MODAL ──────────────────────── */}
        {showAddStaffModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Provision Staff Account</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign a role and login password for your team member.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="operator@wearzo.store"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Login Password
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Generate Strong
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Enter or generate password"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Role & Scope
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition ${
                      newStaffRole === "staff" ? "border-slate-900 bg-slate-50/60" : "border-slate-200 hover:bg-slate-50/40"
                    }`}>
                      <input
                        type="radio"
                        name="staffRole"
                        value="staff"
                        checked={newStaffRole === "staff"}
                        onChange={() => setNewStaffRole("staff")}
                        className="mt-0.5 text-slate-900"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Packing & Fulfillment Staff</div>
                        <div className="text-[11px] text-slate-500">
                          Strict warehouse operational view. Access to Barcode Scanner, Bulk Orders, Label Generator, and Stock Adjustments. Financials hidden.
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition ${
                      newStaffRole === "manager" ? "border-slate-900 bg-slate-50/60" : "border-slate-200 hover:bg-slate-50/40"
                    }`}>
                      <input
                        type="radio"
                        name="staffRole"
                        value="manager"
                        checked={newStaffRole === "manager"}
                        onChange={() => setNewStaffRole("manager")}
                        className="mt-0.5 text-slate-900"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Store Operations Manager</div>
                        <div className="text-[11px] text-slate-500">
                          Day-to-day managerial access including daily reports, expenses, stock intake, and order status updates. Billing restricted.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={staffSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {staffSaving && <Spinner size={12} />}
                    <span>Create Staff Account</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── CREATED CREDENTIALS MODAL ─────────────── */}
        {createdStaffCreds && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Staff Account Created</h3>
                    <p className="text-[11px] text-slate-500">
                      Share these credentials securely with your staff member.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatedStaffCreds(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-2">
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Login Email</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 select-all">
                      {createdStaffCreds.email}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Password</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 select-all">
                      {createdStaffCreds.password}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Assigned Role</div>
                    <div className="text-xs font-medium text-slate-700">
                      {createdStaffCreds.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Staff Login for ${businessName || "Store"}:\nPortal: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nEmail: ${createdStaffCreds.email}\nPassword: ${createdStaffCreds.password}\nRole: ${createdStaffCreds.role}`;
                      navigator.clipboard.writeText(text);
                      setToast({ type: "success", message: "Credentials copied to clipboard!" });
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy Login Info</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Staff Login for ${businessName || "Store"}:\nPortal: ${typeof window !== "undefined" ? window.location.origin : ""}/login\nEmail: ${createdStaffCreds.email}\nPassword: ${createdStaffCreds.password}\nRole: ${createdStaffCreds.role}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-2xs transition"
                  >
                    <span>Share on WhatsApp</span>
                  </a>
                </div>
              </div>
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
