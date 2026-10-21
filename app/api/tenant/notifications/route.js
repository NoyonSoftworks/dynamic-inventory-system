import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantNotifications,
  getGlobalAnnouncements,
  markNotificationRead,
  saveTenantNotification,
  getTenantConfig,
} from "@/utils/storage/tenant-store";

async function resolveTenantUser(request) {
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

  if (!user) return null;

  const adminClient = createAdminClient();
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

  return {
    user,
    businessId: roleRow?.business_id,
    businessName: roleRow?.businesses?.name || "My Store",
  };
}

export async function GET(request) {
  try {
    const authResult = await resolveTenantUser(request);
    if (!authResult || !authResult.businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication or business context required." },
        { status: 401 }
      );
    }

    const { businessId } = authResult;
    const tenantNotifs = getTenantNotifications(businessId);
    const globalAnnouncements = getGlobalAnnouncements();
    const config = getTenantConfig(businessId);

    // Merge global announcements formatted as notifications
    const formattedGlobal = globalAnnouncements.map((a) => ({
      ...a,
      business_id: businessId,
      read: false,
      isBroadcast: true,
    }));

    // Combine and sort by date descending
    const all = [...tenantNotifs, ...formattedGlobal].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const unreadCount = all.filter((n) => !n.read).length;

    // Check if store is expiring soon for high-priority prompt
    let expiryAlert = null;
    if (config?.expires_at) {
      const diffDays = Math.ceil(
        (new Date(config.expires_at).getTime() - Date.now()) / 86400000
      );
      if (diffDays <= 5) {
        expiryAlert = {
          daysRemaining: Math.max(0, diffDays),
          isExpired: diffDays <= 0,
          expires_at: config.expires_at,
          status: config.status,
          plan: config.plan,
        };
      }
    }

    return NextResponse.json({
      success: true,
      notifications: all,
      unreadCount,
      expiryAlert,
    });
  } catch (err) {
    console.error("GET /api/tenant/notifications error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await resolveTenantUser(request);
    if (!authResult || !authResult.businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { businessId } = authResult;
    const body = await request.json().catch(() => ({}));
    const { id = "all" } = body;

    markNotificationRead(businessId, id);

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read.",
    });
  } catch (err) {
    console.error("POST /api/tenant/notifications error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update notification." },
      { status: 500 }
    );
  }
}
