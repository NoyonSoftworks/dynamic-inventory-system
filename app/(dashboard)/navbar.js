"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

// ── 6 Core Primary Navigation Tabs ─────────────────────────────
const CORE_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", roles: ["viewer", "operator", "admin"] },
  { href: "/dashboard/products", label: "Catalog", icon: "📦", roles: ["viewer", "operator", "admin"] },
  { href: "/dashboard/scanner", label: "Scanner", icon: "📱", roles: ["operator", "admin"] },
  { href: "/operations", label: "Operations", icon: "⚡", roles: ["operator", "admin"] },
  { href: "/bulk-orders", label: "Orders", icon: "🚚", roles: ["operator", "admin"] },
  { href: "/reports", label: "Analytics", icon: "📈", roles: ["viewer", "operator", "admin"] },
  { href: "/dashboard/footprints", label: "Audit Trail", icon: "🛡️", roles: ["admin"] },
];

const ROLE_BADGE_STYLES = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  operator: "bg-blue-50 text-blue-700 border-blue-200",
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

  // Workspace admin authorization check within tenant context
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white text-base shadow-sm group-hover:bg-indigo-600 transition-colors">
                📦
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[130px] sm:max-w-[200px]">
                  {workspaceDisplayName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  {appBrandName}
                </span>
              </div>
            </Link>
          </div>

          {/* ── 2. MIDDLE: Core Tenant Navigation (Clean Scrollable Tabs) ── */}
          <div className="flex-1 min-w-0 flex items-center justify-center px-1 sm:px-4">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
              {visibleCoreLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                      active
                        ? "bg-slate-100 text-slate-900 font-semibold border border-slate-200/90 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <span className="text-sm shrink-0">{link.icon}</span>
                    <span className="shrink-0">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── 3. RIGHT: Workspace Settings & User Profile ──────── */}
          {/* Note: Super Admin controls are completely excluded from tenant UI */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Settings Icon (Workspace Admins only) */}
            {isWorkspaceAdmin && (
              <Link
                href="/dashboard/settings"
                className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
                title="Store & Integration Settings"
              >
                <span className="text-base">⚙️</span>
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
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
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
                      <div className="text-[11px] text-slate-500 truncate pt-0.5">
                        🏢 {workspaceDisplayName}
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
                            <span>➕</span>
                            <span>Add Product Intake</span>
                          </Link>

                          <Link
                            href="/dashboard/settings?tab=couriers"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <span>⚡</span>
                            <span>Courier API &amp; Webhooks</span>
                          </Link>

                          <Link
                            href="/dashboard/settings?tab=team"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <span>⚙️</span>
                            <span>Team &amp; Store Settings</span>
                          </Link>

                          <Link
                            href="/dashboard/billing"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <span>💎</span>
                            <span>Billing &amp; Subscription</span>
                          </Link>

                          <Link
                            href="/dashboard/footprints"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <span>🛡️</span>
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
                        <span>🚪</span>
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
                className="inline-flex items-center rounded-lg bg-slate-900 hover:bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition shrink-0"
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
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                  🏢 {workspaceDisplayName}
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
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    active
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Actions & Settings on Mobile (Workspace Admin) */}
          {isWorkspaceAdmin && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-2">
                Actions &amp; Settings
              </span>
              <Link
                href="/dashboard/products/add"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
              >
                <span>➕</span>
                <span>Add Product Intake</span>
              </Link>
              <Link
                href="/dashboard/settings?tab=couriers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <span>⚡</span>
                <span>Courier API &amp; Webhooks</span>
              </Link>
              <Link
                href="/dashboard/settings?tab=team"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <span>⚙️</span>
                <span>Team &amp; Store Settings</span>
              </Link>
              <Link
                href="/dashboard/billing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <span>💎</span>
                <span>Billing &amp; Subscription</span>
              </Link>
            </div>
          )}

          {/* Sign Out on Mobile Drawer */}
          {userEmail && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
