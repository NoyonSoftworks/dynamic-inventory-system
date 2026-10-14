/**
 * Utility for Automated WhatsApp and SMS Dispatch Notifications
 * Supports WhatsApp Providers (GreenAPI, UltraMsg, Twilio) and Local BD SMS (BulkSMSBD)
 */

/**
 * Standardizes a Bangladeshi phone number into:
 * - local11: "017XXXXXXXX" (11 digits)
 * - intl13: "88017XXXXXXXX" (13 digits for WhatsApp / International SMS)
 */
export function normalizeBdPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("01")) {
    return {
      local11: digits,
      intl13: `88${digits}`,
    };
  }

  if (digits.length === 13 && digits.startsWith("8801")) {
    return {
      local11: digits.slice(2),
      intl13: digits,
    };
  }

  return null;
}

/**
 * Formats a clean, professional dispatch message.
 */
export function formatDispatchMessage({
  customerName,
  orderId,
  trackingUrl,
  courierName,
  businessName,
}) {
  const customer = customerName?.trim() || "Customer";
  const store = businessName?.trim() || "Lavanza Store";
  const courier = courierName?.trim() || "Courier Service";
  const id = String(orderId || "").trim();

  let message = `Hello ${customer},\n\nYour order #${id} from ${store} has been dispatched via ${courier}.`;

  if (trackingUrl && trackingUrl.trim()) {
    message += `\n\nTrack your parcel in real-time here:\n${trackingUrl.trim()}`;
  }

  message += `\n\nThank you for choosing ${store}!`;
  return message;
}

/**
 * Sends dispatch message via WhatsApp API (GreenAPI, UltraMsg, or generic WhatsApp Gateway).
 */
async function sendWhatsAppNotification({ phoneIntl, message }) {
  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  const instanceId = process.env.WHATSAPP_INSTANCE_ID?.trim();
  const token = process.env.WHATSAPP_TOKEN?.trim();

  if (!apiUrl || !token) {
    return {
      sent: false,
      skipped: true,
      reason: "WhatsApp credentials (WHATSAPP_API_URL / WHATSAPP_TOKEN) not configured.",
    };
  }

  try {
    let endpoint = apiUrl;
    let payload = {};

    // 1. GreenAPI Detection: e.g., https://api.green-api.com
    if (apiUrl.includes("green-api.com")) {
      const cleanBase = apiUrl.replace(/\/+$/, "");
      endpoint = `${cleanBase}/waInstance${instanceId}/sendMessage/${token}`;
      payload = {
        chatId: `${phoneIntl}@c.us`,
        message: message,
      };
    }
    // 2. UltraMsg Detection: e.g., https://api.ultramsg.com
    else if (apiUrl.includes("ultramsg.com")) {
      const cleanBase = apiUrl.replace(/\/+$/, "");
      endpoint = `${cleanBase}/${instanceId}/messages/chat`;
      payload = {
        token: token,
        to: phoneIntl,
        body: message,
      };
    }
    // 3. Generic WhatsApp Gateway / Webhook
    else {
      endpoint = apiUrl;
      payload = {
        instanceId: instanceId || undefined,
        token: token,
        to: phoneIntl,
        chatId: `${phoneIntl}@c.us`,
        message: message,
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token.startsWith("Bearer ") ? { Authorization: token } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000), // 8 second timeout
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn("WhatsApp API dispatch error response:", responseData || response.statusText);
      return {
        sent: false,
        statusCode: response.status,
        error: responseData?.message || responseData?.error || "WhatsApp gateway returned error status.",
      };
    }

    return {
      sent: true,
      messageId: responseData?.idMessage || responseData?.id || responseData?.messageId || "OK",
    };
  } catch (err) {
    console.error("Failed to deliver WhatsApp dispatch notification:", err.message);
    return {
      sent: false,
      error: err.message,
    };
  }
}

/**
 * Sends dispatch message via Bangladeshi Local SMS Gateway (e.g. BulkSMSBD).
 */
