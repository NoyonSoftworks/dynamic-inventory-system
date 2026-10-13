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

        const userEmail = (session.user.email || "").toLowerCase().trim();
        const isMasterAdmin = userEmail === ADMIN_EMAIL;

        // Fetch role + business info in a joined query by id
        let { data } = await supabase
          .from("user_roles")
          .select("role, business_id, businesses(name)")
          .eq("id", session.user.id)
          .maybeSingle();

        // 2. Fallback: If not found by user id, try by email (pre-registered invitations)
        if (!data && userEmail) {
          const { data: byEmail } = await supabase
            .from("user_roles")
            .select("role, business_id, businesses(name)")
            .eq("email", userEmail)
            .maybeSingle();
          if (byEmail) {
            data = byEmail;
            // Link their auth uid to this pre-created row so future lookups match by id
            await supabase
              .from("user_roles")
              .update({ id: session.user.id })
              .eq("email", userEmail);
          }
        }

        // 3. Self-healing auto-provisioning: If user has no workspace, provision one immediately!
        if (!data && !isMasterAdmin && session.user.id) {
          try {
            const storeName = userEmail ? `${userEmail.split("@")[0]}'s Store` : "My Business";
            const { data: newBiz, error: newBizErr } = await supabase
              .from("businesses")
              .insert({ name: storeName })
              .select("id, name")
              .single();

            if (!newBizErr && newBiz) {
              await supabase.from("user_roles").insert({
                id: session.user.id,
                email: userEmail,
                role: "admin",
                business_id: newBiz.id,
              });

              data = {
                role: "admin",
                business_id: newBiz.id,
                businesses: { name: newBiz.name },
              };
            }
          } catch (provisionErr) {
            console.warn("Self-provisioning tenant note:", provisionErr);
          }
        }

        if (!cancelled) {
          const resolvedRole = isMasterAdmin ? "admin" : (data?.role || "admin");
          const resolvedBusinessId = data?.business_id || (isMasterAdmin ? "00000000-0000-0000-0000-000000000001" : null);
          const resolvedBusinessName = data?.businesses?.name || (isMasterAdmin ? "Lavanza Command Center" : "My Business");

          setCtx({
            businessId: resolvedBusinessId,
            businessName: resolvedBusinessName,
            role: resolvedRole,
            userEmail: session.user.email,
            userId: session.user.id,
            loading: false,
          });
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
