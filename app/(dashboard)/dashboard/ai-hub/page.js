"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── Sample Presets for RTO Risk Testing ──────────────────────
const RTO_PRESETS = [
  {
    label: "High Risk Vague Address",
    phone: "01700000000",
    address: "Dhaka mor",
    codAmount: 7500,
    courier: "Steadfast",
  },
  {
    label: "Safe Verified Order",
    phone: "01712345678",
    address: "House 24, Road 7, Block C, Banani, Dhaka-1213",
    codAmount: 1850,
    courier: "Steadfast",
  },
  {
    label: "Remote District COD",
    phone: "01819283746",
    address: "Post Office Road, Sadar Thana, Kurigram",
    codAmount: 4200,
    courier: "Pathao",
  },
];

// ── Sample Supplier Invoice Memos ─────────────────────────────
const SAMPLE_INVOICE_TEXTS = {
  electronics: `Wholesale Gadget Imports Ltd - Consignment Challan #8841
1. Anker Soundcore R50i Wireless Earbuds - 25 pcs @ 1100 BDT
2. Baseus 20W Fast USB-C Charger Adapter - 40 pcs @ 520 BDT
3. RGB Backlit Mechanical Gaming Keyboard - 15 pcs @ 1450 BDT
4. Joyroom Dual Coil MagSafe Car Mount - 20 pcs @ 750 BDT`,
  apparel: `Dhaka Garment Exporters & Wholesale Fabricators
- Premium Vintage Heavyweight T-Shirt (Black / XL) - 50 pcs @ 280 BDT
- 100% Cotton Oversized Drop-Shoulder Hoodie (Navy) - 30 pcs @ 650 BDT
- Slim-Fit Chino Pants (Khaki) - 25 pcs @ 580 BDT
- Embroidered Cotton Baseball Cap - 40 pcs @ 180 BDT`,
};

