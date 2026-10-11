import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Dummy webhook secret key (can be overridden via CMS_WEBHOOK_API_KEY in .env.local)
const EXPECTED_API_KEY = process.env.CMS_WEBHOOK_API_KEY || "sk_live_123456789";

export async function POST(request) {
  try {
    // 1. Authentication: Validate x-api-key header
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== EXPECTED_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing x-api-key header.",
        },
        { status: 401 }
      );
    }

    // 2. Parse & validate request payload
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON payload in request body.",
        },
        { status: 400 }
      );
    }

    const {
      source,
      external_order_id,
      customer_name,
      customer_phone,
      customer_address,
      total_amount,
      items,
    } = body || {};

    if (!customer_name || !customer_phone || !customer_address) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required customer information (customer_name, customer_phone, customer_address).",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Payload must contain at least one item in the 'items' array.",
        },
        { status: 400 }
      );
    }

    // 3. Extract the first item's SKU and quantity
    const firstItem = items[0];
    const targetSku = firstItem?.sku?.toString().trim();
    const itemQuantity = Number(firstItem?.quantity) || 1;

    if (!targetSku) {
      return NextResponse.json(
        {
          success: false,
          error: "The first item in 'items' must specify a valid 'sku'.",
        },
        { status: 400 }
      );
    }

    // 4. Initialize Supabase Server Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase credentials are not configured on server.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 5. Look up product_id from products table where base_sku = sku
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, base_sku, price, business_id")
      .eq("base_sku", targetSku)
      .maybeSingle();

    if (productError) {
      return NextResponse.json(
        {
          success: false,
          error: `Database error querying products: ${productError.message}`,
        },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: `Product with SKU "${targetSku}" not found in inventory.`,
        },
        { status: 404 }
      );
    }

    // 6. Build Order Record
    // Set status to PENDING_DISPATCH and leave courier/consignment_id null
    const orderPayload = {
      customer_name: customer_name.toString().trim(),
      customer_phone: customer_phone.toString().trim(),
      customer_address: customer_address.toString().trim(),
      total_amount: Number(total_amount) || 0,
      product_id: product.id,
      quantity: itemQuantity,
      status: "PENDING_DISPATCH",
      courier: null,
      consignment_id: null,
    };

    if (product.business_id) {
      orderPayload.business_id = product.business_id;
    }

    // 7. Insert into orders table with graceful fallback for optional columns
    let { data: newOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (insertError && insertError.message?.includes("business_id")) {
      delete orderPayload.business_id;
      const retry = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();
      newOrder = retry.data;
      insertError = retry.error;
    }

    if (insertError || !newOrder) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to insert order: ${insertError?.message || "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    // 8. Return 200 OK JSON response
    return NextResponse.json(
      {
        success: true,
        message: "Order received and queued successfully for physical dispatch.",
        order_id: newOrder.id,
        external_order_id: external_order_id || null,
        source: source || "webhook",
        product: {
          id: product.id,
          name: product.name,
          sku: product.base_sku,
        },
        status: "PENDING_DISPATCH",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Universal CMS webhook error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An unexpected error occurred processing the webhook.",
      },
      { status: 500 }
    );
  }
}
