import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { logActivity, AUDIT_ACTIONS } from "@/utils/audit-logger";

/**
 * POST /api/orders/return-exchange
 * Handles reverse logistics and inbound parcel return/exchange receiving:
 * 1. Full Return & Restock (Intact -> IN_STOCK, Damaged -> DAMAGED)
 * 2. Partial Delivery Return (Adjusted COD, partial restock)
 * 3. Exchange / Replacement (Old item restocked, replacement item deducted)
 * Logs immutable stock transactions with detailed lifecycle audit notes.
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
        { success: false, error: "Authentication required." },
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
        { success: false, error: "No merchant workspace associated with this account." },
        { status: 400 }
      );
    }

    if (roleRow?.role === "viewer") {
      return NextResponse.json(
        { success: false, error: "Permission Denied: Viewers cannot process returns or stock changes." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const {
      orderId,
      action = "full_return", // 'full_return' | 'partial_return' | 'exchange'
      condition = "INTACT", // 'INTACT' | 'DAMAGED'
      returnReason = "Customer Refused at Doorstep",
      returnNote = "",
      courierFee = 0,
      partialDeliveredQty = 1,
      partialReturnedQty = 1,
      adjustedCodAmount = 0,
      replacementProductId,
      replacementSku = "",
      replacementQuantity = 1,
    } = body || {};

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required to process return or exchange." },
        { status: 400 }
      );
    }

    // 3. Fetch existing order
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

    const consignmentNum = order.consignment_id || `ORD-${String(order.id).slice(0, 8)}`;
    const originalQty = Number(order.quantity) || 1;
    let targetStatus = "RETURNED";
    let updatedTotalAmount = order.total_amount;
    let stockInQty = originalQty;
    let lifecycleNote = "";

    // ── Scenario A: Full Return ──────────────────────────────
    if (action === "full_return") {
      targetStatus = "RETURNED";
      updatedTotalAmount = 0; // No COD collected
      stockInQty = originalQty;

      lifecycleNote = `[RETURN: ${condition}] Order #${consignmentNum} returned via ${order.courier_name || "Courier"}. Reason: ${returnReason}. Note: ${returnNote || "None"}. Condition: ${condition === "INTACT" ? "Restocked to Warehouse Shelf" : "Damaged / Defect Write-off"}`;
    }
    // ── Scenario B: Partial Delivery Return ──────────────────
    else if (action === "partial_return") {
      targetStatus = "PARTIAL_DELIVERED";
      updatedTotalAmount = Number(adjustedCodAmount) || 0;
      stockInQty = Number(partialReturnedQty) || 1;

      lifecycleNote = `[PARTIAL RETURN] Order #${consignmentNum}. Delivered: ${partialDeliveredQty} unit(s), Returned: ${stockInQty} unit(s). COD Collected: ৳${updatedTotalAmount}. Reason: ${returnReason}. Note: ${returnNote || "None"}. Condition: ${condition === "INTACT" ? "Restocked" : "Damaged"}`;
    }
    // ── Scenario C: Exchange / Replacement ──────────────────
    else if (action === "exchange") {
      targetStatus = "EXCHANGED";
      stockInQty = originalQty;

      lifecycleNote = `[EXCHANGE] Order #${consignmentNum}. Returned: ${order.product_sku || order.products?.base_sku || "Item"} (Restocked). Replacement dispatched: ${replacementSku || "Replacement SKU"} (Qty: ${replacementQuantity}). Reason: ${returnReason}. Note: ${returnNote || "None"}`;
    }

    // 4. Update Orders record (graceful column support)
    const orderUpdatePayload = {
      status: targetStatus,
      total_amount: updatedTotalAmount,
    };

    let updatedOrder = null;
    try {
      // First try updating with rich return fields if supported
      const { data: ordWithMeta, error: metaErr } = await adminClient
        .from("orders")
        .update({
          ...orderUpdatePayload,
          return_reason: returnReason,
          return_note: lifecycleNote,
          returned_at: new Date().toISOString(),
          courier_fee: Number(courierFee) || 0,
        })
        .eq("id", orderId)
        .eq("business_id", businessId)
        .select()
        .single();

      if (!metaErr && ordWithMeta) {
        updatedOrder = ordWithMeta;
      } else {
        // Fallback: standard fields
        const { data: ordBasic, error: basicErr } = await adminClient
          .from("orders")
          .update(orderUpdatePayload)
          .eq("id", orderId)
          .eq("business_id", businessId)
          .select()
          .single();

        if (basicErr) throw basicErr;
        updatedOrder = ordBasic;
      }
    } catch (dbErr) {
      console.warn("Orders table update warning:", dbErr);
      const { data: fallbackOrd } = await adminClient
        .from("orders")
        .update(orderUpdatePayload)
        .eq("id", orderId)
        .eq("business_id", businessId)
        .select()
        .single();
      updatedOrder = fallbackOrd || { ...order, ...orderUpdatePayload };
    }

    // 5. Update Inventory Items Status
    if (order.product_id) {
      if (condition === "INTACT") {
        // Restock up to stockInQty shipped items back to IN_STOCK
        const { data: shippedItems } = await adminClient
          .from("inventory_items")
          .select("id")
          .eq("order_id", orderId)
          .eq("business_id", businessId)
          .limit(stockInQty);

        if (shippedItems && shippedItems.length > 0) {
          const idsToRestock = shippedItems.map((i) => i.id);
          await adminClient
            .from("inventory_items")
            .update({
              status: "IN_STOCK",
              order_id: null,
            })
            .in("id", idsToRestock)
            .eq("business_id", businessId);
        }
      } else {
        // Mark as DAMAGED
        await adminClient
          .from("inventory_items")
          .update({
            status: "DAMAGED",
          })
          .eq("order_id", orderId)
          .eq("business_id", businessId);
      }
    }

    // 6. Insert Stock Transaction (Permanent Immutable Audit Log)
    if (order.product_id && stockInQty > 0) {
      try {
        await adminClient.from("stock_transactions").insert({
          product_id: order.product_id,
          transaction_type: condition === "INTACT" ? "IN" : "ADJUSTMENT",
          quantity: condition === "INTACT" ? stockInQty : 0,
          reference_note: lifecycleNote,
          business_id: businessId,
        });

        // If Exchange, also log the OUT transaction for the replacement item
        if (action === "exchange") {
          const repProdId = replacementProductId || order.product_id;
          await adminClient.from("stock_transactions").insert({
            product_id: repProdId,
            transaction_type: "OUT",
            quantity: Number(replacementQuantity) || 1,
            reference_note: `[EXCHANGE DISPATCH] Dispatched replacement SKU ${replacementSku} for exchanged order #${consignmentNum}`,
            business_id: businessId,
          });
        }
      } catch (txErr) {
        console.warn("Stock transaction logging notice:", txErr);
      }
    }

    // 7. Audit log activity
    logActivity({
      businessId,
      userEmail: user?.email,
      userId: user?.id,
      actionType: AUDIT_ACTIONS.STOCK_ADJUSTED || "RETURN_PROCESSED",
      details: lifecycleNote,
      metadata: {
        orderId,
        action,
        condition,
        returnReason,
        courierFee,
        stockInQty,
      },
      request,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Return/Exchange processed successfully. Stock has been adjusted.`,
      order: {
        ...updatedOrder,
        return_reason: returnReason,
        return_note: lifecycleNote,
        returned_at: new Date().toISOString(),
        courier_fee: courierFee,
      },
      lifecycleNote,
      stockAdjustedQty: condition === "INTACT" ? stockInQty : 0,
      action,
    });
  } catch (error) {
    console.error("POST /api/orders/return-exchange error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process return/exchange." },
      { status: 500 }
    );
  }
}
