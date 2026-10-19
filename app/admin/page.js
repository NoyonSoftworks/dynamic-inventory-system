"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import AdminTasksTab from "./components/AdminTasksTab";
import AdminBlogTab from "./components/AdminBlogTab";

function CheckIcon({ className = "w-4 h-4 text-emerald-600" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon({ className = "w-4 h-4 text-rose-600" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function BuildingIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function PackageIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function TruckIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function ZapIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ActivityIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function LockIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function ShieldIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function PhoneIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function KeyIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function GlobeIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function MessageIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon({ className = "w-3.5 h-3.5 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RefreshIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CreditCardIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function TagIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-4 h-4 text-slate-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

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

  // ── Store Activity & Overview State ────────────────────────
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
    admin_recovery_email: "mdnoyon356268@gmail.com",
    admin_recovery_phone: "",
  });

  // Password visibility toggles
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [showSslPasswd, setShowSslPasswd] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);

  // Super Admin Password & Security Settings
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);

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
      throw new Error(errJson?.error || "Failed to load platform overview.");
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
        let currentUser = null;

        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (user && user.email) {
          currentUser = user;
        } else {
          // Fallback 1: Check active session cache
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user?.email) {
            currentUser = sessionData.session.user;
          } else if (typeof document !== "undefined") {
            // Fallback 2: Check sb-access-token cookie
            const tokenMatch = document.cookie.match(/sb-access-token=([^;]+)/);
            const refreshMatch = document.cookie.match(/sb-refresh-token=([^;]+)/);
            if (tokenMatch && refreshMatch) {
              try {
                const { data: recData } = await supabase.auth.setSession({
                  access_token: tokenMatch[1],
                  refresh_token: refreshMatch[1],
                });
                if (recData?.user?.email) {
                  currentUser = recData.user;
                }
              } catch (recErr) {
                console.warn("Session recovery note:", recErr);
              }
            }
          }
        }

        if (!currentUser || !currentUser.email) {
          if (isMounted) {
            setIsAuthorized(false);
            setAuthChecking(false);
            setLoading(false);
            router.replace("/admin/login");
          }
          return;
        }

        const email = currentUser.email.toLowerCase().trim();
        if (isMounted) setCurrentUserEmail(email);

        if (email !== ADMIN_EMAIL) {
          if (isMounted) {
            setIsAuthorized(false);
            setAuthChecking(false);
            setLoading(false);
            router.replace("/admin/login?error=unauthorized");
          }
          return;
        }

        if (isMounted) {
          setIsAuthorized(true);
        }

        // Fetch platform overview, dynamic settings, and activity footprints
        const [overviewData] = await Promise.all([
          fetchTelemetryData(),
          fetchSaasSettings(),
          fetchActivityLogs(),
        ]);

        if (isMounted && overviewData) {
          if (overviewData.summary) setSummary(overviewData.summary);
          if (overviewData.tenants) setTenants(overviewData.tenants);
          if (overviewData.courierBreakdown)
            setCourierBreakdown(overviewData.courierBreakdown);
          if (overviewData.recentOrders) setRecentOrders(overviewData.recentOrders);
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
      const [overviewData] = await Promise.all([
        fetchTelemetryData(),
        fetchSaasSettings(),
        fetchActivityLogs(),
      ]);
      if (overviewData?.summary) setSummary(overviewData.summary);
      if (overviewData?.tenants) setTenants(overviewData.tenants);
      if (overviewData?.courierBreakdown)
        setCourierBreakdown(overviewData.courierBreakdown);
      if (overviewData?.recentOrders) setRecentOrders(overviewData.recentOrders);
      setLastRefreshed(new Date().toLocaleTimeString());
      triggerToast("success", "Platform overview refreshed.");
    } catch (err) {
      setError(err.message || "Failed to refresh platform overview.");
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

  // ── Change Super Admin Password ────────────────────────────
  async function handleChangeAdminPassword(e) {
    if (e) e.preventDefault();
    if (!newAdminPassword || newAdminPassword.length < 6) {
      triggerToast("error", "Password must be at least 6 characters in length.");
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      triggerToast("error", "Password confirmation does not match.");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newAdminPassword,
      });
      if (error) throw error;
      setNewAdminPassword("");
      setConfirmAdminPassword("");
      triggerToast("success", "Super Admin master password updated successfully!");
    } catch (err) {
      triggerToast("error", err.message || "Failed to update master password.");
    } finally {
      setChangingPassword(false);
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
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
    document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
    if (typeof window !== "undefined") {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {}
    }
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ── 1. LOADING SCREEN ──────────────────────────────────────
  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-slate-700 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-900 tracking-wide">
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
      <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-600" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-inner">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              403 Access Denied
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Platform Owner Restricted
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              This master control plane is reserved strictly for the SaaS platform owner.
              Your current account does not have super admin authorization.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-left text-xs font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Signed in account:
            </div>
            <div className="text-slate-800 font-bold truncate">
              {currentUserEmail || "Anonymous"}
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Sign In to Super Admin</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <span>← Go to Merchant Dashboard</span>
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
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a] py-8 px-4 sm:px-6 lg:px-8 selection:bg-orange-500 selection:text-white font-sans">
      {/* ── Toast Notification ─────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              toastMessage.type === "success"
                ? "bg-emerald-500 shadow-sm shadow-emerald-500"
                : "bg-rose-500 shadow-sm shadow-rose-500"
            }`}
          />
          <p className="text-sm font-medium text-slate-800">
            {toastMessage.text}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-8">
        {/* ── TOP EXECUTIVE HEADER ───────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex rounded-full h-2 w-2 bg-orange-500" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-orange-700 font-bold bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                Platform Control Plane · Super Administrator
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory"} Admin Console</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Authenticated session: <code className="text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded font-mono font-semibold">{currentUserEmail}</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-slate-500 hidden md:inline-block">
                Synced: {lastRefreshed}
              </span>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? "Syncing…" : "Sync"}</span>
            </button>

            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 px-3 py-1.5 text-xs font-semibold btn-tactile transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Client Billing</span>
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
              title="Log out of Super Admin"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ── TIER-1 TAB NAVIGATION ──────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 border border-slate-200/80 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "pricing"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pricing &amp; Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "payments"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Payment Gateways</span>
            {(saasSettings.sslcommerz_store_id || saasSettings.stripe_public_key) && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "integrations"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>WhatsApp &amp; SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "security"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Security &amp; Recovery</span>
            {saasSettings.admin_recovery_email && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("footprints")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "footprints"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Activity Logs</span>
            {activityLogs.length > 0 && (
              <span className="rounded-full bg-orange-100 px-1.5 py-0.2 text-[10px] font-mono text-orange-700 font-bold border border-orange-200">
                {activityLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "tasks"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Operational Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("blog")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "blog"
                ? "bg-orange-600 text-white shadow-xs btn-tactile"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span>Content &amp; Blog</span>
          </button>
        </div>

        {/* ── ERROR BANNER ───────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertIcon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="font-bold underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & PERFORMANCE METRICS                     */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Metric Architectural Bar */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Active Tenants
                  </span>
                  <BuildingIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  {loading ? "…" : summary.totalTenants}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Isolated client store accounts
                </div>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Global Catalog SKUs
                  </span>
                  <PackageIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  {loading ? "…" : summary.totalSkus.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Unique barcodes across stores
                </div>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Processed Orders
                  </span>
                  <TruckIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  {loading ? "…" : summary.totalOrders.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {summary.totalDispatched} dispatched · ৳{summary.totalRevenue.toLocaleString()} GMV
                </div>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Webhook Activity
                  </span>
                  <ZapIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
                  {loading ? "…" : summary.totalWebhookHits}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>99.98% operational uptime</span>
                </div>
              </div>
            </div>

            {/* Courier Distribution Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-slate-500" />
                Multi-Courier Delivery Distribution
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(courierBreakdown).map(([courier, count]) => {
                  const pct = Math.round((count / totalCourierOrders) * 100);
                  return (
                    <div
                      key={courier}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1"
                    >
                      <div className="text-xs font-bold text-slate-700">
                        {courier}
                      </div>
                      <div className="text-xl font-bold text-slate-900 font-mono">
                        {count}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {pct}% share
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Tenants Management Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BuildingIcon className="w-4 h-4 text-slate-600" />
                    Client Workspaces ({tenants.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Isolated databases, merchant credentials, and active subscription status.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">Store Name</th>
                      <th className="px-6 py-3.5 font-bold">Owner Email</th>
                      <th className="px-6 py-3.5 font-bold">Products</th>
                      <th className="px-6 py-3.5 font-bold">Orders</th>
                      <th className="px-6 py-3.5 font-bold">Status</th>
                      <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-4 font-bold text-slate-900 font-sans">
                          {t.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{t.ownerEmail}</td>
                        <td className="px-6 py-4 text-orange-700 font-bold font-mono">
                          {t.skuCount ?? t.totalSkus ?? 0}
                        </td>
                        <td className="px-6 py-4 text-emerald-700 font-bold font-mono">
                          {t.orderCount ?? t.totalOrders ?? 0}
                        </td>
                        <td className="px-6 py-4 font-sans">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              t.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                t.status === "Active"
                                  ? "bg-emerald-500"
                                  : "bg-rose-500"
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
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition"
                            >
                              {t.status === "Active" ? "Suspend" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTenant(t.id, t.name)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition"
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

            {/* Live Order Activity Feed */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-slate-600" />
                    Live Order Activity
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time cross-tenant order activity and courier dispatch status.
                  </p>
                </div>
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter customer, phone, courier…"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none w-full sm:w-64 transition"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Order</th>
                      <th className="px-4 py-3 font-bold">Store</th>
                      <th className="px-4 py-3 font-bold">Customer</th>
                      <th className="px-4 py-3 font-bold">Courier</th>
                      <th className="px-4 py-3 font-bold">Amount</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredOrders.slice(0, 10).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-teal-700 font-bold">
                          #{ord.id}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {ord.storeName}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          <div className="font-medium">{ord.customer_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {ord.customer_phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {ord.courier || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-700 font-bold">
                          ৳{Number(ord.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
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
              <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Tier Pricing
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                    SaaS Subscription &amp; Tier Controls
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Update subscription pricing and free monthly order allowances in real-time.
                    Changes take effect across the dynamic client billing page instantly without server redeployment.
                  </p>
                </div>

                <div className="space-y-5 pt-2">
                  {/* Pro Plan Monthly Price */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-3 text-sm text-slate-900 font-mono font-bold focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                        placeholder="49.00"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      The monthly recurring fee billed to upgraded merchant stores.
                    </p>
                  </div>

                  {/* Free Monthly Order Quota */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-mono font-bold focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                        placeholder="100"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Number of dispatched orders allowed per calendar month before upgrade warning.
                    </p>
                  </div>

                  {/* Multi-Currency Mode Controller */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                              ? "border-orange-500 bg-orange-50 text-orange-950 font-bold shadow-xs"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-3 text-sm text-slate-900 font-mono font-bold focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                        placeholder="122.00"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Used for real-time conversion across the landing page and SSLCommerz BDT checkouts.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Saved dynamically in <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">saas_settings</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("Pricing & Currency")}
                    disabled={savingSettings || settingsLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50"
                  >
                    {savingSettings ? "Saving…" : "Save Pricing & Currency"}
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 sm:p-7 shadow-xs space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 border border-orange-200 px-2.5 py-0.5 rounded-md font-mono">
                    Live Client View Preview
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Mode: {saasSettings.currency_mode || "AUTO"}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900">Pro Enterprise Plan</h3>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-slate-900 font-mono">
                        ${Number(saasSettings.pro_plan_price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ month (USD)</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 text-emerald-700 font-mono font-bold text-lg">
                      <span>৳{Math.round(Number(saasSettings.pro_plan_price || 0) * Number(saasSettings.bdt_exchange_rate || 122)).toLocaleString()}</span>
                      <span className="text-xs text-slate-500 font-normal">/ month (BDT)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Full warehouse automation, unlimited orders, and automated multi-carrier dispatch.
                  </p>
                </div>

                {/* Quota Indicator Preview */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Free Monthly Quota:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {saasSettings.free_order_limit} Orders / mo
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-150 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-teal-500"
                      style={{ width: "45%" }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">
                    Clients will see this usage gauge on /dashboard/billing
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited order volume past {saasSettings.free_order_limit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automated WhatsApp &amp; SMS tracking alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-user warehouse role permissions</span>
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
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Payment Gateways
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                    Payment Gateway Configurations
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage SSLCommerz (bKash, Nagad, Rocket, Bangladeshi Cards) and Stripe (Global &amp; International Cards).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSettings("Payment Gateways")}
                  disabled={savingSettings || settingsLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 btn-tactile transition disabled:opacity-50 self-start sm:self-auto"
                >
                  {savingSettings ? "Saving…" : "Save Gateway Credentials"}
                </button>
              </div>

              {/* Currency Rails Selector */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-900">Default Currency Mode</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Controls whether clients checkout in BDT (SSLCommerz) or USD (Stripe).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { mode: "AUTO", label: "Auto (Geo-IP)" },
                    { mode: "BDT", label: "BDT (৳) Only" },
                    { mode: "USD", label: "USD ($) Only" },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          currency_mode: mode,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                        (saasSettings.currency_mode || "AUTO").toUpperCase() === mode
                          ? "bg-orange-600 text-white shadow-xs btn-tactile"
                          : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                {/* SSLCommerz Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                        <CreditCardIcon className="w-4 h-4 text-emerald-600" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">SSLCommerz Gateway</h3>
                        <p className="text-[11px] text-slate-500">Local MFS &amp; Bangladesh Cards</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        saasSettings.sslcommerz_store_id
                          ? saasSettings.sslcommerz_is_live
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
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
                  <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Environment Mode</div>
                      <div className="text-[10px] text-slate-500">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold btn-tactile transition ${
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-orange-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  {/* Store Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Store Password / Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSslPasswd(!showSslPasswd)}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-mono font-semibold"
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
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-orange-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  {/* IPN URL Guide */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] space-y-1 text-slate-600 shadow-2xs">
                    <div className="font-bold text-slate-800">Instant Payment Notification (IPN) URL:</div>
                    <code className="text-emerald-700 font-mono text-[10px] block break-all font-semibold">
                      https://your-domain.com/api/payment/sslcommerz/ipn
                    </code>
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      Configure this IPN in your SSLCommerz merchant panel for server-to-server transaction validation.
                    </p>
                  </div>
                </div>

                {/* Stripe Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-600">
                        <GlobeIcon className="w-4 h-4 text-teal-600" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Stripe Payments</h3>
                        <p className="text-[11px] text-slate-500">Global Credit &amp; Debit Cards</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        saasSettings.stripe_public_key
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {saasSettings.stripe_public_key ? "● Ready" : "Not Configured"}
                    </span>
                  </div>

                  {/* Stripe Public Key */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-orange-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  {/* Stripe Secret Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Stripe Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowStripeSecret(!showStripeSecret)}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-mono font-semibold"
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
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-orange-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  {/* Webhook Guide */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] space-y-1 text-slate-600 shadow-2xs">
                    <div className="font-bold text-slate-800">Stripe Webhook Endpoint:</div>
                    <code className="text-teal-700 font-mono text-[10px] block break-all font-semibold">
                      https://your-domain.com/api/payment/stripe/webhook
                    </code>
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      Listens for <span className="font-mono text-slate-700">checkout.session.completed</span> with cryptographic signature verification.
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
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                      <MessageIcon className="w-5 h-5 text-emerald-600" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        WhatsApp Gateway Configuration
                      </h3>
                      <p className="text-xs text-slate-500">
                        Supports GreenAPI, UltraMsg, Twilio, or generic webhook.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* WhatsApp API URL */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[10px] text-slate-500">
                      e.g., <code className="text-slate-700">https://api.green-api.com</code> or{" "}
                      <code className="text-slate-700">https://api.ultramsg.com</code>
                    </p>
                  </div>

                  {/* Instance ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  {/* WhatsApp Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        API Token / Secret Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-mono font-semibold"
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
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("WhatsApp credentials")}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 btn-tactile transition disabled:opacity-50"
                  >
                    Save WhatsApp configuration
                  </button>
                </div>
              </div>

              {/* Local SMS Gateway (BulkSMSBD) */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-orange-600">
                      <PhoneIcon className="w-5 h-5 text-orange-600" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Local SMS Gateway (BulkSMSBD)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Fast delivery across Grameenphone, Banglalink, Robi, Teletalk.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* SMS API Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        BulkSMSBD API Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                        className="text-[10px] text-orange-600 hover:text-orange-700 font-mono font-semibold"
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
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Sender ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  {/* SMS Endpoint URL */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("SMS credentials")}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50"
                  >
                    Save SMS configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4.5: SECURITY, MASTER PASSWORDS & RECOVERY CONTACTS   */}
        {/* ========================================================= */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Security Overview Banner */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Security Settings
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                    Super Admin Security &amp; Recovery
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage platform owner credentials, configure emergency recovery email &amp; phone, and update master passwords.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/admin/login"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition"
                  >
                    <LockIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Preview admin login</span>
                    <span>↗</span>
                  </Link>
                </div>
              </div>

              {/* Master Identity Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Master Administrator
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono break-all">
                    {ADMIN_EMAIL}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Verified platform owner</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Active Recovery Email
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono break-all">
                    {saasSettings.admin_recovery_email || "Not Configured"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Dispatches emergency password resets
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Active Recovery Phone
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono">
                    {saasSettings.admin_recovery_phone || "Not Configured"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Emergency SMS &amp; WhatsApp alerts
                  </p>
                </div>
              </div>

              {/* Form 1: Recovery Contacts */}
              <div className="border-t border-slate-100 pt-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-slate-600" />
                    <span>Emergency Recovery Contacts</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your backup email and phone number. If you ever lose access to this browser, these details are used to verify and recover your master account.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Recovery Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Recovery Email Address
                    </label>
                    <input
                      type="email"
                      value={saasSettings.admin_recovery_email || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          admin_recovery_email: e.target.value,
                        }))
                      }
                      placeholder="mdnoyon356268@gmail.com"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Password reset codes and security notifications will be sent to this email.
                    </p>
                  </div>

                  {/* Recovery Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Recovery Phone / WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={saasSettings.admin_recovery_phone || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          admin_recovery_phone: e.target.value,
                        }))
                      }
                      placeholder="+8801700000000"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Used for critical SMS alerts, OTP verification, and suspicious access warnings.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("Recovery Contacts")}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50 cursor-pointer"
                  >
                    <span>{savingSettings ? "Saving…" : "Save Recovery Contacts"}</span>
                  </button>
                </div>
              </div>

              {/* Form 2: Change Master Password */}
              <div className="border-t border-slate-100 pt-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <KeyIcon className="w-4 h-4 text-slate-600" />
                    <span>Update Super Admin Password</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set a new strong password for <code className="text-orange-700 bg-orange-50 px-1 py-0.5 rounded font-mono font-bold">{ADMIN_EMAIL}</code>.
                  </p>
                </div>

                <form onSubmit={handleChangeAdminPassword} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminNewPass ? "text" : "password"}
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminNewPass(!showAdminNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px]"
                        >
                          {showAdminNewPass ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Confirm New Password
                      </label>
                      <input
                        type={showAdminNewPass ? "text" : "password"}
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={changingPassword || !newAdminPassword}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-slate-900/20 hover:bg-slate-800 btn-tactile transition disabled:opacity-50 cursor-pointer"
                    >
                      <LockIcon className="w-3.5 h-3.5 text-white" />
                      <span>{changingPassword ? "Updating Password…" : "Update Super Admin Password"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Self-Service Reset & Security Architecture Info */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 space-y-2 text-xs text-teal-900">
                <div className="flex items-center gap-2 font-bold text-teal-950">
                  <span>Self-Service Recovery Mechanism</span>
                </div>
                <p className="leading-relaxed text-teal-800">
                  If you ever forget your password, simply navigate to{" "}
                  <Link href="/admin/login" className="font-bold underline text-teal-950">
                    /admin/login
                  </Link>{" "}
                  and click <strong>&quot;Forgot Password?&quot;</strong>. The system will immediately dispatch a secure 1-click password reset link to{" "}
                  <code className="font-mono font-bold bg-teal-100/80 px-1 py-0.5 rounded">{ADMIN_EMAIL}</code>.
                </p>
                <p className="leading-relaxed text-teal-800/80 text-[11px]">
                  All administrative logins and password changes are cryptographically verified and recorded in the Immutable Activity Audit Trail.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ACTIVITY FOOTPRINTS (LOGISTICS AUDIT TRAIL)        */}
        {/* ========================================================= */}
        {activeTab === "footprints" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Audit Logs
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                    Activity Footprints &amp; Audit Trail
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Tamper-evident logs of order dispatches, stock intake, configuration mutations, and staff interactions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={fetchActivityLogs}
                    disabled={logsLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
                  >
                    <RefreshIcon className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
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
                    { id: "ORDER_DISPATCHED", label: "Dispatched" },
                    { id: "SETTINGS_UPDATED", label: "Settings" },
                    { id: "PRODUCT_CREATED", label: "Catalog" },
                    { id: "BULK_IMPORT", label: "Bulk CSV" },
                    { id: "COURIER_CONFIGURED", label: "Couriers" },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setLogFilterAction(pill.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        logFilterAction === pill.id
                          ? "bg-orange-600 text-white shadow-xs btn-tactile"
                          : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">
                    <SearchIcon className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs, email, IP..."
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                  />
                  {logSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLogSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <CloseIcon className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Logs Table */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono font-bold">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action Type</th>
                        <th className="px-4 py-3">Event Details</th>
                        <th className="px-4 py-3">Actor / IP</th>
                        <th className="px-4 py-3">Workspace Scope</th>
                        <th className="px-4 py-3 text-right">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
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
                            "bg-slate-100 text-slate-700 border-slate-200";
                          if (log.action_type === "ORDER_DISPATCHED") {
                            badgeClass =
                              "bg-emerald-50 text-emerald-700 border-emerald-200";
                          } else if (log.action_type === "SETTINGS_UPDATED") {
                            badgeClass =
                              "bg-orange-50 text-orange-700 border-orange-200";
                          } else if (log.action_type === "PRODUCT_CREATED") {
                            badgeClass =
                              "bg-cyan-50 text-cyan-700 border-cyan-200";
                          } else if (log.action_type === "BULK_IMPORT") {
                            badgeClass =
                              "bg-purple-50 text-purple-700 border-purple-200";
                          } else if (log.action_type === "COURIER_CONFIGURED") {
                            badgeClass =
                              "bg-sky-50 text-sky-700 border-sky-200";
                          }

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-50/70 transition group"
                            >
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
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

                              <td className="px-4 py-3 font-medium text-slate-900 max-w-xs md:max-w-md truncate">
                                <div>{log.details}</div>
                                {isExpanded && hasMetadata && (
                                  <pre className="mt-2 rounded-xl bg-slate-900 p-2.5 font-mono text-[10px] text-emerald-400 overflow-x-auto border border-slate-800">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-slate-900 font-medium">
                                  {log.user_email || "System Service"}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  IP: {log.ip_address || "Internal"}
                                </div>
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap font-mono text-[10px] text-slate-500">
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
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono text-orange-600 hover:text-orange-700 hover:bg-orange-50 shadow-2xs transition"
                                  >
                                    <span>{isExpanded ? "▲ Hide" : "▼ Payload"}</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono">
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
                            <FileTextIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No activity footprints found.
                            <div className="mt-1 text-[11px] text-slate-400">
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

        {/* ── TASKS & LOGISTICS TEAM DISPATCH TAB ────────────────── */}
        {activeTab === "tasks" && (
          <AdminTasksTab triggerToast={triggerToast} />
        )}

        {/* ── CONTENT & BLOG SEO TAB ──────────────────────────────── */}
        {activeTab === "blog" && (
          <AdminBlogTab triggerToast={triggerToast} />
        )}
      </div>
    </main>
  );
}
