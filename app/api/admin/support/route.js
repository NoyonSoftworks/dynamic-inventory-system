import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/utils/admin-auth";
import {
  getAllSupportTickets,
  updateSupportTicketStatus,
  saveTenantNotification,
} from "@/utils/storage/tenant-store";

export async function GET(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const tickets = getAllSupportTickets();
    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (err) {
    console.error("GET /api/admin/support error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load support tickets." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { ticketId, status, adminReply, notifyMerchant = true } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: "Ticket ID is required." },
        { status: 400 }
      );
    }

    const updated = updateSupportTicketStatus(ticketId, status, adminReply);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Ticket not found." },
        { status: 404 }
      );
    }

    // Optionally dispatch a notification to the merchant informing them of resolution/update
    if (notifyMerchant && updated.business_id) {
      saveTenantNotification(updated.business_id, {
        title: `Support Ticket Updated: ${updated.id}`,
        message: adminReply
          ? `Status: ${status}. Admin response: "${adminReply}"`
          : `Your support ticket #${updated.id} status was changed to ${status}.`,
        type: status === "RESOLVED" ? "success" : "info",
        category: "system",
        sender: "Support Team",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Ticket #${ticketId} updated to ${status}.`,
      ticket: updated,
    });
  } catch (err) {
    console.error("PATCH /api/admin/support error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update ticket." },
      { status: 500 }
    );
  }
}
