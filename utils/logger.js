import { createClient } from "@supabase/supabase-js";

/**
 * Extracts client IP and User-Agent from Next.js Request (Route Handlers)
 * or NextApiRequest (API Routes).
 */
export function extractClientDetails(req) {
  if (!req) return { ipAddress: null, userAgent: null };

  let ipAddress = null;
  let userAgent = null;

  // Web API / Next.js Request (Route Handlers) with Headers object
  if (req.headers && typeof req.headers.get === "function") {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");
    ipAddress = (forwarded ? forwarded.split(",")[0].trim() : null) || realIp || cfIp;
    userAgent = req.headers.get("user-agent");
  } 
  // Node.js / NextApiRequest with plain headers object
  else if (req.headers && typeof req.headers === "object") {
    const forwarded = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const cfIp = req.headers["cf-connecting-ip"];
    ipAddress = (forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim()) : null) || realIp || cfIp;
    userAgent = req.headers["user-agent"];
  }

  // Direct IP fallback on socket/connection
  if (!ipAddress && req.ip) {
    ipAddress = req.ip;
  }

  return {
    ipAddress: ipAddress || "127.0.0.1",
    userAgent: userAgent || "Unknown Client",
  };
}

/**
 * Robust Server-Side Footprint Logger
 * Inserts structured audit records into public.activity_logs
 *
 * @param {Object} params
 * @param {string} [params.businessId] - Multi-tenant workspace UUID
 * @param {string} [params.userId] - Authenticated user UUID
 * @param {string} params.actionType - Action classification (e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PAYMENT_INIT')
 * @param {string} params.description - Human-readable explanation of event
 * @param {Object} [params.req] - Next.js Request or NextApiRequest object
 * @param {Object} [params.metadata] - Optional arbitrary structured JSON payload
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function logActivity({
  businessId = null,
  userId = null,
  actionType,
  description,
  req = null,
  metadata = {},
  // Backwards-compatible aliases
  details = null,
  userEmail = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const { ipAddress: reqIp, userAgent: reqUa } = extractClientDetails(req);
    const resolvedIp = ipAddress || reqIp;
    const resolvedUa = userAgent || reqUa;
    const resolvedDescription = description || details || "Audit log entry";

    const payload = {
      business_id: businessId,
      user_id: userId,
      action_type: actionType || "GENERIC_ACTION",
      description: resolvedDescription,
      details: resolvedDescription, // Populates dual-column compatibility
      ip_address: resolvedIp,
      user_agent: resolvedUa,
      created_at: new Date().toISOString(),
      metadata: typeof metadata === "object" ? metadata : {},
      ...(userEmail ? { user_email: userEmail } : {}),
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn("Audit logger: Missing Supabase credentials, skipping database insert.");
      return { success: false, error: "Missing Supabase configuration" };
    }

    // Bypass RLS via service_role to ensure footprints are guaranteed written
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabaseAdmin.from("activity_logs").insert(payload);

    if (error) {
      // Gracefully handle if table does not exist yet during migration
      if (!error.message?.includes("does not exist")) {
        console.warn("activity_logs insert warning:", error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    // Audit logging MUST never crash the primary application flow
    console.warn("logActivity unexpected error:", err.message);
    return { success: false, error: err.message };
  }
}

export default logActivity;
