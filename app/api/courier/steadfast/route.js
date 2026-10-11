import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      order_id,
      customer_name,
      customer_phone,
      customer_address,
      amount_to_collect,
      invoice_note,
    } = body;

    // Validate required fields
    if (!order_id || !customer_name || !customer_phone || !customer_address) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required order details (order_id, customer_name, customer_phone, customer_address).",
        },
        { status: 400 }
      );
    }

    // Initialize Supabase Server Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Server missing Supabase configuration credentials." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Fetch Steadfast API credentials from courier_settings
    const { data: settings, error: settingsError } = await supabase
      .from("courier_settings")
      .select("api_key, api_secret")
      .eq("courier_name", "Steadfast")
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        {
          success: false,
          error: `Error querying courier settings: ${settingsError.message}`,
        },
        { status: 500 }
      );
    }

    if (!settings || !settings.api_key || !settings.api_secret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Steadfast credentials (api_key, api_secret) not configured in courier_settings table.",
        },
        { status: 400 }
      );
    }

    // 2. Prepare Steadfast payload
    const steadfastPayload = {
      invoice: String(order_id),
      recipient_name: customer_name,
      recipient_phone: customer_phone,
      recipient_address: customer_address,
      cod_amount: Number(amount_to_collect) || 0,
      note: invoice_note || "",
    };

    // 3. Make POST request to Steadfast API
    const steadfastRes = await fetch("https://api.steadfast.com.bd/v1/create_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": settings.api_key,
        "Secret-Key": settings.api_secret,
      },
      body: JSON.stringify(steadfastPayload),
    });

    const responseData = await steadfastRes.json().catch(() => null);

    // 4. Validate Steadfast response
    const isSuccess =
      steadfastRes.ok &&
      (responseData?.status === 200 ||
        responseData?.status === "200" ||
        Boolean(responseData?.consignment));

    if (!isSuccess) {
      const errorDetail =
        (typeof responseData?.errors === "object"
          ? JSON.stringify(responseData.errors)
          : responseData?.errors) ||
        responseData?.message ||
        "Steadfast API rejected order creation.";

      return NextResponse.json(
        {
          success: false,
          error: errorDetail,
          details: responseData,
        },
        { status: steadfastRes.status >= 400 ? steadfastRes.status : 400 }
      );
    }

    // 5. Extract consignment details & tracking info
    const consignment = responseData?.consignment || responseData?.data || {};
    const consignmentId = consignment?.consignment_id || consignment?.id || null;
    const trackingCode = consignment?.tracking_code || consignmentId;
    const trackingUrl =
      consignment?.tracking_url ||
      (trackingCode ? `https://steadfast.com.bd/tracking/${trackingCode}` : null);

    // 6. Update orders table with consignment_id and tracking_url
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        consignment_id: consignmentId ? String(consignmentId) : null,
        tracking_url: trackingUrl,
      })
      .eq("id", order_id);

    if (updateOrderError) {
      console.error("Steadfast order created but failed to update orders table:", updateOrderError);
    }

    return NextResponse.json({
      success: true,
      message: "Consignment created successfully",
      consignment_id: consignmentId,
      tracking_code: trackingCode,
      tracking_url: trackingUrl,
      consignment,
    });
  } catch (err) {
    console.error("Internal error in Steadfast courier route:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error occurred while processing Steadfast courier request.",
      },
      { status: 500 }
    );
  }
}
