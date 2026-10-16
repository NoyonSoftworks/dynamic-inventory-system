import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminRequest } from "@/utils/admin-auth";

export async function GET(request) {
  try {
    // 1. Strict Super Administrator Authorization Guard
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials." },
        { status: 500 }
      );
    }

    // Bypass RLS with service_role key to aggregate all multi-tenant SaaS metrics
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Fetch all registered businesses / tenants
    const { data: businesses, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (bizErr) console.warn("Businesses query note:", bizErr.message);

    // 2. Fetch all user roles to identify merchant account owners
    const { data: userRoles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("id, email, role, business_id, created_at");

    if (rolesErr) console.warn("User roles query note:", rolesErr.message);

    const rolesByBiz = {};
    (userRoles || []).forEach((r) => {
      if (!rolesByBiz[r.business_id]) rolesByBiz[r.business_id] = [];
      rolesByBiz[r.business_id].push(r);
    });

    // 3. Fetch products safely
    let allProducts = [];
    const { data: prodsWithBiz, error: prodBizErr } = await supabaseAdmin
      .from("products")
      .select("id, name, base_sku, business_id");

    if (!prodBizErr && prodsWithBiz) {
      allProducts = prodsWithBiz;
    } else {
      const { data: prodsBasic } = await supabaseAdmin
        .from("products")
        .select("id, name, base_sku");
      allProducts = (prodsBasic || []).map((p) => ({
        ...p,
        business_id: "00000000-0000-0000-0000-000000000001",
      }));
    }

    // 4. Fetch orders safely
    let allOrders = [];
    const { data: ordersWithBiz, error: ordersBizErr } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, customer_phone, customer_address, courier, total_amount, status, consignment_id, created_at, business_id")
      .order("created_at", { ascending: false });

    if (!ordersBizErr && ordersWithBiz) {
      allOrders = ordersWithBiz;
    } else {
      const { data: ordersBasic } = await supabaseAdmin
        .from("orders")
        .select("id, customer_name, customer_phone, customer_address, courier, total_amount, status, consignment_id, created_at")
        .order("created_at", { ascending: false });
      allOrders = (ordersBasic || []).map((o) => ({
        ...o,
        business_id: o.business_id || "00000000-0000-0000-0000-000000000001",
      }));
    }

    // 5. Fetch courier configurations safely
    let allCouriers = [];
    const { data: couriersWithBiz, error: courierBizErr } = await supabaseAdmin
      .from("courier_settings")
      .select("id, courier_name, business_id");

    if (!courierBizErr && couriersWithBiz) {
      allCouriers = couriersWithBiz;
    } else {
      const { data: couriersBasic } = await supabaseAdmin
        .from("courier_settings")
        .select("id, courier_name");
      allCouriers = couriersBasic || [];
    }

    // Only include genuine merchant tenant businesses (exclude legacy seed or unassigned records)
    const bizList = (businesses || []).filter(
      (b) => b.id !== "00000000-0000-0000-0000-000000000001"
    );

    // Map business metrics and owner identities
    const tenants = bizList.map((biz) => {
      const bizProds = allProducts.filter((p) => p.business_id === biz.id);
      const bizOrders = allOrders.filter((o) => o.business_id === biz.id);
      const bizDispatched = bizOrders.filter((o) => o.status === "DISPATCHED");
      const bizCourierSettings = allCouriers.filter(
        (c) => !c.business_id || c.business_id === biz.id
      );

      const uniqueCouriers = [
        ...new Set(bizCourierSettings.map((c) => c.courier_name)),
      ];

      const bizUsers = rolesByBiz[biz.id] || [];
      const primaryUser =
        bizUsers.find((u) => u.role === "admin") || bizUsers[0];
      const ownerEmail = primaryUser?.email || "Unassigned Account";
      const isOwnerWorkspace = false; // Super Admin does not own a merchant workspace

      return {
        id: biz.id,
        name: biz.name || "Unnamed Store",
        ownerEmail,
        isOwnerWorkspace,
        created_at: biz.created_at,
        status: "Active",
        totalSkus: bizProds.length,
        totalOrders: bizOrders.length,
        skuCount: bizProds.length,
        orderCount: bizOrders.length,
        dispatchedOrders: bizDispatched.length,
        pendingOrders: bizOrders.filter((o) => o.status === "PENDING_DISPATCH").length,
        connectedCouriers: uniqueCouriers.length > 0 ? uniqueCouriers : ["None"],
      };
    });

    // Courier Logistics Breakdown
    const courierBreakdown = {
      Steadfast: 0,
      Pathao: 0,
      RedX: 0,
      Paperfly: 0,
      Carrybee: 0,
      Unassigned: 0,
    };

    let webhookOrdersCount = 0;
    let totalRevenue = 0;

    allOrders.forEach((o) => {
      totalRevenue += Number(o.total_amount || 0);

      if (o.status === "PENDING_DISPATCH") {
        webhookOrdersCount += 1;
      }

      const courier = o.courier?.trim();
      if (courier && courierBreakdown[courier] !== undefined) {
        courierBreakdown[courier] += 1;
      } else if (courier) {
        courierBreakdown[courier] = (courierBreakdown[courier] || 0) + 1;
      } else {
        courierBreakdown.Unassigned += 1;
      }
    });

    // Map business name to recent orders
    const bizNameMap = {};
    bizList.forEach((b) => {
      bizNameMap[b.id] = b.name;
    });

    const enrichedRecentOrders = allOrders.slice(0, 15).map((o) => ({
      ...o,
      storeName:
        bizNameMap[o.business_id] ||
        "Store #" + (o.business_id ? o.business_id.slice(0, 6) : "Direct"),
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalTenants: bizList.length,
        totalSkus: allProducts.length,
        totalOrders: allOrders.length,
        totalDispatched: allOrders.filter((o) => o.status === "DISPATCHED").length,
        totalPending: allOrders.filter((o) => o.status === "PENDING_DISPATCH").length,
        totalWebhookHits: webhookOrdersCount,
        totalRevenue,
      },
      courierBreakdown,
      tenants,
      recentOrders: enrichedRecentOrders,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Super Admin overview API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load platform telemetry overview.",
      },
      { status: 500 }
    );
  }
}
