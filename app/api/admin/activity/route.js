import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_EMAIL } from "@/utils/admin-auth";

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase credentials." },
        { status: 500 }
      );
    }

    // 1. Check caller authentication
    const ssrClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    let currentUser = user;
    if (!currentUser) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;
      const cookieToken =
        request.cookies.get("sb-access-token")?.value ||
        request.cookies.get("supabase-auth-token")?.value;
      const token = bearerToken || cookieToken;

      if (token) {
        const fallbackClient = createClient(
          supabaseUrl,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            auth: { persistSession: false, autoRefreshToken: false },
          }
        );
        const { data: fallbackData } = await fallbackClient.auth.getUser(token);
        if (fallbackData?.user) {
          currentUser = fallbackData.user;
        }
      }
    }

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to view activity logs." },
        { status: 401 }
      );
    }

    const isAdmin = currentUser.email?.toLowerCase().trim() === ADMIN_EMAIL;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 40, 100);
    const actionFilter = searchParams.get("action");
    const bizFilter = searchParams.get("business_id");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabaseAdmin
      .from("activity_logs")
      .select("id, business_id, user_email, action_type, details, metadata, ip_address, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    // If non-admin, strictly restrict to their own verified business_id
    if (!isAdmin) {
      const { data: userRole } = await supabaseAdmin
        .from("user_roles")
        .select("business_id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!userRole?.business_id) {
        return NextResponse.json({ success: true, logs: [] });
      }
      query = query.eq("business_id", userRole.business_id);
    } else {
      // Super Admin can filter by business_id if provided
      if (bizFilter) {
        query = query.eq("business_id", bizFilter);
      }
    }

    if (actionFilter && actionFilter !== "ALL") {
      query = query.eq("action_type", actionFilter);
    }

    const { data: logs, error: logsErr } = await query;

    if (logsErr) {
      console.warn("Activity logs query note:", logsErr.message);
      return NextResponse.json({
        success: true,
        logs: [],
        note: "Table not yet initialized or empty.",
      });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      count: logs ? logs.length : 0,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Activity logs API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load activity logs." },
      { status: 500 }
    );
  }
}
