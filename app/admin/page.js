"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import AdminTasksTab from "./components/AdminTasksTab";
import AdminBlogTab from "./components/AdminBlogTab";
import BangladeshDivisionMap from "@/components/BangladeshDivisionMap";
import {
  TenantStatusDonutChart,
  AdminMrrDualAxisChart,
  PlanDistributionList,
} from "./components/AdminCharts";

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

  // ── Sidebar & Analytics Navigation State ───────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hoveredDivision, setHoveredDivision] = useState(null);
  const [tenantSearchQuery, setTenantSearchQuery] = useState("");

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

  // ── Subscription Payments Desk State ───────────────────────
  const [payments, setPayments] = useState([]);
  const [approvingPaymentId, setApprovingPaymentId] = useState(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [offlinePaymentForm, setOfflinePaymentForm] = useState({
    tenantId: "",
    storeName: "",
    ownerEmail: "",
    amount: "1990",
    method: "bKash Personal",
    phone: "",
    trxId: "",
    plan: "Growth Pro",
    notes: "",
  });

  // ── Provision New Store Modal State ─────────────────────────
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisioningStore, setProvisioningStore] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    name: "",
    ownerEmail: "",
    initialPassword: "",
    phone: "",
    division: "Dhaka",
    plan: "growth",
    billingStatus: "Trial",
    preloadSampleProducts: true,
  });
  const [provisionedStoreResult, setProvisionedStoreResult] = useState(null);

  // ── God-Mode Merchant Control Drawer State ──────────────────
  const [selectedTenantForGodMode, setSelectedTenantForGodMode] = useState(null);
  const [godModeSaving, setGodModeSaving] = useState(false);
  const [godModeNewPassword, setGodModeNewPassword] = useState("");

  const generateNewStorePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStoreForm((prev) => ({ ...prev, initialPassword: pwd }));
  };

  const generateGodModePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGodModeNewPassword(pwd);
  };

  // Toast trigger
  const triggerToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Tenant Validity & Notification Management States ─────────
  const [tenantFilterTab, setTenantFilterTab] = useState("all"); // "all" | "expiring" | "trial" | "active" | "expired"
  const [autoAlertRunning, setAutoAlertRunning] = useState(false);

  // Edit Store & Plan Modal State
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState(null);
  const [editStoreSaving, setEditStoreSaving] = useState(false);
  const [editStoreForm, setEditStoreForm] = useState({
    name: "",
    phone: "",
    division: "Dhaka",
    plan: "starter",
    status: "Active",
    customExpiry: "",
    order_limit: 1000,
    sku_limit: 250,
    features: {
      courier_reconciliation: true,
      expense_profit_tracker: true,
      ai_reorder_hub: true,
      thermal_printing: true,
    },
  });

  // Single Merchant Notification Modal State
  const [selectedTenantForNotify, setSelectedTenantForNotify] = useState(null);
  const [notifySending, setNotifySending] = useState(false);
  const [notifyForm, setNotifyForm] = useState({
    title: "",
    message: "",
    type: "warning",
    category: "renewal",
  });

  // Broadcast to All Merchants Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    type: "info",
    category: "system",
    target: "all",
  });

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
            router.replace("/login");
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
            router.replace("/dashboard");
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
          if (overviewData.payments) setPayments(overviewData.payments);
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
      if (overviewData?.payments) setPayments(overviewData.payments);
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

  // ── Provision New Store Handler ───────────────────────────
  async function handleProvisionStore(e) {
    e.preventDefault();
    if (!newStoreForm.name || !newStoreForm.ownerEmail || !newStoreForm.initialPassword) {
      triggerToast("error", "Store name, owner email, and password are required.");
      return;
    }
    setProvisioningStore(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStoreForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to provision merchant store.");
      }
      triggerToast("success", `Store "${newStoreForm.name}" provisioned successfully!`);
      setProvisionedStoreResult(
        json.credentials || {
          storeName: newStoreForm.name,
          email: newStoreForm.ownerEmail,
          password: newStoreForm.initialPassword,
          loginUrl: typeof window !== "undefined" ? `${window.location.origin}/login` : "/login",
        }
      );
      setShowProvisionModal(false);
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Failed to provision store.");
    } finally {
      setProvisioningStore(false);
    }
  }

  // ── Tenant Status Toggle ───────────────────────────────────
  async function handleToggleTenantStatus(tenantId, currentStatus) {
    const nextStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          tenantId,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to toggle status.");
      }
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, status: nextStatus } : t))
      );
      if (selectedTenantForGodMode?.id === tenantId) {
        setSelectedTenantForGodMode((prev) => ({ ...prev, status: nextStatus }));
      }
      triggerToast("success", `Store status updated to ${nextStatus}.`);
    } catch (err) {
      triggerToast("error", err.message || "Error updating store status.");
    }
  }

  // ── God-Mode: Plan & Validity Update ───────────────────────
  async function handleGodModePlanUpdate(plan, addDays) {
    if (!selectedTenantForGodMode) return;
    setGodModeSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_plan",
          tenantId: selectedTenantForGodMode.id,
          plan,
          addDays,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update plan.");
      }
      triggerToast("success", "Store plan and validity updated!");
      setSelectedTenantForGodMode((prev) => ({
        ...prev,
        plan: json.config?.plan || plan,
        config: json.config || prev.config,
      }));
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Error updating plan.");
    } finally {
      setGodModeSaving(false);
    }
  }

  // ── God-Mode: Toggle Per-Tenant Feature ─────────────────────
  async function handleGodModeFeatureToggle(featureKey, enabled) {
    if (!selectedTenantForGodMode) return;
    setGodModeSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_feature",
          tenantId: selectedTenantForGodMode.id,
          featureKey,
          enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to toggle feature.");
      }
      triggerToast("success", `Feature updated.`);
      setSelectedTenantForGodMode((prev) => ({
        ...prev,
        config: json.config || prev.config,
      }));
    } catch (err) {
      triggerToast("error", err.message || "Error updating feature.");
    } finally {
      setGodModeSaving(false);
    }
  }

  // ── God-Mode: Reset Merchant Password ──────────────────────
  async function handleGodModeResetPassword() {
    if (!selectedTenantForGodMode || !godModeNewPassword) return;
    if (godModeNewPassword.length < 6) {
      triggerToast("error", "Password must be at least 6 characters.");
      return;
    }
    setGodModeSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          tenantId: selectedTenantForGodMode.id,
          ownerEmail: selectedTenantForGodMode.ownerEmail,
          newPassword: godModeNewPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to reset password.");
      }
      triggerToast("success", "Owner password updated successfully!");
      setGodModeNewPassword("");
    } catch (err) {
      triggerToast("error", err.message || "Error resetting password.");
    } finally {
      setGodModeSaving(false);
    }
  }

  // ── Subscription Approvals: Approve ────────────────────────
  async function handleApprovePayment(paymentId, businessId) {
    setApprovingPaymentId(paymentId);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_payment",
          paymentId,
          targetBusinessId: businessId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to approve payment.");
      }
      triggerToast("success", "Payment approved! Store subscription extended by 30 days.");
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Error approving payment.");
    } finally {
      setApprovingPaymentId(null);
    }
  }

  // ── Subscription Approvals: Record Offline Payment ─────────
  async function handleRecordOfflinePayment(e) {
    e.preventDefault();
    if (!offlinePaymentForm.tenantId || !offlinePaymentForm.amount) {
      triggerToast("error", "Select a store and enter the payment amount.");
      return;
    }
    const targetTenant = tenants.find((t) => t.id === offlinePaymentForm.tenantId);
    setRecordingPayment(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_payment",
          tenantId: offlinePaymentForm.tenantId,
          storeName: targetTenant?.name || offlinePaymentForm.storeName,
          ownerEmail: targetTenant?.ownerEmail || offlinePaymentForm.ownerEmail,
          amount: offlinePaymentForm.amount,
          method: offlinePaymentForm.method,
          phone: offlinePaymentForm.phone,
          trxId: offlinePaymentForm.trxId,
          plan: offlinePaymentForm.plan,
          notes: offlinePaymentForm.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to record payment.");
      }
      triggerToast("success", "Offline payment recorded and store extended by 30 days!");
      setShowRecordPaymentModal(false);
      setOfflinePaymentForm({
        tenantId: "",
        storeName: "",
        ownerEmail: "",
        amount: "1990",
        method: "bKash Personal",
        phone: "",
        trxId: "",
        plan: "Growth Pro",
        notes: "",
      });
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Error recording payment.");
    } finally {
      setRecordingPayment(false);
    }
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

  // ── Open Edit Store Modal ─────────────────────────────────
  function handleOpenEditStore(t) {
    const conf = t.config || {};
    let formattedExpiry = "";
    if (t.expires_at || conf.expires_at) {
      try {
        formattedExpiry = new Date(t.expires_at || conf.expires_at).toISOString().split("T")[0];
      } catch {}
    }

    setSelectedTenantForEdit(t);
    setEditStoreForm({
      name: t.name || "",
      phone: t.phone || conf.phone || "",
      division: t.division || conf.division || "Dhaka",
      plan: conf.plan || t.plan || "starter",
      status: conf.status || t.status || "Active",
      customExpiry: formattedExpiry,
      order_limit: conf.order_limit || t.order_limit || 1000,
      sku_limit: conf.sku_limit || t.sku_limit || 250,
      features: {
        courier_reconciliation: conf.features?.courier_reconciliation ?? true,
        expense_profit_tracker: conf.features?.expense_profit_tracker ?? true,
        ai_reorder_hub: conf.features?.ai_reorder_hub ?? true,
        thermal_printing: conf.features?.thermal_printing ?? true,
      },
    });
  }

  // ── Save Edited Store Profile & Plan ───────────────────────
  async function handleSaveEditStore(e) {
    if (e) e.preventDefault();
    if (!selectedTenantForEdit) return;
    setEditStoreSaving(true);
    try {
      const payload = {
        action: "manage_tenant",
        tenantId: selectedTenantForEdit.id,
        name: editStoreForm.name,
        phone: editStoreForm.phone,
        division: editStoreForm.division,
        plan: editStoreForm.plan,
        status: editStoreForm.status,
        customExpiry: editStoreForm.customExpiry ? new Date(editStoreForm.customExpiry).toISOString() : null,
        orderLimit: editStoreForm.order_limit,
        skuLimit: editStoreForm.sku_limit,
        features: editStoreForm.features,
      };

      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update tenant store.");
      }

      triggerToast("success", `Store "${editStoreForm.name}" updated successfully!`);
      setSelectedTenantForEdit(null);
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Failed to update store.");
    } finally {
      setEditStoreSaving(false);
    }
  }

  // ── Quick Extend Days for Edit Store Modal ─────────────────
  function handleQuickExtendDays(days) {
    const current = editStoreForm.customExpiry ? new Date(editStoreForm.customExpiry) : new Date();
    const base = current > new Date() ? current : new Date();
    const nextDate = new Date(base.getTime() + days * 86400000);
    setEditStoreForm((prev) => ({
      ...prev,
      customExpiry: nextDate.toISOString().split("T")[0],
    }));
  }

  // ── Open Targeted Notification Modal ───────────────────────
  function handleOpenNotifyModal(t) {
    setSelectedTenantForNotify(t);
    const conf = t.config || {};
    const exp = t.expires_at || conf.expires_at;
    let days = null;
    if (exp) {
      days = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
    }

    if (days !== null && days <= 0) {
      setNotifyForm({
        title: "Subscription / Trial Expired - Action Required",
        message: `Hello ${t.name}! Your store subscription has expired. Please upgrade or renew your plan via bKash/Nagad on your Billing page to maintain seamless order sync and barcode label printing.`,
        type: "alert",
        category: "renewal",
      });
    } else if (days !== null && days <= 5) {
      setNotifyForm({
        title: `${days} Day${days === 1 ? "" : "s"} Left on Your Subscription`,
        message: `Dear ${t.name} team, your ${t.status === "Trial" ? "15-day trial" : "subscription"} will expire in ${days} day${days === 1 ? "" : "s"}. Renew today to continue processing customer parcels without interruption.`,
        type: "warning",
        category: "renewal",
      });
    } else {
      setNotifyForm({
        title: `Notice for ${t.name}`,
        message: `Hello ${t.name}! We have an important platform update for your store.`,
        type: "info",
        category: "custom",
      });
    }
  }

  // ── Send Targeted Notification to Single Merchant ─────────
  async function handleSendNotification(e) {
    if (e) e.preventDefault();
    if (!selectedTenantForNotify) return;
    setNotifySending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "single",
          tenantId: selectedTenantForNotify.id,
          title: notifyForm.title,
          message: notifyForm.message,
          type: notifyForm.type,
          category: notifyForm.category,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send notification.");
      }
      triggerToast("success", `Notification delivered to "${selectedTenantForNotify.name}"!`);
      setSelectedTenantForNotify(null);
    } catch (err) {
      triggerToast("error", err.message || "Failed to deliver notification.");
    } finally {
      setNotifySending(false);
    }
  }

  // ── Send Broadcast Announcement to All Merchants ──────────
  async function handleSendBroadcast(e) {
    if (e) e.preventDefault();
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          title: broadcastForm.title,
          message: broadcastForm.message,
          type: broadcastForm.type,
          category: broadcastForm.category,
          target: broadcastForm.target,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send broadcast announcement.");
      }
      triggerToast("success", json.message || "Broadcast sent to all merchants!");
      setShowBroadcastModal(false);
    } catch (err) {
      triggerToast("error", err.message || "Failed to dispatch broadcast.");
    } finally {
      setBroadcastSending(false);
    }
  }

  // ── Auto-Alert Expiring Stores (1-Click Engine) ────────────
  async function handleAutoAlertExpiringStores() {
    setAutoAlertRunning(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto_scan_expiry",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to run auto-alert scan.");
      }
      triggerToast("success", json.message || "Auto-alert scan completed!");
    } catch (err) {
      triggerToast("error", err.message || "Failed to trigger auto-alerts.");
    } finally {
      setAutoAlertRunning(false);
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

  // ── 1. STEALTH LOADING SCREEN ─────────────────────────────
  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center p-4 text-slate-700 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs text-slate-400 font-mono">Loading…</p>
        </div>
      </main>
    );
  }

  // ── 2. STEALTH ACCESS GUARD (SILENT REDIRECT - NO 403 LEAKS) ──
  if (!isAuthorized) {
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard");
    }
    return null;
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

  // ── Helper to calculate validity & days remaining ────────────
  const getTenantValidity = (t) => {
    const exp = t.expires_at || t.config?.expires_at;
    if (!exp) return { daysRemaining: null, isExpired: false, isExpiring: false, label: "Ongoing", expiryDate: "Ongoing" };
    const daysRemaining = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
    const isExpired = daysRemaining <= 0;
    const isExpiring = daysRemaining > 0 && daysRemaining <= 5;
    return {
      daysRemaining,
      isExpired,
      isExpiring,
      label: isExpired ? "Expired" : `${daysRemaining}d left`,
      expiryDate: new Date(exp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
  };

  const expiringTenantsCount = tenants.filter((t) => getTenantValidity(t).isExpiring).length;
  const expiredTenantsCount = tenants.filter((t) => getTenantValidity(t).isExpired).length;
  const trialTenantsCount = tenants.filter((t) => t.status === "Trial").length;
  const activeTenantsCount = tenants.filter((t) => t.status === "Active").length;
  const suspendedTenantsCount = tenants.filter((t) => t.status === "Suspended").length;

  // ── Filtered Tenants (Search + Status/Validity Tab) ──────────
  const filteredTenants = tenants.filter((t) => {
    const val = getTenantValidity(t);
    if (tenantFilterTab === "expiring" && !val.isExpiring) return false;
    if (tenantFilterTab === "expired" && !val.isExpired) return false;
    if (tenantFilterTab === "trial" && t.status !== "Trial") return false;
    if (tenantFilterTab === "active" && t.status !== "Active") return false;

    if (!tenantSearchQuery.trim()) return true;
    const q = tenantSearchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.ownerEmail?.toLowerCase().includes(q) ||
      String(t.id).toLowerCase().includes(q)
    );
  });

  const estimatedMrr = Math.round(
    (summary.totalTenants || 1) *
      (saasSettings.pro_plan_price || 49) *
      (saasSettings.bdt_exchange_rate || 122)
  );

  const divisionStats = [
    { id: "dhaka", name: "Dhaka", code: "01", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.44), 14), pct: 44.2 },
    { id: "chittagong", name: "Chittagong", code: "02", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.22), 7), pct: 21.8 },
    { id: "sylhet", name: "Sylhet", code: "03", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.11), 4), pct: 10.9 },
    { id: "rajshahi", name: "Rajshahi", code: "04", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.08), 3), pct: 7.8 },
    { id: "khulna", name: "Khulna", code: "05", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.06), 2), pct: 6.2 },
    { id: "barisal", name: "Barisal", code: "06", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.04), 1), pct: 4.1 },
    { id: "rangpur", name: "Rangpur", code: "07", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.03), 1), pct: 3.2 },
    { id: "mymensingh", name: "Mymensingh", code: "08", orders: Math.max(Math.round((summary.totalOrders || 32) * 0.02), 1), pct: 1.8 },
  ];

  const planData = [
    { name: "Starter Tier (Free Quota)", count: Math.max(1, Math.round((summary.totalTenants || 1) * 0.35)), pct: 35 },
    { name: "Growth Pro (৳4,999/mo)", count: Math.max(1, Math.round((summary.totalTenants || 1) * 0.50)), pct: 50 },
    { name: "Scale & Enterprise", count: Math.max(0, Math.round((summary.totalTenants || 1) * 0.15)), pct: 15 },
  ];

  const ADMIN_NAV_GROUPS = [
    {
      group: "PLATFORM OVERVIEW",
      items: [
        {
          id: "overview",
          label: "Dashboard",
          tab: "overview",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: "TENANTS & MERCHANTS",
      items: [
        {
          id: "merchant-stores",
          label: "Merchant Stores",
          tab: "overview",
          scrollTo: "merchant-directory",
          badge: tenants.length,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          id: "pricing",
          label: "Subscriptions & Plans",
          tab: "pricing",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          id: "payments",
          label: "Payment Approvals",
          tab: "payments",
          badge: (saasSettings.sslcommerz_store_id || saasSettings.stripe_public_key) ? "Live" : null,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: "SYSTEM & CONTENT",
      items: [
        {
          id: "integrations",
          label: "Courier API Health",
          tab: "integrations",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          id: "blog",
          label: "Blog & SEO CMS",
          tab: "blog",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          ),
        },
        {
          id: "tasks",
          label: "Admin Tasks",
          tab: "tasks",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
        {
          id: "security",
          label: "System Settings",
          tab: "security",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
        },
        {
          id: "footprints",
          label: "Audit Trail",
          tab: "footprints",
          badge: activityLogs.length || null,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-800 font-sans selection:bg-orange-500 selection:text-white">
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

      {/* ── FIXED LEFT SIDEBAR (DESKTOP) ────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/80 hidden lg:flex flex-col justify-between transition-all duration-200 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-200/80 flex items-center justify-between px-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white shadow-xs shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-semibold text-sm tracking-tight text-slate-900 truncate">
                  Super Admin
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Control Plane
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
          {ADMIN_NAV_GROUPS.map((grp) => (
            <div key={grp.group} className="space-y-1">
              {!sidebarCollapsed ? (
                <div className="text-[11px] font-semibold tracking-wider text-slate-400 px-3 mb-1.5 uppercase font-mono">
                  {grp.group}
                </div>
              ) : (
                <div className="h-2" />
              )}

              {grp.items.map((item) => {
                const isActive = item.tab === activeTab;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.tab);
                      if (item.scrollTo) {
                        setTimeout(() => {
                          document.getElementById(item.scrollTo)?.scrollIntoView({ behavior: "smooth" });
                        }, 100);
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      sidebarCollapsed ? "justify-center px-2" : "justify-between"
                    } ${
                      isActive
                        ? "bg-orange-50 text-orange-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? "text-orange-600" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex items-center gap-1.5">
                        {item.badge !== undefined && item.badge !== null && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                            {item.badge}
                          </span>
                        )}
                        {isActive && <span className="text-orange-600 text-xs font-bold">›</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 space-y-2">
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? "justify-center" : "px-1"}`}>
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shrink-0">
              N
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800 truncate">Noyon</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">Super Admin</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition cursor-pointer ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Sign out of Super Admin"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER BAR & DRAWER ─────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-slate-900">Admin Console</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4">
              <span className="font-semibold text-sm text-slate-900">Admin Navigation</span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {ADMIN_NAV_GROUPS.map((grp) => (
                <div key={grp.group} className="space-y-1">
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 px-3 mb-1.5 uppercase font-mono">
                    {grp.group}
                  </div>
                  {grp.items.map((item) => {
                    const isActive = item.tab === activeTab;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.tab);
                          setMobileSidebarOpen(false);
                          if (item.scrollTo) {
                            setTimeout(() => {
                              document.getElementById(item.scrollTo)?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                          isActive ? "bg-orange-50 text-orange-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={isActive ? "text-orange-600" : "text-slate-400"}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {isActive && <span className="text-orange-600 text-xs font-bold">›</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CANVAS ─────────────────────────────────── */}
      <div
        className={`min-h-screen flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Sticky Desktop Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-900 capitalize">
                {activeTab === "overview" ? "Dashboard" : activeTab.replace("-", " ")}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 text-[11px] font-mono hidden sm:inline">
                {currentUserEmail}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
                Synced: {lastRefreshed}
              </span>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50 cursor-pointer"
              title="Synchronize platform data"
            >
              <svg className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? "Syncing…" : "Sync"}</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 text-xs font-medium transition cursor-pointer"
            >
              <span>Merchant App →</span>
            </Link>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Error Banner */}
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
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Row 0: Platform Summary Strip (4 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-medium">
                      Total Tenants
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <BuildingIcon className="w-4 h-4 text-orange-600" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight font-sans">
                    {loading ? "…" : summary.totalTenants}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Isolated merchant stores
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-medium">
                      Catalog SKUs
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <PackageIcon className="w-4 h-4 text-blue-600" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight font-sans">
                    {loading ? "…" : summary.totalSkus.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Unique barcodes across stores
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-medium">
                      Platform GMV
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TruckIcon className="w-4 h-4 text-emerald-600" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight font-mono">
                    ৳{loading ? "…" : summary.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {summary.totalDispatched} dispatched · {summary.totalOrders} total
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-medium">
                      Estimated MRR
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CreditCardIcon className="w-4 h-4 text-purple-600" />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight font-mono">
                    ৳{loading ? "…" : estimatedMrr.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Active SaaS subscriptions</span>
                  </div>
                </div>
              </div>

              {/* Row 1: Visual Analytics (Tenant Donut 5 cols + Dual-Axis MRR 7 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Tenant Status
                      </h2>
                      <p className="text-xs text-slate-400">
                        Active merchant store breakdown
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Live</span>
                  </div>
                  <TenantStatusDonutChart
                    active={activeTenantsCount}
                    trial={trialTenantsCount}
                    suspended={suspendedTenantsCount}
                  />
                </div>

                <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        MRR &amp; Platform Orders
                      </h2>
                      <p className="text-xs text-slate-400">
                        Monthly recurring revenue and order throughput
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                        <span className="text-slate-600">MRR (৳)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-slate-900" />
                        <span className="text-slate-600">Orders</span>
                      </div>
                    </div>
                  </div>
                  <AdminMrrDualAxisChart />
                </div>
              </div>

              {/* Row 2: Visual Analytics (Bangladesh Division Map 7 cols + Plan/Courier Stack 5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Merchant Distribution by Division
                      </h2>
                      <p className="text-xs text-slate-400">
                        National coverage across Bangladesh 8 divisions
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      8 Divisions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-6 flex justify-center">
                      <BangladeshDivisionMap
                        divisionStats={divisionStats}
                        hoveredDivision={hoveredDivision}
                        onHoverDivision={setHoveredDivision}
                      />
                    </div>

                    <div className="md:col-span-6 space-y-2">
                      {divisionStats.map((div) => {
                        const isHovered = hoveredDivision === div.id;
                        return (
                          <div
                            key={div.id}
                            onMouseEnter={() => setHoveredDivision(div.id)}
                            onMouseLeave={() => setHoveredDivision(null)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isHovered ? "bg-orange-50/80 text-orange-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[10px] text-slate-400">
                                {div.code}
                              </span>
                              <span className="font-medium">{div.name}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-semibold text-slate-900">
                                {div.orders} stores
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                ({div.pct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
                  <div>
                    <div className="border-b border-slate-100 pb-3 mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Subscription Plans
                      </h2>
                      <p className="text-xs text-slate-400">
                        Merchant tier enrollment
                      </p>
                    </div>
                    <PlanDistributionList plans={planData} />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="mb-3">
                      <h3 className="text-xs font-semibold text-slate-700">
                        Courier Gateway Coverage
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Dispatched volume across connected delivery partners
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(courierBreakdown).slice(0, 4).map(([courier, count]) => {
                        const pct = Math.round((count / totalCourierOrders) * 100);
                        return (
                          <div key={courier} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                            <div className="text-[11px] font-medium text-slate-500">{courier}</div>
                            <div className="text-base font-semibold text-slate-900 font-mono">{count}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{pct}% volume</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchant Store Directory Table */}
              <div id="merchant-directory" className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden scroll-mt-20">
                <div className="p-5 border-b border-slate-200 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <BuildingIcon className="w-4 h-4 text-slate-600" />
                        Merchant Store Directory ({tenants.length})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Multi-tenant workspaces, subscription validity (myad), quota tracking, and instant merchant alerts.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-56">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SearchIcon className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          value={tenantSearchQuery}
                          onChange={(e) => setTenantSearchQuery(e.target.value)}
                          placeholder="Search store name or email…"
                          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 transition"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoAlertExpiringStores}
                        disabled={autoAlertRunning}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium shadow-2xs transition shrink-0 cursor-pointer disabled:opacity-50"
                        title="Scan all stores and automatically dispatch renewal alert notifications to expiring merchants"
                      >
                        {autoAlertRunning ? (
                          <svg className="animate-spin w-3.5 h-3.5 text-amber-700" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        <span>Auto-Alert Expiring</span>
                        {expiringTenantsCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                            {expiringTenantsCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBroadcastModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition shrink-0 cursor-pointer"
                        title="Send announcement or platform update to all merchants"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        <span>Broadcast to All</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          generateNewStorePassword();
                          setShowProvisionModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition shrink-0 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Provision Store</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Tabs by Validity & Status */}
                  <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 overflow-x-auto no-scrollbar">
                    {[
                      { key: "all", label: "All Stores", count: tenants.length },
                      { key: "expiring", label: "Expiring Soon (≤ 5d)", count: expiringTenantsCount, alert: expiringTenantsCount > 0 },
                      { key: "trial", label: "Trial Accounts", count: trialTenantsCount },
                      { key: "active", label: "Active Paying", count: activeTenantsCount },
                      { key: "expired", label: "Expired", count: expiredTenantsCount, alert: expiredTenantsCount > 0 },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setTenantFilterTab(tab.key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                          tenantFilterTab === tab.key
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            tenantFilterTab === tab.key
                              ? "bg-slate-800 text-slate-200"
                              : tab.alert
                              ? "bg-amber-100 text-amber-800 font-bold"
                              : "bg-slate-200/80 text-slate-600"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Store Name</th>
                        <th className="px-5 py-3.5 font-semibold">Owner Email</th>
                        <th className="px-5 py-3.5 font-semibold">Validity / Myad</th>
                        <th className="px-4 py-3.5 font-semibold">Products</th>
                        <th className="px-4 py-3.5 font-semibold">Orders</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-sans">
                      {filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-slate-400 text-xs">
                            No merchant stores match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((t) => {
                          const val = getTenantValidity(t);
                          const orderLimit = t.order_limit || t.config?.order_limit || 1000;
                          const currentOrders = t.orderCount ?? t.totalOrders ?? 0;
                          const planTier = (t.config?.plan || t.plan || "starter").toUpperCase();

                          return (
                            <tr
                              key={t.id}
                              className="hover:bg-slate-50/70 transition cursor-pointer"
                              onClick={() => setSelectedTenantForGodMode(t)}
                            >
                              <td className="px-5 py-4 font-semibold text-slate-900">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate max-w-[160px]">{t.name}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 uppercase shrink-0">
                                      {planTier}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ID: {t.id.slice(0, 8)}…
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-slate-600 font-mono text-[11px]">
                                {t.ownerEmail}
                              </td>

                              {/* Validity & Expiry Column */}
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    {val.daysRemaining === null ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        Ongoing Active
                                      </span>
                                    ) : val.isExpired ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                        Expired
                                      </span>
                                    ) : val.isExpiring ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        {val.daysRemaining}d left
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {val.daysRemaining}d left
                                      </span>
                                    )}

                                    {t.status === "Trial" && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-50 text-purple-700 border border-purple-200">
                                        Trial
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {val.expiryDate}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-orange-700 font-semibold font-mono">
                                {t.skuCount ?? t.totalSkus ?? 0}
                              </td>

                              <td className="px-4 py-4 font-mono">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-emerald-700 font-semibold">
                                    {currentOrders}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    / {orderLimit} cap
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                    t.status === "Active"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : t.status === "Trial"
                                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      t.status === "Active"
                                        ? "bg-emerald-500"
                                        : t.status === "Trial"
                                        ? "bg-purple-500"
                                        : "bg-rose-500"
                                    }`}
                                  />
                                  {t.status}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStore(t)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition cursor-pointer flex items-center gap-1"
                                    title="Edit store plan, validity, and quotas"
                                  >
                                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenNotifyModal(t)}
                                    className="rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                                    title="Send targeted alert notification to merchant"
                                  >
                                    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span>Notify</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedTenantForGodMode(t)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                                  >
                                    God Mode
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleTenantStatus(t.id, t.status)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                                  >
                                    {t.status === "Active" ? "Suspend" : "Activate"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTenant(t.id, t.name)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                  >
                                    Purge
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Order Activity Feed */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
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
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none w-full sm:w-64 transition"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Order</th>
                        <th className="px-4 py-3 font-semibold">Store</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Courier</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-6 text-center text-slate-400 text-xs">
                            No orders found matching the filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.slice(0, 10).map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono text-teal-700 font-semibold">
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
                            <td className="px-4 py-3 font-mono text-emerald-700 font-semibold">
                              ৳{Number(ord.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                                {ord.status || "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
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
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 tracking-tight">
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
                  <h3 className="text-lg font-semibold text-slate-900">Pro Enterprise Plan</h3>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-semibold text-slate-900 font-mono">
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
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. Subscription Payments & Approvals Desk */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4 text-slate-700" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Subscription Payments &amp; TrxID Approvals Desk
                    </h2>
                    {payments.filter((p) => p.status === "PENDING").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {payments.filter((p) => p.status === "PENDING").length} Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    1-click bKash, Nagad &amp; Bank TrxID approvals to activate plans and credit 30 days validity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition self-start sm:self-auto shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Record Offline Payment</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Store / Owner</th>
                      <th className="px-5 py-3 font-semibold">Method &amp; TrxID</th>
                      <th className="px-5 py-3 font-semibold">Amount</th>
                      <th className="px-5 py-3 font-semibold">Plan</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-sans">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-5 py-8 text-center text-slate-400 text-xs font-sans">
                          No merchant subscription payment submissions found.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-900 text-xs">
                              {p.store_name || "Store #" + (p.business_id ? p.business_id.slice(0, 6) : "Direct")}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {p.owner_email || "—"}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-800 text-xs">{p.method}</div>
                            <div className="font-mono text-[11px] text-slate-600 select-all">
                              TrxID: {p.trx_id || p.phone || "—"}
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono font-semibold text-slate-900">
                            ৳{p.amount}
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                              {p.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                p.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : p.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  p.status === "APPROVED"
                                    ? "bg-emerald-500"
                                    : p.status === "REJECTED"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            {p.status === "PENDING" ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={approvingPaymentId === p.id}
                                  onClick={() => handleApprovePayment(p.id, p.business_id)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-medium shadow-2xs transition disabled:opacity-50"
                                >
                                  {approvingPaymentId === p.id ? "Approving…" : "Approve & Credit"}
                                </button>
                              </div>
                            ) : p.status === "APPROVED" ? (
                              <span className="text-emerald-700 text-[11px] font-medium inline-flex items-center gap-1">
                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Credited</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Rejected</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Payment Gateway Configurations */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500 font-semibold">
                    Payment Gateways
                  </span>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 tracking-tight">
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
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 tracking-tight">
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
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 tracking-tight">
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

        {/* ── 1. PROVISION NEW STORE MODAL ───────────────────────── */}
        {showProvisionModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Provision New Merchant Store</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create an isolated tenant workspace and merchant login credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleProvisionStore} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Store / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wearzo Dhaka"
                      value={newStoreForm.name}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, name: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Bangladesh Division
                    </label>
                    <select
                      value={newStoreForm.division}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, division: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      {["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barisal", "Sylhet", "Rangpur", "Mymensingh"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Merchant Owner Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@wearzo.store"
                    value={newStoreForm.ownerEmail}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, ownerEmail: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Initial Login Password *
                    </label>
                    <button
                      type="button"
                      onClick={generateNewStorePassword}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Generate Strong
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newStoreForm.initialPassword}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, initialPassword: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Store Phone / WhatsApp (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="017XXXXXXXX"
                      value={newStoreForm.phone}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, phone: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Plan Tier
                    </label>
                    <select
                      value={newStoreForm.plan}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, plan: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="starter">Starter (৳999/mo - 100 SKUs)</option>
                      <option value="growth">Growth (৳1,990/mo - 500 SKUs)</option>
                      <option value="enterprise">Enterprise (৳4,990/mo - Unlimited)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Billing Initial Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "Trial", label: "Trial (14 Days)" },
                      { id: "Active", label: "Active Paid" },
                      { id: "Exempt", label: "Lifetime / Exempt" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setNewStoreForm({ ...newStoreForm, billingStatus: st.id })}
                        className={`py-1.5 px-2 rounded-md border text-xs font-medium transition ${
                          newStoreForm.billingStatus === st.id
                            ? "border-slate-900 bg-slate-900 text-white shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStoreForm.preloadSampleProducts}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, preloadSampleProducts: e.target.checked })}
                      className="rounded text-slate-900"
                    />
                    <span className="text-xs text-slate-700 font-medium">
                      Preload 3 starter catalog products (Oversized Tee, Heavyweight Hoodie, Polo)
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="px-3.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioningStore}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {provisioningStore && (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Provision Store Workspace</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 2. PROVISIONED STORE RESULT & WHATSAPP MODAL ──────── */}
        {provisionedStoreResult && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <CheckIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Store Successfully Provisioned</h3>
                    <p className="text-[11px] text-slate-500">
                      Share access credentials securely with the merchant owner.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProvisionedStoreResult(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 space-y-2.5">
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Store Name</div>
                    <div className="text-xs font-semibold text-slate-900">{provisionedStoreResult.storeName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Login URL</div>
                    <div className="font-mono text-xs text-blue-600 select-all">{provisionedStoreResult.loginUrl}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Owner Email</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 select-all">{provisionedStoreResult.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Temporary Password</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 select-all">{provisionedStoreResult.password}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Salam! Your Dynamic Inventory store is ready.\n\nStore: ${provisionedStoreResult.storeName}\nPortal: ${provisionedStoreResult.loginUrl}\nEmail: ${provisionedStoreResult.email}\nPassword: ${provisionedStoreResult.password}\n\nPlease sign in and update your password under settings.`;
                      navigator.clipboard.writeText(msg);
                      triggerToast("success", "Credentials copied to clipboard!");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition"
                  >
                    <span>Copy Login Info</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Salam! Your Dynamic Inventory store is ready.\n\nStore: ${provisionedStoreResult.storeName}\nPortal: ${provisionedStoreResult.loginUrl}\nEmail: ${provisionedStoreResult.email}\nPassword: ${provisionedStoreResult.password}\n\nPlease sign in and update your password under settings.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-2xs transition"
                  >
                    <span>Share WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. GOD-MODE MERCHANT CONTROL DRAWER ────────────────── */}
        {selectedTenantForGodMode && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
            <div className="bg-white w-full max-w-lg h-full border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{selectedTenantForGodMode.name}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                        selectedTenantForGodMode.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {selectedTenantForGodMode.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {selectedTenantForGodMode.ownerEmail} • ID: {selectedTenantForGodMode.id.slice(0, 8)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenantForGodMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Metric Strip */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <div className="text-[10px] font-medium text-slate-500 uppercase">Products</div>
                    <div className="font-mono text-sm font-semibold text-slate-900 mt-0.5">
                      {selectedTenantForGodMode.skuCount ?? selectedTenantForGodMode.totalSkus ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <div className="text-[10px] font-medium text-slate-500 uppercase">Orders</div>
                    <div className="font-mono text-sm font-semibold text-slate-900 mt-0.5">
                      {selectedTenantForGodMode.orderCount ?? selectedTenantForGodMode.totalOrders ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <div className="text-[10px] font-medium text-slate-500 uppercase">Plan</div>
                    <div className="font-mono text-xs font-semibold text-blue-700 uppercase mt-1 truncate">
                      {selectedTenantForGodMode.config?.plan || selectedTenantForGodMode.plan || "Growth"}
                    </div>
                  </div>
                </div>

                {/* Section: Subscription & Plan Control */}
                <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900">Subscription &amp; Validity</h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedTenantForGodMode.config?.expires_at
                        ? `Expires: ${new Date(selectedTenantForGodMode.config.expires_at).toLocaleDateString()}`
                        : "Active"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Assigned Plan Tier
                    </label>
                    <select
                      value={selectedTenantForGodMode.config?.plan || selectedTenantForGodMode.plan || "growth"}
                      onChange={(e) => handleGodModePlanUpdate(e.target.value, 0)}
                      disabled={godModeSaving}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="starter">Starter Plan (৳999/mo - 100 SKUs)</option>
                      <option value="growth">Growth Plan (৳1,990/mo - 500 SKUs)</option>
                      <option value="enterprise">Enterprise Plan (৳4,990/mo - Unlimited)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Quick Validity Extension
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "+30 Days", days: 30 },
                        { label: "+90 Days", days: 90 },
                        { label: "+1 Year", days: 365 },
                        { label: "+5 Years", days: 1825 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          disabled={godModeSaving}
                          onClick={() => handleGodModePlanUpdate(null, btn.days)}
                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-mono text-slate-700 shadow-2xs transition disabled:opacity-50"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Store Operational Access</span>
                    <button
                      type="button"
                      disabled={godModeSaving}
                      onClick={() => handleToggleTenantStatus(selectedTenantForGodMode.id, selectedTenantForGodMode.status)}
                      className={`px-3 py-1 rounded text-xs font-medium transition ${
                        selectedTenantForGodMode.status === "Active"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {selectedTenantForGodMode.status === "Active" ? "Suspend Store Access" : "Activate Store Access"}
                    </button>
                  </div>
                </div>

                {/* Section: Feature Toggles */}
                <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white shadow-2xs">
                  <h4 className="text-xs font-semibold text-slate-900">Per-Tenant Feature Overrides</h4>
                  <div className="space-y-2.5">
                    {[
                      { key: "courier_sync", label: "Courier Auto-Sync & Webhooks", desc: "Real-time Steadfast, Pathao & RedX order syncing" },
                      { key: "barcode_scanner", label: "Barcode & Thermal Label Printing", desc: "4x6 label generator & fast camera barcode scanner" },
                      { key: "multi_user", label: "Multi-User Staff Access", desc: "Warehouse staff operator accounts with RBAC" },
                      { key: "profit_analytics", label: "Profit & Loss Margin Reports", desc: "COGS calculations, net profit & expense tracking" },
                    ].map((feat) => {
                      const isEnabled = selectedTenantForGodMode.config?.features?.[feat.key] ?? true;
                      return (
                        <div key={feat.key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="text-xs font-medium text-slate-900">{feat.label}</div>
                            <div className="text-[11px] text-slate-500">{feat.desc}</div>
                          </div>
                          <button
                            type="button"
                            disabled={godModeSaving}
                            onClick={() => handleGodModeFeatureToggle(feat.key, !isEnabled)}
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 ${
                              isEnabled ? "bg-slate-900 justify-end" : "bg-slate-200 justify-start"
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Reset Merchant Password */}
                <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900">Reset Merchant Owner Password</h4>
                    <button
                      type="button"
                      onClick={generateGodModePassword}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Generate Strong
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter new password"
                      value={godModeNewPassword}
                      onChange={(e) => setGodModeNewPassword(e.target.value)}
                      className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={godModeSaving || !godModeNewPassword}
                      onClick={handleGodModeResetPassword}
                      className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50 shrink-0"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-rose-900">Danger Zone</h4>
                  <p className="text-[11px] text-rose-700">
                    Permanently delete this merchant workspace, associated staff accounts, catalog products, and order records.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTenant(selectedTenantForGodMode.id, selectedTenantForGodMode.name);
                      setSelectedTenantForGodMode(null);
                    }}
                    className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-2xs transition"
                  >
                    Purge Store Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. RECORD OFFLINE PAYMENT MODAL ────────────────────── */}
        {showRecordPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Record Direct Merchant Payment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Credit a merchant store for bKash, Nagad, or direct bank payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordOfflinePayment} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Merchant Store *
                  </label>
                  <select
                    required
                    value={offlinePaymentForm.tenantId}
                    onChange={(e) => {
                      const t = tenants.find((item) => item.id === e.target.value);
                      setOfflinePaymentForm({
                        ...offlinePaymentForm,
                        tenantId: e.target.value,
                        storeName: t?.name || "",
                        ownerEmail: t?.ownerEmail || "",
                      });
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                  >
                    <option value="">Select store…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.ownerEmail})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={offlinePaymentForm.method}
                      onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, method: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="bKash Personal">bKash Personal</option>
                      <option value="Nagad Personal">Nagad Personal</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Direct Cash">Direct Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Amount (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      value={offlinePaymentForm.amount}
                      onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, amount: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Transaction ID (TrxID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9J4K2L1M"
                      value={offlinePaymentForm.trxId}
                      onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, trxId: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Plan Credited
                    </label>
                    <select
                      value={offlinePaymentForm.plan}
                      onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, plan: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="Starter">Starter (৳999)</option>
                      <option value="Growth Pro">Growth (৳1,990)</option>
                      <option value="Enterprise">Enterprise (৳4,990)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reference / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via offline personal bKash, 1 month credit"
                    value={offlinePaymentForm.notes}
                    onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, notes: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRecordPaymentModal(false)}
                    className="px-3.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPayment}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {recordingPayment && (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Record &amp; Credit 30 Days</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ── 5. MANAGE STORE SUBSCRIPTION & VALIDITY MODAL ──────── */}
        {selectedTenantForEdit && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Manage Store &amp; Subscription Validity
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTenantForEdit.name} ({selectedTenantForEdit.ownerEmail})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenantForEdit(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditStore} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editStoreForm.name}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, name: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Support / Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01711000000"
                      value={editStoreForm.phone}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, phone: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Subscription Plan Tier
                    </label>
                    <select
                      value={editStoreForm.plan}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, plan: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="starter">Starter Plan (৳999/mo · 300 orders)</option>
                      <option value="growth">Growth Pro (৳1,990/mo · 2,000 orders)</option>
                      <option value="enterprise">Enterprise (৳4,990/mo · Unlimited)</option>
                      <option value="custom">Custom Quota</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Store Access Status
                    </label>
                    <select
                      value={editStoreForm.status}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, status: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white font-medium"
                    >
                      <option value="Active">Active (Healthy)</option>
                      <option value="Trial">Trial Mode (Expiring)</option>
                      <option value="Suspended">Suspended (Access Blocked)</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                </div>

                {/* Subscription Validity Section */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Validity &amp; Expiration (Myad)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {editStoreForm.customExpiry
                        ? `Target: ${editStoreForm.customExpiry}`
                        : "No expiration set"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1.5">
                      Quick Add Validity
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: "+7 Days", days: 7 },
                        { label: "+15 Days", days: 15 },
                        { label: "+30 Days", days: 30 },
                        { label: "+90 Days", days: 90 },
                        { label: "+1 Year", days: 365 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleQuickExtendDays(item.days)}
                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-mono text-slate-700 shadow-2xs transition"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Or Set Exact Expiration Date
                    </label>
                    <input
                      type="date"
                      value={editStoreForm.customExpiry}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, customExpiry: e.target.value })}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quota Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Monthly Order Quota
                    </label>
                    <input
                      type="number"
                      value={editStoreForm.order_limit}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, order_limit: Number(e.target.value) })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Max Catalog SKU Limit
                    </label>
                    <input
                      type="number"
                      value={editStoreForm.sku_limit}
                      onChange={(e) => setEditStoreForm({ ...editStoreForm, sku_limit: Number(e.target.value) })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-700 block mb-1">
                    Enabled Platform Features
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "courier_reconciliation", label: "Courier Reconciliation" },
                      { key: "expense_profit_tracker", label: "Daily Expenses & P&L" },
                      { key: "ai_reorder_hub", label: "AI Reorder Hub & POs" },
                      { key: "thermal_printing", label: "Thermal 4x6 Label Generator" },
                    ].map((f) => (
                      <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editStoreForm.features?.[f.key])}
                          onChange={(e) =>
                            setEditStoreForm({
                              ...editStoreForm,
                              features: {
                                ...editStoreForm.features,
                                [f.key]: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForEdit(null)}
                    className="px-3.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editStoreSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {editStoreSaving && (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Save Store Configuration</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 6. SINGLE MERCHANT NOTIFICATION MODAL ─────────────── */}
        {selectedTenantForNotify && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>Send Notice to Merchant</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Target: {selectedTenantForNotify.name} ({selectedTenantForNotify.ownerEmail})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenantForNotify(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendNotification} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quick Notification Template
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "expiring_3d") {
                        setNotifyForm({
                          title: "Trial Expiration Notice - 3 Days Left",
                          message: `Hello ${selectedTenantForNotify.name}! Your 15-day trial is nearing its end in 3 days. Upgrade to Growth Pro today to keep your orders syncing with Steadfast and Pathao without interruption.`,
                          type: "warning",
                          category: "renewal",
                        });
                      } else if (val === "expired") {
                        setNotifyForm({
                          title: "Subscription Expired - Urgent Action Required",
                          message: `Your store subscription has expired. Please renew your plan via bKash/Nagad on your Billing page to restore full dispatch capabilities.`,
                          type: "alert",
                          category: "renewal",
                        });
                      } else if (val === "payment_approved") {
                        setNotifyForm({
                          title: "Payment Verified - Subscription Extended!",
                          message: `Your subscription payment has been verified and your validity has been successfully extended. Thank you for partnering with SmartInventory!`,
                          type: "success",
                          category: "system",
                        });
                      } else if (val === "maintenance") {
                        setNotifyForm({
                          title: "Scheduled System Maintenance Tonight",
                          message: `We will be performing a brief 10-minute database index optimization tonight at 2:00 AM. Courier tracking will resume immediately after.`,
                          type: "info",
                          category: "system",
                        });
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                  >
                    <option value="">Choose a pre-filled template…</option>
                    <option value="expiring_3d">Trial Expiring in 3 Days</option>
                    <option value="expired">Subscription Expired Alert</option>
                    <option value="payment_approved">Payment Verified &amp; Quota Extended</option>
                    <option value="maintenance">Scheduled System Maintenance</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Notice Severity
                    </label>
                    <select
                      value={notifyForm.type}
                      onChange={(e) => setNotifyForm({ ...notifyForm, type: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="warning">Warning (Amber)</option>
                      <option value="alert">Critical Alert (Red)</option>
                      <option value="info">Information (Blue)</option>
                      <option value="success">Success (Green)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={notifyForm.category}
                      onChange={(e) => setNotifyForm({ ...notifyForm, category: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="renewal">Renewal / Expiry</option>
                      <option value="system">System Notice</option>
                      <option value="feature">New Feature</option>
                      <option value="custom">General Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notification Subject / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={notifyForm.title}
                    onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Message Body *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={notifyForm.message}
                    onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                    placeholder="Type notice message visible on merchant dashboard…"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTenantForNotify(null)}
                    className="px-3.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={notifySending}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {notifySending && (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Deliver Notice</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 7. PLATFORM BROADCAST TO ALL MERCHANTS MODAL ─────── */}
        {showBroadcastModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <span>Broadcast Announcement to Stores</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Delivers an announcement to merchants across the entire platform.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendBroadcast} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Store Audience
                  </label>
                  <select
                    value={broadcastForm.target}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white font-medium"
                  >
                    <option value="all">All Stores (Everyone - {tenants.length} stores)</option>
                    <option value="expiring">Expiring Stores Only (≤ 5 Days Left)</option>
                    <option value="trial">Trial Stores Only ({trialTenantsCount} stores)</option>
                    <option value="active">Active Paying Stores ({activeTenantsCount} stores)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Notice Severity
                    </label>
                    <select
                      value={broadcastForm.type}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="info">Information (Blue)</option>
                      <option value="warning">Important Warning (Amber)</option>
                      <option value="alert">Critical Maintenance (Red)</option>
                      <option value="success">Feature / Promotion (Green)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quick Preset
                    </label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "maintenance") {
                          setBroadcastForm((prev) => ({
                            ...prev,
                            title: "Scheduled Platform Maintenance Notice",
                            message: "We have scheduled a brief performance upgrade tonight between 2:00 AM - 2:30 AM. Order dispatching will continue normally right after.",
                            type: "info",
                          }));
                        } else if (val === "new_features") {
                          setBroadcastForm((prev) => ({
                            ...prev,
                            title: "New Update: Enhanced Courier Auto-Reconciliation",
                            message: "We have launched automated courier payment matching for Steadfast and Pathao. Check your Courier Reconciliation page for 1-click ledger audits.",
                            type: "success",
                          }));
                        } else if (val === "renewal_promo") {
                          setBroadcastForm((prev) => ({
                            ...prev,
                            title: "Special Offer: 20% Off on Annual Plans",
                            message: "Upgrade or renew your subscription annually this week and get 2 extra months completely free! Visit Billing & Plan to redeem.",
                            type: "success",
                          }));
                        }
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                    >
                      <option value="">Choose preset…</option>
                      <option value="maintenance">Platform Maintenance</option>
                      <option value="new_features">New Feature Announcement</option>
                      <option value="renewal_promo">Annual Plan Promotion</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Broadcast Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    placeholder="e.g. System Upgrades & Performance Improvements"
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Broadcast Announcement Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    placeholder="Type the announcement that will be displayed to merchants…"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-3.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcastSending}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition disabled:opacity-50"
                  >
                    {broadcastSending && (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Send Broadcast Announcement</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
