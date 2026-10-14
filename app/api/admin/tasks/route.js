import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logActivity, AUDIT_ACTIONS, extractClientDetails } from "@/utils/audit-logger";
import { verifyAdminRequest, ADMIN_EMAIL } from "@/utils/admin-auth";

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

// In-memory fallback if the SQL table admin_tasks has not been created yet in Supabase
let inMemoryTasks = [
  {
    id: "task-001",
    title: "Steadfast Courier API Integration Audit",
    description: "Verify that Steadfast webhook endpoint returns HTTP 200 and handles consignment status updates.",
    assigned_to_email: "support@smartinventory.io",
    assigned_to_name: "Tariqul Islam",
    role: "Logistics Dispatcher",
    category: "LOGISTICS",
    priority: "HIGH",
    status: "IN_PROGRESS",
    created_by: ADMIN_EMAIL,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-002",
    title: "Review SSLCommerz IPN Callback Security",
    description: "Ensure server-to-server IPN callbacks strictly validate hash signatures and prevent transaction tampering.",
    assigned_to_email: "security@smartinventory.io",
    assigned_to_name: "Afsana Rahman",
    role: "Security Officer",
    category: "SECURITY",
    priority: "CRITICAL",
    status: "PENDING",
    created_by: ADMIN_EMAIL,
    due_date: new Date(Date.now() + 172800000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-003",
    title: "Merchant Onboarding Assistance",
    description: "Help new merchants configure WhatsApp order notification templates and custom SMS Sender IDs.",
    assigned_to_email: "ops@smartinventory.io",
    assigned_to_name: "Kamrul Hasan",
    role: "Support Specialist",
    category: "MERCHANT_SUPPORT",
    priority: "MEDIUM",
    status: "PENDING",
    created_by: ADMIN_EMAIL,
    due_date: new Date(Date.now() + 259200000).toISOString(),
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * GET /api/admin/tasks
 * Fetch all assigned tasks (Super Admin only)
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

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, tasks: inMemoryTasks });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const roleFilter = searchParams.get("role");

    // Try fetching from DB
    const { data, error } = await supabaseAdmin
      .from("admin_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      let filtered = inMemoryTasks;
      if (statusFilter && statusFilter !== "ALL") {
        filtered = filtered.filter((t) => t.status === statusFilter);
      }
      if (roleFilter && roleFilter !== "ALL") {
        filtered = filtered.filter((t) => t.role === roleFilter);
      }
      return NextResponse.json({ success: true, tasks: filtered, source: "memory_fallback" });
    }

    let result = data;
    if (statusFilter && statusFilter !== "ALL") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (roleFilter && roleFilter !== "ALL") {
      result = result.filter((t) => t.role === roleFilter);
    }

    return NextResponse.json({ success: true, tasks: result, source: "database" });
  } catch (err) {
    console.error("GET /api/admin/tasks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load operational tasks." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tasks
 * Create a new task assigned to an operational team member
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
    const body = await request.json().catch(() => null);
    const {
      title,
      description = "",
      assigned_to_email,
      assigned_to_name = "",
      role = "Support Specialist",
      category = "LOGISTICS",
      priority = "MEDIUM",
      due_date = null,
      business_id = null,
    } = body || {};

    if (!title || !assigned_to_email) {
      return NextResponse.json(
        { success: false, error: "Task title and assigned email are required." },
        { status: 400 }
      );
    }

    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: String(title).trim().slice(0, 200),
      description: String(description).trim().slice(0, 1000),
      assigned_to_email: String(assigned_to_email).toLowerCase().trim(),
      assigned_to_name: String(assigned_to_name).trim() || String(assigned_to_email).split("@")[0],
      role: String(role).slice(0, 50),
      category: String(category).slice(0, 50),
      priority: String(priority).slice(0, 20),
      status: "PENDING",
      business_id: business_id || null,
      created_by: ADMIN_EMAIL,
      due_date: due_date || new Date(Date.now() + 86400000 * 3).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("admin_tasks")
        .insert(newTask)
        .select()
        .single();

      if (!error && data) {
        const { ipAddress, userAgent } = extractClientDetails(request);
        await logActivity({
          userEmail: ADMIN_EMAIL,
          actionType: "TASK_CREATED",
          details: `Super Admin assigned task "${newTask.title}" to ${newTask.assigned_to_name} (${newTask.role})`,
          metadata: { taskId: data.id, role: newTask.role, priority: newTask.priority },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ success: true, task: data });
      }
    }

    // In-memory fallback
    inMemoryTasks.unshift(newTask);

    const { ipAddress, userAgent } = extractClientDetails(request);
    await logActivity({
      userEmail: ADMIN_EMAIL,
      actionType: "TASK_CREATED",
      details: `Super Admin assigned task "${newTask.title}" to ${newTask.assigned_to_name} (${newTask.role})`,
      metadata: { taskId: newTask.id, role: newTask.role, priority: newTask.priority },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (err) {
    console.error("POST /api/admin/tasks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create task." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tasks
 * Update task status or details
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
    const body = await request.json().catch(() => null);
    const { id, status, notes } = body || {};

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Task id and status are required." },
        { status: 400 }
      );
    }

    const updates = {
      status,
      updated_at: new Date().toISOString(),
      ...(status === "COMPLETED" ? { completed_at: new Date().toISOString() } : {}),
      ...(notes ? { notes: String(notes).trim().slice(0, 1000) } : {}),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("admin_tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        const { ipAddress, userAgent } = extractClientDetails(request);
        await logActivity({
          userEmail: ADMIN_EMAIL,
          actionType: status === "COMPLETED" ? "TASK_COMPLETED" : "TASK_STATUS_UPDATED",
          details: `Task #${id} status updated to [${status}]`,
          metadata: { taskId: id, status },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ success: true, task: data });
      }
    }

    // Memory fallback
    const idx = inMemoryTasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      inMemoryTasks[idx] = { ...inMemoryTasks[idx], ...updates };
      return NextResponse.json({ success: true, task: inMemoryTasks[idx] });
    }

    return NextResponse.json({ success: false, error: "Task not found." }, { status: 404 });
  } catch (err) {
    console.error("PATCH /api/admin/tasks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update task." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tasks
 * Remove a task
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID is required." },
        { status: 400 }
      );
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from("admin_tasks").delete().eq("id", id);
    }

    inMemoryTasks = inMemoryTasks.filter((t) => t.id !== id);

    const { ipAddress, userAgent } = extractClientDetails(request);
    await logActivity({
      userEmail: ADMIN_EMAIL,
      actionType: "TASK_DELETED",
      details: `Super Admin purged operational task #${id}`,
      metadata: { taskId: id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, message: "Task removed." });
  } catch (err) {
    console.error("DELETE /api/admin/tasks error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete task." },
      { status: 500 }
    );
  }
}
