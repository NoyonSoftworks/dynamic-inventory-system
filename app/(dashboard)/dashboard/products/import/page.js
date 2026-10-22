"use client";

import { useState, useRef, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    ["Classic Cotton T-Shirt", "TSHIRT-BLK-M", "Apparel", "24.99", "15"],
    ["Wireless Noise-Canceling Headphones", "AUDIO-WH-1000", "Electronics", "149.50", "10"],
    ["Ceramic Pour-Over Coffee Dripper", "HOME-DRIP-01", "Home & Kitchen", "32.00", "20"],
    ["Ergonomic Optical Mouse", "PERIPH-M-OPT", "Electronics", "45.00", "8"],
    ["Organic Heavyweight Tote Bag", "TOTE-BAG-NAT", "Accessories", "18.00", "25"],
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

function BulkImportContent() {
  const { businessId, businessName, role, loading: ctxLoading } = useBusinessContext();
  const searchParams = useSearchParams();

  // ── Mode Switcher ('website' | 'csv') ──────────────────────
  const initialMode = searchParams?.get("mode") || (searchParams?.get("url") || searchParams?.get("website") ? "website" : "website");
  const [importMode, setImportMode] = useState(initialMode);

  // ── Common Toast & Result State ────────────────────────────
  const [toastMessage, setToastMessage] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. LIVE WEBSITE SCANNER & CATALOG IMPORTER STATE
  // ─────────────────────────────────────────────────────────────
  const initialUrl = searchParams?.get("url") || searchParams?.get("website") || "";
  const [websiteUrl, setWebsiteUrl] = useState(initialUrl);
  const [scanPlatform, setScanPlatform] = useState("auto");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scannedProducts, setScannedProducts] = useState([]);
  const [scannedMeta, setScannedMeta] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [productSearch, setProductSearch] = useState("");

  // Auto-fetch merchant's configured store website if URL input is empty
  useEffect(() => {
    if (!websiteUrl && businessId) {
      let active = true;
      async function loadSavedWebsite() {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch("/api/tenant/profile", {
            headers: {
              Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (active && data?.website_url) {
              setWebsiteUrl(data.website_url);
            }
          }
        } catch (e) {
          // ignore
        }
      }
      loadSavedWebsite();
      return () => {
        active = false;
      };
    }
  }, [websiteUrl, businessId]);

  // Scan & Fetch Website Catalog
  async function handleScanWebsite(e) {
    e?.preventDefault();
    if (!websiteUrl.trim()) {
      showToast("error", "Please enter your store website URL (e.g. https://yourstore.com).");
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScannedProducts([]);
    setImportResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/products/website-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
          platform: scanPlatform,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to scan website catalog.");
      }

      if (!data.products || data.products.length === 0) {
        throw new Error("No products could be detected on this website. Make sure the store catalog is publicly accessible or try CSV upload.");
      }

      setScannedProducts(data.products);
      setScannedMeta({
        platform: data.platform,
        count: data.count,
        sourceUrl: data.sourceUrl,
      });

      // Select all detected items by default
      setSelectedIndices(new Set(data.products.map((_, i) => i)));
      showToast("success", `Found ${data.products.length} products from ${data.platform}!`);
    } catch (err) {
      console.error("Website Scan Error:", err);
      setScanError(err.message || "Failed to scan website.");
      showToast("error", err.message || "Scan failed.");
    } finally {
      setIsScanning(false);
    }
  }

  // Toggle Single Product Selection
  function toggleProductSelect(idx) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  // Select / Deselect All
  function handleSelectAll() {
    if (selectedIndices.size === filteredScannedProducts.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(scannedProducts.map((_, i) => i)));
    }
  }

  // Edit Scanned Product Field (Price or Stock)
  function handleEditProduct(idx, field, value) {
    setScannedProducts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  // Filter scanned products by search query
  const filteredScannedProducts = useMemo(() => {
    if (!productSearch.trim()) return scannedProducts;
    const q = productSearch.toLowerCase().trim();
    return scannedProducts.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.base_sku && p.base_sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [scannedProducts, productSearch]);

  // Execute Website Catalog Import
  async function handleExecuteWebsiteImport() {
    if (role === "viewer") {
      showToast("error", "Permission Denied: Viewers cannot create or import products.");
      return;
    }

    const selectedList = scannedProducts.filter((_, idx) => selectedIndices.has(idx));
    if (selectedList.length === 0) {
      showToast("error", "Please select at least 1 product to import.");
      return;
    }

    setIsImporting(true);
    setImportProgress(15);
    setImportStep("Connecting to warehouse import engine...");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Format rows for batch insert
      const validRows = selectedList.map((p) => ({
        name: p.name || "Untitled Product",
        category: p.category || "General",
        base_sku: (p.base_sku || makeLocalSku(p.name)).toUpperCase(),
        price: Math.max(0, Number(p.price) || 0),
        initial_stock: Math.max(1, Number(p.initial_stock) || 10),
        image_url: p.image_url || "",
        platform: p.platform || scannedMeta?.platform || "Website",
        isValid: true,
      }));

      const totalStock = validRows.reduce((sum, r) => sum + r.initial_stock, 0);

      setImportProgress(45);
      setImportStep(`Importing ${validRows.length} catalog items & generating serialized barcodes...`);

      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({ validRows }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to import website catalog.");
      }

      setImportProgress(100);
      setImportStep("Import Complete!");

      setImportResult({
        productsCount: result.productsCount || validRows.length,
        itemsCount: result.itemsCount || totalStock,
        skippedCount: 0,
        source: scannedMeta?.platform || "Store Website",
      });

      showToast(
        "success",
        `Successfully imported ${result.productsCount} products and created ${result.itemsCount} serialized units!`
      );
    } catch (err) {
      console.error("Website Import Error:", err);
      showToast("error", err.message || "Failed to import products.");
    } finally {
      setIsImporting(false);
    }
  }

  function makeLocalSku(title) {
    const slug = String(title || "ITEM")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    return `${slug}-${generateRandomCode(4)}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CSV SPREADSHEET IMPORTER STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [parseError, setParseError] = useState(null);

  const handleResetCSV = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setDetectedColumns([]);
    setParseError(null);
    setImportResult(null);
    setImportProgress(0);
    setImportStep("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
          setDetectedColumns([]);
          return;
        }

        const fields = (results.meta?.fields || []).map((f) => f.toLowerCase());
        const detected = [];
        if (fields.some((f) => f.includes("name") || f.includes("title") || f.includes("product") || f.includes("item"))) {
          detected.push("Item Name");
        }
        if (fields.some((f) => f.includes("price") || f.includes("rate") || f.includes("mrp") || f.includes("cost"))) {
          detected.push("Rate / Price");
        }
        if (fields.some((f) => f.includes("stock") || f.includes("qty") || f.includes("quantity") || f.includes("pieces"))) {
          detected.push("Stock Balance");
        }
        if (fields.some((f) => f.includes("sku") || f.includes("barcode") || f.includes("code"))) {
          detected.push("SKU");
        } else {
          detected.push("Auto-Generated SKU");
        }
        setDetectedColumns(detected);

        const skuSeen = new Set();
        const validated = results.data.map((rawRow, index) => {
          const name = (
            rawRow["Name"] ||
            rawRow["name"] ||
            rawRow["Product Name"] ||
            rawRow["product_name"] ||
            rawRow["Item Name"] ||
            rawRow["item_name"] ||
            rawRow["Item"] ||
            rawRow["Title"] ||
            rawRow["Description"] ||
            ""
          ).trim();

          const rawSku = (
            rawRow["Base SKU"] ||
            rawRow["base_sku"] ||
            rawRow["SKU"] ||
            rawRow["sku"] ||
            rawRow["Item Code"] ||
            rawRow["Barcode"] ||
            ""
          ).trim();

          let baseSku = rawSku ? rawSku.toUpperCase().replace(/\s+/g, "-") : "";
          let wasAutoSku = false;

          if (!baseSku && name) {
            const cleanSlug = name
              .replace(/[^a-zA-Z0-9]/g, "")
              .toUpperCase()
              .slice(0, 6) || "ITEM";
            baseSku = `${cleanSlug}-${generateRandomCode(4)}`;
            wasAutoSku = true;
          }

          const category = (
            rawRow["Category"] ||
            rawRow["category"] ||
            rawRow["Type"] ||
            rawRow["group"] ||
            "General"
          ).trim();

          const rawPrice = (
            rawRow["Price"] ||
            rawRow["price"] ||
            rawRow["Unit Price"] ||
            rawRow["Rate"] ||
            rawRow["MRP"] ||
            rawRow["Cost"] ||
            "0"
          ).toString();

          const sanitizedPrice = rawPrice.replace(/[^0-9.]/g, "");
          const parsedPrice = parseFloat(sanitizedPrice);

          const rawStock = (
            rawRow["Initial Stock Quantity"] ||
            rawRow["initial_stock"] ||
            rawRow["Stock"] ||
            rawRow["stock"] ||
            rawRow["Quantity"] ||
            rawRow["qty"] ||
            "10"
          ).toString();

          const sanitizedStock = rawStock.replace(/[^0-9]/g, "");
          const parsedStock = parseInt(sanitizedStock, 10);

          const errors = [];
          if (!name) errors.push("Missing Product Name");
          if (!baseSku) errors.push("Missing Base SKU");

          if (baseSku) {
            if (skuSeen.has(baseSku)) {
              errors.push(`Duplicate SKU (${baseSku}) in file`);
            } else {
              skuSeen.add(baseSku);
            }
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
            wasAutoSku,
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
          showToast("error", "No valid product rows found. Check column headers and data.");
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

  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);
  const totalStockUnits = useMemo(
    () => validRows.reduce((sum, r) => sum + r.initial_stock, 0),
    [validRows]
  );

  const executeBulkImport = async () => {
    if (role === "viewer") {
      showToast("error", "Permission Denied: Viewers cannot create or import products.");
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
      const { data: { session } } = await supabase.auth.getSession();

      setImportProgress(40);
      setImportStep(`Importing ${validRows.length} catalog products & generating barcodes...`);

      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
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
        source: "CSV Spreadsheet",
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
              toastMessage.type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <p className="text-sm font-semibold text-slate-900">{toastMessage.text}</p>
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
              <span className="text-orange-600 font-semibold">Catalog Onboarding</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Product &amp; Catalog Importer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Import products directly from your live store website (WooCommerce / Shopify) or upload CSV spreadsheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
            >
              ⚙️ Store Settings
            </Link>
            <Link
              href="/dashboard/products/add"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-500 transition"
            >
              + Single Intake
            </Link>
          </div>
        </div>

        {/* ── Mode Switcher Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => {
              setImportMode("website");
              setImportResult(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
              importMode === "website"
                ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span>Import from Store Website</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${importMode === "website" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
              1-Click
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportMode("csv");
              setImportResult(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
              importMode === "csv"
                ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Upload CSV Spreadsheet</span>
          </button>
        </div>

        {/* ── Success Result Banner ──────────────────────────────── */}
        {importResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 space-y-4 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Catalog Import Completed Successfully!
                </h3>
                <p className="text-xs text-emerald-800">
                  Imported from <strong>{importResult.source}</strong>. Products, pricing, and serialized barcodes are ready in your warehouse.
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
                  Source Channel
                </div>
                <div className="text-sm font-bold text-slate-700 mt-2 font-mono truncate">
                  {importResult.source}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/25 hover:bg-orange-500 transition"
              >
                <span>View Products in Catalog →</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  if (importMode === "csv") handleResetCSV();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <span>Import More Products</span>
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            TAB 1: IMPORT FROM STORE WEBSITE (WooCommerce / Shopify)
        ═════════════════════════════════════════════════════════ */}
        {importMode === "website" && !importResult && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Website URL Search & Scan Box */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-xl">🌐</span>
                    <span>Scan &amp; Fetch Website Catalog</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your live e-commerce website address. We automatically scan Shopify (<code>/products.json</code>), WooCommerce (<code>/wp-json/wc/v3/</code>), or universal product metadata.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold">
                    Shopify &amp; WooCommerce Ready
                  </span>
                </div>
              </div>

              <form onSubmit={handleScanWebsite} className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      required
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourstore.com or https://yourstore.myshopify.com"
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                    />
                    <span className="absolute left-3.5 top-3 text-slate-400 text-sm">
                      🔗
                    </span>
                  </div>

                  <select
                    value={scanPlatform}
                    onChange={(e) => setScanPlatform(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                  >
                    <option value="auto">Auto Detect Platform</option>
                    <option value="shopify">Shopify Store</option>
                    <option value="woocommerce">WooCommerce / WordPress</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isScanning || !websiteUrl.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50 transition shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Scanning Website…</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Scan &amp; Fetch Catalog</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>💡 Tip: If you configured your website in Store Settings, it is auto-filled here.</span>
                  <Link href="/dashboard/settings" className="hover:text-orange-600 underline">
                    Update Store Website URL
                  </Link>
                </div>
              </form>

              {scanError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>{scanError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScanError(null)}
                    className="text-rose-700 hover:underline font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Scanned Products Results Table */}
            {scannedProducts.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden space-y-4">
                {/* Header & Filter Controls */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        Discovered Products ({scannedProducts.length})
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {scannedMeta?.platform || "Website"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select which products to import, review SKU and price, or adjust initial stock quantity.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search scanned items…"
                        className="rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-orange-600 focus:outline-none w-48 sm:w-60"
                      />
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
                        🔍
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      {selectedIndices.size === filteredScannedProducts.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] font-bold sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3 tracking-wider w-12 text-center">Select</th>
                        <th className="px-5 py-3 tracking-wider">Item</th>
                        <th className="px-5 py-3 tracking-wider">Base SKU</th>
                        <th className="px-5 py-3 tracking-wider">Category</th>
                        <th className="px-5 py-3 tracking-wider">Selling Price</th>
                        <th className="px-5 py-3 tracking-wider">Initial Stock</th>
                        <th className="px-5 py-3 tracking-wider text-right">Store Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredScannedProducts.map((p, idx) => {
                        const isSelected = selectedIndices.has(idx);
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isSelected ? "bg-orange-50/20 hover:bg-orange-50/40" : "opacity-60 hover:opacity-100 bg-slate-50/30"
                            }`}
                          >
                            <td className="px-5 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleProductSelect(idx)}
                                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>

                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {p.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                                    📦
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Platform: {p.platform || scannedMeta?.platform || "Website"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3 font-mono font-bold text-orange-600">
                              {p.base_sku}
                            </td>

                            <td className="px-5 py-3 text-slate-600">
                              {p.category || "General"}
                            </td>

                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1 font-bold text-slate-900">
                                <span>৳</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={p.price}
                                  onChange={(e) => handleEditProduct(idx, "price", e.target.value)}
                                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs font-mono font-bold focus:border-orange-600 focus:outline-none"
                                />
                              </div>
                            </td>

                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="1000"
                                  value={p.initial_stock}
                                  onChange={(e) => handleEditProduct(idx, "initial_stock", e.target.value)}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs font-mono font-bold focus:border-orange-600 focus:outline-none"
                                />
                                <span className="text-[11px] text-slate-400">Units</span>
                              </div>
                            </td>

                            <td className="px-5 py-3 text-right">
                              {p.product_url ? (
                                <a
                                  href={p.product_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                                >
                                  <span>View</span>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="text-xs text-slate-600">
                    Selected{" "}
                    <strong className="text-slate-900 font-bold">{selectedIndices.size}</strong>{" "}
                    of {scannedProducts.length} items to import.
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setScannedProducts([])}
                      disabled={isImporting}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Clear / Rescan
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteWebsiteImport}
                      disabled={isImporting || selectedIndices.size === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50 transition"
                    >
                      {isImporting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          <span>{importStep || "Importing Catalog..."}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Import {selectedIndices.size} Selected Products</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            TAB 2: CSV SPREADSHEET UPLOAD
        ═════════════════════════════════════════════════════════ */}
        {importMode === "csv" && !importResult && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Download Template Bar */}
            <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Standard CSV Template
                </h3>
                <p className="text-xs text-slate-500">
                  Pre-formatted columns: Name, Base SKU, Category, Price, Initial Stock Quantity.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs shrink-0"
              >
                <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
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
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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
                    <span className="text-orange-600 font-bold">{selectedFile.name}</span>
                  ) : (
                    <>
                      <span className="text-orange-600 hover:underline">Click to upload</span> or drag and drop your CSV spreadsheet
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
                      handleResetCSV();
                    }}
                    className="text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Change File
                  </button>
                </div>
              )}
            </div>

            {/* Parse Error Alert */}
            {parseError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>{parseError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetCSV}
                  className="text-rose-700 hover:underline font-semibold"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Metrics Cards (When File is Parsed) */}
            {parsedRows.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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

                <div className={`rounded-2xl border p-4 shadow-xs bg-white ${invalidRows.length > 0 ? "border-rose-200" : "border-slate-200/80"}`}>
                  <div className={`text-[11px] font-semibold uppercase tracking-wider ${invalidRows.length > 0 ? "text-rose-700" : "text-slate-500"}`}>
                    Errors / Issues
                  </div>
                  <div className={`mt-1.5 text-2xl font-bold font-mono ${invalidRows.length > 0 ? "text-rose-700" : "text-slate-400"}`}>
                    {invalidRows.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Barcodes
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-orange-600 font-mono">
                    {totalStockUnits.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Column Detection Alert */}
            {detectedColumns.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500">Auto-detected Columns:</span>
                  {detectedColumns.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold border border-slate-200"
                    >
                      ✓ {col}
                    </span>
                  ))}
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 font-mono text-[11px] font-bold shrink-0 self-start sm:self-auto">
                  Auto-mapped
                </span>
              </div>
            )}

            {/* Preview Table of First 5 Rows */}
            {parsedRows.length > 0 && (
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
                      {previewRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`transition-colors ${
                            row.isValid ? "hover:bg-orange-50/30" : "bg-rose-50/40 hover:bg-rose-50/60"
                          }`}
                        >
                          <td className="px-5 py-3.5 text-slate-400 font-sans">
                            #{row.rowNumber}
                          </td>

                          <td className="px-5 py-3.5 font-sans">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Valid
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Error
                                </span>
                                <div className="text-[10px] text-rose-600 font-sans">
                                  {row.errors.join(", ")}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-sans font-semibold text-slate-900">
                            {row.name || <span className="text-rose-600 italic">[Missing Name]</span>}
                          </td>

                          <td className="px-5 py-3.5 font-bold text-orange-600">
                            {row.base_sku ? (
                              <div className="flex items-center gap-1.5">
                                <span>{row.base_sku}</span>
                                {row.wasAutoSku && (
                                  <span className="px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 font-mono text-[9px] font-semibold border border-teal-200">
                                    Auto SKU
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-rose-600 italic font-normal">[Missing SKU]</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-sans text-slate-600">
                            {row.category || "General"}
                          </td>

                          <td className="px-5 py-3.5 text-slate-900 font-bold">
                            ৳{row.price.toFixed(2)}
                          </td>

                          <td className="px-5 py-3.5 text-slate-900 font-bold">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {row.initial_stock} Units
                            </span>
                          </td>
                        </tr>
                      ))}
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

            {/* CSV Import Execution Bar */}
            {parsedRows.length > 0 && (
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
                    onClick={handleResetCSV}
                    disabled={isImporting}
                    className="w-1/2 md:w-auto rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 shadow-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={executeBulkImport}
                    disabled={isImporting || validRows.length === 0}
                    className="w-1/2 md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>{importStep || "Processing..."}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>
                          Import {validRows.length} Product{validRows.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Progress Bar During Import ──────────────────────────── */}
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

export default function BulkImportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            <p className="text-xs font-mono text-slate-500">Loading catalog importer…</p>
          </div>
        </main>
      }
    >
      <BulkImportContent />
    </Suspense>
  );
}
