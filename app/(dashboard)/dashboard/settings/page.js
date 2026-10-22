"use client";

import { useEffect, useState, useSyncExternalStore, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

const emptySubscribe = () => () => {};

function useOrigin() {
  return useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  );
}

function CloseIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const ROLES = ["admin", "operator", "viewer"];

const COURIER_OPTIONS = [
  {
    id: "Steadfast",
    name: "Steadfast Courier",
    badge: "Active Integration",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    description: "Bangladesh nationwide automated courier delivery & COD fulfillment API.",
    endpointDocs: "https://api.steadfast.com.bd/v1/create_order",
  },
  {
    id: "Pathao",
    name: "Pathao Courier",
    badge: "Ready for Connect",
    color: "bg-red-500/10 text-red-600 border-red-200",
    description: "On-demand city logistics with merchant token authentication.",
    endpointDocs: "https://api-hermes.pathao.com/v1/orders",
  },
  {
    id: "RedX",
    name: "RedX Delivery",
    badge: "Ready for Connect",
    color: "bg-rose-500/10 text-rose-600 border-rose-200",
    description: "Enterprise e-commerce delivery across 64 districts.",
    endpointDocs: "https://openapi.redx.com.bd/v1.0.0-beta",
  },
  {
    id: "Paperfly",
    name: "Paperfly Go",
    badge: "Ready for Connect",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    description: "Doorstep delivery network with invoice tracking integration.",
    endpointDocs: "https://paperfly.com.bd/api",
  },
  {
    id: "Carrybee",
    name: "Carrybee Logistics",
    badge: "Ready for Connect",
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
    description: "Economy bulk delivery and fulfillment service.",
    endpointDocs: "https://carrybee.com.bd/api",
  },
];

