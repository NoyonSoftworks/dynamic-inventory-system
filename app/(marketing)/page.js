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

  // ── Hero Interactive Command Center State ─────────────────────
  const [heroTab, setHeroTab] = useState("dispatch"); // "dispatch" | "telemetry" | "scanner"
  const [heroDispatchedOrders, setHeroDispatchedOrders] = useState({});
  const [heroLabelModalOrder, setHeroLabelModalOrder] = useState(null);
  const [heroScannerStock, setHeroScannerStock] = useState(64);
  const [heroScanningActive, setHeroScanningActive] = useState(false);
  const [heroScanSuccess, setHeroScanSuccess] = useState(false);
  const [heroSimulatedRtoSavings, setHeroSimulatedRtoSavings] = useState(false);

  function handleHeroScan() {
    if (heroScanningActive) return;
    setHeroScanningActive(true);
    setHeroScanSuccess(false);
    setTimeout(() => {
      playAudioBeep();
      setHeroScanningActive(false);
      setHeroScanSuccess(true);
      setHeroScannerStock((prev) => Math.max(1, prev - 1));
      setTimeout(() => setHeroScanSuccess(false), 2400);
    }, 450);
  }

  function handleHeroDispatch(orderKey) {
    setHeroDispatchedOrders((prev) => ({
      ...prev,
      [orderKey]: "booking",
    }));
    setTimeout(() => {
      playAudioBeep();
      setHeroDispatchedOrders((prev) => ({
        ...prev,
        [orderKey]: "booked",
      }));
    }, 400);
  }

  // ── Contact & Consultation Form State ─────────────────────────
  const [contactName, setContactName] = useState("");
  const [contactBiz, setContactBiz] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactVolume, setContactVolume] = useState("500 - 2,000 orders/mo");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);

  function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    setContactSubmitting(true);
    setTimeout(() => {
      playAudioBeep();
      setContactSubmitting(false);
      setContactSubmitted(true);
      setContactName("");
      setContactBiz("");
      setContactPhone("");
      setContactMessage("");
      setTimeout(() => setContactSubmitted(false), 8000);
    }, 500);
  }

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
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-orange-600 transition">How It Works</a>
            <a href="#features" className="hover:text-orange-600 transition">Features</a>
            <a href="#simulator" className="hover:text-orange-600 transition">Terminal</a>
            <a href="#pricing" className="hover:text-orange-600 transition">Pricing</a>
            <Link href="/blog" className="hover:text-orange-600 transition">Blog</Link>
            <a href="#contact" className="hover:text-orange-600 transition">Contact</a>
            <Link
              href="/demo"
              className="text-orange-600 hover:text-orange-700 font-bold transition flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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

      {/* ── ENTERPRISE HERO SHOWCASE WITH LIVE WORKBENCH ────────── */}
      <section className="relative z-10 pt-12 pb-16 sm:pt-16 sm:pb-24 bg-gradient-to-b from-white via-slate-50 to-[#f8fafc] border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 space-y-10 sm:space-y-12">
          {/* Top Column: Value Proposition & High-Trust Micro Signals */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Live Trust Micro-Signals Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/90 bg-orange-50/90 px-4 py-1.5 text-xs font-semibold text-orange-900 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] sm:text-xs tracking-tight">
                Sub-second Courier Webhooks · Zebra 4×6 Thermal Ready · Multi-Tenant RLS Secured
              </span>
            </div>

            {/* Commercial B2B Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Stop Courier Return Losses.<br />
              <span className="text-orange-600">
                Automate Dispatches &amp; Keep More Profit.
              </span>
            </h1>

            {/* High-Converting Subheading */}
            <p className="mx-auto max-w-2xl text-xs sm:text-base text-slate-600 leading-relaxed font-normal">
              The high-velocity warehouse operating system engineered for high-volume Bangladesh &amp; omnichannel merchants. Turn phone cameras into sub-second barcode scanners, auto-sync consignments with <strong>Steadfast &amp; Pathao</strong>, and eliminate fake COD delivery disputes with real-time RTO shielding.
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
                className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs transition"
              >
                <span>Test Live Interactive Sandbox →</span>
              </Link>
            </div>

            {/* Key Assurance Micro-Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No laser scanner gun hardware needed
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                1-Click WhatsApp Delivery Alerts
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                PostgreSQL RLS Multi-Tenant Privacy
              </span>
            </div>
          </div>

          {/* ── INTERACTIVE LIVE COMMAND CENTER WORKBENCH ────────── */}
          <div className="relative rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Workbench OS Window Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />
                <span className="font-mono text-xs text-slate-300 font-bold hidden sm:inline">
                  SmartInventory · Warehouse Dispatch Console
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2 py-0.5 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  System Online
                </span>
              </div>

              {/* 3 Interactive Tab Switches */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 font-sans">
                <button
                  type="button"
                  onClick={() => setHeroTab("dispatch")}
                  className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    heroTab === "dispatch"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  Live Dispatch &amp; RTO Shield
                </button>
                <button
                  type="button"
                  onClick={() => setHeroTab("telemetry")}
                  className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    heroTab === "telemetry"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  Net-Profit &amp; Runway
                </button>
                <button
                  type="button"
                  onClick={() => setHeroTab("scanner")}
                  className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    heroTab === "scanner"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  Phone Camera Scanner
                </button>
              </div>
            </div>

            {/* ── TAB 1: LIVE DISPATCH & RTO SHIELD ───────────────── */}
            {heroTab === "dispatch" && (
              <div className="p-4 sm:p-6 space-y-4 bg-white animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 font-mono flex items-center gap-2">
                      <span>Outbound Consignments Pending Courier Handoff</span>
                      <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 text-[10px]">
                        3 Consignments
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Real-time phone heuristic verification, Steadfast/Pathao 1-click booking, and Zebra 4×6 thermal preview.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Prevented RTO Loss: ৳14,400+
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Order Row 1: Verified Safe Order */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">#ORD-9421</span>
                        <span className="font-bold text-xs text-slate-800">Tariqul Islam</span>
                        <span className="text-[11px] font-mono text-slate-500">01712-345678</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                          ✓ Verified Buyer (98% Delivery)
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>House 14, Road 8, Dhanmondi, Dhaka</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-700">Vintage Heavyweight Tee (XL) × 2</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono font-bold text-slate-900">COD: ৳2,500</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setHeroLabelModalOrder({
                            customer: "Tariqul Islam",
                            phone: "01712-345678",
                            address: "House 14, Road 8, Dhanmondi, Dhaka",
                            cod: 2500,
                            consignment: "SF-94821-BD",
                            courier: "Steadfast Courier",
                            sku: "SKU-CTG-8821-BLK",
                            product: "Vintage Heavyweight Tee (Black / XL)",
                          })
                        }
                        className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-mono font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                      >
                        4×6 Label Preview
                      </button>

                      {heroDispatchedOrders["ord-1"] === "booked" ? (
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          SF-94821-BD Dispatched
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleHeroDispatch("ord-1")}
                          disabled={heroDispatchedOrders["ord-1"] === "booking"}
                          className="btn-tactile px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          {heroDispatchedOrders["ord-1"] === "booking"
                            ? "Booking Steadfast API…"
                            : "Book Steadfast API (1-Click)"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Row 2: Standard Order */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">#ORD-9422</span>
                        <span className="font-bold text-xs text-slate-800">Tamim Ahmed</span>
                        <span className="text-[11px] font-mono text-slate-500">01819-876543</span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-mono text-[10px] font-bold border border-teal-200">
                          New Customer (Standard Check)
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>GEC Circle, Nasirabad, Chattogram</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-700">Oxford Formal Shirt (L) × 1</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono font-bold text-slate-900">COD: ৳1,850</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setHeroLabelModalOrder({
                            customer: "Tamim Ahmed",
                            phone: "01819-876543",
                            address: "GEC Circle, Nasirabad, Chattogram",
                            cod: 1850,
                            consignment: "PT-88419-CTG",
                            courier: "Pathao Express",
                            sku: "SKU-OXF-WHT-L",
                            product: "Oxford Formal Shirt (White / L)",
                          })
                        }
                        className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-mono font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                      >
                        4×6 Label Preview
                      </button>

                      {heroDispatchedOrders["ord-2"] === "booked" ? (
                        <span className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 font-mono text-xs font-bold border border-teal-200 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-teal-500" />
                          PT-88419-CTG Booked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleHeroDispatch("ord-2")}
                          disabled={heroDispatchedOrders["ord-2"] === "booking"}
                          className="btn-tactile px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-mono text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          {heroDispatchedOrders["ord-2"] === "booking"
                            ? "Connecting Pathao…"
                            : "Book Pathao Express"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Row 3: High RTO Risk (Shielded) */}
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rose-900">#ORD-9423</span>
                        <span className="font-bold text-xs text-rose-900">Unverified Recipient</span>
                        <span className="text-[11px] font-mono text-rose-600">01700-000000</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono text-[10px] font-bold border border-rose-300">
                          ⚠ High RTO Risk (78% Refusal)
                        </span>
                      </div>
                      <div className="text-xs text-rose-800 flex flex-wrap items-center gap-3">
                        <span>Vague Bazar Mor, Kurigram Sadar</span>
                        <span className="text-rose-300">•</span>
                        <span>High consignment COD: ৳6,200</span>
                        <span className="text-rose-300">•</span>
                        <span className="font-mono font-semibold">Dummy repeating digits detected</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-700 bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                        Shield: Collect ৳150 Delivery Fee Advance
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inline 4x6 Thermal Label Popover Modal */}
                {heroLabelModalOrder && (
                  <div className="p-5 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-600" />
                        <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                          4×6 Thermal Courier Label Simulation ({heroLabelModalOrder.courier})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeroLabelModalOrder(null)}
                        className="text-xs font-mono font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                      >
                        Close Preview ✕
                      </button>
                    </div>

                    <div className="max-w-md mx-auto p-4 rounded-xl border-2 border-slate-900 bg-white font-mono text-xs space-y-3 shadow-md">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-black text-sm">{APP_NAME} LOGISTICS</span>
                        <span className="font-bold">{heroLabelModalOrder.courier}</span>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Deliver To:</div>
                        <div className="font-bold text-sm text-slate-900">{heroLabelModalOrder.customer}</div>
                        <div>{heroLabelModalOrder.phone}</div>
                        <div className="text-[11px] text-slate-600">{heroLabelModalOrder.address}</div>
                      </div>
                      <div className="p-2 bg-slate-100 rounded flex justify-between items-center">
                        <span className="font-bold">CASH ON DELIVERY (COD):</span>
                        <span className="font-black text-base text-slate-900">৳{heroLabelModalOrder.cod.toLocaleString()}</span>
                      </div>
                      <div className="text-center pt-1 border-t">
                        <div className="flex items-center justify-center gap-[2px] h-9">
                          {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1].map((w, i) => (
                            <span key={i} className="bg-slate-900 h-full inline-block" style={{ width: `${w * 1.5}px` }} />
                          ))}
                        </div>
                        <span className="text-[10px] tracking-widest font-bold">*{heroLabelModalOrder.consignment}*</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: TRUE NET-PROFIT & RUNWAY TELEMETRY ────────── */}
            {heroTab === "telemetry" && (
              <div className="p-4 sm:p-6 space-y-6 bg-white animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      Unit Economics &amp; Trapped Working Capital Analytics
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Real net margins factoring wholesale COGS, 1% COD fees, and return logistics reserves.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHeroSimulatedRtoSavings(!heroSimulatedRtoSavings)}
                    className="btn-tactile px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-mono font-bold transition cursor-pointer"
                  >
                    {heroSimulatedRtoSavings
                      ? "✓ RTO Shield Simulated (+৳31,200 Cash)"
                      : "+ Simulate 15% RTO Reduction Shield"}
                  </button>
                </div>

                {/* 4 Financial Strips */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Gross Sales (GMV)</span>
                    <div className="text-lg font-black text-slate-900 mt-1">৳1,485,200</div>
                    <span className="text-[10px] text-slate-400">1,240 dispatches</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Wholesale COGS (60%)</span>
                    <div className="text-lg font-black text-slate-700 mt-1">-৳891,120</div>
                    <span className="text-[10px] text-slate-400">Direct inventory cost</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Courier &amp; COD Fee</span>
                    <div className="text-lg font-black text-amber-700 mt-1">-৳44,550</div>
                    <span className="text-[10px] text-slate-400">1% carrier commission</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 font-mono">
                    <span className="text-[10px] uppercase font-bold text-emerald-800">True Net Profit</span>
                    <div className="text-lg font-black text-emerald-700 mt-1">
                      {heroSimulatedRtoSavings ? "৳580,730" : "৳549,530"}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {heroSimulatedRtoSavings ? "39.1% True Margin" : "37.0% True Margin"}
                    </span>
                  </div>
                </div>

                {/* Trapped Capital Radar Card */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-mono text-[10px] font-bold">
                        Trapped Capital Radar
                      </span>
                      <span className="text-xs font-bold text-teal-950">৳38,400 Locked in 2 Stagnant SKUs</span>
                    </div>
                    <p className="text-xs text-teal-800 leading-relaxed">
                      Pair slow-moving <strong>Heavyweight Polo (64 idle units)</strong> with hero <strong>Oxford Shirt</strong> at 15% bundle discount to unlock <strong>৳38,400</strong> before inventory month-end.
                    </p>
                  </div>
                  <Link
                    href={user ? "/dashboard/reports" : "/login"}
                    className="btn-tactile shrink-0 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-mono text-xs font-bold shadow-xs transition"
                  >
                    Launch Bundle Action →
                  </Link>
                </div>
              </div>
            )}

            {/* ── TAB 3: SMARTPHONE CAMERA SCANNER PREVIEW ────────── */}
            {heroTab === "scanner" && (
              <div className="p-4 sm:p-6 space-y-5 bg-white animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      In-Browser Camera WebAssembly Barcode Scanner
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Decodes standard 1D Code128, EAN-13, and QR codes at &lt;180ms latency without buying laser hardware guns.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-600">60 FPS WebAssembly Stream</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  {/* Camera Viewfinder Mockup */}
                  <div className="md:col-span-6 relative rounded-2xl bg-slate-950 p-6 overflow-hidden text-center text-white space-y-4 shadow-inner">
                    {/* Targeting Line */}
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[1.5px] bg-orange-500 z-10 opacity-75" />

                    <div className="relative z-20 space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-800">
                        Camera Viewport: Active
                      </span>
                      {/* Barcode Graphic */}
                      <div className="p-3 bg-white rounded-lg inline-block mx-auto">
                        <div className="flex items-center gap-[2px] h-10">
                          {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1].map((w, i) => (
                            <span key={i} className="bg-slate-900 h-full inline-block" style={{ width: `${w * 1.5}px` }} />
                          ))}
                        </div>
                        <span className="text-slate-900 font-mono text-[10px] font-bold tracking-widest block mt-1">
                          *SKU-CTG-8821-BLK*
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Point smartphone lens at any parcel or warehouse bin label
                      </p>
                    </div>
                  </div>

                  {/* Scanner Telemetry & Trigger Action */}
                  <div className="md:col-span-6 space-y-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 uppercase text-[10px] font-bold">Target SKU:</span>
                        <span className="font-bold text-slate-900">SKU-CTG-8821-BLK</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 uppercase text-[10px] font-bold">Warehouse Bin:</span>
                        <span className="font-bold text-slate-700">Bay 4 · Shelf 02</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 uppercase text-[10px] font-bold">Real-Time Available Stock:</span>
                        <span className="font-black text-sm text-emerald-700">
                          {heroScannerStock} Units
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleHeroScan}
                        disabled={heroScanningActive}
                        className="btn-tactile w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span>
                          {heroScanningActive ? "Scanning Barcode Stream…" : "Trigger Smartphone Camera Scan"}
                        </span>
                      </button>

                      {heroScanSuccess && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-bold flex items-center gap-2 animate-in fade-in">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>Decoded in 140ms ✓ Stock depleted: {heroScannerStock} units · Audit record logged.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ANIMATED LOGO TICKER / INFINITE CARRIER MARQUEE ─────── */}
      <section className="py-7 border-y border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 text-center mb-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Automated API Integrations · Logistics &amp; Payment Networks
          </span>
        </div>

        {/* Marquee Container with Left and Right Gradient Fades */}
        <div className="relative w-full overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

          <div className="animate-marquee-infinite flex items-center gap-4 sm:gap-6 py-1 select-none">
            {[1, 2].map((loopIdx) => (
              <div key={loopIdx} className="flex items-center gap-4 sm:gap-6 shrink-0">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-emerald-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">Steadfast Courier API</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    Auto-Webhook
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-rose-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">Pathao Express</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                    Consignment API
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-amber-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">RedX Delivery</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    City SLA
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-blue-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">Paperfly Logistics</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                    Doorstep COD
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-purple-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">SSLCommerz / bKash / Nagad</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                    Instant Gateway
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-indigo-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">Stripe Global Checkout</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                    Cards &amp; USD
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-orange-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">Zebra &amp; Xprinter 4×6</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">
                    Thermal ESC/POS
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-teal-300 transition shadow-2xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 font-sans">WhatsApp Automated Alerts</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                    Cloud API
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS / 3-STEP QUICK-START BLUEPRINT ────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Quick-Start Blueprint
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Sign-Up to Dispatch in Under 5 Minutes
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              No bulky laser scanner guns, no complicated ERP setups, and no server maintenance. Three effortless steps to automate your warehouse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-slate-50/50 p-7 sm:p-8 space-y-4 hover:border-orange-500/50 transition relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-black text-orange-600">01</span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                  Step 1
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Add Your Catalog</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bulk import thousands of SKUs and variants via Excel / CSV, or paste supplier challan memos into our intelligent text parser. Auto-generates Code128 barcodes instantly.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">CSV Bulk Upload</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Challan Parser</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Code128 Gen</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-slate-50/50 p-7 sm:p-8 space-y-4 hover:border-teal-500/50 transition relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-black text-teal-600">02</span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800 font-mono text-[10px] font-bold">
                  Step 2
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Connect Couriers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste your Steadfast, Pathao, or RedX API credentials in Settings. Sub-second webhooks automatically sync consignment status, tracking URLs, and cash collection.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Steadfast API</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Pathao Webhooks</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">1-Click Auth</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-slate-50/50 p-7 sm:p-8 space-y-4 hover:border-emerald-500/50 transition relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-black text-emerald-600">03</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                  Step 3
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Automate &amp; Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan outgoing parcels with any phone camera, verify customer trust with our COD RTO Shield, and print 4×6 Zebra thermal shipping stickers in 1 tap.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Camera Scan</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">RTO Fraud Shield</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">4×6 Thermal Label</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE OPERATING CAPABILITIES ───────────────────── */}
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
              <h3 className="text-lg font-bold text-slate-900">Automated Stock Runway Forecast</h3>
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

      {/* ── WHY SMARTINVENTORY OVER STANDARD CMS (THE UNFAIR MOAT) ── */}
      <section className="py-20 border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Why We Are Different
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Why 2,400+ High-Volume Merchants Chose Us Over Standard CMS &amp; Spreadsheets
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Generic eCommerce plugins only count basic in/out quantities. SmartInventory is a modern warehouse management system engineered to eliminate courier return losses, prevent stockouts, and maximize merchant margins.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="card-lift rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 font-mono text-[11px] uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-4 font-bold">Operational Capability</th>
                    <th className="px-5 py-4 font-bold text-slate-400">Standard CMS / WooCommerce / Excel</th>
                    <th className="px-5 py-4 font-bold text-orange-700 bg-orange-50/50">SmartInventory Fulfillment Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Pre-Dispatch Return &amp; Fraud Guard (RTO)
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      ❌ None. 18%–30% COD parcels get returned, costing ৳160+ each.
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      ✅ Smart risk detection scores address &amp; phone validity before booking to prevent 70%+ return losses.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Automated Restock &amp; Purchase Orders (PO)
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      ❌ Manual spreadsheet calculations and guesswork.
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      ✅ Auto-computes Lead Time ROP and formats 1-click WhatsApp/PDF supplier POs.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Supplier Challan &amp; Invoice Intake
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      ❌ Typing dozens of SKUs and buying costs manually.
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      ✅ Intelligent OCR text parser extracts SKUs, costs, and margins with 1-click ingest.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Deadstock Capital Liquidation
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      ❌ Stagnant stock sits idle in warehouse unnoticed.
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      ✅ Intelligent bundling pairs slow-moving inventory with hero SKUs in discounted bundles to release cash.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Native Bangladesh Logistics APIs
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      ❌ Broken third-party plugins with manual tracking updates.
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      ✅ Direct native Steadfast, Pathao &amp; RedX webhooks with automated WhatsApp updates.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      True Unit Economics &amp; COD Real Net Profit
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      ❌ Only shows gross revenue, hiding courier return and packaging losses.
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      ✅ Real-time break-even calculations factoring courier charges, COD fee, and return risk.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING MATRIX (3 ACCESSIBLE TIERS) ──────────────────── */}
      <section id="pricing" className="py-24 sm:py-32 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              Fair, Transparent &amp; Accessible
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Predictable Plans Built for Bangladesh E-Commerce
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              From emerging F-commerce shops to high-volume multi-warehouse brands. Zero hidden fees.
            </p>

            {/* Currency Selector */}
            <div className="pt-2 inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`btn-tactile px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                className={`btn-tactile px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currency === "USD"
                    ? "bg-white text-orange-600 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                $ USD Global
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1: Starter / Small Business */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-slate-50/40 p-7 sm:p-8 flex flex-col justify-between space-y-8 hover:border-slate-300 transition shadow-2xs">
              <div className="space-y-5">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                    Starter / F-Commerce
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-slate-900 font-mono">
                      {currency === "BDT" ? "৳990" : "$9"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium font-sans">/ month</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    Perfect for rising Facebook &amp; Instagram shops setting up real inventory controls.
                  </p>
                </div>

                <div className="pt-5 border-t border-slate-200/80 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Up to <strong>100 orders</strong> / month</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>100 RTO Risk Checks</strong> / mo</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>In-browser mobile barcode scanner</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Manual order entry &amp; CSV export</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Single-user operator access</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>PostgreSQL RLS tenant security</span>
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="btn-tactile block w-full text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-3 text-xs font-bold text-slate-800 transition shadow-2xs"
              >
                Start 100-Order Free Trial
              </Link>
            </div>

            {/* Tier 2: Professional / Growth (MOST POPULAR) */}
            <div className="card-lift rounded-2xl border-2 border-orange-500 bg-white p-7 sm:p-8 flex flex-col justify-between space-y-8 relative shadow-xl shadow-orange-500/15">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-700 uppercase tracking-wider font-mono">
                    Professional / Growth
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200 shadow-2xs">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {currency === "BDT" ? "৳1,990" : "$19"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium font-sans">/ month</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Automated fulfillment, courier integrations, and return fraud protection for growing e-commerce brands.
                </p>

                <div className="pt-5 border-t border-slate-100 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>Unlimited</strong> orders &amp; dispatches</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>Smart COD Return Guard</strong> &amp; RTO Predictor</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>4×6 Thermal Label</strong> &amp; Tax Invoice Generator</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Steadfast &amp; Pathao native API webhooks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Automated WhatsApp parcel notifications</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>3 User Seats</strong> (Admin &amp; Operators)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Automated PO Restock generator</span>
                  </div>
                </div>
              </div>

              <Link
                href={user ? "/dashboard/billing" : "/login"}
                className="btn-tactile block w-full text-center rounded-xl bg-orange-600 hover:bg-orange-500 py-3.5 text-xs sm:text-sm font-bold text-white transition shadow-md shadow-orange-600/30"
              >
                {user ? "Upgrade in Dashboard →" : "Start 100-Order Free Trial →"}
              </Link>
            </div>

            {/* Tier 3: Scale / Enterprise */}
            <div className="card-lift rounded-2xl border border-slate-200 bg-slate-50/40 p-7 sm:p-8 flex flex-col justify-between space-y-8 hover:border-slate-300 transition shadow-2xs">
              <div className="space-y-5">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                  Scale / Enterprise
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {currency === "BDT" ? "৳4,990" : "$49"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium font-sans">/ month</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Dedicated infrastructure for high-volume warehouses, multi-branch stores, and retail chains.
                </p>

                <div className="pt-5 border-t border-slate-200/80 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>Everything in Professional</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>Multi-warehouse</strong> stock orchestration</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span><strong>Unlimited User Seats</strong> with granular RLS</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Deadstock Trapped Capital Liquidation engine</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>1-Click WhatsApp B2B Supplier POs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Dedicated onboarding engineer &amp; 24/7 SLA</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-bold text-sm">✓</span>
                    <span>Custom API &amp; ERP webhook connectors</span>
                  </div>
                </div>
              </div>

              <a
                href="#contact"
                className="btn-tactile block w-full text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-3 text-xs font-bold text-slate-800 transition shadow-2xs"
              >
                Schedule Enterprise Consultation
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

      {/* ── TALK WITH US / B2B DIRECT ADVISORY & CONSULTATION ───── */}
      <section id="contact" className="py-24 sm:py-32 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-3.5 py-1 rounded-full">
              Direct Advisory &amp; Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Talk With Us · Get Custom Onboarding &amp; Setup
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Whether you are an established brand dispatching 3,000+ parcels a month on Steadfast or a fast-scaling F-commerce merchant seeking to wipe out courier return losses, speak directly with our engineering team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Founder & Fast Direct Channels */}
            <div className="lg:col-span-5 space-y-6">
              {/* Founder Profile Card */}
              <div className="card-lift rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-7 space-y-5 shadow-2xs">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      NH
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Noyon Hossain
                    </h3>
                    <p className="text-xs font-medium text-orange-600 font-mono">
                      Founder &amp; Lead Systems Architect
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Available for Technical Consultation
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  &ldquo;I personally engineered SmartInventory to solve the painful spreadsheet errors, manual courier copy-pasting, and fake COD orders that bleed merchant margins. Let&apos;s build an automated, zero-loss fulfillment pipeline for your brand.&rdquo;
                </p>

                <div className="pt-2 border-t border-slate-200/80 space-y-3">
                  {/* WhatsApp Direct */}
                  <a
                    href="https://wa.me/8801700000000?text=Hi%20Noyon,%20I%20would%20like%20to%20discuss%20SmartInventory%20for%20my%20business."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-tactile flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-950 transition group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          Direct WhatsApp Chat
                        </span>
                        <span className="block text-[11px] font-mono text-emerald-700">
                          Founder &amp; Tech Lead · Quick Response
                        </span>
                      </div>
                    </div>
                    <span className="text-emerald-600 font-mono text-xs font-bold group-hover:translate-x-1 transition-transform">
                      Chat →
                    </span>
                  </a>

                  {/* Direct Support Email */}
                  <a
                    href="mailto:support@smartinventory.io"
                    className="btn-tactile flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 transition group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-bold text-slate-900 group-hover:text-orange-600 transition">
                          support@smartinventory.io
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          Technical SLA &lt;2 hours guaranteed
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono text-xs group-hover:text-orange-600 group-hover:translate-x-1 transition-transform">
                      Email →
                    </span>
                  </a>
                </div>
              </div>

              {/* Advisory Guarantee Points */}
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>100% Free architecture review &amp; Excel catalog audit</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>Guidance on connecting Steadfast, Pathao &amp; RedX API keys</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>Zero hard sales push — speak directly with the engineering team</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Consultation Request Form */}
            <div className="lg:col-span-7">
              <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Schedule a 15-Minute Architecture Session
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill in your store details below and our lead engineer will reach out via WhatsApp with tailored solutions.
                  </p>
                </div>

                {contactSubmitted ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-3 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
                      ✓
                    </div>
                    <h4 className="text-base font-bold text-emerald-950">
                      Consultation Request Received!
                    </h4>
                    <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                      Thank you for submitting your store requirements. Noyon Hossain or a senior solutions architect will contact you on WhatsApp within 2 hours.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setContactSubmitted(false)}
                        className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900 transition"
                      >
                        Submit another inquiry
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          Your Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Tanvir Ahmed"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          Store / Brand Name
                        </label>
                        <input
                          type="text"
                          value={contactBiz}
                          onChange={(e) => setContactBiz(e.target.value)}
                          placeholder="e.g. Vintage Apparel BD"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          WhatsApp / Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="017XX-XXXXXX"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-700">
                          Monthly Parcel Volume
                        </label>
                        <select
                          value={contactVolume}
                          onChange={(e) => setContactVolume(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition outline-none"
                        >
                          <option value="< 500 parcels/month">&lt; 500 parcels / month</option>
                          <option value="500 - 2,000 orders/mo">500 – 2,000 parcels / month</option>
                          <option value="2,000 - 10,000 parcels/month">2,000 – 10,000 parcels / month</option>
                          <option value="10,000+ parcels/month">10,000+ parcels / month (Enterprise)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-bold text-slate-700">
                        Operational Questions or Special Inquiries
                      </label>
                      <textarea
                        rows={3}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Tell us what you need help with (e.g. Courier return fraud prevention, barcode printing setup, Excel import)..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSubmitting || !contactName.trim() || !contactPhone.trim()}
                      className="btn-tactile w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-600/20 transition cursor-pointer"
                    >
                      <span>
                        {contactSubmitting
                          ? "Submitting Your Request..."
                          : "Submit Consultation Request →"}
                      </span>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono text-center">
                      <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Zero Spam Guarantee · Your business data is 100% confidential.</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION ─────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Automate your warehouse fulfillment today.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
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
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-slate-900 text-sm">{APP_NAME}</span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All Systems Operational
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
              <Link href="/" className="hover:text-orange-600 transition">Home</Link>
              <a href="#how-it-works" className="hover:text-orange-600 transition">How It Works</a>
              <a href="#features" className="hover:text-orange-600 transition">Features</a>
              <a href="#pricing" className="hover:text-orange-600 transition">Pricing</a>
              <Link href="/blog" className="hover:text-orange-600 transition">Guides &amp; Blog</Link>
              <Link href="/demo" className="hover:text-orange-600 transition">Sandbox</Link>
              <a href="#contact" className="hover:text-orange-600 transition">Contact</a>
              <a href="#faq" className="hover:text-orange-600 transition">FAQ</a>
              {user && (
                <Link href="/dashboard/products" className="hover:text-orange-600 transition">
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
            <div>
              © {currentYear} {APP_NAME}. Founded &amp; Built by Noyon Hossain.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>PostgreSQL RLS Secured</span>
              <span>·</span>
              <span>Steadfast &amp; Pathao Native</span>
              <span>·</span>
              <span>Dhaka, Bangladesh</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
