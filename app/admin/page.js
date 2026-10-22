"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { adminFetch } from "@/utils/admin-fetch";
import AdminTasksTab from "./components/AdminTasksTab";
import AdminBlogTab from "./components/AdminBlogTab";
import AdminSupportTab from "./components/AdminSupportTab";
import AdminNotificationsTab from "./components/AdminNotificationsTab";
import BangladeshDivisionMap from "@/components/BangladeshDivisionMap";
import {
  TenantStatusDonutChart,
  AdminMrrDualAxisChart,
  PlanDistributionList,
} from "./components/AdminCharts";
import PWAInstallButton, { PWAMobileBanner } from "@/components/PWAInstallPrompt";

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

function CopyIcon({ className = "w-3 h-3 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5 text-rose-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
  const [adminBlogStudioOption, setAdminBlogStudioOption] = useState("articles");

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
    admin_recovery_email: "hossainmdnoyon528@gmail.com",
    admin_recovery_phone: "01753082749",
    admin_recovery_pin: "882194",
    support_phone: "01753082749",
    support_whatsapp: "8801753082749",
    support_email: "support@smartinventory.app",
    support_hours: "10:00 AM - 11:00 PM (Daily)",
    bkash_number: "01753082749",
    nagad_number: "01753082749",
    starter_plan_price_bdt: 999,
    starter_plan_price_usd: 19,
    starter_order_limit: 300,
    growth_plan_price_bdt: 1990,
    growth_plan_price_usd: 39,
    growth_order_limit: 1500,
    enterprise_plan_price_bdt: 4990,
    enterprise_plan_price_usd: 99,
    enterprise_order_limit: 5000,
    ai_name: "Shongi",
    ai_name_bn: "সঙ্গী",
    ai_tagline: "আপনার ব্যবসার ২৪/৭ বিশ্বস্ত এআই পার্টনার ও কো-পাইলট",
    ai_is_active: true,
    ai_model_mode: "balanced",
    ai_welcome_message: "আসসালামু আলাইকুম! আমি সঙ্গী (Shongi) — আপনার স্টোরের সার্বক্ষণিক বিশ্বস্ত এআই সহকারী। আমি ইনভেন্টরি, ডেলিভারি ট্র্যাকিং ও সাপোর্ট টিকিট ইস্যু করতে প্রস্তুত।",
    ai_custom_instructions: "",
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

  // ── Unified Billing & Subscriptions Desk State ───────────────
  const [billingSubTab, setBillingSubTab] = useState("roster"); // "roster" | "plans" | "payments"
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [billingPlanFilter, setBillingPlanFilter] = useState("ALL");
  const [billingStatusFilter, setBillingStatusFilter] = useState("ALL");
  const [extendingTenantId, setExtendingTenantId] = useState(null);
  const [updatingPlanTenantId, setUpdatingPlanTenantId] = useState(null);

  // ── Merchant Support Desk State ────────────────────────────
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

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
  const [godModeDraft, setGodModeDraft] = useState({
    plan: "growth",
    status: "Active",
    expires_at: null,
    features: {
      courier_sync: true,
      barcode_scanner: true,
      multi_user: true,
      profit_analytics: true,
    },
  });

  // Keep draft in sync with selected tenant when opened
  useEffect(() => {
    if (selectedTenantForGodMode) {
      const conf = selectedTenantForGodMode.config || {};
      setGodModeDraft({
        plan: conf.plan || selectedTenantForGodMode.plan || "growth",
        status: conf.status || selectedTenantForGodMode.status || "Active",
        expires_at: conf.expires_at || selectedTenantForGodMode.expires_at || null,
        features: {
          courier_sync: conf.features?.courier_sync ?? true,
          barcode_scanner: conf.features?.barcode_scanner ?? true,
          multi_user: conf.features?.multi_user ?? true,
          profit_analytics: conf.features?.profit_analytics ?? true,
        },
      });
    }
  }, [selectedTenantForGodMode]);

  // Determine if there are uncommitted changes in God-Mode drawer
  const isGodModeDirty = Boolean(
    selectedTenantForGodMode && (
      godModeDraft.plan !== (selectedTenantForGodMode.config?.plan || selectedTenantForGodMode.plan || "growth") ||
      godModeDraft.status !== (selectedTenantForGodMode.status || selectedTenantForGodMode.config?.status || "Active") ||
      godModeDraft.expires_at !== (selectedTenantForGodMode.config?.expires_at || selectedTenantForGodMode.expires_at || null) ||
      ["courier_sync", "barcode_scanner", "multi_user", "profit_analytics"].some(
        (k) =>
          Boolean(godModeDraft.features?.[k] ?? true) !==
          Boolean((selectedTenantForGodMode.config?.features || {})[k] ?? true)
      )
    )
  );

  function handleGodModeAdjustDays(deltaDays) {
    const currentExp = godModeDraft.expires_at;
    const currTime = currentExp ? new Date(currentExp).getTime() : 0;
    const isPast = currTime < Date.now();
    const base = (isPast || !currentExp) ? new Date() : new Date(currTime);
    const newDate = new Date(base.getTime() + deltaDays * 86400000);
    setGodModeDraft((prev) => ({
      ...prev,
      expires_at: newDate.toISOString(),
    }));
  }

  function handleGodModeSetCycle(days, newStatus) {
    const newDate = new Date(Date.now() + days * 86400000).toISOString();
    setGodModeDraft((prev) => ({
      ...prev,
      expires_at: newDate,
      status: newStatus,
    }));
  }

  function handleGodModeDiscardChanges() {
    if (!selectedTenantForGodMode) return;
    const conf = selectedTenantForGodMode.config || {};
    setGodModeDraft({
      plan: conf.plan || selectedTenantForGodMode.plan || "growth",
      status: conf.status || selectedTenantForGodMode.status || "Active",
      expires_at: conf.expires_at || selectedTenantForGodMode.expires_at || null,
      features: {
        courier_sync: conf.features?.courier_sync ?? true,
        barcode_scanner: conf.features?.barcode_scanner ?? true,
        multi_user: conf.features?.multi_user ?? true,
        profit_analytics: conf.features?.profit_analytics ?? true,
      },
    });
    triggerToast("info", "Pending validity changes discarded.");
  }

  async function handleSaveGodModeChanges() {
    if (!selectedTenantForGodMode) return;
    setGodModeSaving(true);
    try {
      const res = await adminFetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manage_tenant",
          tenantId: selectedTenantForGodMode.id,
          plan: godModeDraft.plan,
          status: godModeDraft.status,
          customExpiry: godModeDraft.expires_at,
          features: godModeDraft.features,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update tenant store.");
      }
      triggerToast("success", `✓ Store "${selectedTenantForGodMode.name}" subscription updated successfully!`);

      const updatedConf = {
        ...(selectedTenantForGodMode.config || {}),
        ...(json.config || {}),
        plan: godModeDraft.plan,
        status: godModeDraft.status,
        expires_at: godModeDraft.expires_at,
        features: godModeDraft.features,
      };

      const updatedTenant = {
        ...selectedTenantForGodMode,
        plan: godModeDraft.plan,
        status: godModeDraft.status,
        expires_at: godModeDraft.expires_at,
        config: updatedConf,
      };

      setSelectedTenantForGodMode(updatedTenant);
      setTenants((prev) =>
        prev.map((t) => (t.id === selectedTenantForGodMode.id ? updatedTenant : t))
      );
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Failed to save changes.");
    } finally {
      setGodModeSaving(false);
    }
  }

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

  // Single & Broadcast Notification State
  const [selectedTenantForNotify, setSelectedTenantForNotify] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [notifySending, setNotifySending] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [notifyForm, setNotifyForm] = useState({
    title: "",
    message: "",
    type: "info",
    category: "system",
  });
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    type: "info",
    category: "system",
    target: "all",
  });

  // Unified Notification Modal State
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTargetType, setNotifyTargetType] = useState("all"); // "single" | "all" | "trial" | "active" | "expiring"
  const [notifyTargetTenantId, setNotifyTargetTenantId] = useState("");

  // Store Notifications & Read Receipts Tab State
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminNotifStats, setAdminNotifStats] = useState({ totalSent: 0, readCount: 0, unreadCount: 0, readRate: 0 });
  const [loadingAdminNotifs, setLoadingAdminNotifs] = useState(false);

  // Table row action dropdown popover
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // ── Data Fetchers ──────────────────────────────────────────
  async function fetchTelemetryData() {
    const res = await adminFetch("/api/admin/overview");
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to load platform overview.");
    }
    return await res.json();
  }

  async function fetchSaasSettings() {
    try {
      setSettingsLoading(true);
      const res = await adminFetch("/api/admin/settings");
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
      const res = await adminFetch("/api/admin/activity?limit=60");
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

  async function fetchSupportTickets() {
    try {
      setTicketsLoading(true);
      const res = await adminFetch("/api/admin/support");
      if (res.ok) {
        const json = await res.json();
        if (json.tickets) {
          setSupportTickets(json.tickets);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch support tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  }

  async function fetchAdminNotifications() {
    try {
      setLoadingAdminNotifs(true);
      const res = await adminFetch("/api/admin/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.sentNotifications) {
          setAdminNotifications(json.sentNotifications);
        }
        if (json.stats) {
          setAdminNotifStats(json.stats);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch admin notifications:", err);
    } finally {
      setLoadingAdminNotifs(false);
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

        // Fetch platform overview, dynamic settings, activity footprints, support tickets, and notifications
        const [overviewData] = await Promise.all([
          fetchTelemetryData(),
          fetchSaasSettings(),
          fetchActivityLogs(),
          fetchSupportTickets(),
          fetchAdminNotifications(),
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
        fetchSupportTickets(),
        fetchAdminNotifications(),
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
      const res = await adminFetch("/api/admin/settings", {
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
      const res = await adminFetch("/api/admin/tenants", {
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
      const res = await adminFetch("/api/admin/tenants", {
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
  async function handleGodModePlanUpdate(plan, addDays, customExpiry, newStatus) {
    if (!selectedTenantForGodMode) return;
    setGodModeSaving(true);
    try {
      const res = await adminFetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_plan",
          tenantId: selectedTenantForGodMode.id,
          plan: plan || selectedTenantForGodMode.plan,
          addDays,
          customExpiry,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update plan.");
      }
      triggerToast("success", "Store plan and validity updated!");
      const updatedConf = json.config || {};
      const updatedExp = updatedConf.expires_at || customExpiry;
      const updatedStatus = updatedConf.status || newStatus || selectedTenantForGodMode.status;
      const updatedPlan = updatedConf.plan || plan || selectedTenantForGodMode.plan;

      setSelectedTenantForGodMode((prev) => ({
        ...prev,
        plan: updatedPlan,
        status: updatedStatus,
        expires_at: updatedExp,
        config: updatedConf,
      }));

      setTenants((prev) =>
        prev.map((t) =>
          t.id === selectedTenantForGodMode.id
            ? {
                ...t,
                plan: updatedPlan,
                status: updatedStatus,
                expires_at: updatedExp,
                config: updatedConf,
              }
            : t
        )
      );
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
      const res = await adminFetch("/api/admin/tenants", {
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
      const res = await adminFetch("/api/admin/tenants", {
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
      const res = await adminFetch("/api/admin/tenants", {
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
      const res = await adminFetch("/api/admin/tenants", {
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

  // ── Quick Extend Store Validity (+30, +90, +365 days) ──────
  async function handleQuickExtendTenant(tenantId, addDays = 30) {
    setExtendingTenantId(tenantId);
    try {
      const res = await adminFetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_plan",
          tenantId,
          addDays,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to extend subscription validity.");
      }
      triggerToast("success", `Added +${addDays} days validity to store subscription!`);
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Failed to extend validity.");
    } finally {
      setExtendingTenantId(null);
    }
  }

  // ── Quick Change Store Plan ────────────────────────────────
  async function handleQuickChangePlan(tenantId, newPlan) {
    setUpdatingPlanTenantId(tenantId);
    try {
      const res = await adminFetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_plan",
          tenantId,
          plan: newPlan,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update store plan.");
      }
      triggerToast("success", `Store tier updated to ${newPlan.toUpperCase()}!`);
      handleManualRefresh();
    } catch (err) {
      triggerToast("error", err.message || "Failed to update plan.");
    } finally {
      setUpdatingPlanTenantId(null);
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
      const res = await adminFetch(`/api/admin/tenants?id=${tenantId}`, {
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

      const res = await adminFetch("/api/admin/tenants", {
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
    setNotifyTargetType("single");
    setNotifyTargetTenantId(t ? t.id : "");
    const conf = t?.config || {};
    const exp = t?.expires_at || conf.expires_at;
    let days = null;
    if (exp) {
      days = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
    }

    if (days !== null && days <= 0) {
      setNotifyForm({
        title: "Subscription / Trial Expired - Action Required",
        message: `Hello ${t?.name || "Merchant"}! Your store subscription has expired. Please upgrade or renew your plan via bKash/Nagad on your Billing page to maintain seamless order sync and barcode label printing.`,
        type: "alert",
        category: "renewal",
      });
    } else if (days !== null && days <= 5) {
      setNotifyForm({
        title: `${days} Day${days === 1 ? "" : "s"} Left on Your Subscription`,
        message: `Dear ${t?.name || "Merchant"} team, your ${t?.status === "Trial" ? "15-day trial" : "subscription"} will expire in ${days} day${days === 1 ? "" : "s"}. Renew today to continue processing customer parcels without interruption.`,
        type: "warning",
        category: "renewal",
      });
    } else {
      setNotifyForm({
        title: `Notice for ${t?.name || "Merchant"}`,
        message: `Hello ${t?.name || "Merchant"}! We have an important platform update for your store.`,
        type: "info",
        category: "custom",
      });
    }
    setShowNotifyModal(true);
  }

  function handleOpenBroadcastModal(target = "all") {
    setNotifyTargetType(target);
    setNotifyTargetTenantId("");
    setNotifyForm({
      title: "",
      message: "",
      type: "info",
      category: "system",
    });
    setShowNotifyModal(true);
  }

  // ── Unified Notification & Broadcast Dispatcher ───────────
  async function handleSendUnifiedNotification(e) {
    if (e) e.preventDefault();
    if (notifyTargetType === "single" && !notifyTargetTenantId.trim()) {
      triggerToast("error", "Please select a store or enter a store code/ID.");
      return;
    }
    if (!notifyForm.title.trim() || !notifyForm.message.trim()) {
      triggerToast("error", "Please provide both a title and message.");
      return;
    }

    setNotifySending(true);
    setBroadcastSending(true);
    try {
      const payload = {
        title: notifyForm.title.trim(),
        message: notifyForm.message.trim(),
        type: notifyForm.type,
        category: notifyForm.category,
      };

      if (notifyTargetType === "single") {
        payload.action = "single";
        payload.tenantId = notifyTargetTenantId.trim();
      } else {
        payload.action = "broadcast";
        payload.target = notifyTargetType;
      }

      const res = await adminFetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to dispatch notification.");
      }

      triggerToast("success", json.message || "Notification delivered successfully!");
      setShowNotifyModal(false);
      setSelectedTenantForNotify(null);
      setShowBroadcastModal(false);
      fetchAdminNotifications();
    } catch (err) {
      triggerToast("error", err.message || "Failed to deliver notification.");
    } finally {
      setNotifySending(false);
      setBroadcastSending(false);
    }
  }

  const handleSendNotification = handleSendUnifiedNotification;
  const handleSendBroadcast = handleSendUnifiedNotification;

  // ── Auto-Alert Expiring Stores (1-Click Engine) ────────────
  async function handleAutoAlertExpiringStores() {
    setAutoAlertRunning(true);
    try {
      const res = await adminFetch("/api/admin/notifications", {
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
    if (!t) return { daysRemaining: null, isExpired: false, isExpiring: false, label: "Ongoing", expiryDate: "Ongoing" };
    const exp = t.expires_at || t.config?.expires_at;
    if (!exp) return { daysRemaining: null, isExpired: false, isExpiring: false, label: "Ongoing", expiryDate: "Ongoing" };
    try {
      const expDate = new Date(exp);
      if (isNaN(expDate.getTime())) {
        return { daysRemaining: null, isExpired: false, isExpiring: false, label: "Ongoing", expiryDate: "Ongoing" };
      }
      const daysRemaining = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
      const isExpired = daysRemaining <= 0;
      const isExpiring = daysRemaining > 0 && daysRemaining <= 5;
      return {
        daysRemaining,
        isExpired,
        isExpiring,
        label: isExpired ? "Expired" : `${daysRemaining}d left`,
        expiryDate: expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
    } catch {
      return { daysRemaining: null, isExpired: false, isExpiring: false, label: "Ongoing", expiryDate: "Ongoing" };
    }
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
          label: "Billing & Subscriptions",
          tab: "pricing",
          badge:
            payments.filter((p) => p.status === "PENDING").length > 0
              ? `${payments.filter((p) => p.status === "PENDING").length} pending`
              : null,
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
          badge: payments.filter((p) => p.status === "PENDING").length > 0
            ? `${payments.filter((p) => p.status === "PENDING").length} pending`
            : ((saasSettings.sslcommerz_store_id || saasSettings.stripe_public_key) ? "Live" : null),
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
        {
          id: "support",
          label: "Merchant Support",
          tab: "support",
          badge:
            supportTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
              .length > 0
              ? `${supportTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length} open`
              : null,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          id: "notifications",
          label: "Store Notifications",
          tab: "notifications",
          badge: adminNotifStats?.unreadCount > 0 ? `${adminNotifStats.unreadCount} unread` : null,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
          id: "support-contacts",
          label: "Hotline & Contacts",
          tab: "security",
          scrollTo: "support-contact-settings",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          ),
        },
        {
          id: "ai-copilot",
          label: "AI Copilot & Assistant",
          tab: "security",
          scrollTo: "ai-assistant-control-center",
          badge: saasSettings.ai_name || "Shongi",
          icon: (
            <svg className="w-4 h-4 shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
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
        <div
          className={`h-14 border-b border-slate-200/80 flex items-center transition-all ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"
          }`}
        >
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs hover:bg-orange-700 transition cursor-pointer"
              title="Expand sidebar (Click to open full menu)"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="sr-only">Expand sidebar</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white shadow-xs shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-semibold text-sm tracking-tight text-slate-900 truncate">
                    Super Admin
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Control Plane
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer"
                title="Collapse sidebar"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
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
                  <div key={item.id} className="space-y-0.5">
                    <button
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

                    {/* Sub-items for Blog & SEO CMS when active */}
                    {item.id === "blog" && isActive && !sidebarCollapsed && (
                      <div className="ml-7 pl-2 border-l border-orange-200/80 space-y-0.5 pt-0.5 pb-1 animate-fadeIn">
                        {[
                          { id: "articles", label: "Articles Library", icon: "📝" },
                          { id: "gsc", label: "Search Console (GSC)", icon: "🔍" },
                          { id: "ga4", label: "Google Analytics (GA4)", icon: "📊" },
                          { id: "settings", label: "Webmaster & Sitemap", icon: "⚙️" },
                        ].map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setAdminBlogStudioOption(sub.id)}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer text-left ${
                              adminBlogStudioOption === sub.id
                                ? "bg-orange-100/70 text-orange-800 font-bold"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                            }`}
                          >
                            <span>{sub.icon}</span>
                            <span className="truncate">{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 space-y-2">
          {!sidebarCollapsed && (
            <div className="pb-1">
              <PWAInstallButton className="w-full justify-center" />
            </div>
          )}

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

          {/* Toggle sidebar button at footer */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition cursor-pointer ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!sidebarCollapsed && <span>{sidebarCollapsed ? "Expand" : "Collapse Sidebar"}</span>}
          </button>

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

      {/* ── MOBILE HEADER BAR & DRAWER (lg:hidden) ──────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white shrink-0 shadow-xs">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-bold text-xs tracking-tight text-slate-900 truncate">
              Super Admin
            </span>
            <span className="text-[10px] text-orange-600 font-semibold truncate capitalize">
              {activeTab === "overview"
                ? "Dashboard"
                : activeTab === "support"
                ? "Helpdesk"
                : activeTab === "pricing"
                ? "Billing & SaaS"
                : activeTab.replace("-", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton compact={true} />

          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            title="Sync data"
            aria-label="Synchronize data"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin text-orange-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white flex flex-col justify-between h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="font-semibold text-sm text-slate-900">Admin Navigation</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="pb-2">
                <PWAInstallButton className="w-full justify-center" />
              </div>

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
              <Link
                href="/dashboard"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition"
              >
                <span>Switch to Merchant App →</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition cursor-pointer"
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
        {/* Sticky Desktop Top Header (Hidden on Mobile) */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-900 capitalize">
                {activeTab === "overview"
                  ? "Dashboard"
                  : activeTab === "support"
                  ? "Merchant Support & Helpdesk"
                  : activeTab === "notifications"
                  ? "Store Notifications & Read Receipts"
                  : activeTab.replace("-", " ")}
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

            <PWAInstallButton />

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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
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
                      {(() => {
                        const totalCourierOrders =
                          Object.values(courierBreakdown || {}).reduce(
                            (acc, curr) => acc + (Number(curr) || 0),
                            0
                          ) || 1;
                        return Object.entries(courierBreakdown)
                          .slice(0, 4)
                          .map(([courier, count]) => {
                            const pct = Math.round(
                              ((Number(count) || 0) / totalCourierOrders) * 100
                            );
                            return (
                              <div
                                key={courier}
                                className="rounded-lg bg-slate-50 border border-slate-100 p-2.5"
                              >
                                <div className="text-[11px] font-medium text-slate-500">
                                  {courier}
                                </div>
                                <div className="text-base font-semibold text-slate-900 font-mono">
                                  {count}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {pct}% volume
                                </div>
                              </div>
                            );
                          });
                      })()}
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
                        onClick={() => handleOpenBroadcastModal("all")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition shrink-0 cursor-pointer"
                        title="Send announcement or platform update to all merchants"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        <span>Broadcast Notice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("notifications")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-medium shadow-2xs transition shrink-0 cursor-pointer"
                        title="View notification delivery history and merchant read receipts"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span>Read Receipts</span>
                        {adminNotifStats?.unreadCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900 text-[10px] font-mono font-bold">
                            {adminNotifStats.unreadCount} unread
                          </span>
                        )}
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
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 text-slate-600 uppercase border-b border-slate-200 text-[11px] font-mono tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Store &amp; Code</th>
                        <th className="px-4 py-3.5 font-semibold">Owner Email</th>
                        <th className="px-4 py-3.5 font-semibold">Validity / Myad</th>
                        <th className="px-4 py-3.5 font-semibold">Inventory &amp; Usage</th>
                        <th className="px-4 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-sans">
                      {filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-xs">
                            No merchant stores match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((t) => {
                          const val = getTenantValidity(t);
                          const orderLimit = t.order_limit || t.config?.order_limit || 1000;
                          const currentOrders = t.orderCount ?? t.totalOrders ?? 0;
                          const planTier = String(t.config?.plan || t.plan || "starter").toUpperCase();

                          return (
                            <tr
                              key={t.id}
                              className="hover:bg-slate-50/80 transition cursor-pointer group"
                              onClick={() => setSelectedTenantForGodMode(t)}
                            >
                              {/* 1. Store & Code */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition truncate max-w-[170px]">
                                      {t.name || "Store"}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200 uppercase shrink-0">
                                      {planTier}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const code = t.id ? t.id.slice(0, 8) : "";
                                        navigator.clipboard.writeText(code);
                                        triggerToast("success", `Store code "${code}" copied!`);
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 hover:text-slate-800 bg-slate-100/70 hover:bg-slate-200/70 border border-slate-200/60 transition cursor-pointer"
                                      title="Click to copy store code"
                                    >
                                      <span>#{t.id ? t.id.slice(0, 8) : "—"}</span>
                                      <CopyIcon className="w-2.5 h-2.5 text-slate-400" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Owner Email */}
                              <td className="px-4 py-3.5 text-slate-600 text-xs truncate max-w-[180px]">
                                <span className="font-mono text-[11px] truncate block" title={t.ownerEmail}>
                                  {t.ownerEmail}
                                </span>
                              </td>

                              {/* 3. Validity / Myad */}
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    {val.daysRemaining === null ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        Ongoing Active
                                      </span>
                                    ) : val.isExpired ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                        Expired
                                      </span>
                                    ) : val.isExpiring ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        {val.daysRemaining}d left
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {val.daysRemaining}d left
                                      </span>
                                    )}

                                    {t.status === "Trial" && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                        Trial
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {val.expiryDate}
                                  </div>
                                </div>
                              </td>

                              {/* 4. Inventory & Usage */}
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col gap-0.5 text-xs font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-orange-700 font-semibold">
                                      {t.skuCount ?? t.totalSkus ?? 0}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-sans">SKUs</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                    <span className="text-emerald-700 font-semibold">{currentOrders}</span>
                                    <span className="text-slate-400 text-[10px]">/ {orderLimit}</span>
                                  </div>
                                </div>
                              </td>

                              {/* 5. Status */}
                              <td className="px-4 py-3.5">
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

                              {/* 6. Actions */}
                              <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNotifyModal(t)}
                                    className="rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                                    title="Send notification to merchant"
                                  >
                                    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span>Notify</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedTenantForGodMode(t)}
                                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs transition cursor-pointer flex items-center gap-1"
                                    title="Impersonate store workspace in God Mode"
                                  >
                                    <span>God Mode</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStore(t)}
                                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                                    title="Edit store plan, validity, and quotas"
                                  >
                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>

                                  {/* Actions Popover / Dropdown */}
                                  <div className="relative inline-block text-left">
                                    <button
                                      type="button"
                                      onClick={() => setActiveActionMenuId(activeActionMenuId === t.id ? null : t.id)}
                                      className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 p-1.5 text-slate-600 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                                      title="Store actions"
                                    >
                                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                      </svg>
                                    </button>

                                    {activeActionMenuId === t.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20"
                                          onClick={() => setActiveActionMenuId(null)}
                                        />
                                        <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleToggleTenantStatus(t.id, t.status);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                                          >
                                            <span>{t.status === "Active" ? "Suspend Store" : "Activate Store"}</span>
                                            <span className={`w-2 h-2 rounded-full ${t.status === "Active" ? "bg-amber-500" : "bg-emerald-500"}`} />
                                          </button>
                                          <div className="my-1 border-t border-slate-100" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleDeleteTenant(t.id, t.name);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center justify-between transition cursor-pointer"
                                          >
                                            <span>Purge Store</span>
                                            <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
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
        {/* TAB 2: UNIFIED BILLING, SUBSCRIPTIONS & STORE VALIDITY     */}
        {/* ========================================================= */}
        {activeTab === "pricing" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Control Header */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-orange-600 font-semibold bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                    SaaS Billing Command Center
                  </span>
                  {payments.filter((p) => p.status === "PENDING").length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                      {payments.filter((p) => p.status === "PENDING").length} TrxID Submissions Awaiting Approval
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5 text-orange-600" />
                  <span>Billing, Subscriptions &amp; Store Validity Desk</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full control over merchant plans, validity extensions (+30d/+90d), manual bKash/Nagad TrxID approvals, and multi-tier SaaS pricing.
                </p>
              </div>

              {/* Action Buttons & Sub-Tab Switcher */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Record Offline Payment</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                  title="Refresh subscription data"
                >
                  <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-600" : "text-slate-500"}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Stores</span>
                <p className="mt-1 text-xl font-bold text-slate-900 font-mono">{tenants.length}</p>
                <span className="text-[10px] text-slate-400 block mt-0.5">Active workspaces</span>
              </div>

              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3.5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Active Subscriptions</span>
                <p className="mt-1 text-xl font-bold text-emerald-700 font-mono">
                  {tenants.filter((t) => (t.status === "Active" || t.status === "ACTIVE") && t.plan && t.plan !== "free").length}
                </p>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Paid plans running</span>
              </div>

              <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-3.5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Expiring Soon</span>
                <p className="mt-1 text-xl font-bold text-amber-700 font-mono">
                  {tenants.filter((t) => t.daysRemaining !== null && t.daysRemaining >= 0 && t.daysRemaining <= 7).length}
                </p>
                <span className="text-[10px] text-amber-600 block mt-0.5">&le; 7 days left</span>
              </div>

              <div className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-3.5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Expired Stores</span>
                <p className="mt-1 text-xl font-bold text-rose-700 font-mono">
                  {tenants.filter((t) => t.daysRemaining !== null && t.daysRemaining < 0).length}
                </p>
                <span className="text-[10px] text-rose-600 block mt-0.5">Action required</span>
              </div>

              <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Collected Revenue</span>
                <p className="mt-1 text-xl font-bold text-blue-700 font-mono">
                  ৳{payments.filter((p) => p.status === "APPROVED").reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-blue-600 block mt-0.5">Approved subscriptions</span>
              </div>

              <div
                onClick={() => setBillingSubTab("payments")}
                className="rounded-xl border border-purple-200/80 bg-purple-50/30 p-3.5 shadow-xs cursor-pointer hover:bg-purple-100/40 transition"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Pending TrxIDs</span>
                <p className="mt-1 text-xl font-bold text-purple-700 font-mono">
                  {payments.filter((p) => p.status === "PENDING").length}
                </p>
                <span className="text-[10px] text-purple-600 block mt-0.5 font-medium underline">Review queue &rarr;</span>
              </div>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-px">
              <button
                type="button"
                onClick={() => setBillingSubTab("roster")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  billingSubTab === "roster"
                    ? "border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Merchant Subscriptions &amp; Store Validity ({tenants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingSubTab("plans")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  billingSubTab === "plans"
                    ? "border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Tier Pricing Controls (Starter, Growth, Enterprise)</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingSubTab("payments")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  billingSubTab === "payments"
                    ? "border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <CreditCardIcon className="w-4 h-4" />
                <span>TrxID Approvals Desk</span>
                {payments.filter((p) => p.status === "PENDING").length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-white font-bold">
                    {payments.filter((p) => p.status === "PENDING").length}
                  </span>
                )}
              </button>
            </div>

            {/* ── SUB-TAB 1: MERCHANT SUBSCRIPTIONS & STORE VALIDITY ROSTER ── */}
            {billingSubTab === "roster" && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={billingSearchQuery}
                      onChange={(e) => setBillingSearchQuery(e.target.value)}
                      placeholder="Search store name, owner email, or phone…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={billingPlanFilter}
                      onChange={(e) => setBillingPlanFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none"
                    >
                      <option value="ALL">All Plans</option>
                      <option value="starter">Starter Plan</option>
                      <option value="growth">Growth Pro</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="free">Trial / Free</option>
                    </select>

                    <select
                      value={billingStatusFilter}
                      onChange={(e) => setBillingStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none"
                    >
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active (Paid)</option>
                      <option value="TRIAL">Trial Stores</option>
                      <option value="EXPIRING">Expiring (&le; 7 days)</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>

                {/* Subscriptions Table */}
                <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-sans">
                      <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[11px] font-mono">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Store &amp; Account</th>
                          <th className="px-5 py-3 font-semibold">Active Plan</th>
                          <th className="px-5 py-3 font-semibold">Validity &amp; Expiry</th>
                          <th className="px-5 py-3 font-semibold">Usage Limits</th>
                          <th className="px-5 py-3 font-semibold text-right">Quick Billing Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-sans">
                        {tenants
                          .filter((t) => {
                            if (billingPlanFilter !== "ALL") {
                              const p = (t.plan || "growth").toLowerCase();
                              if (billingPlanFilter === "starter" && p !== "starter") return false;
                              if (billingPlanFilter === "growth" && p !== "growth") return false;
                              if (billingPlanFilter === "enterprise" && p !== "enterprise") return false;
                              if (billingPlanFilter === "free" && p !== "free" && p !== "trial" && !t.status?.toLowerCase().includes("trial")) return false;
                            }
                            if (billingStatusFilter !== "ALL") {
                              if (billingStatusFilter === "ACTIVE" && t.status !== "Active" && t.status !== "ACTIVE") return false;
                              if (billingStatusFilter === "TRIAL" && t.status !== "Trial" && !t.status?.toLowerCase().includes("trial")) return false;
                              if (billingStatusFilter === "EXPIRING" && (t.daysRemaining === null || t.daysRemaining > 7 || t.daysRemaining < 0)) return false;
                              if (billingStatusFilter === "EXPIRED" && (t.daysRemaining === null || t.daysRemaining >= 0)) return false;
                            }
                            if (billingSearchQuery.trim()) {
                              const q = billingSearchQuery.toLowerCase().trim();
                              const matchName = String(t.name || "").toLowerCase().includes(q);
                              const matchEmail = String(t.ownerEmail || "").toLowerCase().includes(q);
                              const matchPhone = String(t.phone || "").toLowerCase().includes(q);
                              return matchName || matchEmail || matchPhone;
                            }
                            return true;
                          })
                          .map((t) => {
                            const planKey = (t.plan || "growth").toLowerCase();
                            const isTrial = t.status === "Trial" || String(t.status || "").toLowerCase().includes("trial");
                            const isExpired = t.daysRemaining !== null && t.daysRemaining < 0;
                            const isExpiringSoon = t.daysRemaining !== null && t.daysRemaining >= 0 && t.daysRemaining <= 7;

                            return (
                              <tr key={t.id} className="hover:bg-slate-50/70 transition">
                                <td className="px-5 py-3.5">
                                  <div className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                                    <span>{t.name || "Unnamed Store"}</span>
                                    {t.division && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                        {t.division}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    {t.ownerEmail}
                                  </div>
                                  {t.phone && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      📞 {t.phone}
                                    </div>
                                  )}
                                </td>

                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                        isTrial || planKey === "trial"
                                          ? "bg-amber-50 text-amber-800 border-amber-200"
                                          : planKey === "enterprise"
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                          : planKey === "starter"
                                          ? "bg-blue-50 text-blue-800 border-blue-200"
                                          : "bg-purple-50 text-purple-800 border-purple-200"
                                      }`}
                                    >
                                      {isTrial || planKey === "trial"
                                        ? "Free Trial"
                                        : planKey === "enterprise"
                                        ? "Enterprise"
                                        : planKey === "starter"
                                        ? "Starter Plan"
                                        : "Growth Pro"}
                                    </span>

                                    {/* 1-Click Plan Switcher */}
                                    <select
                                      value={planKey}
                                      disabled={updatingPlanTenantId === t.id}
                                      onChange={(e) => handleQuickChangePlan(t.id, e.target.value)}
                                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-700 focus:outline-none cursor-pointer"
                                      title="Change store plan tier immediately"
                                    >
                                      <option value="trial">Free Trial (15 Days)</option>
                                      <option value="starter">Starter (৳999)</option>
                                      <option value="growth">Growth (৳1,990)</option>
                                      <option value="enterprise">Enterprise (৳4,990)</option>
                                    </select>
                                  </div>
                                </td>

                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                        isExpired
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : isExpiringSoon
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : isTrial
                                          ? "bg-sky-50 text-sky-700 border-sky-200"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      }`}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          isExpired
                                            ? "bg-rose-500"
                                            : isExpiringSoon
                                            ? "bg-amber-500 animate-ping"
                                            : isTrial
                                            ? "bg-sky-500"
                                            : "bg-emerald-500"
                                        }`}
                                      />
                                      {isExpired
                                        ? "Expired"
                                        : isExpiringSoon
                                        ? "Expiring Soon"
                                        : isTrial
                                        ? "15-Day Trial"
                                        : "Active"}
                                    </span>

                                    {t.daysRemaining !== null && (
                                      <span
                                        className={`text-[10px] font-mono font-semibold ${
                                          isExpired
                                            ? "text-rose-600"
                                            : isExpiringSoon
                                            ? "text-amber-600"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        {isExpired
                                          ? `(${Math.abs(t.daysRemaining)}d overdue)`
                                          : `(${t.daysRemaining}d left)`}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                                    {t.expires_at ? (
                                      <span>Expires: {new Date(t.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    ) : (
                                      <span className="text-slate-400">No expiration date set</span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-5 py-3.5 text-xs font-mono">
                                  <div className="text-slate-700">
                                    Orders: <span className="font-semibold text-slate-900">{t.totalOrders || 0}</span> / {t.order_limit || 1000}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    SKUs: <span className="font-semibold text-slate-900">{t.totalSkus || 0}</span> / {t.sku_limit || 250}
                                  </div>
                                </td>

                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={extendingTenantId === t.id}
                                      onClick={() => handleQuickExtendTenant(t.id, 30)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer"
                                      title="Add 30 days subscription validity instantly"
                                    >
                                      <span>{extendingTenantId === t.id ? "…" : "+30 Days"}</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={extendingTenantId === t.id}
                                      onClick={() => handleQuickExtendTenant(t.id, 90)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition disabled:opacity-50 cursor-pointer"
                                      title="Add 90 days validity (Quarterly)"
                                    >
                                      <span>+90d</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditStore(t)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium shadow-2xs transition cursor-pointer"
                                      title="Edit store quotas, features, or custom dates"
                                    >
                                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      <span>Manage</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-TAB 2: TIER PRICING CONTROLS (STARTER, GROWTH, ENTERPRISE) ── */}
            {billingSubTab === "plans" && (
              <div className="space-y-6">
                {/* 3 Tier Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  {/* Tier 1: Starter Plan */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          Tier 1
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Starter</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">Starter Plan</h3>
                      <p className="text-xs text-slate-500">
                        Designed for early-stage online shops, boutique stores, and single-courier setups.
                      </p>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Price (৳ BDT)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={saasSettings.starter_plan_price_bdt ?? 999}
                              onChange={(e) =>
                                setSaasSettings((prev) => ({
                                  ...prev,
                                  starter_plan_price_bdt: Number(e.target.value) || 0,
                                }))
                              }
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Price ($ USD)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={saasSettings.starter_plan_price_usd ?? 19}
                              onChange={(e) =>
                                setSaasSettings((prev) => ({
                                  ...prev,
                                  starter_plan_price_usd: Number(e.target.value) || 0,
                                }))
                              }
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Order Allowance
                          </label>
                          <input
                            type="number"
                            min="10"
                            value={saasSettings.starter_order_limit ?? 300}
                            onChange={(e) =>
                              setSaasSettings((prev) => ({
                                ...prev,
                                starter_order_limit: parseInt(e.target.value, 10) || 300,
                              }))
                            }
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Up to {saasSettings.starter_order_limit ?? 300} orders / month</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>100 Product SKU catalog</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Single Courier Webhook</span>
                      </div>
                    </div>
                  </div>

                  {/* Tier 2: Growth Pro Plan */}
                  <div className="rounded-3xl border-2 border-orange-500/80 bg-white p-6 shadow-md shadow-orange-500/5 flex flex-col justify-between space-y-5 relative">
                    <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-600 text-white uppercase tracking-wider shadow-xs">
                      Most Popular
                    </span>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase">
                          Tier 2
                        </span>
                        <span className="text-xs text-orange-600 font-mono font-semibold">Recommended</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">Growth Pro Plan</h3>
                      <p className="text-xs text-slate-500">
                        Complete warehouse automation for growing D2C brands, automated RTO prevention, and courier audit.
                      </p>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Price (৳ BDT)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={saasSettings.growth_plan_price_bdt ?? 1990}
                              onChange={(e) =>
                                setSaasSettings((prev) => ({
                                  ...prev,
                                  growth_plan_price_bdt: Number(e.target.value) || 0,
                                }))
                              }
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Price ($ USD)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={saasSettings.growth_plan_price_usd ?? 39}
                              onChange={(e) =>
                                setSaasSettings((prev) => ({
                                  ...prev,
                                  growth_plan_price_usd: Number(e.target.value) || 0,
                                }))
                              }
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Order Allowance
                          </label>
                          <input
                            type="number"
                            min="50"
                            value={saasSettings.growth_order_limit ?? 1500}
                            onChange={(e) =>
                              setSaasSettings((prev) => ({
                                ...prev,
                                growth_order_limit: parseInt(e.target.value, 10) || 1500,
                              }))
                            }
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Up to {saasSettings.growth_order_limit ?? 1500} orders / month</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>500 Product SKU catalog</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Steadfast &amp; Pathao Reconciliation</span>
                      </div>
                    </div>
                  </div>

                  {/* Tier 3: Enterprise Plan */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Tier 3
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Unlimited</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">Enterprise Plan</h3>
                      <p className="text-xs text-slate-500">
                        High-volume retailers, large multi-branch hubs, and merchants requiring dedicated operations support.
                      </p>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Price (৳ BDT)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold text-xs">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={saasSettings.enterprise_plan_price_bdt ?? 4990}
                              onChange={(e) =>
                                setSaasSettings((prev) => ({
                                  ...prev,
                                  enterprise_plan_price_bdt: Number(e.target.value) || 0,
                                }))
                              }
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Price ($ USD)
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono font-bold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={saasSettings.enterprise_plan_price_usd ?? 99}
                              onChange={(e) =>
                                setSaasSettings((prev) => ({
                                  ...prev,
                                  enterprise_plan_price_usd: Number(e.target.value) || 0,
                                }))
                              }
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            Monthly Order Allowance
                          </label>
                          <input
                            type="number"
                            min="100"
                            value={saasSettings.enterprise_order_limit ?? 5000}
                            onChange={(e) =>
                              setSaasSettings((prev) => ({
                                ...prev,
                                enterprise_order_limit: parseInt(e.target.value, 10) || 5000,
                              }))
                            }
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Up to {saasSettings.enterprise_order_limit ?? 5000} orders / month</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Unlimited Product SKU catalog</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dedicated Hotline &amp; Priority SLA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Currency & Quotas Settings Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-900">Platform Currency &amp; Quotas Policy</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure exchange rates and client-side currency display across the landing page and merchant billing checkout.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Tier Monthly Order Allowance */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Free Monthly Order Quota
                      </label>
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
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:border-orange-500 focus:outline-none"
                        placeholder="100"
                      />
                      <p className="text-[11px] text-slate-500">
                        Dispatched orders allowed on free trial before upgrade banner triggers.
                      </p>
                    </div>

                    {/* Platform Currency Mode */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Platform Currency Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "AUTO", label: "Auto", desc: "Geo Switcher" },
                          { id: "BDT", label: "BDT (৳)", desc: "Enforce Taka" },
                          { id: "USD", label: "USD ($)", desc: "Enforce USD" },
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
                            className={`rounded-xl border p-2 text-left transition cursor-pointer ${
                              saasSettings.currency_mode === item.id
                                ? "border-orange-500 bg-orange-50 text-orange-950 font-bold"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                            }`}
                          >
                            <div className="text-xs font-bold">{item.label}</div>
                            <div className="text-[9px] text-slate-500">{item.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* USD to BDT Exchange Rate */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Exchange Rate (৳ per $1 USD)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono font-bold text-xs">
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
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:border-orange-500 focus:outline-none"
                          placeholder="122.00"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Used for live BDT to USD conversions across merchant subscription modals.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Saved dynamically to <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">saas_settings.json</code> &amp; database
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("Pricing Tiers & Plan Quotas")}
                      disabled={savingSettings || settingsLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50 cursor-pointer"
                    >
                      <span>{savingSettings ? "Saving…" : "Save Pricing Tiers & Plan Quotas"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-TAB 3: PAYMENT SUBMISSIONS & TRXID APPROVALS DESK ── */}
            {billingSubTab === "payments" && (
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition self-start sm:self-auto shrink-0 cursor-pointer"
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
                        <th className="px-5 py-3 font-semibold">Date &amp; Time</th>
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
                              {(() => {
                                const rawDate = p.submitted_at || p.created_at || p.approved_at;
                                const d = rawDate ? new Date(rawDate) : null;
                                return d && !isNaN(d.getTime()) ? (
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                );
                              })()}
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
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-medium shadow-2xs transition disabled:opacity-50 cursor-pointer"
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
            )}
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
                            {(() => {
                              const rawDate = p.submitted_at || p.created_at || p.approved_at;
                              const d = rawDate ? new Date(rawDate) : null;
                              return d && !isNaN(d.getTime()) ? (
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-mono">—</span>
                              );
                            })()}
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
        {/* TAB: MERCHANT SUPPORT & HELPDESK TICKETS                 */}
        {/* ========================================================= */}
        {activeTab === "support" && (
          <AdminSupportTab
            tickets={supportTickets}
            loading={ticketsLoading}
            onRefresh={fetchSupportTickets}
            triggerToast={triggerToast}
            supportPhone={saasSettings.support_phone || "01753082749"}
            whatsappNumber={saasSettings.support_whatsapp || "8801753082749"}
            onManageHotline={() => {
              setActiveTab("security");
              setTimeout(() => {
                document.getElementById("support-contact-settings")?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          />
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
            {/* ── GLOBAL SUPPORT & CONTACT CENTER SETTINGS ── */}
            <div id="support-contact-settings" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-orange-600 font-semibold bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                      Global Contact Hub
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-syncs Everywhere
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    <PhoneIcon className="w-5 h-5 text-orange-600" />
                    <span>Global Support Hotline &amp; Payment Contacts</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 max-w-3xl">
                    Change support phone, WhatsApp hotline, working hours, and merchant subscription payment numbers in this single place. Any changes saved here automatically propagate across all Merchant Help Desks, Manual Billing modals, Shongi AI Copilot, and the Landing Page.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://wa.me/${(saasSettings.support_whatsapp || "8801753082749").replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition"
                    title="Test configured WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.101.005.232-.038.362.275.144.346.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                    </svg>
                    <span>Test WhatsApp</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>

              {/* Live Preview Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Support Hotline
                  </span>
                  <p className="text-xs font-bold text-slate-900 font-mono truncate">
                    {saasSettings.support_phone || "01753082749"}
                  </p>
                  <span className="text-[10px] text-emerald-600 block">Live Call Link</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Support WhatsApp
                  </span>
                  <p className="text-xs font-bold text-slate-900 font-mono truncate">
                    {saasSettings.support_whatsapp || "8801753082749"}
                  </p>
                  <span className="text-[10px] text-emerald-600 block">1-Click Chat</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Working Hours
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {saasSettings.support_hours || "10 AM - 11 PM"}
                  </p>
                  <span className="text-[10px] text-slate-500 block">Daily Service</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    bKash Account
                  </span>
                  <p className="text-xs font-bold text-slate-900 font-mono truncate">
                    {saasSettings.bkash_number || saasSettings.support_phone || "01753082749"}
                  </p>
                  <span className="text-[10px] text-pink-600 block">Billing Modal</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Nagad Account
                  </span>
                  <p className="text-xs font-bold text-slate-900 font-mono truncate">
                    {saasSettings.nagad_number || saasSettings.support_phone || "01753082749"}
                  </p>
                  <span className="text-[10px] text-orange-600 block">Billing Modal</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Support Email
                  </span>
                  <p className="text-xs font-bold text-slate-900 font-mono truncate">
                    {saasSettings.support_email || "support@smartinventory.app"}
                  </p>
                  <span className="text-[10px] text-slate-500 block">Ticket Desk</span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="border-t border-slate-100 pt-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Support Phone / Direct Hotline */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Support Hotline Phone
                    </label>
                    <input
                      type="text"
                      value={saasSettings.support_phone || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          support_phone: e.target.value,
                        }))
                      }
                      placeholder="01753082749"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Primary phone number displayed on merchant support desk &amp; billing hotline.
                    </p>
                  </div>

                  {/* Support WhatsApp Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Support WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={saasSettings.support_whatsapp || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          support_whatsapp: e.target.value,
                        }))
                      }
                      placeholder="8801753082749"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Target WhatsApp number for 1-click live chat buttons (include country code 880...).
                    </p>
                  </div>

                  {/* Support Operating Hours */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Support Operating Hours
                    </label>
                    <input
                      type="text"
                      value={saasSettings.support_hours || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          support_hours: e.target.value,
                        }))
                      }
                      placeholder="10:00 AM - 11:00 PM (Daily)"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Working hours displayed to merchants on ticket desk, billing, and Shongi AI.
                    </p>
                  </div>

                  {/* Official Support Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Official Support Email
                    </label>
                    <input
                      type="email"
                      value={saasSettings.support_email || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          support_email: e.target.value,
                        }))
                      }
                      placeholder="support@smartinventory.app"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Dispatched in ticket confirmation emails and support escalation notifications.
                    </p>
                  </div>

                  {/* bKash Payment Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      bKash Payout / Send Money Number
                    </label>
                    <input
                      type="text"
                      value={saasSettings.bkash_number || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          bkash_number: e.target.value,
                        }))
                      }
                      placeholder="01753082749"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Displayed in merchant subscription upgrade modal for manual bKash payments.
                    </p>
                  </div>

                  {/* Nagad Payment Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Nagad Payout / Send Money Number
                    </label>
                    <input
                      type="text"
                      value={saasSettings.nagad_number || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          nagad_number: e.target.value,
                        }))
                      }
                      placeholder="01753082749"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Displayed in merchant subscription upgrade modal for manual Nagad payments.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Instant propagation: Updates live across merchant dashboards immediately upon saving.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings("Global Support & Contact Numbers")}
                    disabled={savingSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <span>{savingSettings ? "Saving Settings…" : "Save Global Contact Settings"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── AI COPILOT & MERCHANT ASSISTANT CONTROL CENTER ── */}
            <div id="ai-assistant-control-center" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-orange-600 font-semibold bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                      AI Agent Copilot
                    </span>
                    {saasSettings.ai_is_active !== false ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live &amp; Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Maintenance Mode
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="text-2xl select-none">🤖</span>
                    <span>Merchant AI Copilot Control Center ({saasSettings.ai_name || "Shongi"} / {saasSettings.ai_name_bn || "সঙ্গী"})</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 max-w-3xl">
                    Super Admin master control for the merchant AI assistant. Customize the assistant&apos;s cute name, Bengali identity, model reasoning mode, welcome message, or inject custom store rules directly into the AI system prompt.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/dashboard/piku"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                    title="Open Merchant AI workspace in new tab"
                  >
                    <span>Test AI Chat</span>
                    <span>↗</span>
                  </Link>
                </div>
              </div>

              {/* Master AI Kill-Switch / Status Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white shadow-md text-2xl select-none">
                    🤖
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {saasSettings.ai_name || "Shongi"} ({saasSettings.ai_name_bn || "সঙ্গী"}) AI Assistant
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-orange-100 text-orange-800 border border-orange-200">
                        {saasSettings.ai_model_mode === "pro" ? "DEEP PRO" : saasSettings.ai_model_mode === "fast" ? "FAST" : "BALANCED"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {saasSettings.ai_tagline || "আপনার স্মার্ট মার্চেন্ট অ্যাসিস্ট্যান্ট"} • 24/7 Multi-Language Copilot
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saasSettings.ai_is_active !== false}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          ai_is_active: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className="text-xs font-semibold text-slate-700">
                    {saasSettings.ai_is_active !== false ? "AI Active for Merchants" : "Maintenance Mode (Off)"}
                  </span>
                </div>
              </div>

              {/* AI Configuration Form */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* AI English Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      AI Brand Name (English)
                    </label>
                    <input
                      type="text"
                      value={saasSettings.ai_name || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          ai_name: e.target.value,
                        }))
                      }
                      placeholder="Shongi"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Primary brand name (e.g. Shongi, Niko, Lumi).
                    </p>
                  </div>

                  {/* AI Bengali Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      AI Brand Name (বাংলা)
                    </label>
                    <input
                      type="text"
                      value={saasSettings.ai_name_bn || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          ai_name_bn: e.target.value,
                        }))
                      }
                      placeholder="টুকু"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Bengali name shown in Bengali chat responses.
                    </p>
                  </div>

                  {/* AI Tagline */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      AI Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={saasSettings.ai_tagline || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          ai_tagline: e.target.value,
                        }))
                      }
                      placeholder="আপনার স্মার্ট মার্চেন্ট অ্যাসিস্ট্যান্ট"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Role description shown under the AI header.
                    </p>
                  </div>

                  {/* Model Mode */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Reasoning Intelligence Mode
                    </label>
                    <select
                      value={saasSettings.ai_model_mode || "balanced"}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          ai_model_mode: e.target.value,
                        }))
                      }
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition cursor-pointer"
                    >
                      <option value="fast">⚡ Fast (Lowest latency, quick answers)</option>
                      <option value="balanced">⚖️ Balanced (Recommended — Smart &amp; fast)</option>
                      <option value="pro">🧠 Deep Pro (Maximum analytical depth)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Controls reasoning depth and response speed.
                    </p>
                  </div>
                </div>

                {/* AI Welcome Message */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Default Welcome Greeting Message</span>
                    <span className="text-[10px] text-slate-400 font-normal">Shown when merchants open the chat</span>
                  </label>
                  <textarea
                    rows={3}
                    value={saasSettings.ai_welcome_message || ""}
                    onChange={(e) =>
                      setSaasSettings((prev) => ({
                        ...prev,
                        ai_welcome_message: e.target.value,
                      }))
                    }
                    placeholder="আসসালামু আলাইকুম! আমি সঙ্গী (Shongi) — আপনার স্মার্ট মার্চেন্ট অ্যাসিস্ট্যান্ট..."
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-slate-500">
                    Supports Markdown formatting (**bold**, bullet points, links).
                  </p>
                </div>

                {/* Custom Super Admin Guidance / Operational Store Rules */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Super Admin Operational Guidance &amp; Store Rules (Prompt Injection)</span>
                    <span className="text-[10px] text-orange-600 font-semibold">✨ Injected into System Prompt</span>
                  </label>
                  <textarea
                    rows={3}
                    value={saasSettings.ai_custom_instructions || ""}
                    onChange={(e) =>
                      setSaasSettings((prev) => ({
                        ...prev,
                        ai_custom_instructions: e.target.value,
                      }))
                    }
                    placeholder="e.g. Always remind merchants to take ৳150 advance bKash for outside Dhaka orders. If a merchant mentions Steadfast, advise them to upload CSV weekly. For Eid holidays, tell merchants about courier booking cutoff on 5th April."
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition leading-relaxed resize-y font-mono text-[11px]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Any rules typed here will directly guide the AI&apos;s recommendations across all merchant conversations.
                  </p>
                </div>

                {/* Save Footer Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Instant propagation: AI name and guidelines reflect live across all merchant workspaces immediately.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings("AI Copilot & Assistant Settings")}
                    disabled={savingSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <span>{savingSettings ? "Saving Settings…" : "Save AI Copilot Settings"}</span>
                  </button>
                </div>
              </div>
            </div>

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                      Password reset codes will be sent to this email.
                    </p>
                  </div>

                  {/* Recovery Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Recovery Phone Number
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
                      Required for emergency phone verification.
                    </p>
                  </div>

                  {/* Recovery PIN */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>Secret Recovery PIN</span>
                      <span className="text-[10px] text-orange-600 font-mono">6 DIGITS</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={saasSettings.admin_recovery_pin || ""}
                      onChange={(e) =>
                        setSaasSettings((prev) => ({
                          ...prev,
                          admin_recovery_pin: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      placeholder="882194"
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 font-mono tracking-widest focus:bg-white focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-[11px] text-slate-500">
                      Secret authorization PIN required for instant phone recovery.
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
          <AdminBlogTab
            triggerToast={triggerToast}
            initialOption={adminBlogStudioOption}
            onOptionChange={setAdminBlogStudioOption}
          />
        )}

        {/* ── STORE NOTIFICATIONS & READ RECEIPTS TAB ──────────────── */}
        {activeTab === "notifications" && (
          <AdminNotificationsTab
            notifications={adminNotifications}
            stats={adminNotifStats}
            loading={loadingAdminNotifs}
            onRefresh={fetchAdminNotifications}
            onOpenSendModal={(store) => {
              if (store) {
                handleOpenNotifyModal(store);
              } else {
                handleOpenBroadcastModal("all");
              }
            }}
            triggerToast={triggerToast}
          />
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
                    {selectedTenantForGodMode.ownerEmail} • ID: {String(selectedTenantForGodMode.id || "").slice(0, 8)}
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
                <div className="rounded-lg border border-slate-200 p-4 space-y-3.5 bg-white shadow-2xs">
                  {(() => {
                    const currentExp = selectedTenantForGodMode.config?.expires_at || selectedTenantForGodMode.expires_at;
                    const draftExp = godModeDraft.expires_at;
                    const diffDays = currentExp
                      ? Math.ceil((new Date(currentExp).getTime() - Date.now()) / 86400000)
                      : null;
                    const draftDiffDays = draftExp
                      ? Math.ceil((new Date(draftExp).getTime() - Date.now()) / 86400000)
                      : null;
                    const isExp = diffDays !== null && diffDays <= 0;
                    const formattedCurrentDate = currentExp ? new Date(currentExp).toLocaleDateString() : "No Expiry";
                    const formattedDraftDate = draftExp ? new Date(draftExp).toLocaleDateString() : "No Expiry / Ongoing";
                    const isDateChanged = currentExp !== draftExp;

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-slate-900">Subscription &amp; Validity</h4>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            {diffDays === null ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Ongoing</span>
                            ) : isExp ? (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                🔴 Expired ({formattedCurrentDate})
                              </span>
                            ) : diffDays <= 5 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                ⚠️ {diffDays}d left ({formattedCurrentDate})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                🟢 {diffDays}d left ({formattedCurrentDate})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Staged Date Diff Preview if Changed */}
                        {isDateChanged && (
                          <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-xs space-y-1 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between font-medium text-amber-900">
                              <span>Proposed Expiry (Unsaved):</span>
                              <span className="font-mono font-semibold">
                                {formattedDraftDate} ({draftDiffDays !== null ? `${draftDiffDays}d left` : "Ongoing"})
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-amber-700">
                              <span>Currently in Database:</span>
                              <span className="font-mono">{formattedCurrentDate}</span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Assigned Plan Tier
                          </label>
                          <select
                            value={godModeDraft.plan}
                            onChange={(e) => setGodModeDraft((prev) => ({ ...prev, plan: e.target.value }))}
                            disabled={godModeSaving}
                            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white font-medium"
                          >
                            <option value="starter">Starter Plan (৳999/mo · 300 orders)</option>
                            <option value="growth">Growth Pro Plan (৳1,990/mo · 2,000 orders)</option>
                            <option value="enterprise">Enterprise Plan (৳4,990/mo · Unlimited)</option>
                          </select>
                        </div>

                        {/* Reset / Standard Cycle Presets from Today */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Set Standard Cycle (From Today)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={godModeSaving}
                              onClick={() => handleGodModeSetCycle(15, "Trial")}
                              className="px-2.5 py-1.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-medium shadow-2xs transition disabled:opacity-50 text-center"
                            >
                              ⚡ Set 15-Day Trial
                            </button>
                            <button
                              type="button"
                              disabled={godModeSaving}
                              onClick={() => handleGodModeSetCycle(30, "Active")}
                              className="px-2.5 py-1.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium shadow-2xs transition disabled:opacity-50 text-center"
                            >
                              ✓ Set 30-Day Active Cycle
                            </button>
                          </div>
                        </div>

                        {/* Quick Adjust Extensions: Deduct & Add */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-medium text-slate-700">
                              Adjust Validity Days (Deduct − or Add +)
                            </label>
                            <span className="text-[10px] text-slate-400">Stages changes locally</span>
                          </div>

                          {/* Deduct (Minus) row */}
                          <div className="mb-2">
                            <div className="text-[10px] font-semibold text-rose-600 mb-1 flex items-center gap-1">
                              <span>Deduct Days (−):</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { label: "−30 Days", days: -30 },
                                { label: "−15 Days", days: -15 },
                                { label: "−7 Days", days: -7 },
                                { label: "−1 Day", days: -1 },
                              ].map((btn) => (
                                <button
                                  key={btn.label}
                                  type="button"
                                  disabled={godModeSaving}
                                  onClick={() => handleGodModeAdjustDays(btn.days)}
                                  className="px-1.5 py-1 rounded border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-[11px] font-mono font-medium text-rose-700 shadow-2xs transition disabled:opacity-50 text-center cursor-pointer"
                                  title={`Deduct ${Math.abs(btn.days)} days from validity`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Add (Plus) row */}
                          <div>
                            <div className="text-[10px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                              <span>Add Days (+):</span>
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                              {[
                                { label: "+1 Day", days: 1 },
                                { label: "+7 Days", days: 7 },
                                { label: "+15 Days", days: 15 },
                                { label: "+30 Days", days: 30 },
                                { label: "+90 Days", days: 90 },
                              ].map((btn) => (
                                <button
                                  key={btn.label}
                                  type="button"
                                  disabled={godModeSaving}
                                  onClick={() => handleGodModeAdjustDays(btn.days)}
                                  className="px-1.5 py-1 rounded border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-[11px] font-mono font-medium text-emerald-700 shadow-2xs transition disabled:opacity-50 text-center cursor-pointer"
                                  title={`Add ${btn.days} days to validity`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Set Exact Expiry Date */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Or Set Exact Expiry Date
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={
                                godModeDraft.expires_at
                                  ? new Date(godModeDraft.expires_at).toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) => {
                                if (e.target.value) {
                                  const d = new Date(e.target.value);
                                  d.setHours(23, 59, 59, 999);
                                  setGodModeDraft((prev) => ({ ...prev, expires_at: d.toISOString() }));
                                } else {
                                  setGodModeDraft((prev) => ({ ...prev, expires_at: null }));
                                }
                              }}
                              className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none bg-white"
                            />
                            {godModeDraft.expires_at && (
                              <button
                                type="button"
                                disabled={godModeSaving}
                                onClick={() => setGodModeDraft((prev) => ({ ...prev, expires_at: null }))}
                                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 transition shrink-0"
                                title="Clear expiry date for continuous ongoing access"
                              >
                                Set Ongoing
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-600 font-medium block">Store Operational Access</span>
                      <span className="text-[10px] text-slate-400">
                        Draft Status: <strong className={godModeDraft.status === "Active" ? "text-emerald-600" : "text-rose-600"}>{godModeDraft.status}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={godModeSaving}
                      onClick={() =>
                        setGodModeDraft((prev) => ({
                          ...prev,
                          status: prev.status === "Active" ? "Suspended" : "Active",
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                        godModeDraft.status === "Active"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {godModeDraft.status === "Active" ? "Set to Suspended" : "Set to Active"}
                    </button>
                  </div>

                  {/* Section Save & Discard Buttons */}
                  <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={godModeSaving || !isGodModeDirty}
                      onClick={handleSaveGodModeChanges}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition ${
                        isGodModeDirty
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      }`}
                    >
                      {godModeSaving ? "Saving Changes..." : isGodModeDirty ? "💾 Save Changes" : "✓ No Changes to Save"}
                    </button>
                    {isGodModeDirty && (
                      <button
                        type="button"
                        disabled={godModeSaving}
                        onClick={handleGodModeDiscardChanges}
                        className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                      >
                        ↺ Discard
                      </button>
                    )}
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
                      const isEnabled = godModeDraft.features?.[feat.key] ?? true;
                      return (
                        <div key={feat.key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="text-xs font-medium text-slate-900">{feat.label}</div>
                            <div className="text-[11px] text-slate-500">{feat.desc}</div>
                          </div>
                          <button
                            type="button"
                            disabled={godModeSaving}
                            onClick={() =>
                              setGodModeDraft((prev) => ({
                                ...prev,
                                features: {
                                  ...prev.features,
                                  [feat.key]: !isEnabled,
                                },
                              }))
                            }
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-200 cursor-pointer ${
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

              {/* Sticky Action Footer when changes are staged */}
              {isGodModeDirty && (
                <div className="p-4 border-t border-amber-200 bg-amber-50/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0 shadow-lg animate-in slide-in-from-bottom duration-150">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Unsaved store changes pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={godModeSaving}
                      onClick={handleGodModeDiscardChanges}
                      className="px-3 py-1.5 rounded-md border border-amber-300 bg-white hover:bg-amber-100/60 text-xs font-medium text-slate-700 transition cursor-pointer"
                    >
                      ↺ Discard
                    </button>
                    <button
                      type="button"
                      disabled={godModeSaving}
                      onClick={handleSaveGodModeChanges}
                      className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {godModeSaving ? "Saving..." : "💾 Save Changes"}
                    </button>
                  </div>
                </div>
              )}
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

        {/* ── 6. UNIFIED STORE NOTIFICATION & BROADCAST MODAL ─────── */}
        {(showNotifyModal || selectedTenantForNotify || showBroadcastModal) && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Dispatch Store Notification
                    </h3>
                    <p className="text-xs text-slate-500">
                      Send custom in-app alerts to single stores by code or broadcast platform-wide.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifyModal(false);
                    setSelectedTenantForNotify(null);
                    setShowBroadcastModal(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendUnifiedNotification} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                {/* 1. Target Audience Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider font-mono">
                    Target Audience *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "single", label: "Single Store" },
                      { id: "all", label: `All Stores (${tenants.length})` },
                      { id: "expiring", label: `Expiring (≤5d) (${expiringTenantsCount})` },
                      { id: "trial", label: `Trial Only (${trialTenantsCount})` },
                      { id: "active", label: `Active Paying (${activeTenantsCount})` },
                    ].map((tgt) => (
                      <button
                        key={tgt.id}
                        type="button"
                        onClick={() => setNotifyTargetType(tgt.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                          notifyTargetType === tgt.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tgt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1b. Single Store Selector & Code Search */}
                {notifyTargetType === "single" && (
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Select Store from Directory
                      </label>
                      <select
                        value={notifyTargetTenantId}
                        onChange={(e) => setNotifyTargetTenantId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
                      >
                        <option value="">-- Choose a store --</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || "Store"} ({t.ownerEmail}) [#{t.id ? t.id.slice(0, 8) : ""}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Or Enter Store Code / Tenant UUID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ec5b7420 or full tenant UUID"
                        value={notifyTargetTenantId}
                        onChange={(e) => setNotifyTargetTenantId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* Resolved Store Chip */}
                    {(() => {
                      const matched = tenants.find(
                        (t) =>
                          t.id === notifyTargetTenantId ||
                          (notifyTargetTenantId.length >= 4 &&
                            t.id.toLowerCase().startsWith(notifyTargetTenantId.toLowerCase()))
                      );
                      if (matched) {
                        return (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-800 bg-blue-100/70 px-2.5 py-1 rounded-md border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <span>
                              Target: <strong>{matched.name}</strong> (#{matched.id.slice(0, 8)}) &bull; {matched.ownerEmail}
                            </span>
                          </div>
                        );
                      } else if (notifyTargetTenantId.trim()) {
                        return (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            <span>Targeting store matching code: <strong>{notifyTargetTenantId}</strong></span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* 2. Quick Preset Templates */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Apply Quick Template (Optional)
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = tenants.find(
                        (t) =>
                          t.id === notifyTargetTenantId ||
                          (notifyTargetTenantId && t.id.toLowerCase().startsWith(notifyTargetTenantId.toLowerCase()))
                      );
                      const storeName = matched ? matched.name : "Merchant";

                      if (val === "expiring_3d") {
                        setNotifyForm({
                          title: "Trial Expiration Notice - 3 Days Left",
                          message: `Hello ${storeName}! Your 15-day trial is nearing its end in 3 days. Upgrade to Growth Pro today to keep your orders syncing with Steadfast and Pathao without interruption.`,
                          type: "warning",
                          category: "renewal",
                        });
                      } else if (val === "expired") {
                        setNotifyForm({
                          title: "Subscription Expired - Action Required",
                          message: `Hello ${storeName}! Your store subscription has expired. Please renew your plan via bKash/Nagad on your Billing page to restore full order dispatching and courier sync.`,
                          type: "alert",
                          category: "renewal",
                        });
                      } else if (val === "payment_approved") {
                        setNotifyForm({
                          title: "Payment Verified - Validity Extended!",
                          message: `Your subscription payment has been verified and your account validity has been successfully extended. Thank you for partnering with us!`,
                          type: "success",
                          category: "system",
                        });
                      } else if (val === "reconciliation_live") {
                        setNotifyForm({
                          title: "New Feature: Courier Auto-Reconciliation Live",
                          message: `Automated courier reconciliation for Steadfast & Pathao is now live! Upload your courier statements to audit pending COD payouts instantly.`,
                          type: "success",
                          category: "feature",
                        });
                      } else if (val === "maintenance") {
                        setNotifyForm({
                          title: "Scheduled System Maintenance Tonight",
                          message: `We will be performing a brief 15-minute database optimization tonight between 2:00 AM - 2:15 AM. Order syncing will resume immediately after.`,
                          type: "info",
                          category: "system",
                        });
                      } else if (val === "renewal_promo") {
                        setNotifyForm({
                          title: "Special Offer: 20% Off on Annual Renewal",
                          message: `Renew your store plan for 1 year this week and get 2 months extra validity free! Visit Billing & Plan to redeem this offer.`,
                          type: "success",
                          category: "renewal",
                        });
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Select a ready-made template or write custom below…</option>
                    <option value="expiring_3d">Trial Expiring in 3 Days</option>
                    <option value="expired">Subscription Expired Alert</option>
                    <option value="payment_approved">Payment Verified &amp; Quota Extended</option>
                    <option value="reconciliation_live">New Feature: Courier Auto-Reconciliation</option>
                    <option value="maintenance">Scheduled System Maintenance</option>
                    <option value="renewal_promo">Annual Plan Promotion (20% Off)</option>
                  </select>
                </div>

                {/* 3. Severity & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Notice Severity / Type
                    </label>
                    <select
                      value={notifyForm.type}
                      onChange={(e) => setNotifyForm({ ...notifyForm, type: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    >
                      <option value="info">Information (Blue)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="alert">Critical Alert (Red)</option>
                      <option value="success">Success / Promo (Green)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={notifyForm.category}
                      onChange={(e) => setNotifyForm({ ...notifyForm, category: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                    >
                      <option value="system">System Notice</option>
                      <option value="renewal">Renewal &amp; Billing</option>
                      <option value="feature">New Feature</option>
                      <option value="custom">General Custom</option>
                    </select>
                  </div>
                </div>

                {/* 4. Notification Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notification Subject / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={notifyForm.title}
                    onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                    placeholder="e.g. Critical Subscription Notice or Platform Update"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {/* 5. Message Body */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notification Message Body *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={notifyForm.message}
                    onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                    placeholder="Type notification message that will be shown in the merchant dashboard and top notification bell…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifyModal(false);
                      setSelectedTenantForNotify(null);
                      setShowBroadcastModal(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={notifySending}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {notifySending && (
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>
                      {notifyTargetType === "single"
                        ? "Deliver Notice to Store"
                        : `Dispatch Broadcast (${
                            notifyTargetType === "all"
                              ? "All Stores"
                              : notifyTargetType === "expiring"
                              ? "Expiring"
                              : notifyTargetType === "trial"
                              ? "Trial"
                              : "Active"
                          })`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR (lg:hidden) ─────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1.5 py-1 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            activeTab === "overview" ? "text-orange-600 font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="truncate">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tenants")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            activeTab === "tenants" ? "text-orange-600 font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="truncate">Stores</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pricing")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            activeTab === "pricing" ? "text-orange-600 font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">Billing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("support")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            activeTab === "support" ? "text-orange-600 font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="truncate">Support</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="truncate">More</span>
        </button>
      </nav>

      {/* ── Mobile PWA Install Banner ─────────────────────────── */}
      <PWAMobileBanner />
    </div>
  );
}
