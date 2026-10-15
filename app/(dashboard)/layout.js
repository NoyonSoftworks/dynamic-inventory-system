"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Navbar from "./navbar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

        const userEmail = (session.user.email || "").toLowerCase().trim();
        const adminEmail = (
          process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
        )
          .toLowerCase()
          .trim();

        if (userEmail === adminEmail) {
          if (isMounted) {
            router.replace("/admin");
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
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600/20 border border-orange-500/30">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white tracking-wide">
              Securing Workspace Session
            </h2>
            <p className="text-xs text-slate-400 font-mono">
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
    <div className="min-h-screen flex flex-col bg-[#0b1120] text-[#f8fafc] selection:bg-orange-500/30 selection:text-orange-200">
      <Suspense fallback={<div className="h-14 sm:h-16 bg-[#0b1120] border-b border-[#1e293b]" />}>
        <Navbar />
      </Suspense>
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
