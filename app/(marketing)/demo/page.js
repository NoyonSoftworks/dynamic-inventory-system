"use client";

import { useState } from "react";
import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory";

// ── Dummy Catalog Data for Merchants ────────────────────────────
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
    status: "Critical Low",
  },
];

export default function InteractiveDemoPage() {
  // ── Tab state: 'dashboard' | 'scanner' | 'dispatch'
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Catalog filter & items state
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Scanner Simulation State
  const [scanState, setScanState] = useState("idle"); // 'idle' | 'scanning' | 'detected'
  const [detectedProduct, setDetectedProduct] = useState(null);

  // ── Dispatch Simulation State
  const [dispatchStep, setDispatchStep] = useState("idle"); // 'idle' | 'dispatching' | 'completed'
  const [activeCustomer, setActiveCustomer] = useState({
    name: "Tanvir Ahmed",
    phone: "01712-345678",
    address: "House 24, Road 7, Dhanmondi, Dhaka",
    orderId: "ORD-8492",
    courier: "Steadfast Courier",
    amount: "৳2,450",
  });
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  // ── Synthesized Success Audio Beep ─────────────────────────
  function playBeepSound() {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz High Pitch
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // ── Handle Simulated Barcode Scan ──────────────────────────
  function handleTriggerScan(targetProduct = null) {
    const item = targetProduct || products[0];
    setScanState("scanning");
    setDetectedProduct(null);

    setTimeout(() => {
      playBeepSound();
      setDetectedProduct(item);
      setScanState("detected");
    }, 700);
  }

  // ── Check-In (+1 stock)
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

  // ── Handle Simulated Courier & WhatsApp Dispatch ───────────
  function handleTriggerDispatch(customerData = null) {
    if (customerData) setActiveCustomer(customerData);
    setDispatchStep("dispatching");
    setShowNotificationToast(false);

    setTimeout(() => {
      setDispatchStep("completed");
      setShowNotificationToast(true);
      playBeepSound();

      // Automatically hide pop-up toast after 5 seconds
      setTimeout(() => setShowNotificationToast(false), 5000);
    }, 1100);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* ── WhatsApp Pop-up Banner Simulation ─────────────────── */}
      {showNotificationToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
              💬
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>WhatsApp Business Alert</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Sent to <strong>{activeCustomer.name}</strong> ({activeCustomer.phone})
              </p>
              <div className="mt-1.5 rounded-xl bg-slate-950 p-2.5 border border-slate-800 text-[11px] font-mono text-emerald-300 leading-relaxed">
                "Hello {activeCustomer.name}! Your order #{activeCustomer.orderId} has been dispatched via {activeCustomer.courier}. Tracking: steadfast.com.bd/t/SF-994821"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header Navigation ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <span>←</span>
              <span>Back to Overview</span>
            </Link>

            <span className="text-slate-700">|</span>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Interactive Sandbox · No Login Required
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 transition"
            >
              <span>Launch Live Store Free</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Sandbox Hero Banner ───────────────────────────────── */}
      <div className="relative pt-8 pb-6 border-b border-slate-900 bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Experience {APP_NAME} in Action
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-400 leading-relaxed">
            Test the warehouse cockpit without creating an account. Click below to try the simulated inventory catalog, test mobile barcode scanning with sound, or trigger an automated courier dispatch with live WhatsApp customer tracking.
          </p>

          {/* Interactive Mode Pills */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>📊</span>
              <span>1. Inventory Catalog Sandbox</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("scanner");
                handleTriggerScan();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "scanner"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>📱</span>
              <span>2. Camera Barcode Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("dispatch");
                handleTriggerDispatch();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "dispatch"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>🚚</span>
              <span>3. Courier &amp; WhatsApp Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN SANDBOX BODY ─────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* ======================================================= */}
        {/* TAB 1: SIMULATED INVENTORY DASHBOARD                    */}
        {/* ======================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Telemetry Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Active SKUs
                </span>
                <div className="text-2xl font-black text-white font-mono mt-1">
                  {products.length} Items
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">✓ Multi-variant enabled</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Stock On Hand
                </span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {products.reduce((acc, p) => acc + p.stock, 0)} Units
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Real-time sync</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Inventory Valuation
                </span>
                <div className="text-2xl font-black text-white font-mono mt-1">
                  ${products.reduce((acc, p) => acc + p.stock * p.price, 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-indigo-400 mt-1">Calculated at retail</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Courier Integration
                </span>
                <div className="text-2xl font-black text-sky-400 font-mono mt-1">
                  Steadfast BD
                </div>
                <div className="text-[10px] text-slate-400 mt-1">1-Click Dispatch API</div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                {["ALL", "Electronics", "Apparel", "Accessories"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
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
                  placeholder="Filter by name or SKU…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Catalog Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                    <tr>
                      <th className="px-5 py-3.5">SKU / Code</th>
                      <th className="px-5 py-3.5">Item Description</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">In Stock</th>
                      <th className="px-5 py-3.5">Unit Price</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Interactive Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredProducts.map((p) => {
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition group">
                          <td className="px-5 py-3.5 font-mono text-[11px] font-bold text-indigo-400">
                            {p.sku}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-white">
                            {p.name}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">
                            {p.category}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-white">
                            {p.stock} units
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-white">
                            ${p.price}.00
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.stock > 10
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {p.stock > 10 ? "● Available" : "● Low Stock"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleStockCheckIn(p.id)}
                                title="Simulate scanning & check-in (+1)"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-white transition"
                              >
                                <span>+1 In</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("scanner");
                                  handleTriggerScan(p);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 transition"
                              >
                                <span>📷 Scan</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("dispatch");
                                  handleTriggerDispatch({
                                    name: "Tanvir Ahmed",
                                    phone: "01712-345678",
                                    address: "Dhanmondi, Dhaka",
                                    orderId: "ORD-9481",
                                    courier: "Steadfast Courier",
                                    amount: `$${p.price}.00`,
                                  });
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition"
                              >
                                <span>🚚 Dispatch</span>
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
        {/* TAB 2: INTERACTIVE CAMERA SCANNER                       */}
        {/* ======================================================= */}
        {activeTab === "scanner" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Viewfinder Mockup */}
            <div className="md:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📱</span> Camera Barcode Scanner
                  </h3>
                  <p className="text-xs text-slate-400">
                    Runs on any iPhone or Android camera with sub-second WebAssembly decoding.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-mono font-bold text-emerald-400">
                  ● Camera Active
                </span>
              </div>

              {/* Viewport Frame */}
              <div className="relative rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950 p-8 flex flex-col items-center justify-center min-h-[320px] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                {/* Cyber Laser Reticle */}
                <div className="relative w-64 h-40 rounded-2xl border-2 border-indigo-500/40 flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />

                  {/* Pulsing Scan Beam */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse" />
                </div>

                <div className="relative z-10 mt-6 text-center space-y-3">
                  <div className="text-xs text-slate-400 font-mono">
                    Align Code128 / QR Code within the brackets
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {SAMPLE_PRODUCTS.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTriggerScan(item)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:text-white hover:border-slate-500 transition"
                      >
                        ⚡ Scan {item.sku}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Scan Result Card */}
            <div className="md:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                  Telemetry Engine Result
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {detectedProduct ? "Product Authenticated" : "Awaiting Barcode Scan"}
                </h3>
              </div>

              {scanState === "scanning" && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center space-y-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">Decoding Code128 symbology…</p>
                </div>
              )}

              {detectedProduct && scanState === "detected" && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {detectedProduct.sku}
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      ✓ Sound Verified
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">
                    {detectedProduct.name}
                  </h4>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
                    <div className="rounded-xl bg-slate-950/80 p-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Available Stock</span>
                      <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                        {detectedProduct.stock} units
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-950/80 p-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Unit Retail</span>
                      <div className="text-2xl font-black text-white font-mono mt-0.5">
                        ${detectedProduct.price}.00
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStockCheckIn(detectedProduct.id)}
                      className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition text-center shadow-md shadow-indigo-600/30"
                    >
                      🔽 Check-In (+1 Stock)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("dispatch");
                        handleTriggerDispatch({
                          name: "Tanvir Ahmed",
                          phone: "01712-345678",
                          address: "Dhanmondi, Dhaka",
                          orderId: "ORD-7712",
                          courier: "Steadfast Courier",
                          amount: `$${detectedProduct.price}.00`,
                        });
                      }}
                      className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition text-center shadow-md shadow-emerald-600/30"
                    >
                      🚚 Quick Dispatch
                    </button>
                  </div>
                </div>
              )}

              {scanState === "idle" && (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center text-xs text-slate-500 space-y-2">
                  <span className="text-3xl block">📷</span>
                  <p>Click any sample SKU above to trigger sub-second decoding and acoustic audio verification.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* TAB 3: SIMULATED COURIER DISPATCH & WHATSAPP            */}
        {/* ======================================================= */}
        {activeTab === "dispatch" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in duration-200">
            {/* Dispatch Controller */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Automated Logistics Pipeline
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  1-Click Steadfast Dispatch &amp; WhatsApp Alert
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The second your packing staff clicks "Confirm Dispatch", our engine creates a consignment ID on Steadfast Courier and pings the customer with their parcel tracking link.
                </p>
              </div>

              {/* Order Details Preview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Order Reference:</span>
                  <span className="font-mono font-bold text-white">{activeCustomer.orderId}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Recipient Customer:</span>
                  <span className="font-semibold text-white">{activeCustomer.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Recipient Phone:</span>
                  <span className="font-mono text-emerald-400 font-bold">{activeCustomer.phone}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Delivery Address:</span>
                  <span className="text-slate-200">{activeCustomer.address}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">COD Total to Collect:</span>
                  <span className="font-mono font-black text-white text-base">{activeCustomer.amount}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleTriggerDispatch()}
                  disabled={dispatchStep === "dispatching"}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 py-3.5 text-xs font-bold text-white shadow-xl shadow-emerald-600/30 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  <span>{dispatchStep === "dispatching" ? "Dispatching API…" : "🚀 Test 1-Click Dispatch Pipeline"}</span>
                </button>
              </div>
            </div>

            {/* Mockup WhatsApp Device */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-[36px] border-4 border-slate-800 bg-slate-950 p-4 shadow-2xl relative">
                {/* Phone Speaker Notch */}
                <div className="h-4 w-28 bg-slate-800 rounded-full mx-auto mb-3" />

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                      S
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{APP_NAME} Bot</div>
                      <div className="text-[10px] text-emerald-400">Official Merchant Channel</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">10:48 AM</span>
                </div>

                {/* WhatsApp Chat Message */}
                <div className="rounded-2xl rounded-tl-sm bg-emerald-950/70 border border-emerald-800/50 p-4 text-xs text-slate-200 space-y-2.5 shadow-lg">
                  <p className="font-semibold text-white">Hello {activeCustomer.name}! 👋</p>
                  <p className="text-slate-300 leading-relaxed">
                    Great news! Your package <strong>#{activeCustomer.orderId}</strong> has just been verified and dispatched via <strong>{activeCustomer.courier}</strong>.
                  </p>
                  <div className="rounded-xl bg-slate-950/90 p-3 border border-emerald-700/40 text-[11px] font-mono text-emerald-300 space-y-1">
                    <div className="text-slate-400 text-[10px]">REAL-TIME PARCEL TRACKING:</div>
                    <a
                      href="#dispatch"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Simulation: Opened Steadfast Courier live tracking portal for consignment SF-994821.");
                      }}
                      className="text-indigo-400 underline block font-bold"
                    >
                      steadfast.com.bd/t/SF-994821
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-emerald-900/50">
                    Amount to Pay: {activeCustomer.amount} · Thank you for ordering with us!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HIGH CONVERTING CALL TO ACTION ──────────────────── */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-emerald-950/60 p-8 sm:p-12 text-center space-y-5 shadow-2xl">
          <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3.5 py-1 text-xs font-bold text-indigo-300">
            ★ Zero Hardware Required
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Ready to Automate Your Real Warehouse?
          </h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300">
            Every merchant starts with 100 free orders every month. Experience bank-grade PostgreSQL Row-Level Security, multi-carrier dispatch, and automated WhatsApp notifications today.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:scale-105 transition"
            >
              <span>Get Started Free (100 Orders)</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
