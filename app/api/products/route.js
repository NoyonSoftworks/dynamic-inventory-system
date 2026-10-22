import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getProductsMeta, getProductMeta, saveProductMeta } from "@/utils/products-meta";

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

    if (!businessId && user.email) {
      const { data: byEmail } = await adminClient
        .from("user_roles")
        .select("role, business_id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (byEmail?.business_id) businessId = byEmail.business_id;
    }

    if (!businessId) {
      return NextResponse.json({ success: true, products: [] });
    }

    const { searchParams } = new URL(request.url);
    const targetProductId = searchParams.get("id");

    // If single product requested (for dispatch or print barcode label views)
    if (targetProductId) {
      const { data: singleProd, error: sErr } = await adminClient
        .from("products")
        .select("*")
        .eq("id", targetProductId)
        .maybeSingle();

      if (sErr || !singleProd) {
        return NextResponse.json(
          { success: false, error: sErr?.message || "Product not found." },
          { status: 404 }
        );
      }

      const { data: invItems } = await adminClient
        .from("inventory_items")
        .select("*")
        .eq("product_id", targetProductId);

      const meta = getProductMeta(targetProductId) || {};

      return NextResponse.json({
        success: true,
        product: {
          ...singleProd,
          ...meta,
        },
        items: invItems || [],
      });
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

    const allMeta = getProductsMeta();

    const enriched = prodList.map((p) => {
      const m = allMeta[p.id] || {};
      const inStock = inStockCountMap[p.id] ?? 0;
      const costPrice = m.cost_price !== undefined && m.cost_price !== null ? Number(m.cost_price) : null;
      const sellingPrice = p.price !== undefined && p.price !== null ? Number(p.price) : 0;
      const profitMargin = costPrice !== null ? Math.max(0, sellingPrice - costPrice) : null;
      const profitPercentage = costPrice !== null && sellingPrice > 0 ? Math.round((profitMargin / sellingPrice) * 100) : null;
      const lowThreshold = m.low_stock_threshold || 5;

      return {
        ...p,
        inStockCount: inStock,
        totalCount: totalItemsMap[p.id] ?? 0,
        cost_price: costPrice,
        image_url: m.image_url || null,
        weight_kg: m.weight_kg !== undefined ? Number(m.weight_kg) : 0.3,
        low_stock_threshold: lowThreshold,
        rack_location: m.rack_location || null,
        supplier: m.supplier || null,
        description: m.description || null,
        has_variants: m.has_variants || false,
        variants: m.variants || [],
        profit_margin: profitMargin,
        profit_percentage: profitPercentage,
        is_low_stock: inStock > 0 && inStock <= lowThreshold,
        is_out_of_stock: inStock === 0,
      };
    });

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
      const storeName = user.email ? `${user.email.split("@")[0]}'s Store` : "My Workspace";
      const { data: newBiz } = await adminClient
        .from("businesses")
        .insert({ name: storeName })
        .select("id")
        .single();
      if (newBiz) {
        businessId = newBiz.id;
        await adminClient.from("user_roles").upsert({
          id: user.id,
          email: user.email,
          role: "admin",
          business_id: newBiz.id,
        });
      }
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "Missing business workspace context." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      base_sku,
      price,
      cost_price,
      quantity,
      image_url,
      weight_kg,
      low_stock_threshold,
      rack_location,
      supplier,
      description,
      barcode_type,
      variants,
    } = body || {};

    const trimmedName = String(name || "").trim();
    const trimmedCategory = String(category || "General").trim();
    const formattedSku = String(base_sku || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const parsedPrice = parseFloat(price);
    const parsedCostPrice = cost_price !== undefined && cost_price !== null && cost_price !== "" ? parseFloat(cost_price) : null;
    const parsedQty = parseInt(quantity, 10);
    const parsedWeight = weight_kg !== undefined && weight_kg !== null && weight_kg !== "" ? parseFloat(weight_kg) : 0.3;
    const parsedThreshold = low_stock_threshold ? parseInt(low_stock_threshold, 10) : 5;

    if (!trimmedName || !formattedSku || isNaN(parsedPrice) || isNaN(parsedQty) || parsedQty < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid product parameters." },
        { status: 400 }
      );
    }

    // Insert into products table
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
    const isUniform = barcode_type === "UNIFORM";

    for (let i = 0; i < parsedQty; i++) {
      let uniqueBarcode;
      if (isUniform) {
        uniqueBarcode = `${formattedSku}-${String(i + 1).padStart(3, "0")}`;
      } else {
        do {
          uniqueBarcode = `${formattedSku}-${generateRandomCode(5)}`;
        } while (usedBarcodes.has(uniqueBarcode));
      }

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

    // Insert variants if provided
    if (Array.isArray(variants) && variants.length > 0) {
      try {
        const variantRows = variants.map((v, idx) => ({
          product_id: product.id,
          sku: v.sku || `${formattedSku}-${v.size || ""}-${v.color || ""}`.replace(/-+$/, "") || `${formattedSku}-V${idx + 1}`,
          price: v.price ? parseFloat(v.price) : parsedPrice,
          stock_quantity: v.quantity ? parseInt(v.quantity, 10) : 0,
          attributes: {
            size: v.size || null,
            color: v.color || null,
            cost_price: v.cost_price ? parseFloat(v.cost_price) : parsedCostPrice,
          },
          business_id: businessId,
        }));

        await adminClient.from("variants").insert(variantRows);
      } catch (vErr) {
        console.warn("Variants insertion notice:", vErr);
      }
    }

    // Save extended metadata (cost, image, weight, shelf rack, supplier, description)
    const savedMeta = saveProductMeta(product.id, {
      cost_price: parsedCostPrice,
      image_url: image_url ? String(image_url).trim() : null,
      weight_kg: isNaN(parsedWeight) ? 0.3 : parsedWeight,
      low_stock_threshold: isNaN(parsedThreshold) ? 5 : parsedThreshold,
      rack_location: rack_location ? String(rack_location).trim() : null,
      supplier: supplier ? String(supplier).trim() : null,
      description: description ? String(description).trim() : null,
      barcode_type: isUniform ? "UNIFORM" : "SERIALIZED",
      has_variants: Array.isArray(variants) && variants.length > 0,
      variants: Array.isArray(variants) ? variants : [],
    });

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

    const profitMargin = parsedCostPrice !== null ? Math.max(0, parsedPrice - parsedCostPrice) : null;
    const profitPercentage = parsedCostPrice !== null && parsedPrice > 0 ? Math.round((profitMargin / parsedPrice) * 100) : null;

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        ...savedMeta,
        profit_margin: profitMargin,
        profit_percentage: profitPercentage,
      },
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
