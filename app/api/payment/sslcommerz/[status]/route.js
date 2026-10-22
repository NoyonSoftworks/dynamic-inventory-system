import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { logActivity } from "@/utils/logger";
import { saveTenantConfig, saveTenantPayment } from "@/utils/storage/tenant-store";

/**
 * Validates transaction payload with SSLCommerz Server-to-Server Validation API
 */
async function validateWithSSLCommerz({ valId, storeId, storePasswd, isLive }) {
  if (!valId || !storeId || !storePasswd) {
    return { valid: false, reason: "Missing validation parameters." };
  }

  const validatorBase = isLive
    ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

  const url = new URL(validatorBase);
  url.searchParams.append("val_id", valId);
  url.searchParams.append("store_id", storeId);
  url.searchParams.append("store_passwd", storePasswd);
  url.searchParams.append("format", "json");

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    return { valid: false, reason: `Validator server returned HTTP ${res.status}` };
  }

  const json = await res.json();
  const isValid = json.status === "VALID" || json.status === "VALIDATED";

  return {
    valid: isValid,
    data: json,
    reason: json.failedreason || (isValid ? null : "Transaction validation rejected"),
  };
}

/**
 * POST /api/payment/sslcommerz/[status]
 * Handles SSLCommerz gateway callbacks: 'success', 'fail', 'cancel', and 'ipn'.
 */
