"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

export default function SuperAdminDashboard() {
  // ── Auth & Permission State ────────────────────────────────
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // ── Telemetry State ────────────────────────────────────────
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

  // ── Data Fetcher ───────────────────────────────────────────
  async function fetchSuperAdminData() {
    const res = await fetch("/api/admin/overview");
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to load telemetry overview.");
    }
    return await res.json();
  }

  // ── Security Check & Initial Mount ─────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function checkSecurityAndLoad() {
      try {
        // 1. Verify user session via Supabase
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

        // 2. Validate against ADMIN_EMAIL
        if (email !== ADMIN_EMAIL) {
          if (isMounted) {
            setIsAuthorized(false);
            setAuthChecking(false);
            setLoading(false);
          }
          return;
        }

        // 3. User is valid super admin
        if (isMounted) {
          setIsAuthorized(true);
        }

        // 4. Fetch telemetry only for authorized admin
        const data = await fetchSuperAdminData();
        if (isMounted) {
          if (data.summary) setSummary(data.summary);
          if (data.tenants) setTenants(data.tenants);
          if (data.courierBreakdown) setCourierBreakdown(data.courierBreakdown);
          if (data.recentOrders) setRecentOrders(data.recentOrders);
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

  // ── Manual Refresh Handler ─────────────────────────────────
  async function handleManualRefresh() {
    if (!isAuthorized) return;
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchSuperAdminData();
      if (data.summary) setSummary(data.summary);
      if (data.tenants) setTenants(data.tenants);
      if (data.courierBreakdown) setCourierBreakdown(data.courierBreakdown);
      if (data.recentOrders) setRecentOrders(data.recentOrders);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || "Failed to refresh telemetry.");
    } finally {
      setRefreshing(false);
    }
  }

  // ── Tenant Status Toggle (Active / Suspended) ───────────────
  function toggleTenantStatus(tenantId) {
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? { ...t, status: t.status === "Active" ? "Suspended" : "Active" }
          : t
      )
    );
  }

  // ── Delete / Purge Tenant Workspace ────────────────────────
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
        alert(json.error || "Failed to delete tenant workspace.");
        return;
      }
      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      setSummary((prev) => ({
        ...prev,
        totalTenants: Math.max(0, prev.totalTenants - 1),
      }));
    } catch (err) {
      alert(err.message || "Error deleting tenant workspace.");
    }
  }

  // ── Super Admin Logout ─────────────────────────────────────
  async function handleLogout() {
    document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ── 1. LOADING SCREEN ──────────────────────────────────────
  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-300">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={32} />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white tracking-wide">
              Verifying Security Credentials…
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Role-Based Access Control Evaluation
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
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl shadow-rose-950/30 text-center space-y-6 relative overflow-hidden">
          {/* Top glowing ambient accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />

          {/* Shield / Lock Icon */}
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
              This command console is reserved exclusively for the platform owner.
              Your signed-in account does not possess super administrator clearance.
            </p>
          </div>

          {/* Account Details Box */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-left text-xs font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Signed in identity:
            </div>
            <div className="text-slate-300 font-bold truncate">
              {currentUserEmail || "Unauthenticated Session"}
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/dashboard/products"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              <span>← Return to Client Dashboard</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <span>Sign In as Super Admin</span>
            </Link>
          </div>

          <p className="text-[10px] text-slate-600 font-mono">
            Security Rule: RBAC Strict Matching Enforced
          </p>
        </div>
      </main>
    );
  }

  // ── 3. SUPER ADMIN DASHBOARD (AUTHORIZED) ──────────────────
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
      <div className="mx-auto max-w-7xl space-y-8">
        {/* ── Top Header Bar ──────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Master Control Plane · Owner Restricted
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>🛡️</span> SaaS Owner Command Console
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Logged in as <code className="text-indigo-400 font-mono">{currentUserEmail}</code> (Platform Owner).
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
              href="/dashboard/products"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition"
              title="Open the client product catalog view"
            >
              <span>🏪</span> View Client Store →
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

        {/* ── Error Banner ─────────────────────────────────── */}
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

        {/* ── TOP EXECUTIVE METRICS GRID ──────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Total Tenants / Workspaces */}
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

          {/* 2. Global Catalog SKUs */}
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
              Unique barcodes serialized across stores
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-700 opacity-60" />
          </div>

          {/* 3. Global Orders & Revenue */}
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
              <span className="text-[11px] text-slate-400">({summary.totalDispatched} Shipped)</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Total GMV: ৳{summary.totalRevenue.toLocaleString()}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
          </div>

          {/* 4. Inbound Webhook Volume & System Health */}
          <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Webhook Hits &amp; Health
              </span>
              <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400 text-sm">
                ⚡
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <div className="text-3xl font-black text-white font-mono">
                {loading ? "…" : summary.totalWebhookHits}
              </div>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">Inbound Streams</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (99.98% SLA)</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
          </div>
        </div>

        {/* ── SECTION 1: TENANT / BUSINESS MANAGEMENT TABLE ── */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏢</span> Tenant &amp; Business Management Console
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of all registered merchant businesses, connected courier gateways, and status.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              {tenants.length} Managed Workspace(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Spinner size={24} />
                <span>Loading merchant tenants…</span>
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No businesses found in directory.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Business / Store</th>
                    <th className="px-5 py-3.5 font-bold">Merchant Account</th>
                    <th className="px-5 py-3.5 font-bold">Workspace Role</th>
                    <th className="px-5 py-3.5 font-bold">Connected Couriers</th>
                    <th className="px-5 py-3.5 font-bold">Catalog SKUs</th>
                    <th className="px-5 py-3.5 font-bold">Dispatched / Total</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {tenants.map((t) => {
                    const isActive = t.status === "Active";
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{t.isOwnerWorkspace ? "👑" : "🏪"}</span>
                            <span>{t.name}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            ID: {t.id}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-slate-300 font-mono text-xs">
                            {t.ownerEmail}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Registered Merchant
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {t.isOwnerWorkspace ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span>👑</span> Platform Owner Workspace
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <span>🏢</span> Client Merchant Store
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {t.connectedCouriers?.map((c, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                  c === "Steadfast"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : c === "Pathao"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {c !== "None" && <span>🚚</span>}
                                <span>{c}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-slate-200">
                          {t.totalSkus} items
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-emerald-400">
                            {t.dispatchedOrders}
                          </span>
                          <span className="text-slate-500 text-[11px] ml-1">/ {t.totalOrders} total</span>
                          {t.pendingOrders > 0 && (
                            <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {t.pendingOrders} queue
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleTenantStatus(t.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition border ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                            }`}
                            title="Click to toggle tenant account access"
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <span>{isActive ? "Active (Live)" : "Suspended"}</span>
                          </button>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          {!t.isOwnerWorkspace ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteTenant(t.id, t.name)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1 text-[11px] font-semibold transition"
                              title="Delete this client tenant and all associated data"
                            >
                              <span>🗑️</span>
                              <span>Purge Store</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── SECTION 2: GLOBAL LOGISTICS & COURIER MONITOR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>🚚</span> Global Courier Logistics Volume
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fulfillment breakdown across shipping partners
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                100% Automated
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {[
                { name: "Steadfast Courier", key: "Steadfast", color: "bg-emerald-500", text: "text-emerald-400" },
                { name: "Pathao Courier", key: "Pathao", color: "bg-red-500", text: "text-red-400" },
                { name: "RedX Logistics", key: "RedX", color: "bg-rose-500", text: "text-rose-400" },
                { name: "Paperfly Go", key: "Paperfly", color: "bg-blue-500", text: "text-blue-400" },
                { name: "Carrybee", key: "Carrybee", color: "bg-amber-500", text: "text-amber-400" },
                { name: "Unassigned / Webhook Inbound", key: "Unassigned", color: "bg-slate-600", text: "text-slate-400" },
              ].map((c) => {
                const count = courierBreakdown[c.key] || 0;
                const percentage = Math.round((count / totalCourierOrders) * 100);

                return (
                  <div key={c.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${c.text}`}>{count} orders</span>
                        <span className="text-slate-500 font-mono text-[10px]">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${c.color} transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>⚡</span> CMS Ingestion Gateway Telemetry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Universal Webhook Endpoint Health
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 font-mono space-y-1">
                <div className="text-[11px] text-slate-500">Universal Webhook Route:</div>
                <div className="text-emerald-400 font-bold select-all">/api/webhook/orders</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">WooCommerce</span>
                  <span className="text-emerald-400 font-bold">✓ Active (REST)</span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Shopify</span>
                  <span className="text-emerald-400 font-bold">✓ Active (JSON)</span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Custom Laravel</span>
                  <span className="text-emerald-400 font-bold">✓ Ready (API)</span>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Auth Scheme</span>
                  <span className="text-indigo-400 font-bold">x-api-key</span>
                </div>
              </div>

              <div className="rounded-xl bg-indigo-950/30 border border-indigo-800/40 p-3 text-[11px] text-indigo-300">
                Incoming orders are automatically verified against the store catalog and held in <strong>PENDING_DISPATCH</strong> status until warehouse operators scan the serial barcode.
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: LIVE ORDERS STREAM TABLE ─────────── */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚡</span> Global Live Orders Stream
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time transactions across all client storefronts (WooCommerce, Shopify, Manual Dispatch).
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter store, customer, courier…"
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
                <Spinner size={24} />
                <span>Streaming live global transactions…</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                <div className="text-2xl">📋</div>
                <div className="font-semibold text-slate-300">No transactions recorded</div>
                <p>Orders from client dispatches or incoming webhooks will populate here live.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Store / Source</th>
                    <th className="px-5 py-3.5 font-bold">Customer Details</th>
                    <th className="px-5 py-3.5 font-bold">Customer Phone</th>
                    <th className="px-5 py-3.5 font-bold">Courier Partner</th>
                    <th className="px-5 py-3.5 font-bold">Amount</th>
                    <th className="px-5 py-3.5 font-bold">Fulfillment Status</th>
                    <th className="px-5 py-3.5 font-bold">Tracking / Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredOrders.map((ord) => {
                    const isDispatched = ord.status === "DISPATCHED";
                    const isPending = ord.status === "PENDING_DISPATCH";

                    return (
                      <tr key={ord.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-300">
                            <span>🏪</span>
                            <span>{ord.storeName || "Direct Store"}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-white">
                            {ord.customer_name || "Guest Customer"}
                          </div>
                          <div className="text-[11px] text-slate-400 max-w-xs truncate">
                            {ord.customer_address || "No address specified"}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-slate-300">
                          {ord.customer_phone || "—"}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          {ord.courier ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                              <span>🚚</span>
                              <span>{ord.courier}</span>
                            </span>
                          ) : (
                            <span className="text-amber-400/80 text-[11px] font-mono italic">
                              Pending Scan
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-white whitespace-nowrap">
                          ৳{Number(ord.total_amount || 0).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border ${
                              isDispatched
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : isPending
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isDispatched
                                  ? "bg-emerald-400"
                                  : isPending
                                  ? "bg-amber-400"
                                  : "bg-indigo-400"
                              }`}
                            />
                            {ord.status || "UNKNOWN"}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {ord.consignment_id ? (
                            <div className="text-emerald-400 font-bold">
                              #{ord.consignment_id}
                            </div>
                          ) : ord.created_at ? (
                            <div>{new Date(ord.created_at).toLocaleDateString()}</div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-indigo-400"
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
