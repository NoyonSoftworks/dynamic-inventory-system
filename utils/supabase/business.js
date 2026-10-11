"use client";

import { useState, useEffect } from "react";
import { supabase } from "./client";

/**
 * Hook to fetch the current user's multi-tenant context.
 * Returns { businessId, businessName, role, userEmail, userId, loading }.
 *
 * Every page that inserts data must include `business_id: businessId` in the row.
 * SELECT queries are automatically filtered by RLS, but inserts need it explicitly.
 */
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

        // Fetch role + business info in a single joined query
        const { data, error } = await supabase
          .from("user_roles")
          .select("role, business_id, businesses(name)")
          .eq("id", session.user.id)
          .single();

        if (!cancelled) {
          if (error || !data) {
            setCtx((prev) => ({
              ...prev,
              userEmail: session.user.email,
              userId: session.user.id,
              loading: false,
            }));
          } else {
            setCtx({
              businessId: data.business_id,
              businessName: data.businesses?.name || "My Business",
              role: data.role || "viewer",
              userEmail: session.user.email,
              userId: session.user.id,
              loading: false,
            });
          }
        }
      } catch {
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
