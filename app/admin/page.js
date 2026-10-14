"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

export default function SuperAdminDashboard() {
  const router = useRouter();

  // ── Auth & Permission State ────────────────────────────────
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // ── Active Navigation Tab: 'overview' | 'pricing' | 'integrations'
  const [activeTab, setActiveTab] = useState("overview");

  // ── Telemetry & Overview State ─────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({
    totalTenants: 0,
    totalSkus: 0,
    totalOrders: 0,
    totalDispatched: 0,
    totalPending: 0,
    totalWebhookHits: 0,
    totalRevenue: 0,
  });

  const [tenants, setTenants] = useState([]);
  const [courierBreakdown, setCourierBreakdown] = useState({
    Steadfast: 0,
    Pathao: 0,
    RedX: 0,
    Paperfly: 0,
    Carrybee: 0,
    Unassigned: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Dynamic SaaS Settings State ────────────────────────────
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [saasSettings, setSaasSettings] = useState({
    pro_plan_price: 49.0,
    free_order_limit: 100,
    currency_mode: "AUTO",
    bdt_exchange_rate: 122.0,
    whatsapp_api_url: "https://api.green-api.com",
    whatsapp_instance_id: "",
    whatsapp_token: "",
    sms_api_key: "",
    sms_sender_id: "",
    sms_api_url: "http://bulksmsbd.net/api/smsapi",
    sslcommerz_store_id: "",
    sslcommerz_store_passwd: "",
    sslcommerz_is_live: false,
    stripe_public_key: "",
    stripe_secret_key: "",
  });

  // Password visibility toggles
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [showSslPasswd, setShowSslPasswd] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);

  // ── Activity Footprints / Audit Trail State ─────────────────
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilterAction, setLogFilterAction] = useState("ALL");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Toast trigger
  const triggerToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Data Fetchers ──────────────────────────────────────────
  async function fetchTelemetryData() {
    const res = await fetch("/api/admin/overview");
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to load telemetry overview.");
    }
    return await res.json();
  }

  async function fetchSaasSettings() {
    try {
      setSettingsLoading(true);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSaasSettings((prev) => ({
            ...prev,
            ...json.settings,
          }));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch saas settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function fetchActivityLogs() {
    try {
      setLogsLoading(true);
      const res = await fetch("/api/admin/activity?limit=60");
      if (res.ok) {
        const json = await res.json();
        if (json.logs) {
          setActivityLogs(json.logs);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch activity footprints:", err);
    } finally {
      setLogsLoading(false);
    }
  }

  // ── Security Check & Initial Mount ─────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function checkSecurityAndLoad() {
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user || !user.email) {
          if (isMounted) {
            setIsAuthorized(false);
            setAuthChecking(false);
            setLoading(false);
          }
          return;
        }

        const email = user.email.toLowerCase().trim();
        if (isMounted) setCurrentUserEmail(email);

        if (email !== ADMIN_EMAIL) {
          if (isMounted) {
            setIsAuthorized(false);
            setAuthChecking(false);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthorized(true);
        }

        // Fetch telemetry, dynamic settings, and activity footprints
        const [telemetry] = await Promise.all([
          fetchTelemetryData(),
          fetchSaasSettings(),
          fetchActivityLogs(),
        ]);

        if (isMounted && telemetry) {
          if (telemetry.summary) setSummary(telemetry.summary);
          if (telemetry.tenants) setTenants(telemetry.tenants);
          if (telemetry.courierBreakdown)
            setCourierBreakdown(telemetry.courierBreakdown);
          if (telemetry.recentOrders) setRecentOrders(telemetry.recentOrders);
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to contact SaaS control plane.");
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
          setLoading(false);
        }
      }
    }

    checkSecurityAndLoad();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Manual Refresh ─────────────────────────────────────────
  async function handleManualRefresh() {
    if (!isAuthorized) return;
    setRefreshing(true);
    setError(null);
    try {
      const [telemetry] = await Promise.all([
        fetchTelemetryData(),
        fetchSaasSettings(),
        fetchActivityLogs(),
      ]);
      if (telemetry?.summary) setSummary(telemetry.summary);
      if (telemetry?.tenants) setTenants(telemetry.tenants);
      if (telemetry?.courierBreakdown)
        setCourierBreakdown(telemetry.courierBreakdown);
      if (telemetry?.recentOrders) setRecentOrders(telemetry.recentOrders);
      setLastRefreshed(new Date().toLocaleTimeString());
      triggerToast("success", "Live telemetry synced.");
    } catch (err) {
      setError(err.message || "Failed to refresh telemetry.");
    } finally {
      setRefreshing(false);
    }
  }

  // ── Save Dynamic SaaS Settings ─────────────────────────────
  async function handleSaveSettings(sectionName) {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saasSettings),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update SaaS settings.");
      }

      triggerToast(
        "success",
        `${sectionName || "Settings"} updated dynamically!`
      );
    } catch (err) {
      triggerToast("error", err.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Tenant Status Toggle ───────────────────────────────────
  function toggleTenantStatus(tenantId) {
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? { ...t, status: t.status === "Active" ? "Suspended" : "Active" }
          : t
      )
    );
  }

  // ── Delete / Purge Tenant ──────────────────────────────────
  async function handleDeleteTenant(tenantId, tenantName) {
    if (
      !confirm(
        `Are you sure you want to permanently delete tenant store "${tenantName}"? All its associated team members and data will be removed.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/tenants?id=${tenantId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        triggerToast("error", json.error || "Failed to delete tenant.");
        return;
      }
      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      setSummary((prev) => ({
        ...prev,
        totalTenants: Math.max(0, prev.totalTenants - 1),
      }));
      triggerToast("success", `Store "${tenantName}" removed.`);
    } catch (err) {
      triggerToast("error", err.message || "Error deleting tenant.");
    }
  }

  // ── Logout ─────────────────────────────────────────────────
  async function handleLogout() {
    document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── 1. LOADING SCREEN ──────────────────────────────────────
  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white tracking-wide">
              Authenticating Super Admin Clearance…
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Verifying Platform Owner Session
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── 2. ACCESS DENIED SCREEN (403 FORBIDDEN) ────────────────
  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-4xl shadow-inner">
            🔒
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
              403 Access Denied
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Platform Owner Restricted
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This master control plane is reserved strictly for the SaaS platform owner.
              Your current account does not have super admin authorization.
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-left text-xs font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Signed in account:
            </div>
            <div className="text-slate-300 font-bold truncate">
              {currentUserEmail || "Anonymous"}
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/dashboard/products"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              <span>← Return to Merchant Dashboard</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <span>Sign In as Platform Owner</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Filtered Orders ────────────────────────────────────────
  const filteredOrders = recentOrders.filter((ord) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      ord.customer_name?.toLowerCase().includes(q) ||
      ord.customer_phone?.toLowerCase().includes(q) ||
      ord.courier?.toLowerCase().includes(q) ||
      ord.status?.toLowerCase().includes(q) ||
      ord.storeName?.toLowerCase().includes(q) ||
      String(ord.id).toLowerCase().includes(q)
    );
  });

  const totalCourierOrders =
    (summary.totalOrders || 0) > 0 ? summary.totalOrders : 1;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white font-sans">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-5 py-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              toastMessage.type === "success"
                ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                : "bg-rose-500 shadow-sm shadow-rose-500"
            }`}
          />
          <p className="text-sm font-medium text-slate-100">
            {toastMessage.text}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-8">
        {/* ── TOP EXECUTIVE HEADER ───────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Master Control Plane · Super Administrator
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>🛡️</span> {process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory"} Command Hub
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Logged in as <code className="text-indigo-400 font-mono">{currentUserEmail}</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-slate-500 hidden md:inline-block">
                Synced: {lastRefreshed}
              </span>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              <span>{refreshing ? "Syncing…" : "Sync Live Data"}</span>
            </button>

            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 px-3.5 py-2 text-xs font-semibold transition"
            >
              <span>💳</span> View Client Billing
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800/60 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 transition"
              title="Log out of Super Admin"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </div>

        {/* ── TIER-1 TAB NAVIGATION ──────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-fit backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>📊</span>
            <span>Overview &amp; Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === "pricing"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>💎</span>
            <span>Pricing &amp; Currency</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === "payments"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>💳</span>
            <span>Payment Gateways</span>
            {(saasSettings.sslcommerz_store_id || saasSettings.stripe_public_key) && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === "integrations"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>🔌</span>
            <span>WhatsApp &amp; SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("footprints")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === "footprints"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <span>🐾</span>
            <span>Activity Footprints</span>
            {activityLogs.length > 0 && (
              <span className="rounded-full bg-indigo-500/30 px-1.5 py-0.2 text-[10px] font-mono text-indigo-300">
                {activityLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* ── ERROR BANNER ───────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="font-bold underline hover:text-rose-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & TELEMETRY                               */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Tenants
                  </span>
                  <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-indigo-400 text-sm">
                    🏢
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="text-3xl font-black text-white font-mono">
                    {loading ? "…" : summary.totalTenants}
                  </div>
                  <span className="text-[11px] text-slate-400">client stores</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Isolated multi-tenant SaaS accounts
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-700 opacity-60" />
              </div>

              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Global Catalog SKUs
                  </span>
                  <span className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-purple-400 text-sm">
                    📦
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="text-3xl font-black text-white font-mono">
                    {loading ? "…" : summary.totalSkus.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">products</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Serialized unique barcodes across stores
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-700 opacity-60" />
              </div>

              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Processed Orders
                  </span>
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400 text-sm">
                    🚚
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    {loading ? "…" : summary.totalOrders.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    ({summary.totalDispatched} Dispatched)
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Total GMV: ৳{summary.totalRevenue.toLocaleString()}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
              </div>

              <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Inbound Webhook Streams
                  </span>
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400 text-sm">
                    ⚡
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="text-3xl font-black text-white font-mono">
                    {loading ? "…" : summary.totalWebhookHits}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    Calls Routed
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Operational Uptime (99.98% SLA)</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
              </div>
            </div>

            {/* Courier Distribution Breakdown */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                🚚 Multi-Courier Delivery Distribution
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(courierBreakdown).map(([courier, count]) => {
                  const pct = Math.round((count / totalCourierOrders) * 100);
                  return (
                    <div
                      key={courier}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1"
                    >
                      <div className="text-xs font-bold text-slate-300">
                        {courier}
                      </div>
                      <div className="text-xl font-black text-white font-mono">
                        {count}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pct}% share
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Tenants Management Table */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🏢</span> Client Workspaces ({tenants.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Isolated databases, merchant credentials, and active subscription status.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">Store Name</th>
                      <th className="px-6 py-3.5 font-bold">Owner Email</th>
                      <th className="px-6 py-3.5 font-bold">Products</th>
                      <th className="px-6 py-3.5 font-bold">Orders</th>
                      <th className="px-6 py-3.5 font-bold">Status</th>
                      <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-bold text-white font-sans">
                          {t.name}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{t.ownerEmail}</td>
                        <td className="px-6 py-4 text-indigo-400 font-bold">
                          {t.skuCount}
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-bold">
                          {t.orderCount}
                        </td>
                        <td className="px-6 py-4 font-sans">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              t.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                t.status === "Active"
                                  ? "bg-emerald-400"
                                  : "bg-rose-400"
                              }`}
                            />
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-sans">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleTenantStatus(t.id)}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                            >
                              {t.status === "Active" ? "Suspend" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTenant(t.id, t.name)}
                              className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-900/80 transition"
                            >
                              Purge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Order Telemetry Feed */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📡</span> Live Order Stream
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time cross-tenant order activity and courier dispatch status.
                  </p>
                </div>
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter customer, phone, courier…"
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Store</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Courier</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredOrders.slice(0, 10).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-mono text-indigo-400 font-bold">
                          #{ord.id}
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-medium">
                          {ord.storeName}
                        </td>
                        <td className="px-4 py-3 text-white">
                          <div>{ord.customer_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {ord.customer_phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {ord.courier || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                          ৳{Number(ord.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                            {ord.status || "PENDING"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRICING CONTROLLER                                 */}
        {/* ========================================================= */}
        {activeTab === "pricing" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Card */}
              <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                    💎 Dynamic Pricing Engine
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-white tracking-tight">
                    SaaS Subscription &amp; Tier Controls
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Update subscription pricing and free monthly order allowances in real-time.
                    Changes take effect across the dynamic client billing page instantly without server redeployment.
                  </p>
                </div>

                <div className="space-y-5 pt-2">
                  {/* Pro Plan Monthly Price */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Pro Plan Monthly Price (USD $)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={saasSettings.pro_plan_price}
                        onChange={(e) =>
                          setSaasSettings((prev) => ({
                            ...prev,
                            pro_plan_price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="block w-full rounded-2xl border border-slate-800 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white font-mono font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                        placeholder="49.00"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The monthly recurring fee billed to upgraded merchant stores.
                    </p>
                  </div>

                  {/* Free Monthly Order Quota */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Free Tier Monthly Order Allowance
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={saasSettings.free_order_limit}
                        onChange={(e) =>
                          setSaasSettings((prev) => ({
                            ...prev,
                            free_order_limit: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                        className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white font-mono font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                        placeholder="100"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Number of dispatched orders allowed per calendar month before upgrade warning.
                    </p>
                  </div>

                  {/* Multi-Currency Mode Controller */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Platform Currency Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: "AUTO", label: "Auto (Geo / Switcher)", desc: "Visitors can toggle BDT / USD" },
                        { id: "BDT", label: "BDT (৳ Only)", desc: "Enforce Bangladeshi Taka" },
                        { id: "USD", label: "USD ($ Only)", desc: "Enforce US Dollars" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setSaasSettings((prev) => ({
                              ...prev,
                              currency_mode: item.id,
                            }))
                          }
                          className={`rounded-2xl border p-3 text-left transition ${
                            saasSettings.currency_mode === item.id
                              ? "border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-500/20"
                              : "border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BDT Exchange Rate */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      USD to BDT Exchange Rate (৳ per $1 USD)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono font-bold text-sm">
                        ৳
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={saasSettings.bdt_exchange_rate}
                        onChange={(e) =>
                          setSaasSettings((prev) => ({
                            ...prev,
                            bdt_exchange_rate: parseFloat(e.target.value) || 122.0,
                          }))
                        }
                        className="block w-full rounded-2xl border border-slate-800 bg-slate-950 pl-8 pr-4 py-3 text-sm text-white font-mono font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                        placeholder="122.00"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Used for real-time conversion across the landing page and SSLCommerz BDT checkouts.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Saved dynamically in <code className="text-slate-300">saas_settings</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("Pricing & Currency")}
                    disabled={savingSettings || settingsLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {savingSettings ? "Saving…" : "Save Pricing & Currency"}
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="lg:col-span-5 rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 h-36 w-36 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Live Client View Preview
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    Mode: {saasSettings.currency_mode || "AUTO"}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white">Pro Enterprise Plan</h3>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-white font-mono">
                        ${Number(saasSettings.pro_plan_price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month (USD)</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 text-emerald-400 font-mono font-bold text-lg">
                      <span>৳{Math.round(Number(saasSettings.pro_plan_price || 0) * Number(saasSettings.bdt_exchange_rate || 122)).toLocaleString()}</span>
                      <span className="text-xs text-slate-400 font-normal">/ month (BDT)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Full warehouse automation, unlimited orders, and automated multi-carrier dispatch.
                  </p>
                </div>

                {/* Quota Indicator Preview */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Free Monthly Quota:</span>
                    <span className="font-mono font-bold text-white">
                      {saasSettings.free_order_limit} Orders / mo
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                      style={{ width: "45%" }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Clients will see this usage gauge on /dashboard/billing
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Unlimited order volume past {saasSettings.free_order_limit}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Automated WhatsApp &amp; SMS tracking alerts
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Multi-user warehouse role permissions
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: PAYMENT GATEWAYS (SSLCOMMERZ & STRIPE)               */}
        {/* ========================================================= */}
        {activeTab === "payments" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    💳 Multi-Gateway Payment Rails
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-white tracking-tight">
                    Payment Gateway Configurations
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Manage SSLCommerz (bKash, Nagad, Rocket, Bangladeshi Cards) and Stripe (Global &amp; International Cards).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSettings("Payment Gateways")}
                  disabled={savingSettings || settingsLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-50 self-start sm:self-auto"
                >
                  {savingSettings ? "Saving…" : "Save Gateway Credentials"}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                {/* SSLCommerz Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-lg">
                        🇧🇩
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">SSLCommerz Gateway</h3>
                        <p className="text-[11px] text-slate-400">Local MFS &amp; Bangladesh Cards</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        saasSettings.sslcommerz_store_id
                          ? saasSettings.sslcommerz_is_live
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {saasSettings.sslcommerz_store_id
                        ? saasSettings.sslcommerz_is_live
                          ? "● Live Production"
                          : "● Sandbox Mode"
                        : "Not Configured"}
                    </span>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 p-3">
                    <div>
                      <div className="text-xs font-bold text-white">Environment Mode</div>
                      <div className="text-[10px] text-slate-400">
                        {saasSettings.sslcommerz_is_live
                          ? "Using securepay.sslcommerz.com"
                          : "Using sandbox.sslcommerz.com"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          sslcommerz_is_live: !prev.sslcommerz_is_live,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        saasSettings.sslcommerz_is_live
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {saasSettings.sslcommerz_is_live ? "Live Mode" : "Sandbox Test"}
                    </button>
                  </div>

                  {/* Store ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      SSLCommerz Store ID
                    </label>
                    <input
                      type="text"
                      value={saasSettings.sslcommerz_store_id || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          sslcommerz_store_id: e.target.value,
                        }))
                      }
                      placeholder="e.g. lavan64a938c..."
                      className="block w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Store Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Store Password / Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSslPasswd(!showSslPasswd)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                      >
                        {showSslPasswd ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showSslPasswd ? "text" : "password"}
                      value={saasSettings.sslcommerz_store_passwd || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          sslcommerz_store_passwd: e.target.value,
                        }))
                      }
                      placeholder="Store password from SSLCommerz"
                      className="block w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* IPN URL Guide */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-[11px] space-y-1 text-slate-400">
                    <div className="font-bold text-slate-300">Instant Payment Notification (IPN) URL:</div>
                    <code className="text-emerald-400 font-mono text-[10px] block break-all">
                      https://your-domain.com/api/payment/sslcommerz/ipn
                    </code>
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      Configure this IPN in your SSLCommerz merchant panel for server-to-server transaction validation.
                    </p>
                  </div>
                </div>

                {/* Stripe Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-lg">
                        🌐
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">Stripe Payments</h3>
                        <p className="text-[11px] text-slate-400">Global Credit &amp; Debit Cards</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        saasSettings.stripe_public_key
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {saasSettings.stripe_public_key ? "● Ready" : "Not Configured"}
                    </span>
                  </div>

                  {/* Stripe Public Key */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Stripe Publishable Key
                    </label>
                    <input
                      type="text"
                      value={saasSettings.stripe_public_key || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          stripe_public_key: e.target.value,
                        }))
                      }
                      placeholder="pk_live_... or pk_test_..."
                      className="block w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Stripe Secret Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Stripe Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowStripeSecret(!showStripeSecret)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                      >
                        {showStripeSecret ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showStripeSecret ? "text" : "password"}
                      value={saasSettings.stripe_secret_key || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          stripe_secret_key: e.target.value,
                        }))
                      }
                      placeholder="sk_live_... or sk_test_..."
                      className="block w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Webhook Guide */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-[11px] space-y-1 text-slate-400">
                    <div className="font-bold text-slate-300">Stripe Webhook Endpoint:</div>
                    <code className="text-indigo-400 font-mono text-[10px] block break-all">
                      https://your-domain.com/api/payment/stripe/webhook
                    </code>
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      Listens for <span className="font-mono text-slate-400">checkout.session.completed</span> with cryptographic signature verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: API GATEWAY INTEGRATIONS HUB                       */}
        {/* ========================================================= */}
        {activeTab === "integrations" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* WhatsApp Gateway Settings */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xl">
                      💬
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        WhatsApp Gateway Configuration
                      </h3>
                      <p className="text-xs text-slate-400">
                        Supports GreenAPI, UltraMsg, Twilio, or generic webhook.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* WhatsApp API URL */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      WhatsApp Gateway Base URL
                    </label>
                    <input
                      type="text"
                      value={saasSettings.whatsapp_api_url}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          whatsapp_api_url: e.target.value,
                        }))
                      }
                      placeholder="https://api.green-api.com"
                      className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                    <p className="text-[10px] text-slate-400">
                      e.g., <code className="text-slate-300">https://api.green-api.com</code> or{" "}
                      <code className="text-slate-300">https://api.ultramsg.com</code>
                    </p>
                  </div>

                  {/* Instance ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Instance ID / Account ID
                    </label>
                    <input
                      type="text"
                      value={saasSettings.whatsapp_instance_id}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          whatsapp_instance_id: e.target.value,
                        }))
                      }
                      placeholder="e.g. 7103859201"
                      className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* WhatsApp Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        API Token / Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                      >
                        {showWhatsappToken ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showWhatsappToken ? "text" : "password"}
                      value={saasSettings.whatsapp_token}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          whatsapp_token: e.target.value,
                        }))
                      }
                      placeholder="e.g. 9b8c2d1e4f..."
                      className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("WhatsApp credentials")}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    <span>💾</span>
                    <span>Save WhatsApp Config</span>
                  </button>
                </div>
              </div>

              {/* Local SMS Gateway (BulkSMSBD) */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xl">
                      📱
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Local SMS Gateway (BulkSMSBD)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Fast delivery across Grameenphone, Banglalink, Robi, Teletalk.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* SMS API Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        BulkSMSBD API Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono"
                      >
                        {showSmsApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showSmsApiKey ? "text" : "password"}
                      value={saasSettings.sms_api_key}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          sms_api_key: e.target.value,
                        }))
                      }
                      placeholder="e.g. 5x81n49..."
                      className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Sender ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Approved Sender ID (Mask)
                    </label>
                    <input
                      type="text"
                      value={saasSettings.sms_sender_id}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          sms_sender_id: e.target.value,
                        }))
                      }
                      placeholder="e.g. 8809612345678 or SMARTINV"
                      className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* SMS Endpoint URL */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      SMS Gateway URL
                    </label>
                    <input
                      type="text"
                      value={saasSettings.sms_api_url}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          sms_api_url: e.target.value,
                        }))
                      }
                      placeholder="http://bulksmsbd.net/api/smsapi"
                      className="block w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("SMS credentials")}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    <span>💾</span>
                    <span>Save SMS Gateway Config</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ACTIVITY FOOTPRINTS (LOGISTICS AUDIT TRAIL)        */}
        {/* ========================================================= */}
        {activeTab === "footprints" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                    🐾 Immutable Ledger
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-white tracking-tight">
                    Activity Footprints &amp; Audit Trail
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Tamper-evident logs of order dispatches, stock intake, configuration mutations, and staff interactions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={fetchActivityLogs}
                    disabled={logsLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                  >
                    <span className={logsLoading ? "animate-spin" : ""}>🔄</span>
                    <span>{logsLoading ? "Syncing Logs…" : "Refresh Footprints"}</span>
                  </button>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Action Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "ALL", label: "All Activities" },
                    { id: "ORDER_DISPATCHED", label: "🚚 Dispatched" },
                    { id: "SETTINGS_UPDATED", label: "⚙️ Settings" },
                    { id: "PRODUCT_CREATED", label: "📦 Catalog" },
                    { id: "BULK_IMPORT", label: "⚡ Bulk CSV" },
                    { id: "COURIER_CONFIGURED", label: "🔌 Couriers" },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setLogFilterAction(pill.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        logFilterAction === pill.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs, email, IP..."
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
                  />
                  {logSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLogSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Logs Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action Type</th>
                        <th className="px-4 py-3">Event Details</th>
                        <th className="px-4 py-3">Actor / IP</th>
                        <th className="px-4 py-3">Workspace Scope</th>
                        <th className="px-4 py-3 text-right">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {activityLogs
                        .filter((log) => {
                          const matchesAction =
                            logFilterAction === "ALL" ||
                            log.action_type === logFilterAction;
                          const q = logSearchQuery.toLowerCase().trim();
                          const matchesQuery =
                            !q ||
                            log.details?.toLowerCase().includes(q) ||
                            log.user_email?.toLowerCase().includes(q) ||
                            log.action_type?.toLowerCase().includes(q) ||
                            log.ip_address?.toLowerCase().includes(q) ||
                            log.business_id?.toLowerCase().includes(q);
                          return matchesAction && matchesQuery;
                        })
                        .map((log) => {
                          const isExpanded = expandedLogId === log.id;
                          const hasMetadata =
                            log.metadata &&
                            typeof log.metadata === "object" &&
                            Object.keys(log.metadata).length > 0;

                          let badgeClass =
                            "bg-slate-800 text-slate-300 border-slate-700";
                          if (log.action_type === "ORDER_DISPATCHED") {
                            badgeClass =
                              "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                          } else if (log.action_type === "SETTINGS_UPDATED") {
                            badgeClass =
                              "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
                          } else if (log.action_type === "PRODUCT_CREATED") {
                            badgeClass =
                              "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
                          } else if (log.action_type === "BULK_IMPORT") {
                            badgeClass =
                              "bg-purple-500/10 text-purple-400 border-purple-500/30";
                          } else if (log.action_type === "COURIER_CONFIGURED") {
                            badgeClass =
                              "bg-sky-500/10 text-sky-400 border-sky-500/30";
                          }

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-900/50 transition group"
                            >
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                                {new Date(log.created_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                {new Date(log.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${badgeClass}`}
                                >
                                  {log.action_type}
                                </span>
                              </td>

                              <td className="px-4 py-3 font-medium text-slate-200 max-w-xs md:max-w-md truncate">
                                <div>{log.details}</div>
                                {isExpanded && hasMetadata && (
                                  <pre className="mt-2 rounded-xl bg-slate-900 p-2.5 font-mono text-[10px] text-emerald-400 overflow-x-auto border border-slate-800">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-slate-200 font-medium">
                                  {log.user_email || "System Service"}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  IP: {log.ip_address || "Internal"}
                                </div>
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap font-mono text-[10px] text-slate-400">
                                {log.business_id ===
                                "00000000-0000-0000-0000-000000000001"
                                  ? "Platform Master"
                                  : log.business_id
                                  ? log.business_id.slice(0, 8) + "…"
                                  : "Global"}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                {hasMetadata ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedLogId(
                                        isExpanded ? null : log.id
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-mono text-indigo-400 hover:text-indigo-300 hover:border-slate-700 transition"
                                  >
                                    <span>{isExpanded ? "▲ Hide" : "▼ Payload"}</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-600 font-mono">
                                    –
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                      {activityLogs.length === 0 && !logsLoading && (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-6 py-12 text-center text-xs text-slate-500"
                          >
                            <span className="text-2xl block mb-2">🐾</span>
                            No activity footprints found.
                            <div className="mt-1 text-[11px] text-slate-600">
                              As actions (orders, dispatches, settings changes) take place, they will stream here live.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
