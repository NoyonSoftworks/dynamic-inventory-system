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

  // ── Dynamic Pricing & Settings ───────────────────────────────
  const [currency, setCurrency] = useState("USD"); // "USD" | "BDT"
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

  // ── Interactive ROI Calculator State ─────────────────────────
  const [monthlyOrders, setMonthlyOrders] = useState(1200);

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

  // ── Simulator Action ─────────────────────────────────────────
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
        price: 1450,
        warehouse: "Main Fulfillment Hub - Bay 4",
      });
      setSimulatedScanState("found");
    }, 600);
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

  // High-Ranking SEO FAQ
  const faqs = [
    {
      q: "How does in-browser camera barcode scanning work without buying laser hardware?",
      a: "SmartInventory utilizes client-side WebAssembly video stream decoding. Warehouse operators open the platform on any standard smartphone browser (iOS or Android) and point the camera at any 1D Code128, EAN-13, or 2D QR code. The system resolves the SKU in under 300 milliseconds with audible audio confirmation, completely eliminating the need for $350+ handheld scanner guns.",
    },
    {
      q: "Can I directly connect our existing Steadfast, Pathao, or RedX courier accounts?",
      a: "Yes. You enter your private carrier API Key and Secret in your workspace Settings. When orders are verified and packed, a single click creates the consignment with Steadfast, generates the live tracking link, and prepares standard 4×6 inch thermal shipping labels.",
    },
    {
      q: "How do automated WhatsApp parcel updates reduce customer return rates (RTO)?",
      a: "Failed deliveries and return-to-origin (RTO) often occur because buyers are unaware of delivery dates or COD amounts. The second an order is marked as dispatched in SmartInventory, an automated WhatsApp notification pings the customer with their parcel tracking link and exact COD cash balance, slashing support inquiries by over 70%.",
    },
    {
      q: "Can we import our existing catalog from Excel or Google Sheets?",
      a: "Yes. The bulk CSV and Excel importer processes thousands of SKU rows with multi-variant attributes (Size, Color, Material, etc.), automatically generates barcodes, and establishes initial warehouse stock counts in seconds.",
    },
    {
      q: "How does SmartInventory prevent overselling across multiple sales channels?",
      a: "Every transaction (receiving inventory, pack & scan, courier dispatch, or customer return) is recorded in real time. Available stock updates instantly, and automated reorder runway forecasts alert managers before popular items stock out.",
    },
    {
      q: "Is my business inventory data completely isolated from other merchants?",
      a: "Yes. SmartInventory enforces PostgreSQL multi-tenant isolation with Row-Level Security (RLS) policies. Every database operation is cryptographically scoped to your workspace ID. No competitor or external store can access your inventory or customer data.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] text-[#f8fafc] font-sans antialiased selection:bg-orange-500/30 selection:text-orange-200">
      {/* ── TOP HEADER (Swiss Minimalist Bar) ───────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#0b1120]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-100">
              {APP_SHORT_NAME}
            </span>
          </Link>

          {/* Navigation Links (Clean & Focused) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition">Features</a>
            <a href="#simulator" className="hover:text-slate-100 transition">Live Terminal</a>
            <a href="#roi" className="hover:text-slate-100 transition">ROI Calculator</a>
            <a href="#pricing" className="hover:text-slate-100 transition">Pricing</a>
            <Link href="/blog" className="hover:text-slate-100 transition">Blog &amp; Guides</Link>
            <a href="#faq" className="hover:text-slate-100 transition">FAQ</a>
            <Link
              href="/demo"
              className="text-orange-400 hover:text-orange-300 font-semibold transition flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Sandbox</span>
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {!sessionLoading && user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="btn-tactile hidden sm:inline-flex items-center gap-1 rounded-lg border border-[#1e293b] bg-[#131d31] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    Super Admin
                  </Link>
                )}
                <Link
                  href="/dashboard/products"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm shadow-orange-600/30"
                >
                  <span>Dashboard</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm shadow-orange-600/30"
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

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-16 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 text-center space-y-6">
          {/* Single Refined Category Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-mono text-orange-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Warehouse Management &amp; Multi-Carrier Courier Automation</span>
          </div>

          {/* Natural, Authoritative Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-50 leading-[1.12]">
            Precision inventory management.<br />
            <span className="text-slate-400">Automated courier fulfillment.</span>
          </h1>

          {/* Sober B2B Sub-headline */}
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
            Scan barcodes directly with smartphone cameras. Dispatch consignments with <strong>Steadfast, Pathao &amp; RedX</strong> in one click. Automatically keep customers informed with live tracking updates on WhatsApp.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-500 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm shadow-orange-600/30 transition group"
            >
              <span>{user ? "Open Dashboard" : "Start 100-Order Free Trial"}</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/demo"
              className="btn-tactile inline-flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#131d31] hover:bg-slate-800 hover:border-slate-700 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-300 transition"
            >
              <span>Explore Interactive Sandbox →</span>
            </Link>
          </div>
        </div>

        {/* ── HERO PRODUCT UI MOCKUP WINDOW (Swiss-Industrial) ────── */}
        <div className="mx-auto max-w-6xl px-4 sm:px-8 mt-12 sm:mt-16">
          <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] shadow-2xl overflow-hidden hover:border-orange-500/30 transition">
            {/* Window Browser Header */}
            <div className="flex items-center justify-between border-b border-[#1e293b] px-4 py-3 bg-[#0b1120]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="ml-3 font-mono text-[11px] text-slate-500 hidden sm:inline">
                  smartinventory.io/dashboard/dispatch
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Central Hub: Online</span>
              </div>
            </div>

            {/* Mockup Product Dashboard Body */}
            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Product Card with Barcode */}
              <div className="lg:col-span-5 rounded-xl border border-[#1e293b] bg-[#0b1120] p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      SKU-CTG-8821-BLK
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-2">
                      Vintage Heavyweight Tee (Black / XL)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Apparel &amp; Ready-Made Garments</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    64 Units
                  </span>
                </div>

                {/* Simulated Barcode Graphic */}
                <div className="p-3 bg-[#131d31] rounded-lg border border-[#1e293b] flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-[2px] h-10">
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2].map((w, i) => (
                      <span
                        key={i}
                        className="bg-slate-200 h-full inline-block"
                        style={{ width: `${w * 1.5}px` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 tracking-widest">
                    *SKU-CTG-8821-BLK*
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div className="p-2.5 rounded-lg bg-[#131d31] border border-[#1e293b]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Catalog Price</span>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">৳1,450.00</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#131d31] border border-[#1e293b]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Scan Status</span>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">Verified ✓</div>
                  </div>
                </div>
              </div>

              {/* Courier Consignment & WhatsApp Auto-Dispatch Card */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-5 space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                        SF
                      </div>
                      <span className="text-xs font-bold text-slate-100">Steadfast Courier API — 1-Click Booking</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Consignment #SF-9481920
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Buyer</span>
                      <p className="font-semibold text-slate-200 mt-0.5">Tariqul Islam</p>
                      <p className="text-slate-500 text-[11px] font-mono">01712-345678</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Destination</span>
                      <p className="font-semibold text-slate-200 mt-0.5">Dhanmondi, Dhaka</p>
                      <p className="text-slate-500 text-[11px]">Home Delivery</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">COD Collection</span>
                      <p className="font-bold text-emerald-400 text-sm mt-0.5 font-mono">৳2,500</p>
                      <p className="text-slate-500 text-[10px] font-mono">Auto-Reconciled</p>
                    </div>
                  </div>

                  {/* WhatsApp Notification Capsule */}
                  <div className="rounded-lg bg-[#131d31] border border-[#1e293b] p-3 flex items-start gap-2.5 text-xs">
                    <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                      WA
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-200 text-[11px]">
                        Automated WhatsApp Alert Sent
                      </span>
                      <p className="text-slate-400 text-[11px]">
                        &quot;Hello Tariqul, your parcel #ORD-9421 is on its way via Steadfast. Track at steadfast.com.bd/t/SF-9481920&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 px-1 font-mono">
                  <span>✓ 4×6 Thermal Label Ready</span>
                  <span>✓ Sub-Second WebAssembly Camera Decode</span>
                  <span>✓ PostgreSQL Tenant Isolation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARRIER PARTNERS STRIP ───────────────────────────────── */}
      <section className="py-10 border-y border-[#1e293b] bg-[#131d31]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 text-center space-y-3">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Native Courier Integrations
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Steadfast Courier
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Pathao Courier
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> RedX Delivery
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Paperfly
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400" /> Carrybee
            </span>
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES (Swiss-Industrial Grid) ────────────────── */}
      <section id="features" className="py-20 bg-[#0b1120]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50">
              Built for High-Throughput Warehouse Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Everything your team needs to receive, pack, scan, and dispatch orders without manual spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 space-y-3 hover:border-orange-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold font-mono text-xs">
                01
              </div>
              <h3 className="text-base font-bold text-slate-100">Smartphone Barcode Decoding</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scan Code128, EAN, and QR codes instantly using phone cameras. Eliminates $350+ handheld scanner hardware costs.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 space-y-3 hover:border-teal-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold font-mono text-xs">
                02
              </div>
              <h3 className="text-base font-bold text-slate-100">1-Click Courier Dispatch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Book consignments with Steadfast, Pathao, or RedX without manual copy-pasting. Generates tracking IDs automatically.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 space-y-3 hover:border-orange-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold font-mono text-xs">
                03
              </div>
              <h3 className="text-base font-bold text-slate-100">Automated WhatsApp Alerts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send customers live parcel tracking links and COD collection balances automatically to reduce delivery disputes and RTO.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 space-y-3 hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold font-mono text-xs">
                04
              </div>
              <h3 className="text-base font-bold text-slate-100">Bulk Excel / CSV Catalog Import</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Migrate thousands of SKUs and variants in seconds. System auto-generates barcodes and establishes initial warehouse stock.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 space-y-3 hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold font-mono text-xs">
                05
              </div>
              <h3 className="text-base font-bold text-slate-100">PostgreSQL Tenant Isolation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Row-Level Security (RLS) ensures complete data privacy. Every database query is cryptographically scoped to your workspace ID.
              </p>
            </div>

            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 space-y-3 hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold font-mono text-xs">
                06
              </div>
              <h3 className="text-base font-bold text-slate-100">Audit Footprints &amp; Activity Log</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track every stock check-in, dispatch, and modification with user email, timestamp, and IP address for full accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TERMINAL SIMULATOR ───────────────────────── */}
      <section id="simulator" className="py-20 border-y border-[#1e293b] bg-[#131d31]/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
              Interactive Execution
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50">
              Test Real-World Fulfillment Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Simulate barcode decoding with audible feedback, customer WhatsApp notifications, and carrier API payloads.
            </p>
          </div>

          <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#0b1120] text-slate-100 shadow-xl overflow-hidden hover:border-orange-500/30 transition">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1e293b] px-5 py-3.5 bg-[#131d31] gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="ml-2 font-mono text-xs text-slate-400">fulfillment-pipeline.sh</span>
              </div>

              <div className="flex items-center p-1 rounded-lg bg-[#0b1120] border border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setActiveTab("scanner")}
                  className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    activeTab === "scanner"
                      ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Camera Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("whatsapp")}
                  className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    activeTab === "whatsapp"
                      ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  WhatsApp Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courier")}
                  className={`btn-tactile px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    activeTab === "courier"
                      ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Carrier API
                </button>
              </div>
            </div>

            {/* TAB 1: SCANNER */}
            {activeTab === "scanner" && (
              <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#0b1120]">
                <div className="rounded-xl border border-[#1e293b] bg-[#131d31]/50 p-6 flex flex-col items-center justify-center min-h-[260px] text-center space-y-4">
                  <div className="relative h-36 w-56 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center p-4">
                    {simulatedScanState === "scanning" ? (
                      <div className="flex flex-col items-center gap-2 text-orange-400">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono font-medium">Decoding Video Stream…</span>
                      </div>
                    ) : simulatedScanState === "found" ? (
                      <div className="flex flex-col items-center gap-1.5 text-emerald-400">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-mono font-bold">MATCH: 0.28s</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500">[ Point Camera at Barcode ]</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerDemoScan}
                    disabled={simulatedScanState === "scanning"}
                    className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-orange-600/30 cursor-pointer"
                  >
                    <span>{simulatedScanState === "scanning" ? "Decoding…" : "Trigger Simulated Scan & Beep"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    Decoded SKU Record
                  </span>

                  {simulatedScanState === "found" && scannedSku ? (
                    <div className="rounded-xl border border-[#1e293b] bg-[#131d31] p-5 space-y-3">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono text-xs font-bold border border-orange-500/20">
                          {scannedSku.sku}
                        </span>
                        <h4 className="text-base font-bold text-slate-100 mt-2">
                          {scannedSku.name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1e293b] text-xs font-mono">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold">Catalog Stock</span>
                          <div className="text-xl font-bold text-emerald-400 mt-0.5">
                            {scannedSku.stock} units
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold">Unit Retail</span>
                          <div className="text-xl font-bold text-slate-100 mt-0.5">
                            ৳{scannedSku.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#1e293b] p-8 text-center text-xs text-slate-500">
                      Click &quot;Trigger Simulated Scan&quot; to test camera decoding speed and sound.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: WHATSAPP */}
            {activeTab === "whatsapp" && (
              <div className="p-6 sm:p-10 flex flex-col md:flex-row items-center justify-center gap-8 bg-[#0b1120]">
                <div className="w-full max-w-sm rounded-xl border border-[#1e293b] bg-[#131d31] p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-200">Merchant Store Bot</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">10:48 AM</span>
                  </div>

                  <div className="rounded-lg bg-[#0b1120] p-3.5 border border-[#1e293b] space-y-1.5 text-slate-300">
                    <p className="font-medium text-white">Order #1084 Dispatched</p>
                    <p className="text-[11px] text-slate-400">
                      Your parcel has been handed over to Steadfast Courier.
                    </p>
                    <div className="pt-1 font-mono text-[11px] text-emerald-400 font-bold">
                      Tracking: steadfast.com.bd/t/SF-889124
                    </div>
                  </div>
                </div>

                <div className="max-w-md space-y-2 text-xs text-slate-300">
                  <h4 className="text-base font-bold text-white">
                    Zero-Friction Buyer Communications
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-xs">
                    Automatic WhatsApp alerts notify buyers the moment parcels leave your warehouse, eliminating where-is-my-order support tickets.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: COURIER API */}
            {activeTab === "courier" && (
              <div className="p-6 font-mono text-xs text-slate-300 overflow-x-auto bg-[#0b1120]">
                <div className="text-slate-500 mb-2">// Server-to-server POST to Steadfast API (/api/courier/steadfast)</div>
                <pre className="text-slate-200 leading-relaxed">
{`{
  "invoice": "ORD-9421",
  "recipient_name": "Tariqul Islam",
  "recipient_phone": "01712345678",
  "recipient_address": "House 12, Road 4, Dhanmondi, Dhaka",
  "cod_amount": 2500,
  "consignment_id": "9481920",
  "tracking_url": "https://steadfast.com.bd/tracking/SF-9481920",
  "status": "DISPATCHED"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ROI SAVINGS CALCULATOR ───────────────────────────────── */}
      <section id="roi" className="py-20 bg-[#0b1120]">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-8 sm:p-12 space-y-8 shadow-xs">
            <div className="text-center space-y-1.5 max-w-xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-50">
                Calculate Monthly Warehouse Savings
              </h2>
              <p className="text-xs text-slate-400">
                Adjust the volume slider to see estimated time reclaimed through automated dispatching.
              </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Monthly Orders Shipped</span>
                <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                  {monthlyOrders.toLocaleString()} / mo
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>100 orders</span>
                <span>5,000 orders</span>
                <span>10,000+ orders</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#1e293b] text-center">
              <div className="p-4 rounded-xl bg-[#0b1120] border border-[#1e293b]">
                <div className="text-xs font-semibold text-slate-400">Labor Saved</div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  ~{hoursSaved} hrs/mo
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Automated consignment entry</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0b1120] border border-[#1e293b]">
                <div className="text-xs font-semibold text-slate-400">Hardware Expense</div>
                <div className="text-2xl font-black text-orange-400 font-mono mt-1">
                  ${hardwareSaved}+ Saved
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Mobile camera scanner included</div>
              </div>

              <div className="p-4 rounded-xl bg-[#0b1120] border border-[#1e293b]">
                <div className="text-xs font-semibold text-slate-400">Dispute Reduction</div>
                <div className="text-2xl font-black text-slate-100 font-mono mt-1">
                  -{disputeReduction}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Instant parcel tracking links</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING MATRIX ───────────────────────────────────────── */}
      {/* ── PRICING MATRIX ───────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-t border-[#1e293b] bg-[#131d31]/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50">
              Predictable, Transparent Pricing
            </h2>
            <p className="text-xs text-slate-400">
              Start free. Upgrade as fulfillment volume expands.
            </p>

            {/* Currency Switcher */}
            <div className="pt-2 inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#0b1120] border border-[#1e293b]">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`btn-tactile px-3 py-1 rounded-md text-xs font-bold transition ${
                  currency === "USD"
                    ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("BDT")}
                className={`btn-tactile px-3 py-1 rounded-md text-xs font-bold transition ${
                  currency === "BDT"
                    ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                BDT (৳)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Free Starter */}
            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-100 font-mono">
                    {currency === "BDT" ? "৳0" : "$0"}
                  </span>
                  <span className="text-xs text-slate-500">/ forever free</span>
                </div>
                <p className="text-xs text-slate-400">
                  Ideal for boutique shops setting up initial inventory operations.
                </p>

                <div className="pt-4 border-t border-[#1e293b] space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Up to {pricingData.freeLimit} orders per month
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> In-browser camera barcode scanner
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Steadfast courier API connection
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> PostgreSQL RLS tenant isolation
                  </div>
                </div>
              </div>

              <Link
                href="/login"
                className="btn-tactile block w-full text-center rounded-lg border border-[#1e293b] bg-[#0b1120] hover:bg-slate-800 py-2.5 text-xs font-bold text-slate-200 transition"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Scale (Featured) */}
            <div className="card-lift rounded-2xl border-2 border-orange-500 bg-[#131d31] p-6 flex flex-col justify-between space-y-6 relative shadow-xl shadow-orange-500/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Pro Enterprise</span>
                  <span className="text-[10px] font-mono font-bold uppercase bg-orange-500/20 text-orange-300 px-2.5 py-0.5 rounded-full border border-orange-500/30">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-50 font-mono">
                    {displayPrice}
                  </span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-400">
                  Uncapped fulfillment capacity with automated courier and messaging workflows.
                </p>

                <div className="pt-4 border-t border-[#1e293b] space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> <strong>Unlimited</strong> orders and dispatches
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Automated WhatsApp &amp; SMS tracking
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> All 5 courier integrations
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Bulk CSV imports (10,000+ items)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Complete audit trail activity logs
                  </div>
                </div>
              </div>

              <Link
                href={user ? "/dashboard/billing" : "/login"}
                className="btn-tactile block w-full text-center rounded-lg bg-orange-600 hover:bg-orange-500 py-3 text-xs sm:text-sm font-bold text-white transition shadow-sm shadow-orange-600/30"
              >
                {user ? "Upgrade in Dashboard →" : "Start Pro Trial →"}
              </Link>
            </div>

            {/* Custom SLA */}
            <div className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 flex flex-col justify-between space-y-6 hover:border-slate-700 transition">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Custom SLA</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-100 font-mono">
                    Enterprise
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Dedicated database clusters, bespoke ERP connectors, and custom webhook feeds.
                </p>

                <div className="pt-4 border-t border-[#1e293b] space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> 100,000+ monthly orders
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Custom webhook configurations
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Dedicated database instance
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> 99.9% Uptime SLA commitment
                  </div>
                </div>
              </div>

              <a
                href="mailto:support@smartinventory.io?subject=Enterprise%20Inquiry"
                className="btn-tactile block w-full text-center rounded-lg border border-[#1e293b] bg-[#0b1120] hover:bg-slate-800 py-2.5 text-xs font-bold text-slate-200 transition"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ──────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-[#0b1120]">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 space-y-8">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-slate-50">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="card-lift rounded-xl border border-[#1e293b] bg-[#131d31] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-500 font-mono text-base ml-4 shrink-0 font-bold">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-[#1e293b] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────── */}
      <section className="py-20 border-t border-[#1e293b] bg-[#131d31]/50 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 text-center space-y-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Automate your warehouse fulfillment today.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Join merchants operating on automated camera scanning and direct courier integration.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard/products" : "/login"}
              className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-500 px-6 py-3 text-xs sm:text-sm font-bold text-white transition shadow-sm shadow-orange-600/30 group"
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
      <footer className="border-t border-[#1e293b] bg-[#0b1120] py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">{APP_NAME}</span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/" className="hover:text-slate-200 transition">Home</Link>
            <Link href="/blog" className="hover:text-slate-200 transition">Blog &amp; Guides</Link>
            <Link href="/demo" className="hover:text-slate-200 transition">Sandbox</Link>
            <a href="#features" className="hover:text-slate-200 transition">Features</a>
            <a href="#pricing" className="hover:text-slate-200 transition">Pricing</a>
            <a href="#faq" className="hover:text-slate-200 transition">FAQ</a>
            {user && (
              <Link href="/dashboard/products" className="hover:text-slate-200 transition">
                Dashboard
              </Link>
            )}
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            © {currentYear} {APP_NAME}. 256-Bit SSL Encrypted.
          </div>
        </div>
      </footer>
    </div>
  );
}
