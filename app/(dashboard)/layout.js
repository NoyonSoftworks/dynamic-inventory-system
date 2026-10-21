"use client";

import { useEffect, useState, createContext, useContext, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import Navbar from "./navbar";

export const SidebarContext = createContext({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

function RoleRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, loading: ctxLoading } = useBusinessContext();

  useEffect(() => {
    if (ctxLoading || !role) return;
    const r = (role || "").toLowerCase();
    const isStaff = r === "staff" || r === "operator";
    const isManager = r === "manager";

    if (isStaff) {
      // Packing & warehouse staff can ONLY access order dispatch, scanner, and operations
      const restrictedForStaff = [
        "/dashboard/expenses",
        "/dashboard/reports",
        "/dashboard/reconciliation",
        "/dashboard/billing",
        "/dashboard/ai-hub",
        "/dashboard/footprints",
      ];
      if (
        restrictedForStaff.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
        pathname === "/dashboard"
      ) {
        router.replace("/bulk-orders");
      }
    } else if (isManager) {
      // Managers cannot access store billing & plan settings
      if (pathname === "/dashboard/billing" || pathname.startsWith("/dashboard/billing/")) {
        router.replace("/dashboard");
      }
    }
  }, [pathname, role, ctxLoading, router]);

  return null;
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved === "true") setCollapsed(true);
    } catch {}
  }, []);

  function handleSetCollapsed(val) {
    setCollapsed((prev) => {
      const nextVal = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem("sidebar_collapsed", String(nextVal));
      } catch {}
      return nextVal;
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          if (isMounted) {
            setIsAuthenticated(false);
            setAuthChecking(false);
            const currentPath =
              typeof window !== "undefined"
                ? window.location.pathname
                : "/dashboard/products";
            router.replace(
              `/login?next=${encodeURIComponent(currentPath)}`
            );
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
          setAuthChecking(false);
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setAuthChecking(false);
          router.replace("/login");
        }
      }
    }

    verifySession();

    // Listen to live auth changes (e.g. token expiry or logout in another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && event === "SIGNED_OUT") {
        if (isMounted) {
          setIsAuthenticated(false);
          router.replace("/login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  // Loading state while verifying cryptographic session
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600/10 border border-orange-500/20 shadow-xs">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900 tracking-wide">
              Securing Workspace Session
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Verifying multi-tenant cryptographic access tokens…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, prevent flash of protected content while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed: handleSetCollapsed,
        mobileOpen,
        setMobileOpen,
      }}
    >
      <Suspense fallback={null}>
        <RoleRouteGuard />
      </Suspense>
      <div className="min-h-screen bg-[#F4F6F8] text-[#0f172a] selection:bg-orange-500 selection:text-white">
        <Suspense fallback={<div className="w-64 bg-white border-r border-slate-200 hidden lg:block fixed inset-y-0 left-0 z-40" />}>
          <Navbar />
        </Suspense>

        <div
          className={`transition-all duration-200 flex flex-col min-h-screen ${
            collapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
        >
          <main className="flex-1 w-full bg-[#F4F6F8]">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
