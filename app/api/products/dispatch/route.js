import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : request.cookies?.get?.("sb-access-token")?.value;
      if (token) {
        const { data: fbData } = await supabase.auth.getUser(token);
        if (fbData?.user) user = fbData.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Resolve caller's business_id
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    let businessId = roleRow?.business_id;
    if (!businessId && user.email) {
      const { data: byEmail } = await adminClient
        .from("user_roles")
        .select("role, business_id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (byEmail?.business_id) businessId = byEmail.business_id;
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "No merchant workspace associated with this account." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderPayload, scannedItemIds = [] } = body;

    if (!orderPayload) {
      return NextResponse.json(
        { success: false, error: "Order details are required." },
        { status: 400 }
      );
    }

    const finalOrderPayload = {
      ...orderPayload,
      business_id: businessId, // strictly enforced from authenticated session
    };

    let { data: orderData, error: orderErr } = await adminClient
      .from("orders")
      .insert(finalOrderPayload)
      .select()
      .single();

    if (orderErr) {
      console.error("Order creation error:", orderErr);
      return NextResponse.json(
        { success: false, error: orderErr.message },
        { status: 500 }
      );
    }

    // Update scanned items to SHIPPED (strictly scoped to this merchant's business_id)
    if (scannedItemIds.length > 0) {
      await adminClient
        .from("inventory_items")
        .update({
          status: "SHIPPED",
          order_id: orderData?.id || null,
        })
        .in("id", scannedItemIds)
        .eq("business_id", businessId);
    }

    return NextResponse.json({
      success: true,
      order: orderData,
      orderId: orderData?.id,
    });
  } catch (err) {
    console.error("POST /api/products/dispatch exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process dispatch." },
      { status: 500 }
    );
  }
}
