import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminRequest } from "@/utils/admin-auth";

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
 * POST /api/admin/tasks/ai-suggest
 * AI Logistics & Security Operations Copilot
 * Generates recommended operational tasks for Super Admin's team
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
    let tenantCount = 0;
    let orderCount = 0;

    if (supabaseAdmin) {
      const { count: bizCount } = await supabaseAdmin
        .from("businesses")
        .select("*", { count: "exact", head: true });
      tenantCount = bizCount || 0;

      const { count: ordCount } = await supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true });
      orderCount = ordCount || 0;
    }

    // Dynamic operational checklist
    const suggestedTasks = [
      {
        title: "Steadfast & Pathao Courier Webhook Pulse Check",
        description:
          "Run an automated ping check on Steadfast Courier IPN endpoints to verify real-time status code transmission and eliminate dispatch sync delay.",
        role: "Logistics Dispatcher",
        category: "LOGISTICS",
        priority: "HIGH",
        suggested_assignee: "logistics@smartinventory.io",
        reason: "Ensures automated courier consignment updates reach merchants instantly without manual refresh.",
      },
      {
        title: "SSLCommerz & Stripe Webhook Secret Key Rotation",
        description:
          "Perform cryptographic signature verification on incoming payment gateway notifications to prevent replay attacks and signature spoofing.",
        role: "Security Officer",
        category: "SECURITY",
        priority: "CRITICAL",
        suggested_assignee: "security@smartinventory.io",
        reason: "Maintains PCI-DSS compliance and protects multi-tenant billing pipelines.",
      },
      {
        title: `Proactive Onboarding for ${tenantCount} Active Workspaces`,
        description:
          "Verify that all newly registered store admins have successfully configured their WhatsApp Notification templates and barcode scanner devices.",
        role: "Support Specialist",
        category: "MERCHANT_SUPPORT",
        priority: "MEDIUM",
        suggested_assignee: "support@smartinventory.io",
        reason: "Maximizes merchant trial conversion rate and eliminates initial configuration friction.",
      },
      {
        title: "Automated Database Index & RLS Latency Benchmark",
        description:
          "Analyze query performance on 'activity_logs' and 'stock_transactions' to guarantee sub-50ms lookup times under peak bulk-order loads.",
        role: "DevOps Engineer",
        category: "SYSTEM_HEALTH",
        priority: "LOW",
        suggested_assignee: "devops@smartinventory.io",
        reason: "Prevents query bottleneck during multi-tenant flash sales and bulk daily dispatches.",
      },
    ];

    return NextResponse.json({
      success: true,
      suggestions: suggestedTasks,
      generated_at: new Date().toISOString(),
      system_metrics: {
        activeTenants: tenantCount,
        totalOrders: orderCount,
      },
    });
  } catch (err) {
    console.error("AI suggest exception:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate AI task recommendations." },
      { status: 500 }
    );
  }
}
