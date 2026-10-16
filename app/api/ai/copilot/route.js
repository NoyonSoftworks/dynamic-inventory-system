import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

/**
 * POST /api/ai/copilot
 * Multi-Tenant AI Logistics, Operations & Profit Intelligence Engine
 * 
 * Capabilities:
 * 1. RTO Delivery Risk & Fraud Predictor (pre-dispatch loss prevention)
 * 2. Smart Supplier Invoice / Challan Intake Parser
 * 3. Autonomous Purchase Order (PO) & Reorder Point (ROP) Generator
 * 4. Deadstock Liquidation & Bundling Recommendation Engine
 */
export async function POST(request) {
  try {
    // ── 1. Strict Authentication Guard (Zero unauthenticated access) ──
    const supabase = await createClient();
    let {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    // Resilient fallback: Check Authorization Bearer header or sb-access-token cookie
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
          error: "Authentication required to access automated copilot intelligence. Please sign in.",
        },
        { status: 401 }
      );
    }

    // ── 2. Strict Workspace Membership & Isolation Guard ──────────
    const adminEmail = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
    )
      .toLowerCase()
      .trim();
    const isSuperAdmin = user.email?.toLowerCase().trim() === adminEmail;

    const adminClient = createAdminClient();
    const { data: roleRow, error: roleErr } = await adminClient
      .from("user_roles")
      .select("business_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!isSuperAdmin && (roleErr || !roleRow?.business_id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied: Verified tenant workspace membership required.",
        },
        { status: 403 }
      );
    }

    const callerBusinessId = roleRow?.business_id || null;

    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      // ─────────────────────────────────────────────────────────────
      // 1. RTO (RETURN-TO-ORIGIN) DELIVERY RISK & FRAUD PREDICTOR
      // ─────────────────────────────────────────────────────────────
      case "rto_risk_analysis": {
        const {
          phone = "",
          address = "",
          codAmount = 0,
          courier = "Steadfast",
          customerName = "",
        } = payload || {};

        let riskScore = 12; // Base baseline risk
        const flags = [];
        const cleanPhone = String(phone).replace(/[^0-9]/g, "");
        const cleanAddress = String(address).trim();
        const numAmount = Number(codAmount) || 0;

        // Check 1: Phone number validity in Bangladesh
        const bdPrefixes = ["013", "014", "015", "016", "017", "018", "019"];
        const hasValidPrefix = bdPrefixes.some((p) => cleanPhone.startsWith(p));

        if (cleanPhone.length !== 11) {
          riskScore += 35;
          flags.push("Invalid phone length (must be exactly 11 digits in Bangladesh).");
        } else if (!hasValidPrefix) {
          riskScore += 30;
          flags.push("Unrecognized mobile operator prefix.");
        }

        // Check for suspicious repeating or dummy numbers (e.g. 01700000000 or 01712345678)
        if (/(\d)\1{5,}/.test(cleanPhone)) {
          riskScore += 45;
          flags.push("Suspicious repeating digits detected in phone number.");
        }

        // Check 2: Address detail & completeness
        const addressWords = cleanAddress.split(/\s+/).filter(Boolean);
        if (cleanAddress.length < 12 || addressWords.length < 3) {
          riskScore += 30;
          flags.push("Incomplete or vague address (lacks house/road/thana specification).");
        }

        const vagueTerms = ["dhaka", "chittagong", "bazar", "mor", "near school", "bari"];
        if (cleanAddress.length < 20 && vagueTerms.some((t) => cleanAddress.toLowerCase() === t)) {
          riskScore += 25;
          flags.push("Single-word or landmark-only address without specific recipient house.");
        }

        // Check 3: COD Order Value Risk Threshold
        if (numAmount > 6000) {
          riskScore += 18;
          flags.push(`High COD consignment value (৳${numAmount.toLocaleString()}) increases refusal probability.`);
        } else if (numAmount > 3500) {
          riskScore += 8;
        }

        // Check 4: Remote Courier Delivery Zone
        const isRemoteDistrict = /kurigram|panchagarh|bandarban|khagrachari|rangamati|barguna|sunamganj/i.test(
          cleanAddress
        );
        if (isRemoteDistrict) {
          riskScore += 12;
          flags.push("Remote district destination with longer transit turnaround SLA.");
        }

        // Clamp score between 5 and 98
        const finalScore = Math.min(98, Math.max(5, riskScore));

        let riskLevel = "LOW";
        let recommendation = "Safe to dispatch via automated booking.";
        let advanceFeeRequired = false;

        if (finalScore >= 60) {
          riskLevel = "HIGH";
          recommendation =
            "DO NOT dispatch as COD directly. Collect delivery fee (৳130-৳150) in advance via bKash/Nagad before shipment.";
          advanceFeeRequired = true;
        } else if (finalScore >= 35) {
          riskLevel = "MEDIUM";
          recommendation =
            "Call customer to confirm active delivery address and availability before handing over to courier.";
          advanceFeeRequired = false;
        }

        return NextResponse.json({
          success: true,
          riskScore: finalScore,
          riskLevel,
          flags,
          recommendation,
          advanceFeeRequired,
          estimatedLossPrevented: finalScore >= 50 ? 160 + Math.round(numAmount * 0.05) : 0,
          customerName: customerName || "Customer",
          courier,
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 2. SMART INVOICE & CHALLAN INTAKE PARSER
      // ─────────────────────────────────────────────────────────────
      case "parse_invoice": {
        const { rawText = "" } = payload || {};

        if (!rawText.trim()) {
          return NextResponse.json(
            { success: false, error: "Invoice text cannot be empty." },
            { status: 400 }
          );
        }

        // Split text into candidate lines
        const lines = rawText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 2);

        const parsedItems = [];
        let totalCost = 0;

        lines.forEach((line, idx) => {
          // Look for patterns: Product name, Quantity, Unit Price
          // Example formats:
          // "Wireless Bluetooth Earbuds - Qty: 20 @ 450"
          // "Vintage Cotton T-Shirt L x 50 - 320 BDT"
          // "Leather Wallet | 15 pcs | 650 tk"
          // "3. Oxford Formal Shoes (Brown) - 10 pcs - 1200"

          const cleanLine = line.replace(/^\d+[\.\)\-]\s*/, ""); // remove bullet/index

          // Regex matching: (Name) (qty indicators) (price indicators)
          const qtyMatch = cleanLine.match(/(\d+)\s*(?:pcs|pc|qty|units?|x|pairs?)/i) ||
            cleanLine.match(/[,\-–]\s*(\d+)\s*[,\-–]/);
          const priceMatch = cleanLine.match(/(?:@|tk|bdt|৳|cost|rate|price|\$)\s*(\d+(?:\.\d+)?)/i) ||
            cleanLine.match(/(\d+(?:\.\d+)?)\s*(?:tk|bdt|৳|\/\-)/i);

          let quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;
          let unitCost = priceMatch ? parseFloat(priceMatch[1]) : 450;

          // If no specific match was found, perform basic heuristic token split
          if (!qtyMatch && !priceMatch) {
            const numbers = cleanLine.match(/\b\d+(\.\d+)?\b/g);
            if (numbers && numbers.length >= 2) {
              quantity = parseInt(numbers[0], 10) || 10;
              unitCost = parseFloat(numbers[1]) || 450;
            }
          }

          // Clean up name by removing quantity/price tokens
          let name = cleanLine
            .replace(/(?:pcs|pc|qty|units?|pairs?|tk|bdt|৳|cost|rate|price|@)/gi, "")
            .replace(/[,\-–|:]/g, " ")
            .replace(/\b\d+(\.\d+)?\b/g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (!name || name.length < 3) {
            name = `Catalog Item ${idx + 1}`;
          }

          // Category heuristic
          let category = "General Merchandise";
          const lower = name.toLowerCase();
          if (/shirt|tee|pants|denim|hoodie|dress|polo|cloth/i.test(lower)) category = "Apparel";
          else if (/earbuds|headphone|cable|charger|mouse|keyboard|tech|gadget/i.test(lower)) category = "Electronics";
          else if (/wallet|bag|belt|watch|perfume|sunglasses|shoe/i.test(lower)) category = "Accessories";
          else if (/cream|serum|soap|shampoo|lotion|oil/i.test(lower)) category = "Beauty & Care";
          else if (/kitchen|bottle|knife|box|light/i.test(lower)) category = "Home & Living";

          // Recommended retail price (standard 45% gross margin markup)
          const suggestedPrice = Math.round(unitCost * 1.55);
          const itemTotalCost = quantity * unitCost;
          totalCost += itemTotalCost;

          parsedItems.push({
            tempId: `item-${idx + 1}-${Date.now()}`,
            name,
            category,
            quantity: Math.max(1, quantity),
            unitCost: Math.round(unitCost),
            suggestedPrice,
            estimatedMargin: Math.round(((suggestedPrice - unitCost) / suggestedPrice) * 100),
            totalCost: Math.round(itemTotalCost),
          });
        });

        return NextResponse.json({
          success: true,
          itemsCount: parsedItems.length,
          totalCost,
          parsedItems,
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 3. AUTONOMOUS PURCHASE ORDER (PO) GENERATOR
      // ─────────────────────────────────────────────────────────────
      case "restock_po_generator": {
        const { items = [], leadTimeDays = 5, supplierName = "Premier Wholesale Supplier Ltd." } = payload || {};

        const poNumber = `PO-${new Date().getFullYear()}${(new Date().getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

        let totalOrderValue = 0;
        let totalUnits = 0;

        const poItems = items.map((item, idx) => {
          const velocity = Number(item.dailyVelocity) || 1.5;
          const currentStock = Number(item.currentStock) || 0;
          const unitCost = Number(item.costPrice) || Math.round((Number(item.price) || 800) * 0.6);

          // ROP = (Daily Velocity * Lead Time) + Safety Stock (Buffer of 7 days)
          const safetyStock = Math.ceil(velocity * 7);
          const leadTimeDemand = Math.ceil(velocity * leadTimeDays);
          const reorderPoint = leadTimeDemand + safetyStock;

          // Target stock coverage: 30 days
          const targetUnits = Math.max(20, Math.ceil(velocity * 30));
          const orderQty = Math.max(10, targetUnits - currentStock);

          const itemTotal = orderQty * unitCost;
          totalOrderValue += itemTotal;
          totalUnits += orderQty;

          return {
            id: item.id || `po-item-${idx}`,
            name: item.name || "Item",
            category: item.category || "General",
            currentStock,
            dailyVelocity: velocity,
            reorderPoint,
            orderQty,
            unitCost,
            totalCost: itemTotal,
          };
        });

        // Generate clean WhatsApp / Email copy text for supplier dispatch
        const itemsListText = poItems
          .map(
            (p, i) =>
              `${i + 1}. ${p.name} - ${p.orderQty} pcs @ ৳${p.unitCost.toLocaleString()} = ৳${p.totalCost.toLocaleString()}`
          )
          .join("\n");

        const whatsappMessage = `*OFFICIAL PURCHASE ORDER: ${poNumber}*
Supplier: ${supplierName}
Date: ${new Date().toLocaleDateString("en-GB")}
Terms: Urgent Fulfillment (${leadTimeDays}-Day Delivery SLA)

*Order Breakdown:*
${itemsListText}

*Total Consignment Units:* ${totalUnits} pcs
*Total Order Valuation:* ৳${totalOrderValue.toLocaleString()}

Please confirm reception, packing date, and dispatch consignment tracking. Thank you!`;

        return NextResponse.json({
          success: true,
          poNumber,
          date: new Date().toISOString(),
          supplierName,
          leadTimeDays,
          totalUnits,
          totalOrderValue,
          poItems,
          whatsappMessage,
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 4. DEADSTOCK LIQUIDATION & BUNDLE OPTIMIZER
      // ─────────────────────────────────────────────────────────────
      case "deadstock_bundling": {
        const { deadstockItems = [], heroItems = [] } = payload || {};

        const recommendations = [];

        deadstockItems.slice(0, 4).forEach((slowItem, idx) => {
          const heroItem = heroItems[idx % (heroItems.length || 1)] || {
            name: "Top-Selling Premium SKU",
            price: 1250,
          };

          const slowPrice = Number(slowItem.price) || 850;
          const heroPrice = Number(heroItem.price) || 1200;
          const combinedRetail = slowPrice + heroPrice;

          // Bundle discount 16% off
          const bundlePrice = Math.round(combinedRetail * 0.84);
          const merchantSavings = slowItem.totalStock
            ? slowItem.totalStock * slowPrice
            : 35000;

          recommendations.push({
            id: `bundle-${idx + 1}`,
            bundleTitle: `${heroItem.name} + ${slowItem.name} [Value Pack]`,
            heroSku: heroItem.name,
            slowSku: slowItem.name,
            originalTotal: combinedRetail,
            bundlePrice,
            customerDiscount: "16% OFF",
            idleCashRelease: `৳${merchantSavings.toLocaleString()}`,
            strategy:
              "Pair high-velocity hero product with stagnant SKU to clear warehouse shelf space without damaging brand equity.",
          });
        });

        return NextResponse.json({
          success: true,
          recommendations,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unrecognized copilot action: "${action}"` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("AI Copilot API exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "AI Copilot execution failed." },
      { status: 500 }
    );
  }
}
