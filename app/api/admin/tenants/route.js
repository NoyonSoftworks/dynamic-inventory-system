import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminRequest } from "@/utils/admin-auth";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// DELETE a client tenant store (Strict Super Admin only)
export async function DELETE(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID is required." },
        { status: 400 }
      );
    }

    // Safety guard: Never allow deleting the platform owner primary workspace
    if (tenantId === "00000000-0000-0000-0000-000000000001") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete the Platform Owner Primary Workspace.",
        },
        { status: 403 }
      );
    }

    // Delete associated user_roles
    await supabaseAdmin.from("user_roles").delete().eq("business_id", tenantId);

    // Delete the business record
    const { error: delErr } = await supabaseAdmin
      .from("businesses")
      .delete()
      .eq("id", tenantId);

    if (delErr) {
      console.error("Tenant deletion error:", delErr);
      return NextResponse.json(
        { success: false, error: "Failed to delete tenant workspace." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tenant workspace successfully deleted.`,
    });
  } catch (err) {
    console.error("Tenant DELETE exception:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process tenant deletion." },
      { status: 500 }
    );
  }
}

// PATCH to rename or update tenant status (Strict Super Admin only)
export async function PATCH(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const { tenantId, name } = body || {};

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID is required." },
        { status: 400 }
      );
    }

    const updates = {};
    if (name && typeof name === "string") {
      updates.name = name.trim().slice(0, 100);
    }

    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update(updates)
      .eq("id", tenantId)
      .select()
      .single();

    if (error) {
      console.error("Tenant update error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update tenant workspace." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: data,
    });
  } catch (err) {
    console.error("Tenant PATCH exception:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process tenant update." },
      { status: 500 }
    );
  }
}
