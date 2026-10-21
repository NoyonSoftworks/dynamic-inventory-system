"use client";

import { useState, useEffect } from "react";
import { supabase } from "./client";

/**
 * Hook to fetch the current user's multi-tenant context.
 * Returns { businessId, businessName, role, userEmail, userId, loading }.
 *
 * Calls /api/auth/business-context first to guarantee resolution without
 * hitting client-side Postgres RLS recursion (error 42P17).
 */
const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

export function useBusinessContext() {
  const [ctx, setCtx] = useState({
    businessId: null,
    businessName: "",
    role: "viewer",
    userEmail: "",
    userId: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (!cancelled) setCtx((prev) => ({ ...prev, loading: false }));
          return;
        }

        // 1. Primary: Server-side resilient resolution (bypasses RLS recursion)
        try {
          const res = await fetch("/api/auth/business-context", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          if (res.ok) {
            const apiData = await res.json();
            if (apiData?.success && apiData.businessId) {
              if (!cancelled) {
                setCtx({
                  businessId: apiData.businessId,
                  businessName: apiData.businessName || "My Workspace",
                  role: apiData.role || "admin",
                  userEmail: apiData.userEmail || session.user.email,
                  userId: apiData.userId || session.user.id,
                  tenantConfig: apiData.tenantConfig || null,
                  loading: false,
                });
              }
              return;
            }
          }
        } catch (apiErr) {
          console.warn("API business-context fetch fallback:", apiErr);
        }

        // 2. Direct client fallback if API is unreachable
        const userEmail = (session.user.email || "").toLowerCase().trim();
        const isMasterAdmin = userEmail === ADMIN_EMAIL;

        let { data } = await supabase
          .from("user_roles")
          .select("role, business_id, businesses(name)")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!data && userEmail) {
          const { data: byEmail } = await supabase
            .from("user_roles")
            .select("role, business_id, businesses(name)")
            .eq("email", userEmail)
            .maybeSingle();
          if (byEmail) {
            data = byEmail;
          }
        }

        if (!cancelled) {
          const resolvedRole = data?.role || "admin";
          const rawBizName = data?.businesses?.name;
          const cleanBizName =
            rawBizName && rawBizName.toLowerCase() !== "lavanza"
              ? rawBizName
              : "My Workspace";

          setCtx({
            businessId: data?.business_id || null,
            businessName: cleanBizName,
            role: resolvedRole,
            userEmail: session.user.email,
            userId: session.user.id,
            loading: false,
          });
        }
      } catch (err) {
        console.error("useBusinessContext error:", err);
        if (!cancelled) setCtx((prev) => ({ ...prev, loading: false }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return ctx;
}
