import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

function generateRandomCode(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * GET /api/products
 * Fetch catalog products and real-time inventory counts for the caller's workspace.
 * Bypasses client-side RLS recursion (error 42P17).
 */
export async function GET(request) {
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

    if (!businessId) {
      const adminEmail = (
        process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
      )
        .toLowerCase()
        .trim();
      if (user.email?.toLowerCase().trim() === adminEmail) {
        const { data: firstBiz } = await adminClient
          .from("businesses")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        businessId = firstBiz?.id;
      }
    }

    if (!businessId) {
      return NextResponse.json({ success: true, products: [] });
    }

    // Fetch products
    const { data: prods, error: pErr } = await adminClient
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (pErr) {
      console.error("Products fetch error:", pErr);
      return NextResponse.json(
        { success: false, error: pErr.message },
        { status: 500 }
      );
    }

    const prodList = prods || [];
    const prodIds = prodList.map((p) => p.id);
    const inStockCountMap = {};
    const totalItemsMap = {};

    if (prodIds.length > 0) {
      const { data: items } = await adminClient
        .from("inventory_items")
        .select("product_id, status")
        .in("product_id", prodIds);

      if (items) {
        items.forEach((item) => {
          totalItemsMap[item.product_id] =
            (totalItemsMap[item.product_id] || 0) + 1;
          if (item.status === "IN_STOCK") {
            inStockCountMap[item.product_id] =
              (inStockCountMap[item.product_id] || 0) + 1;
          }
        });
      }
    }

    const enriched = prodList.map((p) => ({
      ...p,
      inStockCount: inStockCountMap[p.id] ?? 0,
      totalCount: totalItemsMap[p.id] ?? 0,
    }));

    return NextResponse.json({
      success: true,
      products: enriched,
    });
  } catch (error) {
    console.error("GET /api/products exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load products." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Add product and generate serialized barcodes.
 */
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

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (roleRow?.role === "viewer") {
      return NextResponse.json(
        { success: false, error: "Permission Denied: Viewers cannot create products." },
        { status: 403 }
      );
    }

    let businessId = roleRow?.business_id;
    if (!businessId) {
      const adminEmail = (
        process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
      )
        .toLowerCase()
        .trim();
      if (user.email?.toLowerCase().trim() === adminEmail) {
        const { data: firstBiz } = await adminClient
          .from("businesses")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        businessId = firstBiz?.id || "00000000-0000-0000-0000-000000000001";
      }
    }

    const body = await request.json();
    const { name, category, base_sku, price, quantity } = body || {};

    const trimmedName = String(name || "").trim();
    const trimmedCategory = String(category || "General").trim();
    const formattedSku = String(base_sku || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(quantity, 10);

    if (!trimmedName || !formattedSku || isNaN(parsedPrice) || isNaN(parsedQty) || parsedQty < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid product parameters." },
        { status: 400 }
      );
    }

    // Insert into products
    const { data: product, error: prodErr } = await adminClient
      .from("products")
      .insert({
        name: trimmedName,
        category: trimmedCategory,
        base_sku: formattedSku,
        price: parsedPrice,
        business_id: businessId,
      })
      .select()
      .single();

    if (prodErr || !product) {
      return NextResponse.json(
        { success: false, error: prodErr?.message || "Failed to create product." },
        { status: 500 }
      );
    }

    // Generate barcodes and insert into inventory_items
    const inventoryRows = [];
    const usedBarcodes = new Set();

    for (let i = 0; i < parsedQty; i++) {
      let uniqueBarcode;
      do {
        uniqueBarcode = `${formattedSku}-${generateRandomCode(5)}`;
      } while (usedBarcodes.has(uniqueBarcode));

      usedBarcodes.add(uniqueBarcode);
      inventoryRows.push({
        product_id: product.id,
        unique_barcode: uniqueBarcode,
        status: "IN_STOCK",
        business_id: businessId,
      });
    }

    const { error: itemsErr } = await adminClient
      .from("inventory_items")
      .insert(inventoryRows);

    if (itemsErr) {
      console.warn("Inventory items insertion notice:", itemsErr);
    }

    // Log stock transaction
    try {
      await adminClient.from("stock_transactions").insert({
        product_id: product.id,
        transaction_type: "IN",
        quantity: parsedQty,
        reference_note: `Manual Product Intake (${parsedQty} units)`,
        business_id: businessId,
      });
    } catch (txErr) {
      console.warn("Stock transaction notice:", txErr);
    }

    return NextResponse.json({
      success: true,
      product,
      itemsCount: inventoryRows.length,
    });
  } catch (error) {
    console.error("POST /api/products exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add product." },
      { status: 500 }
    );
  }
}
