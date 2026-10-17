import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { logActivity, AUDIT_ACTIONS } from "@/utils/audit-logger";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "saas_settings.json");

function getRecoveryPhone() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf8");
      const json = JSON.parse(raw);
      if (json.admin_recovery_phone) {
        return json.admin_recovery_phone;
      }
    }
  } catch {}
  return "";
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration missing." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await request.json().catch(() => null);
    const { mode, email, otp, recoveryPhone, newPassword } = body || {};

    const cleanEmail = String(email || "").toLowerCase().trim();

    // ── MODE 1: REQUEST 6-DIGIT RECOVERY CODE VIA EMAIL ────────
    if (mode === "request_code") {
      if (!cleanEmail) {
        return NextResponse.json(
          { success: false, error: "Administrator email is required." },
          { status: 400 }
        );
      }

      // If email doesn't match super admin, return neutral success to prevent enumeration
      if (cleanEmail !== ADMIN_EMAIL) {
        return NextResponse.json({
          success: true,
          message:
            "If an authorized administrator account matches this address, a 6-digit recovery code has been dispatched.",
        });
      }

      const client = createClient(supabaseUrl, anonKey);
      await client.auth.resetPasswordForEmail(cleanEmail);

      return NextResponse.json({
        success: true,
        message:
          "A 6-digit verification code has been dispatched to your email. Please inspect your inbox.",
      });
    }

    // ── MODE 2: VERIFY 6-DIGIT OTP AND RESET PASSWORD ──────────
    if (mode === "verify_code_and_reset") {
      if (!cleanEmail || cleanEmail !== ADMIN_EMAIL) {
        return NextResponse.json(
          { success: false, error: "Invalid administrator credentials." },
          { status: 403 }
        );
      }

      const cleanOtp = String(otp || "").trim().replace(/\D/g, "");
      if (cleanOtp.length < 6) {
        return NextResponse.json(
          { success: false, error: "Please enter the valid 6-digit code sent to your email." },
          { status: 400 }
        );
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters in length." },
          { status: 400 }
        );
      }

      // Verify OTP code with Supabase Auth
      const client = createClient(supabaseUrl, anonKey);
      const { data: verifyData, error: verifyErr } = await client.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: "recovery",
      });

      if (verifyErr) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid or expired 6-digit code. Please request a fresh code or check your latest email.",
          },
          { status: 400 }
        );
      }

      // Retrieve user ID and update password securely via admin client
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = userList?.users?.find(
        (u) => (u.email || "").toLowerCase() === ADMIN_EMAIL
      );

      if (!adminUser) {
        return NextResponse.json(
          { success: false, error: "Super Admin identity not found in directory." },
          { status: 404 }
        );
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        adminUser.id,
        { password: newPassword }
      );

      if (updateErr) {
        return NextResponse.json(
          { success: false, error: updateErr.message || "Failed to update password." },
          { status: 500 }
        );
      }

      // Log successful password recovery
      logActivity({
        businessId: "00000000-0000-0000-0000-000000000001",
        userEmail: ADMIN_EMAIL,
        actionType: AUDIT_ACTIONS.SETTINGS_UPDATED,
        details: "Super Administrator successfully reset master password via 6-digit email OTP verification",
        request,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Super Admin master password updated successfully! You may now sign in.",
      });
    }

    // ── MODE 3: EMERGENCY RESET VIA RECOVERY PHONE ─────────────
    if (mode === "recovery_phone") {
      if (!cleanEmail || cleanEmail !== ADMIN_EMAIL) {
        return NextResponse.json(
          { success: false, error: "Invalid administrator credentials." },
          { status: 403 }
        );
      }

      const savedPhone = getRecoveryPhone();
      const cleanInputPhone = String(recoveryPhone || "").replace(/\D/g, "");
      const cleanConfigPhone = String(savedPhone || "").replace(/\D/g, "");

      if (
        !cleanConfigPhone ||
        cleanInputPhone.length < 6 ||
        (!cleanConfigPhone.endsWith(cleanInputPhone) &&
          !cleanInputPhone.endsWith(cleanConfigPhone))
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Emergency phone verification failed. The provided phone number does not match the configured Recovery Phone.",
          },
          { status: 403 }
        );
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters in length." },
          { status: 400 }
        );
      }

      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const adminUser = userList?.users?.find(
        (u) => (u.email || "").toLowerCase() === ADMIN_EMAIL
      );

      if (!adminUser) {
        return NextResponse.json(
          { success: false, error: "Super Admin identity not found in directory." },
          { status: 404 }
        );
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        adminUser.id,
        { password: newPassword }
      );

      if (updateErr) {
        return NextResponse.json(
          { success: false, error: updateErr.message || "Failed to update password." },
          { status: 500 }
        );
      }

      logActivity({
        businessId: "00000000-0000-0000-0000-000000000001",
        userEmail: ADMIN_EMAIL,
        actionType: AUDIT_ACTIONS.SETTINGS_UPDATED,
        details: "Super Administrator successfully reset master password via Emergency Recovery Phone verification",
        request,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Super Admin master password updated successfully via Emergency Recovery Phone! You may now sign in.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Unrecognized recovery mode." },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST /api/admin/reset-password error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error during password reset." },
      { status: 500 }
    );
  }
}
