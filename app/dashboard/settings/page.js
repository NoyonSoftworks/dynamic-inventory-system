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

export function UnifiedSettingsContent({ initialTab = "couriers" }) {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();
  const origin = useOrigin();
  const searchParams = useSearchParams();

  // ── Active Tab State ('couriers' | 'webhooks' | 'team') ──────
  const requestedTab = searchParams?.get("tab");
  const [localTab, setLocalTab] = useState(null);
  const activeTab =
    localTab ??
    (requestedTab && ["couriers", "webhooks", "team"].includes(requestedTab)
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
        showToast("success", `✓ ${selectedCourier} API credentials updated successfully!`);
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
        showToast("success", `✓ ${selectedCourier} API connected successfully!`);
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
      showToast("success", "✓ Webhook URL copied to clipboard!");
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      showToast("success", "✓ Secret API Key copied to clipboard!");
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Top Header Bar ──────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                <span>🏢</span>
                <span>{businessName || "Workspace Settings"}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Settings &amp; Integrations Hub
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Configure couriers, automated inbound webhooks, business profile, and team access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              ← Back to Catalog
            </Link>
          </div>
        </div>

        {/* ── Unified 3-Tab Navigation Bar ─────────────────── */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("couriers")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
              activeTab === "couriers"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>⚡</span>
            <span>Courier Integrations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("webhooks")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
              activeTab === "webhooks"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>🔗</span>
            <span>Webhooks &amp; APIs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shrink-0 ${
              activeTab === "team"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>👥</span>
            <span>Store Profile &amp; Team</span>
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
              <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs opacity-60 hover:opacity-100 font-bold ml-2"
            >
              ✕
            </button>
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
                  <span>🚚</span> Select Courier Gateway
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
                          ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs"
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
                      {existingSettingId ? "✓ Credentials Saved" : "Not Configured"}
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
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
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
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={savingCredentials}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                    >
                      {savingCredentials ? (
                        <>
                          <Spinner size={16} />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
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
                  <span>⚡</span> Inbound Order Webhook Endpoint
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
                    className="rounded-xl bg-slate-900 hover:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition shrink-0"
                  >
                    {copiedUrl ? "✓ Copied" : "Copy URL"}
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
                    {copiedKey ? "✓ Copied" : "Copy Key"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Setup Guides for WooCommerce & Shopify */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WooCommerce Guide */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🟣</span>
                  <h4 className="text-sm font-bold text-slate-900">WooCommerce Webhook Setup</h4>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Go to <strong>WP Admin → WooCommerce → Settings → Advanced → Webhooks</strong>.</li>
                  <li>Click <strong>Add Webhook</strong>.</li>
                  <li>Set <strong>Topic</strong> to <code className="font-mono text-indigo-600 font-bold">Order created</code>.</li>
                  <li>Paste the <strong>Delivery URL</strong> above into Delivery URL.</li>
                  <li>Set <strong>Secret</strong> to your Webhook Key.</li>
                  <li>Set <strong>API Version</strong> to <code className="font-mono text-indigo-600 font-bold">WP REST API Integration v3</code>.</li>
                </ol>
              </div>

              {/* Shopify Guide */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🟢</span>
                  <h4 className="text-sm font-bold text-slate-900">Shopify Custom Webhook Setup</h4>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Go to <strong>Shopify Admin → Settings → Notifications</strong>.</li>
                  <li>Scroll to the <strong>Webhooks</strong> section and click <strong>Create webhook</strong>.</li>
                  <li>Set <strong>Event</strong> to <code className="font-mono text-indigo-600 font-bold">Order creation</code>.</li>
                  <li>Set <strong>Format</strong> to <code className="font-mono text-indigo-600 font-bold">JSON</code>.</li>
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
                  <span>🏢</span> Store Profile Details
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
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={bizSaving || !bizName.trim()}
                  className="self-end rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {bizSaving ? "Saving…" : "Save Name"}
                </button>
              </form>
            </div>

            {/* Pre-Register Staff Member Card */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>👥</span> Pre-Register Team Member
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
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
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
                  <span>👥</span> Registered Staff Members ({users.length})
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
      <UnifiedSettingsContent initialTab="couriers" />
    </Suspense>
  );
}
