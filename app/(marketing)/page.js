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

  const [currentYear, setCurrentYear] = useState(2026);

  // ── Rotating Capabilities ────────────────────────────────────
  const capabilities = [
    "In-Browser Camera Barcode Scanner (Zero Laser Hardware)",
    "Automated 1-Click Steadfast & Multi-Carrier Dispatch",
    "Real-Time WhatsApp & SMS Parcel Tracking Alerts",
    "Bank-Grade PostgreSQL Multi-Tenant Data Isolation",
  ];
  const [capabilityIndex, setCapabilityIndex] = useState(0);

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
      // Audio autoplay fallback
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

            if (json.settings.currency_mode === "BDT") {
              setCurrency("BDT");
            }
          }
        }
      } catch (err) {
        console.warn("Landing page settings fetch notice:", err);
      } finally {
        if (isMounted) setSessionLoading(false);
      }
    }

    initPage();

    const interval = setInterval(() => {
      setCapabilityIndex((prev) => (prev + 1) % capabilities.length);
    }, 3400);

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
    }, 700);
  };

  // Pricing calculations
  const displayPrice =
    currency === "BDT"
      ? `৳${Math.round(pricingData.proPriceUsd * pricingData.bdtRate).toLocaleString()}`
      : `$${pricingData.proPriceUsd.toFixed(0)}`;

  // ROI calculations
  const hoursSaved = Math.round((monthlyOrders * 2.8) / 60);
  const hardwareSaved = 350;
  const disputeReduction = Math.min(94, Math.round(75 + (monthlyOrders / 1000) * 3));

  const faqs = [
    {
      q: "Do warehouse workers need physical laser barcode scanners?",
      a: "No physical laser hardware is required. The platform includes a high-speed camera scanner that runs directly in any modern mobile browser (iOS and Android), utilizing real-time WebAssembly decoding to read Code128, EAN, and QR codes straight from smartphone cameras.",
    },
    {
      q: "Which courier services are connected for 1-click dispatch?",
      a: "The platform connects natively with Steadfast Courier, Pathao Courier, RedX, Paperfly, and Carrybee. You configure your workspace's private API keys in Settings and generate carrier consignments with a single click.",
    },
    {
      q: "How do customer WhatsApp & SMS notifications work?",
      a: "The instant an order is marked as dispatched, the backend triggers an automated notification to your buyer with their parcel tracking link and COD balance, minimizing where-is-my-order support inquiries.",
    },
    {
      q: "How is our store inventory and order data protected?",
      a: "We enforce PostgreSQL Row-Level Security (RLS) with strict workspace boundaries. Every database query is cryptographically scoped to your tenant ID. No competitor or external store can access your inventory or customer data.",
    },
    {
      q: "Can we import existing inventory from CSV or Excel files?",
      a: "Yes. Our bulk import tool processes spreadsheets with thousands of SKU rows, parses variants and attributes, and establishes initial stock counts in seconds.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* ── Geometric Blueprint Dot Canvas ──────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] z-0"
        style={{
          backgroundImage:
            "radial-gradient(#4f46e5 1px, transparent 1px), radial-gradient(#0f172a 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: "0 0, 14px 14px",
        }}
      />

      {/* ── TOP HEADER (Katana/Stripe Precision Navigation) ─────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          {/* Brand Mark */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25 transition-transform group-hover:scale-105">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-950 flex items-center gap-1.5">
                {APP_SHORT_NAME}
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                  SaaS
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Warehouse &amp; Logistics OS
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs sm:text-sm font-medium text-slate-600">
            <Link
              href="/demo"
              className="text-slate-800 hover:text-indigo-600 transition flex items-center gap-2 font-semibold"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Sandbox</span>
            </Link>
            <a href="#features" className="hover:text-indigo-600 transition">Capabilities</a>
            <a href="#simulator" className="hover:text-indigo-600 transition">Terminal</a>
            <a href="#couriers" className="hover:text-indigo-600 transition">Carriers</a>
            <a href="#roi" className="hover:text-indigo-600 transition">ROI Calculator</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Pricing</a>
            <a href="#faq" className="hover:text-indigo-600 transition">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {!sessionLoading && user ? (
              <div className="flex items-center gap-2.5">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
                  >
                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Super Admin</span>
                  </Link>
                )}
                <Link
                  href="/dashboard/products"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/30"
                >
                  <span>Go to Workspace</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="rounded-lg px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/25 active:scale-[0.98]"
                >
                  <span>Get Started Free</span>
                  <svg className="w-3.5 h-3.5 hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Soft Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-indigo-200/40 via-blue-100/30 to-emerald-100/30 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="mx-auto max-w-5xl px-4 sm:px-8 text-center space-y-6">
          {/* Trust Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 backdrop-blur-xs px-4 py-1.5 text-xs text-indigo-900 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800">
              The Operating System for Modern DTC &amp; B2B Warehouses
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-indigo-700 font-mono text-[11px] font-semibold">v2.5 Architecture</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight text-slate-950 leading-[1.1]">
            Frictionless inventory.<br />
            <span className="text-indigo-600">Automated courier fulfillment.</span>
          </h1>

          {/* Dynamic Capability Line with High Contrast Pill */}
          <div className="flex items-center justify-center gap-2 min-h-[32px]">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-lg bg-slate-100/90 border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 transition-all duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider font-mono">Live Capability:</span>
              <span className="font-semibold text-slate-900">
                {capabilities[capabilityIndex]}
              </span>
            </div>
          </div>

          <p className="mx-auto max-w-2xl text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed font-normal">
            Eliminate error-prone spreadsheets, lost parcels, and expensive \$350+ laser hardware scanners.
            Scan barcodes directly with smartphone cameras, dispatch consignments with Steadfast in one click, and deliver instant WhatsApp tracking links to buyers.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="inline-flex items-center gap-2.5 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition active:scale-[0.99]"
            >
              <span>{user ? "Open Workspace Dashboard" : "Start Free (100 Orders Included)"}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-950 px-6 py-3.5 text-sm font-semibold text-slate-800 transition shadow-xs"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Explore Interactive Sandbox</span>
            </Link>
          </div>

          {/* Operational Trust Metrics Strip */}
          <div className="pt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-left">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-mono tracking-tight">0.3s</div>
              <div className="text-xs font-semibold text-slate-900 mt-1">In-Browser Camera Decode</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Real-time WebAssembly scan</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-left">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">100%</div>
              <div className="text-xs font-semibold text-slate-900 mt-1">PostgreSQL RLS Segregation</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Cryptographic workspace lock</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-left">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono tracking-tight">5+</div>
              <div className="text-xs font-semibold text-slate-900 mt-1">Courier Logistics APIs</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Steadfast, Pathao, RedX &amp; more</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-left">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-mono tracking-tight">$0</div>
              <div className="text-xs font-semibold text-slate-900 mt-1">Dedicated Scanner Cost</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Use any iPhone or Android phone</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TERMINAL SIMULATOR SECTION ───────────────── */}
      <section id="simulator" className="relative z-10 py-20 border-y border-slate-200/80 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full">
              Interactive Execution
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              Test Real-World Fulfillment Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Simulate camera barcode decoding, automated customer WhatsApp notifications, and direct carrier payload dispatch.
            </p>
          </div>

          {/* Simulator Window */}
          <div className="rounded-2xl border border-slate-300 bg-slate-900 shadow-2xl overflow-hidden text-slate-100">
            {/* Window Titlebar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/80 gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-xs text-slate-400 font-semibold flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>fulfillment-pipeline.sh</span>
                </span>
              </div>

              {/* Segmented Tab Controls */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("scanner")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "scanner"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Camera Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "whatsapp"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  WhatsApp Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courier")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "courier"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Carrier API
                </button>
              </div>
            </div>

            {/* TAB 1: CAMERA SCANNER */}
            {activeTab === "scanner" && (
              <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900/90">
                {/* Viewfinder Mockup */}
                <div className="relative rounded-xl border border-slate-700/80 bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[280px] text-center space-y-4">
                  <div className="relative h-36 w-56 rounded-lg border-2 border-dashed border-indigo-400/60 bg-indigo-950/20 flex flex-col items-center justify-center p-4">
                    {/* Viewfinder Corner Accents */}
                    <span className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400" />
                    <span className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400" />
                    <span className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400" />
                    <span className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400" />

                    {simulatedScanState === "scanning" ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-300">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono font-medium">Decoding Video Stream…</span>
                      </div>
                    ) : simulatedScanState === "found" ? (
                      <div className="flex flex-col items-center gap-1.5 text-emerald-400">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-mono font-bold">MATCH: 0.31s</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-slate-400">
                        <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="text-[11px] font-mono text-slate-400">[ Point Camera at Barcode ]</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerDemoScan}
                    disabled={simulatedScanState === "scanning"}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white active:scale-[0.99] transition disabled:opacity-50 shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{simulatedScanState === "scanning" ? "Decoding Code128 Stream…" : "Trigger Simulated Scan & Beep"}</span>
                  </button>
                </div>

                {/* Result Card */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
                      Decoded SKU Metadata Record
                    </span>
                    {simulatedScanState === "found" && (
                      <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        VERIFIED IN CATALOG
                      </span>
                    )}
                  </div>

                  {simulatedScanState === "found" && scannedSku ? (
                    <div className="rounded-xl border border-slate-700 bg-slate-950 p-5 space-y-4 shadow-inner">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-sm bg-slate-800 font-mono text-xs text-indigo-300 font-semibold border border-slate-700">
                          {scannedSku.sku}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1.5">
                          {scannedSku.name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs font-mono">
                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Available Stock</span>
                          <div className="text-xl font-bold text-emerald-400 mt-0.5">
                            {scannedSku.stock} units
                          </div>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Unit Retail</span>
                          <div className="text-xl font-bold text-white mt-0.5">
                            ৳{scannedSku.price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>Ready for 1-Click Steadfast Consignment Dispatch</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400 bg-slate-950/40 space-y-2">
                      <p className="font-medium text-slate-300">
                        Click the button above to simulate in-browser camera decoding.
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Demonstrates real-time audio beep feedback and instantaneous catalog lookup without physical laser hardware.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: WHATSAPP ALERT */}
            {activeTab === "whatsapp" && (
              <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center justify-center gap-8 bg-slate-900/90">
                <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-3 text-xs shadow-xl">
                  {/* WhatsApp Header Mockup */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                        WA
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">Merchant Fulfillment Bot</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Official Verified Business</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">10:42 AM</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 space-y-2 text-slate-200">
                    <p className="font-bold text-white text-xs">Parcel Dispatched: Order #1084</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Hello Tariqul, your parcel has been handed over to <strong>Steadfast Courier</strong>.
                    </p>
                    <div className="pt-2 border-t border-slate-800/80 font-mono text-[11px] text-emerald-400">
                      Tracking Link: steadfast.com.bd/t/SF-889124
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      COD Balance: ৳2,500
                    </div>
                  </div>
                </div>

                <div className="max-w-md space-y-3 text-xs text-slate-300">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                    ZERO-EFFORT SUPPORT SAVINGS
                  </div>
                  <h4 className="text-base font-bold text-white">
                    Eliminate 70% of Buyer Where-Is-My-Order Inquiries
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-xs">
                    Customer anxiety spikes right after checkout. The instant an operator clicks Dispatch in your warehouse, our backend triggers an automated WhatsApp and SMS notification with their Steadfast tracking link and exact COD payable balance.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-[11px] font-mono text-slate-400">
                    <span>✓ GreenAPI Integration</span>
                    <span>✓ BulkSMSBD Integration</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COURIER API */}
            {activeTab === "courier" && (
              <div className="p-6 sm:p-8 font-mono text-xs text-slate-300 overflow-x-auto bg-slate-950">
                <div className="flex items-center justify-between text-slate-400 mb-3 text-[11px] pb-2 border-b border-slate-800">
                  <span>// Server-to-server POST to Steadfast API endpoint</span>
                  <span className="text-emerald-400 font-bold">HTTP 200 OK</span>
                </div>
                <pre className="text-slate-200 leading-relaxed font-mono">
{`{
  "consignor_tenant": "business_9281a8c2-48f1-4db8-a291-7f938c92a714",
  "invoice": "ORD-9421",
  "recipient_name": "Tariqul Islam",
  "recipient_phone": "01712345678",
  "recipient_address": "House 12, Road 4, Dhanmondi, Dhaka",
  "cod_amount": 2500,
  "consignment_id": "9481920",
  "carrier_tracking_url": "https://steadfast.com.bd/tracking/SF-9481920",
  "thermal_label_status": "READY_FOR_PRINT",
  "status": "DISPATCHED"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <section id="features" className="py-24 relative z-10 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full">
              Core Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Engineered for Warehouse Throughput
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              High-concurrency Next.js 16 App Router foundation with strict PostgreSQL RLS data isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 01 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-7 space-y-3.5 shadow-xs hover:shadow-md transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-mono text-xs">
                  01
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">Hardware Free</span>
              </div>
              <h3 className="text-base font-bold text-slate-950">Camera Barcode Scanner</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Sub-second Code128, EAN-13, and QR code decoding straight in mobile browsers. Eliminates the cost of dedicated USB or Bluetooth laser guns.
              </p>
            </div>

            {/* Feature 02 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-7 space-y-3.5 shadow-xs hover:shadow-md transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold font-mono text-xs">
                  02
                </div>
                <span className="text-[10px] font-mono font-semibold text-emerald-600 uppercase">Automated</span>
              </div>
              <h3 className="text-base font-bold text-slate-950">Automated WhatsApp &amp; SMS Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Connect GreenAPI or BulkSMSBD credentials to automatically ping customers with real-time parcel tracking links upon consignment dispatch.
              </p>
            </div>

            {/* Feature 03 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-7 space-y-3.5 shadow-xs hover:shadow-md transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-mono text-xs">
                  03
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">1-Click Dispatch</span>
              </div>
              <h3 className="text-base font-bold text-slate-950">Multi-Carrier Logistics Integration</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Connect Steadfast, Pathao, RedX, Paperfly, and Carrybee accounts. Generate tracking consignments and thermal thermal labels instantly.
              </p>
            </div>

            {/* Feature 04 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-7 space-y-3.5 shadow-xs hover:shadow-md transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-mono text-xs">
                  04
                </div>
                <span className="text-[10px] font-mono font-semibold text-indigo-600 uppercase">Enterprise Grade</span>
              </div>
              <h3 className="text-base font-bold text-slate-950">PostgreSQL Tenant Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Row-Level Security (RLS) cryptographically ensures complete workspace isolation. Your inventory counts and client data remain 100% private.
              </p>
            </div>

            {/* Feature 05 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-7 space-y-3.5 shadow-xs hover:shadow-md transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-mono text-xs">
                  05
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">Security RBAC</span>
              </div>
              <h3 className="text-base font-bold text-slate-950">Role-Based Access Control</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Admin, Operator, and Viewer permission tiers empower warehouse workers to scan and fulfill packages without exposing billing or API keys.
              </p>
            </div>

            {/* Feature 06 */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-7 space-y-3.5 shadow-xs hover:shadow-md transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-mono text-xs">
                  06
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">Compliance</span>
              </div>
              <h3 className="text-base font-bold text-slate-950">Immutable Activity Footprints</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Every product modification, inventory intake, dispatch action, and login is stamped with user identity, timestamp, and IP origin for audits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARRIERS NETWORK STRIP ───────────────────────────────── */}
      <section id="couriers" className="py-14 border-y border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 text-center space-y-5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Supported National Courier Integrations &amp; Label Formats
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-slate-800 text-xs font-semibold shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Steadfast Courier</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">Native API</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold shadow-xs">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Pathao Courier</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>RedX Logistics</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold shadow-xs">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Paperfly</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold shadow-xs">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>Carrybee</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Direct consignment dispatch with automatic 4×6 inch thermal shipping label generation.
          </p>
        </div>
      </section>

      {/* ── ROI CALCULATOR SECTION ───────────────────────────────── */}
      <section id="roi" className="py-24 relative z-10 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 space-y-10 shadow-sm">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full">
                Operational Efficiency
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                Calculate Monthly Warehouse Savings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Adjust the volume slider below to view estimated labor hours saved and hardware costs eliminated.
              </p>
            </div>

            {/* Range Slider Container */}
            <div className="space-y-4 max-w-lg mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Monthly Orders Shipped:</span>
                <span className="font-mono font-extrabold text-indigo-700 text-sm bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200/60">
                  {monthlyOrders.toLocaleString()} orders / mo
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono font-medium">
                <span>100 orders</span>
                <span>5,000 orders</span>
                <span>10,000+ orders</span>
              </div>
            </div>

            {/* Dynamic Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 text-center">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-600">Labor Saved</div>
                <div className="text-3xl font-extrabold text-emerald-600 font-mono mt-1.5">
                  ~{hoursSaved} hrs/mo
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Zero manual consignment typing</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-600">Hardware Cost Saved</div>
                <div className="text-3xl font-extrabold text-indigo-600 font-mono mt-1.5">
                  ${hardwareSaved}+ Saved
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Mobile camera scanner included</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold text-slate-600">Dispute Reduction</div>
                <div className="text-3xl font-extrabold text-slate-950 font-mono mt-1.5">
                  -{disputeReduction}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Instant tracking links to buyers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING MATRIX ───────────────────────────────────────── */}
      <section id="pricing" className="py-24 relative z-10 border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full">
              Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Simple, Predictable Plans
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Start with our free starter tier. Upgrade as your warehouse fulfillment expands.
            </p>

            {/* Currency Switcher */}
            <div className="pt-2 inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  currency === "USD"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  currency === "BDT"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                BDT (৳)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Free Starter Tier */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 flex flex-col justify-between space-y-6 shadow-xs hover:border-slate-300 transition">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-950 font-mono">
                    {currency === "BDT" ? "৳0" : "$0"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ forever</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ideal for boutique shops and initial inventory setup.
                </p>

                <div className="pt-4 border-t border-slate-200 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Up to {pricingData.freeLimit} orders per month
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> In-browser camera barcode scanner
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Steadfast courier API connection
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> PostgreSQL RLS tenant isolation
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="block w-full text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-3 text-xs font-bold text-slate-800 transition shadow-xs"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Scale Tier (Featured) */}
            <div className="rounded-3xl border-2 border-indigo-600 bg-white ring-4 ring-indigo-50 p-8 flex flex-col justify-between space-y-6 relative shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Pro Enterprise</span>
                  <span className="text-[10px] font-mono font-bold uppercase bg-indigo-600 text-white px-3 py-1 rounded-full shadow-xs">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-950 font-mono">
                    {displayPrice}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Uncapped fulfillment capacity with automated courier and messaging workflows.
                </p>

                <div className="pt-4 border-t border-slate-200 space-y-2.5 text-xs text-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> <strong>Unlimited</strong> orders and dispatches
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Automated WhatsApp &amp; SMS tracking
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> All 5 courier integrations
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Bulk CSV imports (10,000+ items)
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Complete audit trail activity logs
                  </div>
                </div>
              </div>

              <Link
                href={user ? "/dashboard/billing" : "/login"}
                className="block w-full text-center rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-indigo-600/30 active:scale-[0.99]"
              >
                {user ? "Manage Subscription in Dashboard →" : "Start Pro Trial →"}
              </Link>
            </div>

            {/* Custom SLA Enterprise */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-8 flex flex-col justify-between space-y-6 shadow-xs hover:border-slate-300 transition">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Custom SLA</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-950 font-mono">
                    Enterprise
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dedicated database clusters, bespoke ERP connectors, and custom courier webhook feeds.
                </p>

                <div className="pt-4 border-t border-slate-200 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> 100,000+ monthly orders
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Custom webhook configurations
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> Dedicated database instance
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span> 99.9% Uptime SLA commitment
                  </div>
                </div>
              </div>

              <a
                href="mailto:support@smartinventory.io?subject=Enterprise%20Inquiry"
                className="block w-full text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-3 text-xs font-bold text-slate-800 transition shadow-xs"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ──────────────────────────────────────────── */}
      <section id="faq" className="py-24 relative z-10 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full">
              Documentation &amp; Help
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-xs sm:text-sm font-bold text-slate-900 hover:text-indigo-600 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-indigo-600 font-mono text-base ml-4 shrink-0">
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

      {/* ── BOTTOM HIGH CONVERSION CTA ───────────────────────────── */}
      <section className="py-20 relative z-10 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Automate your warehouse fulfillment today.
            </h2>
            <p className="text-xs sm:text-base text-indigo-100 max-w-lg mx-auto leading-relaxed">
              Join high-volume merchants operating on automated camera scanning and direct courier integration.
            </p>
            <div className="pt-2">
              <Link
                href={user ? "/dashboard/products" : "/login"}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-xs sm:text-sm font-bold text-indigo-950 hover:bg-slate-100 transition shadow-lg active:scale-[0.99]"
              >
                <span>{user ? "Open Workspace Dashboard" : "Start 100-Order Free Trial"}</span>
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-slate-800">{APP_NAME}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-mono text-[11px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              All Systems Operational
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
            <Link href="/login" className="hover:text-indigo-600 transition">Sign In</Link>
            <Link href="/demo" className="hover:text-indigo-600 transition">Interactive Sandbox</Link>
            <a href="#features" className="hover:text-indigo-600 transition">Capabilities</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Pricing</a>
            <a href="#faq" className="hover:text-indigo-600 transition">FAQ</a>
            {user && (
              <Link href="/dashboard/products" className="hover:text-indigo-600 transition font-semibold text-indigo-600">
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
