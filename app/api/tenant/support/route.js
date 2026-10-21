import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantSupportTickets,
  saveSupportTicket,
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

    const tickets = getTenantSupportTickets(authResult.businessId);

    return NextResponse.json({
      success: true,
      tickets,
      supportPhone: "01753082749",
      whatsappNumber: "8801753082749",
    });
  } catch (err) {
    console.error("GET /api/tenant/support error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load support tickets." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await resolveTenantUser(request);
    if (!authResult || !authResult.businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication or business context required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { subject, category = "help", priority = "normal", description, phone } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: "Subject and issue description are required." },
        { status: 400 }
      );
    }

    const newTicket = saveSupportTicket({
      business_id: authResult.businessId,
      store_name: authResult.businessName,
      user_email: authResult.user.email,
      phone: phone || "",
      subject,
      category,
      priority,
      description,
    });

    return NextResponse.json({
      success: true,
      message: "Support ticket submitted successfully. Our team will review it shortly.",
      ticket: newTicket,
    });
  } catch (err) {
    console.error("POST /api/tenant/support error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit ticket." },
      { status: 500 }
    );
  }
}
