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
 * Delivery RTO Shield, and Thermal/A4 Invoicing without manual data entry.
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

    // 2. Sample 5 Products
    const starterProducts = [
      {
        name: "Classic Heavyweight Cotton T-Shirt",
        category: "Apparel",
        base_sku: "TSHIRT-BLK-M",
        price: 850,
        initial_stock: 25,
      },
      {
        name: "Wireless Noise-Canceling Earbuds",
        category: "Electronics",
        base_sku: "AUDIO-ANC-01",
        price: 2450,
        initial_stock: 15,
      },
      {
        name: "Ceramic Pour-Over Coffee Dripper Set",
        category: "Home & Kitchen",
        base_sku: "DRIP-SET-01",
        price: 1200,
        initial_stock: 20,
      },
      {
        name: "Ergonomic Silent Wireless Mouse",
        category: "Electronics",
        base_sku: "MOUSE-W-02",
        price: 1650,
        initial_stock: 18,
      },
      {
        name: "Heavy Canvas Messenger Bag",
        category: "Accessories",
        base_sku: "BAG-CANV-01",
        price: 1400,
        initial_stock: 30,
      },
    ];

    const productPayloads = starterProducts.map((p) => ({
      name: p.name,
      category: p.category,
      base_sku: p.base_sku,
      price: p.price,
      business_id: businessId,
    }));

    const { data: insertedProducts, error: prodErr } = await adminClient
      .from("products")
      .insert(productPayloads)
      .select("id, base_sku, name");

    if (prodErr) {
      console.error("Demo seeding products error:", prodErr);
      return NextResponse.json(
        { success: false, error: "Failed to create sample products." },
        { status: 500 }
      );
    }

    // 3. Generate Serialized Barcodes for Inventory Items
    const inventoryRows = [];
    const transactionRows = [];

    insertedProducts.forEach((prod) => {
      const match = starterProducts.find((p) => p.base_sku === prod.base_sku);
      const qty = match ? match.initial_stock : 10;

      for (let i = 0; i < qty; i++) {
        inventoryRows.push({
          product_id: prod.id,
          unique_barcode: `${prod.base_sku}-${generateRandomCode(5)}`,
          status: "IN_STOCK",
          business_id: businessId,
        });
      }

      transactionRows.push({
        product_id: prod.id,
        transaction_type: "IN",
        quantity: qty,
        reference_note: "Sample Starter Inventory Stock",
        business_id: businessId,
      });
    });

    if (inventoryRows.length > 0) {
      await adminClient.from("inventory_items").insert(inventoryRows);
    }
    if (transactionRows.length > 0) {
      try {
        await adminClient.from("stock_transactions").insert(transactionRows);
      } catch {}
    }

    // 4. Create 3 Sample Orders to showcase RTO Shield & Thermal Print
    const sampleOrders = [
      {
        customer_name: "Tariqul Islam",
        customer_phone: "01712-345678",
        customer_address: "House 14, Road 8, Dhanmondi, Dhaka",
        total_amount: 1700,
        status: "PENDING",
        courier: "Steadfast",
        consignment_id: `SF-${generateRandomCode(7)}`,
        business_id: businessId,
      },
      {
        customer_name: "Farhana Akter",
        customer_phone: "01819-876543",
        customer_address: "Flat 4B, Plot 22, Section 10, Mirpur, Dhaka",
        total_amount: 2450,
        status: "PACKED",
        courier: "Pathao",
        consignment_id: `PT-${generateRandomCode(7)}`,
        business_id: businessId,
      },
      {
        customer_name: "Anisur Rahman (High COD Alert)",
        customer_phone: "01911-000000",
        customer_address: "Near bazar, Village road, Narayanganj",
        total_amount: 4800,
        status: "FLAGGED_RISK",
        courier: "Steadfast",
        consignment_id: `SF-${generateRandomCode(7)}`,
        business_id: businessId,
      },
    ];

    try {
      await adminClient.from("orders").insert(sampleOrders);
    } catch (orderErr) {
      console.warn("Sample order insertion notice:", orderErr);
    }

    return NextResponse.json({
      success: true,
      message: "🎉 Success! 5 sample products and 3 test orders have been loaded.",
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
