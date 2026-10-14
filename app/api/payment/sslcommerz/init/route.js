import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { logActivity } from "@/utils/logger";

/**
 * POST /api/payment/sslcommerz/init
 * Initializes an SSLCommerz payment session for SaaS subscription upgrade.
 */
export async function POST(request) {
  try {
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Authenticate caller using session cookies
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to initiate checkout." },
        { status: 401 }
      );
    }

    // Parse requested body (businessId, optional currency override)
    const body = await request.json().catch(() => ({}));
    let businessId = body.businessId;

    const adminClient = createAdminClient();

    // If businessId not supplied, resolve from user_roles
    if (!businessId) {
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("business_id")
        .eq("id", user.id)
        .maybeSingle();

      businessId = roleRow?.business_id;
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "No workspace found linked to your account." },
        { status: 400 }
      );
    }

    // 2. Fetch SaaS settings dynamically from saas_settings table
    const { data: settingsRow } = await adminClient
      .from("saas_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const storeId =
      settingsRow?.sslcommerz_store_id ||
      process.env.SSLCOMMERZ_STORE_ID ||
      "";
    const storePasswd =
      settingsRow?.sslcommerz_store_passwd ||
      process.env.SSLCOMMERZ_STORE_PASSWORD ||
      "";
    const isLive = Boolean(
      settingsRow?.sslcommerz_is_live ??
      (process.env.SSLCOMMERZ_IS_LIVE === "true")
    );

    if (!storeId || !storePasswd) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SSLCommerz credentials are not configured. Please contact the platform Super Admin.",
        },
        { status: 503 }
      );
    }

    // Pricing calculation
    const proPlanUsd = Number(settingsRow?.pro_plan_price) || 49.0;
    const exchangeRate = Number(settingsRow?.bdt_exchange_rate) || 122.0;
    const totalAmount = (proPlanUsd * exchangeRate).toFixed(2); // In BDT

    // 3. Generate unique transaction identifier
    const tranId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Callback URLs
    const successUrl = `${origin}/api/payment/sslcommerz/success`;
    const failUrl = `${origin}/api/payment/sslcommerz/fail`;
    const cancelUrl = `${origin}/api/payment/sslcommerz/cancel`;
    const ipnUrl = `${origin}/api/payment/sslcommerz/ipn`;

    // Customer info from auth metadata
    const customerName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "SaaS Merchant";
    const customerEmail = user.email || "merchant@smartinventory.io";

    // 4. Build SSLCommerz session request payload
    const sslczParams = new URLSearchParams();
    sslczParams.append("store_id", storeId);
    sslczParams.append("store_passwd", storePasswd);
    sslczParams.append("total_amount", totalAmount);
    sslczParams.append("currency", "BDT");
    sslczParams.append("tran_id", tranId);
    sslczParams.append("success_url", successUrl);
    sslczParams.append("fail_url", failUrl);
    sslczParams.append("cancel_url", cancelUrl);
    sslczParams.append("ipn_url", ipnUrl);
    sslczParams.append("shipping_method", "NO");
    sslczParams.append("product_name", "SmartInventory SaaS Pro Subscription");
    sslczParams.append("product_category", "SaaS");
    sslczParams.append("product_profile", "non-physical-goods");
    sslczParams.append("cus_name", customerName);
    sslczParams.append("cus_email", customerEmail);
    sslczParams.append("cus_add1", "Dhaka");
    sslczParams.append("cus_city", "Dhaka");
    sslczParams.append("cus_country", "Bangladesh");
    sslczParams.append("cus_phone", "01700000000");

    // Multi-tenant tracking parameters passed safely through gateway
    sslczParams.append("value_a", businessId);
    sslczParams.append("value_b", user.id);
    sslczParams.append("value_c", customerEmail);
    sslczParams.append("value_d", "PRO_PLAN");

    // 5. Select API endpoint based on environment mode
    const sslczSessionEndpoint = isLive
      ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
      : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";

    const sslczRes = await fetch(sslczSessionEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: sslczParams.toString(),
    });

    if (!sslczRes.ok) {
      throw new Error(`SSLCommerz server returned HTTP ${sslczRes.status}`);
    }

    const sslczData = await sslczRes.json();

    if (sslczData.status !== "SUCCESS" || !sslczData.GatewayPageURL) {
      console.error("SSLCommerz session creation rejected:", sslczData);
      return NextResponse.json(
        {
          success: false,
          error:
            sslczData.failedreason ||
            "SSLCommerz gateway session rejected. Please check store credentials.",
        },
        { status: 400 }
      );
    }

    // 6. Record transaction attempt in payment_transactions (if table exists)
    try {
      await adminClient.from("payment_transactions").insert({
        tran_id: tranId,
        business_id: businessId,
        user_id: user.id,
        amount: parseFloat(totalAmount),
        currency: "BDT",
        gateway: "SSLCOMMERZ",
        status: "PENDING",
        payload: {
          sessionkey: sslczData.sessionkey,
          proPlanUsd,
          isLive,
        },
      });
    } catch (dbErr) {
      // Non-fatal if table not created yet
    }

    // 7. Log Footprint via logActivity utility
    await logActivity({
      businessId,
      userId: user.id,
      userEmail: user.email,
      actionType: "PAYMENT_INIT",
      description: `Initiated SSLCommerz checkout for Pro Enterprise (৳${totalAmount}). TranID: ${tranId}`,
      metadata: {
        tranId,
        amount: totalAmount,
        currency: "BDT",
        gateway: "SSLCOMMERZ",
        isLive,
      },
      req: request,
    });

    // 8. Return gateway redirect URL
    return NextResponse.json({
      success: true,
      gatewayUrl: sslczData.GatewayPageURL,
      tranId,
      amount: totalAmount,
      currency: "BDT",
    });
  } catch (err) {
    console.error("POST /api/payment/sslcommerz/init error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to initialize payment gateway.",
      },
      { status: 500 }
    );
  }
}
