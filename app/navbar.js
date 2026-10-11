"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

const ALL_LINKS = [
  { href: "/", label: "Dashboard", roles: ["viewer", "operator", "admin"] },
  { href: "/operations", label: "Operations", roles: ["operator", "admin"] },
  { href: "/bulk-orders", label: "Bulk Orders", roles: ["operator", "admin"] },
  { href: "/reports", label: "Reports", roles: ["viewer", "operator", "admin"] },
  { href: "/add-product", label: "+ Add Product", roles: ["admin"] },
  { href: "/settings", label: "⚙️ Team Settings", roles: ["admin"] },
];

const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  operator: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        // Get role
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("email", session.user.email)
          .single();

        setRole(data?.role || "viewer");
      }
      setLoading(false);
    }

    loadUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setRole("viewer");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setRole("viewer");
    router.push("/login");
    router.refresh();
  }

  // Don't show navbar on login page
  if (pathname === "/login") return null;

  const visibleLinks = ALL_LINKS.filter((l) => l.roles.includes(role));

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* left: logo + nav links */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-gray-900"
          >
            📦 <span className="hidden sm:inline">Dynamic</span> Inventory
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {visibleLinks.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* right: user info + logout */}
        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              {/* role badge */}
              <span
                className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  ROLE_COLORS[role] || ROLE_COLORS.viewer
                }`}
              >
                {role}
              </span>

              {/* email */}
              <span className="hidden lg:block text-sm text-gray-600 max-w-[180px] truncate">
                {user.email}
              </span>

              {/* logout */}
              <button
                onClick={handleLogout}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </>
          )}

          {!loading && !user && (
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Sign In
            </Link>
          )}

          {/* mobile menu */}
          <MobileMenu
            links={visibleLinks}
            pathname={pathname}
            user={user}
            role={role}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ links, pathname, user, role, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={20}
          height={20}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 border-b border-gray-200 bg-white shadow-lg p-4 space-y-2 z-50">
          {user && (
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-100">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  ROLE_COLORS[role] || ROLE_COLORS.viewer
                }`}
              >
                {role}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {user.email}
              </span>
            </div>
          )}

          {links.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          {user && (
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full mt-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