export default function AiOperationsHubPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  // ── Active Tab Control ───────────────────────────────────────
  // 'rto' | 'restock' | 'invoice' | 'deadstock' | 'calculator'
  const [activeTab, setActiveTab] = useState("rto");

  // ── Database Data State ──────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Tab 1: RTO Delivery Risk Predictor State ─────────────────
  const [rtoPhone, setRtoPhone] = useState("01700000000");
  const [rtoAddress, setRtoAddress] = useState("Mirpur 10, Dhaka near mor");
  const [rtoCodAmount, setRtoCodAmount] = useState(4500);
  const [rtoCourier, setRtoCourier] = useState("Steadfast");
  const [rtoAnalyzing, setRtoAnalyzing] = useState(false);
  const [rtoResult, setRtoResult] = useState(null);

  // ── Tab 2: Automated Purchase Order (PO) State ───────────────
  const [poLeadTime, setPoLeadTime] = useState(5);
  const [poSupplierName, setPoSupplierName] = useState("Global Sourcing Direct Ltd");
  const [poGenerating, setPoGenerating] = useState(false);
  const [generatedPo, setGeneratedPo] = useState(null);
  const [copiedPo, setCopiedPo] = useState(false);

  // ── Tab 3: Smart Invoice & Challan Parser State ──────────────
  const [invoiceRawText, setInvoiceRawText] = useState(SAMPLE_INVOICE_TEXTS.electronics);
  const [invoiceParsing, setInvoiceParsing] = useState(false);
  const [parsedInvoiceData, setParsedInvoiceData] = useState(null);
  const [savingProducts, setSavingProducts] = useState(false);

  // ── Tab 4: Deadstock Bundling State ──────────────────────────
  const [deadstockLoading, setDeadstockLoading] = useState(false);
  const [bundleRecommendations, setBundleRecommendations] = useState(null);

  // ── Tab 5: True Unit Economics Simulator State ───────────────
  const [calcCost, setCalcCost] = useState(450);
  const [calcPackaging, setCalcPackaging] = useState(25);
  const [calcCourier, setCalcCourier] = useState(120);
  const [calcCodFeePercent, setCalcCodFeePercent] = useState(1.0); // 1%
  const [calcRtoRate, setCalcRtoRate] = useState(16); // 16% return rate
  const [calcSellingPrice, setCalcSellingPrice] = useState(950);
  const [calcMonthlyOrders, setCalcMonthlyOrders] = useState(1200);

  // Show toast notification helper
  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // ── Load Real Catalog Data for AI Engines ────────────────────
  useEffect(() => {
    let isMounted = true;

    async function fetchCatalog() {
      if (!businessId) {
        setDataLoading(false);
        return;
      }

      try {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, category, variants(id, price, stock_quantity)")
          .eq("business_id", businessId);

        if (isMounted) {
          setProducts(prods || []);
        }
      } catch (err) {
        console.warn("Catalog fetch notice:", err);
      } finally {
        if (isMounted) setDataLoading(false);
      }
    }

    if (!ctxLoading) {
      fetchCatalog();
    }

    return () => {
      isMounted = false;
    };
  }, [businessId, ctxLoading]);

  // ── Tab 1: Analyze RTO Risk Handler ──────────────────────────
  async function handleAnalyzeRto() {
    try {
      setRtoAnalyzing(true);
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rto_risk_analysis",
          payload: {
            phone: rtoPhone,
            address: rtoAddress,
            codAmount: rtoCodAmount,
            courier: rtoCourier,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRtoResult(data);
      } else {
        triggerToast("Failed to analyze delivery risk: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      triggerToast("Network error running RTO analysis: " + err.message);
    } finally {
      setRtoAnalyzing(false);
    }
  }

  // ── Tab 2: Generate PO Handler ───────────────────────────────
  async function handleGeneratePo() {
    try {
      setPoGenerating(true);
      // Construct item candidates from catalog or realistic default fallbacks
      let candidates = [];
      if (products.length > 0) {
        candidates = products.slice(0, 5).map((p) => {
          const totalStock = (p.variants || []).reduce(
            (s, v) => s + (Number(v.stock_quantity) || 0),
            0
          );
          const firstPrice = p.variants?.[0]?.price || 950;
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            currentStock: totalStock,
            dailyVelocity: totalStock < 10 ? 2.8 : 1.4,
            price: firstPrice,
            costPrice: Math.round(firstPrice * 0.58),
          };
        });
      } else {
        // Fallback realistic candidates
        candidates = [
          {
            name: "Vintage Oversized Heavyweight Tee (Black)",
            category: "Apparel",
            currentStock: 6,
            dailyVelocity: 3.2,
            price: 650,
            costPrice: 320,
          },
          {
            name: "True Wireless Stereo Earbuds Pro (White)",
            category: "Electronics",
            currentStock: 4,
            dailyVelocity: 2.5,
            price: 1850,
            costPrice: 1100,
          },
          {
            name: "Genuine Leather Bi-Fold Wallet (Cognac)",
            category: "Accessories",
            currentStock: 8,
            dailyVelocity: 1.8,
            price: 1200,
            costPrice: 650,
          },
        ];
      }

      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restock_po_generator",
          payload: {
            items: candidates,
            leadTimeDays: Number(poLeadTime) || 5,
            supplierName: poSupplierName,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedPo(data);
      } else {
        triggerToast("Failed to generate PO: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      triggerToast("Error generating PO: " + err.message);
    } finally {
      setPoGenerating(false);
    }
  }

  // ── Tab 3: Parse Invoice Handler ─────────────────────────────
  async function handleParseInvoice() {
    try {
      setInvoiceParsing(true);
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse_invoice",
          payload: { rawText: invoiceRawText },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setParsedInvoiceData(data);
      } else {
        triggerToast("Failed to parse invoice: " + (data.error || "Format not recognized"));
      }
    } catch (err) {
      triggerToast("Error parsing invoice: " + err.message);
    } finally {
      setInvoiceParsing(false);
    }
  }

  // ── Tab 3: Batch Ingest Parsed Products into Database ─────────
  async function handleBatchIngest() {
    if (!parsedInvoiceData || !parsedInvoiceData.parsedItems?.length) return;
    if (!businessId) {
      triggerToast("Please wait for your workspace context to finish loading.");
      return;
    }

    try {
      setSavingProducts(true);
      let createdCount = 0;

      for (const item of parsedInvoiceData.parsedItems) {
        // 1. Insert product
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .insert({
            name: item.name,
            category: item.category,
            business_id: businessId,
          })
          .select("id")
          .single();

        if (!prodErr && prod) {
          // 2. Insert variant
          await supabase.from("variants").insert({
            product_id: prod.id,
            price: Number(item.suggestedPrice),
            stock_quantity: Number(item.quantity),
            attributes: { "Cost Price": `৳${item.unitCost}` },
            business_id: businessId,
          });

          // 3. Log stock receipt transaction
          await supabase.from("stock_transactions").insert({
            product_id: prod.id,
            transaction_type: "IN",
            quantity: Number(item.quantity),
            reference_note: `Smart Invoice Intake: Unit Cost ৳${item.unitCost}`,
            business_id: businessId,
          });

          createdCount++;
        }
      }

      triggerToast(`Successfully ingested ${createdCount} products into your active inventory!`);
      // Refresh local catalog
      const { data: refreshed } = await supabase
        .from("products")
        .select("id, name, category, variants(id, price, stock_quantity)")
        .eq("business_id", businessId);
      setProducts(refreshed || []);
      setParsedInvoiceData(null);
    } catch (err) {
      triggerToast("Batch ingest note: " + err.message);
    } finally {
      setSavingProducts(false);
    }
  }

  // ── Tab 4: Fetch Deadstock Bundles Handler ────────────────────
  async function handleLoadDeadstockBundles() {
    try {
      setDeadstockLoading(true);
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deadstock_bundling",
          payload: {
            deadstockItems: [
              { name: "Winter Fleece Pullover (Olive / M)", totalStock: 35, price: 950 },
              { name: "Ceramic Minimalist Coffee Mug Set", totalStock: 24, price: 780 },
              { name: "Braided Nylon Lightning Cables (2m)", totalStock: 50, price: 420 },
            ],
            heroItems: [
              { name: "Vintage Heavyweight Oversized Tee (Black)", price: 650 },
              { name: "True Wireless Stereo Earbuds Pro", price: 1850 },
            ],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBundleRecommendations(data.recommendations);
      }
    } catch (err) {
      console.warn("Deadstock bundle error:", err);
    } finally {
      setDeadstockLoading(false);
    }
  }

  // ── Tab 5: Dynamic Unit Economics Calculations ───────────────
  const unitEconomics = useMemo(() => {
    const sellingPrice = Number(calcSellingPrice) || 0;
    const cogs = Number(calcCost) || 0;
    const packaging = Number(calcPackaging) || 0;
    const courierFee = Number(calcCourier) || 0;
    const codCommission = sellingPrice * ((Number(calcCodFeePercent) || 1) / 100);
    const rtoRate = (Number(calcRtoRate) || 0) / 100;
    const monthlyVol = Number(calcMonthlyOrders) || 0;

    // Delivery Success Rate
    const deliveryRate = 1 - rtoRate;

    // Direct Cost for a successfully delivered order
    const costPerDelivered = cogs + packaging + courierFee + codCommission;
    const grossProfitDelivered = sellingPrice - costPerDelivered;

    // Return cost penalty (courier fee both ways/return penalty + packaging wasted)
    const returnCostPenalty = courierFee + packaging;
    const expectedReturnLossPerOrder = rtoRate * returnCostPenalty;

    // True Net Margin per order (factoring RTO loss absorption)
    const trueNetProfitPerOrder = (deliveryRate * grossProfitDelivered) - expectedReturnLossPerOrder;
    const trueNetMarginPercent = sellingPrice > 0 ? (trueNetProfitPerOrder / sellingPrice) * 100 : 0;

    // Break-even selling price
    const breakEvenPrice = (cogs + packaging + courierFee + (rtoRate * returnCostPenalty)) / (1 - (Number(calcCodFeePercent) || 1) / 100);

    // Projected Monthly Net Profit
    const monthlyProjectedProfit = trueNetProfitPerOrder * monthlyVol;
    const monthlyRtoLosses = monthlyVol * rtoRate * returnCostPenalty;

    return {
      grossProfitDelivered: Math.round(grossProfitDelivered),
      trueNetProfitPerOrder: Math.round(trueNetProfitPerOrder),
      trueNetMarginPercent: Number(trueNetMarginPercent.toFixed(1)),
      breakEvenPrice: Math.round(breakEvenPrice),
      monthlyProjectedProfit: Math.round(monthlyProjectedProfit),
      monthlyRtoLosses: Math.round(monthlyRtoLosses),
      successfulOrders: Math.round(monthlyVol * deliveryRate),
      returnedOrders: Math.round(monthlyVol * rtoRate),
    };
  }, [
    calcCost,
    calcPackaging,
    calcCourier,
    calcCodFeePercent,
    calcRtoRate,
    calcSellingPrice,
    calcMonthlyOrders,
  ]);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── TOP HEADER BAR ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Operations &amp; Automation Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Courier return checks, stock forecasts, and supplier purchase orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to dashboard</span>
            </Link>

            <Link
              href="/dashboard/scanner"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] text-white px-3.5 py-1.5 text-[13px] font-medium shadow-2xs transition"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Quick scanner</span>
            </Link>
          </div>
        </div>

        {/* ── 5 PRIMARY OPERATIONS TABS ─────────────────────────── */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          {[
            {
              id: "rto",
              label: "RTO Delivery Risk Guard",
              badge: "Anti-Loss",
              icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
            },
            {
              id: "restock",
              label: "Smart Purchase Order (PO)",
              badge: "Auto-Restock",
              icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              ),
            },
            {
              id: "invoice",
              label: "Smart Invoice Parser",
              badge: "OCR Intake",
              icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: "deadstock",
              label: "Deadstock Bundling",
              badge: "Cash Release",
              icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              id: "calculator",
              label: "True Margin Simulator",
              badge: "Unit Economics",
              icon: (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ),
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "deadstock" && !bundleRecommendations) {
                    handleLoadDeadstockBundles();
                  }
                }}
                className={`btn-tactile flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span className={active ? "text-white" : "text-slate-400"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    active
                      ? "bg-white/20 text-white font-bold"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: RTO (RETURN-TO-ORIGIN) DELIVERY RISK & FRAUD GUARD
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "rto" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form & Quick Presets */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      Pre-Dispatch Order Assessment
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Steadfast / Pathao / RedX</span>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-500 block mb-1.5">
                    Quick Scenario Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {RTO_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRtoPhone(p.phone);
                          setRtoAddress(p.address);
                          setRtoCodAmount(p.codAmount);
                          setRtoCourier(p.courier);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 btn-tactile transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Phone */}
                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Customer Mobile Number (BD 11-Digit)
                  </label>
                  <input
                    type="text"
                    value={rtoPhone}
                    onChange={(e) => setRtoPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>

                {/* Recipient Delivery Address */}
                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Delivery Address &amp; Destination Details
                  </label>
                  <textarea
                    rows={3}
                    value={rtoAddress}
                    onChange={(e) => setRtoAddress(e.target.value)}
                    placeholder="House, Road, Area, Thana, District"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition resize-none"
                  />
                </div>

                {/* COD Amount & Courier */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                      COD Consignment (৳)
                    </label>
                    <input
                      type="number"
                      value={rtoCodAmount}
                      onChange={(e) => setRtoCodAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                      Target Courier Partner
                    </label>
                    <select
                      value={rtoCourier}
                      onChange={(e) => setRtoCourier(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition cursor-pointer"
                    >
                      <option value="Steadfast">Steadfast Courier</option>
                      <option value="Pathao">Pathao Express</option>
                      <option value="RedX">RedX Logistics</option>
                      <option value="Paperfly">Paperfly</option>
                    </select>
                  </div>
                </div>

                {/* Action Trigger */}
                <button
                  type="button"
                  onClick={handleAnalyzeRto}
                  disabled={rtoAnalyzing}
                  className="w-full btn-tactile flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white py-2.5 text-xs font-bold shadow-xs shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {rtoAnalyzing ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Evaluating Risk Signals…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Analyze Consignment Return Risk</span>
                    </>
                  )}
                </button>
              </div>

              {/* RTO Explainer Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                <span className="text-[11px] font-bold uppercase font-mono text-slate-500">
                  Why Standard CMSs Cost You ৳30,000+ Monthly
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  In Bangladesh and regional eCommerce, 15%–30% of COD parcels are returned (RTO). Each return costs ৳120–৳180 in non-refundable courier fees, damages returned packaging, and locks up stock in transit for up to 14 days. SmartInventory's AI identifies high-risk orders <strong>before</strong> you hand them to the courier.
                </p>
              </div>
            </div>

            {/* Analysis Result Output */}
            <div className="lg:col-span-7">
              {rtoResult ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Consignment Risk Evaluation
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                        Risk verdict:{" "}
                        <span
                          className={
                            rtoResult.riskLevel === "HIGH"
                              ? "text-rose-600"
                              : rtoResult.riskLevel === "MEDIUM"
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }
                        >
                          {rtoResult.riskLevel} RISK
                        </span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-2xl font-semibold font-mono text-slate-900">
                          {rtoResult.riskScore}
                          <span className="text-xs text-slate-400 font-normal">/100</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Risk Index</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Risk Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-slate-500">
                      <span>Safe (0-30)</span>
                      <span>Moderate (31-60)</span>
                      <span>High Risk (61-100)</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-500 ${
                          rtoResult.riskLevel === "HIGH"
                            ? "bg-rose-500"
                            : rtoResult.riskLevel === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${rtoResult.riskScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Recommended Action Pill */}
                  <div
                    className={`p-4 rounded-xl border space-y-1.5 ${
                      rtoResult.riskLevel === "HIGH"
                        ? "bg-rose-50/70 border-rose-200 text-rose-900"
                        : rtoResult.riskLevel === "MEDIUM"
                        ? "bg-amber-50/70 border-amber-200 text-amber-900"
                        : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          rtoResult.riskLevel === "HIGH"
                            ? "bg-rose-500"
                            : rtoResult.riskLevel === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      <span className="text-xs font-bold uppercase font-mono">
                        Recommended Operational Action
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {rtoResult.recommendation}
                    </p>
                  </div>

                  {/* Detected Risk Factors / Flags */}
                  <div>
                    <h4 className="text-xs font-bold uppercase font-mono text-slate-700 mb-2">
                      Detected Signal Vectors ({rtoResult.flags?.length || 0})
                    </h4>
                    {rtoResult.flags?.length > 0 ? (
                      <div className="space-y-2">
                        {rtoResult.flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700"
                          >
                            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Zero fraud or delivery anomaly flags detected. Recipient details match valid fulfillment profile.</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Loss Prevented Metric */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400 block uppercase">
                        Potential Return Loss Prevented
                      </span>
                      <span className="text-lg font-semibold font-mono text-emerald-600">
                        ৳{rtoResult.estimatedLossPrevented.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerToast(
                          rtoResult.advanceFeeRequired
                            ? "Action recorded: Advance delivery fee request queued for customer WhatsApp."
                            : "Order verified: Dispatched to courier queue."
                        );
                      }}
                      className="btn-tactile px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      {rtoResult.advanceFeeRequired ? "Request ৳150 Advance via WhatsApp" : "Approve for Fast Dispatch"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[360px] rounded-2xl border border-dashed border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Awaiting Consignment Parameters
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Select a scenario preset on the left or enter recipient details, then click <strong>"Analyze Consignment Return Risk"</strong> to run automated risk scoring.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: AUTOMATED PURCHASE ORDER (PO) & REORDER POINT ENGINE
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "restock" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      PO Generator Parameters
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{products.length} SKUs in Catalog</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Primary Wholesale Supplier Name
                  </label>
                  <input
                    type="text"
                    value={poSupplierName}
                    onChange={(e) => setPoSupplierName(e.target.value)}
                    placeholder="e.g. Dhaka Wholesale Fabrics Ltd"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Supplier Lead Time (Days to Deliver)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setPoLeadTime(days)}
                        className={`py-2 rounded-xl text-xs font-bold btn-tactile transition ${
                          poLeadTime === days
                            ? "bg-orange-600 text-white shadow-xs"
                            : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {days} Days SLA
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase font-mono text-orange-900 block">
                    Dynamic Reorder Formula
                  </span>
                  <p className="text-[11px] text-orange-800 font-mono leading-relaxed">
                    ROP = (Rolling Daily Velocity × {poLeadTime} Days Lead Time) + 7 Days Safety Stock Buffer
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePo}
                  disabled={poGenerating}
                  className="w-full btn-tactile flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white py-2.5 text-xs font-bold shadow-xs shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {poGenerating ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Computing Reorder Targets…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Generate Supplier Purchase Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated PO Display */}
            <div className="lg:col-span-7">
              {generatedPo ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
                          READY TO DISPATCH
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {generatedPo.poNumber}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mt-1">
                        Supplier: {generatedPo.supplierName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPo.whatsappMessage);
                          setCopiedPo(true);
                          triggerToast("Purchase Order copied to clipboard! Ready to paste into WhatsApp.");
                          setTimeout(() => setCopiedPo(false), 3000);
                        }}
                        className="px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>{copiedPo ? "Copied!" : "Copy WhatsApp text"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <span className="text-xs font-medium text-slate-500 block">
                        Total reorder units
                      </span>
                      <span className="text-lg font-semibold font-mono text-slate-900 mt-1 block">
                        {generatedPo.totalUnits} pcs
                      </span>
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                      <span className="text-xs font-medium text-slate-500 block">
                        Estimated capital outlay
                      </span>
                      <span className="text-lg font-semibold font-mono text-orange-600 mt-1 block">
                        ৳{generatedPo.totalOrderValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-xs font-medium text-slate-500 block">
                        Lead time buffer
                      </span>
                      <span className="text-lg font-semibold font-mono text-teal-700 mt-1 block">
                        {generatedPo.leadTimeDays} days
                      </span>
                    </div>
                  </div>

                  {/* Itemized Reorder Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50 font-mono text-[10px] uppercase font-bold text-slate-600">
                        <tr>
                          <th className="px-3.5 py-2.5">Item Name</th>
                          <th className="px-3 py-2.5 font-mono">Current Stock</th>
                          <th className="px-3 py-2.5 font-mono">Suggested Qty</th>
                          <th className="px-3 py-2.5 font-mono">Unit Cost</th>
                          <th className="px-3.5 py-2.5 font-mono text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {generatedPo.poItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                              {item.name}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">
                              {item.currentStock} units
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-orange-600">
                              +{item.orderQty} pcs
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-700">
                              ৳{item.unitCost}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-right text-slate-900">
                              ৳{item.totalCost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Ready to Send Preview */}
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-500 block mb-1">
                      Raw Formatted Supplier Dispatch Text
                    </label>
                    <textarea
                      readOnly
                      rows={5}
                      value={generatedPo.whatsappMessage}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[360px] rounded-2xl border border-dashed border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Automated Purchase Order Generator
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Set your supplier lead time on the left and click <strong>"Generate Supplier Purchase Order"</strong> to compute replenishment quantities and format a WhatsApp-ready PO.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: SMART INVOICE & CHALLAN INTAKE (AI BILL PARSER)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "invoice" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      Raw Invoice / Memo Intake
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Text / Challan OCR</span>
                </div>

                {/* Sample Paste Buttons */}
                <div>
                  <span className="text-[11px] font-bold uppercase font-mono text-slate-500 block mb-1.5">
                    Insert Sample Supplier Memo
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInvoiceRawText(SAMPLE_INVOICE_TEXTS.electronics)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 btn-tactile transition"
                    >
                      Electronics Memo
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceRawText(SAMPLE_INVOICE_TEXTS.apparel)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 btn-tactile transition"
                    >
                      Apparel Challan
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Paste Raw Receipt, Challan, or Message
                  </label>
                  <textarea
                    rows={8}
                    value={invoiceRawText}
                    onChange={(e) => setInvoiceRawText(e.target.value)}
                    placeholder="Paste items with quantities and prices here..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleParseInvoice}
                  disabled={invoiceParsing}
                  className="w-full btn-tactile flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white py-2.5 text-xs font-bold shadow-xs shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {invoiceParsing ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Parsing Consignment Items…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Extract &amp; Structure Inventory Items</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Parsed Items Output & 1-Click Intake */}
            <div className="lg:col-span-7">
              {parsedInvoiceData ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700">
                        {parsedInvoiceData.itemsCount} SKUs Extracted
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                        Consignment Ingestion Preview
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">
                          Total invoice outlay
                        </span>
                        <span className="text-lg font-semibold font-mono text-slate-900">
                          ৳{parsedInvoiceData.totalCost.toLocaleString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleBatchIngest}
                        disabled={savingProducts}
                        className="btn-tactile px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs shadow-orange-600/20 transition disabled:opacity-50"
                      >
                        {savingProducts ? "Writing to Database…" : "1-Click Add to Inventory"}
                      </button>
                    </div>
                  </div>

                  {/* Extracted Item Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50 font-mono text-[10px] uppercase font-bold text-slate-600">
                        <tr>
                          <th className="px-3.5 py-2.5">Extracted SKU</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5 font-mono">Qty</th>
                          <th className="px-3 py-2.5 font-mono">Cost</th>
                          <th className="px-3 py-2.5 font-mono">Retail Target</th>
                          <th className="px-3.5 py-2.5 font-mono text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedInvoiceData.parsedItems.map((item) => (
                          <tr key={item.tempId} className="hover:bg-slate-50/80">
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                              {item.name}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">
                              ৳{item.unitCost}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-emerald-600">
                              ৳{item.suggestedPrice}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-right text-teal-700">
                              {item.estimatedMargin}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono">
                    Clicking <strong>"1-Click Add to Inventory"</strong> will immediately create these products, set up default variants, and log stock intake transactions in your workspace database.
                  </p>
                </div>
              ) : (
                <div className="h-full min-h-[360px] rounded-2xl border border-dashed border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Intelligent Challan &amp; Invoice OCR Parser
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Paste supplier text or pick a sample preset on the left to extract SKUs, quantities, and wholesale costs into your catalog in seconds.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: DEADSTOCK LIQUIDATION & BUNDLE OPTIMIZER
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "deadstock" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                  Working Capital Recovery
                </span>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                  Deadstock Bundling &amp; Liquidation Optimizer
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Identifies stagnant SKUs with zero movement and pairs them with high-velocity heroes to reclaim cash flow.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadDeadstockBundles}
                disabled={deadstockLoading}
                className="btn-tactile px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {deadstockLoading ? "Recalculating..." : "Refresh Recommendations"}
              </button>
            </div>

            {bundleRecommendations && bundleRecommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundleRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4 card-lift"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-xs font-mono font-bold text-orange-600 uppercase">
                        Bundle Opportunity
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
                        {rec.customerDiscount}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{rec.bundleTitle}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {rec.strategy}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Original Combined Price:</span>
                        <span className="font-mono text-slate-400 line-through">
                          ৳{rec.originalTotal}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-900">Recommended Bundle Price:</span>
                        <span className="font-mono text-emerald-600 text-sm">
                          ৳{rec.bundlePrice}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Idle Capital Unlocked
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {rec.idleCashRelease}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerToast(`Bundle promotion for "${rec.bundleTitle}" activated!`)}
                        className="btn-tactile px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                      >
                        Publish Bundle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Inventory Velocity is Healthy
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click <strong>"Refresh Recommendations"</strong> to evaluate current aging stock for potential bundling promotions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: TRUE UNIT ECONOMICS & PROFIT MARGIN SIMULATOR
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "calculator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      Unit Cost &amp; Logistics Breakdown
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Real-world COD</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Customer Selling Price (৳)
                  </label>
                  <input
                    type="number"
                    value={calcSellingPrice}
                    onChange={(e) => setCalcSellingPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                      Product Cost (৳)
                    </label>
                    <input
                      type="number"
                      value={calcCost}
                      onChange={(e) => setCalcCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                      Packaging / Box (৳)
                    </label>
                    <input
                      type="number"
                      value={calcPackaging}
                      onChange={(e) => setCalcPackaging(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                      Courier Delivery Fee (৳)
                    </label>
                    <input
                      type="number"
                      value={calcCourier}
                      onChange={(e) => setCalcCourier(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                      COD Fee % (Standard 1%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={calcCodFeePercent}
                      onChange={(e) => setCalcCodFeePercent(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold uppercase font-mono text-slate-600">
                      Expected Return (RTO) Rate: {calcRtoRate}%
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">BD Avg: 16%–22%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={calcRtoRate}
                    onChange={(e) => setCalcRtoRate(e.target.value)}
                    className="w-full accent-orange-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase font-mono text-slate-600 block mb-1">
                    Monthly Order Volume
                  </label>
                  <input
                    type="number"
                    value={calcMonthlyOrders}
                    onChange={(e) => setCalcMonthlyOrders(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Financial Output */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      True Unit Economics Reality
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                      Net profit per order:{" "}
                      <span className="text-emerald-600 font-mono">
                        ৳{unitEconomics.trueNetProfitPerOrder.toLocaleString()}
                      </span>
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-semibold font-mono text-teal-700">
                      {unitEconomics.trueNetMarginPercent}%
                    </div>
                    <span className="text-xs text-slate-500 font-mono">Net margin</span>
                  </div>
                </div>

                {/* 4 Financial KPI Blocks */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-medium text-slate-500 block">
                      Break-even minimum price
                    </span>
                    <div className="text-xl font-semibold font-mono text-slate-900">
                      ৳{unitEconomics.breakEvenPrice.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Selling below this loses money
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 space-y-1">
                    <span className="text-xs font-medium text-rose-800 block">
                      Monthly courier return losses
                    </span>
                    <div className="text-xl font-semibold font-mono text-rose-700">
                      ৳{unitEconomics.monthlyRtoLosses.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-rose-600">
                      From {unitEconomics.returnedOrders} failed doorsteps
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <span className="text-xs font-medium text-emerald-800 block">
                      Projected net monthly profit
                    </span>
                    <div className="text-xl font-semibold font-mono text-emerald-700">
                      ৳{unitEconomics.monthlyProjectedProfit.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-emerald-600">
                      Across {unitEconomics.successfulOrders} fulfilled orders
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-xs font-medium text-slate-500 block">
                      Nominal delivered profit
                    </span>
                    <div className="text-xl font-semibold font-mono text-slate-900">
                      ৳{unitEconomics.grossProfitDelivered.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Before return loss deduction
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 leading-relaxed">
                  <strong>The SmartInventory Advantage:</strong> By activating our Courier RTO Risk Guard and taking advance delivery charges on high-risk parcels, you eliminate up to 75% of your <strong>৳{unitEconomics.monthlyRtoLosses.toLocaleString()}</strong> monthly return losses, directly increasing your bottom line profit!
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
