import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantConfig,
  saveTenantConfig,
  saveTenantPayment,
} from "@/utils/storage/tenant-store";

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

    // 1. Resolve user's business
    let { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id, businesses(id, name)")
      .eq("id", user.id)
      .maybeSingle();

    if (!roleRow && user.email) {
      const { data: byEmail } = await adminClient
        .from("user_roles")
        .select("role, business_id, businesses(id, name)")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (byEmail) roleRow = byEmail;
    }

    const businessId = roleRow?.business_id;
    const businessName = roleRow?.businesses?.name || "My Store";

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "No business workspace associated." },
        { status: 400 }
      );
    }

    // 2. Fetch tenant config
    const config = getTenantConfig(businessId);

    // 3. Calculate real days remaining based on config.expires_at
    let daysRemaining = 15;
    let isExpired = false;
    if (config?.expires_at) {
      const diffMs = new Date(config.expires_at).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    // 4. Query current month and all-time orders
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: monthCount } = await adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", startOfMonth);

    const { count: allCount } = await adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    const { count: skuCount } = await adminClient
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    const planNormalized = (config?.plan || "growth").toLowerCase();
    const statusNormalized = config?.status || "Trial";

    let orderLimit = config?.order_limit || 1500;
    if (planNormalized === "starter") orderLimit = 300;
    else if (planNormalized === "growth") orderLimit = 1500;
    else if (planNormalized === "enterprise") orderLimit = 5000;

    let skuLimit = config?.sku_limit || 500;
    if (planNormalized === "starter") skuLimit = 100;
    else if (planNormalized === "growth") skuLimit = 500;
    else if (planNormalized === "enterprise") skuLimit = 99999;

    return NextResponse.json({
      success: true,
      businessId,
      businessName,
      userEmail: user.email,
      role: roleRow?.role || "owner",
      plan: planNormalized,
      status: statusNormalized,
      expiresAt: config?.expires_at || null,
      daysRemaining,
      isTrial: statusNormalized === "Trial" || statusNormalized.toLowerCase().includes("trial"),
      isExpired,
      orderLimit,
      skuLimit,
      currentMonthOrders: monthCount || 0,
      totalAllTimeOrders: allCount || 0,
      currentSkuCount: skuCount || 0,
      features: config?.features || {},
    });
  } catch (error) {
    console.error("GET /api/tenant/subscription error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load subscription." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/subscription
 * Submit manual bKash/Nagad/Bank subscription payment for Super Admin approval
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : request.cookies?.get?.("sb-access-token")?.value;
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

    const body = await request.json().catch(() => null);
    const { businessId, plan, amount, method, senderPhone, trxId, notes } = body || {};

    if (!businessId || !trxId || !senderPhone) {
      return NextResponse.json(
        { success: false, error: "Sender phone number and Transaction ID (TrxID) are required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: bizData } = await adminClient
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle();

    const paymentRec = saveTenantPayment({
      business_id: businessId,
      store_name: bizData?.name || "Store #" + businessId.slice(0, 6),
      owner_email: user.email,
      amount: Number(amount) || 1990,
      method: method || "bKash Personal",
      phone: senderPhone,
      trx_id: trxId.trim().toUpperCase(),
      plan: plan || "Growth Pro",
      status: "PENDING",
      notes: notes || "Submitted via merchant billing dashboard",
    });

    return NextResponse.json({
      success: true,
      message: "Payment submitted successfully. Super Admin will verify and activate your plan.",
      payment: paymentRec,
    });
  } catch (error) {
    console.error("POST /api/tenant/subscription error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit payment." },
      { status: 500 }
    );
  }
}
