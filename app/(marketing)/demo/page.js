"use client";

import { useState } from "react";
import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory";

// ── Sample Catalog for Merchants ──────────────────────────────
const SAMPLE_PRODUCTS = [
  {
    id: "prod-1",
    sku: "ELC-AIR-PRO2",
    name: "Apple AirPods Pro (2nd Gen)",
    category: "Electronics",
    stock: 24,
    price: 249,
    status: "In Stock",
  },
  {
    id: "prod-2",
    sku: "APP-TSH-BLK-L",
    name: "Vintage Heavyweight Oversized Tee (Black / L)",
    category: "Apparel",
    stock: 88,
    price: 35,
    status: "In Stock",
  },
  {
    id: "prod-3",
    sku: "APP-DNM-IND-32",
    name: "Selvedge Raw Denim Jeans (Indigo / 32)",
    category: "Apparel",
    stock: 7,
    price: 98,
    status: "Low Stock",
  },
  {
    id: "prod-4",
    sku: "ELC-KBD-MECH-RD",
    name: "RGB Wireless Mechanical Keyboard (Red Switches)",
    category: "Electronics",
    stock: 42,
    price: 120,
    status: "In Stock",
  },
  {
    id: "prod-5",
    sku: "ACC-WLT-LTH-BRN",
    name: "Italian Full-Grain Leather Wallet (Cognac)",
    category: "Accessories",
    stock: 4,
    price: 45,
    status: "Low Stock",
  },
];

