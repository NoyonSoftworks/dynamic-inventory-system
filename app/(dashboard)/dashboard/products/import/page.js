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

    if (validRows.length === 0) {
      showToast("error", "No valid rows available to import.");
      return;
    }

    setIsImporting(true);
    setImportProgress(15);
    setImportStep("Connecting to warehouse import engine...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setImportProgress(40);
      setImportStep(`Importing ${validRows.length} catalog products & generating barcodes...`);

      // High-speed server-side atomic importer (bypasses RLS recursion)
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
        body: JSON.stringify({ validRows }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Bulk import failed.");
      }

      setImportProgress(100);
      setImportStep("Bulk Import Complete!");

      setImportResult({
        productsCount: result.productsCount || validRows.length,
        itemsCount: result.itemsCount || totalStockUnits,
        skippedCount: invalidRows.length,
      });

      showToast(
        "success",
        `Successfully imported ${result.productsCount} products and ${result.itemsCount} serialized units!`
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
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">Loading workspace context…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              toastMessage.type === "success"
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
          />
          <p className="text-sm font-semibold text-slate-900">
            {toastMessage.text}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {/* ── Top Header Section ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link href="/dashboard/products" className="hover:text-orange-600 transition">
                Products
              </Link>
              <span>/</span>
              <span className="text-orange-600 font-semibold">Bulk Intake</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              CSV Bulk Product Onboarding
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload spreadsheets to bulk-create catalog items and generate serialized inventory barcodes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
            >
              <svg
                className="w-4 h-4 text-orange-600"
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
              <span>Download Sample CSV</span>
            </button>

            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
            >
              + Single Intake
            </Link>
          </div>
        </div>

        {/* ── Success Result Banner ──────────────────────────────── */}
        {importResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white text-lg font-bold shadow-md shadow-emerald-600/30">
                ✓
              </span>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Bulk Import Finished Successfully!
                </h3>
                <p className="text-xs text-emerald-800">
                  All valid products and individual barcodes are now registered and ready for fulfillment scanning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Products Created
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
                  {importResult.productsCount}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Barcodes Serialized
                </div>
                <div className="text-2xl font-bold text-orange-600 mt-1 font-mono">
                  {importResult.itemsCount} Units
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Skipped / Errors
                </div>
                <div className="text-2xl font-bold text-slate-700 mt-1 font-mono">
                  {importResult.skippedCount}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/25 hover:bg-orange-500 transition btn-tactile"
              >
                <span>View Products in Catalog</span>
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <span>Import Another File</span>
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
            className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 ${
              isDragging
                ? "border-orange-600 bg-orange-50/60 shadow-lg"
                : "border-slate-300 hover:border-orange-500 bg-white hover:bg-slate-50/60 shadow-xs"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 shadow-xs group-hover:scale-105 transition-all">
              {isParsing ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              ) : (
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="text-sm font-bold text-slate-900">
                {isParsing ? (
                  <span className="text-orange-600 font-bold">
                    Parsing &amp; Validating CSV rows…
                  </span>
                ) : selectedFile ? (
                  <span className="text-orange-600 font-bold">
                    {selectedFile.name}
                  </span>
                ) : (
                  <>
                    <span className="text-orange-600 hover:underline">
                      Click to upload
                    </span>{" "}
                    or drag and drop your CSV spreadsheet
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500">
                UTF-8 encoded <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">.csv</code> files up to 500 rows per batch.
              </p>
            </div>

            {selectedFile && !isParsing && (
              <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs text-slate-700">
                <span className="font-mono font-medium">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-bold font-mono">
                  {parsedRows.length} Rows Detected
                </span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Change File
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Parse Error Alert ──────────────────────────────────── */}
        {parseError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>{parseError}</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-rose-700 hover:underline font-semibold"
            >
              Reset
            </button>
          </div>
        )}

        {/* ── Metrics Cards (When File is Parsed) ─────────────────── */}
        {parsedRows.length > 0 && !importResult && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Rows
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900 font-mono">
                {parsedRows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Valid &amp; Ready
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-700 font-mono">
                {validRows.length}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 shadow-xs bg-white ${
                invalidRows.length > 0
                  ? "border-rose-200"
                  : "border-slate-200/80"
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  invalidRows.length > 0 ? "text-rose-700" : "text-slate-500"
                }`}
              >
                Errors / Issues
              </div>
              <div
                className={`mt-1.5 text-2xl font-bold font-mono ${
                  invalidRows.length > 0 ? "text-rose-700" : "text-slate-400"
                }`}
              >
                {invalidRows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">
                Units To Generate
              </div>
              <div className="mt-1.5 text-2xl font-bold text-orange-600 font-mono">
                {totalStockUnits.toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-xs col-span-2 lg:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                Est. Catalog Value
              </div>
              <div className="mt-1.5 text-2xl font-bold text-violet-700 font-mono">
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
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pt-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Data Preview (First 5 Rows)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify column mapping and check any flagged issues before executing bulk insertion.
                </p>
              </div>

              {invalidRows.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{invalidRows.length} rows contain errors and will be skipped</span>
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3 tracking-wider">Row</th>
                    <th className="px-5 py-3 tracking-wider">Status</th>
                    <th className="px-5 py-3 tracking-wider">Product Name</th>
                    <th className="px-5 py-3 tracking-wider">Base SKU</th>
                    <th className="px-5 py-3 tracking-wider">Category</th>
                    <th className="px-5 py-3 tracking-wider">Price</th>
                    <th className="px-5 py-3 tracking-wider">Initial Stock</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-mono bg-white">
                  {previewRows.map((row) => {
                    return (
                      <tr
                        key={row.rowNumber}
                        className={`transition-colors ${
                          row.isValid
                            ? "hover:bg-orange-50/30"
                            : "bg-rose-50/40 hover:bg-rose-50/60"
                        }`}
                      >
                        {/* 1. Row Number */}
                        <td className="px-5 py-3.5 text-slate-400 font-sans">
                          #{row.rowNumber}
                        </td>

                        {/* 2. Validation Status */}
                        <td className="px-5 py-3.5 font-sans">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              ✓ Valid
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                                ✕ Error
                              </span>
                              <div className="text-[10px] text-rose-600 font-sans">
                                {row.errors.join(", ")}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 3. Name */}
                        <td className="px-5 py-3.5 font-sans font-semibold text-slate-900">
                          {row.name ? (
                            row.name
                          ) : (
                            <span className="text-rose-600 italic">
                              [Missing Name]
                            </span>
                          )}
                        </td>

                        {/* 4. Base SKU */}
                        <td className="px-5 py-3.5 font-bold text-orange-600">
                          {row.base_sku ? (
                            row.base_sku
                          ) : (
                            <span className="text-rose-600 italic font-normal">
                              [Missing SKU]
                            </span>
                          )}
                        </td>

                        {/* 5. Category */}
                        <td className="px-5 py-3.5 font-sans text-slate-600">
                          {row.category || "General"}
                        </td>

                        {/* 6. Price */}
                        <td className="px-5 py-3.5 text-slate-900 font-bold">
                          {row.errors.some((e) => e.includes("Price")) ? (
                            <span className="text-rose-600 font-bold">
                              {row.rawPrice || "[Missing]"}
                            </span>
                          ) : (
                            `$${row.price.toFixed(2)}`
                          )}
                        </td>

                        {/* 7. Initial Stock */}
                        <td className="px-5 py-3.5 text-slate-900 font-bold">
                          {row.errors.some((e) => e.includes("Stock")) ? (
                            <span className="text-rose-600 font-bold">
                              {row.rawStock || "[Invalid]"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
              <div className="px-6 pb-6 pt-2 text-xs text-slate-400 text-center font-sans border-t border-slate-100">
                Showing first 5 rows of {parsedRows.length} total rows.
              </div>
            )}
          </div>
        )}

        {/* ── Action Panel: Execute Bulk Insert ───────────────────── */}
        {parsedRows.length > 0 && !importResult && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-slate-900">
                Ready to populate warehouse catalog?
              </h4>
              <p className="text-xs text-slate-500">
                Will create{" "}
                <span className="text-emerald-700 font-bold">
                  {validRows.length} products
                </span>{" "}
                and automatically generate{" "}
                <span className="text-orange-600 font-bold">
                  {totalStockUnits.toLocaleString()} individual barcodes
                </span>{" "}
                for workspace{" "}
                <span className="text-slate-800 font-semibold">
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
                className="w-1/2 md:w-auto rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 shadow-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeBulkImport}
                disabled={isImporting || validRows.length === 0}
                className="w-1/2 md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed btn-tactile"
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
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
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
          <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs text-orange-700 font-semibold">
              <span>{importStep}</span>
              <span className="font-mono">{importProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-orange-100 overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all duration-300 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
