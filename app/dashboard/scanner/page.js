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
          // 2. Check if the scanned barcode is a serialized inventory_item
          let itemQuery = supabase
            .from("inventory_items")
            .select(
              "id, unique_barcode, status, product_id, products(id, name, category, base_sku, price, business_id)"
            )
            .eq("unique_barcode", code);

          const { data: itemData } = await itemQuery.maybeSingle();

          if (itemData && itemData.products) {
            matchedItem = itemData;
            product = itemData.products;
          }
        }

        if (!product) {
          setNotFound(true);
          setScanHistory((prev) => [
            {
              code,
              name: "Unknown SKU",
              status: "NOT_FOUND",
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 9),
          ]);
          return;
        }

        // 3. Count available IN_STOCK inventory items for this product
        const { count: stockCount } = await supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("product_id", product.id)
          .eq("status", "IN_STOCK");

        setMatchedProduct(product);
        setScannedInventoryItem(matchedItem);
        setAvailableStock(stockCount || 0);

        // Add to recent scan history
        setScanHistory((prev) => [
          {
            code,
            name: product.name,
            sku: product.base_sku,
            status: "MATCHED",
            stock: stockCount || 0,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 9),
        ]);
      } catch (err) {
        console.error("Barcode database lookup failed:", err);
      } finally {
        setSearchingDb(false);
      }
    },
    [businessId]
  );

  // ── Handle Successful Camera Scan ───────────────────────────
  const handleScanSuccess = useCallback(
    async (decodedText) => {
      if (isHandlingScanRef.current) return;
      isHandlingScanRef.current = true;

      // 1. Audio and Haptic Feedback
      playSuccessBeep();
      triggerHaptic();

      // 2. Pause live camera scanner
      try {
        if (html5QrCodeRef.current?.isScanning) {
          await html5QrCodeRef.current.pause(true);
        }
      } catch (e) {
        console.warn("Scanner pause non-critical warning:", e);
      }

      setScannedText(decodedText);
      await lookupBarcode(decodedText);
    },
    [lookupBarcode]
  );

  // ── Start / Initialize Camera Scanner ───────────────────────
  const startScanner = useCallback(
    async (selectedFacing = facingMode) => {
      queueMicrotask(() => {
        setIsInitializing(true);
        setPermissionError(null);
      });

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );

        // Clean up previous instance if running
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

        const scannerId = "interactive-scanner-viewport";
        const scannerElement = document.getElementById(scannerId);
        if (!scannerElement) {
          setIsInitializing(false);
          return;
        }

        const html5QrCode = new Html5Qrcode(scannerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

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
    [facingMode, handleScanSuccess]
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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* ── Top Industrial Status Header ────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  cameraActive ? "bg-emerald-400" : "bg-amber-400"
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  cameraActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>📱</span> Smart Optical Scanner
              </h1>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[190px] sm:max-w-xs">
                {businessName || "Primary Workspace"} · Code128 / 2D Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/products"
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              Catalog
            </Link>
            <Link
              href="/operations"
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              Operations
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Scanner Container (Mobile-First) ──────────────── */}
      <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 pt-5 space-y-5">
        {/* ── Viewfinder Viewport Card ─────────────────────────── */}
        <div className="relative rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Top Industrial Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 z-20" />

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
                <div className="relative w-full max-w-[85%] aspect-[16/9] border-2 border-emerald-400/40 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  {/* High-Tech Corner Crosshairs */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />

                  {/* Animated Red / Emerald Laser Sweep Bar */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-laser" />

                  <span className="text-[10px] font-mono tracking-widest text-emerald-400/80 bg-slate-950/70 px-2.5 py-0.5 rounded-full uppercase">
                    Align Barcode in Slot
                  </span>
                </div>
              </div>
            )}

            {/* Loading / Initializing Overlay */}
            {isInitializing && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 z-30">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                <p className="text-xs font-mono text-slate-300">
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
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
                >
                  Request Permission Again
                </button>
              </div>
            )}
          </div>

          {/* ── Viewport Control Bar ────────────────────────────── */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={isInitializing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                title="Switch between front and back camera"
              >
                <span>🔄</span>
                <span>{facingMode === "environment" ? "Rear Lens" : "Front Lens"}</span>
              </button>

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition ${
                    torchOn
                      ? "border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Toggle flashlight"
                >
                  <span>🔦</span>
                  <span>{torchOn ? "Torch On" : "Torch Off"}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => (cameraActive ? stopScanner() : startScanner(facingMode))}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition ${
                cameraActive
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/60"
                  : "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              }`}
            >
              {cameraActive ? "Pause Lens" : "Resume Lens"}
            </button>
          </div>
        </div>

        {/* ── Scan Result / Match Card ─────────────────────────── */}
        {scannedText && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300 relative overflow-hidden">
            {/* Glowing Accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 ${
                matchedProduct ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />

            {/* Header / Decoded Barcode Badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{matchedProduct ? "✅" : "⚠️"}</span>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Decoded Optical Code
                  </span>
                  <span className="font-mono font-bold text-sm text-white select-all">
                    {scannedText}
                  </span>
                </div>
              </div>

              <button
                onClick={resumeScanner}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                <span>🔄</span>
                <span>Scan Another</span>
              </button>
            </div>

            {/* Database Querying State */}
            {searchingDb && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
                <span>Checking merchant catalog…</span>
              </div>
            )}

            {/* MATCHED PRODUCT VIEW */}
            {!searchingDb && matchedProduct && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                      {matchedProduct.category || "General Inventory"}
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white">
                      {matchedProduct.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      SKU: <span className="text-slate-200 font-bold">{matchedProduct.base_sku}</span>
                    </p>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end gap-2">
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                      ৳{Number(matchedProduct.price || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Unit Price
                    </span>
                  </div>
                </div>

                {/* Stock Telemetry Card */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                      📦
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        Available Stock
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {scannedInventoryItem
                          ? `Serialized Item #${scannedInventoryItem.unique_barcode} (${scannedInventoryItem.status})`
                          : "Ready for immediate fulfillment"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold font-mono border ${
                        availableStock > 0
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          availableStock > 0 ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      <span>{availableStock} Units</span>
                    </span>
                  </div>
                </div>

                {/* Quick Action CTA Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Link
                    href={`/operations?sku=${encodeURIComponent(
                      matchedProduct.base_sku
                    )}&action=IN`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <span>🔽</span>
                    <span>Check-In (Add Stock)</span>
                  </Link>

                  <Link
                    href={`/dashboard/products/${matchedProduct.id}/dispatch`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
                  >
                    <span>🚚</span>
                    <span>Dispatch Order →</span>
                  </Link>
                </div>
              </div>
            )}

            {/* NOT FOUND VIEW */}
            {!searchingDb && notFound && (
              <div className="py-4 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-2xl">
                  ❓
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Unrecognized Barcode / SKU
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    No catalog product was found matching{" "}
                    <code className="text-rose-400 font-mono font-bold">
                      {scannedText}
                    </code>{" "}
                    in this workspace.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <Link
                    href={`/dashboard/products/add?sku=${encodeURIComponent(scannedText)}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
                  >
                    <span>+</span>
                    <span>Create New Product with this SKU</span>
                  </Link>

                  <button
                    onClick={resumeScanner}
                    className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    Retry Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Manual SKU Search Bar ────────────────────────────── */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
          <label
            htmlFor="manual-sku-input"
            className="text-xs font-bold text-slate-300 flex items-center justify-between"
          >
            <span>⌨️ Manual Code / SKU Lookup</span>
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
              placeholder="e.g. DA001, BLALHAM, or serial barcode…"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono transition"
            />
            <button
              type="submit"
              disabled={!manualSkuInput.trim() || searchingDb}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 hover:text-white transition disabled:opacity-40"
            >
              Verify
            </button>
          </form>
        </div>

        {/* ── Recent Scan History Tape ─────────────────────────── */}
        {scanHistory.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>📋</span> Recent Scanner History
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {scanHistory.length} Session Scans
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto pr-1">
              {scanHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="py-2 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.status === "MATCHED" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    <span className="font-mono font-bold text-slate-200">
                      {item.code}
                    </span>
                    <span className="text-slate-400 truncate max-w-[120px] text-[11px]">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.stock !== undefined && (
                      <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                        {item.stock} in stock
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-600">
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