async function sendLocalSmsNotification({ phoneLocal, phoneIntl, message }) {
  const apiKey = (process.env.BULKSMSBD_API_KEY || process.env.SMS_API_KEY)?.trim();
  const senderId = (process.env.BULKSMSBD_SENDER_ID || process.env.SMS_SENDER_ID)?.trim();
  const apiUrl = (
    process.env.BULKSMSBD_API_URL ||
    process.env.SMS_API_URL ||
    "http://bulksmsbd.net/api/smsapi"
  ).trim();

  if (!apiKey || !senderId) {
    return {
      sent: false,
      skipped: true,
      reason: "Local SMS credentials (BULKSMSBD_API_KEY / SMS_SENDER_ID) not configured.",
    };
  }

  try {
    // BulkSMSBD format: api_key, sender_id, number (8801...), message
    const params = new URLSearchParams({
      api_key: apiKey,
      type: "text",
      number: phoneIntl || `88${phoneLocal}`,
      senderid: senderId,
      message: message,
    });

    const endpoint = `${apiUrl}?${params.toString()}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout
    });

    const result = await response.json().catch(() => null);

    // BulkSMSBD returns response_code 202 on success
    const isSuccess = response.ok && (result?.response_code === 202 || result?.response_code === "202");

    if (!isSuccess) {
      console.warn("BulkSMSBD returned non-success response:", result);
      return {
        sent: false,
        error: result?.error_message || result?.message || `BulkSMSBD response code ${result?.response_code}`,
      };
    }

    return {
      sent: true,
      messageId: result?.message_id || "BULKSMSBD_ACCEPTED",
    };
  } catch (err) {
    console.error("Failed to deliver local SMS dispatch notification:", err.message);
    return {
      sent: false,
      error: err.message,
    };
  }
}

/**
 * Main Dispatch Notification Orchestrator.
 * Dispatches WhatsApp and/or SMS messages asynchronously without blocking caller execution.
 *
 * @param {Object} params
 * @param {string} params.customerPhone - Customer phone number (11 or 13 digits)
 * @param {string} params.customerName - Customer name
 * @param {string|number} params.orderId - Internal or public Order ID
 * @param {string} [params.trackingUrl] - Live parcel tracking URL
 * @param {string} [params.courierName] - Name of the courier (e.g. Steadfast Courier)
 * @param {string} [params.businessName] - Merchant / Workspace business name
 */
export async function sendDispatchNotification({
  customerPhone,
  customerName,
  orderId,
  trackingUrl,
  courierName = "Steadfast Courier",
  businessName,
}) {
  const normalized = normalizeBdPhoneNumber(customerPhone);
  if (!normalized) {
    console.warn(`[DispatchNotification] Skipping: Invalid customer phone number "${customerPhone}"`);
    return {
      success: false,
      error: "INVALID_PHONE_NUMBER",
    };
  }

  const message = formatDispatchMessage({
    customerName,
    orderId,
    trackingUrl,
    courierName,
    businessName,
  });

  // Execute both channels concurrently with individual safety guards
  const [whatsappResult, smsResult] = await Promise.allSettled([
    sendWhatsAppNotification({
      phoneIntl: normalized.intl13,
      message,
    }),
    sendLocalSmsNotification({
      phoneLocal: normalized.local11,
      phoneIntl: normalized.intl13,
      message,
    }),
  ]);

  const whatsapp =
    whatsappResult.status === "fulfilled"
      ? whatsappResult.value
      : { sent: false, error: whatsappResult.reason?.message };

  const sms =
    smsResult.status === "fulfilled"
      ? smsResult.value
      : { sent: false, error: smsResult.reason?.message };

  const anySent = whatsapp.sent || sms.sent;

  if (anySent) {
    console.log(
      `[DispatchNotification] Sent notification for order #${orderId} to ${customerPhone} (WhatsApp: ${whatsapp.sent}, SMS: ${sms.sent})`
    );
  } else if (whatsapp.skipped && sms.skipped) {
    console.log(
      `[DispatchNotification] Both WhatsApp and SMS gateways are unconfigured. Skipped order #${orderId}.`
    );
  }

  return {
    success: anySent || Boolean(whatsapp.skipped && sms.skipped),
    channels: {
      whatsapp,
      sms,
    },
  };
}
