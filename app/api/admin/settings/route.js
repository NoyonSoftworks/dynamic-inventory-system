import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { logActivity, AUDIT_ACTIONS } from "@/utils/audit-logger";
import { verifyAdminRequest, ADMIN_EMAIL } from "@/utils/admin-auth";

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "saas_settings.json");

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
  admin_recovery_email: "hossainmdnoyon528@gmail.com",
  admin_recovery_phone: "01753082749",
  admin_recovery_pin: "882194",
  support_phone: "01753082749",
  support_whatsapp: "8801753082749",
  support_email: "support@smartinventory.app",
  support_hours: "10:00 AM - 11:00 PM (Daily)",
  bkash_number: "01753082749",
  nagad_number: "01753082749",
  starter_plan_price_bdt: 999,
  starter_plan_price_usd: 19,
  starter_order_limit: 300,
  growth_plan_price_bdt: 1990,
  growth_plan_price_usd: 39,
  growth_order_limit: 1500,
  enterprise_plan_price_bdt: 4990,
  enterprise_plan_price_usd: 99,
  enterprise_order_limit: 5000,
  ai_name: "Shongi",
  ai_name_bn: "সঙ্গী",
  ai_tagline: "আপনার ব্যবসার ২৪/৭ বিশ্বস্ত এআই পার্টনার ও কো-পাইলট",
  ai_is_active: true,
  ai_model_mode: "balanced",
  ai_welcome_message: "আসসালামু আলাইকুম! আমি {ai_name_bn} ({ai_name}), আপনার স্টোরের সার্বক্ষণিক বিশ্বস্ত এআই সহকারী। ইনভেন্টরি স্টক, পার্সেল ট্র্যাকিং ও কুরিয়ার ইস্যু সমাধানে আমি আপনাকে যেকোনো সময় সাহায্য করতে প্রস্তুত!",
  ai_custom_instructions: "Always be friendly, encouraging, and focused on helping Bangladeshi online store owners prevent courier RTO, protect profit margins, and manage stock efficiently.",
};

function readLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Local settings read note:", err.message);
  }
  return {};
}

function writeLocalSettings(settings) {
  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.warn("Local settings write note:", err.message);
  }
}

/**
 * GET /api/admin/settings
 * - If ?public=true or non-admin: Returns only pricing & public currency configs
 * - If admin caller: Returns full settings including WhatsApp, SMS, Recovery Info, & Gateway secrets
 */
