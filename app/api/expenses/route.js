import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantExpenses,
  saveTenantExpense,
  deleteTenantExpense,
} from "@/utils/storage/tenant-store";
import { logActivity, AUDIT_ACTIONS } from "@/utils/audit-logger";

/**
 * Helper to authenticate user and resolve tenant business_id
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

  if (!businessId) {
    const adminEmail = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
    )
      .toLowerCase()
      .trim();
    if (user.email?.toLowerCase().trim() === adminEmail) {
      const { data: firstBiz } = await adminClient
        .from("businesses")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      businessId = firstBiz?.id;
    }
  }

  return { user, businessId };
}

/**
 * GET /api/expenses
 * Returns all logged operational expenses and summary telemetry for the caller's workspace.
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
    const timeframe = searchParams.get("timeframe") || "all"; // 'today' | '7d' | '30d' | 'all'
    const category = searchParams.get("category"); // optional filter

    let allExpenses = await getTenantExpenses(businessId);

    // Apply timeframe filtering
    const now = new Date();
    if (timeframe === "today") {
      const todayStr = now.toISOString().split("T")[0];
      allExpenses = allExpenses.filter((e) => e.expense_date === todayStr);
    } else if (timeframe === "7d") {
      const cutoff = new Date(Date.now() - 7 * 86400000);
      allExpenses = allExpenses.filter((e) => new Date(e.expense_date) >= cutoff);
    } else if (timeframe === "30d") {
      const cutoff = new Date(Date.now() - 30 * 86400000);
      allExpenses = allExpenses.filter((e) => new Date(e.expense_date) >= cutoff);
    }

    // Apply category filter if specified
    if (category && category !== "all") {
      allExpenses = allExpenses.filter((e) => e.category === category);
    }

    // Telemetry calculations
    const totalExpenses = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const adSpendTotal = allExpenses
      .filter((e) => e.category === "ad_spend")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const packagingTotal = allExpenses
      .filter((e) => e.category === "packaging")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const salariesRentTotal = allExpenses
      .filter((e) => e.category === "salaries_rent")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const utilitiesMiscTotal = allExpenses
      .filter((e) => e.category === "utilities_misc" || e.category === "other")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const todayStr = now.toISOString().split("T")[0];
    const todaySpend = allExpenses
      .filter((e) => e.expense_date === todayStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return NextResponse.json({
      success: true,
      expenses: allExpenses,
      telemetry: {
        totalExpenses,
        adSpendTotal,
        packagingTotal,
        salariesRentTotal,
        utilitiesMiscTotal,
        todaySpend,
        recordCount: allExpenses.length,
      },
    });
  } catch (err) {
    console.error("GET /api/expenses error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses: " + err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Records a new daily operational expense or digital ad spend transaction.
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
    const {
      amount,
      category,
      platform,
      campaign_name,
      notes,
      payment_method,
      expense_date,
    } = body || {};

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Expense amount must be a positive number." },
        { status: 400 }
      );
    }

    const validCategories = ["ad_spend", "packaging", "salaries_rent", "utilities_misc", "other"];
    const finalCategory = validCategories.includes(category) ? category : "utilities_misc";

    const saved = await saveTenantExpense(businessId, {
      category: finalCategory,
      amount: numAmount,
      platform: platform ? String(platform).trim() : "",
      campaign_name: campaign_name ? String(campaign_name).trim() : "",
      notes: notes ? String(notes).trim() : "",
      payment_method: payment_method || "bKash Merchant",
      expense_date: expense_date || new Date().toISOString().split("T")[0],
      user_email: user.email,
    });

    logActivity({
      businessId,
      userEmail: user.email,
      userId: user.id,
      actionType: "EXPENSE_LOGGED",
      details: `Logged ৳${numAmount.toLocaleString()} under ${finalCategory} (${notes || platform || "Operational Overhead"})`,
      metadata: { expense_id: saved.id, amount: numAmount, category: finalCategory },
      request,
    }).catch(() => {});

    return NextResponse.json({ success: true, expense: saved });
  } catch (err) {
    console.error("POST /api/expenses error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to record expense: " + err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses?id=...
 * Deletes an expense transaction.
 */
export async function DELETE(request) {
  try {
    const { user, businessId } = await resolveAuthAndTenant(request);
    if (!user || !businessId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Expense ID is required." },
        { status: 400 }
      );
    }

    await deleteTenantExpense(businessId, id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("DELETE /api/expenses error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete expense: " + err.message },
      { status: 500 }
    );
  }
}
