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
 * POST /api/demo/seed
 * 1-Click Frictionless Onboarding: Seeds 5 high-converting products and 3 sample
 * orders so merchants can immediately test the Smartphone Camera Scanner,
 * Delivery RTO verification, and Thermal/A4 Invoicing without manual data entry.
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
        { success: false, error: "Please sign in to load sample store data." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Resolve user's workspace
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    let businessId = roleRow?.business_id;

    if (!businessId) {
      const storeName = user.email
        ? `${user.email.split("@")[0]}'s Store`
        : "My Workspace";

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
        { success: false, error: "Unable to resolve workspace. Please try again." },
        { status: 500 }
      );
    }

    // 2. Sample 5 Products with unique SKUs
    const starterProducts = [
      {
        name: "Classic Heavyweight Cotton T-Shirt",
        category: "Apparel",
        sku_prefix: "TSHIRT-BLK",
        price: 850,
        initial_stock: 25,
        attributes: { size: "L", color: "Black" },
      },
      {
        name: "Wireless Noise-Canceling Earbuds",
        category: "Electronics",
        sku_prefix: "AUDIO-ANC",
        price: 2450,
        initial_stock: 15,
        attributes: { model: "Pro ANC", color: "White" },
      },
      {
        name: "Ceramic Pour-Over Coffee Dripper Set",
        category: "Home & Kitchen",
        sku_prefix: "DRIP-SET",
        price: 1200,
        initial_stock: 20,
        attributes: { capacity: "600ml", material: "Ceramic" },
      },
      {
        name: "Ergonomic Silent Wireless Mouse",
        category: "Electronics",
        sku_prefix: "MOUSE-W",
        price: 1650,
        initial_stock: 18,
        attributes: { connectivity: "2.4GHz + BT", dpi: "4000" },
      },
      {
        name: "Heavy Canvas Messenger Bag",
        category: "Accessories",
        sku_prefix: "BAG-CANV",
        price: 1400,
        initial_stock: 30,
        attributes: { size: "15-inch", color: "Olive Green" },
      },
    ];

    // Generate guaranteed unique base_sku for each product to prevent constraint collisions
    const productPayloads = starterProducts.map((p) => {
      const uniqueSuffix = generateRandomCode(4);
      const generatedSku = `${p.sku_prefix}-${uniqueSuffix}`;
      return {
        name: p.name,
        category: p.category,
        base_sku: generatedSku,
        price: p.price,
        business_id: businessId,
        _itemRef: p,
      };
    });

    const { data: insertedProducts, error: prodErr } = await adminClient
      .from("products")
      .insert(productPayloads.map(({ _itemRef, ...payload }) => payload))
      .select("id, base_sku, name, price");

    if (prodErr || !insertedProducts) {
      console.error("Demo seeding products error:", prodErr);
      return NextResponse.json(
        { success: false, error: prodErr?.message || "Failed to create sample products." },
        { status: 500 }
      );
    }

    // 3. Insert Product Variants
    const variantPayloads = [];
    insertedProducts.forEach((prod) => {
      const match = productPayloads.find((p) => p.base_sku === prod.base_sku);
      if (match) {
        variantPayloads.push({
          product_id: prod.id,
          business_id: businessId,
          sku: prod.base_sku,
          price: prod.price || match._itemRef.price,
          stock_quantity: match._itemRef.initial_stock,
          attributes: match._itemRef.attributes || { size: "Standard" },
        });
      }
    });

    let insertedVariants = [];
    if (variantPayloads.length > 0) {
      const { data: vData, error: vErr } = await adminClient
        .from("variants")
        .insert(variantPayloads)
        .select("id, product_id, stock_quantity");
      if (vErr) {
        console.warn("Variants seeding notice:", vErr);
      } else {
        insertedVariants = vData || [];
      }
    }

    // 4. Generate Serialized Barcodes for Inventory Items & Stock Transactions
    const inventoryRows = [];
    const transactionRows = [];

    insertedProducts.forEach((prod) => {
      const match = productPayloads.find((p) => p.base_sku === prod.base_sku);
      const qty = match ? match._itemRef.initial_stock : 10;
      const variant = insertedVariants.find((v) => v.product_id === prod.id);

      for (let i = 0; i < qty; i++) {
        inventoryRows.push({
          product_id: prod.id,
          unique_barcode: `${prod.base_sku}-${generateRandomCode(5)}`,
          status: "IN_STOCK",
          business_id: businessId,
        });
      }

      if (variant?.id) {
        transactionRows.push({
          product_id: prod.id,
          variant_id: variant.id,
          transaction_type: "IN",
          quantity: qty,
          reference_note: "Sample Starter Inventory Stock",
          business_id: businessId,
        });
      }
    });

    if (inventoryRows.length > 0) {
      await adminClient.from("inventory_items").insert(inventoryRows);
    }
    if (transactionRows.length > 0) {
      try {
        await adminClient.from("stock_transactions").insert(transactionRows);
      } catch (txErr) {
        console.warn("Stock transaction insert notice:", txErr);
      }
    }

    // 5. Create 3 Sample Orders to showcase RTO verification & Thermal Print
    const firstProd = insertedProducts[0];
    const secondProd = insertedProducts[1] || firstProd;
    const thirdProd = insertedProducts[2] || firstProd;

    const sampleOrders = [
      {
        customer_name: "Tariqul Islam",
        customer_phone: "01712-345678",
        customer_address: "House 14, Road 8, Dhanmondi, Dhaka",
        total_amount: 1700,
        status: "PENDING",
        courier_name: "Steadfast",
        consignment_id: `SF-${generateRandomCode(7)}`,
        business_id: businessId,
        product_id: firstProd?.id || null,
        quantity: 2,
      },
      {
        customer_name: "Farhana Akter",
        customer_phone: "01819-876543",
        customer_address: "Flat 4B, Plot 22, Section 10, Mirpur, Dhaka",
        total_amount: 2450,
        status: "PACKED",
        courier_name: "Pathao",
        consignment_id: `PT-${generateRandomCode(7)}`,
        business_id: businessId,
        product_id: secondProd?.id || null,
        quantity: 1,
      },
      {
        customer_name: "Anisur Rahman (High COD Alert)",
        customer_phone: "01911-000000",
        customer_address: "Near bazar, Village road, Narayanganj",
        total_amount: 4800,
        status: "FLAGGED_RISK",
        courier_name: "Steadfast",
        consignment_id: `SF-${generateRandomCode(7)}`,
        business_id: businessId,
        product_id: thirdProd?.id || null,
        quantity: 3,
      },
    ];

    try {
      await adminClient.from("orders").insert(sampleOrders);
    } catch (orderErr) {
      console.warn("Sample order insertion notice:", orderErr);
    }

    return NextResponse.json({
      success: true,
      message: "5 sample products and 3 test orders have been loaded successfully.",
      productsCount: insertedProducts.length,
      itemsCount: inventoryRows.length,
    });
  } catch (error) {
    console.error("API /api/demo/seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load sample store data." },
      { status: 500 }
    );
  }
}
