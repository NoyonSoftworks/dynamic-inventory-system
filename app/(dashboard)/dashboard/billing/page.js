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

  // Upgrade Modal & Payment Gateway State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [processingUpgrade, setProcessingUpgrade] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeError, setUpgradeError] = useState(null);
  const [isProPlan, setIsProPlan] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);

  // Days Left in Current Calendar Month
  const [daysLeftInMonth, setDaysLeftInMonth] = useState(15);

  useEffect(() => {
    let isMounted = true;

    async function loadBillingData() {
      if (ctxLoading) return;

      try {
        setLoading(true);

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

          // 3. Check Workspace Subscription Status
          try {
            const { data: bizData } = await supabase
              .from("businesses")
              .select("subscription_plan")
              .eq("id", businessId)
              .maybeSingle();

            if (bizData?.subscription_plan === "pro") {
              setIsProPlan(true);
            }
          } catch {
            // column might not exist in dev
          }

          // 4. Check URL query parameters for payment return state
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const paymentStatus = params.get("payment");
            if (paymentStatus === "success") {
              setUpgradeSuccess(true);
              setIsProPlan(true);
              setUpgradeModalOpen(true);
            } else if (paymentStatus === "failed") {
              setPaymentNotice({
                type: "error",
                message:
                  "Payment transaction could not be completed. Your account was not charged. Please try again.",
              });
            } else if (paymentStatus === "cancelled") {
              setPaymentNotice({
                type: "warning",
                message:
                  "Checkout session was cancelled. Your workspace remains on the Free starter tier.",
              });
            }
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

  // Usage Metrics
  const limit = pricingConfig.free_order_limit;
  const usagePercentage = isProPlan
    ? 0
    : Math.min(100, Math.round((currentMonthOrders / limit) * 100));

  const handleConfirmUpgrade = async () => {
    try {
      setProcessingUpgrade(true);
      setUpgradeError(null);

      const res = await fetch("/api/payment/sslcommerz/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.gatewayUrl) {
        throw new Error(
          data.error || "Failed to initialize payment gateway session."
        );
      }

      window.location.href = data.gatewayUrl;
    } catch (err) {
      console.error("Upgrade initialization error:", err);
      setUpgradeError(
        err.message || "Failed to initialize payment gateway. Please try again."
      );
      setProcessingUpgrade(false);
    }
  };

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#0b1120] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs font-mono text-slate-400">Loading billing telemetry…</p>
        </div>
      </main>
    );
  }

  const bdtPrice = Math.round(
    pricingConfig.pro_plan_price * pricingConfig.bdt_exchange_rate
  );

  return (
    <main className="min-h-screen bg-[#0b1120] text-[#fafafa] font-sans pb-16">
      {/* ── Top Bar Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0b1120]/80 backdrop-blur-md border-b border-[#1e293b] px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[#1e293b] bg-[#131d31] text-slate-400 hover:text-[#fafafa] hover:border-slate-700 btn-tactile transition"
              title="Return to Catalog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>{businessName || "Workspace"}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-200 font-medium">Billing &amp; Subscription</span>
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-[#fafafa]">
                Subscription Quota &amp; Plans
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProPlan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/80 text-xs font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Pro Enterprise Active
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-500 btn-tactile transition"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-6">
        {/* ── Payment Status Notice ──────────────────────────────── */}
        {paymentNotice && (
          <div
            className={`rounded-xl border p-4 text-xs flex items-start justify-between gap-3 ${
              paymentNotice.type === "error"
                ? "bg-rose-950/40 border-rose-800/80 text-rose-300"
                : "bg-amber-950/40 border-amber-800/80 text-amber-300"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">
                  {paymentNotice.type === "error" ? "Payment Failed" : "Checkout Cancelled"}
                </p>
                <p className="mt-0.5 text-zinc-400">{paymentNotice.message}</p>
              </div>
            </div>
            <button
              onClick={() => setPaymentNotice(null)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Usage Telemetry Card ───────────────────────────────── */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 shadow-xs card-lift">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1e293b]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Current Plan</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isProPlan
                      ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/80"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isProPlan ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  />
                  {isProPlan ? "Pro Plan" : "Free Starter"}
                </span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#fafafa]">
                Monthly Order Capacity
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isProPlan
                  ? "Your workspace is operating with uncapped monthly orders."
                  : `Your free quota covers up to ${limit} orders per calendar month.`}
                {" "}All-time orders processed:{" "}
                <span className="font-mono font-medium text-slate-200">
                  {totalAllTimeOrders.toLocaleString()}
                </span>
                .
              </p>
            </div>

            <div className="sm:text-right">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                Cycle Reset
              </div>
              <div className="text-2xl font-bold font-mono text-[#fafafa] mt-0.5">
                {daysLeftInMonth} {daysLeftInMonth === 1 ? "day" : "days"}
              </div>
              <div className="text-[11px] text-slate-500">
                Next cycle begins on 1st of next month
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Orders used this month:{" "}
                <span className="font-mono font-bold text-[#fafafa]">
                  {currentMonthOrders}
                </span>{" "}
                <span className="text-slate-500">/ {isProPlan ? "∞" : limit}</span>
              </span>
              <span className="font-mono text-slate-400 text-xs">
                {isProPlan ? "0% (Uncapped)" : `${usagePercentage}% utilized`}
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isProPlan
                    ? "bg-emerald-500"
                    : usagePercentage >= 90
                    ? "bg-rose-500"
                    : usagePercentage >= 75
                    ? "bg-amber-500"
                    : "bg-orange-500"
                }`}
                style={{ width: `${isProPlan ? 100 : usagePercentage}%` }}
              />
            </div>

            {!isProPlan && usagePercentage >= 85 && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  You have utilized {usagePercentage}% of your monthly allowance. Upgrade to Pro to prevent courier dispatch locks.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* ── Plan Comparison Cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Plan 1: Free Starter */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 flex flex-col justify-between space-y-6 card-lift">
            <div className="space-y-4">
              <div className="inline-flex rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-mono font-medium text-slate-300">
                Community Tier
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#fafafa]">Starter</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono text-[#fafafa]">$0</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Essential tools for launching a new eCommerce store and testing physical dispatch.
                </p>
              </div>

              <div className="pt-4 border-t border-[#1e293b] space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Up to {limit} orders per calendar month</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Thermal Barcode Printing (Standard 2x1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>In-Browser WebAssembly Camera Scanner</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Steadfast Courier Consignment Integration</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Automated WhatsApp &amp; SMS Customer Alerts</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-[#1e293b] bg-slate-800/50 py-2.5 text-xs font-semibold text-slate-500 cursor-default"
            >
              {!isProPlan ? "Current Workspace Plan" : "Included"}
            </button>
          </div>

          {/* Plan 2: Pro Growth */}
          <div className="rounded-2xl border-2 border-orange-500 bg-[#131d31] p-6 flex flex-col justify-between space-y-6 shadow-xl relative card-lift">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex rounded-md bg-orange-600 px-2.5 py-1 text-xs font-mono font-bold text-white shadow-xs">
                  Pro Growth Tier
                </span>
                <span className="text-[11px] font-mono text-orange-400 font-semibold">
                  Cancel anytime
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#fafafa]">Full Automation Pro</h3>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[#fafafa]">
                    ${pricingConfig.pro_plan_price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                  <span className="text-xs font-mono font-bold text-orange-300 bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-800/80">
                    ৳{bdtPrice.toLocaleString()} BDT
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full capacity for growing merchants processing high daily order volumes with automated courier routing.
                </p>
              </div>

              <div className="pt-4 border-t border-[#1e293b] space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-bold text-white">Unlimited Monthly Orders</span>
                  <span className="text-slate-500">(No overage fees)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Automated WhatsApp &amp; SMS Dispatch Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multi-Carrier Routing (Steadfast, Pathao, RedX)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Unlimited Operator &amp; Viewer Team Accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Demand Forecasting &amp; Runway Analytics</span>
                </div>
              </div>
            </div>

            {isProPlan ? (
              <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/80 py-2.5 text-center text-xs font-semibold text-emerald-300">
                Current Active Plan
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-500 btn-tactile transition"
              >
                <span>Upgrade to Pro Plan</span>
                <span className="font-mono text-orange-200">· ৳{bdtPrice.toLocaleString()} BDT</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Trust & Security Footer Callout ─────────────────────── */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#131d31] p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>256-Bit SSL Encryption</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All transactions are tokenized and processed through SSLCommerz's bank-grade, PCI-DSS Level 1 certified gateway infrastructure.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Local &amp; Global Methods</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full support for bKash, Nagad, Rocket, Visa, Mastercard, American Express, and direct internet banking channels.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Zero Long-Term Lock-in</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Subscriptions renew on a monthly cycle. You can change your plan or pause dispatch quotas at any time from this console.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── UPGRADE CHECKOUT MODAL ─────────────────────────────── */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 shadow-2xl space-y-5">
            {!upgradeSuccess ? (
              <>
                <div className="flex items-start justify-between pb-3 border-b border-[#1e293b]">
                  <div>
                    <h3 className="text-base font-bold text-[#fafafa]">
                      Upgrade to Pro Enterprise
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Workspace: {businessName || "Primary Store"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      setUpgradeError(null);
                    }}
                    className="text-slate-400 hover:text-slate-200 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {upgradeError && (
                  <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300">
                    <p className="font-semibold">Unable to initiate checkout</p>
                    <p className="mt-0.5">{upgradeError}</p>
                  </div>
                )}

                {/* Line Item Invoice Breakdown */}
                <div className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Plan:</span>
                    <span className="font-semibold text-slate-200">Pro Enterprise (Monthly)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Order Cap:</span>
                    <span className="font-semibold text-emerald-400">Unlimited Orders</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Billing Cycle:</span>
                    <span className="font-mono text-slate-300">30 Calendar Days</span>
                  </div>
                  <div className="pt-2.5 border-t border-[#1e293b] flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-200">Total Due Today:</span>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono text-[#fafafa]">
                        ৳{bdtPrice.toLocaleString()} BDT
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        (${pricingConfig.pro_plan_price.toFixed(2)} USD)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                    Supported Payment Methods
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-[#1e293b] bg-[#0b1120] p-2.5 text-center text-xs font-medium text-slate-300 font-mono">
                      Card (Visa/MC)
                    </div>
                    <div className="rounded-lg border border-[#1e293b] bg-[#0b1120] p-2.5 text-center text-xs font-medium text-slate-300 font-mono">
                      bKash
                    </div>
                    <div className="rounded-lg border border-[#1e293b] bg-[#0b1120] p-2.5 text-center text-xs font-medium text-slate-300 font-mono">
                      Nagad / Rocket
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      setUpgradeError(null);
                    }}
                    disabled={processingUpgrade}
                    className="w-1/3 rounded-xl border border-[#1e293b] bg-[#0b1120] py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 btn-tactile transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpgrade}
                    disabled={processingUpgrade}
                    className="w-2/3 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-500 btn-tactile transition disabled:opacity-50"
                  >
                    {processingUpgrade ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Connecting to Gateway…</span>
                      </>
                    ) : (
                      <span>Proceed to SSLCommerz</span>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Redirects to SSLCommerz 3D Secure Hosted Checkout
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#fafafa]">
                    Welcome to Pro Enterprise
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your workspace now has unlimited order capacity and automated notifications enabled.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalOpen(false);
                    setUpgradeSuccess(false);
                  }}
                  className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-500 btn-tactile transition"
                >
                  Continue to Catalog
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
