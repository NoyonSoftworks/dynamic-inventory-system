import { createClient } from "@supabase/supabase-js";
import { supabase as browserSupabase } from "@/utils/supabase/client";

export const AUDIT_ACTIONS = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",
  BULK_IMPORT: "BULK_IMPORT",
  STOCK_CHECKIN: "STOCK_CHECKIN",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_DISPATCHED: "ORDER_DISPATCHED",
  COURIER_CONFIGURED: "COURIER_CONFIGURED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  PAYMENT_SUCCESS: "PAYMENT_CONFIRMED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
};

/**
 * Extracts client IP and User-Agent from a Next.js Request object
 */
export function extractClientDetails(request) {
  if (!request) return { ipAddress: null, userAgent: null };

  const headers = request.headers;
  const forwardedFor = headers?.get("x-forwarded-for");
  const realIp = headers?.get("x-real-ip");
  const cfIp = headers?.get("cf-connecting-ip");

  const ipAddress = (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || realIp || cfIp || "127.0.0.1";
  const userAgent = headers?.get("user-agent") || "Unknown Client";

  return { ipAddress, userAgent };
}

/**
 * Enterprise Audit Trail Logger
 * Safe against throws — will log warnings instead of failing the primary transaction.
 *
 * @param {Object} params
 * @param {string} [params.businessId] - Target tenant workspace ID
 * @param {string} [params.userId] - Auth user ID
 * @param {string} [params.userEmail] - Email address of actor
 * @param {string} params.actionType - AUDIT_ACTIONS enum string
 * @param {string} params.details - Human-readable description
 * @param {Object} [params.metadata] - Structured context (SKUs, tracking IDs, price, etc.)
 * @param {string} [params.ipAddress] - Direct IP or extracted from request
 * @param {string} [params.userAgent] - Direct user agent
 * @param {Request} [params.request] - Next.js Request object for auto header extraction
 */
export async function logActivity({
  businessId = null,
  userId = null,
  userEmail = null,
  actionType,
  details,
  metadata = {},
  ipAddress = null,
  userAgent = null,
  request = null,
}) {
  try {
    let resolvedIp = ipAddress;
    let resolvedUa = userAgent;

    if (request) {
      const extracted = extractClientDetails(request);
      resolvedIp = resolvedIp || extracted.ipAddress;
      resolvedUa = resolvedUa || extracted.userAgent;
    }

    const payload = {
      business_id: businessId,
      user_id: userId,
      user_email: userEmail,
      action_type: actionType || "GENERIC_EVENT",
      details: details || "Action performed",
      metadata: typeof metadata === "object" ? metadata : {},
      ip_address: resolvedIp,
      user_agent: resolvedUa,
      created_at: new Date().toISOString(),
    };

    // Server-side logging with Service Role Client (bypasses RLS for platform-wide logging)
    const isServer = typeof window === "undefined";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (isServer && supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await supabaseAdmin.from("activity_logs").insert(payload);
      if (error && !error.message?.includes("does not exist")) {
        console.warn("Audit log insert warning:", error.message);
      }
      return { success: !error };
    }

    // Client-side fallback using standard authenticated client
    if (browserSupabase) {
      const { error } = await browserSupabase.from("activity_logs").insert(payload);
      if (error && !error.message?.includes("does not exist")) {
        console.warn("Client audit log insert warning:", error.message);
      }
      return { success: !error };
    }

    return { success: false, reason: "No database client available" };
  } catch (err) {
    console.warn("logActivity caught exception:", err.message);
    return { success: false, error: err.message };
  }
}
