import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

/**
 * GET /api/team
 * List all staff members assigned to the caller's store.
 */
export async function GET(request) {
  try {
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerRole?.business_id) {
      return NextResponse.json(
        { success: false, error: "No active merchant business associated." },
        { status: 403 }
      );
    }

    // Fetch all team members for this specific business
    const { data: teamRows, error: teamErr } = await adminClient
      .from("user_roles")
      .select("id, email, role, created_at")
      .eq("business_id", callerRole.business_id)
      .order("created_at", { ascending: true });

    if (teamErr) {
      return NextResponse.json(
        { success: false, error: teamErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      callerRole: callerRole.role,
      team: teamRows || [],
    });
  } catch (err) {
    console.error("GET /api/team error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve team members." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team
 * Provision a new staff login (Store Manager or Packing Staff) for the caller's store.
 */
export async function POST(request) {
  try {
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerRole?.business_id) {
      return NextResponse.json(
        { success: false, error: "No active merchant business associated." },
        { status: 403 }
      );
    }

    // Only store owners and admins can invite new staff members
    const roleNormalized = (callerRole.role || "").toLowerCase();
    if (roleNormalized !== "owner" && roleNormalized !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only store owners can provision staff accounts." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const { email, password, role } = body || {};

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid staff email address is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const assignedRole = role === "manager" ? "manager" : "staff";

    // Security Check: Protect Super Admin from being targeted as staff
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com").toLowerCase().trim();
    if (cleanEmail === adminEmail) {
      return NextResponse.json(
        { success: false, error: "Cannot provision or reassign the Super Administrator account as store staff." },
        { status: 400 }
      );
    }

    // 1. Create or retrieve auth account via Supabase Admin
    let staffUserId = null;
    const { data: createdUser, error: createAuthErr } =
      await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
      });

    if (createdUser?.user) {
      staffUserId = createdUser.user.id;
    } else if (createAuthErr?.message?.toLowerCase().includes("already registered") || createAuthErr?.code === "email_exists") {
      // Security Check: Prevent account takeover of other merchants or external users
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id, email, business_id, role")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingRole && existingRole.business_id && existingRole.business_id !== callerRole.business_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Security Alert: This email is already associated with another active store. Staff members must use dedicated email addresses.",
          },
          { status: 403 }
        );
      }

      // Check if user owns an independent store
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existing = (listData?.users || []).find(
        (u) => u.email?.toLowerCase().trim() === cleanEmail
      );

      if (!existing) {
        throw new Error(createAuthErr.message);
      }

      const { data: ownedBiz } = await adminClient
        .from("businesses")
        .select("id")
        .eq("owner_id", existing.id)
        .maybeSingle();

      if (ownedBiz && ownedBiz.id !== callerRole.business_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Security Alert: This email owns an independent merchant store and cannot be reassigned as staff.",
          },
          { status: 403 }
        );
      }

      staffUserId = existing.id;
      // Only update password if this staff member already belongs to the caller's store
      if (existingRole?.business_id === callerRole.business_id) {
        await adminClient.auth.admin.updateUserById(existing.id, {
          password: password,
        });
      }
    } else {
      throw new Error(createAuthErr?.message || "Failed to create staff auth user.");
    }

    // 2. Insert or update user_roles for this business
    const { data: roleData, error: upsertErr } = await adminClient
      .from("user_roles")
      .upsert(
        {
          id: staffUserId,
          email: cleanEmail,
          role: assignedRole,
          business_id: callerRole.business_id,
        },
        { onConflict: "id" }
      )
      .select("id, email, role, created_at")
      .single();

    if (upsertErr) {
      return NextResponse.json(
        { success: false, error: upsertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: roleData || {
        id: staffUserId,
        email: cleanEmail,
        role: assignedRole,
      },
    });
  } catch (err) {
    console.error("POST /api/team error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to provision staff member." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team?id=...
 * Revoke and remove a staff member from the caller's store.
 */
export async function DELETE(request) {
  try {
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerRole?.business_id) {
      return NextResponse.json(
        { success: false, error: "No active merchant business associated." },
        { status: 403 }
      );
    }

    const roleNormalized = (callerRole.role || "").toLowerCase();
    if (roleNormalized !== "owner" && roleNormalized !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only store owners can remove staff members." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Staff user ID is required." },
        { status: 400 }
      );
    }

    // Safety: Prevent deleting self
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot remove your own primary account." },
        { status: 400 }
      );
    }

    // Remove user_roles mapping for this store
    const { error: delErr } = await adminClient
      .from("user_roles")
      .delete()
      .eq("id", targetUserId)
      .eq("business_id", callerRole.business_id);

    if (delErr) {
      return NextResponse.json(
        { success: false, error: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Staff member access revoked successfully.",
    });
  } catch (err) {
    console.error("DELETE /api/team error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to remove staff member." },
      { status: 500 }
    );
  }
}
