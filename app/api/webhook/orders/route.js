import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/utils/rate-limit";

// Webhook secret key configuration (from environment)
const EXPECTED_API_KEY = process.env.CMS_WEBHOOK_API_KEY;

// Security constants
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB max payload size
const RATE_LIMIT_REQUESTS = 60; // 60 requests
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // per 1 minute

/**
 * Timing-safe string comparison to prevent timing side-channel attacks on API keys.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Sanitizes text input to prevent basic injection / control characters.
 */
function sanitizeText(str, maxLength = 255) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // strip control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates Bangladeshi or international contact phone numbers.
 */
function isValidPhone(phone) {
  if (typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Matches BD numbers (+8801XXXXXXXXX or 01XXXXXXXXX) or general international 8-15 digits
  return /^(?:\+?880|0)?1[3-9]\d{8}$/.test(cleaned) || /^\+?\d{8,15}$/.test(cleaned);
}

export async function POST(request) {
  const clientIp = getClientIp(request);

  // ── 1. RATE LIMITING CHECK ────────────────────────────────
  const rateLimit = checkRateLimit(`webhook:${clientIp}`, {
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
        error: "Too many requests. Rate limit exceeded.",
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

  // ── 2. HEADER & CONTENT-TYPE VALIDATION ───────────────────
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      {
        success: false,
        code: "UNSUPPORTED_MEDIA_TYPE",
        error: "Invalid Content-Type header. Expected 'application/json'.",
      },
      { status: 415, headers: rateLimitHeaders }
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        code: "PAYLOAD_TOO_LARGE",
        error: `Request body exceeds maximum allowed size of ${MAX_PAYLOAD_BYTES / 1024} KB.`,
      },
      { status: 413, headers: rateLimitHeaders }
    );
  }

  // ── 3. AUTHENTICATION (x-api-key) ─────────────────────────
  if (!EXPECTED_API_KEY) {
    console.error("Critical: CMS_WEBHOOK_API_KEY is not defined in environment variables.");
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_CONFIG_ERROR",
        error: "Webhook service is currently unavailable.",
      },
      { status: 503, headers: rateLimitHeaders }
    );
  }

  const providedApiKey = request.headers.get("x-api-key");
  if (!providedApiKey || !timingSafeEqual(providedApiKey, EXPECTED_API_KEY)) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHORIZED",
        error: "Unauthorized: Invalid or missing 'x-api-key' header.",
      },
      { status: 401, headers: rateLimitHeaders }
    );
  }

  // ── 4. JSON BODY PARSING & SAFETY CHECK ───────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "MALFORMED_JSON",
        error: "Malformed JSON payload in request body.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // ── 5. STRICT INPUT VALIDATION & SANITIZATION ─────────────
  const rawCustomerName = body?.customer_name;
  const rawCustomerPhone = body?.customer_phone;
  const rawCustomerAddress = body?.customer_address;
  const rawTotalAmount = body?.total_amount;
  const items = body?.items;

  const customerName = sanitizeText(rawCustomerName, 100);
  const customerPhone = sanitizeText(rawCustomerPhone, 20);
  const customerAddress = sanitizeText(rawCustomerAddress, 300);
  const externalOrderId = sanitizeText(body?.external_order_id, 50);
  const source = sanitizeText(body?.source, 30) || "webhook";
  const requestedBusinessId = sanitizeText(request.headers.get("x-business-id") || body?.business_id, 50);

  if (!customerName || customerName.length < 2) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Field 'customer_name' is required (minimum 2 characters).",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (!customerPhone || !isValidPhone(customerPhone)) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Field 'customer_phone' is invalid. Please provide a valid contact number.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (!customerAddress || customerAddress.length < 5) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Field 'customer_address' is required (minimum 5 characters).",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Field 'items' must be a non-empty array with at most 50 items.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const firstItem = items[0];
  const targetSku = sanitizeText(firstItem?.sku, 50);
  const itemQuantity = Math.max(1, Math.min(1000, Number(firstItem?.quantity) || 1));

  if (!targetSku) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: "The primary item must specify a valid 'sku'.",
      },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const numericAmount = Math.max(0, Number(rawTotalAmount) || 0);

  // ── 6. SUPABASE CLIENT & TENANT PRODUCT LOOKUP ────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Critical: Supabase credentials missing in server environment.");
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_CONFIG_ERROR",
        error: "Internal server configuration error.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Look up product by base_sku, with optional workspace filter for multi-tenant isolation
    let prodQuery = supabase
      .from("products")
      .select("id, name, base_sku, price, business_id")
      .eq("base_sku", targetSku);

    if (requestedBusinessId) {
      prodQuery = prodQuery.eq("business_id", requestedBusinessId);
    }

    const { data: product, error: prodErr } = await prodQuery.maybeSingle();

    if (prodErr) {
      console.error("Database query error looking up SKU:", prodErr);
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_ERROR",
          error: "Failed to locate product inventory.",
        },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          code: "PRODUCT_NOT_FOUND",
          error: `Product with SKU "${targetSku}" does not exist in inventory catalog.`,
        },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // ── 7. INSERT ORDER WITH PENDING_DISPATCH STATUS ─────────
    const orderPayload = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      courier_name: "UNASSIGNED",
      status: "PENDING_DISPATCH",
      consignment_id: null,
      tracking_url: null,
    };

    if (product.business_id) {
      orderPayload.business_id = product.business_id;
    }
    if (product.id) {
      orderPayload.product_id = product.id;
    }
    if (numericAmount > 0) {
      orderPayload.total_amount = numericAmount;
    }
    if (itemQuantity > 0) {
      orderPayload.quantity = itemQuantity;
    }

    let { data: newOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert queued order:", insertError);
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_INSERT_FAILED",
          error: "Failed to record incoming order in dispatch queue.",
        },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    // ── 8. SUCCESSFUL RESPONSE ──────────────────────────────
    return NextResponse.json(
      {
        success: true,
        code: "ORDER_QUEUED",
        message: "Order received and queued successfully for dispatch.",
        order_id: newOrder.id,
        external_order_id: externalOrderId || null,
        source,
        product: {
          id: product.id,
          name: product.name,
          sku: product.base_sku,
          quantity: itemQuantity,
        },
        status: "PENDING_DISPATCH",
      },
      {
        status: 200,
        headers: rateLimitHeaders,
      }
    );
  } catch (err) {
    console.error("Unhandled error processing orders webhook:", err);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        error: "An unexpected error occurred while processing the webhook.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
