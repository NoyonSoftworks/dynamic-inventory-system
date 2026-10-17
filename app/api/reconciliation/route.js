import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantReconciliations,
  saveTenantReconciliation,
  batchSaveTenantReconciliations,
  updateTenantReconciliation,
} from "@/utils/storage/tenant-store";
import { logActivity } from "@/utils/audit-logger";

/**
 * Authenticate session and resolve tenant business_id
 */
async function resolveAuthAndTenant(request) {
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

  if (!user) return { user: null, businessId: null };

  const adminClient = createAdminClient();
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
    businessId = byEmail?.business_id;
  }

  if (!businessId && user.id) {
    const adminEmail = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
    ).toLowerCase().trim();
    const isSuperAdmin = user.email?.toLowerCase().trim() === adminEmail;
    const storeName = isSuperAdmin
      ? "Noyon Hossain Enterprise"
      : user.email
      ? `${user.email.split("@")[0]}'s Store`
      : "My Store";

    const { data: newBiz } = await adminClient
      .from("businesses")
      .insert({
        name: storeName,
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (newBiz?.id) {
      businessId = newBiz.id;
      await adminClient.from("user_roles").upsert(
        {
          id: user.id,
          email: user.email,
          role: "admin",
          business_id: businessId,
        },
        { onConflict: "id" }
      );
    }
  }

  return { user, businessId };
}

/**
 * GET /api/reconciliation
 * Fetches reconciled courier settlement records and discrepancy telemetry.
 */
export async function GET(request) {
  try {
    const { user, businessId } = await resolveAuthAndTenant(request);
    if (!user || !businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status"); // 'ALL' | 'SHORT_PAID' | 'PENDING_PAYOUT' | 'SETTLED' | 'LOST_STUCK'
    const courierFilter = searchParams.get("courier");

    let records = await getTenantReconciliations(businessId);

    // Apply filtering
    if (statusFilter && statusFilter !== "ALL") {
      records = records.filter((r) => r.status === statusFilter);
    }
    if (courierFilter && courierFilter !== "ALL") {
      records = records.filter(
        (r) => (r.courier || "").toLowerCase() === courierFilter.toLowerCase()
      );
    }

    // Telemetry computations
    const allRecords = await getTenantReconciliations(businessId);
    
    // Total Settled (actual paid amount where status is SETTLED)
    const totalSettledAmount = allRecords
      .filter((r) => r.status === "SETTLED")
      .reduce((sum, r) => sum + (Number(r.payout_amount) || 0), 0);

    // Pending Courier Payouts (expected payout for pending/in-transit parcels)
    const pendingPayoutAmount = allRecords
      .filter((r) => r.status === "PENDING_PAYOUT")
      .reduce((sum, r) => sum + (Number(r.expected_payout) || 0), 0);

    // Short-Paid / Discrepancy Variance in BDT (positive magnitude of negative variance)
    const shortPaidVariance = allRecords
      .filter((r) => r.status === "SHORT_PAID")
      .reduce((sum, r) => sum + Math.abs(Number(r.variance) || 0), 0);

    // Stuck or Lost Parcels (> 7 days)
    const stuckParcels = allRecords.filter(
      (r) => r.status === "LOST_STUCK" || Number(r.days_in_transit) >= 7
    );
    const stuckAtRiskValue = stuckParcels.reduce(
      (sum, r) => sum + (Number(r.order_amount) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      records,
      telemetry: {
        totalSettledAmount,
        pendingPayoutAmount,
        shortPaidVariance,
        stuckCount: stuckParcels.length,
        stuckAtRiskValue,
        totalParcels: allRecords.length,
        settledCount: allRecords.filter((r) => r.status === "SETTLED").length,
        shortPaidCount: allRecords.filter((r) => r.status === "SHORT_PAID").length,
        pendingCount: allRecords.filter((r) => r.status === "PENDING_PAYOUT").length,
      },
    });
  } catch (err) {
    console.error("GET /api/reconciliation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load reconciliation records: " + err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reconciliation
 * Ingests courier settlement CSV lines or bulk sync records and runs discrepancy analysis.
 */
export async function POST(request) {
  try {
    const { user, businessId } = await resolveAuthAndTenant(request);
    if (!user || !businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { records = [], singleRecord, resetToDefault } = body || {};

    if (resetToDefault) {
      return NextResponse.json({ success: true, message: "Reset to default demo settlement data." });
    }

    const itemsToProcess = Array.isArray(records) && records.length > 0
      ? records
      : singleRecord
      ? [singleRecord]
      : [];

    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: "No reconciliation records provided to process." },
        { status: 400 }
      );
    }

    const savedRecords = await batchSaveTenantReconciliations(businessId, itemsToProcess);

    logActivity({
      businessId,
      userEmail: user.email,
      userId: user.id,
      actionType: "COURIER_RECONCILIATION_UPLOAD",
      details: `Reconciled ${savedRecords.length} courier settlement records across Steadfast/Pathao/RedX`,
      metadata: { recordCount: savedRecords.length },
      request,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      processedCount: savedRecords.length,
      records: savedRecords,
    });
  } catch (err) {
    console.error("POST /api/reconciliation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process reconciliation: " + err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reconciliation
 * Updates claim status or dispute notes for short-paid or lost consignments.
 */
export async function PATCH(request) {
  try {
    const { user, businessId } = await resolveAuthAndTenant(request);
    if (!user || !businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, claim_status, claim_notes } = body || {};

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Reconciliation record ID is required." },
        { status: 400 }
      );
    }

    const updated = await updateTenantReconciliation(businessId, id, {
      claim_status: claim_status || "CLAIM_FILED",
      claim_notes: claim_notes || `Dispute raised on ${new Date().toLocaleDateString()}`,
    });

    logActivity({
      businessId,
      userEmail: user.email,
      userId: user.id,
      actionType: "COURIER_CLAIM_FILED",
      details: `Filed dispute claim for consignment ${updated?.consignment_id || id}`,
      metadata: { consignment_id: updated?.consignment_id, claim_status },
      request,
    }).catch(() => {});

    return NextResponse.json({ success: true, record: updated });
  } catch (err) {
    console.error("PATCH /api/reconciliation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update claim: " + err.message },
      { status: 500 }
    );
  }
}
