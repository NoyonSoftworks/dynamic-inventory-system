"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

export default function ClientBillingPage() {
  const { businessId, businessName, loading: ctxLoading } =
    useBusinessContext();

  const [loading, setLoading] = useState(true);
  const [currentMonthOrders, setCurrentMonthOrders] = useState(0);
  const [totalAllTimeOrders, setTotalAllTimeOrders] = useState(0);

  // Dynamic settings fetched from saas_settings table (NOT hardcoded)
  const [pricingConfig, setPricingConfig] = useState({
    pro_plan_price: 49.0,
    free_order_limit: 100,
    bdt_exchange_rate: 122.0,
  });

  // Upgrade Modal State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [processingUpgrade, setProcessingUpgrade] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // ── Days Left in Current Calendar Month (Computed on client in useEffect)
  const [daysLeftInMonth, setDaysLeftInMonth] = useState(15);

  // ── Fetch Dynamic SaaS Settings & Client Monthly Orders ─────
  useEffect(() => {
    let isMounted = true;

    async function loadBillingData() {
      if (ctxLoading) return;

      try {
        setLoading(true);

        // 0. Compute days left in current month
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (isMounted) {
          setDaysLeftInMonth(Math.max(1, lastDay.getDate() - now.getDate()));
        }

        // 1. Fetch Dynamic Pricing & Order Limit from API
        const settingsRes = await fetch("/api/admin/settings?public=true");
        if (settingsRes.ok) {
          const json = await settingsRes.json();
          if (json.settings) {
            setPricingConfig({
              pro_plan_price: Number(json.settings.pro_plan_price) || 49.0,
              free_order_limit:
                parseInt(json.settings.free_order_limit, 10) || 100,
              bdt_exchange_rate:
                Number(json.settings.bdt_exchange_rate) || 122.0,
            });
          }
        }

        // 2. Query Tenant's Orders for the current calendar month
        if (businessId) {
          const now = new Date();
          const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          ).toISOString();

          // Orders this month
          const { count: monthCount, error: monthErr } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .gte("created_at", startOfMonth);

          if (!monthErr && monthCount !== null) {
            setCurrentMonthOrders(monthCount);
          }

          // Total all-time orders
          const { count: allCount, error: allErr } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId);

          if (!allErr && allCount !== null) {
            setTotalAllTimeOrders(allCount);
          }
        }
      } catch (err) {
        console.warn("Billing data fetch note:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBillingData();

    return () => {
      isMounted = false;
    };
  }, [businessId, ctxLoading]);

  // ── Usage Metrics ──────────────────────────────────────────
  const limit = pricingConfig.free_order_limit;
  const usagePercentage = Math.min(
    100,
    Math.round((currentMonthOrders / limit) * 100)
  );

  // Status color based on percentage
  const usageColor =
    usagePercentage >= 90
      ? "rose"
      : usagePercentage >= 75
      ? "amber"
      : "emerald";

  // ── Simulated Checkout Upgrade Action ──────────────────────
  const handleConfirmUpgrade = async () => {
    setProcessingUpgrade(true);
    setTimeout(() => {
      setProcessingUpgrade(false);
      setUpgradeSuccess(true);
    }, 1500);
  };

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading billing telemetry…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* ── Top Bar Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5 sm:px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition"
              title="Return to Catalog"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <span>🏢</span> {businessName || "My Store"}
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-normal">Subscription &amp; Usage</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Billing &amp; Subscription Quota
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition"
          >
            <span>⚡</span>
            <span>Upgrade to Pro</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 space-y-8">
        {/* ── CURRENT PLAN & MONTHLY USAGE PROGRESS BAR ──────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-800/80">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Current Plan: Free Tier
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Monthly Order Consumption
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your workspace includes{" "}
                <span className="text-indigo-400 font-bold">{limit} free orders</span> each
                month. All-time orders processed:{" "}
                <span className="text-slate-300 font-mono font-bold">
                  {totalAllTimeOrders.toLocaleString()}
                </span>
                .
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Billing Cycle Resets In
              </div>
              <div className="text-3xl font-black text-white font-mono mt-1">
                {daysLeftInMonth} {daysLeftInMonth === 1 ? "Day" : "Days"}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Next cycle: 1st of next month
              </div>
            </div>
          </div>

          {/* Progress Bar & Quota Gauge */}
          <div className="relative z-10 pt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-2">
                <span>📦 Monthly Dispatched Orders:</span>
                <span className="font-mono text-white text-sm">
                  {currentMonthOrders} / {limit}
                </span>
              </span>
              <span
                className={`font-mono text-xs ${
                  usageColor === "rose"
                    ? "text-rose-400"
                    : usageColor === "amber"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {usagePercentage}% Quota Used
              </span>
            </div>

            {/* Glowing animated progress track */}
            <div className="h-3 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${
                  usageColor === "rose"
                    ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-rose-500/50"
                    : usageColor === "amber"
                    ? "bg-gradient-to-r from-emerald-500 to-amber-500 shadow-amber-500/50"
                    : "bg-gradient-to-r from-indigo-500 to-emerald-400 shadow-emerald-400/50"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>

            {usagePercentage >= 85 && (
              <div className="mt-2 text-xs text-amber-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  You have consumed {usagePercentage}% of your monthly allowance. Upgrade to Pro
                  to prevent dispatch disruptions.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── PLAN COMPARISON TIERS ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Tier 1: Free Tier */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                Starter Tier
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Community Edition</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white font-mono">$0</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Ideal for testing new eCommerce storefronts and early-stage merchants.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Up to {limit} orders per calendar month
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Serialized Barcode Printing (2x1)
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Mobile Camera Barcode Scanner
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400">✓</span> Steadfast Courier Consignment Integration
                </div>
                <div className="flex items-center gap-2.5 text-slate-500">
                  <span>✕</span> Priority Automated WhatsApp/SMS Notifications
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 py-3 text-xs font-bold text-slate-400 cursor-not-allowed"
            >
              Current Active Plan
            </button>
          </div>

          {/* Tier 2: Pro Plan (Dynamic Pricing) */}
          <div className="relative rounded-3xl border-2 border-indigo-500/50 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl shadow-indigo-500/10">
            {/* Glowing top badge */}
            <div className="absolute -top-3.5 right-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                ★ Highly Recommended
              </span>
            </div>

            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300">
                Pro Growth Tier
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Full Automation Pro</h3>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-black text-white font-mono">
                    ${pricingConfig.pro_plan_price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    ৳{Math.round(pricingConfig.pro_plan_price * pricingConfig.bdt_exchange_rate).toLocaleString()} BDT
                  </span>
                </div>
                <p className="text-xs text-indigo-200/70 mt-2">
                  Uncapped order processing, instant customer tracking alerts, and multi-user roles.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="font-bold text-white">Unlimited Orders</span> (Zero monthly caps)
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Instant WhatsApp &amp; SMS Dispatch Notifications</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Advanced Multi-Carrier Routing (Steadfast, Pathao, RedX)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Unlimited Operator &amp; Viewer Team Accounts</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>99.98% SLA Uptime &amp; Priority 24/7 Support</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-xs font-bold text-white shadow-xl shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700 transition"
            >
              <span>🚀</span>
              <span>Upgrade to Pro Plan (${pricingConfig.pro_plan_price.toFixed(2)} USD · ৳{Math.round(pricingConfig.pro_plan_price * pricingConfig.bdt_exchange_rate).toLocaleString()} BDT)</span>
            </button>
          </div>
        </div>

        {/* ── FAQ & SECURITY CALLOUT ─────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Frequently Asked Questions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
            <div>
              <div className="font-semibold text-slate-200">
                What happens when I reach {limit} orders?
              </div>
              <p className="mt-1">
                Your catalog and scanner remain accessible, but new courier dispatches will request an upgrade to Pro.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-200">
                Can I cancel anytime?
              </div>
              <p className="mt-1">
                Yes, you can downgrade or pause your subscription at any time without long-term contracts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── UPGRADE CHECKOUT MODAL ─────────────────────────────── */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />

            {!upgradeSuccess ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xl">
                      💎
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">Upgrade to Pro</h3>
                      <p className="text-xs text-slate-400">
                        {businessName || "Your Workspace"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpgradeModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Plan:</span>
                    <span className="text-white font-bold">Pro Enterprise Monthly</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Order Allowance:</span>
                    <span className="text-emerald-400 font-bold">Unlimited</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-sm">
                    <span className="text-white font-bold">Total Due Today:</span>
                    <span className="text-xl font-black text-indigo-400 font-mono">
                      ${pricingConfig.pro_plan_price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Payment Method:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border-2 border-indigo-500 bg-indigo-950/20 p-2.5 text-center text-xs font-bold text-white">
                      💳 Card
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-center text-xs font-bold text-slate-300">
                      📱 bKash
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-center text-xs font-bold text-slate-300">
                      ⚡ Nagad
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUpgradeModalOpen(false)}
                    disabled={processingUpgrade}
                    className="w-1/2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpgrade}
                    disabled={processingUpgrade}
                    className="w-1/2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {processingUpgrade ? "Activating…" : "Confirm Upgrade"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-3xl">
                  🎉
                </div>
                <h3 className="text-xl font-black text-white">
                  Welcome to Pro Enterprise!
                </h3>
                <p className="text-xs text-slate-400">
                  Your store now has unlimited monthly order capacity and automated WhatsApp/SMS notifications enabled.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalOpen(false);
                    setUpgradeSuccess(false);
                  }}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition"
                >
                  Got It
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
