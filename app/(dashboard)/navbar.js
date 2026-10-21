"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import { useSidebar } from "./layout";

// ── Categorized Navigation Groups ──────────────────────────────
const NAV_GROUPS = [
  {
    group: "OVERVIEW",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "COMMERCE & ORDERS",
    items: [
      {
        href: "/bulk-orders",
        label: "Orders & Dispatch",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        ),
      },
      {
        href: "/dashboard/products",
        label: "Products",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
      {
        href: "/dashboard/products/import",
        label: "Import Catalog",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        ),
      },
      {
        href: "/bulk-orders",
        label: "Invoice & Label",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "WAREHOUSE & STOCK",
    items: [
      {
        href: "/operations",
        label: "Inventory Operations",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      },
      {
        href: "/dashboard/scanner",
        label: "Barcode Scanner",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/ai-hub",
        label: "Reorder & POs",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "FINANCE & REPORTS",
    items: [
      {
        href: "/dashboard/reconciliation",
        label: "Courier Reconciliation",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/expenses",
        label: "Daily Expenses",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/reports",
        label: "Reports & Profit",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      },
      {
        href: "/dashboard/footprints",
        label: "Activity Logs",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/billing",
        label: "Billing & Plan",
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
    ],
  },
];

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
).toLowerCase().trim();

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, userEmail, businessName, loading } = useBusinessContext();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const isSuperAdmin = (userEmail || "").toLowerCase().trim() === ADMIN_EMAIL;

  // Sign out handler
  async function handleLogout() {
    try {
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
    } catch (err) {
      console.warn("Sign out note:", err);
    } finally {
      window.location.href = "/login";
    }
  }

  // Never render client navbar on standalone auth/admin routes
  if (
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return null;
  }

  const appBrandName = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory";
  const workspaceDisplayName =
    businessName && businessName.toLowerCase() !== "lavanza"
      ? businessName
      : "My Workspace";

  const isLinkActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const userInitial = (userEmail?.[0] || "N").toUpperCase();
  const userName = userEmail ? userEmail.split("@")[0] : "Merchant";
  const userRole = isSuperAdmin ? "Super Admin" : (role === "admin" ? "Store Owner" : "Operator");

  return (
    <>
      {/* ── 1. DESKTOP FIXED CATEGORIZED LEFT SIDEBAR (lg:flex) ───────── */}
      <aside
        className={`hidden lg:flex flex-col justify-between fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/80 transition-all duration-200 font-sans ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top Brand Header */}
        <div className="h-16 border-b border-slate-200/80 px-4 flex items-center justify-between gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0 group focus:outline-none"
            title={`${workspaceDisplayName} · ${appBrandName}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EA580C] text-white shadow-xs group-hover:bg-[#D94E07] transition-all shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-semibold text-sm tracking-tight text-slate-900 group-hover:text-[#EA580C] transition-colors truncate">
                  {workspaceDisplayName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {appBrandName}
                </span>
              </div>
            )}
          </Link>

          {/* Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar collapse"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
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
          {NAV_GROUPS.map((grp) => (
            <div key={grp.group} className="space-y-1">
              {!collapsed ? (
                <div className="text-[11px] font-semibold tracking-wider text-slate-400 px-3 mb-1.5 uppercase font-mono">
                  {grp.group}
                </div>
              ) : (
                <div className="h-2" />
              )}

              {grp.items.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      collapsed ? "justify-center px-2" : "justify-between"
                    } ${
                      active
                        ? "bg-blue-50/80 text-blue-600 font-medium"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && active && (
                      <span className="text-blue-600 text-xs font-bold shrink-0">›</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Super Admin Console Link (if authorized) */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              {!collapsed && (
                <div className="text-[11px] font-semibold tracking-wider text-slate-400 px-3 mb-1.5 uppercase font-mono">
                  PLATFORM
                </div>
              )}
              <Link
                href="/admin"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition ${
                  collapsed ? "justify-center px-2" : ""
                }`}
                title="Super Admin Control Plane"
              >
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!collapsed && <span className="truncate">Super Admin</span>}
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-white shrink-0 space-y-3">
          {/* Quick Scanner Shortcut Card (Desktop only when expanded) */}
          {!collapsed && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#EA580C] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">Mobile Scanner</div>
                  <div className="text-[10px] text-slate-400 truncate">In-browser barcode gun</div>
                </div>
              </div>
              <Link
                href="/dashboard/scanner"
                className="mt-2 block w-full py-1 text-center text-[11px] font-medium text-[#EA580C] hover:bg-orange-50 rounded-md transition"
              >
                Launch camera scan →
              </Link>
            </div>
          )}

          {/* User Profile Row */}
          <div className="flex items-center gap-2.5 px-1 py-1 min-w-0">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-xs">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate" title={userEmail}>
                  {userName}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {userRole}
                </div>
              </div>
            )}
          </div>

          {/* Full-width Outlined Rose Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full h-9 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] font-medium flex items-center justify-center gap-2 transition cursor-pointer ${
              collapsed ? "px-1" : "px-3"
            }`}
            title="Sign out of workspace"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── 2. MOBILE TOP BAR (lg:hidden) ────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EA580C] text-white">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-900 truncate">
            {workspaceDisplayName}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-[11px]">
            {userInitial}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Open mobile menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── 3. MOBILE SIDEBAR DRAWER (lg:hidden) ─────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-over Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="h-14 border-b border-slate-200/80 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EA580C] text-white">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="font-semibold text-sm tracking-tight text-slate-900 truncate">
                  {workspaceDisplayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
              {NAV_GROUPS.map((grp) => (
                <div key={grp.group} className="space-y-1">
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 px-3 mb-1.5 uppercase font-mono">
                    {grp.group}
                  </div>
                  {grp.items.map((item) => {
                    const active = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          active
                            ? "bg-blue-50/80 text-blue-600 font-medium"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={active ? "text-blue-600" : "text-slate-400"}>
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {active && <span className="text-blue-600 text-xs font-bold">›</span>}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {isSuperAdmin && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 px-3 mb-1.5 uppercase font-mono">
                    PLATFORM
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-slate-900 text-white"
                  >
                    <span className="truncate">Super Admin Control</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom Footer */}
            <div className="p-3 border-t border-slate-200/80 bg-white space-y-3">
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {userName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {userRole}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="w-full h-9 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[13px] font-medium flex items-center justify-center gap-2 transition"
              >
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
