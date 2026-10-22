import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    let supabase = null;
    let user = null;

    try {
      supabase = await createClient();
      const authRes = await supabase.auth.getUser();
      user = authRes.data?.user || null;
    } catch (e) {
      // In dynamic environment or when cookies() is unavailable
    }

    if (!user) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : request.cookies?.get?.("sb-access-token")?.value;
      if (token) {
        const adminAuthClient = createAdminClient();
        const { data: fbData } = await adminAuthClient.auth.getUser(token);
        if (fbData?.user) user = fbData.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = (searchParams.get("code") || "").trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Code parameter is required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Resolve user's workspace
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    let businessId = roleRow?.business_id;

    if (!businessId) {
      return NextResponse.json({
        success: true,
        found: false,
        code,
      });
    }

    let product = null;
    let matchedItem = null;

    // 1. Direct match on products.base_sku
    let prodQuery = adminClient
      .from("products")
      .select("id, name, category, base_sku, price, business_id")
      .ilike("base_sku", code);

    if (businessId) {
      prodQuery = prodQuery.eq("business_id", businessId);
    }

    const { data: prodData } = await prodQuery.maybeSingle();

    if (prodData) {
      product = prodData;
    } else {
      // 2. Match on serialized inventory_items.unique_barcode
      let itemQuery = adminClient
        .from("inventory_items")
        .select("id, product_id, unique_barcode, status, business_id")
        .eq("unique_barcode", code);

      if (businessId) {
        itemQuery = itemQuery.eq("business_id", businessId);
      }

      const { data: itemData } = await itemQuery.maybeSingle();

      if (itemData) {
        matchedItem = itemData;
        const { data: linkedProd } = await adminClient
          .from("products")
          .select("id, name, category, base_sku, price, business_id")
          .eq("id", itemData.product_id)
          .maybeSingle();
        product = linkedProd;
      }
    }

    if (!product) {
      return NextResponse.json({
        success: true,
        found: false,
        code,
      });
    }

    // 3. Count in-stock units
    const { data: stockItems } = await adminClient
      .from("inventory_items")
      .select("id, status")
      .eq("product_id", product.id)
      .eq("status", "IN_STOCK");

    const availableStock = stockItems?.length || 0;

    return NextResponse.json({
      success: true,
      found: true,
      product,
      matchedItem,
      availableStock,
    });
  } catch (error) {
    console.error("API /api/products/lookup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lookup failed." },
      { status: 500 }
    );
  }
}
