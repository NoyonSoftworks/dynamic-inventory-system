import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logActivity, AUDIT_ACTIONS } from "@/utils/audit-logger";
import { verifyAdminRequest, ADMIN_EMAIL } from "@/utils/admin-auth";

const DEFAULT_SETTINGS = {
  id: 1,
  pro_plan_price: 49.0,
  free_order_limit: 100,
  currency_mode: "AUTO",
  bdt_exchange_rate: 122.0,
  whatsapp_api_url: "https://api.green-api.com",
  whatsapp_instance_id: "",
  whatsapp_token: "",
  sms_api_key: "",
  sms_sender_id: "",
  sms_api_url: "http://bulksmsbd.net/api/smsapi",
  sslcommerz_store_id: "",
  sslcommerz_store_passwd: "",
  sslcommerz_is_live: false,
  stripe_public_key: "",
  stripe_secret_key: "",
};

/**
 * GET /api/admin/settings
 * - If ?public=true or non-admin: Returns only pricing & public currency configs
 * - If admin caller: Returns full settings including WhatsApp, SMS, SSLCommerz & Stripe secrets
 */
export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_SETTINGS,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { searchParams } = new URL(request.url);
    const isPublicQuery = searchParams.get("public") === "true";

    // 1. Fetch from saas_settings table
    const { data, error } = await supabaseAdmin
      .from("saas_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error && !error.message?.includes("does not exist")) {
      console.warn("saas_settings read note:", error.message);
    }

    // Merge database row with defaults and fallback to process.env
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...(data || {}),
      currency_mode: data?.currency_mode || DEFAULT_SETTINGS.currency_mode,
      bdt_exchange_rate: Number(data?.bdt_exchange_rate) || DEFAULT_SETTINGS.bdt_exchange_rate,
      whatsapp_api_url:
        data?.whatsapp_api_url ||
        process.env.WHATSAPP_API_URL ||
        DEFAULT_SETTINGS.whatsapp_api_url,
      whatsapp_instance_id:
        data?.whatsapp_instance_id ||
        process.env.WHATSAPP_INSTANCE_ID ||
        DEFAULT_SETTINGS.whatsapp_instance_id,
      whatsapp_token:
        data?.whatsapp_token ||
        process.env.WHATSAPP_TOKEN ||
        DEFAULT_SETTINGS.whatsapp_token,
      sms_api_key:
        data?.sms_api_key ||
        process.env.BULKSMSBD_API_KEY ||
        process.env.SMS_API_KEY ||
        DEFAULT_SETTINGS.sms_api_key,
      sms_sender_id:
        data?.sms_sender_id ||
        process.env.BULKSMSBD_SENDER_ID ||
        process.env.SMS_SENDER_ID ||
        DEFAULT_SETTINGS.sms_sender_id,
      sms_api_url:
        data?.sms_api_url ||
        process.env.BULKSMSBD_API_URL ||
        process.env.SMS_API_URL ||
        DEFAULT_SETTINGS.sms_api_url,
      sslcommerz_store_id:
        data?.sslcommerz_store_id ||
        process.env.SSLCOMMERZ_STORE_ID ||
        DEFAULT_SETTINGS.sslcommerz_store_id,
      sslcommerz_store_passwd:
        data?.sslcommerz_store_passwd ||
        process.env.SSLCOMMERZ_STORE_PASSWORD ||
        DEFAULT_SETTINGS.sslcommerz_store_passwd,
      sslcommerz_is_live:
        data?.sslcommerz_is_live !== undefined
          ? Boolean(data.sslcommerz_is_live)
          : process.env.SSLCOMMERZ_IS_LIVE === "true",
      stripe_public_key:
        data?.stripe_public_key ||
        process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ||
        DEFAULT_SETTINGS.stripe_public_key,
      stripe_secret_key:
        data?.stripe_secret_key ||
        process.env.STRIPE_SECRET_KEY ||
        DEFAULT_SETTINGS.stripe_secret_key,
    };

    // If public request, strip sensitive gateway credentials
    if (isPublicQuery) {
      return NextResponse.json({
        success: true,
        settings: {
          pro_plan_price: Number(mergedSettings.pro_plan_price) || 49.0,
          free_order_limit: Number(mergedSettings.free_order_limit) || 100,
          currency_mode: mergedSettings.currency_mode,
          bdt_exchange_rate: Number(mergedSettings.bdt_exchange_rate) || 122.0,
          stripe_public_key: mergedSettings.stripe_public_key || "",
          sslcommerz_configured: Boolean(mergedSettings.sslcommerz_store_id),
          sslcommerz_is_live: Boolean(mergedSettings.sslcommerz_is_live),
        },
      });
    }

    // Otherwise check admin privileges
    const auth = await verifyAdminRequest(request);

    if (!auth.isAuthorized) {
      // Non-admin callers only get public pricing & public keys
      return NextResponse.json({
        success: true,
        settings: {
          pro_plan_price: Number(mergedSettings.pro_plan_price) || 49.0,
          free_order_limit: Number(mergedSettings.free_order_limit) || 100,
          currency_mode: mergedSettings.currency_mode,
          bdt_exchange_rate: Number(mergedSettings.bdt_exchange_rate) || 122.0,
          stripe_public_key: mergedSettings.stripe_public_key || "",
          sslcommerz_configured: Boolean(mergedSettings.sslcommerz_store_id),
          sslcommerz_is_live: Boolean(mergedSettings.sslcommerz_is_live),
        },
      });
    }

    // Admin gets full settings payload including secrets
    return NextResponse.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS,
    });
  }
}

