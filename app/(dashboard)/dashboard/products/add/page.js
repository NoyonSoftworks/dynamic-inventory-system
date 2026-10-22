"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Barcode from "react-barcode";
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

// ── Quick presets for Bangladeshi E-Commerce merchants ──
const PRESET_CATEGORIES = [
  "Apparel & Fashion",
  "Footwear & Shoes",
  "Electronics & Gadgets",
  "Health & Beauty",
  "Home & Kitchen",
  "Bags & Accessories",
  "Watch & Jewelry",
  "Grocery & Organic",
  "Baby & Kids",
];

const PRESET_IMAGES = [
  { label: "T-Shirt", icon: "👕", url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80" },
  { label: "Denim Jeans", icon: "👖", url: "https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80" },
  { label: "Sneakers", icon: "👟", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80" },
  { label: "Smartwatch", icon: "⌚", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80" },
  { label: "Earbuds", icon: "🎧", url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80" },
  { label: "Cosmetics", icon: "🧴", url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=80" },
  { label: "Backpack", icon: "🎒", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80" },
  { label: "Food/Honey", icon: "🍯", url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80" },
];

export default function AddProductPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  // ── Form State ─────────────────────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Apparel & Fashion");
  const [customCategory, setCustomCategory] = useState("");
  const [baseSku, setBaseSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [currency, setCurrency] = useState("BDT"); // BDT | USD
  const [quantity, setQuantity] = useState("20");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  // ── Logistics & Warehouse State ───────────────────────────
  const [weightKg, setWeightKg] = useState("0.35");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [rackLocation, setRackLocation] = useState("Rack A-01");
  const [supplier, setSupplier] = useState("");
  const [barcodeType, setBarcodeType] = useState("SERIALIZED"); // SERIALIZED | UNIFORM

  // ── Variants State ────────────────────────────────────────
  const [hasVariants, setHasVariants] = useState(false);
  const [variantsList, setVariantsList] = useState([
    { size: "M", color: "Black", price: "", quantity: "10" },
    { size: "L", color: "Black", price: "", quantity: "10" },
  ]);

  // ── UI States ─────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const [createdSummary, setCreatedSummary] = useState(null);

  // ── Clean & Format SKU ────────────────────────────────────
  const formattedSku = useMemo(() => {
    return baseSku
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
  }, [baseSku]);

  // ── Profit Margin Calculations ────────────────────────────
  const profitMetrics = useMemo(() => {
    const sell = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(costPrice) || 0;
    const qty = parseInt(quantity, 10) || 0;

    const unitProfit = sell > 0 && cost > 0 ? sell - cost : 0;
    const marginPct = sell > 0 && cost > 0 ? Math.round((unitProfit / sell) * 100) : 0;
    const batchRevenue = sell * qty;
    const batchCost = cost * qty;
    const batchProfit = unitProfit * qty;
    const markup = cost > 0 ? (sell / cost).toFixed(1) : 0;

    return {
      unitProfit,
      marginPct,
      batchRevenue,
      batchCost,
      batchProfit,
      markup,
      hasFinancials: sell > 0 && cost > 0,
    };
  }, [sellingPrice, costPrice, quantity]);

  // ── Live Barcode Sample Preview ───────────────────────────
  const sampleBarcodes = useMemo(() => {
    const qty = parseInt(quantity, 10);
    if (!formattedSku || isNaN(qty) || qty <= 0) return [];

    const previewCount = Math.min(qty, 4);
    const samples = [];
    if (barcodeType === "UNIFORM") {
      for (let i = 0; i < previewCount; i++) {
        samples.push(`${formattedSku}-${String(i + 1).padStart(3, "0")}`);
      }
    } else {
      for (let i = 0; i < previewCount; i++) {
        samples.push(`${formattedSku}-${generateRandomCode(5)}`);
      }
    }
    return samples;
  }, [formattedSku, quantity, barcodeType]);

  // ── Auto-Generate SKU from Title ──────────────────────────
  function handleGenerateSku() {
    if (!name.trim()) {
      triggerToast("error", "Please type a product name first to auto-generate a SKU.");
      return;
    }
    const words = name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const prefix = words.slice(0, 2).join("-") || "SKU";
    const rand = Math.floor(100 + Math.random() * 900);
    setBaseSku(`${prefix}-${rand}`.slice(0, 14));
    triggerToast("success", "Generated clean SKU prefix!");
  }

  // ── AI Smart Autofill via Shongi AI ─────────────────────────
  async function handleAiSuggest() {
    if (!name.trim()) {
      triggerToast("error", "Please write a product name (e.g. 'Polo T-Shirt' or 'Wireless Earbuds') for Shongi AI to suggest details.");
      return;
    }

    try {
      setAiSuggesting(true);
      const res = await fetch("/api/products/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category !== "Other" ? category : customCategory,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "AI could not generate suggestions.");
      }

      const s = json.suggestions;
      if (s.suggested_category) {
        if (PRESET_CATEGORIES.includes(s.suggested_category)) {
          setCategory(s.suggested_category);
        } else {
          setCategory("Other");
          setCustomCategory(s.suggested_category);
        }
      }
      if (s.suggested_sku && !baseSku) {
        setBaseSku(s.suggested_sku);
      }
      if (s.suggested_price && !sellingPrice) {
        setSellingPrice(String(s.suggested_price));
      }
      if (s.suggested_cost && !costPrice) {
        setCostPrice(String(s.suggested_cost));
      }
      if (s.suggested_weight_kg) {
        setWeightKg(String(s.suggested_weight_kg));
      }
      if (s.suggested_threshold) {
        setLowStockThreshold(String(s.suggested_threshold));
      }
      if (s.suggested_rack) {
        setRackLocation(s.suggested_rack);
      }
      if (s.description && !description) {
        setDescription(s.description);
      }
      if (Array.isArray(s.suggested_variants) && s.suggested_variants.length > 0) {
        setHasVariants(true);
        setVariantsList(s.suggested_variants.map(v => ({
          size: v.size || "Standard",
          color: v.color || "Default",
          price: String(v.price || s.suggested_price || ""),
          quantity: String(v.quantity || "10"),
        })));
      }

      triggerToast("success", "✨ Shongi AI successfully suggested category, pricing, weight & SKU!");
    } catch (err) {
      triggerToast("error", err.message || "Failed to call AI assistant.");
    } finally {
      setAiSuggesting(false);
    }
  }

  // ── Variant Helpers ───────────────────────────────────────
  function handleAddVariantRow() {
    setVariantsList((prev) => [
      ...prev,
      { size: "XL", color: "Black", price: sellingPrice || "", quantity: "10" },
    ]);
  }

  function handleDuplicateVariantRow(idx) {
    setVariantsList((prev) => {
      const target = prev[idx];
      if (!target) return prev;
      const copy = {
        size: target.size || "M",
        color: target.color || "",
        price: target.price || sellingPrice || "",
        quantity: target.quantity || "10",
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    triggerToast("success", "Row duplicated! You can now adjust size or color.");
  }

  function handleRemoveVariantRow(idx) {
    setVariantsList((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleVariantChange(idx, field, val) {
    setVariantsList((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  }

  // ── Toast Trigger ─────────────────────────────────────────
  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5500);
  };

  // ── Form Submit Handler ───────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setToast(null);

    const trimmedName = name.trim();
    const finalCategory = category === "Other" ? (customCategory.trim() || "General") : category;
    const parsedPrice = parseFloat(sellingPrice);
    const parsedCost = costPrice ? parseFloat(costPrice) : null;
    const parsedQty = parseInt(quantity, 10);
    const parsedWeight = parseFloat(weightKg) || 0.3;
    const parsedThreshold = parseInt(lowStockThreshold, 10) || 5;

    if (!trimmedName) {
      triggerToast("error", "Please provide a product title.");
      return;
    }
    if (!formattedSku) {
      triggerToast("error", "Please provide or auto-generate a Base SKU.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      triggerToast("error", "Selling Price must be a valid positive number.");
      return;
    }
    if (isNaN(parsedQty) || parsedQty < 1) {
      triggerToast("error", "Arriving Quantity must be at least 1 unit.");
      return;
    }
    if (parsedQty > 1000) {
      triggerToast("error", "Maximum quantity per batch intake is 1,000 units.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        name: trimmedName,
        category: finalCategory,
        base_sku: formattedSku,
        price: parsedPrice,
        cost_price: parsedCost,
        quantity: parsedQty,
        image_url: imageUrl.trim() || null,
        weight_kg: parsedWeight,
        low_stock_threshold: parsedThreshold,
        rack_location: rackLocation.trim() || null,
        supplier: supplier.trim() || null,
        description: description.trim() || null,
        barcode_type: barcodeType,
        variants: hasVariants ? variantsList : [],
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create product record.");
      }

      const product = json.product;

      triggerToast(
        "success",
        `🎉 Successfully cataloged "${trimmedName}" and generated ${parsedQty} serialized barcodes!`
      );

      setCreatedSummary({
        productId: product.id,
        name: trimmedName,
        baseSku: formattedSku,
        quantity: parsedQty,
        price: parsedPrice,
        costPrice: parsedCost,
        category: finalCategory,
        rackLocation: rackLocation,
        weightKg: parsedWeight,
        sampleBarcodes: sampleBarcodes,
      });

      // Reset form
      setName("");
      setBaseSku("");
      setSellingPrice("");
      setCostPrice("");
      setImageUrl("");
      setDescription("");
      setHasVariants(false);
    } catch (err) {
      triggerToast("error", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans selection:bg-orange-500 selection:text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Breadcrumb & Page Header ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
              <Link href="/dashboard" className="hover:text-orange-600 transition flex items-center gap-1">
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <Link href="/dashboard/products" className="hover:text-orange-600 transition">
                Products
              </Link>
              <span>/</span>
              <span className="text-orange-600 font-semibold">Add New Product</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>New Inventory Product</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-orange-100 text-orange-800 border border-orange-200">
                PRO CATALOG
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Complete cataloging with buying cost, retail price, profit margins, Steadfast/Pathao courier weights, and unique Code 128 thermal barcodes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/products/import"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Bulk Import (CSV)</span>
            </Link>

            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <span>← Back to Catalog</span>
            </Link>
          </div>
        </div>

        {/* ── Toast Notification ─────────────────────────────── */}
        {toast && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs sm:text-sm shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <p className="font-semibold flex-1">{toast.message}</p>
          </div>
        )}

        {/* ── Created Summary Success Hero ─────────────────────── */}
        {createdSummary && (
          <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-white p-6 sm:p-7 shadow-lg shadow-orange-500/5 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-orange-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md text-xl">
                  ✓
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Product Successfully Cataloged: &ldquo;{createdSummary.name}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    SKU: <code className="font-mono font-bold text-orange-700">{createdSummary.baseSku}</code> · {createdSummary.quantity} Barcodes Generated &amp; In Stock (৳{createdSummary.price.toLocaleString()})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/dashboard/products/${createdSummary.productId}/print`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-md transition cursor-pointer"
                  title="Print 50mm x 25mm barcode stickers"
                >
                  <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>🖨️ Print Thermal Labels</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setCreatedSummary(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1.5"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Generated Barcode Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Sample Barcodes Generated:
              </span>
              <div className="flex flex-wrap gap-2">
                {createdSummary.sampleBarcodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold text-slate-800 shadow-2xs"
                  >
                    <span className="text-orange-500 text-[10px]">|||</span>
                    <span>{code}</span>
                  </span>
                ))}
                {createdSummary.quantity > createdSummary.sampleBarcodes.length && (
                  <span className="inline-flex items-center text-xs text-slate-500 italic px-2">
                    + {createdSummary.quantity - createdSummary.sampleBarcodes.length} more units in warehouse
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Main Two-Column Workflow Layout ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Comprehensive Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: Product Specifications & Identity */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 text-sm">
                      📦
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      Product Specifications
                    </h2>
                  </div>

                  {/* AI Auto-Suggest Button */}
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={aiSuggesting || !name.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/80 hover:bg-orange-100 text-orange-800 px-3 py-1.5 text-xs font-bold shadow-2xs transition disabled:opacity-40 cursor-pointer"
                    title="Auto-fill details with Shongi AI"
                  >
                    <span>{aiSuggesting ? "Analyzing…" : "✨ Shongi AI Auto-Suggest"}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Product Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Product Name / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Men's Premium Combed Cotton Polo T-Shirt"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Full product title displayed on invoices, courier shipping slips, and catalog.
                    </p>
                  </div>

                  {/* Category Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition cursor-pointer"
                      >
                        {PRESET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="Other">+ Custom Category</option>
                      </select>
                    </div>

                    {category === "Other" && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Custom Category Name
                        </label>
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="e.g. Leather Crafts"
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                        />
                      </div>
                    )}

                    {/* Image URL with Presets */}
                    <div className={category === "Other" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Product Image (URL / Photo)
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://... (or click preset below)"
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 1-Click Quick Image Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Quick Sample Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium border transition cursor-pointer ${
                            imageUrl === preset.url
                              ? "bg-orange-50 border-orange-300 text-orange-900 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                        </button>
                      ))}
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="text-[11px] text-rose-600 hover:underline px-1 self-center"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Short Marketing Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Short Description / Warehouse Note
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. 100% organic cotton, breathable fabric with premium box packaging."
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Pricing, Cost & Real-Time Profit Engine */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 text-sm">
                      💰
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Pricing &amp; Profit Engine
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Tracks unit cost to calculate gross profit per item and total catalog inventory value.
                      </p>
                    </div>
                  </div>

                  {/* Currency Badge */}
                  <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCurrency("BDT")}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        currency === "BDT" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      BDT (৳)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        currency === "USD" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selling Price */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Selling Price (বিক্রয় মূল্য) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-bold text-sm">
                        {currency === "BDT" ? "৳" : "$"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        placeholder={currency === "BDT" ? "1200" : "49.99"}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Standard retail price charged to customers.
                    </p>
                  </div>

                  {/* Cost Price */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cost / Purchase Price (কেনা দাম)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-bold text-sm">
                        {currency === "BDT" ? "৳" : "$"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder={currency === "BDT" ? "750" : "25.00"}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Wholesale purchase cost / manufacturing cost.
                    </p>
                  </div>
                </div>

                {/* Real-time Profit Engine Dashboard */}
                {profitMetrics.hasFinancials && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Profit per Unit
                      </span>
                      <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                        +{currency === "BDT" ? "৳" : "$"}{profitMetrics.unitProfit.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Gross margin
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Profit Margin
                      </span>
                      <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                        {profitMetrics.marginPct}%
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {profitMetrics.marginPct >= 35 ? "Healthy margin 🚀" : "Moderate margin"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Total Batch Profit
                      </span>
                      <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                        +{currency === "BDT" ? "৳" : "$"}{profitMetrics.batchProfit.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        On {quantity || 0} units
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Markup Multiplier
                      </span>
                      <div className="text-base font-extrabold text-emerald-950 mt-0.5">
                        {profitMetrics.markup}x
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Retail markup
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: Serialization & Stock Intake */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-sm">
                      🏷️
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Serialization &amp; Barcode Stock Intake
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Generate unique Code 128 thermal barcodes for physical warehouse packing.
                      </p>
                    </div>
                  </div>

                  {/* Barcode Mode Toggle */}
                  <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBarcodeType("SERIALIZED")}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        barcodeType === "SERIALIZED" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
                      }`}
                    >
                      Serialized
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodeType("UNIFORM")}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        barcodeType === "UNIFORM" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
                      }`}
                    >
                      Uniform
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Base SKU Prefix */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Base SKU Prefix <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateSku}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                      >
                        🎲 Auto-Generate SKU
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={baseSku}
                      onChange={(e) => setBaseSku(e.target.value.toUpperCase())}
                      placeholder="e.g. POLO-BLK, DENIM-SLIM"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono font-bold text-slate-900 uppercase focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Standardized SKU prefix used across thermal labels &amp; dispatching.
                    </p>
                  </div>

                  {/* Arriving Stock Quantity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Arriving Quantity (Units) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">Max 1,000</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="20"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      {[5, 10, 25, 50, 100].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setQuantity(String((parseInt(quantity, 10) || 0) + step))}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-semibold text-slate-700 transition"
                        >
                          +{step}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Barcode Samples Box */}
                {sampleBarcodes.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Thermal Barcode Sample Preview:
                      </span>
                      <span className="text-[11px] font-bold text-orange-700 font-mono">
                        {quantity || 0} Total Barcodes Prepared
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sampleBarcodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 shadow-2xs"
                        >
                          <span className="text-orange-500 font-normal">#{idx + 1}</span>
                          <span className="truncate">{code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: Warehouse Shelving & Courier Logistics */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 text-sm">
                    🚚
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Logistics &amp; Warehouse Location
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Parcel weight for Steadfast/Pathao courier fees and physical shelf bin location.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Courier Package Weight */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Package Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="0.35"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      {["0.25", "0.5", "1.0", "2.0"].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWeightKg(w)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-700 transition"
                        >
                          {w}kg
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shelf / Rack Location */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Shelf / Rack Bin
                    </label>
                    <input
                      type="text"
                      value={rackLocation}
                      onChange={(e) => setRackLocation(e.target.value)}
                      placeholder="e.g. Rack A-04, Box 2"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400">
                      Where staff finds the item.
                    </p>
                  </div>

                  {/* Low Stock Warning Threshold */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      placeholder="5"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400">
                      Triggers reorder alert ≤ this qty.
                    </p>
                  </div>
                </div>

                {/* Supplier Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Supplier / Wholesaler Name
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Chawkbazar Garments Hub, China Direct Cargo"
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* SECTION 5: Optional Product Variants (Accordion/Toggle) */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 text-sm">
                      🎨
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Product Variants (Size / Color)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Optional: Enable if this item has multiple sizes or colors.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVariants}
                      onChange={(e) => setHasVariants(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {hasVariants && (
                  <div className="pt-3 space-y-3 animate-in fade-in duration-200 border-t border-slate-100">
                    <div className="space-y-2">
                      {variantsList.map((variant, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="w-24">
                            <label className="text-[10px] font-bold text-slate-500 block uppercase">
                              Size
                            </label>
                            <input
                              type="text"
                              value={variant.size}
                              onChange={(e) => handleVariantChange(idx, "size", e.target.value)}
                              placeholder="M"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                            />
                          </div>

                          <div className="w-28">
                            <label className="text-[10px] font-bold text-slate-500 block uppercase">
                              Color
                            </label>
                            <input
                              type="text"
                              value={variant.color}
                              onChange={(e) => handleVariantChange(idx, "color", e.target.value)}
                              placeholder="Black"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                            />
                          </div>

                          <div className="w-28">
                            <label className="text-[10px] font-bold text-slate-500 block uppercase">
                              Price (৳)
                            </label>
                            <input
                              type="number"
                              value={variant.price}
                              onChange={(e) => handleVariantChange(idx, "price", e.target.value)}
                              placeholder={sellingPrice || "1200"}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold font-mono"
                            />
                          </div>

                          <div className="w-20">
                            <label className="text-[10px] font-bold text-slate-500 block uppercase">
                              Qty
                            </label>
                            <input
                              type="number"
                              value={variant.quantity}
                              onChange={(e) => handleVariantChange(idx, "quantity", e.target.value)}
                              placeholder="10"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-1 self-end pb-0.5">
                            <button
                              type="button"
                              onClick={() => handleDuplicateVariantRow(idx)}
                              className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 p-1.5 rounded-lg transition"
                              title="Duplicate row (এই ভ্যারিয়েন্ট কপি করুন)"
                              aria-label="Duplicate variant row"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveVariantRow(idx)}
                              disabled={variantsList.length <= 1}
                              className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Remove variant"
                              aria-label="Remove variant"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition"
                    >
                      <span>+ Add Another Variant (Size/Color)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ── Submit Action Button Bar ───────────────────── */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <span className="text-emerald-600 text-sm">✓</span>
                  <span>
                    Ready to intake <strong>{quantity || 0} units</strong> under SKU: <code>{formattedSku || "PENDING"}</code>
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    href="/dashboard/products"
                    className="w-1/2 sm:w-auto text-center rounded-2xl border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={loading || ctxLoading}
                    className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 hover:bg-orange-500 px-7 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 disabled:opacity-50 btn-tactile transition cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Generating {quantity || 0} Barcodes…</span>
                      </>
                    ) : (
                      <>
                        <span>+ Create Product &amp; Generate Barcodes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Live Interactive Product & Sticker Card Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                  <span>Live Product Preview</span>
                  <span className="text-emerald-500">●</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Merchant Store</span>
              </div>

              {/* Product Card Rendering */}
              <div className="rounded-2xl border border-slate-200/90 overflow-hidden bg-slate-50/50 shadow-2xs space-y-3 p-4">
                {/* Image or Icon Preview */}
                <div className="relative h-44 w-full rounded-xl overflow-hidden bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={name || "Product preview"}
                      className="h-full w-full object-cover"
                      onError={() => setImageUrl("")}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <span className="text-4xl select-none">
                        {category === "Footwear & Shoes"
                          ? "👟"
                          : category === "Electronics & Gadgets"
                          ? "🎧"
                          : category === "Health & Beauty"
                          ? "🧴"
                          : category === "Bags & Accessories"
                          ? "🎒"
                          : "👕"}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">Image will appear here</span>
                    </div>
                  )}

                  {/* Category Pill Over Image */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="rounded-full bg-slate-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      {category === "Other" ? (customCategory || "General") : category}
                    </span>
                  </div>

                  {/* Stock Status Pill */}
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {quantity || 0} Units In Stock
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {name || "Your Product Title Here"}
                    </h3>
                  </div>

                  {/* SKU & Shelving Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-800">
                      {formattedSku || "SKU-PREFIX"}
                    </span>
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                      📍 {rackLocation || "Rack A-01"}
                    </span>
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                      ⚖️ {weightKg || "0.35"} kg
                    </span>
                  </div>

                  {/* Financials in Preview */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Retail Price</span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        {currency === "BDT" ? "৳" : "$"}
                        {sellingPrice ? Number(sellingPrice).toLocaleString() : "0"}
                      </span>
                    </div>

                    {profitMetrics.hasFinancials && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Unit Profit</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                          +{currency === "BDT" ? "৳" : "$"}{profitMetrics.unitProfit.toLocaleString()} ({profitMetrics.marginPct}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Physical Thermal Sticker Preview (50mm x 25mm / 2" x 1") */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <span>Physical Thermal Sticker Label</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">50mm × 25mm</span>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3.5 flex flex-col items-center justify-between text-center space-y-1.5 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-900 truncate max-w-full">
                    {name || "SAMPLE PRODUCT"}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 flex items-center gap-2">
                    <span>SKU: {formattedSku || "SAMPLE"}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-900">
                      {currency === "BDT" ? "৳" : "$"}{sellingPrice || "0"}
                    </span>
                  </div>

                  {/* Render Code 128 Barcode */}
                  <div className="overflow-hidden py-1 max-w-full flex justify-center">
                    <Barcode
                      value={sampleBarcodes[0] || `${formattedSku || "SAMPLE"}-001`}
                      format="CODE128"
                      width={1.2}
                      height={32}
                      fontSize={10}
                      margin={0}
                      displayValue={true}
                    />
                  </div>

                  <div className="text-[9px] text-slate-400 tracking-wider font-mono">
                    {businessName || "SMARTINVENTORY"} • {rackLocation || "RACK-A1"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
