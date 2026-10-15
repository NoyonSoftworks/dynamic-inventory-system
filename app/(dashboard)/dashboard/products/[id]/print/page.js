"use client";

import { useEffect, useState, useRef, useMemo, use, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── Thermal Label Specifications (Standard 2" × 1" / 50mm × 25mm) ──
const THERMAL_PAGE_STYLE = `
  @page {
    size: 2in 1in;
    margin: 0mm;
  }
  @media print {
    *, *:before, *:after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 2in !important;
      height: 1in !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .thermal-label-container {
      margin: 0 !important;
      padding: 0 !important;
      width: 2in !important;
    }
    .thermal-sticker-page {
      width: 2in !important;
      height: 1in !important;
      max-width: 2in !important;
      max-height: 1in !important;
      padding: 1.5mm 2mm !important;
      margin: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: space-between !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      background: #ffffff !important;
    }
    /* Hide screen UI during print */
    .no-print {
      display: none !important;
    }
  }
`;

function PrintStickersContent({ params }) {
  // Support both useParams and React 19 unwrapped params Promise safely
  const clientParams = useParams();
  const resolvedParams = params ? (typeof params.then === "function" ? use(params) : params) : null;
  const productId = resolvedParams?.id || clientParams?.id;
  const { businessId } = useBusinessContext();

  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const printComponentRef = useRef(null);

  // ── Data Fetching ──────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;

    let isMounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Product Details
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (prodErr || !prodData) {
          throw new Error(prodErr?.message || "Product not found.");
        }

        if (prodData.business_id && businessId && prodData.business_id !== businessId) {
          throw new Error("Unauthorized: Product belongs to another workspace.");
        }

        // 2. Fetch Associated Inventory Items (Barcodes)
        const { data: itemsData, error: itemsErr } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("product_id", productId);

        if (itemsErr) {
          throw new Error(itemsErr.message || "Failed to load inventory barcodes.");
        }

        if (isMounted) {
          setProduct(prodData);
          const safeItems = itemsData || [];
          setItems(safeItems);
          // Default: select all items for printing
          setSelectedIds(new Set(safeItems.map((item) => item.id)));
        }
      } catch (err) {
        if (isMounted) setError(err.message || "An unexpected error occurred.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [productId, businessId]);

  // ── react-to-print Integration ─────────────────────────────
  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `${product?.base_sku || "product"}_barcodes_2x1`,
    pageStyle: THERMAL_PAGE_STYLE,
  });

  // ── Items to Print (filtered by selection) ─────────────────
  const printableItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // ── Toggle Single Selection ────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Select All / Deselect All ──────────────────────────────
  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // ── Loading Screen ─────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-600">
          <Spinner size={24} />
          <span className="text-sm font-semibold">Loading thermal barcodes…</span>
        </div>
      </main>
    );
  }

  // ── Error Screen ───────────────────────────────────────────
  if (error || !product) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl ring-1 ring-slate-200 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900">Failed to Load Product</h2>
          <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
            {error || "Product not found."}
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Breadcrumb & Top Bar ────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link href="/" className="hover:text-indigo-600 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-400">Products</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold truncate max-w-[200px]">
                {product.name}
              </span>
              <span>/</span>
              <span className="text-indigo-600 font-semibold">Thermal Print</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>🏷️</span> Thermal Barcode Printing
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Standard 50mm × 25mm (2&quot; × 1&quot;) label printer layout for Zebra, Rollo, Munbyn &amp; Dymo printers.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* ── Product Overview & Print Action Card ─────────── */}
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="inline-block rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold mb-1">
                {product.category || "General"}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Base SKU: <code className="font-mono font-bold text-slate-800">{product.base_sku || "N/A"}</code>
                {product.price !== undefined && (
                  <> · MSRP: <span className="font-semibold text-slate-800">${Number(product.price).toFixed(2)}</span></>
                )}
              </p>
            </div>

            {/* Print Trigger Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                disabled={printableItems.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/25 hover:bg-orange-500 hover:shadow-orange-600/40 focus:ring-2 focus:ring-orange-600/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-tactile"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print {printableItems.length} Thermal Stickers</span>
              </button>
            </div>
          </div>

          {/* Sizing & Printer Specs Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <span className="block text-slate-400 font-medium">Sticker Size:</span>
              <span className="font-bold text-slate-800">2&quot; × 1&quot; (50mm × 25mm)</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Symbology:</span>
              <span className="font-bold text-slate-800">CODE128 (High-Density)</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Available Inventory:</span>
              <span className="font-bold text-slate-800">{items.length} Units</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Selected for Print:</span>
              <span className="font-bold text-orange-600">{printableItems.length} Stickers</span>
            </div>
          </div>

          {/* Selection Controls */}
          {items.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={toggleAll}
                className="font-semibold text-orange-600 hover:text-orange-700 transition"
              >
                {selectedIds.size === items.length ? "Deselect All" : "Select All Items"}
              </button>
              <span>Click a sticker preview below to toggle inclusion</span>
            </div>
          )}
        </div>

        {/* ── Screen Sticker Previews ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Label Visual Preview ({items.length} Total Units)
            </h3>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-800">No inventory units found</h4>
              <p className="mt-1 text-xs text-slate-500">
                This product does not have any barcodes generated in <code>inventory_items</code> yet.
              </p>
              <Link
                href="/dashboard/products/add"
                className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                + Intake Inventory
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`cursor-pointer rounded-xl border p-3 bg-white shadow-sm transition-all duration-150 relative ${
                      isSelected
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                        : "border-slate-200 opacity-50 hover:opacity-80"
                    }`}
                  >
                    {/* Selection Checkbox Pill */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-slate-400">
                        #{index + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isSelected ? "✓ Included" : "Excluded"}
                      </span>
                    </div>

                    {/* Miniature Sticker Display (Visual Screen Representation) */}
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-2.5 flex flex-col items-center justify-between min-h-[92px]">
                      {/* Product Name */}
                      <p className="w-full text-center text-[10px] font-bold text-slate-800 truncate uppercase tracking-tight">
                        {product.name}
                      </p>

                      {/* SVG Barcode */}
                      <div className="w-full flex justify-center py-1 overflow-hidden">
                        <Barcode
                          value={item.unique_barcode}
                          format="CODE128"
                          width={1.2}
                          height={28}
                          margin={0}
                          displayValue={false}
                          renderer="svg"
                          background="transparent"
                        />
                      </div>

                      {/* Barcode Text & Status */}
                      <div className="w-full flex items-center justify-between text-[9px] font-mono font-bold text-slate-900 px-1">
                        <span className="truncate">{item.unique_barcode}</span>
                        {product.price !== undefined && (
                          <span className="text-slate-500 font-sans font-semibold">
                            ${Number(product.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ── PRINTABLE COMPONENT: Sent Exclusively to Thermal Printer ── */}
      {/* ============================================================== */}
      <div className="hidden">
        <ComponentToPrint
          ref={printComponentRef}
          product={product}
          items={printableItems}
        />
      </div>
    </main>
  );
}

// ── Pure Component Sent to the Thermal Printer ────────────────
const ComponentToPrint = ({ product, items }, ref) => {
  return (
    <div ref={ref} className="thermal-label-container">
      {items.map((item) => (
        <div key={item.id} className="thermal-sticker-page">
          {/* 1. Header: Product Name (Truncated, Crisp & Bold) */}
          <div
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "8pt",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "-0.2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: "1.1",
              color: "#000000",
            }}
          >
            {product?.name || "Product"}
          </div>

          {/* 2. Vector SVG Barcode (Optimized for 50mm width) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              margin: "1px 0",
            }}
          >
            <Barcode
              value={item.unique_barcode}
              format="CODE128"
              width={1.25}
              height={32}
              margin={0}
              displayValue={false}
              renderer="svg"
              background="#ffffff"
              lineColor="#000000"
            />
          </div>

          {/* 3. Footer: Alphanumeric Code & Optional MSRP */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 1mm",
              fontSize: "7.5pt",
              fontFamily: "monospace",
              fontWeight: "700",
              lineHeight: "1",
              color: "#000000",
            }}
          >
            <span style={{ letterSpacing: "0.5px" }}>
              {item.unique_barcode}
            </span>
            {product?.price !== undefined && (
              <span style={{ fontFamily: "sans-serif", fontWeight: "600" }}>
                ${Number(product.price).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── spinner icon ──────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-indigo-600"
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

export default function PrintStickersPage(props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Spinner size={32} />
        </main>
      }
    >
      <PrintStickersContent {...props} />
    </Suspense>
  );
}
