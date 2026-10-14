"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── 7 Core Primary Navigation Tabs with SVG Icons ─────────────
const CORE_NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["viewer", "operator", "admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/products",
    label: "Catalog",
    roles: ["viewer", "operator", "admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/scanner",
    label: "Scanner",
    roles: ["operator", "admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    href: "/operations",
    label: "Operations",
    roles: ["operator", "admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    href: "/bulk-orders",
    label: "Orders",
    roles: ["operator", "admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Analytics",
    roles: ["viewer", "operator", "admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/footprints",
    label: "Audit Trail",
    roles: ["admin"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const ROLE_BADGE_STYLES = {
  admin: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  operator: "bg-teal-50 text-teal-700 border-teal-200/80",
  viewer: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, userEmail, businessName, loading } = useBusinessContext();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Secure sign out handler
  async function handleLogout() {
    try {
      document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
      document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out note:", err);
    } finally {
      router.replace("/login");
    }
  }

  // Never render client navbar on /login or standalone /admin routes
  if (
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return null;
  }

  const isWorkspaceAdmin = role === "admin";
  const appBrandName = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory";
  const workspaceDisplayName =
    businessName && businessName.toLowerCase() !== "lavanza"
      ? businessName
      : "My Workspace";

  const visibleCoreLinks = CORE_NAV_LINKS.filter((item) =>
    item.roles.includes(role || "viewer")
  );

  const isLinkActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentRoleStyle = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.viewer;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 font-sans shadow-2xs">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-2 sm:gap-4">
          {/* ── 1. LEFT: Brand & Workspace Identity ───────────── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/dashboard/products"
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-xs shadow-indigo-600/30 group-hover:scale-105 transition-all">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[130px] sm:max-w-[200px]">
                  {workspaceDisplayName}
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold tracking-wide uppercase">
                  {appBrandName}
                </span>
              </div>
            </Link>
          </div>

          {/* ── 2. MIDDLE: Core Tenant Navigation ── */}
          <div className="flex-1 min-w-0 flex items-center justify-center px-1 sm:px-4">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
              {visibleCoreLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                      active
                        ? "bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/30"
                        : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 border border-transparent"
                    }`}
                  >
                    <span className={active ? "text-white" : "text-slate-500"}>
                      {link.icon}
                    </span>
                    <span className="shrink-0">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── 3. RIGHT: Workspace Settings & User Profile ──────── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Settings Icon */}
            {isWorkspaceAdmin && (
              <Link
                href="/dashboard/settings"
                className="hidden sm:inline-flex p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/70 transition shrink-0"
                title="Store & Integration Settings"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}

            {/* User Profile Avatar Dropdown */}
            {!loading && userEmail && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-1 sm:px-2.5 sm:py-1.5 shadow-2xs transition focus:outline-none"
                  aria-expanded={profileOpen}
                >
                  <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                    {(userEmail[0] || "U").toUpperCase()}
                  </div>

                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${currentRoleStyle}`}
                  >
                    {role || "Admin"}
                  </span>

                  <span className="text-slate-400 text-xs hidden sm:inline-block">
                    ▾
                  </span>
                </button>

                {/* Dropdown Menu Panel */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Identity Details */}
                    <div className="p-3 border-b border-slate-100 space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Signed in as
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate" title={userEmail}>
                        {userEmail}
                      </div>
                      <div className="text-[11px] text-indigo-600 font-medium truncate pt-0.5 flex items-center gap-1">
                        <span>Workspace:</span>
                        <span className="font-bold">{workspaceDisplayName}</span>
                      </div>
                    </div>

                    {/* Pure Tenant Navigation Items */}
                    <div className="py-1.5 space-y-0.5 text-xs font-medium">
                      {isWorkspaceAdmin && (
                        <>
                          <Link
                            href="/dashboard/products/add"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-indigo-600 hover:bg-indigo-50 font-semibold transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Product Intake</span>
                          </Link>

                          <Link
                            href="/dashboard/settings?tab=couriers"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Courier API &amp; Webhooks</span>
                          </Link>

                          <Link
                            href="/dashboard/settings?tab=team"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span>Team &amp; Store Settings</span>
                          </Link>

                          <Link
                            href="/dashboard/billing"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span>Billing &amp; Subscription</span>
                          </Link>

                          <Link
                            href="/dashboard/footprints"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Audit Trail</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out Option */}
                    <div className="pt-1.5 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loading && !userEmail && (
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition shrink-0"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Navigation Drawer Toggle */}
            <div className="lg:hidden flex items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                aria-label="Toggle Navigation Menu"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {userEmail && (
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-slate-700 truncate max-w-[200px]">
                  {userEmail}
                </span>
                <span className="text-[10px] text-indigo-600 font-medium truncate max-w-[200px]">
                  Workspace: {workspaceDisplayName}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${currentRoleStyle}`}
              >
                {role || "Admin"}
              </span>
            </div>
          )}

          {/* Core Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-2 pt-1">
              Main Menu
            </span>
            {visibleCoreLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    active
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={active ? "text-white" : "text-slate-500"}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Admin Quick Shortcuts */}
          {isWorkspaceAdmin && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-2">
                Administration
              </span>
              <Link
                href="/dashboard/products/add"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                <span>+</span> Add Product Intake
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Settings &amp; Couriers
              </Link>
              <Link
                href="/dashboard/billing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Billing &amp; Subscription
              </Link>
            </div>
          )}

          {/* Mobile Logout */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
