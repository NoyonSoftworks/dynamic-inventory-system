import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getTenantConfig } from "@/utils/storage/tenant-store";

/**
 * Clean and normalize phone numbers for Bangladesh
 */
function normalizePhone(raw) {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    return digits.substring(2);
  }
  return digits;
}

/**
 * Generate clean random consignment ID
 */
function makeConsignmentId(courier = "SF") {
  const prefix = courier.toLowerCase().includes("pathao")
    ? "PT"
    : courier.toLowerCase().includes("redx")
    ? "RDX"
    : "SF";
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

/**
 * POST /api/orders/bulk-import
 * Multi-tenant daily orders importer and live website orders synchronization.
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
        { success: false, error: "Authentication required to manage orders." },
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
        { success: false, error: "Permission Denied: Viewers cannot create or import orders." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const {
      action = "batch_upload",
      orders = [],
      websiteUrl,
      order,
      consumerKey = "",
      consumerSecret = "",
      shopifyToken = "",
    } = body || {};

    // Load merchant's product catalog to match SKUs & IDs
    const { data: catalogProducts } = await adminClient
      .from("products")
      .select("id, name, base_sku, price")
      .eq("business_id", businessId);

    const productsList = catalogProducts || [];

    function findProduct(skuOrName) {
      if (!skuOrName) return null;
      const clean = String(skuOrName).trim().toLowerCase();
      // Match exact SKU
      let found = productsList.find(
        (p) => p.base_sku && p.base_sku.toLowerCase() === clean
      );
      if (found) return found;

      // Match partial SKU
      found = productsList.find(
        (p) => p.base_sku && p.base_sku.toLowerCase().includes(clean)
      );
      if (found) return found;

      // Match product name
      found = productsList.find(
        (p) => p.name && p.name.toLowerCase().includes(clean)
      );
      return found || null;
    }

    // ── Mode 1: Quick Add Single Order ────────────────────────
    if (action === "single_order" && order) {
      const customerName = String(order.customer_name || "Valued Customer").trim();
      const customerPhone = normalizePhone(order.customer_phone);
      const customerAddress = String(order.customer_address || "Dhaka, Bangladesh").trim();
      const matchedProd = findProduct(order.sku || order.product_id || order.product_name) || productsList[0];
      const qty = Math.max(1, Number(order.quantity) || 1);
      const totalAmount = Number(order.total_amount) || (matchedProd ? Number(matchedProd.price) * qty : 1000);
      const courierName = order.courier_name || "Steadfast Courier";

      const orderPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        courier_name: courierName,
        status: "PENDING_DISPATCH",
        consignment_id: order.consignment_id || makeConsignmentId(courierName),
        business_id: businessId,
        product_id: matchedProd?.id || null,
        quantity: qty,
        total_amount: totalAmount,
      };

      const { data: createdOrder, error: insErr } = await adminClient
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (insErr) {
        throw new Error(insErr.message || "Failed to create order record.");
      }

      return NextResponse.json({
        success: true,
        message: "Order created and queued for dispatch.",
        order: createdOrder,
      });
    }

    // ── Mode 2: Fetch Orders from Live Store Website ──────────
    if (action === "fetch_from_website") {
      const conf = getTenantConfig(businessId) || {};
      const targetUrl = websiteUrl || conf.website_url;

      if (!targetUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "No store website configured. Please provide your store website URL.",
          },
          { status: 400 }
        );
      }

      let normalizedBase = String(targetUrl).trim();
      if (!normalizedBase.startsWith("http://") && !normalizedBase.startsWith("https://")) {
        normalizedBase = `https://${normalizedBase}`;
      }
      normalizedBase = normalizedBase.replace(/\/+$/, "");

      const fetchedOrders = [];

      // 1. Try WooCommerce REST API Feed (Authenticated or Public)
      try {
        let wooUrl = `${normalizedBase}/wp-json/wc/v3/orders?status=processing,pending,on-hold&per_page=50`;
        const wooHeaders = {
          "User-Agent": "Mozilla/5.0 SmartInventory-OrderSync/2.0",
          Accept: "application/json",
        };

        if (consumerKey && consumerSecret) {
          const credentials = Buffer.from(
            `${consumerKey.trim()}:${consumerSecret.trim()}`
          ).toString("base64");
          wooHeaders["Authorization"] = `Basic ${credentials}`;
          wooUrl += `&consumer_key=${encodeURIComponent(consumerKey.trim())}&consumer_secret=${encodeURIComponent(consumerSecret.trim())}`;
        }

        const res = await fetch(wooUrl, {
          headers: wooHeaders,
          signal: AbortSignal.timeout(9000),
        });

        if (res.ok) {
          const wooData = await res.json().catch(() => null);
          if (Array.isArray(wooData) && wooData.length > 0) {
            wooData.forEach((wo) => {
              const billing = wo.billing || {};
              const shipping = wo.shipping || {};
              const item = wo.line_items?.[0] || {};
              const customerName = `${billing.first_name || shipping.first_name || "Customer"} ${billing.last_name || shipping.last_name || ""}`.trim();
              const phone = normalizePhone(billing.phone || shipping.phone || "");
              const address = `${billing.address_1 || shipping.address_1 || ""}, ${billing.city || shipping.city || ""}`.trim() || "Address not provided";
              const matched = findProduct(item.sku || item.name) || productsList[0];

              fetchedOrders.push({
                customer_name: customerName,
                customer_phone: phone || "01700000000",
                customer_address: address,
                courier_name: "Steadfast Courier",
                status: "PENDING_DISPATCH",
                consignment_id: `WC-${wo.id || Math.floor(1000 + Math.random() * 9000)}`,
                business_id: businessId,
                product_id: matched?.id || null,
                quantity: Math.max(1, Number(item.quantity) || 1),
                total_amount: Math.round(Number(wo.total) || 1200),
              });
            });
          }
        }
      } catch (wooErr) {
        // Continue to Shopify
      }

      // 2. Try Shopify Store Orders API if Shopify token provided
      if (fetchedOrders.length === 0 && shopifyToken) {
        try {
          const shopifyUrl = `${normalizedBase}/admin/api/2024-01/orders.json?status=open&limit=50`;
          const sRes = await fetch(shopifyUrl, {
            headers: {
              "X-Shopify-Access-Token": shopifyToken.trim(),
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(9000),
          });

          if (sRes.ok) {
            const sData = await sRes.json().catch(() => null);
            if (Array.isArray(sData?.orders) && sData.orders.length > 0) {
              sData.orders.forEach((so) => {
                const customer = so.customer || {};
                const shipping = so.shipping_address || {};
                const item = so.line_items?.[0] || {};
                const customerName = `${shipping.first_name || customer.first_name || "Customer"} ${shipping.last_name || customer.last_name || ""}`.trim();
                const phone = normalizePhone(shipping.phone || customer.phone || "");
                const address = `${shipping.address1 || ""}, ${shipping.city || ""}`.trim() || "Address not provided";
                const matched = findProduct(item.sku || item.name) || productsList[0];

                fetchedOrders.push({
                  customer_name: customerName,
                  customer_phone: phone || "01700000000",
                  customer_address: address,
                  courier_name: "Steadfast Courier",
                  status: "PENDING_DISPATCH",
                  consignment_id: `SHP-${so.order_number || so.id}`,
                  business_id: businessId,
                  product_id: matched?.id || null,
                  quantity: Math.max(1, Number(item.quantity) || 1),
                  total_amount: Math.round(Number(so.total_price) || 1500),
                });
              });
            }
          }
        } catch (sErr) {
          // Ignore
        }
      }

      // STRICT INTEGRITY: If no orders found, DO NOT inject fake data!
      if (fetchedOrders.length === 0) {
        return NextResponse.json(
          {
            success: false,
            count: 0,
            error: `Could not retrieve unfulfilled orders from ${targetUrl}. For WooCommerce stores, please provide your Consumer Key (ck_...) & Secret (cs_...). For Shopify, provide an Access Token. You can also upload your daily spreadsheet directly via CSV.`,
          },
          { status: 404 }
        );
      }

      // Check existing consignment_ids to prevent duplicate order imports
      const incomingConsignments = fetchedOrders.map((o) => o.consignment_id);
      const { data: existingList } = await adminClient
        .from("orders")
        .select("consignment_id")
        .eq("business_id", businessId)
        .in("consignment_id", incomingConsignments);

      const existingSet = new Set((existingList || []).map((e) => e.consignment_id));
      const freshOrders = fetchedOrders.filter((o) => !existingSet.has(o.consignment_id));

      if (freshOrders.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          orders: [],
          message: `All ${fetchedOrders.length} orders from ${targetUrl} have already been imported previously into your dispatch queue.`,
        });
      }

      // Insert real fetched orders into database
      const { data: inserted, error: batchErr } = await adminClient
        .from("orders")
        .insert(freshOrders)
        .select();

      if (batchErr) {
        throw new Error(batchErr.message || "Failed to save website orders.");
      }

      return NextResponse.json({
        success: true,
        count: inserted?.length || 0,
        orders: inserted || [],
        message: `Successfully synchronized ${inserted?.length || 0} real unfulfilled orders from ${targetUrl} into dispatch queue.`,
        source: "Store Website Sync",
      });
    }

    // ── Mode 3: Batch Upload / CSV Import ───────────────────────
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide an array of orders to import." },
        { status: 400 }
      );
    }

    const preparedOrders = orders.map((rawOrder, idx) => {
      const customerName = String(
        rawOrder.customer_name || rawOrder["Customer Name"] || rawOrder["Name"] || "Buyer"
      ).trim();

      const customerPhone = normalizePhone(
        rawOrder.customer_phone || rawOrder["Customer Phone"] || rawOrder["Phone"] || rawOrder["Mobile"] || "01700000000"
      );

      const customerAddress = String(
        rawOrder.customer_address || rawOrder["Delivery Address"] || rawOrder["Address"] || "Dhaka, Bangladesh"
      ).trim();

      const skuOrName =
        rawOrder.sku ||
        rawOrder["SKU"] ||
        rawOrder["Base SKU"] ||
        rawOrder.product_name ||
        rawOrder["Product Name"] ||
        rawOrder["Item"] ||
        "";

      const matchedProd = findProduct(skuOrName) || productsList[0];
      const qty = Math.max(1, Number(rawOrder.quantity || rawOrder["Quantity"] || rawOrder["Qty"]) || 1);

      const rawAmount =
        rawOrder.total_amount ||
        rawOrder["Total Amount"] ||
        rawOrder["Amount"] ||
        rawOrder["Price"] ||
        rawOrder["COD"] ||
        0;

      const totalAmount =
        Number(rawAmount) > 0
          ? Number(rawAmount)
          : matchedProd
          ? Number(matchedProd.price) * qty
          : 1200;

      const courierName =
        rawOrder.courier_name ||
        rawOrder["Courier"] ||
        rawOrder["Courier Name"] ||
        "Steadfast Courier";

      const consignmentId =
        rawOrder.consignment_id ||
        rawOrder["Order ID"] ||
        rawOrder["Invoice"] ||
        makeConsignmentId(courierName);

      return {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        courier_name: courierName,
        status: "PENDING_DISPATCH",
        consignment_id: String(consignmentId).trim(),
        business_id: businessId,
        product_id: matchedProd?.id || null,
        quantity: qty,
        total_amount: Math.round(totalAmount),
      };
    });

    const { data: insertedOrders, error: batchError } = await adminClient
      .from("orders")
      .insert(preparedOrders)
      .select();

    if (batchError) {
      console.error("Batch orders insert error:", batchError);
      throw new Error(batchError.message || "Failed to insert orders batch.");
    }

    return NextResponse.json({
      success: true,
      count: insertedOrders?.length || preparedOrders.length,
      orders: insertedOrders,
      message: `Successfully imported ${insertedOrders?.length || preparedOrders.length} daily orders into dispatch queue.`,
    });
  } catch (error) {
    console.error("POST /api/orders/bulk-import error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process orders." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/bulk-import
 * Removes orders or clears demo/sync orders safely scoped to business_id.
 */
export async function DELETE(request) {
  try {
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
        { success: false, error: "Authentication required to delete orders." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Resolve business
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
        { success: false, error: "No merchant workspace found." },
        { status: 400 }
      );
    }

    if (roleRow?.role === "viewer") {
      return NextResponse.json(
        { success: false, error: "Permission Denied: Viewers cannot delete orders." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const { orderId, orderIds, clearTestOrders } = body || {};

    if (clearTestOrders) {
      // Clear any orders matching SYNC- or demo/sample IDs
      const { data: deletedOrders, error: delErr } = await adminClient
        .from("orders")
        .delete()
        .eq("business_id", businessId)
        .or("consignment_id.ilike.SYNC-%,consignment_id.ilike.SF-884%,consignment_id.ilike.PT-948%,id.ilike.ord-884%,customer_name.ilike.Tahmid Rahman%,customer_name.ilike.Arif Chowdhury%,customer_name.ilike.Mehedi Hasan%,customer_name.ilike.Sadia Sultana%,customer_name.ilike.Tamim Ahmed%,customer_name.ilike.Sabbir Hossain%")
        .select("id");

      if (delErr) throw delErr;

      return NextResponse.json({
        success: true,
        message: `Cleared ${deletedOrders?.length || 0} sample/test orders.`,
        deletedCount: deletedOrders?.length || 0,
      });
    }

    if (orderId) {
      // Unlink any inventory items associated with this order
      await adminClient
        .from("inventory_items")
        .update({ order_id: null, status: "IN_STOCK" })
        .eq("order_id", orderId)
        .eq("business_id", businessId);

      const { error: delErr } = await adminClient
        .from("orders")
        .delete()
        .eq("id", orderId)
        .eq("business_id", businessId);

      if (delErr) throw delErr;

      return NextResponse.json({
        success: true,
        message: `Order #${orderId} deleted successfully.`,
      });
    }

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      await adminClient
        .from("inventory_items")
        .update({ order_id: null, status: "IN_STOCK" })
        .in("order_id", orderIds)
        .eq("business_id", businessId);

      const { error: delErr } = await adminClient
        .from("orders")
        .delete()
        .in("id", orderIds)
        .eq("business_id", businessId);

      if (delErr) throw delErr;

      return NextResponse.json({
        success: true,
        message: `Deleted ${orderIds.length} orders.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Please specify an orderId or clearTestOrders to delete." },
      { status: 400 }
    );
  } catch (error) {
    console.error("DELETE /api/orders/bulk-import error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete order." },
      { status: 500 }
    );
  }
}
