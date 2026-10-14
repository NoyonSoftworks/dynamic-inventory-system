/**
 * Utility for Automated WhatsApp and SMS Dispatch Notifications
 * Supports Dynamic Database Credentials (saas_settings) with Caching & .env Fallback
 * Compatible with GreenAPI, UltraMsg, Twilio, and BulkSMSBD
 */

import { createClient } from "@supabase/supabase-js";

// In-memory cache for dynamic saas_settings with 60-second TTL
let cachedSettings = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Dynamically retrieves WhatsApp and SMS Gateway credentials.
 * Checks the 'saas_settings' singleton table first; falls back to process.env.
 */
export async function getDynamicGatewaySettings() {
  const now = Date.now();
  if (cachedSettings && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let dbRow = null;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabaseAdmin
        .from("saas_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data) {
        dbRow = data;
      }
    } catch (err) {
      console.warn("Dynamic gateway settings fetch notice:", err.message);
    }
  }

  // Priority Order: Database saas_settings > process.env > defaults
  const resolved = {
    whatsapp_api_url: (
      dbRow?.whatsapp_api_url ||
      process.env.WHATSAPP_API_URL ||
      "https://api.green-api.com"
    ).trim(),
    whatsapp_instance_id: (
      dbRow?.whatsapp_instance_id ||
      process.env.WHATSAPP_INSTANCE_ID ||
      ""
    ).trim(),
    whatsapp_token: (
      dbRow?.whatsapp_token ||
      process.env.WHATSAPP_TOKEN ||
      ""
    ).trim(),
    sms_api_key: (
      dbRow?.sms_api_key ||
      process.env.BULKSMSBD_API_KEY ||
      process.env.SMS_API_KEY ||
      ""
    ).trim(),
    sms_sender_id: (
      dbRow?.sms_sender_id ||
      process.env.BULKSMSBD_SENDER_ID ||
      process.env.SMS_SENDER_ID ||
      ""
    ).trim(),
    sms_api_url: (
      dbRow?.sms_api_url ||
      process.env.BULKSMSBD_API_URL ||
      process.env.SMS_API_URL ||
      "http://bulksmsbd.net/api/smsapi"
    ).trim(),
  };

  cachedSettings = resolved;
  lastCacheTime = now;
  return resolved;
}

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
  const defaultStore = process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory";
  const store = businessName?.trim() || defaultStore;
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
async function sendWhatsAppNotification({ phoneIntl, message, settings }) {
  const apiUrl = settings.whatsapp_api_url;
  const instanceId = settings.whatsapp_instance_id;
  const token = settings.whatsapp_token;

  if (!apiUrl || !token) {
    return {
      sent: false,
      skipped: true,
      reason: "WhatsApp credentials not configured in Super Admin settings or .env.",
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
      signal: AbortSignal.timeout(8000), // 8 second network timeout
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
async function sendLocalSmsNotification({ phoneLocal, phoneIntl, message, settings }) {
  const apiKey = settings.sms_api_key;
  const senderId = settings.sms_sender_id;
  const apiUrl = settings.sms_api_url || "http://bulksmsbd.net/api/smsapi";

  if (!apiKey || !senderId) {
    return {
      sent: false,
      skipped: true,
      reason: "Local SMS credentials (API Key / Sender ID) not configured in Super Admin settings or .env.",
    };
  }

  try {
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
 * Fetches dynamic credentials from 'saas_settings' (cached), then concurrently
 * sends WhatsApp and/or SMS messages asynchronously without blocking caller execution.
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

  // 1. Fetch dynamic settings from database (with in-memory cache & env fallback)
  const settings = await getDynamicGatewaySettings();

  // 2. Format message
  const message = formatDispatchMessage({
    customerName,
    orderId,
    trackingUrl,
    courierName,
    businessName,
  });

  // 3. Execute both channels concurrently with individual safety guards
  const [whatsappResult, smsResult] = await Promise.allSettled([
    sendWhatsAppNotification({
      phoneIntl: normalized.intl13,
      message,
      settings,
    }),
    sendLocalSmsNotification({
      phoneLocal: normalized.local11,
      phoneIntl: normalized.intl13,
      message,
      settings,
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
      `[DispatchNotification] Both WhatsApp and SMS gateways unconfigured. Skipped order #${orderId}.`
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
