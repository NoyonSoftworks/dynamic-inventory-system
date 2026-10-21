import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  getTenantExpenses,
  getTenantReconciliations,
  getTenantConfig,
} from "@/utils/storage/tenant-store";

/**
 * POST /api/ai/piku
 * Piku AI Assistant & Store Copilot Engine for Merchants
 */
export async function POST(request) {
  try {
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
          error: "অনুগ্রহ করে সাইন ইন করুন যাতে পিকু আপনার স্টোরের তথ্য দেখে সাহায্য করতে পারে।",
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
        .limit(40);
      products = prods || [];
    } catch {}

    let orders = [];
    try {
      const { data: ords } = await adminClient
        .from("orders")
        .select("id, customer_name, total_amount, status, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(30);
      orders = ords || [];
    } catch {}

    const expenses = await getTenantExpenses(businessId).catch(() => []);
    const reconciliations = await getTenantReconciliations(businessId).catch(() => []);
    const tenantConf = getTenantConfig(businessId) || {};

    const lowStockItems = products.filter((p) => Number(p.stock ?? 0) <= 5);
    const totalOrdersCount = orders.length;
    const totalProductsCount = products.length;
    const totalExpensesAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const storeSnapshot = {
      businessName,
      totalProductsCount,
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockItems.slice(0, 5).map((p) => `${p.name || p.sku} (${p.stock ?? 0} pcs)`),
      totalOrdersCount,
      totalExpensesAmount,
      reconciliationCount: reconciliations.length,
      plan: tenantConf.plan || "Starter / Trial",
    };

    // ── 4. Parse Merchant Prompt & History ───────────────────────
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "মেসেজ লিখুন যাতে পিকু আপনাকে উত্তর দিতে পারে।",
        },
        { status: 400 }
      );
    }

    // ── 5. AI Generation (External LLM or Built-in Intelligence) ──
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let reply = "";
    let quickActions = [];
    let suggestedQuestions = [];

    // System prompt with store context
    const systemPrompt = `You are "Piku" (পিকু), an expert AI Store Copilot & E-Commerce Operations Advisor designed for online store merchants and D2C brands in Bangladesh.
You assist merchants with:
1. Inventory management, reorder points, low stock alerts, barcode scanning, thermal printing.
2. Courier logistics in Bangladesh (Steadfast, Pathao, RedX), reducing RTO (Return-to-Origin), fraud prevention, advancing delivery charges.
3. Courier reconciliation, COD payments, automated invoice matching, return parcel tracking.
4. Business finance, daily expenses, calculating true net profit.
5. Store navigation and feature walkthroughs.

CURRENT STORE CONTEXT:
- Store Name: "${storeSnapshot.businessName}"
- Total Catalog Products: ${storeSnapshot.totalProductsCount}
- Low Stock (< 5 pcs): ${storeSnapshot.lowStockCount} items [${storeSnapshot.lowStockNames.join(", ") || "None currently"}]
- Total Inbound Orders: ${storeSnapshot.totalOrdersCount}
- Monthly Recorded Expenses: ৳${storeSnapshot.totalExpensesAmount.toLocaleString()}
- Courier Reconciliations Logged: ${storeSnapshot.reconciliationCount}
- Plan: ${storeSnapshot.plan}

PERSONALITY & LANGUAGE GUIDELINES:
- Friendly, professional, highly knowledgeable, like a senior operations director.
- Respond in the language used by the merchant:
  - If the user writes in Bengali script (বাংলা), reply in warm, clear Bengali.
  - If the user writes in Banglish (e.g. "amr stock ki obostha?"), reply in natural friendly Banglish / Bengali.
  - If the user writes in English, reply in crisp English.
- Use Markdown formatting: bullet points, bold key terms, and markdown links to internal pages when relevant:
  - Orders: [Orders & Dispatch](/bulk-orders)
  - Products: [Products Catalog](/dashboard/products)
  - Courier Reconciliation: [Courier Reconciliation](/dashboard/reconciliation)
  - Expenses: [Daily Expenses](/dashboard/expenses)
  - Reports: [Reports & Profit](/dashboard/reports)
  - Scanner: [Barcode Scanner](/dashboard/scanner)
  - Billing: [Billing & Plan](/dashboard/billing)
  - Support: [Help & Support](/dashboard/support)
- Keep responses concise, structured, and immediately actionable without fluff.`;

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

    // ── 6. High-Craft Built-in Neural Intelligence Fallback Engine ──
    // If no external LLM key is configured, or API call failed, Piku uses its built-in knowledge engine!
    if (!reply) {
      const q = message.toLowerCase().trim();

      // INTENT 1: Live Store Snapshot / Status ("amr store ki obostha", "summary", "how is my store", "stats")
      if (
        q.includes("store") ||
        q.includes("obostha") ||
        q.includes("status") ||
        q.includes("summary") ||
        q.includes("snapshot") ||
        q.includes("অবস্থা") ||
        q.includes("স্টোর") ||
        q.includes("সারসংক্ষেপ")
      ) {
        reply = `### 🏬 **${storeSnapshot.businessName}** এর লাইভ স্টোর রিপোর্ট:

পিকু আপনার স্টোরের বর্তমান ডাটা এনালাইসিস করেছে:

- 📦 **মোট প্রোডাক্ট ক্যাটালগ:** ${storeSnapshot.totalProductsCount} টি আইটেম
- ⚠️ **লো স্টক প্রোডাক্ট (≤ ৫ পিস):** ${storeSnapshot.lowStockCount} টি
  ${
    storeSnapshot.lowStockNames.length > 0
      ? `  - *আইটেমসমূহ:* ${storeSnapshot.lowStockNames.join(", ")}`
      : "  - *সব প্রোডাক্টের পর্যাপ্ত স্টক রয়েছে।*"
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
          "লো স্টক প্রোডাক্টগুলো কিভাবে রিস্টক করব?",
          "কুরিয়ারে রিটার্ন কমানোর উপায় কি?",
          "অটো-রিকনসিলিয়েশন কিভাবে করব?",
        ];
      }
      // INTENT 2: RTO & Return Prevention ("rto", "return", "fake order", "advance delivery", "রিটার্ন")
      else if (
        q.includes("rto") ||
        q.includes("return") ||
        q.includes("রিটার্ন") ||
        q.includes("কুরিয়ার") ||
        q.includes("fake") ||
        q.includes("advance") ||
        q.includes("অগ্রিম")
      ) {
        reply = `### 🛡️ **কুরিয়ারে রিটার্ন (RTO) কমানোর শীর্ষ কার্যকরী কৌশল:**

বাংলাদেশে ই-কমার্সে প্রতিটি রিটার্ন পার্সেলের পেছনে গড়ে **৳১৫০ - ৳২০০** ক্ষতি হয় (কুরিয়ার রিটার্ন চার্জ + প্যাকেজিং নষ্ট)। এটি রোধ করতে পিকুর পরামর্শ:

1. **অগ্রিম ডেলিভারি চার্জ নিশ্চিত করুন:**
   - ঢাকার ভেতরে ৳৭০ - ৳৮০ এবং ঢাকার বাইরে ৳১৩০ - ৳১৫০ টাকা bKash/Nagad এ অগ্রিম নিন। এতে ক্রেতার কমিটমেন্ট থাকে এবং ফেক অর্ডার ৯০% কমে যায়।
2. **কল করে ঠিকানা ভেরিফাই করুন:**
   - অর্ডার কনফার্ম করার আগে গ্রাহকের জেলা ও থানার সঠিক ঠিকানা ফোন কলের মাধ্যমে মিলিয়ে নিন।
3. **স্মার্ট রিস্ক সিগন্যাল ব্যবহার করুন:**
   - আমাদের [Orders & Dispatch](/bulk-orders) পেজে প্রতিটি অর্ডারে **High RTO Risk** স্কোর দেখানো হয়। যে অর্ডারে রিস্ক হাই, সেগুলোতে ফোন না দিয়ে পার্সেল বুক করবেন না।
4. **দ্রুত হ্যান্ডওভার ও ট্র্যাকিং SMS:**
   - অর্ডার পাওয়ার ১২-২৪ ঘণ্টার মধ্যে কুরিয়ারে পার্সেল জমা দিন। বিলম্ব হলে ক্রেতা আগ্রহ হারিয়ে পার্সেল রিসিভ করতে অস্বীকৃতি জানায়।

👉 আপনার বর্তমান অর্ডারের রিস্ক বিশ্লেষণ দেখতে সরাসরি [Orders & Dispatch](/bulk-orders) ওপেন করুন।`;

        quickActions = [
          { label: "🚀 অর্ডার রিস্ক চেক করুন", href: "/bulk-orders" },
          { label: "🚚 কুরিয়ার হিস্ট্রি", href: "/dashboard/reconciliation" },
        ];
        suggestedQuestions = [
          "Steadfast ও Pathao পেমেন্ট অডিট কিভাবে করব?",
          "ফেক কাস্টমার চেনার উপায় কি?",
          "নিট প্রফিট ক্যালকুলেট করার নিয়ম কি?",
        ];
      }
      // INTENT 3: Courier Reconciliation ("reconciliation", "পেমেন্ট", "বকেয়া", "cod", "steadfast", "pathao", "টাকা")
      else if (
        q.includes("reconcil") ||
        q.includes("রিকনসিল") ||
        q.includes("cod") ||
        q.includes("steadfast") ||
        q.includes("pathao") ||
        q.includes("বকেয়া") ||
        q.includes("পেমেন্ট") ||
        q.includes("হিসাব")
      ) {
        reply = `### 💰 **কুরিয়ার অটো-রিকনসিলিয়েশন ও COD টাকা মেলানোর নিয়ম:**

কুরিয়ার কোম্পানিগুলো অনেক সময় অতিরিক্ত ওয়েট চার্জ, ১% সিওডি ফি বেশি কাটা বা রিটার্ন পার্সেল হারিয়ে ফেলা সত্ত্বেও টাকা কেটে নেয়। SmartInventory তে এটি ১-ক্লিকে সমাধান করা যায়:

1. **কুরিয়ার থেকে স্টেটমেন্ট CSV ডাউনলোড করুন:**
   - Steadfast বা Pathao মার্চেন্ট পোর্টাল থেকে আপনার সাম্প্রতিক পেমেন্ট ইনভয়েস বা ডিসপ্যাচ স্টেটমেন্ট CSV ফাইলটি ডাউনলোড করুন।
2. **রিকনসিলিয়েশন পেজে আপলোড করুন:**
   - আমাদের [Courier Reconciliation](/dashboard/reconciliation) পেজে গিয়ে **"Upload Courier CSV"** বাটনে ফাইলটি ড্রপ করুন।
3. **সিস্টেমের অটোম্যাটিক ম্যাচিং:**
   - সিস্টেম প্রতিটি Consignment ID মিলিয়ে দেখবে:
     - কাস্টমার থেকে কত টাকা তোলা হয়েছে (Collected COD)
     - কুরিয়ার কত টাকা জমা দিয়েছে (Paid Amount)
     - কোনো ডিসক্রিপেন্সি (পার্থক্য) থাকলে তা লাল সতর্কবার্তা দিয়ে দেখিয়ে দেবে।
4. **১-ক্লিক ভেরিফিকেশন:**
   - সব ঠিক থাকলে "Mark Reconciled" বাটনে ক্লিক করে লেজার আপডেট করুন।

👉 এখনই আপনার কুরিয়ার স্টেটমেন্ট অডিট করতে [Courier Reconciliation](/dashboard/reconciliation) পেজে প্রবেশ করুন।`;

        quickActions = [
          { label: "📑 Courier Reconciliation খুলুন", href: "/dashboard/reconciliation" },
          { label: "💵 ডেলিভারি রিপোর্ট", href: "/dashboard/reports" },
        ];
        suggestedQuestions = [
          "কুরিয়ারের ১% সিওডি চার্জ কিভাবে খরচ হিসেবে যুক্ত করব?",
          "রিটার্ন পার্সেলের ক্ষতি কিভাবে রিকভার করব?",
        ];
      }
      // INTENT 4: Stock & Reorder Point ("stock", "reorder", "rop", "safety stock", "স্টক", "মাল")
      else if (
        q.includes("stock") ||
        q.includes("স্টক") ||
        q.includes("reorder") ||
        q.includes("rop") ||
        q.includes("সাপ্লায়ার") ||
        q.includes("পণ্য")
      ) {
        reply = `### 📊 **ইনভেন্টরি ব্যালেন্স ও Reorder Point (ROP) হিসাব করার নিয়ম:**

স্টক শেষ হয়ে গেলে কাস্টমার অন্য দোকানে চলে যায়, আবার অতিরিক্ত স্টক ফেলে রাখলে টাকা আটকে থাকে। পিকুর বৈজ্ঞানিক নিয়ম:

**১. Reorder Point (ROP) সূত্র:**
\\[
\\text{ROP} = (\\text{দৈনিক গড় বিক্রি} \\times \\text{সাপ্লায়ার লিড টাইম দিন}) + \\text{সেফটি স্টক}
\\]

*উদাহরণ:* আপনার কোনো টি-শার্ট যদি দিনে **১০ পিস** বিক্রি হয় এবং সাপ্লায়ার থেকে বানিয়ে আনতে **৫ দিন** লাগে, আর সেফটি স্টক **১৫ পিস** হয়:
\\[
\\text{ROP} = (10 \\times 5) + 15 = 65 \\text{ পিস}
\\]
অর্থাৎ স্টক ৬৫ পিসে নামলেই নতুন অর্ডার প্লেস করতে হবে!

**২. আপনার বর্তমান স্টোরে স্টক পরিস্থিতি:**
- বর্তমানে **${storeSnapshot.lowStockCount} টি প্রোডাক্ট** লো স্টক সীমার মধ্যে আছে।
${
  storeSnapshot.lowStockNames.length > 0
    ? `  - লো স্টক প্রোডাক্ট: *${storeSnapshot.lowStockNames.join(", ")}*`
    : ""
}

👉 স্টক আপডেট করতে বা নতুন লট যোগ করতে [Products Catalog](/dashboard/products) পেজে যান।`;

        quickActions = [
          { label: "📦 প্রোডাক্ট ক্যাটালগ", href: "/dashboard/products" },
          { label: "🏷️ বারকোড স্ক্যানার", href: "/dashboard/scanner" },
        ];
        suggestedQuestions = [
          "ডেডস্টক বা অবিক্রীত পণ্য ক্লিয়ার করার কৌশল কি?",
          "বারকোড লেবেল কিভাবে প্রিন্ট করব?",
        ];
      }
      // INTENT 5: Barcode & Thermal Printing ("barcode", "scanner", "thermal", "print", "বারকোড", "প্রিন্ট")
      else if (
        q.includes("barcode") ||
        q.includes("scanner") ||
        q.includes("thermal") ||
        q.includes("print") ||
        q.includes("বারকোড") ||
        q.includes("প্রিন্ট") ||
        q.includes("লেবেল")
      ) {
        reply = `### 🏷️ **বারকোড স্ক্যানিং ও থার্মাল লেবেল প্রিন্টিং গাইড:**

SmartInventory তে আপনি কোনো বাড়তি সফটওয়্যার ছাড়াই যেকোনো থার্মাল প্রিন্টার (যেমন Xprinter, Rongta, TSC) দিয়ে ১-ক্লিকে লেবেল প্রিন্ট করতে পারেন:

1. **বারকোড তৈরি:**
   - আপনি যখনই [Products](/dashboard/products) এ কোনো নতুন প্রোডাক্ট যুক্ত করেন, সিস্টেম অটোম্যাটিক ইউনিক বারকোড (CODE128) জেনারেট করে দেয়।
2. **থার্মাল স্টিকার প্রিন্ট (4×6 বা 50×30mm):**
   - প্রোডাক্ট রো-তে থাকা **"Print Label"** এ ক্লিক করে আপনার প্রিন্টার পেপার সাইজ নির্বাচন করুন।
3. **প্যাকিং ও ডিসপ্যাচ স্ক্যানিং:**
   - পার্সেল প্যাক করার সময় আমাদের [Barcode Scanner](/dashboard/scanner) চালু করুন।
   - মোবাইল ক্যামেরা অথবা USB লেজার বারকোড গান দিয়ে স্ক্যান করলেই আইটেম ভেরিফাই হবে এবং ইনভেন্টরি থেকে অটো-মাইনাস হয়ে যাবে!

👉 এখনই ট্রাই করতে [Barcode Scanner](/dashboard/scanner) ওপেন করুন।`;

        quickActions = [
          { label: "📷 বারকোড স্ক্যানার", href: "/dashboard/scanner" },
          { label: "📦 ইনভয়েস ও লেবেল", href: "/bulk-orders" },
        ];
        suggestedQuestions = [
          "একসাথে অনেকগুলো অর্ডারের ইনভয়েস কিভাবে প্রিন্ট করব?",
          "ইনভেন্টরি অপারেশন কিভাবে কাজ করে?",
        ];
      }
      // INTENT 6: Expenses & Net Profit ("expense", "profit", "খরচ", "লাভ", "net profit", "gross profit")
      else if (
        q.includes("expense") ||
        q.includes("profit") ||
        q.includes("লাভ") ||
        q.includes("খরচ") ||
        q.includes("হিসেব") ||
        q.includes("লস")
      ) {
        reply = `### 💵 **নিট প্রফিট (Net Profit) ও ব্যবসার লাভ-ক্ষতি হিসাব:**

অনেকে ভাবেন (বিক্রয়মূল্য - কেনামূল্য) = লাভ। এটি মারাত্মক ভুল! সঠিক হিসাব হলো:

**প্রকৃত নিট প্রফিট সূত্র:**
\\[
\\text{Net Profit} = \\text{Total Sales Revenue} - (\\text{Product COGS} + \\text{Courier Delivery & Return Loss} + \\text{Ad Spend / Boost Cost} + \\text{Packaging & Operational Expenses})
\\]

**পিকুর গুরুত্বপূর্ণ ট্রিপল-চেক রুল:**
1. **প্রতিটি রিটার্ন পার্সেলের খরচ যোগ করুন:** যদি ১০টি পার্সেলের মধ্যে ২টি রিটার্ন আসে, তবে বাকী ৮টি পার্সেলের লাভ থেকে রিটার্নের ৩০০ টাকা কেটে হিসাব করতে হবে।
2. **প্রতিদিনের খরচ সাথে সাথে নোট করুন:** আমাদের [Daily Expenses](/dashboard/expenses) মডিউলে ফেসবুক অ্যাড খরচ, পলি ব্যাগ, টেপ, অফিস ভাড়া ইত্যাদি এন্ট্রি দিয়ে রাখুন।
3. **রিয়েল-টাইম প্রফিট রিপোর্ট:** [Reports & Profit](/dashboard/reports) পেজে গেলে আপনি দেখতে পাবেন আপনার আসল মার্জিন কত পার্সেন্ট দাঁড়িয়েছে।

👉 আজকের খরচ এন্ট্রি দিতে [Daily Expenses](/dashboard/expenses) ওপেন করুন।`;

        quickActions = [
          { label: "📝 দৈনিক খরচ লিখুন", href: "/dashboard/expenses" },
          { label: "📈 প্রফিট রিপোর্ট দেখুন", href: "/dashboard/reports" },
        ];
        suggestedQuestions = [
          "আমার স্টোরে বর্তমানে মোট কত টাকা খরচ এন্ট্রি আছে?",
          "কুরিয়ারে রিটার্ন কমানোর উপায় কি?",
        ];
      }
      // INTENT 7: Greetings & General Intro ("hi", "hello", "kemon acho", "who are you", "tumi k", "হাই", "হ্যালো")
      else if (
        q === "hi" ||
        q === "hello" ||
        q.includes("kemon") ||
        q.includes("কেমন") ||
        q.includes("tumi k") ||
        q.includes("তুমি কে") ||
        q.includes("পিকু") ||
        q.includes("piku")
      ) {
        reply = `### 👋 হ্যালো! আমি **পিকু (Piku)**, আপনার স্টোরের স্মার্ট এআই সহকারী! 🤖✨

আমি **${storeSnapshot.businessName}** স্টোরের ইনভেন্টরি, কুরিয়ার ডেলিভারি, রিকনসিলিয়েশন এবং সেলস বাড়ানোর জন্য ২৪/৭ আপনার সাথে আছি।

**আমি আপনাকে যেগুলোতে সাহায্য করতে পারি:**
- 📦 **ইনভেন্টরি ও স্টক:** কোন প্রোডাক্টের স্টক শেষ, কখন রিস্টক করবেন।
- 🚚 **কুরিয়ার ও রিটার্ন:** Steadfast ও Pathao এর পার্সেল ট্র্যাকিং, RTO রিটার্ন প্রতিরোধ।
- 💰 **রিকনসিলিয়েশন:** কুরিয়ারের সাথে সিওডি টাকার হিসাব মিলিয়ে বকেয়া টাকা আদায়।
- 💵 **লাভ-ক্ষতি ও খরচ:** আপনার ব্যবসার আসল নিট প্রফিট ও দৈনিক খরচের হিসাব।
- 🏷️ **বারকোড ও ইনভয়েস:** থার্মাল লেবেল প্রিন্টিং এবং স্ক্যানার গাইড।

নিচের যেকোনো প্রশ্নে ক্লিক করুন অথবা আপনার যা জানার তা বাংলায় বা ইংরেজিতে লিখুন!`;

        suggestedQuestions = [
          "🏬 আমার স্টোরের বর্তমান অবস্থা কি?",
          "📦 কুরিয়ারে RTO রিটার্ন পার্সেল কমানোর উপায় কি?",
          "💰 Steadfast & Pathao অটো-রিকনসিলিয়েশন কিভাবে করব?",
          "📊 স্টক শেষ হওয়ার আগেই রিস্টক করার সূত্র কি?",
          "🏷️ বারকোড স্ক্যানার কিভাবে ব্যবহার করব?",
        ];
        quickActions = [
          { label: "🚀 অর্ডার ডিসপ্যাচ", href: "/bulk-orders" },
          { label: "📑 কুরিয়ার রিকনসিলিয়েশন", href: "/dashboard/reconciliation" },
          { label: "📦 প্রোডাক্ট ক্যাটালগ", href: "/dashboard/products" },
        ];
      }
      // INTENT 8: Intelligent Universal Contextual Response
      else {
        reply = `### 💡 **পিকুর গাইডেন্স ও পরামর্শ:**

আপনার প্রশ্ন: *" ${message} "*

**পিকুর সুপারিশকৃত সমাধান:**
1. **সিস্টেম চেক:** আপনার স্টোর **${storeSnapshot.businessName}** তে বর্তমানে **${storeSnapshot.totalProductsCount} টি প্রোডাক্ট** এবং **${storeSnapshot.totalOrdersCount} টি অর্ডার** লোড আছে।
2. **অপারেশনাল গাইড:** আপনি যদি কোনো নির্দিষ্ট মডিউলে কাজ করতে চান:
   - অর্ডার প্রসেস এবং কুরিয়ার বুকিং: [Orders & Dispatch](/bulk-orders)
   - প্রোডাক্ট স্টক ম্যানেজমেন্ট: [Products Catalog](/dashboard/products)
   - কুরিয়ার পেমেন্ট অডিট ও ভেরিফিকেশন: [Courier Reconciliation](/dashboard/reconciliation)
   - ব্যবসার নিট প্রফিট ও খরচের হিসাব: [Daily Expenses](/dashboard/expenses) ও [Reports](/dashboard/reports)
   - সাবস্ক্রিপশন ও বিলিং: [Billing & Plan](/dashboard/billing)
3. **লাইভ সাহায্য:** আপনার কোনো নির্দিষ্ট প্রশ্ন বা টেকনিক্যাল সমস্যা থাকলে সরাসরি আমাদের [Help & Support](/dashboard/support) এ টিকিট ওপেন করতে পারেন অথবা পিকুকে আরো বিস্তারিতভাবে জিজ্ঞাসা করতে পারেন।

আমি আপনাকে আরও কীভাবে সাহায্য করতে পারি?`;

        suggestedQuestions = [
          "আমার স্টোরের বর্তমান অবস্থা কি?",
          "কুরিয়ারে রিটার্ন পার্সেল কমানোর উপায় কি?",
          "অটো-রিকনসিলিয়েশন কিভাবে কাজ করে?",
        ];
        quickActions = [
          { label: "🚀 অর্ডার ম্যানেজমেন্ট", href: "/bulk-orders" },
          { label: "📦 প্রোডাক্ট ক্যাটালগ", href: "/dashboard/products" },
          { label: "💬 সাপোর্ট হেল্পডেস্ক", href: "/dashboard/support" },
        ];
      }
    }

    return NextResponse.json({
      success: true,
      reply,
      quickActions,
      suggestedQuestions,
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
        error: error.message || "পিকুর সার্ভার রেসপন্স করতে সমস্যা হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
      },
      { status: 500 }
    );
  }
}