/**
 * POST /api/admin/settings
 * Allows Super Admin to dynamically update pricing, payments, & API credentials in Supabase
 */
export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration missing." },
        { status: 500 }
      );
    }

    // Verify Super Admin access
    const auth = await verifyAdminRequest(request);

    if (!auth.isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const body = await request.json().catch(() => null);
    const {
      pro_plan_price,
      free_order_limit,
      currency_mode,
      bdt_exchange_rate,
      whatsapp_api_url,
      whatsapp_instance_id,
      whatsapp_token,
      sms_api_key,
      sms_sender_id,
      sms_api_url,
      sslcommerz_store_id,
      sslcommerz_store_passwd,
      sslcommerz_is_live,
      stripe_public_key,
      stripe_secret_key,
    } = body || {};

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = {
      id: 1,
      updated_at: new Date().toISOString(),
    };

    if (pro_plan_price !== undefined) {
      payload.pro_plan_price = Math.max(0, Number(pro_plan_price) || 49.0);
    }
    if (free_order_limit !== undefined) {
      payload.free_order_limit = Math.max(1, parseInt(free_order_limit, 10) || 100);
    }
    if (currency_mode !== undefined) {
      payload.currency_mode = String(currency_mode).toUpperCase().trim();
    }
    if (bdt_exchange_rate !== undefined) {
      payload.bdt_exchange_rate = Math.max(1, Number(bdt_exchange_rate) || 122.0);
    }
    if (whatsapp_api_url !== undefined) {
      payload.whatsapp_api_url = String(whatsapp_api_url).trim();
    }
    if (whatsapp_instance_id !== undefined) {
      payload.whatsapp_instance_id = String(whatsapp_instance_id).trim();
    }
    if (whatsapp_token !== undefined) {
      payload.whatsapp_token = String(whatsapp_token).trim();
    }
    if (sms_api_key !== undefined) {
      payload.sms_api_key = String(sms_api_key).trim();
    }
    if (sms_sender_id !== undefined) {
      payload.sms_sender_id = String(sms_sender_id).trim();
    }
    if (sms_api_url !== undefined) {
      payload.sms_api_url = String(sms_api_url).trim();
    }
    if (sslcommerz_store_id !== undefined) {
      payload.sslcommerz_store_id = String(sslcommerz_store_id).trim();
    }
    if (sslcommerz_store_passwd !== undefined) {
      payload.sslcommerz_store_passwd = String(sslcommerz_store_passwd).trim();
    }
    if (sslcommerz_is_live !== undefined) {
      payload.sslcommerz_is_live = Boolean(sslcommerz_is_live);
    }
    if (stripe_public_key !== undefined) {
      payload.stripe_public_key = String(stripe_public_key).trim();
    }
    if (stripe_secret_key !== undefined) {
      payload.stripe_secret_key = String(stripe_secret_key).trim();
    }

    const { data, error } = await supabaseAdmin
      .from("saas_settings")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to upsert saas_settings:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save SaaS settings to database.",
        },
        { status: 500 }
      );
    }

    // Log platform settings modification to audit trail
    logActivity({
      businessId: "00000000-0000-0000-0000-000000000001",
      userEmail: ADMIN_EMAIL,
      actionType: AUDIT_ACTIONS.SETTINGS_UPDATED,
      details: "Super Administrator updated dynamic SaaS pricing & payment gateways",
      metadata: {
        currency_mode: payload.currency_mode,
        bdt_exchange_rate: payload.bdt_exchange_rate,
        pro_plan_price: payload.pro_plan_price,
        free_order_limit: payload.free_order_limit,
        sslcommerz_configured: Boolean(payload.sslcommerz_store_id),
        stripe_configured: Boolean(payload.stripe_public_key),
      },
      request,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "SaaS settings & payment gateway updated successfully.",
      settings: data,
    });
  } catch (err) {
    console.error("POST /api/admin/settings exception:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