export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const localSettings = readLocalSettings();

    let dbData = null;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await supabaseAdmin
          .from("saas_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (!error && data) {
          dbData = data;
        }
      } catch (dbErr) {
        console.warn("saas_settings DB read exception:", dbErr.message);
      }
    }

    const { searchParams } = new URL(request.url);
    const isPublicQuery = searchParams.get("public") === "true";

    // Merge database row with local file and defaults
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...localSettings,
      ...(dbData || {}),
      currency_mode:
        localSettings.currency_mode ||
        dbData?.currency_mode ||
        DEFAULT_SETTINGS.currency_mode,
      bdt_exchange_rate:
        Number(localSettings.bdt_exchange_rate || dbData?.bdt_exchange_rate) ||
        DEFAULT_SETTINGS.bdt_exchange_rate,
      admin_recovery_email:
        localSettings.admin_recovery_email ||
        dbData?.admin_recovery_email ||
        DEFAULT_SETTINGS.admin_recovery_email,
      admin_recovery_phone:
        localSettings.admin_recovery_phone ||
        dbData?.admin_recovery_phone ||
        DEFAULT_SETTINGS.admin_recovery_phone,
      support_phone:
        localSettings.support_phone ||
        dbData?.support_phone ||
        localSettings.admin_recovery_phone ||
        DEFAULT_SETTINGS.support_phone,
      support_whatsapp:
        localSettings.support_whatsapp ||
        dbData?.support_whatsapp ||
        DEFAULT_SETTINGS.support_whatsapp,
      support_email:
        localSettings.support_email ||
        dbData?.support_email ||
        DEFAULT_SETTINGS.support_email,
      support_hours:
        localSettings.support_hours ||
        dbData?.support_hours ||
        DEFAULT_SETTINGS.support_hours,
      bkash_number:
        localSettings.bkash_number ||
        dbData?.bkash_number ||
        localSettings.admin_recovery_phone ||
        DEFAULT_SETTINGS.bkash_number,
      nagad_number:
        localSettings.nagad_number ||
        dbData?.nagad_number ||
        localSettings.admin_recovery_phone ||
        DEFAULT_SETTINGS.nagad_number,
      whatsapp_api_url:
        dbData?.whatsapp_api_url ||
        localSettings.whatsapp_api_url ||
        process.env.WHATSAPP_API_URL ||
        DEFAULT_SETTINGS.whatsapp_api_url,
      whatsapp_instance_id:
        dbData?.whatsapp_instance_id ||
        localSettings.whatsapp_instance_id ||
        process.env.WHATSAPP_INSTANCE_ID ||
        DEFAULT_SETTINGS.whatsapp_instance_id,
      whatsapp_token:
        dbData?.whatsapp_token ||
        localSettings.whatsapp_token ||
        process.env.WHATSAPP_TOKEN ||
        DEFAULT_SETTINGS.whatsapp_token,
      sms_api_key:
        dbData?.sms_api_key ||
        localSettings.sms_api_key ||
        process.env.BULKSMSBD_API_KEY ||
        process.env.SMS_API_KEY ||
        DEFAULT_SETTINGS.sms_api_key,
      sms_sender_id:
        dbData?.sms_sender_id ||
        localSettings.sms_sender_id ||
        process.env.BULKSMSBD_SENDER_ID ||
        process.env.SMS_SENDER_ID ||
        DEFAULT_SETTINGS.sms_sender_id,
      sms_api_url:
        dbData?.sms_api_url ||
        localSettings.sms_api_url ||
        process.env.BULKSMSBD_API_URL ||
        process.env.SMS_API_URL ||
        DEFAULT_SETTINGS.sms_api_url,
      sslcommerz_store_id:
        localSettings.sslcommerz_store_id ||
        dbData?.sslcommerz_store_id ||
        process.env.SSLCOMMERZ_STORE_ID ||
        DEFAULT_SETTINGS.sslcommerz_store_id,
      sslcommerz_store_passwd:
        localSettings.sslcommerz_store_passwd ||
        dbData?.sslcommerz_store_passwd ||
        process.env.SSLCOMMERZ_STORE_PASSWORD ||
        DEFAULT_SETTINGS.sslcommerz_store_passwd,
      sslcommerz_is_live:
        localSettings.sslcommerz_is_live !== undefined
          ? Boolean(localSettings.sslcommerz_is_live)
          : dbData?.sslcommerz_is_live !== undefined
          ? Boolean(dbData.sslcommerz_is_live)
          : process.env.SSLCOMMERZ_IS_LIVE === "true",
      stripe_public_key:
        localSettings.stripe_public_key ||
        dbData?.stripe_public_key ||
        process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ||
        DEFAULT_SETTINGS.stripe_public_key,
      stripe_secret_key:
        localSettings.stripe_secret_key ||
        dbData?.stripe_secret_key ||
        process.env.STRIPE_SECRET_KEY ||
        DEFAULT_SETTINGS.stripe_secret_key,
      ai_name:
        localSettings.ai_name ||
        dbData?.ai_name ||
        DEFAULT_SETTINGS.ai_name,
      ai_name_bn:
        localSettings.ai_name_bn ||
        dbData?.ai_name_bn ||
        DEFAULT_SETTINGS.ai_name_bn,
      ai_tagline:
        localSettings.ai_tagline ||
        dbData?.ai_tagline ||
        DEFAULT_SETTINGS.ai_tagline,
      ai_is_active:
        localSettings.ai_is_active !== undefined
          ? Boolean(localSettings.ai_is_active)
          : dbData?.ai_is_active !== undefined
          ? Boolean(dbData.ai_is_active)
          : DEFAULT_SETTINGS.ai_is_active,
      ai_model_mode:
        localSettings.ai_model_mode ||
        dbData?.ai_model_mode ||
        DEFAULT_SETTINGS.ai_model_mode,
      ai_welcome_message:
        localSettings.ai_welcome_message ||
        dbData?.ai_welcome_message ||
        DEFAULT_SETTINGS.ai_welcome_message,
      ai_custom_instructions:
        localSettings.ai_custom_instructions !== undefined
          ? localSettings.ai_custom_instructions
          : dbData?.ai_custom_instructions !== undefined
          ? dbData.ai_custom_instructions
          : DEFAULT_SETTINGS.ai_custom_instructions,
    };

    // If public request, strip sensitive secrets
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
          support_phone: mergedSettings.support_phone || "01753082749",
          support_whatsapp: mergedSettings.support_whatsapp || "8801753082749",
          support_email: mergedSettings.support_email || "support@smartinventory.app",
          support_hours: mergedSettings.support_hours || "10:00 AM - 11:00 PM (Daily)",
          starter_plan_price_bdt: Number(mergedSettings.starter_plan_price_bdt) || 999,
          starter_plan_price_usd: Number(mergedSettings.starter_plan_price_usd) || 19,
          starter_order_limit: Number(mergedSettings.starter_order_limit) || 300,
          growth_plan_price_bdt: Number(mergedSettings.growth_plan_price_bdt) || 1990,
          growth_plan_price_usd: Number(mergedSettings.growth_plan_price_usd) || 39,
          growth_order_limit: Number(mergedSettings.growth_order_limit) || 1500,
          enterprise_plan_price_bdt: Number(mergedSettings.enterprise_plan_price_bdt) || 4990,
          enterprise_plan_price_usd: Number(mergedSettings.enterprise_plan_price_usd) || 99,
          enterprise_order_limit: Number(mergedSettings.enterprise_order_limit) || 5000,
          bkash_number: mergedSettings.bkash_number || mergedSettings.support_phone || "01753082749",
          nagad_number: mergedSettings.nagad_number || mergedSettings.support_phone || "01753082749",
          admin_phone: mergedSettings.support_phone || mergedSettings.admin_recovery_phone || "01753082749",
          ai_name: mergedSettings.ai_name || "Shongi",
          ai_name_bn: mergedSettings.ai_name_bn || "সঙ্গী",
          ai_tagline: mergedSettings.ai_tagline || "আপনার ব্যবসার ২৪/৭ বিশ্বস্ত এআই পার্টনার ও কো-পাইলট",
          ai_is_active: mergedSettings.ai_is_active !== false,
          ai_model_mode: mergedSettings.ai_model_mode || "balanced",
          ai_welcome_message: mergedSettings.ai_welcome_message || DEFAULT_SETTINGS.ai_welcome_message,
        },
      });
    }

    // Otherwise check admin privileges
    const auth = await verifyAdminRequest(request);

    if (!auth.isAuthorized) {
      // Non-admin callers only get public pricing & contacts
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
          support_phone: mergedSettings.support_phone || "01753082749",
          support_whatsapp: mergedSettings.support_whatsapp || "8801753082749",
          support_email: mergedSettings.support_email || "support@smartinventory.app",
          support_hours: mergedSettings.support_hours || "10:00 AM - 11:00 PM (Daily)",
          starter_plan_price_bdt: Number(mergedSettings.starter_plan_price_bdt) || 999,
          starter_plan_price_usd: Number(mergedSettings.starter_plan_price_usd) || 19,
          starter_order_limit: Number(mergedSettings.starter_order_limit) || 300,
          growth_plan_price_bdt: Number(mergedSettings.growth_plan_price_bdt) || 1990,
          growth_plan_price_usd: Number(mergedSettings.growth_plan_price_usd) || 39,
          growth_order_limit: Number(mergedSettings.growth_order_limit) || 1500,
          enterprise_plan_price_bdt: Number(mergedSettings.enterprise_plan_price_bdt) || 4990,
          enterprise_plan_price_usd: Number(mergedSettings.enterprise_plan_price_usd) || 99,
          enterprise_order_limit: Number(mergedSettings.enterprise_order_limit) || 5000,
          bkash_number: mergedSettings.bkash_number || mergedSettings.support_phone || "01753082749",
          nagad_number: mergedSettings.nagad_number || mergedSettings.support_phone || "01753082749",
          admin_phone: mergedSettings.support_phone || mergedSettings.admin_recovery_phone || "01753082749",
          ai_name: mergedSettings.ai_name || "Shongi",
          ai_name_bn: mergedSettings.ai_name_bn || "সঙ্গী",
          ai_tagline: mergedSettings.ai_tagline || "আপনার ব্যবসার ২৪/৭ বিশ্বস্ত এআই পার্টনার ও কো-পাইলট",
          ai_is_active: mergedSettings.ai_is_active !== false,
          ai_model_mode: mergedSettings.ai_model_mode || "balanced",
          ai_welcome_message: mergedSettings.ai_welcome_message || DEFAULT_SETTINGS.ai_welcome_message,
        },
      });
    }

    // Admin gets full settings payload including secrets and recovery details
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
 * Allows Super Admin to dynamically update pricing, payments, recovery info & API credentials
 */
