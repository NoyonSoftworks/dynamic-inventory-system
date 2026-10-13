import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/utils/rate-limit";

// Rate limiting: 20 dispatch requests per minute per user
const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const STEADFAST_TIMEOUT_MS = 10000; // 10 second network timeout

/**
 * Validates and standardizes a Bangladeshi phone number for Steadfast API.
 * Steadfast BD expects an 11-digit format: 01XXXXXXXXX
 */
function cleanBdPhone(phone) {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) {
    return digits;
  }
  if (digits.length === 13 && digits.startsWith("8801")) {
    return digits.slice(2);
  }
  return null;
}

export async function POST(request) {
  const clientIp = getClientIp(request);

  // ── 1. RATE LIMITING ──────────────────────────────────────
  const rateLimit = checkRateLimit(`courier:steadfast:${clientIp}`, {
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
  };

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        code: "RATE_LIMITED",
        error: "Too many courier dispatch requests. Please slow down.",
        retry_after_seconds: rateLimit.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimit.retryAfterSec),
        },
      }
    );
  }

  // ── 2. HEADER & CONTENT-TYPE CHECK ────────────────────────
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      {
        success: false,
        code: "UNSUPPORTED_MEDIA_TYPE",
        error: "Content-Type must be application/json.",
      },
      { status: 415, headers: rateLimitHeaders }
    );
  }

  // ── 3. AUTHENTICATION (SUPABASE SSR SESSION) ──────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        success: false,
        code: "CONFIG_ERROR",
        error: "Server configuration error: missing Supabase credentials.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }

  // Verify caller session via cookies
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
    error: authError,
  } = await ssrClient.auth.getUser();

  // Allow call if user is signed in OR if internal service role header is present
  const isInternalService =
    request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;

  if ((authError || !user) && !isInternalService) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required to trigger courier dispatch.",
      },
      { status: 401, headers: rateLimitHeaders }
    );
  }

  // ── 4. PARSE & VALIDATE PAYLOAD ───────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "MALFORMED_JSON",
        error: "Invalid JSON in request body.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const {
    order_id,
    customer_name,
    customer_phone,
    customer_address,
    amount_to_collect,
    invoice_note,
  } = body || {};

  if (!order_id) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Missing required field 'order_id'.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Valid recipient customer_name is required (minimum 2 characters).",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const validPhone = cleanBdPhone(customer_phone);
  if (!validPhone) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_PHONE",
        error: "Invalid recipient phone number. Steadfast requires an 11-digit Bangladeshi number (e.g. 01712345678).",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (!customer_address || typeof customer_address !== "string" || customer_address.trim().length < 5) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Valid customer_address is required (minimum 5 characters).",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const codAmount = Math.max(0, Number(amount_to_collect) || 0);

  // ── 5. LOOK UP TENANT-SCOPED COURIER SETTINGS ─────────────
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey || supabaseAnonKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Determine user's tenant business_id
  let callerBusinessId = null;
  if (user) {
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();
    callerBusinessId = roleRow?.business_id || null;
  }

  // Fetch Steadfast credentials scoped to this business, fallback to global
  let settingsQuery = adminClient
    .from("courier_settings")
    .select("api_key, api_secret, business_id")
    .eq("courier_name", "Steadfast");

  const { data: settingsList, error: settingsError } = await settingsQuery;

  if (settingsError) {
    console.error("Error reading courier settings:", settingsError);
    return NextResponse.json(
      {
        success: false,
        code: "DATABASE_ERROR",
        error: "Failed to retrieve courier credentials.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }

  // Prefer business-specific credentials, otherwise fallback to any active Steadfast credentials
  const settings =
    (settingsList || []).find((s) => callerBusinessId && s.business_id === callerBusinessId) ||
    settingsList?.[0];

  if (!settings || !settings.api_key || !settings.api_secret) {
    return NextResponse.json(
      {
        success: false,
        code: "COURIER_NOT_CONFIGURED",
        error:
          "Steadfast credentials (API Key and Secret Key) are not configured. Please save them in Settings.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // ── 6. DISPATCH TO STEADFAST API WITH TIMEOUT ─────────────
  const steadfastPayload = {
    invoice: String(order_id),
    recipient_name: customer_name.trim().slice(0, 100),
    recipient_phone: validPhone,
    recipient_address: customer_address.trim().slice(0, 255),
    cod_amount: codAmount,
    note: invoice_note ? String(invoice_note).trim().slice(0, 200) : "",
  };

  let steadfastRes;
  let responseData = null;

  try {
    steadfastRes = await fetch("https://api.steadfast.com.bd/v1/create_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": settings.api_key,
        "Secret-Key": settings.api_secret,
      },
      body: JSON.stringify(steadfastPayload),
      signal: AbortSignal.timeout(STEADFAST_TIMEOUT_MS),
    });

    responseData = await steadfastRes.json().catch(() => null);
  } catch (netErr) {
    console.error("Steadfast API network/timeout error:", netErr);
    const isTimeout = netErr.name === "TimeoutError";
    return NextResponse.json(
      {
        success: false,
        code: isTimeout ? "GATEWAY_TIMEOUT" : "GATEWAY_NETWORK_ERROR",
        error: isTimeout
          ? "Steadfast Courier API did not respond within 10 seconds. The local order remains saved."
          : "Unable to reach Steadfast Courier API. Please check network connectivity and retry.",
      },
      { status: 504, headers: rateLimitHeaders }
    );
  }

  // ── 7. EVALUATE STEADFAST RESPONSE ────────────────────────
  const isSuccess =
    steadfastRes.ok &&
    (responseData?.status === 200 ||
      responseData?.status === "200" ||
      Boolean(responseData?.consignment));

  if (!isSuccess) {
    const errorDetail =
      (typeof responseData?.errors === "object"
        ? Object.values(responseData.errors).flat().join(", ")
        : responseData?.errors) ||
      responseData?.message ||
      "Steadfast rejected the consignment creation request.";

    return NextResponse.json(
      {
        success: false,
        code: "COURIER_REJECTED",
        error: errorDetail,
        status_code: steadfastRes.status,
      },
      {
        status: steadfastRes.status >= 400 && steadfastRes.status < 500 ? 400 : 502,
        headers: rateLimitHeaders,
      }
    );
  }

  // ── 8. EXTRACT TRACKING & UPDATE ORDERS TABLE ─────────────
  const consignment = responseData?.consignment || responseData?.data || {};
  const consignmentId = consignment?.consignment_id || consignment?.id || null;
  const trackingCode = consignment?.tracking_code || consignmentId;
  const trackingUrl =
    consignment?.tracking_url ||
    (trackingCode ? `https://steadfast.com.bd/tracking/${trackingCode}` : null);

  const { error: updateOrderError } = await adminClient
    .from("orders")
    .update({
      consignment_id: consignmentId ? String(consignmentId) : null,
      tracking_url: trackingUrl,
    })
    .eq("id", order_id);

  if (updateOrderError) {
    console.warn("Steadfast consignment created but local DB update failed:", updateOrderError.message);
  }

  return NextResponse.json(
    {
      success: true,
      code: "CONSIGNMENT_CREATED",
      message: "Steadfast consignment created and tracking generated successfully.",
      consignment_id: consignmentId,
      tracking_code: trackingCode,
      tracking_url: trackingUrl,
    },
    { status: 200, headers: rateLimitHeaders }
  );
}
