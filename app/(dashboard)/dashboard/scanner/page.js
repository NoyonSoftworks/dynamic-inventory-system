"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

/**
 * High-pitch crisp audio synthesizer beep using HTML5 Web Audio API.
 * Requires 0 external assets and works reliably on all modern mobile browsers.
 */
function playSuccessBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      /** @type {any} */ (window).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    // Dual pitch chirping beep (1.2 kHz to 1.8 kHz) for warehouse scanner feedback
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1900, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    console.warn("AudioContext feedback muted or unsupported:", err);
  }
}

/**
 * Mobile haptic vibration feedback.
 */
function triggerHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([80, 40, 80]);
    } catch {
      // Ignored if unsupported
    }
  }
}

export default function SmartScannerPage() {
  const { businessId, businessName } = useBusinessContext();

  // ── Scanner & Camera State ───────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" (rear) or "user" (front)
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // ── Scan Result & Product State ──────────────────────────────
  const [scannedText, setScannedText] = useState(null);
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [scannedInventoryItem, setScannedInventoryItem] = useState(null);
  const [availableStock, setAvailableStock] = useState(0);
  const [searchingDb, setSearchingDb] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // ── Manual Entry & History State ─────────────────────────────
  const [manualSkuInput, setManualSkuInput] = useState("");
  const [scanHistory, setScanHistory] = useState([]);

  // ── Scanner Instance Ref ─────────────────────────────────────
  const html5QrCodeRef = useRef(null);
  const isHandlingScanRef = useRef(false);

  // ── Database Product Lookup ──────────────────────────────────
  const lookupBarcode = useCallback(
    async (rawCode) => {
      const code = String(rawCode || "").trim();
      if (!code) return;

      setSearchingDb(true);
      setNotFound(false);
      setMatchedProduct(null);
      setScannedInventoryItem(null);
      setAvailableStock(0);

      try {
        let product = null;
        let matchedItem = null;

        // 1. Direct match on products.base_sku
        let prodQuery = supabase
          .from("products")
          .select("id, name, category, base_sku, price, business_id")
          .ilike("base_sku", code);

        if (businessId) {
          prodQuery = prodQuery.eq("business_id", businessId);
        }

        const { data: prodData } = await prodQuery.maybeSingle();

        if (prodData) {
          product = prodData;
        } else {
          // 2. Match on serialized inventory_items.unique_barcode
          let itemQuery = supabase
            .from("inventory_items")
            .select("id, product_id, unique_barcode, status, business_id")
            .eq("unique_barcode", code);

          if (businessId) {
            itemQuery = itemQuery.eq("business_id", businessId);
          }

          const { data: itemData } = await itemQuery.maybeSingle();

          if (itemData?.product_id) {
            matchedItem = itemData;
            const { data: pData } = await supabase
              .from("products")
              .select("id, name, category, base_sku, price, business_id")
              .eq("id", itemData.product_id)
              .maybeSingle();
            if (pData) {
              product = pData;
            }
          }
        }

        if (product) {
          setMatchedProduct(product);
          setScannedInventoryItem(matchedItem);

          // Calculate current available stock
          let stockQuery = supabase
            .from("inventory_items")
            .select("id", { count: "exact", head: true })
            .eq("product_id", product.id)
            .eq("status", "IN_STOCK");

          if (businessId) {
            stockQuery = stockQuery.eq("business_id", businessId);
          }

          const { count } = await stockQuery;
          const currentStock = count !== null ? count : 0;
          setAvailableStock(currentStock);

          // Push to session history
          setScanHistory((prev) => [
            {
              code,
              name: product.name,
              status: "MATCHED",
              stock: currentStock,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          setNotFound(true);
          setScanHistory((prev) => [
            {
              code,
              name: "Unregistered SKU",
              status: "NOT_FOUND",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
            ...prev.slice(0, 19),
          ]);
        }
      } catch (err) {
        console.error("Barcode database lookup exception:", err);
        setNotFound(true);
      } finally {
        setSearchingDb(false);
      }
    },
    [businessId]
  );

  // ── Handle Successful Camera Scan ───────────────────────────
  const handleScanSuccess = useCallback(
    (decodedText) => {
      if (isHandlingScanRef.current) return;
      isHandlingScanRef.current = true;

      // Provide instant audio & haptic feedback
      playSuccessBeep();
      triggerHaptic();

      setScannedText(decodedText);

      // Pause scanner while displaying current product details
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.pause(true);
      }

      // Lookup product from database
      lookupBarcode(decodedText);
    },
    [lookupBarcode]
  );

  // ── Start Camera Scanner ────────────────────────────────────
  const startScanner = useCallback(
    async (selectedFacing = "environment") => {
      setIsInitializing(true);
      setPermissionError(null);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        // Clear existing instance if any
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch {
            // Ignored
          }
        }

        const html5QrCode = new Html5Qrcode("interactive-scanner-viewport");
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15, // Smooth mobile scan rate
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Wide rectangular bounding box optimized for 1D horizontal barcodes (SKUs)
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.floor(minEdge * 0.88);
            const boxHeight = Math.floor(boxWidth * 0.55); // 16:9 style barcode slot
            return { width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.333333,
        };

        await html5QrCode.start(
          { facingMode: selectedFacing },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame failed to decode (silent per-frame callback)
          }
        );

        setCameraActive(true);
        isHandlingScanRef.current = false;

        // Check if camera capabilities support torch
        try {
          const track = html5QrCode.getRunningTrackCapabilities?.();
          setHasTorch(Boolean(track?.torch));
        } catch {
          setHasTorch(false);
        }
      } catch (err) {
        console.error("Camera scanner startup failed:", err);
        const errMsg = String(err?.message || err || "");
        if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission")) {
          setPermissionError(
            "Camera permission was denied. Please allow camera access in your browser settings to scan barcodes."
          );
        } else if (errMsg.includes("NotFoundError") || errMsg.includes("DevicesNotFoundError")) {
          setPermissionError("No camera device was detected on this device.");
        } else {
          setPermissionError(
            "Unable to access camera feed. Please verify camera permissions and refresh."
          );
        }
        setCameraActive(false);
      } finally {
        setIsInitializing(false);
      }
    },
    [handleScanSuccess]
  );

  // ── Stop Camera Scanner ─────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop warning:", err);
      }
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // ── Resume Camera for Next Scan ─────────────────────────────
  const resumeScanner = async () => {
    setScannedText(null);
    setMatchedProduct(null);
    setScannedInventoryItem(null);
    setNotFound(false);
    isHandlingScanRef.current = false;

    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.resume();
      } catch {
        // If resume fails, restart instance
        await startScanner(facingMode);
      }
    } else {
      await startScanner(facingMode);
    }
  };

  // ── Flip Front / Rear Camera ────────────────────────────────
  const toggleFacingMode = async () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    await stopScanner();
    await startScanner(nextFacing);
  };

  // ── Torch / Flashlight Toggle ───────────────────────────────
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    const nextTorch = !torchOn;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  // ── Initial Mount & Lifecycle ───────────────────────────────
  useEffect(() => {
    let unmounted = false;

    const timer = setTimeout(() => {
      if (!unmounted) {
        startScanner("environment");
      }
    }, 50);

    return () => {
      unmounted = true;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch {
          // Cleanup
        }
      }
    };
  }, [startScanner]);

  // ── Manual SKU Search Handler ───────────────────────────────
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualSkuInput.trim()) return;
    const code = manualSkuInput.trim();
    setScannedText(code);
    isHandlingScanRef.current = true;
    playSuccessBeep();
    await lookupBarcode(code);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans pb-16">
      {/* ── Top Industrial Status Header ────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-3 sm:px-6 shadow-2xs">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  cameraActive ? "bg-emerald-400" : "bg-amber-400"
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  cameraActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Barcode &amp; QR Optical Scanner
              </h1>
              <p className="text-[11px] text-slate-500 font-mono truncate max-w-[190px] sm:max-w-xs">
                {businessName || "Primary Workspace"} · Code128 / QR WASM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/products"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              Catalog
            </Link>
            <Link
              href="/operations"
              className="rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-500 transition"
            >
              Operations
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Scanner Container (Mobile-First) ──────────────── */}
      <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 pt-5 space-y-5">
        {/* ── Viewfinder Viewport Card ─────────────────────────── */}
        <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-600 z-20" />

          {/* Camera Feed Viewport */}
          <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            {/* HTML5 QR Code Mount Node */}
            <div
              id="interactive-scanner-viewport"
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Target Reticle Overlay (Only shown while active & not showing result) */}
            {cameraActive && !scannedText && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 p-6">
                <div className="relative w-full max-w-[85%] aspect-[16/9] border-2 border-emerald-400/50 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                  {/* High-Tech Corner Crosshairs */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />

                  {/* Animated Emerald Laser Sweep Bar */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-laser" />

                  <span className="text-[10px] font-mono tracking-widest text-emerald-400 bg-slate-950/80 px-2.5 py-0.5 rounded-full uppercase font-bold">
                    Align Barcode in Slot
                  </span>
                </div>
              </div>
            )}

            {/* Loading / Initializing Overlay */}
            {isInitializing && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 z-30">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="text-xs font-mono text-slate-300 font-semibold">
                  Starting Optical Sensor…
                </p>
              </div>
            )}

            {/* Permission Denied / Camera Error Screen */}
            {permissionError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-30">
                <div className="text-4xl">📷</div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Camera Access Required
                  </h3>
                  <p className="text-xs text-rose-300 max-w-xs leading-relaxed">
                    {permissionError}
                  </p>
                </div>
                <button
                  onClick={() => startScanner(facingMode)}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500 transition"
                >
                  Request Permission Again
                </button>
              </div>
            )}
          </div>

          {/* ── Viewport Control Bar ────────────────────────────── */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={isInitializing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                title="Switch between front and back camera"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{facingMode === "environment" ? "Rear Lens" : "Front Lens"}</span>
              </button>

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                    torchOn
                      ? "border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Toggle flashlight"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>{torchOn ? "Torch On" : "Torch Off"}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => (cameraActive ? stopScanner() : startScanner(facingMode))}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium border transition ${
                cameraActive
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              }`}
            >
              {cameraActive ? "Pause Scanner" : "Resume Scanner"}
            </button>
          </div>
        </div>

        {/* ── Scan Result / Match Card ─────────────────────────── */}
        {scannedText && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200 relative overflow-hidden">
            {/* Status Border Indicator */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                matchedProduct ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />

            {/* Header / Decoded Barcode Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    matchedProduct
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {matchedProduct ? (
                    <svg className="w-4 h-4 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-bold">
                    Decoded Optical Barcode
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-900 select-all">
                    {scannedText}
                  </span>
                </div>
              </div>

              <button
                onClick={resumeScanner}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Scan Next</span>
              </button>
            </div>

            {/* Database Querying State */}
            {searchingDb && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                <span className="font-mono font-medium">Verifying SKU catalog…</span>
              </div>
            )}

            {/* MATCHED PRODUCT VIEW */}
            {!searchingDb && matchedProduct && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-mono text-slate-700 uppercase tracking-wider mb-1 font-bold">
                      {matchedProduct.category || "General Inventory"}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {matchedProduct.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Base SKU: <span className="text-slate-900 font-bold">{matchedProduct.base_sku}</span>
                    </p>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end gap-1">
                    <div className="text-lg font-bold font-mono text-emerald-700">
                      ৳{Number(matchedProduct.price || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                      Catalog Price
                    </span>
                  </div>
                </div>

                {/* Stock Telemetry Card */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Available Physical Stock
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {scannedInventoryItem
                          ? `Item #${scannedInventoryItem.unique_barcode} (${scannedInventoryItem.status})`
                          : "Ready for courier dispatch"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-bold border ${
                        availableStock > 0
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          availableStock > 0 ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <span>{availableStock} units</span>
                    </span>
                  </div>
                </div>

                {/* Quick Action CTA Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Link
                    href={`/operations?sku=${encodeURIComponent(
                      matchedProduct.base_sku
                    )}&action=IN`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span>Check-In (Add Stock)</span>
                  </Link>

                  <Link
                    href={`/dashboard/products/${matchedProduct.id}/dispatch`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-600/25 transition active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span>Dispatch Consignment</span>
                  </Link>
                </div>
              </div>
            )}

            {/* NOT FOUND VIEW */}
            {!searchingDb && notFound && (
              <div className="py-4 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Unrecognized Barcode or SKU
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    No catalog product was found matching{" "}
                    <code className="text-rose-600 font-mono font-bold">
                      {scannedText}
                    </code>{" "}
                    in this workspace.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <Link
                    href={`/dashboard/products/add?sku=${encodeURIComponent(scannedText)}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 shadow-sm transition"
                  >
                    <span>+</span>
                    <span>Create New Product</span>
                  </Link>

                  <button
                    onClick={resumeScanner}
                    className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Retry Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Manual SKU Search Bar ────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-2xs">
          <label
            htmlFor="manual-sku-input"
            className="text-xs font-bold text-slate-800 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Manual Barcode / SKU Verification
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Desktop or Laser Fallback
            </span>
          </label>
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              id="manual-sku-input"
              type="text"
              value={manualSkuInput}
              onChange={(e) => setManualSkuInput(e.target.value)}
              placeholder="e.g. SKU-CTG-8821-BLK or barcode serial…"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono transition"
            />
            <button
              type="submit"
              disabled={!manualSkuInput.trim() || searchingDb}
              className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-40"
            >
              Verify
            </button>
          </form>
        </div>

        {/* ── Recent Scan History Tape ─────────────────────────── */}
        {scanHistory.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Session Scan History
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                {scanHistory.length} Scanned
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
              {scanHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.status === "MATCHED" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span className="font-mono font-bold text-slate-900">
                      {item.code}
                    </span>
                    <span className="text-slate-500 truncate max-w-[120px] text-[11px]">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.stock !== undefined && (
                      <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.stock} in stock
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Reticle Laser CSS Animation ──────────────────────── */}
      <style jsx>{`
        @keyframes laser {
          0% {
            top: 5%;
          }
          50% {
            top: 92%;
          }
          100% {
            top: 5%;
          }
        }
        .animate-laser {
          animation: laser 2.2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
