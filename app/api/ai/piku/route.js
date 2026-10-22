import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantExpenses,
  getTenantReconciliations,
  getTenantConfig,
  saveSupportTicket,
} from "@/utils/storage/tenant-store";

function getPikuGlobalSupportContacts() {
  try {
    const settingsPath = path.join(process.cwd(), "data", "saas_settings.json");
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      return {
        supportPhone: data.support_phone || data.admin_recovery_phone || "01753082749",
        whatsappNumber: data.support_whatsapp || "8801753082749",
        supportEmail: data.support_email || "support@smartinventory.app",
        supportHours: data.support_hours || "10:00 AM - 11:00 PM (Daily)",
        aiName: data.ai_name || "Tuku",
        aiNameBn: data.ai_name_bn || "টুকু",
        aiTagline: data.ai_tagline || "Smart Inventory & 24/7 E-Commerce Advisor",
        aiIsActive: data.ai_is_active !== false,
        aiWelcomeMessage: data.ai_welcome_message || "",
        aiCustomInstructions: data.ai_custom_instructions || "",
        aiModelMode: data.ai_model_mode || "balanced",
      };
    }
  } catch (err) {
    console.warn("Error reading saas_settings in piku:", err);
  }
  return {
    supportPhone: "01753082749",
    whatsappNumber: "8801753082749",
    supportEmail: "support@smartinventory.app",
    supportHours: "10:00 AM - 11:00 PM (Daily)",
    aiName: "Tuku",
    aiNameBn: "টুকু",
    aiTagline: "Smart Inventory & 24/7 E-Commerce Advisor",
    aiIsActive: true,
    aiWelcomeMessage: "",
    aiCustomInstructions: "",
    aiModelMode: "balanced",
  };
}

/**
 * Detect language of merchant message:
 * - "bn": Bengali script (e.g. "আমার স্টক কেমন আছে?")
 * - "banglish": Romanized Bengali / Banglish (e.g. "amar stock ki obostha?")
 * - "en": English (e.g. "How do I calculate safety stock?")
 */