export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      admin_recovery_email,
      admin_recovery_phone,
      admin_recovery_pin,
      support_phone,
      support_whatsapp,
      support_email,
      support_hours,
      bkash_number,
      nagad_number,
      starter_plan_price_bdt,
      starter_plan_price_usd,
      starter_order_limit,
      growth_plan_price_bdt,
      growth_plan_price_usd,
      growth_order_limit,
      enterprise_plan_price_bdt,
      enterprise_plan_price_usd,
      enterprise_order_limit,
      ai_name,
      ai_name_bn,
      ai_tagline,
      ai_is_active,
      ai_model_mode,
      ai_welcome_message,
      ai_custom_instructions,
    } = body || {};

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
    if (admin_recovery_email !== undefined) {
      payload.admin_recovery_email = String(admin_recovery_email).trim().toLowerCase();
    }
    if (admin_recovery_phone !== undefined) {
      payload.admin_recovery_phone = String(admin_recovery_phone).trim();
    }
    if (admin_recovery_pin !== undefined) {
      payload.admin_recovery_pin = String(admin_recovery_pin).trim();
    }
    if (support_phone !== undefined) {
      payload.support_phone = String(support_phone).trim();
    }
    if (support_whatsapp !== undefined) {
      payload.support_whatsapp = String(support_whatsapp).trim();
    }
    if (support_email !== undefined) {
      payload.support_email = String(support_email).trim().toLowerCase();
    }
    if (support_hours !== undefined) {
      payload.support_hours = String(support_hours).trim();
    }
    if (bkash_number !== undefined) {
      payload.bkash_number = String(bkash_number).trim();
    }
    if (nagad_number !== undefined) {
      payload.nagad_number = String(nagad_number).trim();
    }
    if (starter_plan_price_bdt !== undefined) {
      payload.starter_plan_price_bdt = Math.max(0, Number(starter_plan_price_bdt) || 999);
    }
    if (starter_plan_price_usd !== undefined) {
      payload.starter_plan_price_usd = Math.max(0, Number(starter_plan_price_usd) || 19);
    }
    if (starter_order_limit !== undefined) {
      payload.starter_order_limit = Math.max(1, parseInt(starter_order_limit, 10) || 300);
    }
    if (growth_plan_price_bdt !== undefined) {
      payload.growth_plan_price_bdt = Math.max(0, Number(growth_plan_price_bdt) || 1990);
    }
    if (growth_plan_price_usd !== undefined) {
      payload.growth_plan_price_usd = Math.max(0, Number(growth_plan_price_usd) || 39);
    }
    if (growth_order_limit !== undefined) {
      payload.growth_order_limit = Math.max(1, parseInt(growth_order_limit, 10) || 1500);
    }
    if (enterprise_plan_price_bdt !== undefined) {
      payload.enterprise_plan_price_bdt = Math.max(0, Number(enterprise_plan_price_bdt) || 4990);
    }
    if (enterprise_plan_price_usd !== undefined) {
      payload.enterprise_plan_price_usd = Math.max(0, Number(enterprise_plan_price_usd) || 99);
    }
    if (enterprise_order_limit !== undefined) {
      payload.enterprise_order_limit = Math.max(1, parseInt(enterprise_order_limit, 10) || 5000);
    }
    if (ai_name !== undefined) {
      payload.ai_name = String(ai_name).trim() || "Shongi";
    }
    if (ai_name_bn !== undefined) {
      payload.ai_name_bn = String(ai_name_bn).trim() || "সঙ্গী";
    }
    if (ai_tagline !== undefined) {
      payload.ai_tagline = String(ai_tagline).trim();
    }
    if (ai_is_active !== undefined) {
      payload.ai_is_active = Boolean(ai_is_active);
    }
    if (ai_model_mode !== undefined) {
      payload.ai_model_mode = String(ai_model_mode).trim();
    }
    if (ai_welcome_message !== undefined) {
      payload.ai_welcome_message = String(ai_welcome_message).trim();
    }
    if (ai_custom_instructions !== undefined) {
      payload.ai_custom_instructions = String(ai_custom_instructions).trim();
    }

    // 1. Persist full settings to local storage file
    const existingLocal = readLocalSettings();
    const mergedForDisk = {
      ...DEFAULT_SETTINGS,
      ...existingLocal,
      ...payload,
      updated_at: new Date().toISOString(),
    };
    writeLocalSettings(mergedForDisk);

    // 2. Persist columns supported by Supabase saas_settings table
    let dbSaved = null;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Supabase schema known columns:
        const DB_COLUMNS = [
          "id",
          "pro_plan_price",
          "free_order_limit",
          "whatsapp_api_url",
          "whatsapp_instance_id",
          "whatsapp_token",
          "sms_api_key",
          "sms_sender_id",
          "sms_api_url",
          "updated_at",
        ];

        const dbPayload = { id: 1, updated_at: new Date().toISOString() };
        for (const col of DB_COLUMNS) {
          if (payload[col] !== undefined) {
            dbPayload[col] = payload[col];
          }
        }

        const { data: upsertedData, error: upsertErr } = await supabaseAdmin
          .from("saas_settings")
          .upsert(dbPayload, { onConflict: "id" })
          .select()
          .maybeSingle();

        if (upsertErr) {
          console.warn("saas_settings DB upsert note:", upsertErr.message);
        } else if (upsertedData) {
          dbSaved = upsertedData;
        }
      } catch (dbErr) {
        console.warn("saas_settings DB update exception:", dbErr.message);
      }
    }

    // Log platform settings modification to audit trail
    logActivity({
      businessId: "00000000-0000-0000-0000-000000000001",
      userEmail: ADMIN_EMAIL,
      actionType: AUDIT_ACTIONS.SETTINGS_UPDATED,
      details: "Super Administrator updated dynamic SaaS pricing, payment gateways, hotline & recovery contacts",
      metadata: {
        currency_mode: payload.currency_mode,
        bdt_exchange_rate: payload.bdt_exchange_rate,
        pro_plan_price: payload.pro_plan_price,
        free_order_limit: payload.free_order_limit,
        admin_recovery_email: payload.admin_recovery_email,
        admin_recovery_phone: payload.admin_recovery_phone,
        support_phone: payload.support_phone,
        support_whatsapp: payload.support_whatsapp,
        bkash_number: payload.bkash_number,
        nagad_number: payload.nagad_number,
        sslcommerz_configured: Boolean(payload.sslcommerz_store_id),
        stripe_configured: Boolean(payload.stripe_public_key),
      },
      request,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "SaaS settings, recovery contacts & payment gateways updated successfully.",
      settings: mergedForDisk,
    });
  } catch (err) {
    console.error("POST /api/admin/settings exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
