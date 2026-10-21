import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/utils/admin-auth";
import {
  getTenantNotifications,
  saveTenantNotification,
  getGlobalAnnouncements,
  saveGlobalAnnouncement,
  dispatchAutoExpiryAlerts,
  getTenantConfig,
} from "@/utils/storage/tenant-store";
import fs from "fs";
import path from "path";

const DATA_BASE_DIR = path.join(process.cwd(), "data", "tenants");

export async function GET(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const announcements = getGlobalAnnouncements();
    return NextResponse.json({
      success: true,
      announcements,
    });
  } catch (err) {
    console.error("GET /api/admin/notifications error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load notifications." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action = "single", tenantId, title, message, type = "info", category = "custom", target = "all" } = body;

    // ── 1. Auto-Scan & Dispatch Expiry Alerts ─────────────────
    if (action === "auto_scan_expiry") {
      const result = dispatchAutoExpiryAlerts();
      return NextResponse.json({
        success: true,
        message: `Auto-scan complete. ${result.alertedCount} expiring store(s) notified.`,
        ...result,
      });
    }

    // ── 2. Platform Broadcast (All Merchants or Group) ────────
    if (action === "broadcast") {
      if (!title || !message) {
        return NextResponse.json(
          { success: false, error: "Announcement title and message are required." },
          { status: 400 }
        );
      }

      // 1. Save to global announcements
      const announcement = saveGlobalAnnouncement({
        title,
        message,
        type,
        category,
        sender: "Platform Super Admin",
      });

      // 2. Also inject into matching tenant inboxes
      let dispatchedCount = 0;
      if (fs.existsSync(DATA_BASE_DIR)) {
        const entries = fs.readdirSync(DATA_BASE_DIR, { withFileTypes: true });
        const tenantIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);

        for (const tId of tenantIds) {
          const config = getTenantConfig(tId);
          if (!config) continue;

          let shouldSend = true;
          if (target === "trial" && config.status !== "Trial") shouldSend = false;
          if (target === "active" && config.status !== "Active") shouldSend = false;
          if (target === "expiring") {
            const expTime = config.expires_at ? new Date(config.expires_at).getTime() : 0;
            const diffDays = Math.ceil((expTime - Date.now()) / 86400000);
            if (diffDays > 5) shouldSend = false;
          }

          if (shouldSend) {
            saveTenantNotification(tId, {
              title,
              message,
              type,
              category,
              sender: "Platform Broadcast",
            });
            dispatchedCount++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Broadcast dispatched to ${dispatchedCount} store(s).`,
        announcement,
        dispatchedCount,
      });
    }

    // ── 3. Single Merchant Notification ───────────────────────
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID is required for targeted notification." },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Notification title and message are required." },
        { status: 400 }
      );
    }

    const newNotif = saveTenantNotification(tenantId, {
      title,
      message,
      type,
      category,
      sender: "Super Admin",
    });

    return NextResponse.json({
      success: true,
      message: "Notification delivered to merchant store.",
      notification: newNotif,
    });
  } catch (err) {
    console.error("POST /api/admin/notifications error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to deliver notification." },
      { status: 500 }
    );
  }
}