function detectLanguage(text = "") {
  // Check for Bengali Unicode script range (\u0980 - \u09FF)
  const bengaliRegex = /[\u0980-\u09FF]/;
  if (bengaliRegex.test(text)) {
    return "bn";
  }

  // Common Banglish phonetics word bank
  const banglishIndicators = [
    "amar", "amr", "amader", "amdr", "apnar", "apnr", "kivabe", "kibhabe", "kemne", "kmn",
    "korbo", "krbo", "korum", "korte", "kora", "kori", "korce", "korena", "ase", "ace",
    "nai", "nei", "ki", "kno", "keno", "hobe", "hbe", "bujhi", "bujhte", "bujte", "bujhina",
    "sesh", "kom", "kome", "taka", "takar", "khoroch", "khoroj", "labh", "ferot", "milabo",
    "milate", "dekhao", "bolo", "bolen", "jani", "janan", "sahajjo", "parbo", "partesi",
    "partesina", "dorkar", "lagbe", "khub", "valoi", "vlo", "kharap", "ekhon", "akhon",
    "pore", "age", "kisu", "kichu", "sob", "shob", "koto", "kotodin", "kothay", "jante",
    "chai", "parsel", "mal", "hishab", "hisab", "koro", "deikho", "deiko", "bolun", "shunen",
    "khulun", "kholo", "tulen", "tulo"
  ];

  const words = text.toLowerCase().split(/[\s,?.!_/\-+=:;'"()]+/);
  const matchCount = words.filter((w) => banglishIndicators.includes(w)).length;

  if (matchCount > 0) {
    return "banglish";
  }

  return "en";
}

/**
 * Extract parcel tracking / consignment identifier from user message:
 * Matches formats: SF-8841029, CID-8841029, PT-9482103, ord-8841, ST-10294, or numeric codes.
 */
function extractTrackingOrConsignmentId(text = "") {
  if (!text) return null;

  // 1. Common Bangladeshi courier tracking prefixes
  const prefixMatch = text.match(/\b(SF|CID|PT|ST|ORD|TRACK|CN|INV)[-_ ]?([a-zA-Z0-9]{4,16})\b/i);
  if (prefixMatch) {
    return prefixMatch[0].trim();
  }

  // 2. Format: ord-xxxx
  const ordMatch = text.match(/\b(ord-[a-zA-Z0-9]+)\b/i);
  if (ordMatch) {
    return ordMatch[0].trim();
  }

  // 3. Format: Keyword followed by 6+ digits/characters (e.g. "tracking: 8492019" or "ID 9482103")
  const contextMatch = text.match(/(?:tracking|consignment|parcel|id|cid|order|পার্সেল|ট্র্যাকিং)[:#\- ]*([a-zA-Z0-9]{6,14})/i);
  if (contextMatch) {
    return contextMatch[1].trim();
  }

  // 4. Standalone 7+ digits
  const digitsMatch = text.match(/\b\d{7,12}\b/);
  if (digitsMatch) {
    return digitsMatch[0].trim();
  }

  return null;
}

/**
 * Find order or reconciliation record by tracking/consignment identifier
 */
function findOrderOrParcel(identifier, ordersList = [], reconciliationsList = []) {
  if (!identifier) return null;
  const cleanId = String(identifier).toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Search in orders list
  const foundOrder = ordersList.find((o) => {
    const oConsignment = String(o.consignment_id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const oId = String(o.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const oPhone = String(o.customer_phone || "").replace(/[^0-9]/g, "");

    return (
      (oConsignment && oConsignment.includes(cleanId)) ||
      (cleanId && oConsignment && cleanId.includes(oConsignment)) ||
      (oId && oId === cleanId) ||
      (cleanId.length >= 10 && oPhone.includes(cleanId))
    );
  });

  if (foundOrder) return { type: "order", data: foundOrder };

  // 2. Search in courier reconciliations
  const foundRecon = reconciliationsList.find((r) => {
    const rConsignment = String(r.consignment_id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const rTracking = String(r.tracking_code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      (rConsignment && rConsignment.includes(cleanId)) ||
      (rTracking && rTracking.includes(cleanId))
    );
  });

  if (foundRecon) return { type: "reconciliation", data: foundRecon };

  return null;
}

/**
 * POST /api/ai/piku
 * High-Intelligence Piku AI Store Copilot & Assistant
 * Seamlessly supports:
 * 1. Parcel Live Tracking by Tracking ID / Consignment code
 * 2. 1-Click Support Ticket / Courier Dispute Raising
 * 3. Deep multi-language intelligence (Banglish, Bengali, English)
 */
export async function POST(request) {
  try {
    const globalContact = getPikuGlobalSupportContacts();
    const aiName = globalContact.aiName || "Tuku";
    const aiNameBn = globalContact.aiNameBn || "টুকু";

    // ── 1. Authentication Guard ─────────────────────────────────
    const supabase = await createClient();
    let {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    // Resilient fallback: Bearer token or cookie
    if (!user) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;
      const cookieToken =
        request.cookies?.get?.("sb-access-token")?.value ||
        request.cookies?.get?.("supabase-auth-token")?.value;
      const token = bearerToken || cookieToken;

      if (token) {
        const { data: fbData } = await supabase.auth.getUser(token);
        if (fbData?.user) {
          user = fbData.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: `অনুগ্রহ করে সাইন ইন করুন যাতে ${aiNameBn} আপনার স্টোরের তথ্য দেখে সাহায্য করতে পারে।`,
        },
        { status: 401 }
      );
    }

    // ── 2. Workspace & Business Context Resolution ─────────────
    const adminClient = createAdminClient();
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("business_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const businessId = roleRow?.business_id || "demo-tenant-1";
    const userRole = (roleRow?.role || "owner").toLowerCase();

    let businessName = "Merchant Store";
    const { data: bizRow } = await adminClient
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle();
    if (bizRow?.name) {
      businessName = bizRow.name;
    }

    // ── 3. Gather Live Store Snapshot for Deep Context ─────────
    let products = [];
    try {
      const { data: prods } = await adminClient
        .from("products")
        .select("id, name, sku, stock, category, price")
        .eq("business_id", businessId)
        .limit(60);
      products = prods || [];
    } catch {}

    let orders = [];
    try {
      const { data: ords } = await adminClient
        .from("orders")
        .select("id, customer_name, customer_phone, customer_address, total_amount, status, consignment_id, courier, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(60);
      orders = ords || [];
    } catch {}

    // Fallback demonstration orders if workspace is fresh
    if (orders.length === 0) {
      orders = [
        {
          id: "ord-8841",
          customer_name: "Tamim Ahmed",
          customer_phone: "01700000000",
          customer_address: "House 12, Road 4, Dhanmondi, Dhaka",
          courier: "Steadfast Courier",
          consignment_id: "SF-8841029",
          status: "IN_TRANSIT",
          total_amount: 6800,
          created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        },
        {
          id: "ord-8842",
          customer_name: "Sabbir Hossain",
          customer_phone: "01712345678",
          customer_address: "House 24, Road 7, Sector 3, Uttara, Dhaka",
          courier: "Steadfast Courier",
          consignment_id: "SF-8842194",
          status: "PENDING_DISPATCH",
          total_amount: 1850,
          created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
        },
        {
          id: "ord-8843",
          customer_name: "Farhana Yasmin",
          customer_phone: "01819283746",
          customer_address: "Flat 4B, Green View Tower, Mirpur DOHS, Dhaka",
          courier: "Pathao Express",
          consignment_id: "PT-9482103",
          status: "DELIVERED",
          total_amount: 3200,
          created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        },
      ];
    }

    const expenses = await getTenantExpenses(businessId).catch(() => []);
    const reconciliations = await getTenantReconciliations(businessId).catch(() => []);
    const tenantConf = getTenantConfig(businessId) || {};

    const lowStockItems = products.filter((p) => Number(p.stock ?? 0) <= 5);
    const outOfStockItems = products.filter((p) => Number(p.stock ?? 0) <= 0);
    const totalOrdersCount = orders.length;
    const totalProductsCount = products.length;
    const totalExpensesAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const storeSnapshot = {
      businessName,
      userRole,
      totalProductsCount,
      outOfStockCount: outOfStockItems.length,
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockItems.slice(0, 6).map((p) => `${p.name || p.sku} (${p.stock ?? 0} pcs)`),
      totalOrdersCount,
      totalExpensesAmount,
      reconciliationCount: reconciliations.length,
      plan: tenantConf.plan || "Starter / Trial",
    };

    // ── 4. Parse Merchant Prompt & Parameters ───────────────────
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const directAction = body.action || null; // e.g. "raise_ticket"

    if (!message && !directAction) {
      return NextResponse.json(
        {
          success: false,
          error: `মেসেজ লিখুন যাতে ${aiNameBn} আপনাকে উত্তর দিতে পারে।`,
        },
        { status: 400 }
      );
    }

    const detectedLang = detectLanguage(message); // "bn" | "banglish" | "en"
    const isEnglish = detectedLang === "en";
    const q = message.toLowerCase().trim();

    // Super Admin Kill-Switch / Maintenance Mode
    if (globalContact.aiIsActive === false) {
      return NextResponse.json({
        success: true,
        reply: `### ⏸️ **${aiNameBn} (${aiName}) বর্তমানে সাময়িকভাবে মেইনটেন্যান্সে রয়েছে**\n\nআমাদের প্ল্যাটফর্ম অ্যাডমিন এআই সহকারী আপডেট করছেন। যেকোনো জরুরি জিজ্ঞাসা বা পার্সেল সহায়তার জন্য আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন:\n- 📞 ফোন হটলাইন: **${globalContact.supportPhone}**\n- 💬 WhatsApp: **${globalContact.whatsappNumber}** (${globalContact.supportHours})\n- ✉️ ইমেইল: **${globalContact.supportEmail}**`,
        quickActions: [
          { label: "🎫 সাপোর্ট টিকিট ডেস্ক", href: "/dashboard/support" },
          { label: "🚀 অর্ডার ডিসপ্যাচ", href: "/bulk-orders" },
        ],
        suggestedQuestions: [],
      });
    }

    // Check helper
    const hasAny = (keywords) => keywords.some((k) => q.includes(k));

    // Extract any parcel tracking / consignment identifier in the query
    const extractedTrackingId =
      body.trackingId || extractTrackingOrConsignmentId(message);

    // ─────────────────────────────────────────────────────────────
    // FEATURE 0: HOW DOES PARCEL TRACKING & ISSUE RAISING WORK?
    // ─────────────────────────────────────────────────────────────
    const isExplainingTrackingOrTicket =
      !directAction &&
      !extractedTrackingId &&
      (hasAny([
        "tracking id dile", "tracking dile", "update dite parbe", "issue raise er dorkr",
        "ki korte parbe", "kivabe track", "kivabe ticket", "how does tracking work",
        "how to raise issue", "can you track", "ki vabe ticket", "ticket kivabe", "issue kivabe"
      ]) ||
        ((q.includes("tracking") || q.includes("issue") || q.includes("ticket") || q.includes("parcel")) &&
          (q.includes("parbe") || q.includes("kivabe") || q.includes("how") || q.includes("ki korbo") || q.includes("dorkr"))));

    if (isExplainingTrackingOrTicket) {
      let reply = "";
      if (isEnglish) {
        reply = `### 📦 **${aiName} AI Parcel Tracking & Issue Escalation Guide** 🤖✨

**Yes, absolutely!** ${aiName} is fully integrated with your store's logistics to track parcels in real time and automatically raise official support tickets:

---

### 1. 🔍 **What updates does ${aiName} provide with a Tracking ID?**
Simply provide any courier Tracking ID or Consignment ID (e.g. \`SF-8841029\` or \`PT-9482103\`). ${aiName} immediately checks your store's database and displays:
- 🟢 **Live Delivery Status Badge:** \`IN TRANSIT\`, \`DELIVERED\`, \`HOLD / RESCHEDULED\`, or \`RETURN TO ORIGIN\`.
- 🚚 **Courier Logistics Partner:** Steadfast, Pathao, RedX, Paperfly, etc.
- 👤 **Customer Recipient Details:** Customer name, privacy-masked phone number, and destination address.
- 💵 **COD Collection Amount:** Total Cash-on-Delivery collection value.
- ⏱️ **Booking & Dispatch Age:** Exact dispatch date and transit timeline.
- 💡 **Actionable Operational Advice:** Action steps if the delivery is delayed or held up.

---

### 2. 🎫 **What can ${aiName} do if an Issue or Ticket needs to be raised?**
If a parcel is delayed, lost, rejected without reason, or courier settlement is short:
- **Simply ask ${aiName} directly in chat:**
  > *"SF-8841029 parcel delivery delay, open a support ticket"*
  > or *"Raise issue for parcel SF-8841029"*
- **What happens automatically?**
  1. ${aiName} generates an official **High-Priority Support Ticket** (e.g. \`#TICK-884102\`) tagged under Courier Logistics Dispute.
  2. The ticket is immediately routed to the platform Operations & Super Admin console in \`/admin\`.
  3. You can review live responses and status updates anytime in your [Help & Support](/dashboard/support) desk!

---
💡 **Try it now:** Click any of the demonstration buttons below!`;
      } else {
        reply = `### 📦 **${aiNameBn} এআই (${aiName} AI) পার্সেল ট্র্যাকিং ও ইস্যু টিকিট গাইড** 🤖✨

**হ্যাঁ, ১০০% পারবে!** ${aiNameBn} আপনার স্টোরের সমস্ত কুরিয়ার পার্সেল লাইভ ট্র্যাক করতে পারে এবং যেকোনো সমস্যায় চ্যাট থেকেই সরাসরি অফিসিয়াল সাপোর্ট টিকিট তৈরি করতে পারে:

---

### ১. 🔍 **প্রোডাক্ট বা পার্সেল ট্র্যাকিং আইডি দিলে ${aiNameBn} কী কী আপডেট দিবে?**
আপনি চ্যাটে কুরিয়ারের যেকোনো **Tracking ID বা Consignment ID** (যেমন: \`SF-8841029\` বা \`PT-9482103\`) দিলেই ${aiNameBn} মুহূর্তের মধ্যে বিস্তারিত রিপোর্ট প্রদর্শন করবে:
- 🟢 **লাইভ ডেলিভারি স্ট্যাটাস:** In Transit (চলমান), Delivered (ডেলিভার্ড সম্পন্ন), Hold / Rescheduled (স্থগিত), বা Return (রিটার্ন হচ্ছে কিনা)।
- 🚚 **কুরিয়ার পার্টনার:** Steadfast, Pathao ইত্যাদি।
- 👤 **প্রাপকের তথ্য:** ক্রেতার নাম, মোবাইল নম্বর (প্রাইভেসি মাস্কড) এবং ডেলিভারি ঠিকানা।
- 💵 **COD ক্যাশ অন ডেলিভারি অ্যামাউন্ট:** পার্সেলের পণ্যের মোট মূল্য ও কুরিয়ার চার্জ।
- ⏱️ **ডিসপ্যাচ ও বুকিং তারিখ:** কবে পাঠানো হয়েছে এবং কতদিন ধরে ট্রানজিটে আছে।
- 💡 **অপারেশনাল পরামর্শ:** পার্সেল আটকে থাকলে বা কাস্টমার রিসিভ না করলে কী করণীয়।

---

### ২. 🎫 **ইস্যু রেইজ (Support Ticket) করার দরকার হলে কী করবেন?**
কোনো পার্সেল ডেলিভারি আটকে গেলে, গ্রাহক ভুল পণ্য পাওয়ার অভিযোগ করলে, বা কুরিয়ার টাকা আটকে রাখলে:
- **চ্যাটে সরাসরি বলুন:**
  > *"SF-8841029 এই পার্সেল অনেকদিন আটকে আছে, একটি সাপোর্ট টিকিট ওপেন করো"*
  > বা *"SF-8841029 parcel issue raise koro"*
- **${aiNameBn} কীভাবে সাহায্য করবে?**
  ১. চ্যাটের ভেতর থেকেই সাথে সাথে একটি অফিশিয়াল **High-Priority Support Ticket** (যেমন: \`#TICK-884102\`) তৈরি করে দিবে।
  ২. প্ল্যাটফর্ম সাপোর্ট টিম এবং সুপার অ্যাডমিনকে অবিলম্বে অ্যালার্ট পাঠাবে যাতে কুরিয়ার হাবে যোগাযোগ করা হয়।
  ৩. আপনার ড্যাশবোর্ডের [Help & Support](/dashboard/support) পেজে এটি সংরক্ষিত থাকবে, যেখানে অ্যাডমিনের রিপ্লাই ও স্ট্যাটাস লাইভ দেখতে পাবেন।

---
💡 **এখনই পরীক্ষা করে দেখুন:** নিচের যেকোনো টেস্ট বাটনে ক্লিক করুন!`;
      }

      return NextResponse.json({
        success: true,
        reply,
        quickActions: [
          { label: "📦 পার্সেল ট্র্যাকিং টেস্ট (SF-8841029)", href: "/bulk-orders" },
          { label: "🎫 সাপোর্ট ডেস্কে যান", href: "/dashboard/support" },
          { label: "📑 কুরিয়ার রিকনসিলিয়েশন", href: "/dashboard/reconciliation" },
        ],
        suggestedQuestions: [
          "SF-8841029 পার্সেলের ডেলিভারি স্ট্যাটাস কি?",
          "SF-8841029 পার্সেল অনেকদিন আটকে আছে, একটি সাপোর্ট টিকিট ওপেন করো",
          "আমার স্টোরের বর্তমান অবস্থা কি?",
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────
    // FEATURE 1: 1-CLICK ISSUE / TICKET RAISING DIRECTLY VIA PIKU
    // ─────────────────────────────────────────────────────────────
    const isTicketRaiseRequested =
      directAction === "raise_ticket" ||
      hasAny([
        "raise issue", "issue raise", "ticket raise", "raise ticket", "ticket open",
        "ticket kholo", "ticket khulun", "complain", "complaint", "dispute", "অভিযোগ", "টিকিট",
        "ticket dao", "file issue", "ticket create", "create ticket", "ticket banaw",
        "সমস্যা আছে", "ইস্যু রেইজ", "টিকিট কাটো", "টিকিট করো", "ticket koro"
      ]);

    if (isTicketRaiseRequested) {
      const ticketSubject = extractedTrackingId
        ? `[Courier Issue] Parcel ${extractedTrackingId} Dispute / Delay`
        : `[Merchant Support] Issue Reported via ${aiName} AI`;

      const ticketCategory = extractedTrackingId ? "courier" : "help";
      const ticketDescription = `Merchant Ticket filed via ${aiName} AI Assistant:
• Store: ${businessName} (ID: ${businessId})
• User Email: ${user.email}
• Tracking / Consignment: ${extractedTrackingId || "Not specified by merchant"}
• Reported Concern: "${message}"
• Timestamp: ${new Date().toLocaleString()}
• Action Required: Urgent investigation with courier partner / platform support team.`;

      const newTicket = saveSupportTicket({
        business_id: businessId,
        store_name: businessName,
        user_email: user.email,
        subject: ticketSubject,
        category: ticketCategory,
        priority: "high",
        description: ticketDescription,
      });

      let reply = "";
      if (isEnglish) {
        reply = `### 🎫 **Support Ticket Created Successfully!**

${aiName} has filed a **High Priority** ticket directly with our Operations & Support desk:

- 🔖 **Ticket ID:** \`#${newTicket.id}\`
- 📦 **Tracking Reference:** \`${extractedTrackingId || "General Inquiry"}\`
- 🏷️ **Category:** Courier Logistics & Delivery Dispute
- 🔴 **Priority:** **HIGH**
- 🟢 **Status:** **OPEN**

**Next Steps:**
1. Our platform operations team and courier hub managers will investigate this parcel immediately.
2. Track live progress and read replies in your [Help & Support](/dashboard/support) desk.`;
      } else {
        reply = `### 🎫 **সাপোর্ট টিকিট সফলভাবে ফাইল করা হয়েছে!**

${aiNameBn} আপনার জন্য সরাসরি প্ল্যাটফর্ম সাপোর্ট ডেস্কে একটি **হাই-প্রায়োরিটি** টিকিট তৈরি করেছে:

- 🔖 **টিকিট কোড:** \`#${newTicket.id}\`
- 📦 **ট্র্যাকিং রেফারেন্স:** \`${extractedTrackingId || "General Issue"}\`
- 🏷️ **ক্যাটাগরি:** Courier Logistics Dispute & Inquiry
- 🔴 **প্রায়োরিটি:** **HIGH**
- 🟢 **বর্তমান স্ট্যাটাস:** **OPEN**
- ⏱️ **সময়:** ${new Date().toLocaleTimeString()}

**এরপর কী হবে?**
১. আমাদের সাপোর্ট টিম ও প্ল্যাটফর্ম অ্যাডমিন সংশ্লিষ্ট কুরিয়ার হাবে (Steadfast/Pathao) পার্সেলটির বিষয়ে যোগাযোগ করে সমাধান করবে।
২. টিকিটের লাইভ আপডেট বা অ্যাডমিনের উত্তর দেখতে সরাসরি [Help & Support](/dashboard/support) ডেস্কে যান।`;
      }

      return NextResponse.json({
        success: true,
        reply,
        ticket: newTicket,
        quickActions: [
          { label: "💬 ভিউ সাপোর্ট টিকিট", href: "/dashboard/support" },
          { label: "🚀 অর্ডার কিউতে ফিরুন", href: "/bulk-orders" },
        ],
        suggestedQuestions: [
          "আমার স্টোরের বর্তমান অবস্থা কি?",
          "কুরিয়ারে রিটার্ন কমানোর উপায় কি?",
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────
    // FEATURE 2: LIVE PARCEL TRACKING BY TRACKING ID / CONSIGNMENT
    // ─────────────────────────────────────────────────────────────
    if (extractedTrackingId) {
      const match = findOrderOrParcel(extractedTrackingId, orders, reconciliations);

      let reply = "";
      let quickActions = [];

      if (match) {
        const orderData = match.data;
        const consignmentId = orderData.consignment_id || extractedTrackingId;
        const courierName = orderData.courier || orderData.courier_name || "Steadfast Courier";
        const customerName = orderData.customer_name || "Customer";
        const customerPhone = orderData.customer_phone || "";
        const maskedPhone = customerPhone.length > 5 ? `${customerPhone.slice(0, 3)}*****${customerPhone.slice(-2)}` : customerPhone;
        const customerAddress = orderData.customer_address || "Dhaka, Bangladesh";
        const totalAmount = Number(orderData.total_amount || orderData.amount || 0);
        const status = String(orderData.status || "DISPATCHED").toUpperCase();

        // Translate status into human-friendly badge
        let statusBadge = "🚚 IN TRANSIT (অন দ্য রোড)";
        let statusIcon = "🚚";
        let statusAdvice = "পার্সেলটি কুরিয়ার হাব থেকে ডেলিভারি ম্যানের কাছে রয়েছে। আশা করা যায় ২৪-৪৮ ঘণ্টার মধ্যে ক্রেতা গ্রহণ করবেন।";

        if (status.includes("DELIVER")) {
          statusBadge = "🟢 DELIVERED (সফল ডেলিভারি সম্পন্ন)";
          statusIcon = "✅";
          statusAdvice = "পার্সেলটি গ্রাহক গ্রহণ করেছেন এবং COD টাকা কুরিয়ার লেজারে জমা হয়েছে।";
        } else if (status.includes("PENDING")) {
          statusBadge = "🟡 PENDING DISPATCH (পিকআপ অপেক্ষমান)";
          statusIcon = "📦";
          statusAdvice = "পার্সেলটি প্যাক করা হয়েছে, কুরিয়ার পিকআপ রাইডারের হ্যান্ডওভারের অপেক্ষায় আছে।";
        } else if (status.includes("HOLD") || status.includes("DELAY")) {
          statusBadge = "🟠 HOLD / RESCHEDULED (ডেলিভারি স্থগিত)";
          statusIcon = "⚠️";
          statusAdvice = "গ্রাহক ফোন রিসিভ করেননি অথবা ডেলিভারির সময় পরিবর্তনের অনুরোধ করেছেন। অবিলম্বে গ্রাহককে কল করুন।";
        } else if (status.includes("RETURN") || status.includes("CANCEL")) {
          statusBadge = "🔴 RETURN TO ORIGIN (রিটার্ন হচ্ছে)";
          statusIcon = "↩️";
          statusAdvice = "গ্রাহক পার্সেল গ্রহণ করতে অস্বীকৃতি জানিয়েছেন। পার্সেলটি আপনার স্টোরের ঠিকানায় ফেরত আসছে।";
        }

        if (isEnglish) {
          reply = `### 📦 **Live Parcel Tracking Report for \`${consignmentId}\`**:

${statusIcon} **Current Status:** **${statusBadge}**

- 🚚 **Courier Partner:** ${courierName}
- 👤 **Recipient:** ${customerName} (${maskedPhone || "Verified Customer"})
- 📍 **Delivery Destination:** ${customerAddress}
- 💵 **COD Collection Amount:** ৳${totalAmount.toLocaleString()}
- ⏱️ **Booking / Dispatch Date:** ${new Date(orderData.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}

💡 **Operational Note:**
${statusAdvice}

---
⚠️ **Issue with this parcel?**
If delivery is unusually delayed, or the customer disputes delivery, click below to immediately raise an issue ticket.`;

          quickActions = [
            { label: "⚠️ Raise Dispute for this Parcel", href: "/dashboard/support" },
            { label: "🚀 View in Orders Queue", href: "/bulk-orders" },
            { label: "📑 Courier Audit", href: "/dashboard/reconciliation" },
          ];
        } else {
          reply = `### 📦 **পার্সেল লাইভ ট্র্যাকিং রিপোর্ট: \`${consignmentId}\`**

${statusIcon} **বর্তমান স্ট্যাটাস:** **${statusBadge}**

- 🚚 **কুরিয়ার পার্টনার:** ${courierName}
- 👤 **প্রাপক ক্রেতা:** ${customerName} (${maskedPhone || "কাস্টমার"})
- 📍 **ডেলিভারি ঠিকানা:** ${customerAddress}
- 💵 **ক্যাশ অন ডেলিভারি (COD):** ৳${totalAmount.toLocaleString()}
- ⏱️ **ডিসপ্যাচ তারিখ:** ${new Date(orderData.created_at || Date.now()).toLocaleDateString("bn-BD", { month: "short", day: "numeric", year: "numeric" })}

💡 **${aiNameBn}র অপারেশনাল পরামর্শ:**
${statusAdvice}

---
⚠️ **এই পার্সেল নিয়ে কোনো সমস্যা বা বিলম্ব হচ্ছে?**
কুরিয়ার যদি সময়মতো ডেলিভারি না দেয় বা কাস্টমার না পায়, তবে আপনি সরাসরি ${aiNameBn} দিয়ে **একটি সাপোর্ট টিকিট ফাইল** করতে পারেন। নিচের বাটনে ক্লিক করুন।`;

          quickActions = [
            { label: `⚠️ ${consignmentId} নিয়ে টিকিট তুলুন`, href: "/dashboard/support" },
            { label: "🚀 অর্ডার কিউতে দেখুন", href: "/bulk-orders" },
            { label: "📑 কুরিয়ার রিকনসিলিয়েশন", href: "/dashboard/reconciliation" },
          ];
        }

        return NextResponse.json({
          success: true,
          reply,
          quickActions,
          suggestedQuestions: [
            `এই পার্সেল ${consignmentId} নিয়ে সাপোর্ট টিকিট ওপেন করো`,
            "কুরিয়ারে রিটার্ন পার্সেল কমানোর উপায় কি?",
            "Steadfast & Pathao অটো-রিকনসিলিয়েশন কিভাবে করব?",
          ],
        });
      } else {
        // Identifier provided but not matched in local DB
        if (isEnglish) {
          reply = `### 🔍 **Tracking Search for \`${extractedTrackingId}\`:**

${aiName} could not find a matching parcel for \`${extractedTrackingId}\` in your store's current database. 

**Quick Troubleshooting:**
1. **Recent Dispatch:** If this consignment was created directly in Steadfast or Pathao portal, check directly:
   - [Steadfast Public Tracking](https://steadfast.com.bd/tracking/${extractedTrackingId})
   - [Pathao Courier Tracking](https://pathao.com/courier/)
2. **Raise a Courier Dispute Ticket:**
   If this parcel is missing or delayed, type **"Raise issue for ${extractedTrackingId}"** and ${aiName} will open an expedited support ticket immediately!`;

          quickActions = [
            { label: `⚠️ Open Ticket for ${extractedTrackingId}`, href: "/dashboard/support" },
            { label: "🚀 Check Orders Queue", href: "/bulk-orders" },
          ];
        } else {
          reply = `### 🔍 **ট্র্যাকিং আইডি \`${extractedTrackingId}\` এর রেজাল্ট:**

${aiNameBn} আপনার স্টোরের বর্তমান ডাটাবেজে \`${extractedTrackingId}\` কোডযুক্ত কোনো পার্সেল খুঁজে পায়নি।

**${aiNameBn}র পরামর্শ:**
১. **সরাসরি কুরিয়ার পোর্টালে চেক:** আপনি যদি এই পার্সেলটি সরাসরি Steadfast বা Pathao পোর্টালে বুক করে থাকেন:
   - [Steadfast লাইভ ট্র্যাকিং](https://steadfast.com.bd/tracking/${extractedTrackingId})
   - [Pathao কুরিয়ার ট্র্যাকিং](https://pathao.com/courier/)
২. **সাপোর্ট টিকিট ওপেন করুন:**
   এই পার্সেলটি নিয়ে কোনো সমস্যা বা ডেলিভারি বিলম্ব হলে আপনি চ্যাটে লিখুন: **"Raise issue for ${extractedTrackingId}"** — ${aiNameBn} সাথে সাথে একটি অফিশিয়াল সাপোর্ট টিকিট খুলে দেবে!`;

          quickActions = [
            { label: `⚠️ ${extractedTrackingId} নিয়ে টিকিট তুলুন`, href: "/dashboard/support" },
            { label: "🚀 অর্ডার ডিসপ্যাচ পেজ", href: "/bulk-orders" },
          ];
        }

        return NextResponse.json({
          success: true,
          reply,
          quickActions,
          suggestedQuestions: [
            `Raise issue for ${extractedTrackingId}`,
            "আমার স্টোরের বর্তমান অবস্থা কি?",
            "কুরিয়ারে রিটার্ন কমানোর উপায় কি?",
          ],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // FEATURE 3: EXTERNAL LLM GENERATION (WHEN API KEY AVAILABLE)
    // ─────────────────────────────────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let reply = "";
    let quickActions = [];
    let suggestedQuestions = [];

    const systemPrompt = `You are "${aiName}" (${aiNameBn}), an intelligent, friendly, senior AI Store Copilot & E-Commerce Operations Advisor designed for online store merchants and D2C brands in Bangladesh.
${globalContact.aiCustomInstructions ? `\nSUPER ADMIN OPERATIONAL GUIDANCE:\n${globalContact.aiCustomInstructions}\n` : ""}
You assist merchants with:
1. Live parcel tracking and issue/ticket raising.
2. Inventory management, reorder points, low stock alerts, barcode scanning, thermal printing.
3. Courier logistics in Bangladesh (Steadfast, Pathao, RedX), reducing RTO (Return-to-Origin), fraud prevention, advancing delivery charges.
4. Courier reconciliation, COD payments, automated invoice matching, return parcel tracking.
5. Business finance, daily expenses, calculating true net profit.
6. Platform helpline and official support details.

LIVE STORE CONTEXT:
- Store Name: "${storeSnapshot.businessName}"
- User Role: "${storeSnapshot.userRole}"
- Total Catalog Products: ${storeSnapshot.totalProductsCount}
- Out of Stock (0 pcs): ${storeSnapshot.outOfStockCount} items
- Low Stock (≤ 5 pcs): ${storeSnapshot.lowStockCount} items [${storeSnapshot.lowStockNames.join(", ") || "All products in healthy stock"}]
- Total Inbound Orders: ${storeSnapshot.totalOrdersCount}
- Monthly Recorded Expenses: ৳${storeSnapshot.totalExpensesAmount.toLocaleString()}
- Courier Reconciliations Logged: ${storeSnapshot.reconciliationCount}
- Plan: ${storeSnapshot.plan}

OFFICIAL PLATFORM SUPPORT CONTACTS:
- Hotline Phone: ${globalContact.supportPhone}
- Support WhatsApp: ${globalContact.whatsappNumber}
- Official Support Email: ${globalContact.supportEmail}
- Support Hours: ${globalContact.supportHours}

LANGUAGE & OUTPUT RULES:
- The user's input language is detected as: "${detectedLang.toUpperCase()}".
- If the user writes in English, reply in fluent, polished English.
- If the user writes in Banglish (e.g. "amr stock ki obostha?", "steadfast reconciliation kivabe korbo?"), reply in warm, natural Bengali script (with key business terms in English/Banglish for clarity).
- If the user writes in Bengali script (বাংলা), reply in elegant, polite Bengali.
- Use Markdown formatting: bullet points, bold key terms, numbered steps, math formulas where applicable.
- Embed clickable Markdown links to internal app pages:
  - Orders: [Orders & Dispatch](/bulk-orders)
  - Products: [Products Catalog](/dashboard/products)
  - Courier Reconciliation: [Courier Reconciliation](/dashboard/reconciliation)
  - Expenses: [Daily Expenses](/dashboard/expenses)
  - Reports: [Reports & Profit](/dashboard/reports)
  - Scanner: [Barcode Scanner](/dashboard/scanner)
  - Billing: [Billing & Plan](/dashboard/billing)
  - Support: [Help & Support](/dashboard/support)
- Keep responses structured, concise, and immediately actionable without generic filler.`;

    if (geminiKey) {
      try {
        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...history.slice(-6).map((h) => ({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text || "" }],
          })),
          { role: "user", parts: [{ text: message }] },
        ];

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            reply = candidateText.trim();
          }
        }
      } catch (err) {
        console.warn("Gemini call error in Piku:", err);
      }
    } else if (openaiKey) {
      try {
        const messages = [
          { role: "system", content: systemPrompt },
          ...history.slice(-6).map((h) => ({
            role: h.sender === "user" ? "user" : "assistant",
            content: h.text || "",
          })),
          { role: "user", content: message },
        ];

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
          }),
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          reply = openAiData?.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (err) {
        console.warn("OpenAI call error in Piku:", err);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // FEATURE 4: LOCAL MULTI-LANGUAGE KNOWLEDGE BASE
    // ─────────────────────────────────────────────────────────────
    if (!reply) {
      // INTENT: STORE STATUS / OVERVIEW
      if (
        hasAny([
          "store", "obostha", "অবস্থা", "kmn", "choltese", "summary", "overview",
          "snapshot", "সারসংক্ষেপ", "স্টোর", "dashboard", "stats", "kemon"
        ])
      ) {
        if (isEnglish) {
          reply = `### 🏬 **Live Store Overview for ${storeSnapshot.businessName}**:

Here is your real-time operations snapshot:

- 📦 **Total Catalog Products:** ${storeSnapshot.totalProductsCount} SKUs
- ⚠️ **Low Stock Items (≤ 5 pcs):** ${storeSnapshot.lowStockCount} items
  ${
    storeSnapshot.lowStockNames.length > 0
      ? `  - *Items needing attention:* ${storeSnapshot.lowStockNames.join(", ")}`
      : "  - *All catalog items have healthy stock levels.*"
  }
- 🛒 **Total Recorded Orders:** ${storeSnapshot.totalOrdersCount} consignments
- 💰 **Monthly Operating Expenses:** ৳${storeSnapshot.totalExpensesAmount.toLocaleString()}
- 🚚 **Courier Reconciliations Logged:** ${storeSnapshot.reconciliationCount} audit logs
- 🏷️ **Current Workspace Plan:** ${storeSnapshot.plan}

👉 Restock catalog items in [Products](/dashboard/products) or dispatch new parcels in [Orders & Dispatch](/bulk-orders).`;

          quickActions = [
            { label: "📦 View Products", href: "/dashboard/products" },
            { label: "🚀 Orders Queue", href: "/bulk-orders" },
            { label: "💵 Profit & Loss", href: "/dashboard/reports" },
          ];
          suggestedQuestions = [
            "How do I track parcel SF-8841029?",
            "How do I reduce courier return (RTO) rates?",
            "How to automate Steadfast & Pathao reconciliation?",
          ];
        } else {
          reply = `### 🏬 **${storeSnapshot.businessName}** এর লাইভ স্টোর রিপোর্ট:

${aiNameBn} আপনার স্টোরের বর্তমান ডাটা এনালাইসিস করেছে:

- 📦 **মোট প্রোডাক্ট ক্যাটালগ:** ${storeSnapshot.totalProductsCount} টি আইটেম
- ⚠️ **লো স্টক প্রোডাক্ট (≤ ৫ পিস):** ${storeSnapshot.lowStockCount} টি
  ${
    storeSnapshot.lowStockNames.length > 0
      ? `  - *আইটেমসমূহ:* ${storeSnapshot.lowStockNames.join(", ")}`
      : "  - *আলহামদুলিল্লাহ, সব প্রোডাক্টের পর্যাপ্ত স্টক রয়েছে।*"
  }
- 🛒 **মোট অর্ডার সংখ্যা:** ${storeSnapshot.totalOrdersCount} টি
- 💰 **রেকর্ডকৃত মোট খরচ:** ৳${storeSnapshot.totalExpensesAmount.toLocaleString()}
- 🚚 **কুরিয়ার রিকনসিলিয়েশন রেকর্ড:** ${storeSnapshot.reconciliationCount} টি
- 🏷️ **চলতি সাবস্ক্রিপশন প্ল্যান:** ${storeSnapshot.plan}

👉 আপনার স্টক রিস্টক করতে [Products](/dashboard/products) পেজে যান অথবা নতুন অর্ডার প্রসেস করতে [Orders & Dispatch](/bulk-orders) ব্যবহার করুন।`;

          quickActions = [
            { label: "📦 প্রোডাক্ট দেখুন", href: "/dashboard/products" },
            { label: "🚀 অর্ডার ডিসপ্যাচ", href: "/bulk-orders" },
            { label: "💰 খরচ ও লাভ", href: "/dashboard/reports" },
          ];
          suggestedQuestions = [
            "পার্সেল SF-8841029 এর ট্র্যাকিং স্ট্যাটাস কি?",
            "লো স্টক প্রোডাক্টগুলো কিভাবে রিস্টক করব?",
            "কুরিয়ারে রিটার্ন কমানোর উপায় কি?",
          ];
        }
      }

      // INTENT: RTO & RETURN PREVENTION
      else if (
        hasAny([
          "rto", "return", "রিটার্ন", "fake", "fraud", "advance", "অগ্রিম",
          "ferot", "feik", "dhoka", "churi", "loss", "ক্ষতি", "কুরিয়ার"
        ])
      ) {
        if (isEnglish) {
          reply = `### 🛡️ **Top Strategies to Reduce Courier RTO (Return-to-Origin) in Bangladesh:**

In Bangladesh e-commerce, every returned parcel costs online merchants **৳150 – ৳200** on average (courier return fees + ruined packaging boxes). Here is ${aiName}'s proven playbook:

1. **Collect Advance Delivery Charges (৳100 – ৳150):**
   - Take ৳70–৳80 for inside Dhaka and ৳130–৳150 for outside Dhaka via bKash/Nagad before shipping. This filters out 90% of fake or impulse buyers.
2. **Phone Verification Call:**
   - Always verify the customer's district, upazila, and exact address by phone before confirming.
3. **Check High RTO Risk Signals:**
   - In our [Orders & Dispatch](/bulk-orders) queue, ${aiName} automatically tags suspicious orders with **High RTO Risk** badges based on repeat cancellations.
4. **Fast 24-Hour Dispatch:**
   - Hand parcels to Steadfast or Pathao within 12–24 hours. The faster the delivery, the lower the refusal rate!

👉 Check your current order risks now in [Orders & Dispatch](/bulk-orders).`;

          quickActions = [
            { label: "🚀 Check Order Risks", href: "/bulk-orders" },
            { label: "📑 Courier Audits", href: "/dashboard/reconciliation" },
          ];
          suggestedQuestions = [
            "Track parcel SF-8841029",
            "How do I audit Steadfast & Pathao payments?",
            "How to calculate true Net Profit?",
          ];
        } else {
          reply = `### 🛡️ **কুরিয়ারে রিটার্ন (RTO) কমানোর শীর্ষ কার্যকরী কৌশল:**

বাংলাদেশে ই-কমার্সে প্রতিটি রিটার্ন পার্সেলের পেছনে গড়ে **৳১৫০ - ৳২০০** ক্ষতি হয় (কুরিয়ার রিটার্ন চার্জ + নষ্ট হওয়া বক্স ও পলি)। এটি রোধে ${aiNameBn}র ৪টি গোল্ডেন রুল:

1. **অগ্রিম ডেলিভারি চার্জ নিশ্চিত করুন:**
   - ঢাকার ভেতরে ৳৭০ - ৳৮০ এবং ঢাকার বাইরে ৳১৩০ - ৳১৫০ টাকা bKash/Nagad এ অগ্রিম নিন। এতে ক্রেতার পার্সেল রিসিভ করার দায়িত্ব তৈরি হয় এবং ফেক অর্ডার ৯০% কমে যায়।
2. **অর্ডার কনফার্মেশনের আগে ফোন কল:**
   - অর্ডার পাঠানোর আগে ফোন করে সঠিক জেলা, থানা ও ল্যান্ডমার্ক কনফার্ম করে নিন। ফোন রিসিভ না করলে পার্সেল হোল্ড রাখুন।
3. **স্মার্ট রিস্ক সিগন্যাল ব্যবহার করুন:**
   - আমাদের [Orders & Dispatch](/bulk-orders) পেজে প্রতিটি অর্ডারে **High RTO Risk** স্কোর ও ব্যাজ দেখানো হয়। রিস্ক হাই থাকলে সতর্ক হোন।
4. **১২-২৪ ঘণ্টার মধ্যে কুরিয়ারে হ্যান্ডওভার:**
   - কাস্টমার অর্ডার করার পর যত দ্রুত পার্সেল পায়, ডেলিভারি সাকসেস রেট তত বেশি থাকে। দেরি হলে কাস্টমারের আগ্রহ কমে যায়।

👉 আপনার বর্তমান অর্ডারের রিস্ক বিশ্লেষণ দেখতে সরাসরি [Orders & Dispatch](/bulk-orders) ওপেন করুন।`;

          quickActions = [
            { label: "🚀 অর্ডার রিস্ক চেক করুন", href: "/bulk-orders" },
            { label: "🚚 কুরিয়ার হিস্ট্রি", href: "/dashboard/reconciliation" },
          ];
          suggestedQuestions = [
            "পার্সেল SF-8841029 এর ট্র্যাকিং স্ট্যাটাস কি?",
            "Steadfast ও Pathao পেমেন্ট অডিট কিভাবে করব?",
            "ফেক কাস্টমার চেনার উপায় কি?",
          ];
        }
      }

      // INTENT: COURIER RECONCILIATION
      else if (
        hasAny([
          "reconcil", "রিকনসিল", "cod", "steadfast", "pathao", "বকেয়া", "বকেয়া",
          "milano", "milate", "audit", "statement", "csv"
        ])
      ) {
        if (isEnglish) {
          reply = `### 💰 **Automated Courier Reconciliation & COD Audit Guide:**

Couriers often deduct extra weight charges, duplicate return fees, or 1% COD fees without clear itemization. Here is how SmartInventory reconciles your accounts in 3 clicks:

1. **Export Statement CSV from Courier Portal:**
   - Go to your Steadfast or Pathao merchant portal and download your latest payment invoice or consignment CSV.
2. **Upload into SmartInventory:**
   - Open [Courier Reconciliation](/dashboard/reconciliation) and drag & drop the CSV into the upload zone.
3. **Automated Consignment Matching:**
   - The engine automatically cross-checks:
     - **Collected COD Amount:** What the customer actually paid.
     - **Disbursed Amount:** What the courier credited into your bank/bKash.
     - **Discrepancy Flags:** Any unpaid parcels or excess deductions are highlighted in red.
4. **1-Click Audit Approval:**
   - Click "Mark Reconciled" to balance your books and update your finance ledger.

👉 Open [Courier Reconciliation](/dashboard/reconciliation) now to audit pending invoices.`;

          quickActions = [
            { label: "📑 Courier Reconciliation", href: "/dashboard/reconciliation" },
            { label: "💵 Profit Report", href: "/dashboard/reports" },
          ];
          suggestedQuestions = [
            "Track parcel SF-8841029",
            "How do I record packaging and return parcel expenses?",
          ];
        } else {
          reply = `### 💰 **কুরিয়ার অটো-রিকনসিলিয়েশন ও COD টাকা মেলানোর সহজ নিয়ম:**

কুরিয়ার কোম্পানিগুলো অনেক সময় অতিরিক্ত ওয়েট চার্জ, ১% সিওডি ফি বেশি কাটা বা রিটার্ন পার্সেল হারিয়ে ফেলা সত্ত্বেও টাকা কেটে নেয়। SmartInventory তে এটি ১-ক্লিকে সমাধান করা যায়:

1. **কুরিয়ার পোর্টাল থেকে স্টেটমেন্ট CSV ডাউনলোড করুন:**
   - Steadfast বা Pathao মার্চেন্ট পোর্টাল থেকে পেমেন্ট ইনভয়েস বা ডিসপ্যাচ স্টেটমেন্ট CSV ফাইলটি নামিয়ে নিন।
2. **রিকনসিলিয়েশন পেজে আপলোড করুন:**
   - আমাদের [Courier Reconciliation](/dashboard/reconciliation) পেজে গিয়ে **"Upload Courier CSV"** বাটনে ফাইলটি ড্রপ করুন।
3. **সিস্টেমের অটোম্যাটিক ম্যাচিং:**
   - সিস্টেম প্রতিটি Consignment ID মিলিয়ে দেখাবে:
     - কাস্টমার থেকে কত টাকা উঠেছে (Collected COD)
     - কুরিয়ার কত টাকা জমা দিয়েছে (Paid Amount)
     - কোনো গরমিল (Discrepancy) থাকলে তা লাল সতর্কবার্তা দিয়ে দেখিয়ে দেবে।
4. **১-ক্লিক ভেরিফিকেশন:**
   - সব ঠিক থাকলে "Mark Reconciled" এ ক্লিক করে অ্যাকাউন্টস ক্লিয়ার করুন।

👉 এখনই আপনার কুরিয়ার স্টেটমেন্ট অডিট করতে [Courier Reconciliation](/dashboard/reconciliation) পেজে প্রবেশ করুন।`;

          quickActions = [
            { label: "📑 Courier Reconciliation খুলুন", href: "/dashboard/reconciliation" },
            { label: "💵 ডেলিভারি রিপোর্ট", href: "/dashboard/reports" },
          ];
          suggestedQuestions = [
            "পার্সেল SF-8841029 এর ট্র্যাকিং স্ট্যাটাস কি?",
            "কুরিয়ারের ১% সিওডি চার্জ কিভাবে খরচ হিসেবে যুক্ত করব?",
          ];
        }
      }

      // INTENT: OFFICIAL SUPPORT, HELPLINE & HOTLINE INQUIRY
      else if (
        hasAny([
          "hotline", "helpline", "support number", "admin number", "super admin", "contact",
          "whatsapp", "jogajog", "যোগাযোগ", "ফোন নাম্বার", "helpdesk", "support desk",
          "call admin", "kotha bolbo", "কথা বলতে চাই", "support chai"
        ])
      ) {
        const cleanWa = (globalContact.whatsappNumber || "8801753082749").replace(/[^0-9]/g, "");
        const waLink = `https://wa.me/${cleanWa.startsWith("88") ? cleanWa : "88" + cleanWa}?text=Hello%20SmartInventory%20Support`;
        if (isEnglish) {
          reply = `### 📞 **SmartInventory Official Platform Support & Hotline** 💬✨

Need urgent assistance or have questions about your store, billing, API gateways, or courier integrations? Our dedicated technical operations team is here to assist you:

- 📱 **Direct Hotline:** [${globalContact.supportPhone}](tel:${globalContact.supportPhone.replace(/[^0-9+]/g, "")})
- 💬 **Live WhatsApp Support:** [Chat on WhatsApp](${waLink}) (\`${globalContact.supportPhone}\`)
- 📧 **Official Support Email:** [${globalContact.supportEmail}](mailto:${globalContact.supportEmail})
- ⏰ **Support Operating Hours:** \`${globalContact.supportHours}\`
- 🎫 **Official Support Desk:** You can also open an expedited ticket in our [Merchant Support Desk](/dashboard/support).

Type **"Raise issue for [tracking id]"** anytime and ${aiName} will open a high-priority ticket for you automatically!`;

          quickActions = [
            { label: "🎫 Support Desk", href: "/dashboard/support" },
            { label: "💬 WhatsApp Chat", href: waLink },
            { label: "💳 Billing & Plans", href: "/dashboard/billing" },
          ];
          suggestedQuestions = [
            "How do I reduce courier return (RTO) rates?",
            "How to automate courier payment reconciliation?",
          ];
        } else {
          reply = `### 📞 **স্মার্টইনভেন্টরি অফিসিয়াল সাপোর্ট ও হেল্পলাইন** 💬✨

আপনার স্টোরের বিলিং, কুরিয়ার ইন্টিগ্রেশন, পেমেন্ট বা যেকোনো টেকনিক্যাল সহায়তার জন্য সরাসরি আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন:

- 📱 **সাপোর্ট হটলাইন:** [${globalContact.supportPhone}](tel:${globalContact.supportPhone.replace(/[^0-9+]/g, "")})
- 💬 **অফিসিয়াল হোয়াটসঅ্যাপ:** [হোয়াটসঅ্যাপে সরাসরি মেসেজ দিন](${waLink}) (\`${globalContact.supportPhone}\`)
- 📧 **অফিসিয়াল ইমেইল:** [${globalContact.supportEmail}](mailto:${globalContact.supportEmail})
- ⏰ **সাপোর্ট সময়সূচী:** \`${globalContact.supportHours}\`
- 🎫 **সাপোর্ট টিকিট ডেস্ক:** এছাড়াও আমাদের [মার্চেন্ট সাপোর্ট ডেস্ক](/dashboard/support) থেকে যেকোনো সময় টিকিট সাবমিট করতে পারেন।

কোনো নির্দিষ্ট পার্সেল বা ডেলিভারি নিয়ে অভিযোগ জানাতে চাইলে লিখুন: *"SF-8841029 এর সমস্যা নিয়ে টিকিট ওপেন করো"*—আমি সাথে সাথে টিকিট খুলে দেব!`;

          quickActions = [
            { label: "🎫 সাপোর্ট টিকিট ডেস্ক", href: "/dashboard/support" },
            { label: "💬 হোয়াটসঅ্যাপ সাপোর্ট", href: waLink },
            { label: "💳 সাবস্ক্রিপশন ও বিলিং", href: "/dashboard/billing" },
          ];
          suggestedQuestions = [
            "📦 কুরিয়ারে RTO রিটার্ন পার্সেল কমানোর উপায় কি?",
            "💰 Steadfast & Pathao অটো-রিকনসিলিয়েশন কিভাবে করব?",
          ];
        }
      }

      // INTENT: GREETINGS & INTRO
      else if (
        hasAny([
          "hi", "hello", "hey", "kemon", "কেমন", "tumi k", "তুমি কে", "who are you",
          "help", "sahajjo", "সাহায্য", "piku", "পিকু", "tuku", "টুকু",
          aiName.toLowerCase(), aiNameBn, "salam", "সালাম"
        ])
      ) {
        if (isEnglish) {
          reply = `### 👋 Hello! I am **${aiName}**, your 24/7 AI Store Copilot & Operations Advisor! 🤖✨

I am connected to **${storeSnapshot.businessName}** to help you track parcels, automate inventory, audit courier payouts, and file support tickets instantly.

**How can I help you right now?**
- 📦 **Live Parcel Tracking:** Type your consignment ID (e.g. \`SF-8841029\`) to see real-time delivery status!
- 🎫 **Instant Issue Filing:** If a parcel has delivery delays or disputes, say "Raise issue for [ID]" to open an official ticket!
- 📊 **Inventory & Reorders:** Low stock alerts and reorder point calculations.
- 💰 **Courier Reconciliation:** Auditing Steadfast and Pathao COD payouts.

Click any question below or ask me anything in English, Bengali, or Banglish!`;

          suggestedQuestions = [
            "Track parcel SF-8841029",
            "How is my store doing right now?",
            "How do I reduce courier return (RTO) rates?",
            "How to automate courier payment reconciliation?",
          ];
          quickActions = [
            { label: "🚀 Orders Queue", href: "/bulk-orders" },
            { label: "📑 Courier Audit", href: "/dashboard/reconciliation" },
            { label: "📦 Product Catalog", href: "/dashboard/products" },
          ];
        } else {
          reply = `### 👋 আসসালামু আলাইকুম! আমি **${aiNameBn} (${aiName})**, আপনার স্টোরের স্মার্ট এআই সহকারী! 🤖✨

আমি **${storeSnapshot.businessName}** স্টোরের ইনভেন্টরি, কুরিয়ার ডেলিভারি, পার্সেল ট্র্যাকিং এবং টিকেট ফাইল করার জন্য ২৪/৭ প্রস্তুত।

**আমি আপনাকে তাৎক্ষণিক যেভাবে সাহায্য করতে পারি:**
- 📦 **পার্সেল লাইভ ট্র্যাকিং:** যেকোনো কনসাইনমেন্ট আইডি (যেমন \`SF-8841029\`) লিখে সেন্ড করলেই লাইভ ডেলিভারি স্ট্যাটাস দেখতে পাবেন!
- 🎫 **১-ক্লিক অভিযোগ/টিকিট ফাইলিং:** পার্সেল ডেলিভারি না হলে বা কোনো সমস্যা হলে লিখুন *"SF-8841029 এর সমস্যা নিয়ে টিকিট ওপেন করো"*—আমি সাথে সাথে সাপোর্ট টিকিট খুলে দেব!
- 📊 **ইনভেন্টরি ও স্টক:** কোন প্রোডাক্টের স্টক শেষ, কখন রিস্টক করবেন।
- 💰 **কুরিয়ার রিকনসিলিয়েশন:** Steadfast ও Pathao এর পেমেন্ট মেলানো ও বকেয়া উদ্ধার।

নিচের যেকোনো প্রশ্নে ক্লিক করুন অথবা আপনার যা জানার তা বাংলায়, বাংলিশে বা ইংরেজিতে লিখুন!`;

          suggestedQuestions = [
            "পার্সেল SF-8841029 এর ট্র্যাকিং স্ট্যাটাস কি?",
            "🏬 আমার স্টোরের বর্তমান অবস্থা কি?",
            "📦 কুরিয়ারে RTO রিটার্ন পার্সেল কমানোর উপায় কি?",
            "💰 Steadfast & Pathao অটো-রিকনসিলিয়েশন কিভাবে করব?",
          ];
          quickActions = [
            { label: "🚀 অর্ডার ডিসপ্যাচ", href: "/bulk-orders" },
            { label: "📑 কুরিয়ার রিকনসিলিয়েশন", href: "/dashboard/reconciliation" },
            { label: "💬 সাপোর্ট হেল্পডেস্ক", href: "/dashboard/support" },
          ];
        }
      }

      // INTENT: UNIVERSAL FALLBACK
      else {
        if (isEnglish) {
          reply = `### 💡 **${aiName}'s Operations Guidance & Recommendations:**

You asked: *" ${message} "*

**${aiName}'s Operational Breakdown:**
1. **Live Store Snapshot:** Your store **${storeSnapshot.businessName}** currently has **${storeSnapshot.totalProductsCount} products** and **${storeSnapshot.totalOrdersCount} inbound orders** logged.
2. **Parcel Tracking:** If you have a tracking code (e.g. \`SF-8841029\`), send it here to view real-time delivery status!
3. **Raise Support Ticket:** If you are facing any operational bug or courier delivery delay, say *"Raise an issue"* and I will create an expedited support ticket for you.

How else can I assist your store operations today?`;

          suggestedQuestions = [
            "Track parcel SF-8841029",
            "How is my store doing right now?",
            "How do I reduce courier return (RTO) rates?",
          ];
          quickActions = [
            { label: "🚀 Orders Queue", href: "/bulk-orders" },
            { label: "💬 Help & Support", href: "/dashboard/support" },
          ];
        } else {
          reply = `### 💡 **${aiNameBn}র গাইডেন্স ও পরামর্শ:**

আপনার প্রশ্ন: *" ${message} "*

**${aiNameBn}র সুপারিশকৃত সমাধান:**
1. **স্টোর ওভারভিউ:** আপনার স্টোর **${storeSnapshot.businessName}** তে বর্তমানে **${storeSnapshot.totalProductsCount} টি প্রোডাক্ট** এবং **${storeSnapshot.totalOrdersCount} টি অর্ডার** লোড আছে।
2. **পার্সেল ট্র্যাকিং:** আপনার কোনো কনসাইনমেন্টের ট্র্যাকিং কোড থাকলে (যেমন \`SF-8841029\`), এখানে মেসেজ দিন; সাথে সাথে লাইভ ডেলিভারি স্ট্যাটাস দেখতে পাবেন।
3. **সাপোর্ট টিকিট ফাইলিং:** পার্সেল ডেলিভারি বিলম্ব বা কুরিয়ারে কোনো সমস্যা থাকলে বলুন *"এই পার্সেল নিয়ে টিকিট ওপেন করো"*—আমি সাথে সাথে সাপোর্ট টিকিট ফাইল করে দেব।

আমি আপনাকে আর কিভাবে সাহায্য করতে পারি?`;

          suggestedQuestions = [
            "পার্সেল SF-8841029 এর ট্র্যাকিং স্ট্যাটাস কি?",
            "আমার স্টোরের বর্তমান অবস্থা কি?",
            "কুরিয়ারে রিটার্ন পার্সেল কমানোর উপায় কি?",
          ];
          quickActions = [
            { label: "🚀 অর্ডার ম্যানেজমেন্ট", href: "/bulk-orders" },
            { label: "💬 সাপোর্ট হেল্পডেস্ক", href: "/dashboard/support" },
          ];
        }
      }
    }

    return NextResponse.json({
      success: true,
      reply,
      quickActions,
      suggestedQuestions,
      detectedLanguage: detectedLang,
      storeSnapshot: {
        businessName: storeSnapshot.businessName,
        totalProductsCount: storeSnapshot.totalProductsCount,
        lowStockCount: storeSnapshot.lowStockCount,
        totalOrdersCount: storeSnapshot.totalOrdersCount,
      },
    });
  } catch (error) {
    console.error("POST /api/ai/piku error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || `${aiNameBn || "AI"}র সার্ভার রেসপন্স করতে সমস্যা হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।`,
      },
      { status: 500 }
    );
  }
}
