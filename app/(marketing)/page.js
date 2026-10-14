"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory SaaS";
const APP_SHORT_NAME = "SmartInventory";

export default function MarketingLandingPage() {
  // ── Authentication & User Session State ──────────────────────
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Dynamic SaaS Pricing & Settings ──────────────────────────
  const [currency, setCurrency] = useState("USD"); // "USD" | "BDT"
  const [pricingData, setPricingData] = useState({
    proPriceUsd: 49.0,
    bdtRate: 122.0,
    freeLimit: 100,
    sslConfigured: false,
    stripeKey: "",
  });

  // Client-safe prerender year
  const [currentYear, setCurrentYear] = useState(2026);

  // ── Interactive Hero Subtitle Rotator ────────────────────────
  const rotatingHeadlines = [
    "Smart Phone Barcode Scanner (Zero Laser Hardware)",
    "Instant 1-Click Steadfast & Multi-Courier Dispatch",
    "Automated WhatsApp & SMS Tracking Alerts",
    "PostgreSQL Bank-Grade Multi-Tenant Isolation",
  ];
  const [headlineIndex, setHeadlineIndex] = useState(0);

  // ── Interactive Terminal / Simulator State ───────────────────
  const [activeTab, setActiveTab] = useState("scanner"); // "scanner" | "whatsapp" | "courier"
  const [simulatedScanState, setSimulatedScanState] = useState("idle"); // "idle" | "scanning" | "found"
  const [scannedSku, setScannedSku] = useState(null);

  // ── Interactive ROI Calculator State ─────────────────────────
  const [monthlyOrders, setMonthlyOrders] = useState(1200);

  // ── FAQ Accordion Open State ─────────────────────────────────
  const [openFaq, setOpenFaq] = useState(0);

  // ── Audio Beep Synthesizer for Interactive Simulator ─────────
  function playAudioBeep() {
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
      // Audio autoplay policy fallback
    }
  }

  // ── Initial Mount: Auth Check & Dynamic Settings Fetch ───────
  useEffect(() => {
    let isMounted = true;
    setCurrentYear(new Date().getFullYear());

    async function initPage() {
      try {
        // 1. Session check
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted && session?.user) {
          setUser(session.user);
          const email = (session.user.email || "").toLowerCase().trim();
          setIsAdmin(email === ADMIN_EMAIL);
        }

        // 2. Fetch public pricing & currency settings from SaaS API
        const res = await fetch("/api/admin/settings?public=true");
        if (res.ok) {
          const json = await res.json();
          if (json?.settings && isMounted) {
            setPricingData({
              proPriceUsd: Number(json.settings.pro_plan_price) || 49.0,
              bdtRate: Number(json.settings.bdt_exchange_rate) || 122.0,
              freeLimit: Number(json.settings.free_order_limit) || 100,
              sslConfigured: Boolean(json.settings.sslcommerz_configured),
              stripeKey: json.settings.stripe_public_key || "",
            });

            // If SaaS settings enforces default BDT
            if (json.settings.currency_mode === "BDT") {
              setCurrency("BDT");
            }
          }
        }
      } catch (err) {
        console.warn("Landing page public settings fetch notice:", err);
      } finally {
        if (isMounted) setSessionLoading(false);
      }
    }

    initPage();

    // Rotate hero typewriter badge every 3.2 seconds
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % rotatingHeadlines.length);
    }, 3200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // ── Simulator Action ─────────────────────────────────────────
  const handleTriggerDemoScan = () => {
    setSimulatedScanState("scanning");
    setScannedSku(null);

    setTimeout(() => {
      playAudioBeep();
      setScannedSku({
        sku: "SKU-9921-BLK",
        name: "Premium Cotton Slim-Fit Apparel (Black / 42)",
        stock: 45,
        price: 1850,
      });
      setSimulatedScanState("found");
    }, 800);
  };

  // Pricing calculations
  const displayPrice =
    currency === "BDT"
      ? `৳${Math.round(pricingData.proPriceUsd * pricingData.bdtRate).toLocaleString()}`
      : `$${pricingData.proPriceUsd.toFixed(0)}`;

  // ROI calculations
  const hoursSaved = Math.round((monthlyOrders * 2.8) / 60);
  const hardwareSaved = 350; // $350 laser scanner saved
  const disputeReduction = Math.min(94, Math.round(75 + (monthlyOrders / 1000) * 3));

  const faqs = [
    {
      q: "Do my warehouse workers need expensive physical barcode scanners?",
      a: "No! Our high-speed camera scanner runs directly in any mobile browser (iOS and Android). It leverages sub-second WebAssembly decoding to read Code128 and QR codes straight from smartphone cameras.",
    },
    {
      q: "Which courier services are connected for 1-click dispatch?",
      a: "The platform integrates natively with Steadfast Courier, Pathao Courier, RedX, Paperfly, and Carrybee. You can configure your own private courier API credentials in seconds and dispatch consignments with one click.",
    },
    {
      q: "How does automated WhatsApp & SMS tracking notification work?",
      a: "The moment an order is dispatched to your courier, our backend triggers an automated message to the customer via GreenAPI (WhatsApp) and BulkSMSBD (SMS), containing their parcel tracking link and invoice details.",
    },
    {
      q: "Is my store's product catalog and order database secure?",
      a: "Absolutely. We enforce PostgreSQL Row-Level Security (RLS) with Cryptographic Tenant Isolation. Other merchants or users cannot read, edit, or leak your inventory or customer data under any circumstances.",
    },
    {
      q: "Can I import my existing product catalog from Excel or CSV?",
      a: "Yes. Our Bulk Import engine allows you to drag-and-drop CSV files with thousands of SKUs. It automatically parses variants, validates column constraints, and generates initial stock items instantaneously.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ── BACKGROUND GLOW ORBS ─────────────────────────────────── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-150px] left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-[-100px] right-1/4 w-[450px] h-[450px] bg-emerald-500/15 rounded-full blur-[130px]" />
        <div className="absolute top-[200px] left-1/3 w-[350px] h-[350px] bg-fuchsia-600/10 rounded-full blur-[150px]" />
      </div>

      {/* ── TOP STICKY NAVBAR (PUBLIC MARKETING) ─────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition">
              <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950">
                <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
                  {APP_SHORT_NAME.charAt(0)}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                {APP_SHORT_NAME} <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">AI</span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <Link
              href="/demo"
              className="text-emerald-400 hover:text-emerald-300 font-bold transition flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Interactive Demo</span>
            </Link>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#simulator" className="hover:text-white transition">Live Terminal</a>
            <a href="#couriers" className="hover:text-white transition">Couriers</a>
            <a href="#roi" className="hover:text-white transition">ROI Calculator</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          {/* Right Action Buttons - Auth & Session Aware */}
          <div className="flex items-center gap-3">
            {!sessionLoading && user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
                  >
                    <span>🛡️</span> Super Admin
                  </Link>
                )}
                <Link
                  href="/dashboard/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 transition"
                >
                  <span>Dashboard</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 transition"
                >
                  <span>Start Free</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Cybernetic Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-4 py-1.5 text-xs font-medium text-indigo-300 shadow-xl backdrop-blur-md mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">The Autonomous Inventory &amp; Logistics SaaS</span>
            <span className="text-slate-500">·</span>
            <span className="text-indigo-400 font-mono">v2.5 Enterprise</span>
          </div>

          {/* Main Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] sm:leading-[1.1]">
            Next-Gen Warehousing{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Without the Chaos.
            </span>
          </h1>

          {/* Dynamic Cycling Subtitle */}
          <div className="mt-6 flex items-center justify-center gap-2 min-h-[32px]">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Enabled:</span>
            <span className="text-sm sm:text-base font-semibold text-emerald-400 font-mono transition-all duration-300">
              ⚡ {rotatingHeadlines[headlineIndex]}
            </span>
          </div>

          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            Eliminate manual spreadsheets, lost courier parcels, and expensive laser hardware. 
            Scan barcodes directly with mobile cameras, automate Steadfast dispatches, and trigger instant WhatsApp tracking links.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/35 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <span>{user ? "Enter Your Dashboard" : "Start Free Trial (100 Orders)"}</span>
              <span className="text-base">→</span>
            </Link>

            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/50 bg-indigo-950/60 hover:bg-indigo-900/60 px-6 py-4 text-sm font-bold text-white transition backdrop-blur-md shadow-lg shadow-indigo-600/20"
            >
              <span>⚡ Try Interactive Demo Sandbox</span>
            </Link>
          </div>

          {/* Trust Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">0.3s</div>
              <div className="text-xs text-slate-400 mt-1">Barcode Decode Speed</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">100%</div>
              <div className="text-xs text-slate-400 mt-1">PostgreSQL RLS Isolated</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">5+</div>
              <div className="text-xs text-slate-400 mt-1">Integrated Couriers</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">$0</div>
              <div className="text-xs text-slate-400 mt-1">Hardware Laser Cost</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TERMINAL SIMULATOR SECTION ───────────────── */}
      <section id="simulator" className="relative z-10 py-16 bg-slate-950/60 border-y border-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              Interactive Live Simulation
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white mt-2">
              Experience the Engine in Real-Time
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Test drive the Smart Barcode Scanner, automated WhatsApp alerts, and courier dispatch payload generation.
            </p>
          </div>

          {/* Simulator Console Container */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-2xl overflow-hidden">
            {/* Top Window Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-xs text-slate-400 hidden sm:inline">
                  telemetry-engine · interactive sandbox
                </span>
              </div>

              {/* Tab Switchers */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("scanner")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "scanner"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📷 Smart Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "whatsapp"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  💬 WhatsApp Alert
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courier")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "courier"
                      ? "bg-sky-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🚚 Courier API
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: SMART SCANNER */}
            {activeTab === "scanner" && (
              <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Simulated Camera Feed */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[300px] overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                  {/* Laser Scan Line Animation */}
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-44 rounded-2xl border-2 border-dashed border-indigo-500/40 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse" />
                  </div>

                  <div className="relative z-10 text-center space-y-3">
                    <span className="text-4xl">📱</span>
                    <p className="text-xs text-slate-400 font-mono">
                      Target SKU Barcode inside frame
                    </p>
                    <button
                      type="button"
                      onClick={handleTriggerDemoScan}
                      disabled={simulatedScanState === "scanning"}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition disabled:opacity-50"
                    >
                      <span>{simulatedScanState === "scanning" ? "Decoding SKU…" : "⚡ Trigger Simulated Scan"}</span>
                    </button>
                  </div>
                </div>

                {/* Scanned Result Card */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                      Decoded Item Result
                    </span>
                    {simulatedScanState === "found" && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        ✓ SKU Authenticated
                      </span>
                    )}
                  </div>

                  {simulatedScanState === "found" && scannedSku ? (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <span className="font-mono text-xs text-indigo-400 font-bold">
                          {scannedSku.sku}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1">
                          {scannedSku.name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/20">
                        <div className="rounded-xl bg-slate-950/70 p-3">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Available Stock</span>
                          <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                            {scannedSku.stock} units
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/70 p-3">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Unit Price</span>
                          <div className="text-xl font-black text-white font-mono mt-0.5">
                            ৳{scannedSku.price}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => alert("Simulation: Stock checked in to database (+1 unit).")}
                          className="flex-1 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 py-2 text-xs font-bold text-white transition"
                        >
                          🔽 Check-In (+1)
                        </button>
                        <button
                          type="button"
                          onClick={() => alert("Simulation: Consignment created for courier dispatch.")}
                          className="flex-1 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 py-2 text-xs font-bold text-white transition"
                        >
                          🚚 Dispatch Order
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center text-xs text-slate-500">
                      Click <strong className="text-slate-300 font-mono">"Trigger Simulated Scan"</strong> to see how fast our barcode engine retrieves live stock and plays audio verification.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: WHATSAPP ALERT PREVIEW */}
            {activeTab === "whatsapp" && (
              <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center justify-center gap-8">
                {/* Mock Phone Container */}
                <div className="w-full max-w-sm rounded-[36px] border-4 border-slate-800 bg-slate-950 p-4 shadow-2xl relative">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                        {APP_SHORT_NAME.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{APP_SHORT_NAME} Bot</div>
                        <div className="text-[10px] text-emerald-400">Verified Business Account</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">10:42 AM</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="rounded-2xl rounded-tl-sm bg-emerald-950/70 border border-emerald-800/60 p-4 text-xs text-slate-200 space-y-2">
                    <p className="font-semibold text-white">Hello Arif Rahman! 👋</p>
                    <p className="text-slate-300">
                      Your order <strong>#1084</strong> from <strong>Merchant Store</strong> has been dispatched via <strong>Steadfast Courier</strong>.
                    </p>
                    <div className="rounded-xl bg-slate-950/80 p-2.5 border border-emerald-700/40 text-[11px] font-mono text-emerald-300">
                      📦 Tracking URL: <br />
                      <a href="#simulator" className="underline text-indigo-300">
                        steadfast.com.bd/t/SF-889124
                      </a>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1">
                      Cash on Delivery: ৳1,850 · Thank you for shopping with us!
                    </p>
                  </div>
                </div>

                <div className="max-w-md space-y-3">
                  <h4 className="text-xl font-bold text-white">Zero Extra Customer Service Calls</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Over 65% of ecommerce customer support inquiries are "Where is my parcel?". 
                    Our platform automatically pings your buyers on WhatsApp the exact second you hit dispatch, reducing customer disputes to near zero.
                  </p>
                  <div className="flex items-center gap-2 pt-2 text-xs font-mono text-emerald-400">
                    <span>✓ Automated GreenAPI &amp; BulkSMSBD Integration</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: COURIER API PAYLOAD */}
            {activeTab === "courier" && (
              <div className="p-6 sm:p-10">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs text-slate-300 overflow-x-auto space-y-2">
                  <div className="text-slate-500">// POST /api/courier/steadfast (Executed with sub-second execution &amp; rate limit checks)</div>
                  <pre className="text-emerald-400">
{`{
  "invoice": "ORD-9421",
  "recipient_name": "Tariqul Islam",
  "recipient_phone": "01712345678",
  "recipient_address": "House 12, Road 4, Dhanmondi, Dhaka",
  "cod_amount": 2500,
  "status": "CONSIGNMENT_CREATED",
  "tracking_code": "SF-9481920",
  "tracking_url": "https://steadfast.com.bd/tracking/SF-9481920"
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES GRID ──────────────────────────────────── */}
      <section id="features" className="py-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Architected for Performance
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-3">
              Everything Your Warehouse Needs to Scale
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              Engineered with modern Next.js 16 App Router, Supabase PostgreSQL RLS, and sub-second logistics pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl hover:border-indigo-500/50 transition group relative overflow-hidden">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition">
                📷
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Mobile Camera Scanner</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transform any warehouse employee's phone into an enterprise laser scanner. Auto-plays success beeps and loads instant inventory telemetry without laser hardware costs.
              </p>
              <div className="mt-4 text-[11px] font-mono text-indigo-400">Zero laser hardware overhead →</div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl hover:border-emerald-500/50 transition group relative overflow-hidden">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition">
                💬
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automated WhatsApp Notifications</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trigger parcel dispatch alerts directly to your customers with live tracking links using GreenAPI, Twilio, or BulkSMSBD the second you confirm dispatch.
              </p>
              <div className="mt-4 text-[11px] font-mono text-emerald-400">65% Fewer customer queries →</div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl hover:border-sky-500/50 transition group relative overflow-hidden">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition">
                🚚
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Carrier Logistics Hub</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dispatch orders in 1-click across Steadfast, Pathao, RedX, Paperfly, and Carrybee with automated consignment IDs and tracking code generation.
              </p>
              <div className="mt-4 text-[11px] font-mono text-sky-400">Unified tracking cockpit →</div>
            </div>

            {/* Feature 4 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl hover:border-purple-500/50 transition group relative overflow-hidden">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Bank-Grade Security (RLS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                PostgreSQL Row-Level Security policies guarantee total tenant isolation. Tenants can only read and mutate their own workspace's products and orders.
              </p>
              <div className="mt-4 text-[11px] font-mono text-purple-400">Zero data leaks by design →</div>
            </div>

            {/* Feature 5 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl hover:border-amber-500/50 transition group relative overflow-hidden">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition">
                👥
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Unlimited Multi-User Access</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empower your warehouse packing team with granular roles: Admin, Operator, and Viewer accounts with individual activity footprint tracking.
              </p>
              <div className="mt-4 text-[11px] font-mono text-amber-400">Role-based access control →</div>
            </div>

            {/* Feature 6 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl hover:border-rose-500/50 transition group relative overflow-hidden">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition">
                🐾
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Real-Time Activity Footprints</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Immutable audit trail tracking every staff action: stock intake, order dispatch, courier setting updates, and employee role assignments with IP stamps.
              </p>
              <div className="mt-4 text-[11px] font-mono text-rose-400">Complete audit accountability →</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COURIERS RECOGNITION SECTION ─────────────────────────── */}
      <section id="couriers" className="py-16 border-y border-slate-900 bg-slate-950/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
            Pre-Integrated Logistics Partners
          </span>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
              <span className="h-3 w-3 rounded-full bg-emerald-400" /> Steadfast Courier
            </div>
            <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
              <span className="h-3 w-3 rounded-full bg-rose-500" /> Pathao Courier
            </div>
            <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
              <span className="h-3 w-3 rounded-full bg-red-500" /> RedX Delivery
            </div>
            <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
              <span className="h-3 w-3 rounded-full bg-sky-400" /> Paperfly
            </div>
            <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
              <span className="h-3 w-3 rounded-full bg-amber-400" /> Carrybee
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE ROI CALCULATOR SECTION ───────────────────── */}
      <section id="roi" className="py-24 relative z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 via-slate-900/90 to-slate-950 p-8 sm:p-12 shadow-2xl space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
                Measurable Return on Investment
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
                Calculate Your Monthly Warehouse Savings
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Drag the slider to your store's average monthly volume and see the immediate time and cost reclaimed.
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-4 max-w-xl mx-auto pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Monthly Orders Shipped
                </label>
                <span className="text-xl font-black text-indigo-400 font-mono">
                  {monthlyOrders.toLocaleString()} orders/mo
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>100 orders</span>
                <span>5,000 orders</span>
                <span>10,000+ orders</span>
              </div>
            </div>

            {/* Estimated Gains */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-slate-800">
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Labor Time Saved
                </span>
                <div className="text-3xl font-black text-emerald-400 font-mono mt-2">
                  ~{hoursSaved} hrs/mo
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Replaced manual courier entries</p>
              </div>

              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-center">
                <span className="text-[11px] font-bold text-white font-mono mt-2">
                  ${hardwareSaved}+ Saved
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Camera barcode decoding built-in</p>
              </div>

              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Customer Dispute Reduction
                </span>
                <div className="text-3xl font-black text-sky-400 font-mono mt-2">
                  -{disputeReduction}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Instant WhatsApp parcel alerts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DYNAMIC PRICING MATRIX ───────────────────────────────── */}
      <section id="pricing" className="py-24 relative z-10 bg-slate-950/80 border-t border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Transparent, Scalable Pricing
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">
              Start Free, Scale as You Grow
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Prices pulled dynamically from SaaS platform settings. No hidden surcharges.
            </p>

            {/* Currency Switcher (BDT / USD) */}
            <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  currency === "USD"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  currency === "BDT"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                BDT (৳)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
            {/* Free Starter Tier */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300">
                  Starter Merchant
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-white font-mono">
                    {currency === "BDT" ? "৳0" : "$0"}
                  </span>
                  <span className="text-xs text-slate-400">/ forever</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal for new shops and boutique merchants launching their operations.
                </p>

                <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Up to {pricingData.freeLimit} orders per month
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Smart Camera Barcode Scanner
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Steadfast Courier connection
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> PostgreSQL RLS isolation
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/login"
                  className="block w-full text-center rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-3 text-xs font-bold text-white transition"
                >
                  Get Started Free
                </Link>
              </div>
            </div>

            {/* Pro Scale Tier (Featured) */}
            <div className="rounded-3xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-950/50 via-slate-900/90 to-slate-950 p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                Most Popular
              </div>

              <div className="space-y-4">
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-[11px] font-bold text-indigo-300">
                  Pro Enterprise Plan
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-white font-mono">
                    {displayPrice}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400">
                  Uncapped fulfillment capacity with automated courier and messaging workflows.
                </p>

                <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> <strong>Unlimited</strong> orders &amp; dispatches
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Automated WhatsApp &amp; SMS alerts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> All 5 integrated courier pipelines
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Lightning CSV Bulk Import (10k+ rows)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Real-Time Activity Footprint Audit Logs
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Priority 24/7 Developer Support
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href={user ? "/dashboard/billing" : "/login"}
                  className="block w-full text-center rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 py-3.5 text-xs font-bold text-white shadow-xl shadow-indigo-600/40 hover:brightness-110 transition"
                >
                  {user ? "Upgrade in Dashboard →" : "Start Pro Trial →"}
                </Link>
              </div>
            </div>

            {/* Custom Omnichannel Enterprise */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300">
                  Omnichannel Custom
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-white font-mono">
                    Custom SLA
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Custom integrations, dedicated database clusters, and specialized ERP connectors.
                </p>

                <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> 100,000+ orders per month
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Custom courier webhook handlers
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Dedicated database instance
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Dedicated Solutions Architect
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <a
                  href="mailto:support@smartinventory.io?subject=Enterprise%20Inquiry"
                  className="block w-full text-center rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-3 text-xs font-bold text-white transition"
                >
                  Talk to Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE FAQ SECTION ──────────────────────────────── */}
      <section id="faq" className="py-20 relative z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              Frequently Answered Questions
            </span>
            <h2 className="text-3xl font-black text-white mt-2">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-indigo-300 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 font-mono text-base ml-4">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HIGH-CONVERTING BOTTOM CTA ───────────────────────────── */}
      <section className="py-20 relative z-10 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950 border-t border-slate-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Stop losing parcels. Start scaling your warehouse today.
          </h2>
          <p className="mx-auto max-w-xl text-sm text-slate-400">
            Join modern merchants who have transformed their packing tables into high-velocity fulfillment centers.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-8 py-4 text-sm font-bold text-white shadow-2xl shadow-indigo-600/40 hover:scale-105 transition"
            >
              <span>{user ? "Go to Inventory Dashboard" : "Start Your 100-Order Free Trial"}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              {APP_SHORT_NAME.charAt(0)}
            </div>
            <span className="font-bold text-slate-300">{APP_NAME}</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-ping" />
              All Systems Operational
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            {/* Secure Routing: Only display secure links if authenticated */}
            {user && (
              <Link href="/dashboard/products" className="hover:text-white transition">
                Dashboard
              </Link>
            )}
            {user && isAdmin && (
              <Link href="/admin" className="text-emerald-400 hover:text-emerald-300 transition">
                Super Admin
              </Link>
            )}
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            © {currentYear} {APP_NAME}. PostgreSQL RLS Protected.
          </div>
        </div>
      </footer>
    </div>
  );
}
