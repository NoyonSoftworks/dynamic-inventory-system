"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useBusinessContext } from "@/utils/supabase/business";

export default function ClientBillingPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState({
    plan: "trial",
    status: "Trial",
    expiresAt: null,
    daysRemaining: 15,
    isTrial: true,
    isExpired: false,
    orderLimit: 150,
    skuLimit: 50,
    currentMonthOrders: 0,
    totalAllTimeOrders: 0,
    currentSkuCount: 0,
  });

  const [gatewaySettings, setGatewaySettings] = useState({
    bkash_number: "01753082749",
    nagad_number: "01753082749",
    admin_phone: "01753082749",
    support_phone: "01753082749",
    support_whatsapp: "8801753082749",
    support_hours: "10:00 AM - 11:00 PM (Daily)",
    starter_plan_price_bdt: 999,
    growth_plan_price_bdt: 1990,
    enterprise_plan_price_bdt: 4990,
    starter_order_limit: 300,
    growth_order_limit: 1500,
    enterprise_order_limit: 5000,
    sslcommerz_configured: false,
  });

  // Upgrade Modal & Manual TrxID State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("growth");
  const [paymentMethodTab, setPaymentMethodTab] = useState("bkash"); // 'bkash' | 'sslcommerz'
  const [senderPhone, setSenderPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);

      const [subRes, setRes] = await Promise.all([
        fetch("/api/tenant/subscription"),
        fetch("/api/admin/settings?public=true"),
      ]);

      if (subRes.ok) {
        const json = await subRes.json();
        if (json.success) {
          setSubData(json);
        }
      }

      if (setRes.ok) {
        const json = await setRes.json();
        if (json.settings) {
          setGatewaySettings((prev) => ({
            ...prev,
            ...json.settings,
          }));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch subscription:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ctxLoading) {
      fetchSubscription();
    }
  }, [ctxLoading, fetchSubscription]);

  const handleManualPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!senderPhone || !trxId) {
      showToast("error", "Please provide sender phone number and Transaction ID (TrxID).");
      return;
    }

    setSubmittingPayment(true);
    try {
      const planPriceMap = {
        starter: gatewaySettings.starter_plan_price_bdt || 999,
        growth: gatewaySettings.growth_plan_price_bdt || 1990,
        enterprise: gatewaySettings.enterprise_plan_price_bdt || 4990,
      };

      const res = await fetch("/api/tenant/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          plan: selectedPlan === "starter" ? "Starter Plan" : selectedPlan === "enterprise" ? "Enterprise" : "Growth Pro",
          amount: planPriceMap[selectedPlan] || 1990,
          method: paymentMethodTab === "bkash" ? "bKash Personal" : "Nagad Personal",
          senderPhone,
          trxId,
          notes: paymentNotes || `Manual subscription payment submission for ${businessName}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit payment.");
      }

      showToast("success", "TrxID submitted! Super Admin will review and credit 30 days validity.");
      setModalOpen(false);
      setSenderPhone("");
      setTrxId("");
      setPaymentNotes("");
    } catch (err) {
      showToast("error", err.message || "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOnlineCheckout = async () => {
    try {
      setSubmittingPayment(true);
      const res = await fetch("/api/payment/sslcommerz/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.gatewayUrl) {
        throw new Error(data.error || "Online gateway is not active. Please use bKash / Nagad direct payment.");
      }
      window.location.href = data.gatewayUrl;
    } catch (err) {
      showToast("error", err.message);
      setSubmittingPayment(false);
    }
  };

  if (ctxLoading || loading) {
    return (
      <main className="min-h-screen bg-[#F4F6F8] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <p className="text-xs text-slate-500 font-mono">Loading subscription…</p>
        </div>
      </main>
    );
  }

  const {
    plan,
    status,
    expiresAt,
    daysRemaining,
    isTrial,
    isExpired,
    orderLimit,
    currentMonthOrders,
    totalAllTimeOrders,
  } = subData;

  const usagePercentage = Math.min(100, Math.round(((currentMonthOrders || 0) / (orderLimit || 1)) * 100));

  const planTitles = {
    starter: "Starter Plan",
    growth: "Growth Pro",
    enterprise: "Enterprise Tier",
    trial: "15-Day Free Trial",
  };

  const formatExpiryDate = (d) => {
    if (!d) return "Unlimited";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-[#F4F6F8] text-slate-900 font-sans pb-16">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 sm:px-6 shadow-2xs">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs"
              title="Return to Dashboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>{businessName || "My Store"}</span>
                <span>/</span>
                <span className="text-slate-600">Billing &amp; Subscription</span>
              </div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                Subscription Quota &amp; Plans
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTrial ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Trial Active ({daysRemaining} {daysRemaining === 1 ? "day" : "days"} left)
              </span>
            ) : status === "Active" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active Subscription
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                Plan Expired
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedPlan("growth");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-slate-800 transition"
            >
              <span>{isTrial ? "Upgrade Plan" : "Renew / Change Plan"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className={`rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-slate-900 text-white border-slate-800"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">
        {/* ── Top Hero Card: Current Plan & Quota ────────────────── */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Current Plan
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border ${
                    isTrial
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {isTrial ? "Trial Mode" : status}
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  {planTitles[plan] || "Growth Pro"}
                </span>
              </div>

              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {isTrial ? "Trial Order Capacity" : "Monthly Order Capacity"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {isTrial
                  ? `Your store has a 15-day trial covering up to ${orderLimit.toLocaleString()} monthly courier orders.`
                  : `Your plan covers up to ${orderLimit.toLocaleString()} monthly courier orders.`}{" "}
                All-time processed:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {totalAllTimeOrders.toLocaleString()} orders
                </span>
                .
              </p>
            </div>

            {/* Cycle Expiration Counter */}
            <div className="sm:text-right bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {isTrial ? "Trial Expiration" : "Subscription Cycle"}
              </div>
              <div className="text-2xl font-semibold font-mono text-slate-900 mt-0.5">
                {isExpired ? (
                  <span className="text-rose-600">Expired</span>
                ) : (
                  <>
                    {daysRemaining} <span className="text-xs text-slate-500 font-sans font-normal">{daysRemaining === 1 ? "day left" : "days left"}</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                {expiresAt ? `${isTrial ? "Trial ends" : "Renews"}: ${formatExpiryDate(expiresAt)}` : "No expiration"}
              </div>
            </div>
          </div>

          {/* Quota Usage Progress Bar */}
          <div className="pt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Orders used this cycle:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {currentMonthOrders}
                </span>{" "}
                <span className="text-slate-400">/ {orderLimit.toLocaleString()}</span>
              </span>
              <span className="font-mono text-slate-700 text-xs font-semibold">
                {usagePercentage}% utilized
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usagePercentage >= 90
                    ? "bg-rose-500"
                    : usagePercentage >= 75
                    ? "bg-amber-500"
                    : "bg-slate-900"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 3 Plan Tiers ───────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Available Subscription Plans</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent, flat-rate pricing in BDT (৳) tailored for Bangladeshi eCommerce merchants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* 1. Starter Plan */}
            <div
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-5 transition ${
                plan === "starter"
                  ? "border-slate-900 bg-white shadow-xs"
                  : "border-slate-200/80 bg-white shadow-2xs hover:border-slate-300"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-700">
                    Starter
                  </span>
                  {plan === "starter" && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {isTrial ? "Active Trial" : "Current Plan"}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-semibold text-slate-900">Starter Plan</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold font-mono text-slate-900">
                      ৳{(gatewaySettings.starter_plan_price_bdt || 999).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Essential tools for testing physical dispatch and launching a single store.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Up to {(gatewaySettings.starter_order_limit || 300).toLocaleString()} orders / month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Up to 100 catalog SKUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Thermal &amp; 4×6 Label Printing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Smartphone Camera Barcode Scanner</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Steadfast Courier Booking</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("starter");
                  setModalOpen(true);
                }}
                className={`w-full py-2 rounded-lg text-xs font-medium transition ${
                  plan === "starter"
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {plan === "starter"
                  ? isTrial
                    ? `Extend Starter (৳${(gatewaySettings.starter_plan_price_bdt || 999).toLocaleString()})`
                    : "Renew Starter"
                  : "Select Starter Plan"}
              </button>
            </div>

            {/* 2. Growth Pro (Featured Card) */}
            <div
              className={`rounded-xl border-2 p-5 flex flex-col justify-between space-y-5 relative transition ${
                plan === "growth"
                  ? "border-slate-900 bg-white shadow-md"
                  : "border-slate-900 bg-white shadow-xs"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-900 text-white">
                    Most Popular
                  </span>
                  {plan === "growth" && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {isTrial ? "Active Trial" : "Current Plan"}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-semibold text-slate-900">Growth Pro</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold font-mono text-slate-900">
                      ৳{(gatewaySettings.growth_plan_price_bdt || 1990).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Full capacity for growing merchants with multi-user warehouse teams and courier sync.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Up to {(gatewaySettings.growth_order_limit || 1500).toLocaleString()} orders / month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Up to 500 catalog SKUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Steadfast, Pathao &amp; RedX Auto-Sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Multi-User Staff Access &amp; RBAC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Daily Expenses &amp; Net Profit Analytics</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("growth");
                  setModalOpen(true);
                }}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition"
              >
                {plan === "growth"
                  ? isTrial
                    ? `Extend Growth Pro (৳${(gatewaySettings.growth_plan_price_bdt || 1990).toLocaleString()})`
                    : "Renew Growth Pro"
                  : "Upgrade to Growth Pro"}
              </button>
            </div>

            {/* 3. Enterprise Plan */}
            <div
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-5 transition ${
                plan === "enterprise"
                  ? "border-slate-900 bg-white shadow-xs"
                  : "border-slate-200/80 bg-white shadow-2xs hover:border-slate-300"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-700">
                    Enterprise
                  </span>
                  {plan === "enterprise" && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {isTrial ? "Active Trial" : "Current Plan"}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-semibold text-slate-900">Enterprise Tier</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold font-mono text-slate-900">
                      ৳{(gatewaySettings.enterprise_plan_price_bdt || 4990).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Maximum scale for high-volume brand enterprises with unlimited product variants.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Up to {(gatewaySettings.enterprise_order_limit || 5000).toLocaleString()} orders / month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Unlimited Catalog SKUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Priority Multi-Carrier Dispatch Routing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Dedicated WhatsApp Account Manager</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Automated Customer SMS Alerts</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("enterprise");
                  setModalOpen(true);
                }}
                className={`w-full py-2 rounded-lg text-xs font-medium transition ${
                  plan === "enterprise"
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {plan === "enterprise"
                  ? isTrial
                    ? `Extend Enterprise (৳${(gatewaySettings.enterprise_plan_price_bdt || 4990).toLocaleString()})`
                    : "Renew Enterprise"
                  : "Upgrade to Enterprise"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Trust Footer ───────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="text-xs font-semibold text-slate-900 mb-1">bKash &amp; Nagad Official Desk</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Direct mobile banking payments are matched and credited with 1-click approvals on the Super Admin desk.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 mb-1">Zero Long-Term Lock-In</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All subscriptions operate on flexible 30-day billing periods. Upgrade or switch tiers at any time.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 mb-1">Super Admin Hotline &amp; Support</div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                <a
                  href={`https://wa.me/${(gatewaySettings.support_whatsapp || gatewaySettings.admin_phone || "8801753082749").replace(/[^0-9]/g, "").startsWith("88") ? (gatewaySettings.support_whatsapp || gatewaySettings.admin_phone || "8801753082749").replace(/[^0-9]/g, "") : "88" + (gatewaySettings.support_whatsapp || gatewaySettings.admin_phone || "01753082749").replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hello Super Admin, I need assistance with my store billing or manual subscription.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-emerald-600 font-medium inline-flex items-center gap-1"
                >
                  WhatsApp: {gatewaySettings.support_phone || gatewaySettings.admin_phone || "01753082749"}
                </a>{" "}
                ({gatewaySettings.support_hours || "10:00 AM - 11:00 PM"})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── UPGRADE / SUBSCRIPTION PAYMENT MODAL ────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {isTrial ? "Upgrade Store Subscription" : "Renew / Change Plan"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your tier and submit direct payment for instant verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Plan Picker Tabs */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Choose Subscription Plan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "starter", title: "Starter", price: `৳${(gatewaySettings.starter_plan_price_bdt || 999).toLocaleString()}` },
                    { id: "growth", title: "Growth Pro", price: `৳${(gatewaySettings.growth_plan_price_bdt || 1990).toLocaleString()}` },
                    { id: "enterprise", title: "Enterprise", price: `৳${(gatewaySettings.enterprise_plan_price_bdt || 4990).toLocaleString()}` },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-2.5 rounded-lg border text-center transition ${
                        selectedPlan === p.id
                          ? "border-slate-900 bg-slate-50 text-slate-900 shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-semibold">{p.title}</div>
                      <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{p.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Switcher */}
              <div>
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab("bkash")}
                    className={`pb-2 px-3 text-xs font-medium border-b-2 transition ${
                      paymentMethodTab === "bkash"
                        ? "border-slate-900 text-slate-900 font-semibold"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    bKash / Nagad Direct
                  </button>
                  {gatewaySettings.sslcommerz_configured && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethodTab("sslcommerz")}
                      className={`pb-2 px-3 text-xs font-medium border-b-2 transition ${
                        paymentMethodTab === "sslcommerz"
                          ? "border-slate-900 text-slate-900 font-semibold"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Online Cards &amp; Gateway
                    </button>
                  )}
                </div>
              </div>

              {paymentMethodTab === "bkash" ? (
                <form onSubmit={handleManualPaymentSubmit} className="space-y-4 pt-1">
                  {/* bKash/Nagad Instructions */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                    <div className="text-xs font-semibold text-slate-900">
                      Payment Instructions (Send Money / Personal):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-sans">bKash Personal</span>
                        <span className="font-semibold text-slate-900 select-all">
                          {gatewaySettings.bkash_number || "01753082749"}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-sans">Nagad Personal</span>
                        <span className="font-semibold text-slate-900 select-all">
                          {gatewaySettings.nagad_number || "01753082749"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Send{" "}
                      <strong className="text-slate-900">
                        {selectedPlan === "starter" ? "৳999" : selectedPlan === "enterprise" ? "৳4,990" : "৳1,990"}
                      </strong>{" "}
                      and submit the Transaction ID below for approval.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Your Sender Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="017XXXXXXXX"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Transaction ID (TrxID) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9J4K2L1M"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Reference / Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paid via personal bKash, renewal"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                    >
                      {submittingPayment && (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>Submit TrxID for Approval</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center space-y-2">
                    <div className="text-xs font-semibold text-slate-900">
                      Total Due:{" "}
                      {selectedPlan === "starter" ? "৳999" : selectedPlan === "enterprise" ? "৳4,990" : "৳1,990"} BDT
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Instant automatic activation via Visa, Mastercard, AMEX, or direct internet banking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOnlineCheckout}
                    disabled={submittingPayment}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {submittingPayment ? "Connecting…" : "Proceed to SSLCommerz Checkout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
