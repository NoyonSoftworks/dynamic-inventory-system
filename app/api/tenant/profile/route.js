import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getTenantConfig, saveTenantConfig } from "@/utils/storage/tenant-store";

/**
 * GET /api/tenant/profile
 * Retrieves full merchant store profile, website, phone, and division settings.
 */
export async function GET(request) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

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
        if (fbData?.user) user = fbData.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    let { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id, businesses(id, name, created_at)")
      .eq("id", user.id)
      .maybeSingle();

    if (!roleRow && user.email) {
      const { data: byEmail } = await adminClient
        .from("user_roles")
        .select("role, business_id, businesses(id, name, created_at)")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (byEmail) roleRow = byEmail;
    }

    const businessId = roleRow?.business_id;
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "No business workspace associated with this user." },
        { status: 400 }
      );
    }

    const conf = getTenantConfig(businessId) || {};
    const businessName = roleRow?.businesses?.name || conf.name || "My Store";

    return NextResponse.json({
      success: true,
      businessId,
      name: businessName,
      website_url: conf.website_url || "",
      phone: conf.phone || "",
      division: conf.division || "Dhaka",
      address: conf.address || "",
      currency: conf.currency || "BDT",
      tagline: conf.tagline || "",
      status: conf.status || "Trial",
      plan: conf.plan || "trial",
      created_at: roleRow?.businesses?.created_at || conf.created_at,
      config: conf,
    });
  } catch (error) {
    console.error("GET /api/tenant/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load store profile." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/profile
 * Updates merchant store name, official website URL, contact info, and warehouse location.
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

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
        if (fbData?.user) user = fbData.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    let { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!roleRow && user.email) {
      const { data: byEmail } = await adminClient
        .from("user_roles")
        .select("role, business_id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (byEmail) roleRow = byEmail;
    }

    const businessId = roleRow?.business_id;
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "No business workspace associated." },
        { status: 400 }
      );
    }

    const userRole = (roleRow?.role || "admin").toLowerCase();
    if (userRole === "viewer") {
      return NextResponse.json(
        { success: false, error: "Permission Denied: Viewers cannot modify store settings." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const { name, website_url, phone, division, address, currency, tagline } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Store / Business name cannot be empty." },
        { status: 400 }
      );
    }

    const cleanName = name.trim().slice(0, 100);
    let cleanWebsite = String(website_url || "").trim();
    if (cleanWebsite && !cleanWebsite.startsWith("http://") && !cleanWebsite.startsWith("https://")) {
      cleanWebsite = `https://${cleanWebsite}`;
    }

    // 1. Update name in Supabase businesses table
    const { error: bizErr } = await adminClient
      .from("businesses")
      .update({ name: cleanName })
      .eq("id", businessId);

    if (bizErr) {
      console.warn("Supabase business name update notice:", bizErr.message);
    }

    // 2. Update tenant configuration store
    const updatedConf = saveTenantConfig(businessId, {
      name: cleanName,
      website_url: cleanWebsite,
      phone: String(phone || "").trim(),
      division: String(division || "Dhaka").trim(),
      address: String(address || "").trim(),
      currency: String(currency || "BDT").trim().toUpperCase(),
      tagline: String(tagline || "").trim().slice(0, 200),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Store profile & website details updated successfully!",
      profile: {
        name: cleanName,
        website_url: cleanWebsite,
        phone: updatedConf.phone,
        division: updatedConf.division,
        address: updatedConf.address,
        currency: updatedConf.currency,
        tagline: updatedConf.tagline,
      },
    });
  } catch (error) {
    console.error("POST /api/tenant/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update store profile." },
      { status: 500 }
    );
  }
}
