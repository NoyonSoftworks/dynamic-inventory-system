import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getTenantConfig } from "@/utils/storage/tenant-store";

/**
 * GET/POST /api/auth/business-context
 * High-speed, RLS-resilient business workspace context resolver.
 * 
 * Bypasses client-side RLS recursion (Postgres error 42P17) by utilizing
 * server-side admin client after cryptographically validating the session.
 */
export async function GET(request) {
  return handleBusinessContext(request);
}

export async function POST(request) {
  return handleBusinessContext(request);
}

async function handleBusinessContext(request) {
  try {
    // 1. Verify caller session
    const supabase = await createClient();
    let {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    // Fallback: Check Authorization Bearer header or auth cookies
    if (!user) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;
      const cookieToken =
        request.cookies?.get?.("sb-access-token")?.value ||
        request.cookies?.get?.("supabase-auth-token")?.value;
      const token = bearerToken || cookieToken;

      if (token) {
        const { data: fbData } = await supabase.auth.getUser(token);
        if (fbData?.user) {
          user = fbData.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "No active session found.",
        },
        { status: 401 }
      );
    }

    const adminEmail = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
    )
      .toLowerCase()
      .trim();
    const userEmail = (user.email || "").toLowerCase().trim();
    const isSuperAdmin = userEmail === adminEmail;

    const adminClient = createAdminClient();

    // 2. Fetch role and business context via service role (bypasses RLS)
    let { data: roleRow, error: roleErr } = await adminClient
      .from("user_roles")
      .select("id, role, business_id, businesses(id, name)")
      .eq("id", user.id)
      .maybeSingle();

    // Fallback: query by email if row id hasn't been linked yet
    if (!roleRow && userEmail) {
      const { data: byEmail } = await adminClient
        .from("user_roles")
        .select("id, role, business_id, businesses(id, name)")
        .eq("email", userEmail)
        .maybeSingle();

      if (byEmail) {
        roleRow = byEmail;
        // Bind auth user id
        await adminClient
          .from("user_roles")
          .update({ id: user.id })
          .eq("email", userEmail);
      }
    }

    let businessId = roleRow?.business_id || null;
    let businessName = roleRow?.businesses?.name || null;
    let resolvedRole = roleRow?.role || "admin";

    // 3. Auto-provision dedicated tenant store if null (Strict Multi-Tenant Isolation)
    if (!businessId) {
      const storeName = isSuperAdmin
        ? "Noyon Hossain Enterprise"
        : userEmail
        ? `${userEmail.split("@")[0]}'s Store`
        : "My Workspace";

      const { data: newBiz, error: newBizErr } = await adminClient
        .from("businesses")
        .insert({ name: storeName })
        .select("id, name")
        .single();

      if (!newBizErr && newBiz) {
        businessId = newBiz.id;
        businessName = newBiz.name;

        await adminClient.from("user_roles").upsert({
          id: user.id,
          email: userEmail,
          role: "admin",
          business_id: newBiz.id,
        });
      }
    }

    // Clean display name
    const finalBusinessName =
      businessName && businessName.toLowerCase() !== "lavanza"
        ? businessName
        : "My Workspace";

    const tenantConfig = businessId ? getTenantConfig(businessId) : null;

    return NextResponse.json({
      success: true,
      businessId,
      businessName: finalBusinessName,
      role: resolvedRole,
      userEmail: user.email,
      userId: user.id,
      tenantConfig,
    });
  } catch (error) {
    console.error("API /api/auth/business-context exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to resolve business context.",
      },
      { status: 500 }
    );
  }
}
