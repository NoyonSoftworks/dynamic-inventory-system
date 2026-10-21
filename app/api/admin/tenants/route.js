import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminRequest } from "@/utils/admin-auth";
import {
  getTenantConfig,
  saveTenantConfig,
  getAllTenantPayments,
  saveTenantPayment,
  updateTenantPaymentStatus,
} from "@/utils/storage/tenant-store";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * GET /api/admin/tenants
 * Fetch detailed tenant information, plan configuration, or payment history.
 */
export async function GET(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentsOnly = searchParams.get("payments") === "true";
    const tenantId = searchParams.get("id");

    if (paymentsOnly) {
      const payments = getAllTenantPayments();
      return NextResponse.json({ success: true, payments });
    }

    if (tenantId) {
      const config = getTenantConfig(tenantId);
      const supabaseAdmin = getSupabaseAdmin();

      let tenantBusiness = null;
      let skuCount = 0;
      let orderCount = 0;
      let teamMembers = [];

      if (supabaseAdmin) {
        const { data: bData } = await supabaseAdmin
          .from("businesses")
          .select("id, name, created_at")
          .eq("id", tenantId)
          .maybeSingle();
        tenantBusiness = bData;

        const { data: pData } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("business_id", tenantId);
        skuCount = pData?.length || 0;

        const { data: oData } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("business_id", tenantId);
        orderCount = oData?.length || 0;

        const { data: rData } = await supabaseAdmin
          .from("user_roles")
          .select("id, email, role, created_at")
          .eq("business_id", tenantId);
        teamMembers = rData || [];
      }

      return NextResponse.json({
        success: true,
        tenant: {
          id: tenantId,
          name: tenantBusiness?.name || "Store #" + tenantId.slice(0, 6),
          created_at: tenantBusiness?.created_at,
          skuCount,
          orderCount,
          teamMembers,
          config: config || {},
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Specify ?id=... or ?payments=true for targeted data.",
    });
  } catch (err) {
    console.error("GET /api/admin/tenants error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load tenant details." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants
 * 1-Click "Create & Provision New Merchant Store"
 */
export async function POST(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const {
      name,
      ownerEmail,
      initialPassword,
      phone,
      division,
      plan,
      billingStatus,
      preloadSampleProducts = true,
    } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Store / Business name is required." },
        { status: 400 }
      );
    }

    if (!ownerEmail || !ownerEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid merchant owner email is required." },
        { status: 400 }
      );
    }

    if (!initialPassword || initialPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Initial password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = ownerEmail.toLowerCase().trim();
    const cleanStoreName = name.trim().slice(0, 100);
    const chosenPlan = plan || "growth";
    const statusNormalized = billingStatus || "Active";

    // 1. Create or link Supabase Auth user
    let ownerUserId = null;
    const { data: createdAuth, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: initialPassword,
        email_confirm: true,
        user_metadata: { store_name: cleanStoreName, role: "owner" },
      });

    if (createdAuth?.user) {
      ownerUserId = createdAuth.user.id;
    } else if (authErr?.message?.toLowerCase().includes("already registered") || authErr?.code === "email_exists") {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = (listData?.users || []).find(
        (u) => u.email?.toLowerCase().trim() === cleanEmail
      );
      if (existing) {
        ownerUserId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: initialPassword,
        });
      } else {
        throw new Error(authErr.message);
      }
    } else {
      throw new Error(authErr?.message || "Failed to create merchant auth user.");
    }

    // 2. Insert new business workspace record
    const { data: newBiz, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: cleanStoreName,
      })
      .select("id, name, created_at")
      .single();

    if (bizErr || !newBiz) {
      throw new Error(bizErr?.message || "Failed to create business record.");
    }

    const newBusinessId = newBiz.id;

    // 3. Bind owner to user_roles
    await supabaseAdmin.from("user_roles").upsert(
      {
        id: ownerUserId,
        email: cleanEmail,
        role: "owner",
        business_id: newBusinessId,
      },
      { onConflict: "id" }
    );

    // 4. Compute validity expiry
    let daysToAdd = 30;
    if (statusNormalized.toLowerCase().includes("trial")) {
      daysToAdd = 14;
    } else if (statusNormalized.toLowerCase().includes("complimentary")) {
      daysToAdd = 365;
    }
    const expiryDate = new Date(Date.now() + daysToAdd * 86400000).toISOString();

    // 5. Save tenant configuration & feature access
    const savedConfig = saveTenantConfig(newBusinessId, {
      plan: chosenPlan,
      status: statusNormalized.toLowerCase().includes("trial") ? "Trial" : "Active",
      expires_at: expiryDate,
      phone: phone || "",
      division: division || "Dhaka",
      order_limit: chosenPlan === "starter" ? 300 : chosenPlan === "growth" ? 1500 : 5000,
      sku_limit: chosenPlan === "starter" ? 100 : chosenPlan === "growth" ? 500 : 2000,
      features: {
        courier_reconciliation: true,
        expense_profit_tracker: true,
        ai_reorder_hub: chosenPlan !== "starter",
        thermal_printing: true,
      },
    });

    // 6. Preload starter sample products if requested
    let seededCount = 0;
    if (preloadSampleProducts) {
      const sampleCatalog = [
        {
          name: "Premium Embroidered Semi-Silk Panjabi",
          category: "Men's Ethnic",
          base_sku: "PAN-SLK-01",
          price: 2850,
          stock: 45,
        },
        {
          name: "Festive Georgette Printed Kurti 3-Piece",
          category: "Women's Festive",
          base_sku: "KUR-GEO-02",
          price: 3450,
          stock: 60,
        },
        {
          name: "Slim Fit Vintage Indigo Denim Jeans",
          category: "Bottomwear",
          base_sku: "JNS-IND-03",
          price: 1890,
          stock: 80,
        },
        {
          name: "Handcrafted Genuine Leather Loafers",
          category: "Footwear",
          base_sku: "SHO-LEA-04",
          price: 4200,
          stock: 35,
        },
      ];

      for (const item of sampleCatalog) {
        const { data: pRec } = await supabaseAdmin
          .from("products")
          .insert({
            name: item.name,
            category: item.category,
            base_sku: item.base_sku,
            business_id: newBusinessId,
          })
          .select("id")
          .single();

        if (pRec?.id) {
          seededCount++;
          await supabaseAdmin.from("variants").insert({
            product_id: pRec.id,
            price: item.price,
            stock_quantity: item.stock,
            attributes: { size: "Standard", color: "Assorted" },
          });
        }
      }
    }

    const host = request.headers.get("host") || "smartinventory.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const storeLoginUrl = `${protocol}://${host}/login`;

    return NextResponse.json({
      success: true,
      message: `Merchant store "${cleanStoreName}" successfully provisioned!`,
      tenant: {
        id: newBusinessId,
        name: cleanStoreName,
        ownerEmail: cleanEmail,
        status: savedConfig.status,
        plan: savedConfig.plan,
        division: savedConfig.division,
        seededProducts: seededCount,
      },
      credentials: {
        email: cleanEmail,
        password: initialPassword,
        loginUrl: storeLoginUrl,
        storeName: cleanStoreName,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/tenants exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to provision merchant store." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenants
 * Full God-Mode Operations: Edit store, update plan/validity, reset password, toggle features, approve payments.
 */
export async function PATCH(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const { action, tenantId, ...payload } = body || {};

    // ── Action A: Record Offline Payment ───────────────────────
    if (action === "create_payment") {
      const { storeName, ownerEmail, amount, method, phone, trxId, plan, notes } = payload;
      const paymentRec = saveTenantPayment({
        business_id: tenantId,
        store_name: storeName,
        owner_email: ownerEmail,
        amount: Number(amount) || 1990,
        method: method || "bKash Offline",
        phone: phone || "",
        trx_id: trxId || `CASH-${Date.now().toString().slice(-6)}`,
        plan: plan || "Growth Pro",
        status: "APPROVED",
        notes: notes || "Recorded directly by Super Admin",
      });

      // Extend tenant validity by 30 days
      if (tenantId) {
        const currentConf = getTenantConfig(tenantId);
        const baseDate =
          currentConf?.expires_at && new Date(currentConf.expires_at) > new Date()
            ? new Date(currentConf.expires_at)
            : new Date();
        const newExpiry = new Date(baseDate.getTime() + 30 * 86400000).toISOString();
        saveTenantConfig(tenantId, {
          status: "Active",
          expires_at: newExpiry,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Offline payment recorded and store extended by 30 days.",
        payment: paymentRec,
      });
    }

    // ── Action B: Approve Pending Payment ──────────────────────
    if (action === "approve_payment") {
      const { paymentId, targetBusinessId } = payload;
      const approved = updateTenantPaymentStatus(paymentId, "APPROVED");

      const bId = targetBusinessId || approved?.business_id;
      if (bId) {
        const currentConf = getTenantConfig(bId);
        const baseDate =
          currentConf?.expires_at && new Date(currentConf.expires_at) > new Date()
            ? new Date(currentConf.expires_at)
            : new Date();
        const newExpiry = new Date(baseDate.getTime() + 30 * 86400000).toISOString();
        saveTenantConfig(bId, {
          status: "Active",
          expires_at: newExpiry,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Payment approved successfully. Store subscription extended.",
        payment: approved,
      });
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID is required." },
        { status: 400 }
      );
    }

    // ── Action C: Reset Merchant Password ──────────────────────
    if (action === "reset_password") {
      const { newPassword, ownerEmail } = payload;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters." },
          { status: 400 }
        );
      }

      // Find user id for owner of this business
      let targetUserId = null;
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles")
        .select("id, email, role")
        .eq("business_id", tenantId);

      const ownerRow = (roleRows || []).find(
        (r) => r.role === "owner" || r.role === "admin"
      ) || roleRows?.[0];

      if (ownerRow?.id) {
        targetUserId = ownerRow.id;
      } else if (ownerEmail) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const found = (listData?.users || []).find(
          (u) => u.email?.toLowerCase().trim() === ownerEmail.toLowerCase().trim()
        );
        targetUserId = found?.id;
      }

      if (!targetUserId) {
        return NextResponse.json(
          { success: false, error: "No owner auth user found for this tenant store." },
          { status: 404 }
        );
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      );

      if (resetErr) {
        throw resetErr;
      }

      return NextResponse.json({
        success: true,
        message: `Password updated successfully for merchant owner.`,
        newPassword,
      });
    }

    // ── Action D: Toggle Per-Tenant Feature Access ─────────────
    if (action === "toggle_feature") {
      const { featureKey, enabled } = payload;
      const currentConfig = getTenantConfig(tenantId);
      const updatedConfig = saveTenantConfig(tenantId, {
        features: {
          [featureKey]: Boolean(enabled),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Feature "${featureKey}" set to ${enabled ? "ON" : "OFF"}.`,
        config: updatedConfig,
      });
    }

    // ── Action E: Update Plan & Validity Extension ─────────────
    if (action === "update_plan") {
      const { plan, addDays, customExpiry, skuLimit, orderLimit, status } = payload;
      const currentConfig = getTenantConfig(tenantId);

      let newExpiry = currentConfig.expires_at;
      if (customExpiry) {
        newExpiry = new Date(customExpiry).toISOString();
      } else if (addDays) {
        const base =
          currentConfig.expires_at && new Date(currentConfig.expires_at) > new Date()
            ? new Date(currentConfig.expires_at)
            : new Date();
        newExpiry = new Date(base.getTime() + Number(addDays) * 86400000).toISOString();
      }

      const updated = saveTenantConfig(tenantId, {
        plan: plan || currentConfig.plan,
        expires_at: newExpiry,
        status: status || currentConfig.status,
        sku_limit: skuLimit ? Number(skuLimit) : currentConfig.sku_limit,
        order_limit: orderLimit ? Number(orderLimit) : currentConfig.order_limit,
      });

      return NextResponse.json({
        success: true,
        message: `Plan & subscription validity updated successfully.`,
        config: updated,
      });
    }

    // ── Action F: Toggle Status (Activate / Suspend) ────────────
    if (action === "toggle_status") {
      const { status, notice } = payload;
      const currentConfig = getTenantConfig(tenantId);
      const nextStatus = status || (currentConfig.status === "Active" ? "Suspended" : "Active");

      const updated = saveTenantConfig(tenantId, {
        status: nextStatus,
        suspension_notice: notice || "",
      });

      return NextResponse.json({
        success: true,
        message: `Store status changed to ${nextStatus}.`,
        config: updated,
      });
    }

    // ── Action G: Edit Store Name / Profile ────────────────────
    const { name, phone, division } = payload;
    if (name && typeof name === "string") {
      await supabaseAdmin
        .from("businesses")
        .update({ name: name.trim().slice(0, 100) })
        .eq("id", tenantId);
    }

    const updatedConf = saveTenantConfig(tenantId, {
      phone: phone !== undefined ? phone : undefined,
      division: division !== undefined ? division : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Store profile updated successfully.",
      config: updatedConf,
    });
  } catch (err) {
    console.error("PATCH /api/admin/tenants exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process tenant update." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants?id=...
 * Purge tenant store and associated database entries.
 */
export async function DELETE(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Missing Supabase server credentials." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID is required." },
        { status: 400 }
      );
    }

    if (tenantId === "00000000-0000-0000-0000-000000000001") {
      return NextResponse.json(
        { success: false, error: "Cannot delete the Platform Owner Primary Workspace." },
        { status: 403 }
      );
    }

    // Delete associated data
    await supabaseAdmin.from("user_roles").delete().eq("business_id", tenantId);
    await supabaseAdmin.from("products").delete().eq("business_id", tenantId);
    await supabaseAdmin.from("orders").delete().eq("business_id", tenantId);
    await supabaseAdmin.from("courier_settings").delete().eq("business_id", tenantId);

    const { error: delErr } = await supabaseAdmin
      .from("businesses")
      .delete()
      .eq("id", tenantId);

    if (delErr) {
      return NextResponse.json(
        { success: false, error: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tenant workspace successfully deleted.`,
    });
  } catch (err) {
    console.error("Tenant DELETE exception:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process tenant deletion." },
      { status: 500 }
    );
  }
}
