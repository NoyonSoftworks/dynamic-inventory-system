"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

// ── 6 Core Primary Navigation Tabs (Middle Section) ────────────
const CORE_NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: "📊", roles: ["viewer", "operator", "admin"] },
  { href: "/dashboard/scanner", label: "Scanner", icon: "📱", roles: ["operator", "admin"] },
  { href: "/dashboard/products", label: "Products", icon: "📦", roles: ["viewer", "operator", "admin"] },
  { href: "/operations", label: "Operations", icon: "⚡", roles: ["operator", "admin"] },
  { href: "/bulk-orders", label: "Orders", icon: "🚚", roles: ["operator", "admin"] },
  { href: "/reports", label: "Reports", icon: "📈", roles: ["viewer", "operator", "admin"] },
];

const ROLE_BADGES = {
  admin: "bg-purple-50 text-purple-700 border-purple-200/80 ring-1 ring-purple-500/10",
  operator: "bg-blue-50 text-blue-700 border-blue-200/80 ring-1 ring-blue-500/10",
  viewer: "bg-slate-100 text-slate-700 border-slate-200/80",
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

  // Logout handler
  async function handleLogout() {
    document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Never render client navbar on /login or /admin routes
  if (
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return null;
  }

  const isPlatformOwner =
    (userEmail || "").toLowerCase().trim() === ADMIN_EMAIL;

  const visibleCoreLinks = CORE_NAV_LINKS.filter((item) =>
    item.roles.includes(role || "viewer")
  );

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 font-sans transition-all">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-3">
          {/* ── 1. LEFT: Brand & Workspace Monogram ───────────── */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 group focus:outline-none"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-base sm:text-lg shadow-sm group-hover:bg-indigo-600 transition-colors">
                📦
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {businessName || "Lavanza"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Inventory SaaS
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-block text-slate-300 font-light text-sm select-none">
              /
            </span>
          </div>

          {/* ── 2. MIDDLE: Core Navigation (6 Primary Tabs, No Clipping) ── */}
          <div className="flex-1 min-w-0 px-1 sm:px-4 flex items-center justify-start md:justify-center">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar py-1 w-full md:w-auto">
              {visibleCoreLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href ||
                      (link.href !== "/" && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-row items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                      isActive
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

          {/* ── 3. RIGHT: Actions, Utilities & Profile Dropdown ─── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Action: + Add Product (Admin Only) */}
            {role === "admin" && (
              <Link
                href="/dashboard/products/add"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition shrink-0"
                title="Add New Product Intake"
              >
                <span>➕</span>
                <span>Add Product</span>
              </Link>
            )}

            {/* Direct Settings Shortcut on Wide Screens */}
            {role === "admin" && (
              <Link
                href="/dashboard/settings?tab=couriers"
                className={`hidden lg:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  pathname.startsWith("/dashboard/settings") || pathname.startsWith("/settings")
                    ? "bg-slate-100 text-slate-900 border-slate-200"
                    : "border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
                title="Courier & CMS Webhook Integrations"
              >
                <span>⚡</span>
                <span>API &amp; Couriers</span>
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
                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider border shrink-0 ${
                      ROLE_BADGES[role] || ROLE_BADGES.viewer
                    }`}
                  >
                    {role || "user"}
                  </span>

                  {/* Initial Avatar Circle */}
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                    {(userEmail[0] || "U").toUpperCase()}
                  </div>

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
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-medium text-slate-500">
                          🏢 {businessName || "Lavanza"}
                        </span>
                      </div>
                    </div>

                    {/* Menu Navigation Links */}
                    <div className="py-1.5 space-y-0.5 text-xs">
                      {role === "admin" && (
                        <>
                          <Link
                            href="/dashboard/settings?tab=couriers"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition"
                          >
                            <span>⚡</span>
                            <span>Courier API &amp; Webhooks</span>
                          </Link>

                          <Link
                            href="/dashboard/settings?tab=team"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition"
                          >
                            <span>⚙️</span>
                            <span>Team &amp; Store Settings</span>
                          </Link>
                        </>
                      )}

                      {isPlatformOwner && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-semibold transition"
                        >
                          <span>🛡️</span>
                          <span>Super Admin Console</span>
                        </Link>
                      )}
                    </div>

                    {/* Logout Option */}
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

      {/* ── Mobile Drawer (Secondary utilities & profile on mobile) ──── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {userEmail && (
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-600 truncate max-w-[200px]">
                {userEmail}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                  ROLE_BADGES[role] || ROLE_BADGES.viewer
                }`}
              >
                {role}
              </span>
            </div>
          )}

          {/* Core Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-2 pt-1">
              Main Menu
            </span>
            {visibleCoreLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
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

          {/* Action: Add Product on Mobile */}
          {role === "admin" && (
            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/dashboard/products/add"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <span>➕</span>
                <span>Add Product Intake</span>
              </Link>
            </div>
          )}

          {/* Secondary Utilities on Mobile */}
          {role === "admin" && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-2">
                Settings &amp; Integrations
              </span>
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
              {isPlatformOwner && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition"
                >
                  <span>🛡️</span>
                  <span>Super Admin Console</span>
                </Link>
              )}
            </div>
          )}

          {/* Logout on Mobile Drawer */}
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
