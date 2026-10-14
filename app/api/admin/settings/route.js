import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

const DEFAULT_SETTINGS = {
  id: 1,
  pro_plan_price: 49.0,
  free_order_limit: 100,
  whatsapp_api_url: "https://api.green-api.com",
  whatsapp_instance_id: "",
  whatsapp_token: "",
  sms_api_key: "",
  sms_sender_id: "",
  sms_api_url: "http://bulksmsbd.net/api/smsapi",
};

/**
 * Checks if the caller is the verified super admin platform owner.
 */
async function verifyAdminCaller(request, supabaseUrl, supabaseAnonKey) {
  try {
    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error,
    } = await ssrClient.auth.getUser();

    if (error || !user?.email) return false;
    return user.email.toLowerCase().trim() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/settings
 * - If ?public=true or non-admin: Returns only pricing configs (safe for client billing page)
 * - If admin caller: Returns full settings including WhatsApp & SMS credentials
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
    };

    // If public request, strip sensitive gateway credentials
    if (isPublicQuery) {
      return NextResponse.json({
        success: true,
        settings: {
          pro_plan_price: Number(mergedSettings.pro_plan_price) || 49.0,
          free_order_limit: Number(mergedSettings.free_order_limit) || 100,
        },
      });
    }

    // Otherwise check admin privileges
    const isAdmin = await verifyAdminCaller(
      request,
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!isAdmin) {
      // Non-admin callers only get public pricing
      return NextResponse.json({
        success: true,
        settings: {
          pro_plan_price: Number(mergedSettings.pro_plan_price) || 49.0,
          free_order_limit: Number(mergedSettings.free_order_limit) || 100,
        },
      });
    }

    // Admin gets full settings payload
    return NextResponse.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS,
    });
  }
}

/**
 * POST /api/admin/settings
 * Allows Super Admin to dynamically update pricing & API credentials in Supabase
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
    const isAdmin = await verifyAdminCaller(
      request,
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: "Super Administrator clearance required to modify SaaS settings.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      pro_plan_price,
      free_order_limit,
      whatsapp_api_url,
      whatsapp_instance_id,
      whatsapp_token,
      sms_api_key,
      sms_sender_id,
      sms_api_url,
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
          error:
            error.message ||
            "Failed to save SaaS settings. Ensure the saas_settings table exists.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "SaaS settings updated dynamically.",
      settings: data,
    });
  } catch (err) {
    console.error("POST /api/admin/settings exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
