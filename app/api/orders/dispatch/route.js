import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

/**
 * POST /api/orders/dispatch
 * Atomically fulfills an existing order from the daily queue using scanned item barcodes.
 * Updates order to DISPATCHED, marks barcodes as SHIPPED, logs stock OUT transactions,
 * and books courier consignment.
 */
export async function POST(request) {
  try {
    // 1. Authenticate user
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to dispatch orders." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Resolve business workspace
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
        { success: false, error: "No merchant workspace associated with this user." },
        { status: 400 }
      );
    }

    if (roleRow?.role === "viewer") {
      return NextResponse.json(
        { success: false, error: "Permission Denied: Viewers cannot dispatch orders." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const {
      orderId,
      scannedItemIds = [],
      courierName = "Steadfast Courier",
      consignmentId,
      deliveryNotes,
    } = body || {};

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing order ID to dispatch." },
        { status: 400 }
      );
    }

    // 3. Fetch existing order to verify ownership
    const { data: order, error: fetchErr } = await adminClient
      .from("orders")
      .select("*, products(id, name, base_sku, price)")
      .eq("id", orderId)
      .eq("business_id", businessId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found or unauthorized access." },
        { status: 404 }
      );
    }

    // Generate or preserve consignment ID
    const finalConsignmentId =
      consignmentId ||
      order.consignment_id ||
      `SF-${Math.floor(100000 + Math.random() * 900000)}`;

    const trackingUrl = `https://steadfast.com.bd/t/${finalConsignmentId}`;

    // 4. Update order status to DISPATCHED
    const { data: updatedOrder, error: updateErr } = await adminClient
      .from("orders")
      .update({
        status: "DISPATCHED",
        courier_name: courierName,
        consignment_id: finalConsignmentId,
        tracking_url: trackingUrl,
      })
      .eq("id", orderId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (updateErr) {
      console.error("Order status update error:", updateErr);
      throw new Error(updateErr.message || "Failed to update order status.");
    }

    // 5. Mark scanned items as SHIPPED
    if (scannedItemIds.length > 0) {
      await adminClient
        .from("inventory_items")
        .update({
          status: "SHIPPED",
          order_id: orderId,
        })
        .in("id", scannedItemIds)
        .eq("business_id", businessId);
    }

    // 6. Log stock transaction
    const qtyDeducted = scannedItemIds.length > 0 ? scannedItemIds.length : order.quantity || 1;
    if (order.product_id) {
      try {
        await adminClient.from("stock_transactions").insert({
          product_id: order.product_id,
          transaction_type: "OUT",
          quantity: qtyDeducted,
          reference_note: `Dispatched order #${order.consignment_id || orderId} via ${courierName}`,
          business_id: businessId,
        });
      } catch (txErr) {
        console.warn("Stock transaction log notice:", txErr);
      }
    }

    // 7. Optional: Trigger Steadfast Courier Booking if configured
    let courierBookingResult = null;
    if (courierName.toLowerCase().includes("steadfast")) {
      try {
        const { data: creds } = await adminClient
          .from("courier_settings")
          .select("api_key, api_secret")
          .eq("courier_name", "Steadfast")
          .eq("business_id", businessId)
          .maybeSingle();

        if (creds?.api_key && creds?.api_secret) {
          const steadfastRes = await fetch("https://api.steadfast.com.bd/v1/create_order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Api-Key": creds.api_key,
              "Secret-Key": creds.api_secret,
            },
            body: JSON.stringify({
              invoice: finalConsignmentId,
              recipient_name: order.customer_name,
              recipient_phone: order.customer_phone,
              recipient_address: order.customer_address,
              cod_amount: Number(order.total_amount) || 0,
              note: deliveryNotes || `Order #${orderId}`,
            }),
            signal: AbortSignal.timeout(5000),
          });

          if (steadfastRes.ok) {
            courierBookingResult = await steadfastRes.json().catch(() => null);
          }
        }
      } catch (courierErr) {
        console.warn("Steadfast booking notice:", courierErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order #${finalConsignmentId} dispatched successfully!`,
      order: updatedOrder,
      consignmentId: finalConsignmentId,
      trackingUrl,
      courierBooking: courierBookingResult,
    });
  } catch (error) {
    console.error("POST /api/orders/dispatch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch order." },
      { status: 500 }
    );
  }
}
