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

function CheckIcon({ className = "w-4 h-4 text-emerald-600 shrink-0" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon({ className = "w-4 h-4 text-slate-400 shrink-0" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

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
    whatsappNumber: "8801753082749",
    supportPhone: "01753082749",
    supportEmail: "support@smartinventory.app",
  });

  const [currentYear, setCurrentYear] = useState(2026);

  // ── Interactive Terminal / Simulator State ───────────────────
  const [activeTab, setActiveTab] = useState("scanner"); // "scanner" | "whatsapp" | "courier"
  const [simulatedScanState, setSimulatedScanState] = useState("idle"); // "idle" | "scanning" | "found"
  const [scannedSku, setScannedSku] = useState(null);
  const [selectedCourierSim, setSelectedCourierSim] = useState("Steadfast");

  // ── Interactive ROI Calculator State ─────────────────────────
  const [monthlyOrders, setMonthlyOrders] = useState(1500);

  // ── Merchant AI Copilot Showcase State ───────────────────────
  const [aiName, setAiName] = useState("Shongi");
  const [aiNameBn, setAiNameBn] = useState("সঙ্গী");
  const [aiDemoTab, setAiDemoTab] = useState("tracking"); // "tracking" | "rto" | "reconciliation" | "stock"

  // ── FAQ Accordion State ──────────────────────────────────────
  const [openFaq, setOpenFaq] = useState(0);

  // ── Hero Interactive Workbench State ─────────────────────
  const [heroTab, setHeroTab] = useState("dispatch"); // "dispatch" | "profit" | "scanner"
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
              whatsappNumber: json.settings.support_whatsapp || json.settings.admin_phone || "8801753082749",
              supportPhone: json.settings.support_phone || json.settings.admin_phone || "01753082749",
              supportEmail: json.settings.support_email || "support@smartinventory.app",
            });

            if (json.settings.ai_name) {
              setAiName(json.settings.ai_name);
            }
            if (json.settings.ai_name_bn) {
              setAiNameBn(json.settings.ai_name_bn);
            }

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
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EA580C] text-white font-semibold text-sm shadow-xs transition-transform group-hover:scale-105">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                {APP_SHORT_NAME}
              </span>
              <span className="text-[10px] font-mono font-medium text-[#EA580C] -mt-0.5 hidden sm:block">
                Warehouse &amp; Courier OS
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#ai-copilot" className="hover:text-orange-600 transition flex items-center gap-1.5 font-medium text-slate-700">
              <span className="text-orange-500 text-xs">✨</span>
              <span>{aiName} AI</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                PRO
              </span>
            </a>
            <a href="#simulator" className="hover:text-slate-900 transition">Terminal</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
            <Link href="/blog" className="hover:text-slate-900 transition">Blog</Link>
            <a href="#contact" className="hover:text-slate-900 transition">Contact</a>
            <Link
              href="/demo"
              className="text-orange-700 hover:text-orange-800 font-medium transition flex items-center gap-1.5 bg-orange-50/80 px-2.5 py-1 rounded-md border border-orange-200/70"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Live sandbox</span>
            </Link>
          </nav>

          {/* Right Action & Currency Controls */}
          <div className="flex items-center gap-3">
            {/* Currency Pill Toggle */}
            <div className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`px-2 py-0.5 rounded-sm transition ${
                  currency === "BDT"
                    ? "bg-white text-orange-600 shadow-2xs font-medium"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ৳ BDT
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-2 py-0.5 rounded-sm transition ${
                  currency === "USD"
                    ? "bg-white text-orange-600 shadow-2xs font-medium"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                $ USD
              </button>
            </div>

            {!sessionLoading && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-3.5 py-1.5 text-[13px] font-medium text-white transition shadow-sm"
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
                  className="rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/demo"
                  className="btn-tactile hidden sm:inline-flex items-center gap-1 rounded-md bg-[#0F172A] hover:bg-slate-800 px-3 py-1.5 text-[13px] font-medium text-white transition shadow-2xs"
                >
                  Live Demo
                </Link>
                <Link
                  href="/login"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-3.5 py-1.5 text-[13px] font-medium text-white transition shadow-sm"
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
            {/* Live Trust Micro-Signals Monospace Micro-Typography */}
            <div className="inline-flex items-center gap-2 px-3 py-1 text-slate-500 font-mono text-[11px] sm:text-xs uppercase tracking-[0.12em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Direct Courier Webhooks · 4×6 Thermal Label Ready · Isolated Merchant Accounts</span>
            </div>

            {/* Commercial B2B Headline */}
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-slate-900 leading-tight">
              Stop Courier Return Losses.<br />
              <span className="text-orange-600">
                Automate Dispatches &amp; Keep More Profit.
              </span>
            </h1>

            {/* High-Converting Subheading */}
            <p className="mx-auto max-w-2xl text-xs sm:text-base text-slate-600 leading-relaxed font-normal">
              Warehouse and dispatch management built for high-volume Bangladesh eCommerce merchants. Turn any phone camera into a fast barcode scanner, automatically book consignments with <strong>Steadfast &amp; Pathao</strong>, and verify customer delivery history to stop COD return losses.
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

          {/* ── INTERACTIVE DISPATCH & STOCK WORKBENCH ────────── */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-100/70 p-2 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)]">
            <div className="relative rounded-lg border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              {/* Workbench OS Window Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-slate-300 inline-block border border-slate-400/30" />
                    <span className="h-3 w-3 rounded-full bg-slate-300 inline-block border border-slate-400/30" />
                    <span className="h-3 w-3 rounded-full bg-slate-300 inline-block border border-slate-400/30" />
                  </div>
                  <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px]">
                    <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>app.smartinventory.io/dashboard</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-mono text-[10px] font-medium border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    System Online
                  </span>
                </div>

                {/* 3 Interactive Tab Switches (Real Segmented Control) */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg font-sans">
                  <button
                    type="button"
                    onClick={() => setHeroTab("dispatch")}
                    className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      heroTab === "dispatch"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    Live Dispatch &amp; COD Verification
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab("profit")}
                    className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      heroTab === "profit"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    Net Profit &amp; Runway
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab("scanner")}
                    className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      heroTab === "scanner"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    Phone Camera Scanner
                  </button>
                </div>
              </div>

            {/* ── TAB 1: LIVE DISPATCH & COD VERIFICATION ───────────────── */}
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
                      Customer order history verification, Steadfast/Pathao 1-click booking, and standard 4×6 thermal label preview.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Prevented Return Loss: ৳14,400+
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                          <CheckIcon className="w-3 h-3 text-emerald-600" />
                          <span>Verified Buyer · 98% Delivery</span>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono text-[10px] font-bold border border-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>High Return Risk · 78% Refusal</span>
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
                        Recommendation: Collect ৳150 delivery fee in advance
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
                        className="text-xs font-mono font-medium text-slate-500 hover:text-slate-900 transition cursor-pointer"
                      >
                        Close preview
                      </button>
                    </div>

                    <div className="max-w-md mx-auto p-4 rounded-lg border-2 border-slate-900 bg-white font-mono text-xs space-y-3 shadow-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-sm">{APP_NAME} LOGISTICS</span>
                        <span className="font-medium">{heroLabelModalOrder.courier}</span>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Deliver To:</div>
                        <div className="font-medium text-sm text-slate-900">{heroLabelModalOrder.customer}</div>
                        <div>{heroLabelModalOrder.phone}</div>
                        <div className="text-[11px] text-slate-600">{heroLabelModalOrder.address}</div>
                      </div>
                      <div className="p-2 bg-slate-100 rounded flex justify-between items-center">
                        <span className="font-medium">CASH ON DELIVERY (COD):</span>
                        <span className="font-semibold font-mono text-base text-slate-900">৳{heroLabelModalOrder.cod.toLocaleString()}</span>
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

            {/* ── TAB 2: NET PROFIT & MARGIN BREAKDOWN ────────── */}
            {heroTab === "profit" && (
              <div className="p-4 sm:p-6 space-y-6 bg-white animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      Unit Economics &amp; Working Capital Analytics
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
                      ? "Return Protection Active (+৳31,200 Saved)"
                      : "+ Simulate 15% Return Reduction"}
                  </button>
                </div>

                {/* 4 Financial Strips */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 font-mono">
                    <span className="text-[10px] uppercase font-medium text-slate-500">Gross Sales (GMV)</span>
                    <div className="text-lg font-semibold font-mono text-slate-900 mt-1">৳1,485,200</div>
                    <span className="text-[10px] text-slate-400">1,240 dispatches</span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 font-mono">
                    <span className="text-[10px] uppercase font-medium text-slate-500">Wholesale COGS (60%)</span>
                    <div className="text-lg font-semibold font-mono text-slate-700 mt-1">-৳891,120</div>
                    <span className="text-[10px] text-slate-400">Direct inventory cost</span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 font-mono">
                    <span className="text-[10px] uppercase font-medium text-slate-500">Courier &amp; COD Fee</span>
                    <div className="text-lg font-semibold font-mono text-amber-700 mt-1">-৳44,550</div>
                    <span className="text-[10px] text-slate-400">1% carrier commission</span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 font-mono">
                    <span className="text-[10px] uppercase font-medium text-emerald-800">True Net Profit</span>
                    <div className="text-lg font-semibold font-mono text-emerald-700 mt-1">
                      {heroSimulatedRtoSavings ? "৳580,730" : "৳549,530"}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      {heroSimulatedRtoSavings ? "39.1% True Margin" : "37.0% True Margin"}
                    </span>
                  </div>
                </div>

                {/* Slow-Moving Stock Card */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-mono text-[10px] font-bold">
                        Slow-Moving Stock
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

                  {/* Scanner Actions */}
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
                        <span className="text-slate-500 uppercase text-[10px] font-medium">Real-Time Available Stock:</span>
                        <span className="font-semibold font-mono text-sm text-emerald-700">
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
                          {heroScanningActive ? "Scanning barcode stream…" : "Scan with camera"}
                        </span>
                      </button>

                      {heroScanSuccess && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-bold flex items-center gap-2 animate-in fade-in">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>Decoded in 140ms · Stock updated: {heroScannerStock} units · Audit log saved.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
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
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-md border border-orange-200">
              Quick-Start Guide
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              From Sign-Up to Dispatch in Under 5 Minutes
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              No bulky laser scanner guns, no complicated ERP setups, and no server maintenance. Three effortless steps to automate your warehouse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 sm:p-7 space-y-3 hover:border-slate-300 transition relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-semibold text-orange-600">01</span>
                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono text-[10px] font-medium">
                  Step 1
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">Add Your Catalog</h3>
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
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 sm:p-7 space-y-3 hover:border-slate-300 transition relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-semibold text-teal-600">02</span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-mono text-[10px] font-medium">
                  Step 2
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">Connect Couriers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your Steadfast, Pathao, or RedX API credentials in Settings. Automated webhooks continuously sync consignment status, tracking links, and cash collection.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Steadfast API</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Pathao Webhooks</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">1-Click Auth</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 sm:p-7 space-y-3 hover:border-slate-300 transition relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-semibold text-emerald-600">03</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[10px] font-medium">
                  Step 3
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">Automate &amp; Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan outgoing parcels with any phone camera, verify customer delivery history to prevent return losses, and print standard 4×6 thermal shipping labels in 1 tap.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">Camera Scan</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">COD Return Check</span>
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
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
              Warehouse Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
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

      {/* ── EXCLUSIVE MERCHANT AI COPILOT SHOWCASE (#ai-copilot) ─────── */}
      <section id="ai-copilot" className="py-20 sm:py-28 bg-gradient-to-b from-[#f8fafc] via-white to-[#f8fafc] border-b border-slate-200/80 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          {/* Header Title & Badges */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/90 px-3 py-1 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-700">
                🔒 Registered Merchant Exclusive
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Meet {aiName} ({aiNameBn}) — Your 24/7 E-Commerce Store Copilot ✨
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              শুধুমাত্র আমাদের রেজিস্টার্ড মার্চেন্টদের জন্য সরাসরি কানেক্টেড ইন্টেলিজেন্ট এআই। বাংলা, Banglish বা English—যেকোনো ভাষায় ইনভেন্টরি, পার্সেল ট্র্যাকিং, RTO রিটার্ন প্রতিরোধ ও কুরিয়ার রিকনসিলিয়েশনের তাৎক্ষণিক নির্ভুল সমাধান।
            </p>
          </div>

          {/* Interactive AI Preview Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: 4 Real-World Scenario Pills & Pillars */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Select Real-World Merchant Scenario:
                </span>

                <div className="space-y-2">
                  {/* Scenario 1: Parcel Tracking */}
                  <button
                    type="button"
                    onClick={() => setAiDemoTab("tracking")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      aiDemoTab === "tracking"
                        ? "border-orange-500 bg-orange-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 text-base">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">পার্সেল ট্র্যাকিং ও ১-ক্লিক টিকিট</h4>
                        {aiDemoTab === "tracking" && (
                          <span className="text-[10px] font-bold text-orange-600 font-mono">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        &quot;SF-8841029 পার্সেল আটকে আছে কেন? সাপোর্ট টিকিট ওপেন করো&quot;
                      </p>
                    </div>
                  </button>

                  {/* Scenario 2: RTO & Fraud Prevention */}
                  <button
                    type="button"
                    onClick={() => setAiDemoTab("rto")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      aiDemoTab === "rto"
                        ? "border-orange-500 bg-orange-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-base">
                      🛡️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">RTO রিটার্ন প্রতিরোধ কৌশল</h4>
                        {aiDemoTab === "rto" && (
                          <span className="text-[10px] font-bold text-orange-600 font-mono">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        &quot;Steadfast ও Pathao এ রিটার্ন পার্সেল (RTO) কিভাবে কমাব?&quot;
                      </p>
                    </div>
                  </button>

                  {/* Scenario 3: Courier Reconciliation */}
                  <button
                    type="button"
                    onClick={() => setAiDemoTab("reconciliation")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      aiDemoTab === "reconciliation"
                        ? "border-orange-500 bg-orange-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-base">
                      💰
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">কুরিয়ার অটো-রিকনসিলিয়েশন</h4>
                        {aiDemoTab === "reconciliation" && (
                          <span className="text-[10px] font-bold text-orange-600 font-mono">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        &quot;কুরিয়ারের বকেয়া COD টাকা কিভাবে মেলাব ও অডিট করব?&quot;
                      </p>
                    </div>
                  </button>

                  {/* Scenario 4: Stock Alerts */}
                  <button
                    type="button"
                    onClick={() => setAiDemoTab("stock")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      aiDemoTab === "stock"
                        ? "border-orange-500 bg-orange-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-base">
                      📊
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">স্টক পূর্বাভাস ও মার্জিন গার্ড</h4>
                        {aiDemoTab === "stock" && (
                          <span className="text-[10px] font-bold text-orange-600 font-mono">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        &quot;আমার স্টোরে কোন কোন প্রোডাক্টের স্টক শেষ হয়ে যাচ্ছে?&quot;
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Merchant Privacy & Isolation Guarantee */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <span className="text-emerald-600">🛡️</span>
                  <span>100% Tenant Isolation &amp; Zero Public Leakage</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {aiName} AI শুধুমাত্র আপনার নিজস্ব স্টোরের ইনভেন্টরি ও কুরিয়ার ডেটাবেজের সাথে এনক্রিপ্টেড সংযোগে কাজ করে। কোনো পাবলিক ডেটা মডেলের সাথে আপনার কাস্টমার বা সেলস ডেটা শেয়ার বা ট্রেইন করা হয় না।
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    PostgreSQL RLS
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Encrypted Token
                  </span>
                </div>
              </div>

              {/* Sign up CTA button */}
              <div>
                <Link
                  href="/login"
                  className="btn-tactile w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] hover:bg-[#D94E07] px-5 py-3 text-xs font-bold text-white shadow-md transition"
                >
                  <span>মার্চেন্ট একাউন্ট তৈরি করে {aiName} AI ব্যবহার করুন</span>
                  <span>→</span>
                </Link>
                <p className="text-[11px] text-center text-slate-500 mt-2">
                  ১০০ অর্ডার পর্যন্ত আজীবন সম্পূর্ণ ফ্রি • কোনো ক্রেডিট কার্ড লাগবে না
                </p>
              </div>
            </div>

            {/* Right Column: Live Simulated Chat Bubble Window */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden flex flex-col h-[560px]">
                {/* Chat Top Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white shadow-xs">
                      <span className="text-lg select-none">🤖</span>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-900" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white tracking-tight">
                          {aiName} ({aiNameBn}) AI Copilot
                        </h4>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-orange-500/30 text-orange-300 border border-orange-500/40">
                          PRO
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        24/7 Live Store Operations Copilot • বাংলা &amp; English
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Store Connected</span>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#F8FAFC]">
                  {/* User Question Bubble */}
                  <div className="flex justify-end animate-in fade-in duration-200">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-slate-900 text-white px-4 py-2.5 shadow-2xs">
                      <p className="text-xs leading-relaxed font-sans">
                        {aiDemoTab === "tracking" && "SF-8841029 এই পার্সেল অনেকদিন আটকে আছে, কি করব? একটি টিকিট ওপেন করো"}
                        {aiDemoTab === "rto" && "Steadfast ও Pathao এ রিটার্ন পার্সেল (RTO) কিভাবে কমাব?"}
                        {aiDemoTab === "reconciliation" && "কুরিয়ারের বকেয়া COD টাকা কিভাবে মেলাব ও অডিট করব?"}
                        {aiDemoTab === "stock" && "আমার স্টোরে কোন কোন প্রোডাক্টের স্টক শেষ হয়ে যাচ্ছে?"}
                      </p>
                      <span className="text-[9px] text-slate-400 block text-right mt-1 font-mono">
                        Merchant Query • Just now
                      </span>
                    </div>
                  </div>

                  {/* AI Response Bubble */}
                  <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 border border-orange-200 text-orange-600 text-xs shadow-2xs mt-0.5">
                      🤖
                    </div>

                    <div className="max-w-[88%] space-y-2">
                      <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 text-slate-800 p-4 shadow-2xs space-y-2.5">
                        {/* Scenario 1 Content */}
                        {aiDemoTab === "tracking" && (
                          <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                            <h4 className="font-bold text-[13px] text-slate-900 leading-snug">
                              📦 পার্সেল লাইভ স্ট্যাটাস: SF-8841029 (Steadfast Courier)
                            </h4>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-900 space-y-1">
                              <div><strong>কাস্টমার:</strong> তানভীর আহমেদ (০১৭১২-XXXXXX) · ধানমন্ডি, ঢাকা</div>
                              <div><strong>বর্তমান স্ট্যাটাস:</strong> ⏳ ইন-ট্রানজিট (গত ৩ দিন হাব-এ রিটেইন)</div>
                              <div><strong>COD এমাউন্ট:</strong> ৳ ২,৪৫০ | <strong>ওজন:</strong> ০.৮ কেজি</div>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              ✅ <strong>সাপোর্ট টিকিট স্বয়ংক্রিয়ভাবে তৈরি হয়েছে:</strong> পার্সেলটি অতিরিক্ত সময় আটকে থাকায় সরাসরি কুরিয়ার অপারেশন সেন্টারে <strong>টিকিট #TKT-8841</strong> ফাইল করা হয়েছে।
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                              আমাদের ব্যাকঅফিস টিম অবিলম্বে কুরিয়ার রিপ্রেজেনটেটিভের সাথে যোগাযোগ করে কাস্টমার ডেলিভারি নিশ্চিত করবে।
                            </p>
                          </div>
                        )}

                        {/* Scenario 2 Content */}
                        {aiDemoTab === "rto" && (
                          <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                            <h4 className="font-bold text-[13px] text-slate-900 leading-snug">
                              🛡️ কুরিয়ার RTO রিটার্ন কমানোর ৪টি স্মার্ট কৌশল:
                            </h4>
                            <div className="space-y-1.5 text-slate-700 leading-relaxed">
                              <div className="flex items-start gap-2 pl-1">
                                <span className="text-orange-500 font-bold">•</span>
                                <span><strong>১. হাই-রিস্ক কাস্টমার ফ্ল্যাগিং:</strong> যেসকল ক্রেতা পূর্বে ২ বারের বেশি পার্সেল রিফিউজ করেছেন তাদের অগ্রিম সতর্কবার্তা।</span>
                              </div>
                              <div className="flex items-start gap-2 pl-1">
                                <span className="text-orange-500 font-bold">•</span>
                                <span><strong>২. অটোমেটেড WhatsApp ডেলিভারি নোটিফিকেশন:</strong> অর্ডার প্লেস করার সাথে সাথে লোকেশন কনফার্মেশন পাঠানো।</span>
                              </div>
                              <div className="flex items-start gap-2 pl-1">
                                <span className="text-orange-500 font-bold">•</span>
                                <span><strong>৩. অগ্রিম ডেলিভারি চার্জ পলিসি:</strong> ঢাকার বাইরের অর্ডারে কমপক্ষে ৳ ১২০-১৫০ অগ্রিম নিলে RTO প্রায় ৬৫% কমে যায়।</span>
                              </div>
                              <div className="flex items-start gap-2 pl-1">
                                <span className="text-orange-500 font-bold">•</span>
                                <span><strong>৪. সেম-ডে ডেসপ্যাচ স্পিড:</strong> ১২ ঘণ্টার মধ্যে কুরিয়ার হ্যান্ডওভার করলে ক্রেতার মত বদলানোর সুযোগ থাকে না।</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scenario 3 Content */}
                        {aiDemoTab === "reconciliation" && (
                          <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                            <h4 className="font-bold text-[13px] text-slate-900 leading-snug">
                              💰 কুরিয়ার অটো-রিকনসিলিয়েশন ও পেমেন্ট অডিট গাইড
                            </h4>
                            <p className="text-slate-700 leading-relaxed">
                              Steadfast বা Pathao থেকে পাওয়া পেমেন্ট ইনভয়েস ফাইল এক ক্লিকে আপলোড করলেই আমাদের সিস্টেম সম্পূর্ণ অডিট সম্পন্ন করে:
                            </p>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] space-y-1 text-slate-700">
                              <div className="flex justify-between">
                                <span>মোট ডেলিভারড অর্ডার:</span>
                                <strong className="font-mono">৪২৮ টি</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>প্রত্যাশিত COD কালেকশন:</span>
                                <strong className="font-mono text-emerald-700">৳ ৪,৯২,২০০</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>অডিট অসঙ্গতি / মিসিং অ্যামাউন্ট:</span>
                                <strong className="font-mono text-rose-600">৳ ০ (সম্পূর্ণ মিলেছে)</strong>
                              </div>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              কোনো পার্সেলের অতিরিক্ত চার্জ কাটা হলে সিস্টেম তাৎক্ষণিক ডিসপিউট রিপোর্ট জেনারেট করে।
                            </p>
                          </div>
                        )}

                        {/* Scenario 4 Content */}
                        {aiDemoTab === "stock" && (
                          <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                            <h4 className="font-bold text-[13px] text-slate-900 leading-snug">
                              ⚠️ লো-স্টক পূর্বাভাস ও রিস্টক গাইডেন্স
                            </h4>
                            <div className="space-y-1.5 text-slate-700 leading-relaxed">
                              <div className="p-2 rounded-lg border border-rose-200 bg-rose-50/60 text-[11px]">
                                <strong className="text-rose-900">অ্যাকশন প্রয়োজন:</strong> ড্রপ-শোল্ডার ব্ল্যাক টি-শার্ট (L) এর স্টক মাত্র <strong>৪ পিস</strong> অবশিষ্ট। গত সপ্তাহে গড় বিক্রি ছিল দৈনিক ৩টি।
                              </div>
                              <div className="p-2 rounded-lg border border-amber-200 bg-amber-50/60 text-[11px]">
                                <strong className="text-amber-900">রিস্টক সুপারিশ:</strong> স্টকআউট এড়াতে আগামী ৪৮ ঘণ্টার মধ্যে কমপক্ষে <strong>৫০ পিস</strong> রি-অর্ডার করুন।
                              </div>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              প্রোডাক্টের প্রতিটি লটের জন্য থার্মাল বারকোড লেবেল ও তাকের র‍্যাক নম্বর সিস্টেমে সংরক্ষিত আছে।
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {aiDemoTab === "tracking" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                🎫 টিকিট #TKT-8841 ওপেন হয়েছে
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                📱 WhatsApp কাস্টমার আপডেট
                              </span>
                            </>
                          )}
                          {aiDemoTab === "rto" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ⚡ ১২০৳ অ্যাডভান্স পলিসি
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                🚀 ইনস্ট্যান্ট ডেসপ্যাচ
                              </span>
                            </>
                          )}
                          {aiDemoTab === "reconciliation" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                📑 ১-ক্লিক রিকনসিলিয়েশন
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                📊 প্রফিট অডিট
                              </span>
                            </>
                          )}
                          {aiDemoTab === "stock" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                📦 স্টক ম্যানেজার
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                🏷️ থার্মাল বারকোড প্রিন্ট
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Input Area */}
                <div className="p-3.5 bg-white border-t border-slate-200 shrink-0">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
                    <span className="text-slate-400 text-xs">💬</span>
                    <input
                      type="text"
                      readOnly
                      value={
                        aiDemoTab === "tracking"
                          ? "SF-8841029 এর টিকিট আপডেট দেখাও..."
                          : aiDemoTab === "rto"
                          ? "কুরিয়ারে রিটার্ন চার্জ কিভাবে কমাব..."
                          : aiDemoTab === "reconciliation"
                          ? "Steadfast এর টাকা মেলাতে ফাইল আপলোড করব..."
                          : "কোন প্রোডাক্টের রিস্টক রেডি..."
                      }
                      className="w-full bg-transparent text-xs text-slate-500 font-sans cursor-default outline-none"
                    />
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                      Live Merchant AI
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
                    <span>* রেজিস্টার্ড মার্চেন্ট ড্যাশবোর্ডে সার্বক্ষণিক সক্রিয়</span>
                    <Link href="/login" className="text-orange-600 font-semibold hover:underline">
                      এখনই ফ্রিতে শুরু করুন →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TERMINAL SIMULATOR (HIGH-CONTRAST DARK SLATE SHOWCASE) ── */}
      <section id="simulator" className="py-20 border-y border-slate-800 bg-[#0F172A] text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#EA580C]">
              Interactive Execution
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Test Real-World Fulfillment Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Simulate barcode camera decoding with audible sound, WhatsApp buyer notifications, and carrier API payloads.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Terminal Window Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950 gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="ml-2 font-mono text-xs font-medium text-slate-400">
                  fulfillment-pipeline.sh · Active Simulator
                </span>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-lg bg-slate-800/80 font-sans">
                <button
                  type="button"
                  onClick={() => setActiveTab("scanner")}
                  className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    activeTab === "scanner"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Camera Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp")}
                  className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    activeTab === "whatsapp"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  WhatsApp Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courier")}
                  className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    activeTab === "courier"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Carrier API
                </button>
              </div>
            </div>

            {/* TAB 1: SCANNER */}
            {activeTab === "scanner" && (
              <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900/60">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[280px] text-center space-y-4 shadow-2xs">
                  {/* Camera Viewfinder Mockup */}
                  <div className="relative h-40 w-64 rounded-xl border-2 border-dashed border-orange-500/80 bg-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden shadow-inner">
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
                        <span className="text-xs font-mono font-medium tracking-wider">Decoding Video Stream…</span>
                      </div>
                    ) : simulatedScanState === "found" ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-400">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-mono font-medium">DECODED: 0.28s</span>
                        <span className="text-[10px] font-mono text-emerald-300">Audible confirmation beep</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-mono font-medium text-slate-300 block">
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
                    className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-[#EA580C] hover:bg-[#D94E07] px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    <span>{simulatedScanState === "scanning" ? "Decoding Stream…" : "Test simulated scan"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-400">
                    Decoded SKU Record &amp; Actions
                  </span>

                  {simulatedScanState === "found" && scannedSku ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-sm animate-in fade-in">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-md bg-orange-950 text-orange-400 font-mono text-xs font-medium border border-orange-800">
                            {scannedSku.sku}
                          </span>
                          <h4 className="text-base font-semibold text-white mt-2">
                            {scannedSku.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">{scannedSku.category} · {scannedSku.warehouse}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 text-[10px] uppercase font-medium">Available Stock</span>
                          <div className="text-xl font-semibold text-emerald-400 mt-0.5">
                            {scannedSku.stock} units
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 text-[10px] uppercase font-medium">Unit Retail</span>
                          <div className="text-xl font-semibold text-white mt-0.5">
                            {currency === "BDT" ? `৳${scannedSku.priceBdt.toLocaleString()}` : `$${scannedSku.priceUsd}`}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("whatsapp")}
                          className="btn-tactile flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium text-center transition"
                        >
                          Dispatch via Steadfast →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400 bg-slate-950">
                      Click <strong className="text-slate-200">&quot;Test simulated scan&quot;</strong> to test mobile camera decoding speed and synthesizer audio feedback.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: WHATSAPP */}
            {activeTab === "whatsapp" && (
              <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center justify-center gap-8 bg-slate-900/60">
                <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-white p-4 space-y-3 text-xs shadow-xl text-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-slate-900">Merchant Store Bot (Verified)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">10:48 AM</span>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200/60 space-y-2 text-slate-800">
                    <p className="font-semibold text-emerald-950">Order #ORD-9421 Dispatched</p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Assalamu Alaikum! Your parcel has been packed and handed over to Steadfast Courier.
                    </p>
                    <div className="pt-1 font-mono text-[11px] text-emerald-700 font-semibold bg-white p-2 rounded-lg border border-emerald-200">
                      Tracking: steadfast.com.bd/t/SF-94821-BD<br />
                      COD Payable: {currency === "BDT" ? "৳2,500" : "$20.50"}
                    </div>
                  </div>
                </div>

                <div className="max-w-md space-y-3 text-xs text-slate-300">
                  <h4 className="text-lg font-semibold text-white">
                    Zero-Friction Buyer Communications
                  </h4>
                  <p className="leading-relaxed text-slate-300">
                    Automatic WhatsApp notifications keep buyers informed the exact second their parcels leave your warehouse, dramatically reducing failed deliveries and return-to-origin (RTO) expenses.
                  </p>
                  <div className="flex items-center gap-1.5 pt-2 font-mono text-xs text-emerald-400 font-semibold">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cuts customer tracking inquiries by up to 88%</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COURIER API */}
            {activeTab === "courier" && (
              <div className="p-6 font-mono text-xs overflow-x-auto bg-slate-950 text-slate-100">
                <div className="text-slate-400 mb-2 font-medium">// Direct server-to-server POST to Steadfast API (/api/courier/steadfast)</div>
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
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                Calculate Monthly Warehouse Savings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Adjust the volume slider to see how much labor time, cash, and hardware expenses your business saves.
              </p>
            </div>

            {/* Range Slider */}
            <div className="space-y-4 max-w-xl mx-auto bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Monthly Orders Shipped</span>
                <span className="font-mono font-semibold text-orange-700 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
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
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-600 uppercase font-mono">Labor Time Reclaimed</div>
                <div className="text-2xl font-semibold text-emerald-600 font-mono mt-1">
                  ~{hoursSaved} hrs/mo
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Automated consignment entry</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-600 uppercase font-mono">Hardware Gun Saved</div>
                <div className="text-2xl font-semibold text-orange-600 font-mono mt-1">
                  {hardwareSavedVal}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">In-browser mobile scanning</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-600 uppercase font-mono">Est. Value Created</div>
                <div className="text-2xl font-semibold text-slate-900 font-mono mt-1">
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
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
              Why We Are Different
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Why 2,400+ High-Volume Merchants Chose Us Over Standard CMS &amp; Spreadsheets
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Generic eCommerce plugins only count basic in/out quantities. SmartInventory is a modern warehouse management system designed to prevent courier return losses, avoid stockouts, and protect your margins.
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
                      <div className="flex items-start gap-2">
                        <CrossIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>None. 18%–30% COD parcels get returned, costing ৳160+ each.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Delivery history checks score customer reliability before booking to prevent return losses.</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Automated Restock &amp; Purchase Orders (PO)
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      <div className="flex items-start gap-2">
                        <CrossIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>Manual spreadsheet calculations and guesswork.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Calculates reorder points and formats 1-click WhatsApp or PDF supplier POs.</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Supplier Challan &amp; Invoice Intake
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      <div className="flex items-start gap-2">
                        <CrossIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>Typing dozens of SKUs and buying costs manually.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Challan text parser extracts SKUs, costs, and margins with 1-click ingest.</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Slow-Moving Stock Clearance
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      <div className="flex items-start gap-2">
                        <CrossIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>Stagnant stock sits idle in warehouse unnoticed.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Intelligent bundling pairs slow-moving inventory with hero SKUs in discounted bundles to release cash.</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      Native Bangladesh Logistics APIs
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      <div className="flex items-start gap-2">
                        <CrossIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>Broken third-party plugins with manual tracking updates.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Direct native Steadfast, Pathao, and RedX webhooks with automated WhatsApp updates.</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      True Unit Economics &amp; COD Real Net Profit
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      <div className="flex items-start gap-2">
                        <CrossIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>Only shows gross revenue, hiding courier return and packaging losses.</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700 bg-orange-50/30">
                      <div className="flex items-start gap-2">
                        <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Real-time break-even calculations factoring courier charges, COD fee, and return risk.</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING PLANS ──────────────────── */}
      <section id="pricing" className="py-24 sm:py-32 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
              Simple, Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Predictable Plans Built for Bangladesh E-Commerce
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              From emerging F-commerce shops to high-volume multi-warehouse brands. Zero hidden fees.
            </p>

            {/* Currency Selector */}
            <div className="pt-2 inline-flex items-center gap-1 p-1 rounded-md bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition cursor-pointer ${
                  currency === "BDT"
                    ? "bg-white text-orange-600 shadow-2xs font-medium"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ৳ BDT Pricing
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition cursor-pointer ${
                  currency === "USD"
                    ? "bg-white text-orange-600 shadow-2xs font-medium"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                $ USD Global
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Tier 1: Starter / Small Business */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-slate-300 transition shadow-2xs">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase font-mono tracking-wider">
                    Starter / F-Commerce
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-semibold text-slate-900 font-mono">
                      {currency === "BDT" ? "৳990" : "$9"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium font-sans">/ month</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    Perfect for rising Facebook &amp; Instagram shops setting up real inventory controls.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/80 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>100 orders</strong> / month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>100 Return Risk Checks</strong> / mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>In-browser mobile barcode scanner</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Manual order entry &amp; CSV export</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Single-user operator access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>PostgreSQL RLS tenant security</span>
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="btn-tactile block w-full text-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 py-2.5 text-[13px] font-medium text-slate-800 transition shadow-2xs"
              >
                Start 100-Order Free Trial
              </Link>
            </div>

            {/* Tier 2: Professional / Growth (MOST POPULAR) */}
            <div className="rounded-lg border border-slate-200 ring-2 ring-[#EA580C] bg-white p-6 sm:p-7 flex flex-col justify-between space-y-6 relative shadow-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#EA580C] uppercase tracking-wider font-mono">
                    Professional / Growth
                  </span>
                  <span className="text-[10px] font-mono font-medium uppercase bg-orange-100 text-[#EA580C] px-2.5 py-0.5 rounded-full border border-orange-200">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-semibold text-slate-900 font-mono">
                    {currency === "BDT" ? "৳1,990" : "$19"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium font-sans">/ month</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Automated fulfillment, courier integrations, and return fraud protection for growing e-commerce brands.
                </p>

                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited</strong> orders &amp; dispatches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Smart COD Return Guard</strong> &amp; RTO Predictor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>4×6 Thermal Label</strong> &amp; Tax Invoice Generator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Steadfast &amp; Pathao native API webhooks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automated WhatsApp parcel notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>3 User Seats</strong> (Admin &amp; Operators)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automated PO Restock generator</span>
                  </div>
                </div>
              </div>

              <Link
                href={user ? "/dashboard/billing" : "/login"}
                className="btn-tactile block w-full text-center rounded-md bg-[#EA580C] hover:bg-[#D94E07] py-2.5 text-[13px] font-medium text-white transition shadow-sm"
              >
                {user ? "Upgrade in Dashboard →" : "Start 100-Order Free Trial →"}
              </Link>
            </div>

            {/* Tier 3: Scale / Enterprise */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:border-slate-300 transition shadow-2xs">
              <div className="space-y-4">
                <span className="text-xs font-medium text-slate-500 uppercase font-mono tracking-wider">
                  Scale / Enterprise
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-semibold text-slate-900 font-mono">
                    {currency === "BDT" ? "৳4,990" : "$49"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium font-sans">/ month</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Dedicated infrastructure for high-volume warehouses, multi-branch stores, and retail chains.
                </p>

                <div className="pt-5 border-t border-slate-200/80 space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Everything in Professional</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Multi-warehouse</strong> stock routing</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited User Seats</strong> with granular RLS</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Slow-moving stock clearance tool</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1-Click WhatsApp B2B Supplier POs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated onboarding engineer &amp; 24/7 SLA</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom API &amp; ERP webhook connectors</span>
                  </div>
                </div>
              </div>

              <a
                href="#contact"
                className="btn-tactile block w-full text-center rounded-md border border-slate-300 bg-white hover:bg-slate-50 py-2.5 text-[13px] font-medium text-slate-800 transition shadow-2xs"
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
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
              Clear Answers
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
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
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
              Store Setup &amp; Onboarding
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
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
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-lg bg-orange-600 text-white flex items-center justify-center font-semibold text-base">
                      NH
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 tracking-tight">
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
                  &ldquo;I designed SmartInventory to solve the painful spreadsheet errors, manual courier copy-pasting, and fake COD orders that bleed merchant margins. Let&apos;s build an automated, zero-loss fulfillment pipeline for your brand.&rdquo;
                </p>

                <div className="pt-2 border-t border-slate-200/80 space-y-3">
                  {/* WhatsApp Direct */}
                  <a
                    href={`https://wa.me/${(pricingData.whatsappNumber || "8801753082749").replace(/[^0-9]/g, "").startsWith("88") ? (pricingData.whatsappNumber || "8801753082749").replace(/[^0-9]/g, "") : "88" + (pricingData.whatsappNumber || "01753082749").replace(/[^0-9]/g, "")}?text=Hi%20Noyon,%20I%20would%20like%20to%20discuss%20SmartInventory%20for%20my%20business.`}
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
                    href={`mailto:${pricingData.supportEmail || "support@smartinventory.app"}`}
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
                  <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>100% Free architecture review &amp; Excel catalog audit</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Guidance on connecting Steadfast, Pathao &amp; RedX API keys</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Zero hard sales push — speak directly with the engineering team</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Consultation Request Form */}
            <div className="lg:col-span-7">
              <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                    Schedule a 15-Minute Architecture Session
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill in your store details below and our lead engineer will reach out via WhatsApp with tailored solutions.
                  </p>
                </div>

                {contactSubmitted ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-3 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckIcon className="w-6 h-6 text-emerald-700" />
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
      <section className="py-20 sm:py-24 border-t border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Automate your warehouse fulfillment today.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Join hundreds of local merchants operating on in-browser camera scanning and 1-click courier dispatches.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="inline-flex items-center gap-2 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-6 py-3 text-xs sm:text-sm font-medium text-white transition shadow-2xs group"
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
              <span className="font-semibold text-slate-900 text-sm">{APP_NAME}</span>
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
