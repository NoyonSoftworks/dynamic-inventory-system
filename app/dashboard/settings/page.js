"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

const emptySubscribe = () => () => {};

function useOrigin() {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => ""
  );
}

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

export default function ClientSettingsPage() {
  const { businessId, businessName } = useBusinessContext();
  const origin = useOrigin();

  // ── Active Tabs ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("couriers"); // 'couriers' | 'webhooks'

  // ── Courier Form State ───────────────────────────────────────
  const [selectedCourier, setSelectedCourier] = useState("Steadfast");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [existingSettingId, setExistingSettingId] = useState(null);

  // ── Webhook State ────────────────────────────────────────────
  const webhookKey = "sk_live_123456789";
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const webhookUrl = origin
    ? `${origin}/api/webhook/orders`
    : "https://your-domain.com/api/webhook/orders";

  // ── Toast Notification ───────────────────────────────────────
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Fetch Courier Settings for Selected Provider ─────────────
  useEffect(() => {
    let isMounted = true;

    async function fetchCourierConfig() {
      try {
        let query = supabase
          .from("courier_settings")
          .select("id, api_key, api_secret, courier_name, business_id")
          .eq("courier_name", selectedCourier);

        if (businessId) {
          query = query.eq("business_id", businessId);
        }

        const { data, error } = await query.maybeSingle();

        // Fallback check without business_id if not found
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
          console.error("Error loading courier settings:", error);
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
        if (isMounted) {
          setLoadingCredentials(false);
        }
      }
    }

    fetchCourierConfig();

    return () => {
      isMounted = false;
    };
  }, [selectedCourier, businessId]);

  // ── Save / Update Courier Credentials ────────────────────────
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
        // Update existing record
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
        // Insert new record
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

        // Fallback without business_id if column does not exist
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

        if (newRow?.id) setExistingSettingId(newRow.id);
        showToast("success", `✓ ${selectedCourier} API credentials saved and activated!`);
      }
    } catch (err) {
      showToast("error", `Failed to save credentials: ${err.message || "Unknown error"}`);
    } finally {
      setSavingCredentials(false);
    }
  }

  // ── Copy Helpers ─────────────────────────────────────────────
  function copyToClipboard(text, isUrl = false) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isUrl) {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ── Top Header Bar ──────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link href="/" className="hover:text-indigo-600 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-semibold">Settings</span>
              <span>/</span>
              <span className="text-indigo-600 font-semibold">Integrations</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>⚙️</span> Client Settings &amp; API Integrations
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure courier delivery API keys and connect your WooCommerce, Shopify, or Laravel storefronts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              👥 Team &amp; Business
            </Link>
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              📦 Inventory
            </Link>
          </div>
        </div>

        {/* ── Toast Alert ─────────────────────────────────── */}
        {toast && (
          <div
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-md transition-all ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
              <span className="font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs font-semibold opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Navigation Tabs ─────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("couriers")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "couriers"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>🚚</span> Courier API Integrations
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "webhooks"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>⚡</span> Universal CMS Webhook API
          </button>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all ml-auto"
          >
            <span>👥</span> Switch to Team &amp; Business Profile →
          </Link>
        </div>

        {/* ================================================= */}
        {/* ── TAB 1: COURIER API INTEGRATION ─────────────── */}
        {/* ================================================= */}
        {activeTab === "couriers" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Courier Provider Selector (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200/80 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Select Courier Partner
                </h2>
                <p className="text-xs text-slate-500">
                  Select a partner below to input merchant API credentials. Steadfast integration is fully automated for dispatch.
                </p>

                <div className="space-y-2 pt-1">
                  {COURIER_OPTIONS.map((c) => {
                    const isSelected = selectedCourier === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCourier(c.id);
                          setLoadingCredentials(true);
                        }}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">{c.name}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.color}`}
                          >
                            {c.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {c.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: API Credentials Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>🔑</span> {selectedCourier} Credentials
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your official merchant keys to enable automatic consignment creation.
                    </p>
                  </div>
                  {existingSettingId && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Configured
                    </span>
                  )}
                </div>

                {loadingCredentials ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                    <Spinner size={24} />
                    <span>Loading saved credentials…</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveCourier} className="space-y-5">
                    {/* API Key */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Api-Key <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={`Paste ${selectedCourier} API Key`}
                        className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Find this in your {selectedCourier} Merchant Panel under Developer &gt; API.
                      </p>
                    </div>

                    {/* API Secret */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Secret-Key <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={apiSecretInput}
                        onChange={(e) => setApiSecretInput(e.target.value)}
                        placeholder={`Paste ${selectedCourier} Secret Key`}
                        className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Kept secure on our backend. Used for signed authorization headers.
                      </p>
                    </div>

                    {/* Help banner for Steadfast */}
                    {selectedCourier === "Steadfast" && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>⚡</span> Automated Checkout Ready
                        </div>
                        <p className="text-emerald-800 leading-relaxed">
                          Once saved, dispatches from the <strong>Dispatch Console</strong> will directly trigger Steadfast API to generate consignment tracking IDs in real time.
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="submit"
                        disabled={savingCredentials}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {savingCredentials ? (
                          <>
                            <Spinner size={16} />
                            <span>Saving Credentials…</span>
                          </>
                        ) : (
                          <>
                            <span>💾 Save {selectedCourier} Credentials</span>
                          </>
                        )}
                      </button>

                      {existingSettingId && (
                        <span className="text-xs text-slate-400">
                          Workspace: <code className="font-mono text-slate-600">{businessName || businessId || "Default"}</code>
                        </span>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* ── TAB 2: UNIVERSAL CMS WEBHOOK API ───────────── */}
        {/* ================================================= */}
        {activeTab === "webhooks" && (
          <div className="space-y-6">
            {/* Webhook Credentials Card */}
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>⚡</span> Inbound Webhook Credentials
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect WordPress / WooCommerce, Shopify, or Custom Laravel platforms to automatically stream incoming orders into this inventory system.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* API Key Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Webhook Secret Key (<code className="lowercase font-mono text-indigo-600">x-api-key</code>)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 font-mono text-sm font-bold text-emerald-400 select-all overflow-x-auto">
                      {webhookKey}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookKey, false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition shrink-0"
                    >
                      {copiedKey ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Include this in your store&apos;s Webhook request header as <code className="font-mono text-slate-700">x-api-key: {webhookKey}</code>.
                  </p>
                </div>

                {/* Endpoint URL Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Webhook Destination Endpoint (POST)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 font-mono text-xs text-slate-800 select-all overflow-x-auto">
                      {webhookUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, true)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition shrink-0"
                    >
                      {copiedUrl ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Set this as the Webhook Delivery URL on WooCommerce or Shopify Order Create events.
                  </p>
                </div>
              </div>
            </div>

            {/* Integration Guide & Payload Specification */}
            <div className="rounded-2xl bg-slate-900 p-6 shadow-2xl text-white space-y-5 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Standard CMS Webhook Payload Specification
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  HTTP POST · JSON
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                When a new order occurs on your store, configure your webhook or custom script to POST the JSON payload below. The system validates the product SKU against available records and creates a ticket marked as <strong className="text-amber-300 font-mono">PENDING_DISPATCH</strong> ready for physical barcode scanning.
              </p>

              {/* Sample Code Block */}
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
                <pre>{`// Headers:
Content-Type: application/json
x-api-key: ${webhookKey}

// POST ${webhookUrl}
{
  "source": "woocommerce",
  "external_order_id": "#1045",
  "customer_name": "Rahim Uddin",
  "customer_phone": "017XXXXXXXX",
  "customer_address": "Mirpur 10, Dhaka",
  "total_amount": 1250,
  "items": [
     { "sku": "TSHIRT-BLK", "quantity": 1 }
  ]
}`}</pre>
              </div>

              {/* Integration Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60 space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>1.</span> WordPress / WooCommerce
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Go to WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks. Add new webhook with topic &quot;Order created&quot;.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60 space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>2.</span> Shopify Notifications
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Navigate to Settings &gt; Notifications &gt; Webhooks. Create a webhook for Event: &quot;Order creation&quot;.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/60 space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>3.</span> Custom Laravel / Node
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Use HTTP client (Guzzle / Axios) to POST JSON to the destination endpoint with the <code className="text-slate-300">x-api-key</code> header.
                  </p>
                </div>
              </div>
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
      className="animate-spin text-current"
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