export function UnifiedSettingsContent({ initialTab = "store" }) {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();
  const origin = useOrigin();
  const searchParams = useSearchParams();

  // ── Active Tab State ('store' | 'couriers' | 'webhooks' | 'team') ──────
  const requestedTab = searchParams?.get("tab");
  const [localTab, setLocalTab] = useState(null);
  const activeTab =
    localTab ??
    (requestedTab && ["store", "couriers", "webhooks", "team"].includes(requestedTab)
      ? requestedTab
      : initialTab);
  const setActiveTab = setLocalTab;

  // ── Toast Notification State ─────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // ─────────────────────────────────────────────────────────────
  // 0. STORE PROFILE & WEBSITE STATE
  // ─────────────────────────────────────────────────────────────
  const [storeProfile, setStoreProfile] = useState({
    name: "",
    website_url: "",
    phone: "",
    division: "Dhaka",
    address: "",
    currency: "BDT",
    tagline: "",
    status: "Trial",
    plan: "trial",
  });
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaving, setStoreSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let active = true;

    async function fetchProfile() {
      try {
        setStoreLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/tenant/profile", {
          headers: {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (active && json.success) {
            setStoreProfile({
              name: json.name || businessName || "",
              website_url: json.website_url || "",
              phone: json.phone || "",
              division: json.division || "Dhaka",
              address: json.address || "",
              currency: json.currency || "BDT",
              tagline: json.tagline || "",
              status: json.status || "Trial",
              plan: json.plan || "trial",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load store profile:", err);
      } finally {
        if (active) setStoreLoading(false);
      }
    }

    fetchProfile();
    return () => {
      active = false;
    };
  }, [businessId, businessName]);

  async function handleSaveStoreProfile(e) {
    e.preventDefault();
    if (!storeProfile.name.trim() || !businessId) {
      showToast("error", "Store name cannot be empty.");
      return;
    }

    setStoreSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/tenant/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify(storeProfile),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save store profile.");
      }

      showToast("success", "Store profile & website details saved successfully!");
    } catch (err) {
      showToast("error", err.message || "Failed to update store profile.");
    } finally {
      setStoreSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. COURIER INTEGRATIONS STATE
  // ─────────────────────────────────────────────────────────────
  const [selectedCourier, setSelectedCourier] = useState("Steadfast");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [existingSettingId, setExistingSettingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCourierConfig() {
      try {
        setLoadingCredentials(true);
        let query = supabase
          .from("courier_settings")
          .select("id, api_key, api_secret, courier_name, business_id")
          .eq("courier_name", selectedCourier);

        if (businessId) {
          query = query.eq("business_id", businessId);
        }

        const { data, error } = await query.maybeSingle();

        let foundData = data;
        if (!foundData && businessId) {
          const fallback = await supabase
            .from("courier_settings")
            .select("id, api_key, api_secret, courier_name")
            .eq("courier_name", selectedCourier)
            .maybeSingle();

          if (fallback.data) {
            foundData = fallback.data;
          }
        }

        if (!isMounted) return;

        if (error) {
          setExistingSettingId(null);
          setApiKeyInput("");
          setApiSecretInput("");
        } else if (foundData) {
          setExistingSettingId(foundData.id);
          setApiKeyInput(foundData.api_key || "");
          setApiSecretInput(foundData.api_secret || "");
        } else {
          setExistingSettingId(null);
          setApiKeyInput("");
          setApiSecretInput("");
        }
      } catch (err) {
        console.error("Failed to fetch courier credentials:", err);
      } finally {
        if (isMounted) setLoadingCredentials(false);
      }
    }

    fetchCourierConfig();
    return () => {
      isMounted = false;
    };
  }, [selectedCourier, businessId]);

  async function handleSaveCourier(e) {
    e.preventDefault();

    if (!apiKeyInput.trim()) {
      showToast("error", "API Key is required.");
      return;
    }
    if (!apiSecretInput.trim()) {
      showToast("error", "API Secret is required.");
      return;
    }

    setSavingCredentials(true);

    try {
      if (existingSettingId) {
        const { error: updateErr } = await supabase
          .from("courier_settings")
          .update({
            api_key: apiKeyInput.trim(),
            api_secret: apiSecretInput.trim(),
          })
          .eq("id", existingSettingId);

        if (updateErr) throw updateErr;
        showToast("success", `${selectedCourier} API credentials updated successfully.`);
      } else {
        const insertPayload = {
          courier_name: selectedCourier,
          api_key: apiKeyInput.trim(),
          api_secret: apiSecretInput.trim(),
        };

        if (businessId) {
          insertPayload.business_id = businessId;
        }

        let { data: newRow, error: insertErr } = await supabase
          .from("courier_settings")
          .insert(insertPayload)
          .select()
          .single();

        if (insertErr && insertErr.message?.includes("business_id")) {
          delete insertPayload.business_id;
          const retry = await supabase
            .from("courier_settings")
            .insert(insertPayload)
            .select()
            .single();
          newRow = retry.data;
          insertErr = retry.error;
        }

        if (insertErr) throw insertErr;

        if (newRow?.id) {
          setExistingSettingId(newRow.id);
        }
        showToast("success", `${selectedCourier} API connected successfully.`);
      }
    } catch (err) {
      showToast("error", err.message || "Failed to save courier credentials.");
    } finally {
      setSavingCredentials(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. WEBHOOK & API STATE
  // ─────────────────────────────────────────────────────────────
  const webhookKey = "sk_live_123456789";
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const webhookUrl = origin
    ? `${origin}/api/webhook/orders`
    : "https://your-domain.com/api/webhook/orders";

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      showToast("success", "Webhook URL copied to clipboard.");
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      showToast("success", "Secret API key copied to clipboard.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. STORE PROFILE & TEAM MEMBERS STATE
  // ─────────────────────────────────────────────────────────────
  const [customBizName, setCustomBizName] = useState(null);
  const bizName = customBizName ?? (businessName || "");
  const [bizSaving, setBizSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");
  const [inviting, setInviting] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (!error && data) setUsers(data);
    setUsersLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    async function fetchTeam() {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });

      if (active) {
        if (!error && data) setUsers(data);
        setUsersLoading(false);
      }
    }
    fetchTeam();
    return () => {
      active = false;
    };
  }, [businessId]);

  async function handleSaveName(e) {
    e.preventDefault();
    if (!bizName.trim() || !businessId) return;
    setBizSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ name: bizName.trim() })
      .eq("id", businessId);

    setBizSaving(false);
    if (error) {
      showToast("error", "Failed to update business name.");
    } else {
      showToast("success", "Business name updated successfully!");
    }
  }

  async function handleRoleChange(userId, email, newRole) {
    const originalUsers = [...users];
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      setUsers(originalUsers);
      showToast("error", `Failed to update ${email}.`);
    } else {
      showToast("success", `${email} role updated to ${newRole.toUpperCase()}`);
    }
  }

  async function handleRemoveMember(userId, email) {
    if (!confirm(`Remove ${email} from your team?`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", userId);

    if (error) {
      showToast("error", `Failed to remove ${email}.`);
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast("success", `${email} removed from team.`);
    }
  }

  async function handleInviteMember(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !businessId) return;
    setInviting(true);

    const exists = users.find(
      (u) => u.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    if (exists) {
      showToast("error", "This email is already on your team.");
      setInviting(false);
      return;
    }

    const { error } = await supabase.from("user_roles").insert({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      business_id: businessId,
    });

    setInviting(false);
    if (error) {
      showToast(
        "error",
        error.message.includes("duplicate")
          ? "This email is already registered."
          : `Failed to add staff: ${error.message}`
      );
    } else {
      showToast(
        "success",
        "Staff added! Tell them to sign up with this email or use Google Login."
      );
      setInviteEmail("");
      setInviteRole("operator");
      loadTeam();
    }
  }

  if (ctxLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size={32} />
      </main>
    );
  }

  const selectedCourierObj =
    COURIER_OPTIONS.find((c) => c.id === selectedCourier) || COURIER_OPTIONS[0];

  return (
    <main className="min-h-screen bg-zinc-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Top Header Bar ──────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-mono font-medium text-zinc-700">
                <span>{businessName || "Workspace Settings"}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Settings &amp; Integrations
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Configure courier credentials, inbound webhook endpoints, team access, and store profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
            >
              ← Return to Catalog
            </Link>
          </div>
        </div>

        {/* ── Unified 4-Tab Navigation Bar ─────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "store"
                ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Store Profile &amp; Website</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("couriers")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "couriers"
                ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Courier Integrations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("webhooks")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "webhooks"
                ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>Webhooks &amp; APIs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "team"
                ? "bg-orange-600 text-white shadow-xs shadow-orange-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Team &amp; Staff</span>
          </button>
        </div>

        {/* ── Toast Alert Banner ──────────────────────────── */}
        {toast && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 transition ml-2"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 0: STORE PROFILE & WEBSITE
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "store" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Store Subscription & Status Banner */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-xl border border-orange-200">
                  🏪
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">
                      {storeProfile.name || businessName || "My Store"}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        storeProfile.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
                          : "bg-amber-500/10 text-amber-700 border border-amber-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${storeProfile.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {storeProfile.status === "Active" ? "Active Subscription" : "Free Trial Account"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      Plan Tier: <strong className="uppercase text-slate-800">{storeProfile.plan || "trial"}</strong>
                    </span>
                    <span>•</span>
                    {storeProfile.website_url ? (
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <span>🌐 Connected:</span>
                        <a
                          href={storeProfile.website_url.startsWith("http") ? storeProfile.website_url : `https://${storeProfile.website_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline font-mono"
                        >
                          {storeProfile.website_url.replace(/^https?:\/\//, "")}
                        </a>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">⚠️ No live website URL connected yet</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={
                    storeProfile.website_url
                      ? `/dashboard/products/import?url=${encodeURIComponent(storeProfile.website_url)}`
                      : "/dashboard/products/import"
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-500 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Import Products from Website →</span>
                </Link>
              </div>
            </div>

            {/* Store Information Form */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Store Profile &amp; Live Website Settings</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure your business branding, e-commerce storefront domain, contact number, and default warehouse location.
                </p>
              </div>

              {storeLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Spinner size={24} />
                  <span>Loading store settings…</span>
                </div>
              ) : (
                <form onSubmit={handleSaveStoreProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Store / Brand Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Store / Brand Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={storeProfile.name}
                        onChange={(e) => setStoreProfile({ ...storeProfile, name: e.target.value })}
                        placeholder="e.g. Dhaka Artisan Goods"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Shown on invoices, dispatch notes, and barcode labels.
                      </p>
                    </div>

                    {/* Official Website URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Live E-Commerce Website URL
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={storeProfile.website_url}
                          onChange={(e) => setStoreProfile({ ...storeProfile, website_url: e.target.value })}
                          placeholder="https://yourstore.com or https://yourshop.myshopify.com"
                          className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                        />
                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                          🌐
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Shopify, WooCommerce, or custom web store URL for 1-click catalog import.
                      </p>
                    </div>

                    {/* Contact Phone / WhatsApp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Support Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={storeProfile.phone}
                        onChange={(e) => setStoreProfile({ ...storeProfile, phone: e.target.value })}
                        placeholder="+880 1712-345678"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                      />
                    </div>

                    {/* Warehouse Division */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Warehouse Division / Region
                      </label>
                      <select
                        value={storeProfile.division}
                        onChange={(e) => setStoreProfile({ ...storeProfile, division: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                      >
                        <option value="Dhaka">Dhaka (Default)</option>
                        <option value="Chittagong">Chittagong</option>
                        <option value="Sylhet">Sylhet</option>
                        <option value="Khulna">Khulna</option>
                        <option value="Rajshahi">Rajshahi</option>
                        <option value="Barisal">Barisal</option>
                        <option value="Rangpur">Rangpur</option>
                        <option value="Mymensingh">Mymensingh</option>
                      </select>
                    </div>

                    {/* Tagline / Bio */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Storefront Tagline / Bio
                      </label>
                      <input
                        type="text"
                        value={storeProfile.tagline}
                        onChange={(e) => setStoreProfile({ ...storeProfile, tagline: e.target.value })}
                        placeholder="e.g. Premium Lifestyle & Fashion Brand in Bangladesh"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                      />
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Default Currency
                      </label>
                      <select
                        value={storeProfile.currency}
                        onChange={(e) => setStoreProfile({ ...storeProfile, currency: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                      >
                        <option value="BDT">BDT (৳ Bangladeshi Taka)</option>
                        <option value="USD">USD ($ United States Dollar)</option>
                        <option value="EUR">EUR (€ Euro)</option>
                      </select>
                    </div>
                  </div>

                  {/* Physical Warehouse Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Warehouse / Dispatch Pickup Address
                    </label>
                    <textarea
                      rows={2}
                      value={storeProfile.address}
                      onChange={(e) => setStoreProfile({ ...storeProfile, address: e.target.value })}
                      placeholder="e.g. House #14, Road #7, Dhanmondi, Dhaka 1205, Bangladesh"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      Tenant ID: {businessId || "Unassigned"}
                    </span>
                    <button
                      type="submit"
                      disabled={storeSaving || !storeProfile.name.trim()}
                      className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50 transition"
                    >
                      {storeSaving ? "Saving Settings…" : "Save Store Profile"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Website Catalog Sync Shortcut Box */}
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50/70 to-amber-50/50 p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌐</span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Website Catalog &amp; Product Importer
                    </h4>
                    <span className="rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 text-[10px] font-bold">
                      Shopify · WooCommerce · Web Stores
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl">
                    Import your product catalog, prices, categories, and images directly from your live store website into this inventory system with 1 click.
                  </p>
                </div>

                <Link
                  href={
                    storeProfile.website_url
                      ? `/dashboard/products/import?url=${encodeURIComponent(storeProfile.website_url)}`
                      : "/dashboard/products/import"
                  }
                  className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold shadow-sm hover:bg-slate-800 transition shrink-0 inline-flex items-center gap-2"
                >
                  <span>Launch Website Importer</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 1: COURIER INTEGRATIONS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "couriers" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Courier Selection Grid */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Select Courier Gateway</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  Click a provider to manage API credentials
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {COURIER_OPTIONS.map((c) => {
                  const isSelected = selectedCourier === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCourier(c.id)}
                      className={`flex flex-col text-left p-3 rounded-xl border transition relative ${
                        isSelected
                          ? "border-orange-600 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {c.name}
                      </div>
                      <span
                        className={`mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border max-w-fit ${c.color}`}
                      >
                        {c.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Courier Credentials Form Card */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedCourierObj.name} Integration
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedCourierObj.color}`}
                    >
                      {existingSettingId ? "Credentials saved" : "Not configured"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedCourierObj.description}
                  </p>
                </div>

                <a
                  href={selectedCourierObj.endpointDocs}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
                >
                  <span>Official API Documentation ↗</span>
                </a>
              </div>

              {loadingCredentials ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Spinner size={24} />
                  <span>Loading {selectedCourier} credentials…</span>
                </div>
              ) : (
                <form onSubmit={handleSaveCourier} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      API Key / App Key
                    </label>
                    <input
                      type="text"
                      required
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={`Enter ${selectedCourier} API Key`}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Secret Key / Bearer Secret
                    </label>
                    <input
                      type="password"
                      required
                      value={apiSecretInput}
                      onChange={(e) => setApiSecretInput(e.target.value)}
                      placeholder={`Enter ${selectedCourier} API Secret`}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={savingCredentials}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/30 transition disabled:opacity-50"
                    >
                      {savingCredentials ? (
                        <>
                          <Spinner size={16} />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save {selectedCourier} Credentials</span>
                        </>
                      )}
                    </button>

                    {existingSettingId && (
                      <span className="text-[11px] font-mono text-slate-400">
                        Record ID: {existingSettingId.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: WEBHOOKS & APIS
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "webhooks" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Live Webhook Inbound Endpoint Card */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Inbound Order Webhook Endpoint</span>
                </h3>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  HTTP POST Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure your WooCommerce or Shopify webhook to send order notifications to this
                secure URL. Orders will automatically appear in your fulfillment queue.
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Webhook Target URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookUrl, "url")}
                    className="rounded-xl bg-slate-900 hover:bg-orange-600 px-4 py-2.5 text-xs font-bold text-white transition shrink-0"
                  >
                    {copiedUrl ? "Copied" : "Copy URL"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Secret Authentication Key (Bearer / x-api-key)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookKey}
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookKey, "key")}
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition shrink-0"
                  >
                    {copiedKey ? "Copied" : "Copy Key"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Setup Guides for WooCommerce & Shopify */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WooCommerce Guide */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 font-mono">
                    W
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">WooCommerce Webhook Setup</h4>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Go to <strong>WP Admin → WooCommerce → Settings → Advanced → Webhooks</strong>.</li>
                  <li>Click <strong>Add Webhook</strong>.</li>
                  <li>Set <strong>Topic</strong> to <code className="font-mono text-orange-600 font-bold">Order created</code>.</li>
                  <li>Paste the <strong>Delivery URL</strong> above into Delivery URL.</li>
                  <li>Set <strong>Secret</strong> to your Webhook Key.</li>
                  <li>Set <strong>API Version</strong> to <code className="font-mono text-orange-600 font-bold">WP REST API Integration v3</code>.</li>
                </ol>
              </div>

              {/* Shopify Guide */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 font-mono">
                    S
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">Shopify Custom Webhook Setup</h4>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Go to <strong>Shopify Admin → Settings → Notifications</strong>.</li>
                  <li>Scroll to the <strong>Webhooks</strong> section and click <strong>Create webhook</strong>.</li>
                  <li>Set <strong>Event</strong> to <code className="font-mono text-orange-600 font-bold">Order creation</code>.</li>
                  <li>Set <strong>Format</strong> to <code className="font-mono text-orange-600 font-bold">JSON</code>.</li>
                  <li>Paste the Webhook URL into the <strong>URL</strong> field.</li>
                  <li>Click <strong>Save</strong> to activate live order synchronization.</li>
                </ol>
              </div>
            </div>

            {/* JSON Schema Preview */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 text-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-emerald-400">
                  Sample JSON Webhook Payload
                </span>
                <span className="text-[10px] font-mono text-slate-500">application/json</span>
              </div>
              <pre className="text-[11px] font-mono bg-slate-950 p-4 rounded-xl text-slate-300 overflow-x-auto">
{`{
  "customer_name": "Rahim Ahmed",
  "customer_phone": "01711000000",
  "customer_address": "House 12, Road 4, Dhanmondi, Dhaka",
  "courier": "Steadfast",
  "total_amount": 1450,
  "items": [
    { "sku": "POLO-BLK-M", "quantity": 1, "price": 1450 }
  ]
}`}
              </pre>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 3: STORE PROFILE & TEAM
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "team" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Business Profile Card */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Store Profile Details</span>
                </h3>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                  Tenant ID: {businessId || "Unassigned"}
                </span>
              </div>

              <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Store / Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bizName}
                    onChange={(e) => setCustomBizName(e.target.value)}
                    placeholder="e.g. My Awesome Store"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={bizSaving || !bizName.trim()}
                  className="self-end rounded-xl bg-orange-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-500 disabled:opacity-50 transition"
                >
                  {bizSaving ? "Saving…" : "Save Name"}
                </button>
              </form>
            </div>

            {/* Pre-Register Staff Member Card */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Pre-Register Team Member</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add staff accounts without requiring an email server. They can immediately log in
                  via Google or Email OTP and will automatically join this store.
                </p>
              </div>

              <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 focus:outline-none"
                >
                  <option value="operator">Operator (Orders, Scanner, Stock)</option>
                  <option value="viewer">Viewer (Read-only catalog &amp; reports)</option>
                  <option value="admin">Admin (Full settings &amp; team access)</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/30 disabled:opacity-50 transition shrink-0"
                >
                  {inviting ? "Adding…" : "+ Add Staff"}
                </button>
              </form>
            </div>

            {/* Team Members Management Table */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Registered Staff Members ({users.length})</span>
                </h3>
              </div>

              {usersLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Spinner size={24} />
                  <span>Loading team roster…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-3.5 font-bold">Email</th>
                        <th className="px-6 py-3.5 font-bold">Joined Date</th>
                        <th className="px-6 py-3.5 font-bold">Role</th>
                        <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            {u.email}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, u.email, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-800"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.role !== "admin" && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(u.id, u.email)}
                                className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            No team members registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function ClientSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Spinner size={32} />
        </main>
      }
    >
      <UnifiedSettingsContent initialTab="store" />
    </Suspense>
  );
}
