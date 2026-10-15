"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory";
const APP_SHORT_NAME = "SmartInventory";

export default function MarketingLandingPage() {
  // ── Authentication & Session State ───────────────────────────
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Dynamic Pricing & Currency State ─────────────────────────
  const [currency, setCurrency] = useState("BDT"); // "BDT" default for Bangladesh SaaS, toggleable to "USD"
  const [pricingData, setPricingData] = useState({
    proPriceUsd: 49.0,
    bdtRate: 122.0,
    freeLimit: 100,
    sslConfigured: false,
    stripeKey: "",
  });

  const [currentYear, setCurrentYear] = useState(2026);

  // ── Interactive Terminal / Simulator State ───────────────────
  const [activeTab, setActiveTab] = useState("scanner"); // "scanner" | "whatsapp" | "courier"
  const [simulatedScanState, setSimulatedScanState] = useState("idle"); // "idle" | "scanning" | "found"
  const [scannedSku, setScannedSku] = useState(null);
  const [selectedCourierSim, setSelectedCourierSim] = useState("Steadfast");

  // ── Interactive ROI Calculator State ─────────────────────────
  const [monthlyOrders, setMonthlyOrders] = useState(1500);

  // ── FAQ Accordion State ──────────────────────────────────────
  const [openFaq, setOpenFaq] = useState(0);

  // ── Audio Beep Synthesizer ───────────────────────────────────
  function playAudioBeep() {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio fallback
    }
  }

  // ── Initial Mount: Auth Check & Dynamic Settings Fetch ───────
  useEffect(() => {
    let isMounted = true;
    setCurrentYear(new Date().getFullYear());

    async function initPage() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted && session?.user) {
          setUser(session.user);
          const email = (session.user.email || "").toLowerCase().trim();
          setIsAdmin(email === ADMIN_EMAIL);
        }

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

            if (json.settings.currency_mode === "USD") {
              setCurrency("USD");
            }
          }
        }
      } catch (err) {
        console.warn("Settings notice:", err);
      } finally {
        if (isMounted) setSessionLoading(false);
      }
    }

    initPage();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Simulator Trigger Action ─────────────────────────────────
  const handleTriggerDemoScan = () => {
    setSimulatedScanState("scanning");
    setScannedSku(null);

    setTimeout(() => {
      playAudioBeep();
      setScannedSku({
        sku: "SKU-CTG-8821-BLK",
        name: "Vintage Heavyweight Tee (Black / XL)",
        category: "Ready-Made Garments",
        stock: 64,
        priceUsd: 12,
        priceBdt: 1450,
        warehouse: "Main Fulfillment Hub · Bay 4",
        barcode: "890120268821",
        consignmentId: "SF-94821-BD",
      });
      setSimulatedScanState("found");
    }, 550);
  };

  // Pricing calculations
  const displayPrice =
    currency === "BDT"
      ? `৳${Math.round(pricingData.proPriceUsd * pricingData.bdtRate).toLocaleString()}`
      : `$${pricingData.proPriceUsd.toFixed(0)}`;

  // Dynamic ROI calculations
  const hoursSaved = Math.round((monthlyOrders * 2.8) / 60);
  const hardwareSavedVal = currency === "BDT" ? "৳42,000+" : "$350+";
  const moneySavedVal =
    currency === "BDT"
      ? `৳${Math.round(monthlyOrders * 22).toLocaleString()}`
      : `$${Math.round(monthlyOrders * 0.18).toLocaleString()}`;
  const disputeReduction = Math.min(94, Math.round(78 + (monthlyOrders / 1200) * 3));

  // High-Ranking SEO & AEO FAQ
  const faqs = [
    {
      q: "How does in-browser camera barcode scanning work without buying laser hardware?",
      a: "SmartInventory utilizes client-side WebAssembly video stream decoding. Warehouse operators simply open the platform on any smartphone browser (iOS Safari or Android Chrome) and point the camera at any 1D Code128, EAN-13, or 2D QR code. The system resolves the SKU in under 280 milliseconds with audible audio confirmation, completely eliminating the need for $350+ handheld scanner guns.",
    },
    {
      q: "Can I directly connect our existing Steadfast, Pathao, or RedX courier accounts?",
      a: "Yes. You enter your carrier API Key and Secret in your workspace Settings. When orders are packed and verified with a scan, a single click creates the consignment with Steadfast, generates the official tracking link, and prepares standard 4×6 inch thermal shipping labels.",
    },
    {
      q: "How do automated WhatsApp parcel updates reduce customer return rates (RTO)?",
      a: "Failed deliveries and return-to-origin (RTO) typically occur when customers are unaware of delivery schedules or COD cash amounts. The moment an order is marked as dispatched in SmartInventory, an automated WhatsApp alert notifies the buyer with their parcel tracking link and exact COD cash balance, slashing delivery disputes by over 80%.",
    },
    {
      q: "Can we import our existing inventory catalog from Excel or Google Sheets?",
      a: "Yes. Our high-speed CSV and Excel importer processes thousands of SKU rows with multi-variant attributes (Size, Color, Material, etc.), automatically generates unique serialized barcodes, and establishes initial warehouse stock counts in seconds.",
    },
    {
      q: "How does SmartInventory prevent overselling across multiple sales channels?",
      a: "Every transaction (receiving inventory, pack & scan, courier dispatch, or customer return) is recorded in real time. Available stock updates instantly, and automated reorder runway forecasts alert your warehouse manager before popular items stock out.",
    },
    {
      q: "Is my business inventory data completely isolated from other merchants?",
      a: "Yes. SmartInventory enforces PostgreSQL multi-tenant isolation with Row-Level Security (RLS) policies. Every database operation is cryptographically scoped to your workspace ID. No competitor or external store can ever access your inventory or customer data.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased selection:bg-orange-500/20 selection:text-orange-900">
      {/* ── TOP HEADER (Clean White Bar with Physical Border) ───── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                {APP_SHORT_NAME}
              </span>
              <span className="text-[10px] font-mono font-medium text-orange-600 -mt-1 hidden sm:block">
                Warehouse &amp; Courier OS
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-orange-600 transition">Features</a>
            <a href="#simulator" className="hover:text-orange-600 transition">Interactive Terminal</a>
            <a href="#roi" className="hover:text-orange-600 transition">ROI Calculator</a>
            <a href="#pricing" className="hover:text-orange-600 transition">Pricing</a>
            <Link href="/blog" className="hover:text-orange-600 transition">Guides &amp; Blog</Link>
            <a href="#faq" className="hover:text-orange-600 transition">FAQ</a>
            <Link
              href="/demo"
              className="text-orange-600 hover:text-orange-700 font-bold transition flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sandbox</span>
            </Link>
          </nav>

          {/* Right Action & Currency Controls */}
          <div className="flex items-center gap-3">
            {/* Currency Pill Toggle */}
            <div className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`px-2 py-0.5 rounded-md transition ${
                  currency === "BDT"
                    ? "bg-white text-orange-600 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ৳ BDT
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-2 py-0.5 rounded-md transition ${
                  currency === "USD"
                    ? "bg-white text-orange-600 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                $ USD
              </button>
            </div>

            {!sessionLoading && user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="btn-tactile hidden sm:inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    Super Admin
                  </Link>
                )}
                <Link
                  href="/dashboard/products"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-orange-600/25"
                >
                  <span>Dashboard</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-orange-600/25"
                >
                  <span>Get Started Free</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION WITH 3D DEPTH & PERSPECTIVE ─────────────── */}
      <section className="relative z-10 pt-14 pb-16 sm:pt-20 sm:pb-24 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-[#f8fafc]">
        {/* Subtle Isometric Background Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-8 text-center space-y-6">
          {/* Trust Category Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-4 py-1 text-xs font-semibold text-orange-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Smart Camera Scanning · Steadfast Courier Sync · Automated WhatsApp</span>
          </div>

          {/* Punchy, Human Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            High-precision inventory.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
              One-click courier dispatch.
            </span>
          </h1>

          {/* Sober B2B Subheading */}
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Turn any smartphone into a commercial barcode scanner gun. Sync consignments directly with <strong>Steadfast, Pathao &amp; RedX</strong>. Automatically update customers on WhatsApp with real-time tracking links.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/25 transition group"
            >
              <span>{user ? "Open Workspace Dashboard" : "Start 100-Order Free Trial"}</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/demo"
              className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition"
            >
              <span>Explore Interactive Sandbox →</span>
            </Link>
          </div>

          {/* Key Assurance Micro-Badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No hardware scanner needed
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              100% Free trial quota
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </span>
          </div>
        </div>

        {/* ── 3D PERSPECTIVE HERO WINDOW (Interactive Depth Mockup) ── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-8 mt-12 sm:mt-16 perspective-1200">
          <div className="rotate-3d-card relative rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden transition-all duration-300">
            {/* Window Browser Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 font-mono text-[11px] text-slate-500 hidden sm:inline font-semibold">
                  smartinventory.io/dashboard/dispatch
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 font-semibold border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Central Hub: Online
                </span>
                <span className="text-slate-400 hidden sm:inline">280ms Camera WebAssembly</span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-white">
              {/* Product Card with Barcode */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-orange-700 bg-orange-100/80 border border-orange-200 px-2.5 py-0.5 rounded-md">
                      SKU-CTG-8821-BLK
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      Vintage Heavyweight Tee (Black / XL)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Apparel &amp; Ready-Made Garments</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                    64 Units
                  </span>
                </div>

                {/* 3D Simulated Barcode Label */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[10px] font-mono font-bold text-slate-400 uppercase">
                    Code 128
                  </div>
                  <div className="flex items-center gap-[2px] h-12 pt-2">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1].map((w, i) => (
                      <span
                        key={i}
                        className="bg-slate-900 h-full inline-block"
                        style={{ width: `${w * 1.5}px` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-slate-700 tracking-widest font-bold">
                    *SKU-CTG-8821-BLK*
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Retail Price</span>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {currency === "BDT" ? "৳1,450.00" : "$12.00"}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Scan Verification</span>
                    <div className="text-base font-bold text-emerald-600 mt-0.5">Verified ✓</div>
                  </div>
                </div>
              </div>

              {/* Courier Consignment & WhatsApp Auto-Dispatch Card */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        SF
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Steadfast Courier API Sync</span>
                        <span className="text-[10px] text-slate-500">Auto-consignment created in 240ms</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      #SF-94821-BD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Customer</span>
                      <p className="font-bold text-slate-900 mt-0.5">Tariqul Islam</p>
                      <p className="text-slate-500 text-[11px] font-mono">01712-345678</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Destination</span>
                      <p className="font-bold text-slate-900 mt-0.5">Dhanmondi, Dhaka</p>
                      <p className="text-slate-500 text-[11px]">Home Delivery (Next Day)</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">COD Collection</span>
                      <p className="font-bold text-emerald-700 text-sm mt-0.5 font-mono">
                        {currency === "BDT" ? "৳2,500" : "$20.50"}
                      </p>
                      <p className="text-slate-500 text-[10px] font-mono">Auto-Reconciled</p>
                    </div>
                  </div>

                  {/* WhatsApp Notification Capsule */}
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 flex items-start gap-3 text-xs">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-2xs">
                      WA
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 text-xs">
                          Automated WhatsApp Message Sent
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">Just Now</span>
                      </div>
                      <p className="text-emerald-800 text-[11px] leading-relaxed">
                        &quot;Assalamu Alaikum Tariqul, your parcel #ORD-9421 is out for delivery via Steadfast. Track live: steadfast.com.bd/t/SF-94821-BD. Total COD: {currency === "BDT" ? "৳2,500" : "$20.50"}&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 px-1 font-mono font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-600 font-bold">✓</span> 4×6 Thermal Label Ready
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-600 font-bold">✓</span> Real-Time Stock Depletion
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-600 font-bold">✓</span> PostgreSQL RLS Isolation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARRIER & PAYMENT PARTNERS TRUST STRIP ───────────────── */}
      <section className="py-8 border-y border-slate-200 bg-white shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 text-center space-y-4">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Enterprise Logistics &amp; Payment Networks Supported
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-bold text-slate-700">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Steadfast Courier API
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Pathao Courier
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> RedX Delivery
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Paperfly Logistics
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> SSLCommerz / bKash
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> Stripe Global Billing
            </span>
          </div>
        </div>
      </section>

      {/* ── 3D BENTO FEATURES GRID ───────────────────────────────── */}
      <section id="features" className="py-20 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 border border-orange-200 px-3 py-1 rounded-full">
              Engineered For High Volume
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              A Modern Warehouse Operating System
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Everything your warehouse team needs to receive, pack, scan, and dispatch consignments with zero manual spreadsheet chaos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bento Card 1: Camera Scanner */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm hover:border-orange-500/50 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">In-Browser Camera Scanner</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan Code128, EAN, and 2D QR codes instantly using smartphone cameras. Save $350+ per workstation by eliminating dedicated laser scanner guns.
              </p>
              <div className="pt-2 text-xs font-mono font-semibold text-orange-700 flex items-center gap-1">
                <span>&lt;280ms decode latency</span>
                <span>→</span>
              </div>
            </div>

            {/* Bento Card 2: 1-Click Courier */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm hover:border-teal-500/50 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">1-Click Courier Consignment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dispatch orders through Steadfast, Pathao, or RedX without manual web portal copy-pasting. Generates tracking IDs and 4×6 labels automatically.
              </p>
              <div className="pt-2 text-xs font-mono font-semibold text-teal-700 flex items-center gap-1">
                <span>Direct Steadfast &amp; Pathao APIs</span>
                <span>→</span>
              </div>
            </div>

            {/* Bento Card 3: WhatsApp Alerts */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm hover:border-orange-500/50 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">Automated WhatsApp Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send customers live parcel tracking links and exact COD cash collection balances automatically to eliminate where-is-my-order calls and reduce RTO.
              </p>
              <div className="pt-2 text-xs font-mono font-semibold text-emerald-700 flex items-center gap-1">
                <span>-88% Customer dispute rate</span>
                <span>→</span>
              </div>
            </div>

            {/* Bento Card 4: AI Runway Predictor */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm hover:border-slate-300 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Stock Runway Forecaster</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rolling 14-day sales velocity analysis forecasts exact stockout dates for high-demand items so managers reorder before critical stockouts occur.
              </p>
              <div className="pt-2 text-xs font-mono font-semibold text-indigo-700 flex items-center gap-1">
                <span>Predictive restock alerts</span>
                <span>→</span>
              </div>
            </div>

            {/* Bento Card 5: Bulk Importer */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm hover:border-slate-300 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                05
              </div>
              <h3 className="text-lg font-bold text-slate-900">Bulk CSV &amp; Excel Onboarding</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Migrate thousands of SKUs and variants in seconds. The importer validates data columns, generates serialized barcodes, and seeds warehouse counts.
              </p>
              <div className="pt-2 text-xs font-mono font-semibold text-amber-700 flex items-center gap-1">
                <span>10,000+ SKU ingestion in seconds</span>
                <span>→</span>
              </div>
            </div>

            {/* Bento Card 6: Audit Ledger */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm hover:border-slate-300 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                06
              </div>
              <h3 className="text-lg font-bold text-slate-900">Audit Footprints &amp; Tenant RLS</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every stock check-in, dispatch, and adjustment is recorded with user identity, timestamp, and IP address. Cryptographic PostgreSQL RLS guarantees data privacy.
              </p>
              <div className="pt-2 text-xs font-mono font-semibold text-slate-700 flex items-center gap-1">
                <span>Zero cross-tenant data leakage</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TERMINAL SIMULATOR ───────────────────────── */}
      <section id="simulator" className="py-20 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Interactive Execution
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Test Real-World Fulfillment Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Simulate barcode camera decoding with audible sound, WhatsApp buyer notifications, and carrier API payloads.
            </p>
          </div>

          <div className="card-lift rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden hover:border-orange-500/40 transition">
            {/* Terminal Window Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50 gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="ml-2 font-mono text-xs font-semibold text-slate-600">
                  fulfillment-pipeline.sh · Active Simulator
                </span>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-xl bg-slate-200/80">
                <button
                  type="button"
                  onClick={() => setActiveTab("scanner")}
                  className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "scanner"
                      ? "bg-white text-orange-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Camera Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp")}
                  className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "whatsapp"
                      ? "bg-white text-orange-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  WhatsApp Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courier")}
                  className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === "courier"
                      ? "bg-white text-orange-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Carrier API
                </button>
              </div>
            </div>

            {/* TAB 1: SCANNER */}
            {activeTab === "scanner" && (
              <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50/50">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col items-center justify-center min-h-[280px] text-center space-y-4 shadow-2xs">
                  {/* Camera Viewfinder Mockup */}
                  <div className="relative h-40 w-64 rounded-xl border-2 border-dashed border-orange-400/80 bg-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden shadow-inner">
                    {/* Sweeping Laser Line when scanning */}
                    {simulatedScanState === "scanning" && (
                      <div className="laser-sweep" />
                    )}

                    {/* Corner Reticle Markers */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-orange-400" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-orange-400" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-orange-400" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-orange-400" />

                    {simulatedScanState === "scanning" ? (
                      <div className="flex flex-col items-center gap-2 text-orange-400">
                        <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono font-bold tracking-wider">Decoding Video Stream…</span>
                      </div>
                    ) : simulatedScanState === "found" ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-400">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-mono font-bold">DECODED: 0.28s</span>
                        <span className="text-[10px] font-mono text-emerald-300">Audible Beep Triggered ✓</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-mono font-bold text-slate-300 block">
                          [ Point Camera at Barcode ]
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          WebAssembly Video Stream Ready
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerDemoScan}
                    disabled={simulatedScanState === "scanning"}
                    className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-orange-600/30 cursor-pointer"
                  >
                    <span>{simulatedScanState === "scanning" ? "Decoding Stream…" : "Trigger Simulated Scan & Sound"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    Decoded SKU Record &amp; Actions
                  </span>

                  {simulatedScanState === "found" && scannedSku ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm animate-in fade-in">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono text-xs font-bold border border-orange-200">
                            {scannedSku.sku}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-2">
                            {scannedSku.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">{scannedSku.category} · {scannedSku.warehouse}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 text-[10px] uppercase font-bold">Available Stock</span>
                          <div className="text-xl font-bold text-emerald-600 mt-0.5">
                            {scannedSku.stock} units
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 text-[10px] uppercase font-bold">Unit Retail</span>
                          <div className="text-xl font-bold text-slate-900 mt-0.5">
                            {currency === "BDT" ? `৳${scannedSku.priceBdt.toLocaleString()}` : `$${scannedSku.priceUsd}`}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("whatsapp")}
                          className="btn-tactile flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center transition"
                        >
                          Dispatch via Steadfast →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 bg-white">
                      Click <strong className="text-slate-800">&quot;Trigger Simulated Scan &amp; Sound&quot;</strong> to test mobile camera decoding speed and synthesizer audio feedback.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: WHATSAPP */}
            {activeTab === "whatsapp" && (
              <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center justify-center gap-8 bg-slate-50/50">
                <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-slate-900">Merchant Store Bot (Verified)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">10:48 AM</span>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200/60 space-y-2 text-slate-800">
                    <p className="font-bold text-emerald-950">🎉 Order #ORD-9421 Dispatched</p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Assalamu Alaikum! Your parcel has been packed and handed over to Steadfast Courier.
                    </p>
                    <div className="pt-1 font-mono text-[11px] text-emerald-700 font-bold bg-white p-2 rounded-lg border border-emerald-200">
                      Tracking: steadfast.com.bd/t/SF-94821-BD<br />
                      COD Payable: {currency === "BDT" ? "৳2,500" : "$20.50"}
                    </div>
                  </div>
                </div>

                <div className="max-w-md space-y-3 text-xs text-slate-600">
                  <h4 className="text-lg font-bold text-slate-900">
                    Zero-Friction Buyer Communications
                  </h4>
                  <p className="leading-relaxed">
                    Automatic WhatsApp notifications keep buyers informed the exact second their parcels leave your warehouse, dramatically reducing failed deliveries and return-to-origin (RTO) expenses.
                  </p>
                  <div className="pt-2 font-mono text-xs text-emerald-700 font-semibold">
                    ✓ Proven to cut customer support tickets by up to 88%
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COURIER API */}
            {activeTab === "courier" && (
              <div className="p-6 font-mono text-xs text-slate-800 overflow-x-auto bg-slate-900 text-slate-100">
                <div className="text-slate-400 mb-2 font-semibold">// Direct server-to-server POST to Steadfast API (/api/courier/steadfast)</div>
                <pre className="leading-relaxed text-emerald-400">
{`{
  "invoice": "ORD-9421",
  "recipient_name": "Tariqul Islam",
  "recipient_phone": "01712345678",
  "recipient_address": "House 12, Road 4, Dhanmondi, Dhaka",
  "cod_amount": ${currency === "BDT" ? 2500 : 20.50},
  "consignment_id": "94821-BD",
  "tracking_url": "https://steadfast.com.bd/tracking/SF-94821-BD",
  "carrier_status": "DISPATCHED",
  "latency_ms": 240
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── DYNAMIC ROI SAVINGS CALCULATOR ───────────────────────── */}
      <section id="roi" className="py-20 bg-[#f8fafc]">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <div className="card-lift rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 space-y-8 shadow-sm">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                Interactive Financial Model
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Calculate Monthly Warehouse Savings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Adjust the volume slider to see how much labor time, cash, and hardware expenses your business saves.
              </p>
            </div>

            {/* Range Slider */}
            <div className="space-y-4 max-w-xl mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Monthly Orders Shipped</span>
                <span className="font-mono font-extrabold text-orange-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {monthlyOrders.toLocaleString()} orders / month
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                className="w-full accent-orange-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono font-medium">
                <span>100 orders</span>
                <span>5,000 orders</span>
                <span>10,000+ orders</span>
              </div>
            </div>

            {/* Result KPI Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-600 uppercase font-mono">Labor Time Reclaimed</div>
                <div className="text-3xl font-black text-emerald-600 font-mono mt-1">
                  ~{hoursSaved} hrs/mo
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Automated consignment entry</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-600 uppercase font-mono">Hardware Gun Saved</div>
                <div className="text-3xl font-black text-orange-600 font-mono mt-1">
                  {hardwareSavedVal}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">In-browser mobile scanning</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-600 uppercase font-mono">Est. Value Created</div>
                <div className="text-3xl font-black text-slate-900 font-mono mt-1">
                  {moneySavedVal}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Reduced RTO &amp; staff hours</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING MATRIX ───────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Fair &amp; Transparent
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Predictable Plans That Grow With You
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Start completely free. Upgrade only when your order volume and warehouse throughput expand.
            </p>

            {/* Currency Selector */}
            <div className="pt-2 inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  currency === "BDT"
                    ? "bg-white text-orange-600 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ৳ BDT Pricing
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  currency === "USD"
                    ? "bg-white text-orange-600 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                $ USD Global
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Free Starter */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-slate-300 transition shadow-2xs">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">Free Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {currency === "BDT" ? "৳0" : "$0"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ forever free</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ideal for emerging shops setting up initial barcode tracking and courier connections.
                </p>

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Up to {pricingData.freeLimit} orders per month
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> In-browser smartphone barcode scanner
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Direct Steadfast Courier API sync
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> PostgreSQL RLS multi-tenant security
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="btn-tactile block w-full text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3 text-xs font-bold text-slate-800 transition shadow-2xs"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Scale (Featured) */}
            <div className="card-lift rounded-2xl border-2 border-orange-500 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 relative shadow-xl shadow-orange-500/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-700 uppercase tracking-wider font-mono">Pro Business</span>
                  <span className="text-[10px] font-mono font-bold uppercase bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {displayPrice}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Uncapped fulfillment throughput with automated multi-courier and WhatsApp buyer notifications.
                </p>

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> <strong>Unlimited</strong> monthly orders &amp; dispatches
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Automated WhatsApp tracking alerts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> All 5 carrier integrations (Steadfast, Pathao, RedX, Paperfly, Carrybee)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Bulk CSV imports (10,000+ items)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Complete audit trail &amp; operator logs
                  </div>
                </div>
              </div>

              <Link
                href={user ? "/dashboard/billing" : "/login"}
                className="btn-tactile block w-full text-center rounded-xl bg-orange-600 hover:bg-orange-500 py-3 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-orange-600/30"
              >
                {user ? "Upgrade in Dashboard →" : "Start 100-Order Free Trial →"}
              </Link>
            </div>

            {/* Custom SLA */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-slate-300 transition shadow-2xs">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">Enterprise SLA</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    Custom
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dedicated database clusters, bespoke ERP connectors, custom webhooks, and priority engineering support.
                </p>

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 100,000+ monthly consignments
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Custom webhook configurations
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Dedicated database instance
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> 99.9% Uptime SLA commitment
                  </div>
                </div>
              </div>

              <a
                href="mailto:support@smartinventory.io?subject=Enterprise%20Inquiry"
                className="btn-tactile block w-full text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3 text-xs font-bold text-slate-800 transition shadow-2xs"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGH-RANKING SEO & AEO FAQ ACCORDION ───────────────────── */}
      <section id="faq" className="py-20 bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Clear Answers
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="card-lift rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-xs sm:text-sm font-bold text-slate-900 hover:text-orange-600 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 font-mono text-lg ml-4 shrink-0 font-bold">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION ─────────────────────────────────── */}
      <section className="py-20 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 text-center space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Automate your warehouse fulfillment today.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Join hundreds of local merchants operating on in-browser camera scanning and 1-click courier dispatches.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-7 py-3.5 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-orange-600/30 group"
            >
              <span>{user ? "Open Dashboard" : "Start 100-Order Free Trial"}</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">{APP_NAME}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-600 font-medium">
            <Link href="/" className="hover:text-orange-600 transition">Home</Link>
            <Link href="/blog" className="hover:text-orange-600 transition">Guides &amp; Blog</Link>
            <Link href="/demo" className="hover:text-orange-600 transition">Sandbox</Link>
            <a href="#features" className="hover:text-orange-600 transition">Features</a>
            <a href="#pricing" className="hover:text-orange-600 transition">Pricing</a>
            <a href="#faq" className="hover:text-orange-600 transition">FAQ</a>
            {user && (
              <Link href="/dashboard/products" className="hover:text-orange-600 transition">
                Dashboard
              </Link>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            © {currentYear} {APP_NAME}. 256-Bit SSL Encrypted.
          </div>
        </div>
      </footer>
    </div>
  );
}