export default function InteractiveDemoPage() {
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'scanner' | 'dispatch'
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [scanState, setScanState] = useState("idle"); // 'idle' | 'scanning' | 'detected'
  const [detectedProduct, setDetectedProduct] = useState(null);

  const [dispatchStep, setDispatchStep] = useState("idle"); // 'idle' | 'dispatching' | 'completed'
  const [activeCustomer, setActiveCustomer] = useState({
    name: "Rahim Ahmed",
    phone: "01712-345678",
    address: "House 24, Road 7, Dhanmondi, Dhaka",
    orderId: "ORD-8492",
    courier: "Steadfast Courier",
    amount: "৳2,450",
  });
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  // ── AI Sandbox RTO State ────────────────────────────────────
  const [simRtoPhone, setSimRtoPhone] = useState("01700000000");
  const [simRtoAddress, setSimRtoAddress] = useState("Dhaka mor, near school");
  const [simRtoAmount, setSimRtoAmount] = useState(5500);
  const [simRtoResult, setSimRtoResult] = useState(null);
  const [simRtoAnalyzing, setSimRtoAnalyzing] = useState(false);

  async function handleSimAnalyzeRto() {
    try {
      setSimRtoAnalyzing(true);
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rto_risk_analysis",
          payload: {
            phone: simRtoPhone,
            address: simRtoAddress,
            codAmount: simRtoAmount,
            courier: "Steadfast",
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSimRtoResult(data);
          return;
        }
      }

      // Demo fallback calculation if user is not signed in to a tenant workspace
      const cleanPhone = String(simRtoPhone).replace(/[^0-9]/g, "");
      const cleanAddress = String(simRtoAddress).trim();
      const numAmount = Number(simRtoAmount) || 0;
      let riskScore = 15;
      const flags = [];
      if (cleanPhone.length !== 11) {
        riskScore += 35;
        flags.push("Invalid phone length (must be 11 digits in Bangladesh).");
      }
      if (/(\d)\1{5,}/.test(cleanPhone)) {
        riskScore += 40;
        flags.push("Suspicious repeating digits detected in phone number.");
      }
      if (cleanAddress.length < 15) {
        riskScore += 25;
        flags.push("Vague or incomplete address line.");
      }
      if (numAmount > 5000) {
        riskScore += 20;
        flags.push(`High COD consignment value (৳${numAmount.toLocaleString()}) increases refusal probability.`);
      }
      const finalScore = Math.min(95, Math.max(10, riskScore));
      const riskLevel = finalScore >= 60 ? "HIGH" : finalScore >= 35 ? "MEDIUM" : "LOW";
      setSimRtoResult({
        success: true,
        riskScore: finalScore,
        riskLevel,
        recommendation:
          finalScore >= 60
            ? "DO NOT dispatch as COD directly. Collect delivery fee (৳130-৳150) in advance via bKash/Nagad before shipment."
            : finalScore >= 35
            ? "Call customer to confirm active delivery address and availability before handing over to courier."
            : "Safe to dispatch via automated courier booking.",
        advanceFeeRequired: finalScore >= 60,
        flags:
          flags.length > 0
            ? flags
            : ["Verified mobile operator prefix.", "Complete street delivery address."],
        lossPrevention: `৳${(Math.round(numAmount * 0.12) + 130).toLocaleString()}`,
      });
    } catch (e) {
      console.warn("RTO test note:", e);
    } finally {
      setSimRtoAnalyzing(false);
    }
  }

  // Audio Beep Synthesizer
  function playBeepSound() {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio fallback
    }
  }

  function handleTriggerScan(targetProduct = null) {
    const item = targetProduct || products[0];
    setScanState("scanning");
    setDetectedProduct(null);

    setTimeout(() => {
      playBeepSound();
      setDetectedProduct(item);
      setScanState("detected");
    }, 600);
  }

  function handleStockCheckIn(productId) {
    playBeepSound();
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: p.stock + 1 } : p
      )
    );
    if (detectedProduct && detectedProduct.id === productId) {
      setDetectedProduct((prev) => ({ ...prev, stock: prev.stock + 1 }));
    }
  }

  function handleTriggerDispatch(customerData = null) {
    if (customerData) setActiveCustomer(customerData);
    setDispatchStep("dispatching");
    setShowNotificationToast(false);

    setTimeout(() => {
      setDispatchStep("completed");
      setShowNotificationToast(true);
      playBeepSound();

      setTimeout(() => setShowNotificationToast(false), 5000);
    }, 900);
  }

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased selection:bg-orange-500 selection:text-white pb-24">
      {/* ── WhatsApp Pop-up Notification Simulator ────────────── */}
      {showNotificationToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
            <div className="space-y-1 min-w-0 flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  WhatsApp Alert Dispatched
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
              </div>
              <p className="text-slate-600">
                To <strong>{activeCustomer.name}</strong> ({activeCustomer.phone})
              </p>
              <div className="mt-1.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-[11px] font-mono text-emerald-700 font-semibold">
                &quot;Order #{activeCustomer.orderId} dispatched via {activeCustomer.courier}. Tracking: steadfast.com.bd/t/SF-994821&quot;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header Navigation ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Overview</span>
            </Link>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                Interactive Sandbox
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-orange-600/20"
            >
              <span>Start Free (100 Orders)</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Sandbox Hero Banner ───────────────────────────────── */}
      <div className="pt-10 pb-8 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 text-center space-y-3">
          <span className="text-xs font-mono font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-md">
            No registration needed
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            Interactive Fulfillment Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
            Test warehouse catalog management, mobile camera barcode scanning, and 1-click Steadfast courier dispatch in real time.
          </p>

          {/* Segmented Sandbox Tabs */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#EA580C] text-white shadow-2xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1. Catalog &amp; stock table
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("scanner");
                handleTriggerScan();
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === "scanner"
                  ? "bg-[#EA580C] text-white shadow-2xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              2. Camera barcode scanner
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("dispatch");
                handleTriggerDispatch();
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === "dispatch"
                  ? "bg-[#EA580C] text-white shadow-2xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              3. Courier &amp; WhatsApp alert
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ai-copilot");
                if (!simRtoResult) handleSimAnalyzeRto();
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ai-copilot"
                  ? "bg-[#EA580C] text-white shadow-2xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>4. Return &amp; fraud check</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN SANDBOX BODY ─────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-8 mt-8 space-y-6">
        {/* ======================================================= */}
        {/* TAB 1: SIMULATED INVENTORY CATALOG                      */}
        {/* ======================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-4">
              <div className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500">Total active SKUs</span>
                <div className="text-xl font-semibold text-slate-900 font-mono mt-1">
                  {products.length} SKUs
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Multi-variant tracking</div>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500">Units on hand</span>
                <div className="text-xl font-semibold text-emerald-700 font-mono mt-1">
                  {products.reduce((acc, p) => acc + p.stock, 0)} units
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Live catalog count</div>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500">Inventory valuation</span>
                <div className="text-xl font-semibold text-slate-900 font-mono mt-1">
                  ৳{products.reduce((acc, p) => acc + p.stock * p.price, 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Retail catalog sum</div>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-xs font-medium text-slate-500">Connected logistics</span>
                <div className="text-xl font-semibold text-teal-700 font-mono mt-1">
                  Steadfast BD
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Automated consignment API</div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {["ALL", "Electronics", "Apparel", "Accessories"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-orange-600 text-white shadow-xs shadow-orange-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter catalog…"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                />
              </div>
            </div>

            {/* Catalog Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">SKU</th>
                      <th className="px-5 py-3.5 font-bold">Item Name</th>
                      <th className="px-5 py-3.5 font-bold">Category</th>
                      <th className="px-5 py-3.5 font-bold font-mono">Stock</th>
                      <th className="px-5 py-3.5 font-bold font-mono">Price</th>
                      <th className="px-5 py-3.5 font-bold font-mono">Status</th>
                      <th className="px-5 py-3.5 font-bold text-right font-mono">Simulate Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 font-bold">
                            {p.sku}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {p.name}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            {p.stock} units
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            ${p.price}.00
                          </td>
                          <td className="px-5 py-3.5 font-mono">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                p.stock > 10
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  p.stock > 10 ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                              />
                              {p.stock > 10 ? "In Stock" : "Low Stock"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStockCheckIn(p.id)}
                                className="btn-tactile rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                              >
                                +1 Stock
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("scanner");
                                  handleTriggerScan(p);
                                }}
                                className="btn-tactile rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700 transition cursor-pointer"
                              >
                                Scan
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("dispatch");
                                  handleTriggerDispatch({
                                    name: "Rahim Ahmed",
                                    phone: "01712-345678",
                                    address: "Dhanmondi, Dhaka",
                                    orderId: "ORD-9481",
                                    courier: "Steadfast Courier",
                                    amount: `$${p.price}.00`,
                                  });
                                }}
                                className="btn-tactile rounded-lg bg-orange-600 hover:bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white transition shadow-xs shadow-orange-600/20 cursor-pointer"
                              >
                                Dispatch
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 2: CAMERA BARCODE SCANNER                           */}
        {/* ======================================================= */}
        {activeTab === "scanner" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="card-lift md:col-span-7 rounded-2xl border border-slate-200 bg-white p-7 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Camera Barcode Decoding
                  </h3>
                  <p className="text-xs text-slate-500">
                    Runs in any iOS or Android browser with real-time WebAssembly decoding.
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Scanner Ready
                </span>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-900 p-8 flex flex-col items-center justify-center min-h-[260px] text-center space-y-4">
                <div className="w-56 h-36 rounded-xl border border-slate-700 bg-slate-950/80 flex flex-col items-center justify-center font-mono text-xs text-slate-300 shadow-inner">
                  {scanState === "scanning" ? (
                    <div className="flex flex-col items-center gap-2 text-orange-400">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold">Decoding Stream…</span>
                    </div>
                  ) : scanState === "detected" ? (
                    <div className="flex flex-col items-center gap-1 text-emerald-400">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-bold">MATCH: 0.28s</span>
                    </div>
                  ) : (
                    <span>[ Align Barcode Inside Box ]</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {SAMPLE_PRODUCTS.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTriggerScan(item)}
                      className="btn-tactile rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-mono font-bold text-slate-200 transition cursor-pointer"
                    >
                      Scan {item.sku}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-lift md:col-span-5 rounded-2xl border border-slate-200 bg-white p-7 space-y-5 shadow-xs">
              <div>
                <span className="text-[11px] font-mono uppercase font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Decoded Inventory Record
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">
                  {detectedProduct ? "SKU Verified in Catalog" : "Awaiting Camera Scan"}
                </h3>
              </div>

              {scanState === "scanning" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto" />
                  <p className="text-xs text-slate-500 font-mono">Decoding Code128 format…</p>
                </div>
              )}

              {detectedProduct && scanState === "detected" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                  <div>
                    <span className="font-mono text-xs text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      {detectedProduct.sku}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                      {detectedProduct.name}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs font-mono">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500">In Stock</span>
                      <div className="text-xl font-bold text-emerald-700">
                        {detectedProduct.stock} units
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Retail Price</span>
                      <div className="text-xl font-bold text-slate-900">
                        ${detectedProduct.price}.00
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStockCheckIn(detectedProduct.id)}
                      className="btn-tactile flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      +1 Check-In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("dispatch");
                        handleTriggerDispatch({
                          name: "Rahim Ahmed",
                          phone: "01712-345678",
                          address: "Dhanmondi, Dhaka",
                          orderId: "ORD-7712",
                          courier: "Steadfast Courier",
                          amount: `$${detectedProduct.price}.00`,
                        });
                      }}
                      className="btn-tactile flex-1 rounded-xl bg-orange-600 hover:bg-orange-500 py-2.5 text-xs font-bold text-white transition shadow-xs shadow-orange-600/20 cursor-pointer"
                    >
                      Dispatch Order
                    </button>
                  </div>
                </div>
              )}

              {scanState === "idle" && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
                  Select any sample SKU on the left to simulate camera decoding with audio confirmation.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 3: COURIER DISPATCH & WHATSAPP                      */}
        {/* ======================================================= */}
        {activeTab === "dispatch" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="card-lift lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-7 space-y-5 shadow-xs">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Carrier Integration Pipeline
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">
                  Steadfast Courier &amp; WhatsApp Notification
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  When staff confirms dispatch, the consignment is created with Steadfast and an automated WhatsApp tracking message is sent to the buyer.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-bold text-slate-900">{activeCustomer.orderId}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{activeCustomer.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-slate-600">{activeCustomer.phone}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Address:</span>
                  <span className="text-slate-700">{activeCustomer.address}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">COD Collection:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{activeCustomer.amount}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTriggerDispatch()}
                disabled={dispatchStep === "dispatching"}
                className="btn-tactile w-full flex items-center justify-center rounded-xl bg-orange-600 hover:bg-orange-500 py-3 text-xs sm:text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-50 shadow-md shadow-orange-600/20 cursor-pointer"
              >
                <span>{dispatchStep === "dispatching" ? "Dispatching consignment…" : "Trigger Simulated Courier Dispatch"}</span>
              </button>
            </div>

            <div className="card-lift lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    WA
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Merchant Store Bot</span>
                    <span className="text-[10px] text-emerald-700 font-mono">Official Business Account</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">10:48 AM</span>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
                <p className="font-bold text-slate-900">Order #{activeCustomer.orderId} Dispatched</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your parcel has been verified and handed to <strong>{activeCustomer.courier}</strong>.
                </p>
                <div className="pt-2 font-mono text-[11px] text-emerald-700 font-bold border-t border-slate-200">
                  Tracking: steadfast.com.bd/t/SF-994821
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Cash on Delivery: {activeCustomer.amount}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 4: AI ANTI-RETURN RTO FRAUD GUARD SIMULATOR          */}
        {/* ======================================================= */}
        {activeTab === "ai-copilot" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Input Simulator Panel */}
            <div className="card-lift lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase font-mono">
                    Pre-Dispatch Risk Evaluation
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Sandbox Test</span>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                  Recipient Phone (11-Digit BD)
                </label>
                <input
                  type="text"
                  value={simRtoPhone}
                  onChange={(e) => setSimRtoPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                  Delivery Destination Address
                </label>
                <textarea
                  rows={2}
                  value={simRtoAddress}
                  onChange={(e) => setSimRtoAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                  COD Consignment Amount (৳)
                </label>
                <input
                  type="number"
                  value={simRtoAmount}
                  onChange={(e) => setSimRtoAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSimAnalyzeRto}
                disabled={simRtoAnalyzing}
                className="w-full btn-tactile flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white py-2.5 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {simRtoAnalyzing ? "Evaluating delivery history…" : "Evaluate consignment return risk"}
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSimRtoPhone("01700000000");
                    setSimRtoAddress("Dhaka mor, near school");
                    setSimRtoAmount(7800);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Load High-Risk Sample
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimRtoPhone("01712345678");
                    setSimRtoAddress("House 12, Road 4, Sector 3, Uttara, Dhaka");
                    setSimRtoAmount(1450);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Load Safe Sample
                </button>
              </div>
            </div>

            {/* Simulated Live Output */}
            <div className="card-lift lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-[11px] font-mono font-medium uppercase text-slate-500">
                  Return risk assessment
                </span>
                {simRtoResult && (
                  <span className="text-xl font-semibold font-mono text-slate-900">
                    {simRtoResult.riskScore}/100 Risk
                  </span>
                )}
              </div>

              {simRtoResult ? (
                <div className="space-y-4">
                  <div
                    className={`p-3.5 rounded-xl border ${
                      simRtoResult.riskLevel === "HIGH"
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : simRtoResult.riskLevel === "MEDIUM"
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          simRtoResult.riskLevel === "HIGH"
                            ? "bg-rose-500"
                            : simRtoResult.riskLevel === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      <span className="text-xs font-bold font-mono uppercase">
                        Verdict: {simRtoResult.riskLevel} RISK CONSIGNMENT
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-1 leading-relaxed">
                      {simRtoResult.recommendation}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono font-bold text-slate-500 block mb-1">
                      Signal Vectors Detected:
                    </span>
                    <div className="space-y-1.5">
                      {simRtoResult.flags?.map((f, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-950 flex items-center justify-between">
                    <span>Potential return courier loss avoided:</span>
                    <span className="font-mono font-semibold text-emerald-700 text-sm">
                      ৳{simRtoResult.estimatedLossPrevented}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 font-mono text-xs">
                  Click &quot;Evaluate Consignment Return Risk&quot; to test algorithm.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER CALL TO ACTION ───────────────────────────── */}
        <div className="card-lift rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center space-y-4 shadow-xl shadow-slate-200/50 hover:border-orange-500/30 transition">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Ready to configure your warehouse workspace?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            100 orders included free every month. Connect your private Steadfast keys and start camera scanning today.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-3 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-orange-600/20 group"
            >
              <span>Create Account Free</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
