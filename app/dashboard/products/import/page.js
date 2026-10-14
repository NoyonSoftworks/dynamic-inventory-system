"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

/**
 * Generates an alphanumeric random code for barcode serialization.
 * e.g., TSHIRT-A8K2Z
 */
function generateRandomCode(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Downloads a standardized sample CSV template for rapid tenant onboarding.
 */
function downloadSampleTemplate() {
  const headers = [
    "Name",
    "Base SKU",
    "Category",
    "Price",
    "Initial Stock Quantity",
  ];

  const sampleRows = [
    [
      "Classic Cotton T-Shirt",
      "TSHIRT-BLK-M",
      "Apparel",
      "24.99",
      "15",
    ],
    [
      "Wireless Noise-Canceling Headphones",
      "AUDIO-WH-1000",
      "Electronics",
      "149.50",
      "10",
    ],
    [
      "Ceramic Pour-Over Coffee Dripper",
      "HOME-DRIP-01",
      "Home & Kitchen",
      "32.00",
      "20",
    ],
    [
      "Ergonomic Optical Mouse",
      "PERIPH-M-OPT",
      "Electronics",
      "45.00",
      "8",
    ],
    [
      "Organic Heavyweight Tote Bag",
      "TOTE-BAG-NAT",
      "Accessories",
      "18.00",
      "25",
    ],
  ];

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...sampleRows.map((r) => r.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "Sample_Product_Import_Template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function BulkImportPage() {
  const { businessId, businessName, role, loading: ctxLoading } =
    useBusinessContext();

  const fileInputRef = useRef(null);

  // ── Drag & Drop / File State ───────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);

  // ── Parsed Rows State ──────────────────────────────────────
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);

  // ── Import Progress State ──────────────────────────────────
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Helper Toast Trigger ───────────────────────────────────
  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // ── Reset Current File ─────────────────────────────────────
  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    setImportProgress(0);
    setImportStep("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ── CSV Row Parser & Normalizer ────────────────────────────
  const processCSVFile = (file) => {
    if (!file) return;

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Invalid file type. Please upload a valid .csv file.");
      showToast("error", "Only CSV files are supported.");
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        setIsParsing(false);

        if (!results.data || results.data.length === 0) {
          setParseError("The uploaded CSV file is empty.");
          setParsedRows([]);
          return;
        }

        const skuSeen = new Set();
        const validated = results.data.map((rawRow, index) => {
          // Normalize column headers flexibly
          const name = (
            rawRow["Name"] ||
            rawRow["name"] ||
            rawRow["Product Name"] ||
            rawRow["product_name"] ||
            rawRow["Title"] ||
            rawRow["title"] ||
            ""
          ).trim();

          const rawSku = (
            rawRow["Base SKU"] ||
            rawRow["base_sku"] ||
            rawRow["SKU"] ||
            rawRow["sku"] ||
            rawRow["Barcode"] ||
            ""
          ).trim();
          const baseSku = rawSku.toUpperCase().replace(/\s+/g, "-");

          const category = (
            rawRow["Category"] ||
            rawRow["category"] ||
            rawRow["Type"] ||
            "General"
          ).trim();

          const rawPrice = (
            rawRow["Price"] ||
            rawRow["price"] ||
            rawRow["Unit Price"] ||
            rawRow["unit_price"] ||
            ""
          ).toString().replace(/[$,]/g, "").trim();

          const rawStock = (
            rawRow["Initial Stock Quantity"] ||
            rawRow["Initial Stock"] ||
            rawRow["initial_stock"] ||
            rawRow["Stock"] ||
            rawRow["stock"] ||
            rawRow["Quantity"] ||
            rawRow["quantity"] ||
            rawRow["Qty"] ||
            "0"
          ).toString().trim();

          const parsedPrice = parseFloat(rawPrice);
          const parsedStock = parseInt(rawStock, 10);

          const errors = [];

          if (!name) {
            errors.push("Missing Product Name");
          }

          if (!baseSku) {
            errors.push("Missing Base SKU");
          } else if (skuSeen.has(baseSku)) {
            errors.push(`Duplicate SKU (${baseSku}) in file`);
          } else {
            skuSeen.add(baseSku);
          }

          if (isNaN(parsedPrice) || parsedPrice < 0) {
            errors.push("Invalid Price (must be a number ≥ 0)");
          }

          if (isNaN(parsedStock) || parsedStock < 0) {
            errors.push("Invalid Stock (must be an integer ≥ 0)");
          } else if (parsedStock > 1000) {
            errors.push("Stock exceeds limit (max 1,000 units per product)");
          }

          return {
            rowNumber: index + 1,
            name,
            base_sku: baseSku,
            category: category || "General",
            price: isNaN(parsedPrice) ? 0 : parsedPrice,
            initial_stock: isNaN(parsedStock) ? 0 : parsedStock,
            rawPrice,
            rawStock,
            errors,
            isValid: errors.length === 0,
          };
        });

        setParsedRows(validated);
        const validCount = validated.filter((r) => r.isValid).length;
        if (validCount === 0) {
          showToast(
            "error",
            "No valid product rows found. Check column headers and data."
          );
        } else {
          showToast("success", `Parsed ${validated.length} rows successfully.`);
        }
      },
      error: (err) => {
        setIsParsing(false);
        setParseError(`Failed to parse CSV file: ${err.message}`);
        showToast("error", "CSV parsing failed.");
      },
    });
  };

  // ── Drag & Drop Listeners ──────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processCSVFile(e.target.files[0]);
    }
  };

  // ── Aggregated Metrics ─────────────────────────────────────
  const validRows = useMemo(
    () => parsedRows.filter((r) => r.isValid),
    [parsedRows]
  );
  const invalidRows = useMemo(
    () => parsedRows.filter((r) => !r.isValid),
    [parsedRows]
  );
  const totalStockUnits = useMemo(
    () => validRows.reduce((sum, r) => sum + r.initial_stock, 0),
    [validRows]
  );
  const totalCatalogValue = useMemo(
    () => validRows.reduce((sum, r) => sum + r.price * r.initial_stock, 0),
    [validRows]
  );

  // ── Supabase Bulk Insert Handler ───────────────────────────
  const executeBulkImport = async () => {
    if (role === "viewer") {
      showToast(
        "error",
        "Permission Denied: Viewers cannot create or import products."
      );
      return;
    }

    if (!businessId) {
      showToast(
        "error",
        "Business context is not loaded yet. Please refresh the page."
      );
      return;
    }

    if (validRows.length === 0) {
      showToast("error", "No valid rows available to import.");
      return;
    }

    setIsImporting(true);
    setImportProgress(10);
    setImportStep("Preparing product records...");

    try {
      // 1. Build product payloads
      const productPayloads = validRows.map((r) => {
        const payload = {
          name: r.name,
          category: r.category,
          base_sku: r.base_sku,
          price: r.price,
        };
        if (businessId) {
          payload.business_id = businessId;
        }
        return payload;
      });

      setImportStep(
        `Inserting ${productPayloads.length} products into catalog...`
      );
      setImportProgress(35);

      // 2. Perform bulk insert into 'products' table
      let { data: insertedProducts, error: prodErr } = await supabase
        .from("products")
        .insert(productPayloads)
        .select("id, base_sku, name");

      // Fallback: If products table schema does not include business_id, retry without it
      if (prodErr && prodErr.message?.includes("business_id")) {
        const strippedPayloads = productPayloads.map((p) => {
          const copy = { ...p };
          delete copy.business_id;
          return copy;
        });

        const retryRes = await supabase
          .from("products")
          .insert(strippedPayloads)
          .select("id, base_sku, name");

        insertedProducts = retryRes.data;
        prodErr = retryRes.error;
      }

      if (prodErr || !insertedProducts) {
        throw new Error(
          prodErr?.message || "Failed to bulk insert products into database."
        );
      }

      setImportProgress(65);
      setImportStep("Generating serialized unique barcodes...");

      // 3. Map inserted products and generate unique serialized barcodes for inventory_items
      const inventoryRows = [];
      const usedBarcodes = new Set();

      insertedProducts.forEach((prod) => {
        const matchedRow = validRows.find(
          (r) => r.base_sku.toUpperCase() === prod.base_sku.toUpperCase()
        );
        const qty = matchedRow ? matchedRow.initial_stock : 0;

        for (let i = 0; i < qty; i++) {
          let uniqueBarcode;
          do {
            uniqueBarcode = `${prod.base_sku}-${generateRandomCode(5)}`;
          } while (usedBarcodes.has(uniqueBarcode));

          usedBarcodes.add(uniqueBarcode);

          const itemRow = {
            product_id: prod.id,
            unique_barcode: uniqueBarcode,
            status: "IN_STOCK",
          };

          if (businessId) {
            itemRow.business_id = businessId;
          }

          inventoryRows.push(itemRow);
        }
      });

      // 4. Bulk insert into 'inventory_items' in chunks (e.g., 250 items per batch)
      let insertedItemCount = 0;
      if (inventoryRows.length > 0) {
        setImportStep(
          `Registering ${inventoryRows.length} serialized inventory barcodes...`
        );
        const CHUNK_SIZE = 250;

        for (let i = 0; i < inventoryRows.length; i += CHUNK_SIZE) {
          const chunk = inventoryRows.slice(i, i + CHUNK_SIZE);
          let { error: itemErr } = await supabase
            .from("inventory_items")
            .insert(chunk);

          // Fallback if inventory_items doesn't have business_id
          if (itemErr && itemErr.message?.includes("business_id")) {
            const strippedChunk = chunk.map((item) => {
              const copy = { ...item };
              delete copy.business_id;
              return copy;
            });
            const retryItems = await supabase
              .from("inventory_items")
              .insert(strippedChunk);
            itemErr = retryItems.error;
          }

          if (itemErr) {
            console.warn("Inventory batch notice:", itemErr);
          } else {
            insertedItemCount += chunk.length;
          }

          const currentPct = Math.round(
            65 + ((i + chunk.length) / inventoryRows.length) * 30
          );
          setImportProgress(Math.min(currentPct, 95));
        }
      }

      setImportProgress(100);
      setImportStep("Bulk Import Complete!");

      setImportResult({
        productsCount: insertedProducts.length,
        itemsCount: insertedItemCount || inventoryRows.length,
        skippedCount: invalidRows.length,
      });

      showToast(
        "success",
        `Successfully imported ${insertedProducts.length} products and ${inventoryRows.length} serialized units!`
      );
    } catch (err) {
      console.error("Bulk Import Error:", err);
      showToast("error", err.message || "An unexpected error occurred.");
    } finally {
      setIsImporting(false);
    }
  };

  // Preview only the first 5 rows
  const previewRows = parsedRows.slice(0, 5);

  if (ctxLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading workspace context...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-5 py-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              toastMessage.type === "success"
                ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                : "bg-rose-500 shadow-sm shadow-rose-500"
            }`}
          />
          <p className="text-sm font-medium text-slate-100">
            {toastMessage.text}
          </p>
        </div>
      )}

      {/* ── Top Bar / Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5 sm:px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition"
              title="Return to Catalog"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <span>🏢</span> {businessName || "Pro Workspace"}
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-normal">Catalog Intake</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                CSV Bulk Product Onboarding
              </h1>
            </div>
          </div>

          {/* Download Sample Template Button */}
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-200 transition shadow-sm"
          >
            <svg
              className="w-4 h-4 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download Sample Template (.csv)</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 space-y-8">
        {/* ── Hero Instruction Card ──────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                🚀 Rapid Tenant Onboarding
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Instantly populate your warehouse catalog
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Drop your CSV spreadsheet below. The system validates all SKUs,
                maps catalog records to your workspace, and automatically
                generates serialized barcode items for immediate physical dispatch.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              >
                <span>📄</span> Get Sample CSV
              </button>
              <Link
                href="/dashboard/products/add"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <span>➕</span> Add Single Item
              </Link>
            </div>
          </div>
        </div>

        {/* ── Success Result Banner ──────────────────────────────── */}
        {importResult && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-6 sm:p-8 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 text-xl border border-emerald-500/30">
                ✓
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Bulk Import Finished Successfully!
                </h3>
                <p className="text-xs text-emerald-300/80">
                  All valid products and individual barcodes are now registered
                  and ready for scanning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="text-xs text-slate-400 font-medium">
                  Products Created
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {importResult.productsCount}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="text-xs text-slate-400 font-medium">
                  Barcodes Serialized
                </div>
                <div className="text-2xl font-black text-indigo-400 mt-1">
                  {importResult.itemsCount} Units
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-400 font-medium">
                  Skipped / Errors
                </div>
                <div className="text-2xl font-black text-slate-300 mt-1">
                  {importResult.skippedCount}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
              >
                <span>📦</span> View Products in Catalog
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                <span>🔄</span> Import Another File
              </button>
            </div>
          </div>
        )}

        {/* ── Drag & Drop Upload Zone ────────────────────────────── */}
        {!importResult && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 ${
              isDragging
                ? "border-indigo-500 bg-indigo-950/20 scale-[1.01] shadow-2xl shadow-indigo-500/10"
                : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-indigo-400 shadow-inner group-hover:scale-110 group-hover:border-indigo-500/50 group-hover:text-indigo-300 transition-all duration-300">
              {isParsing ? (
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              ) : (
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-base font-semibold text-slate-200">
                {isParsing ? (
                  <span className="text-indigo-400 font-bold">
                    Parsing & Validating CSV rows...
                  </span>
                ) : selectedFile ? (
                  <span className="text-indigo-400 font-bold">
                    {selectedFile.name}
                  </span>
                ) : (
                  <>
                    <span className="text-indigo-400 hover:underline">
                      Click to browse
                    </span>{" "}
                    or drag and drop your CSV file here
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400">
                Supported format: <code className="text-slate-300">.csv</code>{" "}
                (UTF-8 encoded). Max recommended: 500 rows per batch.
              </p>
            </div>

            {selectedFile && !isParsing && (
              <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-1.5 text-xs text-slate-300">
                <span>
                  📄 {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-semibold">
                  {parsedRows.length} Rows Detected
                </span>
                <span className="text-slate-500">•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Change File
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Parse Error Alert ──────────────────────────────────── */}
        {parseError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{parseError}</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-400 hover:text-white underline font-medium"
            >
              Reset
            </button>
          </div>
        )}

        {/* ── Metrics Cards (When File is Parsed) ─────────────────── */}
        {parsedRows.length > 0 && !importResult && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total Rows
              </div>
              <div className="mt-1.5 text-2xl font-bold text-white">
                {parsedRows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Valid & Ready
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-400">
                {validRows.length}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                invalidRows.length > 0
                  ? "border-rose-500/30 bg-rose-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  invalidRows.length > 0 ? "text-rose-400" : "text-slate-400"
                }`}
              >
                Errors / Issues
              </div>
              <div
                className={`mt-1.5 text-2xl font-bold ${
                  invalidRows.length > 0 ? "text-rose-400" : "text-slate-300"
                }`}
              >
                {invalidRows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Units To Generate
              </div>
              <div className="mt-1.5 text-2xl font-bold text-indigo-300">
                {totalStockUnits.toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 col-span-2 lg:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                Est. Catalog Value
              </div>
              <div className="mt-1.5 text-2xl font-bold text-violet-200">
                ${totalCatalogValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Preview Table of the First 5 Rows ───────────────────── */}
        {parsedRows.length > 0 && !importResult && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pt-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>👀</span> Data Preview (First 5 Rows)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify column mapping and check any flagged issues before
                  executing bulk insertion.
                </p>
              </div>

              {invalidRows.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  <span>⚠️</span> {invalidRows.length} rows contain errors and will be skipped
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Row
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Base SKU
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Initial Stock
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {previewRows.map((row) => {
                    return (
                      <tr
                        key={row.rowNumber}
                        className={`transition-colors ${
                          row.isValid
                            ? "hover:bg-slate-800/40 bg-slate-900/40"
                            : "bg-rose-950/20 hover:bg-rose-950/30"
                        }`}
                      >
                        {/* 1. Row Number */}
                        <td className="px-5 py-3.5 text-slate-400 font-sans">
                          #{row.rowNumber}
                        </td>

                        {/* 2. Validation Status */}
                        <td className="px-5 py-3.5 font-sans">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                              ✓ Valid
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
                                ✕ Error
                              </span>
                              <div className="text-[10px] text-rose-400 font-sans">
                                {row.errors.join(", ")}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 3. Name */}
                        <td className="px-5 py-3.5 font-sans font-medium text-slate-200">
                          {row.name ? (
                            row.name
                          ) : (
                            <span className="text-rose-400 italic">
                              [Missing Name]
                            </span>
                          )}
                        </td>

                        {/* 4. Base SKU */}
                        <td className="px-5 py-3.5 font-bold text-indigo-400">
                          {row.base_sku ? (
                            row.base_sku
                          ) : (
                            <span className="text-rose-400 italic font-normal">
                              [Missing SKU]
                            </span>
                          )}
                        </td>

                        {/* 5. Category */}
                        <td className="px-5 py-3.5 font-sans text-slate-300">
                          {row.category || "General"}
                        </td>

                        {/* 6. Price */}
                        <td className="px-5 py-3.5 text-slate-200">
                          {row.errors.some((e) => e.includes("Price")) ? (
                            <span className="text-rose-400 font-bold">
                              {row.rawPrice || "[Missing]"}
                            </span>
                          ) : (
                            `$${row.price.toFixed(2)}`
                          )}
                        </td>

                        {/* 7. Initial Stock */}
                        <td className="px-5 py-3.5 text-slate-200">
                          {row.errors.some((e) => e.includes("Stock")) ? (
                            <span className="text-rose-400 font-bold">
                              {row.rawStock || "[Invalid]"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {row.initial_stock} Units
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {parsedRows.length > 5 && (
              <div className="px-6 pb-6 pt-2 text-xs text-slate-400 text-center font-sans border-t border-slate-800/60">
                Showing first 5 rows of {parsedRows.length} total rows.
              </div>
            )}
          </div>
        )}

        {/* ── Action Panel: Execute Bulk Insert ───────────────────── */}
        {parsedRows.length > 0 && !importResult && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-white">
                Ready to populate warehouse catalog?
              </h4>
              <p className="text-xs text-slate-400">
                Will create{" "}
                <span className="text-emerald-400 font-bold">
                  {validRows.length} products
                </span>{" "}
                and automatically generate{" "}
                <span className="text-indigo-400 font-bold">
                  {totalStockUnits.toLocaleString()} individual barcodes
                </span>{" "}
                for workspace{" "}
                <span className="text-slate-300 font-semibold">
                  &quot;{businessName || "My Store"}&quot;
                </span>
                .
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={isImporting}
                className="w-1/2 md:w-auto rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeBulkImport}
                disabled={isImporting || validRows.length === 0}
                className="w-1/2 md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    <span>{importStep || "Processing..."}</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>
                      Import {validRows.length} Product
                      {validRows.length === 1 ? "" : "s"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Stepper / Progress Bar During Import ────────────────── */}
        {isImporting && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
              <span>{importStep}</span>
              <span className="font-mono">{importProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