export async function POST(request, context) {
  try {
    const params = await context.params;
    const statusParam = (params?.status || "").toLowerCase();
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Parse form-urlencoded POST payload from SSLCommerz
    let formPayload = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        formPayload[key] = value.toString();
      });
    } else {
      formPayload = await request.json().catch(() => ({}));
    }

    const {
      tran_id: tranId,
      val_id: valId,
      amount,
      card_type: cardType,
      bank_tran_id: bankTranId,
      status: sslStatus,
      value_a: businessId,
      value_b: userId,
      value_c: userEmail,
    } = formPayload;

    const adminClient = createAdminClient();

    // 2. Fetch SaaS settings for store verification keys
    const { data: settingsRow } = await adminClient
      .from("saas_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const storeId = settingsRow?.sslcommerz_store_id || process.env.SSLCOMMERZ_STORE_ID || "";
    const storePasswd = settingsRow?.sslcommerz_store_passwd || process.env.SSLCOMMERZ_STORE_PASSWORD || "";
    const isLive = Boolean(settingsRow?.sslcommerz_is_live ?? (process.env.SSLCOMMERZ_IS_LIVE === "true"));

    // ── CASE 1: SUCCESSFUL PAYMENT ──────────────────────────────────
    if (statusParam === "success" || (statusParam === "ipn" && sslStatus === "VALID")) {
      // Strict Server-to-Server Validation against SSLCommerz API
      const validation = await validateWithSSLCommerz({
        valId,
        storeId,
        storePasswd,
        isLive,
      });

      if (!validation.valid) {
        console.error("SSLCommerz Validation Failed:", validation.reason);

        await logActivity({
          businessId,
          userId,
          userEmail,
          actionType: "PAYMENT_FAILED",
          description: `SSLCommerz validation failed for TranID ${tranId}: ${validation.reason}`,
          metadata: { tranId, valId, validationData: validation.data },
          req: request,
        });

        // Redirect with validation failure notice
        return NextResponse.redirect(
          new URL(`/dashboard/billing?payment=failed&reason=${encodeURIComponent(validation.reason || "Validation error")}`, origin),
          { status: 303 }
        );
      }

      // Upgrade the tenant's workspace to 'Active' status and paid plan
      if (businessId) {
        const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 Days
        const paidAmount = Number(amount || tranData?.amount || 1990);
        let paidPlan = "growth";
        let orderLimit = 1500;
        let skuLimit = 500;
        if (paidAmount < 1500) {
          paidPlan = "starter";
          orderLimit = 300;
          skuLimit = 100;
        } else if (paidAmount > 3000) {
          paidPlan = "enterprise";
          orderLimit = 5000;
          skuLimit = 2000;
        }

        saveTenantConfig(businessId, {
          status: "Active",
          plan: paidPlan,
          order_limit: orderLimit,
          sku_limit: skuLimit,
          expires_at: expiresAt,
          features: {
            courier_reconciliation: true,
            expense_profit_tracker: true,
            ai_reorder_hub: paidPlan !== "starter",
            thermal_printing: true,
          },
        });

        saveTenantPayment({
          business_id: businessId,
          store_name: tranData?.store_name || "Merchant Store",
          owner_email: userEmail || "",
          amount: paidAmount,
          method: "SSLCommerz Online",
          phone: tranData?.cus_phone || "",
          trx_id: tranId,
          plan: paidPlan === "starter" ? "Starter Plan" : paidPlan === "enterprise" ? "Enterprise" : "Growth Pro",
          status: "APPROVED",
          notes: `Online automated payment via SSLCommerz (ValID: ${valId})`,
        });

        await adminClient
          .from("businesses")
          .update({
            subscription_plan: paidPlan,
            subscription_status: "active",
            subscription_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", businessId);

        // Also update user_roles subscription metadata if column exists
        try {
          await adminClient
            .from("user_roles")
            .update({ role: "admin" })
            .eq("business_id", businessId);
        } catch {
          // ignore
        }
      }

      // Update payment_transactions record (if table exists)
      try {
        await adminClient
          .from("payment_transactions")
          .update({
            status: "VALIDATED",
            val_id: valId,
            bank_tran_id: bankTranId,
            card_type: cardType,
            updated_at: new Date().toISOString(),
          })
          .eq("tran_id", tranId);
      } catch {
        // ignore
      }

      // Log PAYMENT_SUCCESS Footprint
      await logActivity({
        businessId,
        userId,
        userEmail,
        actionType: "PAYMENT_CONFIRMED",
        description: `Successfully upgraded workspace to Pro Enterprise! Payment of ৳${amount} confirmed via ${cardType || "SSLCommerz"}. TranID: ${tranId}`,
        metadata: {
          tranId,
          valId,
          amount,
          cardType,
          bankTranId,
          plan: "Pro Enterprise",
        },
        req: request,
      });

      // Background IPN listener returns 200 OK
      if (statusParam === "ipn") {
        return NextResponse.json({ success: true, message: "IPN processed successfully" });
      }

      // Browser redirect to billing with success query
      return NextResponse.redirect(
        new URL(`/dashboard/billing?payment=success&tran_id=${encodeURIComponent(tranId || "")}`, origin),
        { status: 303 }
      );
    }

    // ── CASE 2: FAILED PAYMENT ──────────────────────────────────────
    if (statusParam === "fail") {
      await logActivity({
        businessId,
        userId,
        userEmail,
        actionType: "PAYMENT_FAILED",
        description: `Payment failed for TranID ${tranId}. Gateway status: ${sslStatus || "FAILED"}`,
        metadata: { tranId, formPayload },
        req: request,
      });

      try {
        await adminClient
          .from("payment_transactions")
          .update({ status: "FAILED", updated_at: new Date().toISOString() })
          .eq("tran_id", tranId);
      } catch {
        // ignore
      }

      return NextResponse.redirect(
        new URL(`/dashboard/billing?payment=failed&tran_id=${encodeURIComponent(tranId || "")}`, origin),
        { status: 303 }
      );
    }

    // ── CASE 3: CANCELLED PAYMENT ───────────────────────────────────
    if (statusParam === "cancel") {
      await logActivity({
        businessId,
        userId,
        userEmail,
        actionType: "PAYMENT_FAILED",
        description: `Checkout session was cancelled by customer. TranID: ${tranId}`,
        metadata: { tranId },
        req: request,
      });

      try {
        await adminClient
          .from("payment_transactions")
          .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
          .eq("tran_id", tranId);
      } catch {
        // ignore
      }

      return NextResponse.redirect(
        new URL(`/dashboard/billing?payment=cancelled`, origin),
        { status: 303 }
      );
    }

    // Default fallback redirect
    return NextResponse.redirect(new URL("/dashboard/billing", origin), { status: 303 });
  } catch (err) {
    console.error("SSLCommerz callback error:", err);
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/dashboard/billing?payment=error", origin), { status: 303 });
  }
}

/**
 * GET fallback for browser reloads on callback endpoints
 */
export async function GET(request, context) {
  const params = await context.params;
  const statusParam = (params?.status || "").toLowerCase();
  const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL(`/dashboard/billing?payment=${statusParam}`, origin));
}
