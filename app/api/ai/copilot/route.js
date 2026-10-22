import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

/**
 * POST /api/ai/copilot
 * Multi-Tenant AI Logistics, Operations & Profit Intelligence Engine
 * 
 * Capabilities:
 * 1. RTO Delivery Risk & Fraud Predictor (pre-dispatch loss prevention)
 * 2. Smart Supplier Invoice / Challan Intake Parser
 * 3. Automated Purchase Order (PO) & Reorder Point (ROP) Generator
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

        let cleanPhone = String(phone).replace(/[^0-9]/g, "");
        if (cleanPhone.startsWith("8801")) cleanPhone = cleanPhone.slice(2);
        const cleanAddress = String(address).trim();
        const numAmount = Number(codAmount) || 0;
        const flags = [];

        // ── Check 1: Format & Syntactic Phone Validity ───────────
        const bdPrefixes = ["013", "014", "015", "016", "017", "018", "019"];
        const hasValidPrefix = bdPrefixes.some((p) => cleanPhone.startsWith(p));
        const isRepeatedDummy = /(\d)\1{5,}/.test(cleanPhone);

        if (cleanPhone.length !== 11) {
          flags.push("Invalid mobile number length (must be 11 digits e.g. 017XXXXXXXX).");
        } else if (!hasValidPrefix) {
          flags.push("Unrecognized Bangladesh mobile operator prefix.");
        }
        if (isRepeatedDummy) {
          flags.push("Suspicious repeating/dummy digits detected in phone number.");
        }

        // ── Check 2: Real Store Database Order History ──────────
        let storeOrders = [];
        let storeTotal = 0;
        let storeDelivered = 0;
        let storeCancelled = 0;

        if (cleanPhone.length >= 10) {
          try {
            const last10 = cleanPhone.slice(-10);
            let q = adminClient
              .from("orders")
              .select("id, status, total_amount, created_at, customer_name, customer_address")
              .ilike("customer_phone", `%${last10}%`);

            if (callerBusinessId) {
              q = q.eq("business_id", callerBusinessId);
            }
            const { data: ords } = await q.limit(40);
            storeOrders = ords || [];
            storeTotal = storeOrders.length;
            storeDelivered = storeOrders.filter((o) =>
              ["DELIVERED", "COMPLETED"].includes((o.status || "").toUpperCase())
            ).length;
            storeCancelled = storeOrders.filter((o) =>
              ["CANCELLED", "RETURNED", "FAILED", "RTO"].includes((o.status || "").toUpperCase())
            ).length;
          } catch (err) {
            console.warn("Store order history query warning:", err.message);
          }
        }

        // ── Check 3: Real Steadfast Courier Fraud API ───────────
        let steadfastData = null;
        let courierApiChecked = false;
        let courierApiError = null;

        if (cleanPhone.length === 11 && hasValidPrefix && !isRepeatedDummy) {
          try {
            let cSettings = null;

            // 1. Try querying settings for caller's business
            if (callerBusinessId) {
              const { data: bSettings } = await adminClient
                .from("courier_settings")
                .select("api_key, api_secret")
                .eq("courier_name", "Steadfast")
                .eq("business_id", callerBusinessId)
                .maybeSingle();
              cSettings = bSettings;
            }

            // 2. Fallback to any active Steadfast credential in system
            if (!cSettings?.api_key) {
              const { data: anySettings } = await adminClient
                .from("courier_settings")
                .select("api_key, api_secret")
                .eq("courier_name", "Steadfast")
                .not("api_key", "is", null)
                .limit(1);
              if (anySettings && anySettings.length > 0) {
                cSettings = anySettings[0];
              }
            }

            const apiKey = cSettings?.api_key || process.env.STEADFAST_API_KEY;
            const secretKey = cSettings?.api_secret || process.env.STEADFAST_SECRET_KEY;

            if (apiKey && secretKey) {
              courierApiChecked = true;
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 6500);

              // Steadfast Fraud Check API endpoints
              const endpoints = [
                `https://portal.steadfast.com.bd/api/v1/fraud_check/${cleanPhone}`,
                `https://api.steadfast.com.bd/api/v1/fraud_check/${cleanPhone}`,
              ];

              let sfRes = null;
              for (const endpoint of endpoints) {
                try {
                  sfRes = await fetch(endpoint, {
                    method: "GET",
                    headers: {
                      "Api-Key": apiKey,
                      "Secret-Key": secretKey,
                      "Content-Type": "application/json",
                      Accept: "application/json",
                    },
                    signal: controller.signal,
                  });
                  if (sfRes && sfRes.status !== 404) break;
                } catch {
                  // try fallback endpoint
                }
              }
              clearTimeout(timeout);

              if (sfRes?.ok) {
                const sfJson = await sfRes.json().catch(() => null);
                if (sfJson) {
                  const raw = sfJson.data || sfJson;
                  const rawParcels = raw.Total_parcels ?? raw.total_parcels ?? raw.total_consignment ?? raw.total_orders;
                  const rawDelivered = raw.Total_delivered ?? raw.total_delivered ?? raw.delivered ?? raw.total_delivered_parcels;
                  const rawCancelled = raw.Total_cancelled ?? raw.total_cancelled ?? raw.total_returned ?? raw.cancelled;
                  const fraudReports = Array.isArray(raw.total_fraud_reports)
                    ? raw.total_fraud_reports
                    : Array.isArray(raw.fraud_reports)
                    ? raw.fraud_reports
                    : [];

                  if (rawParcels !== undefined && rawParcels !== null) {
                    steadfastData = {
                      total_parcels: Number(rawParcels) || 0,
                      total_delivered: Number(rawDelivered) || 0,
                      total_cancelled: Number(rawCancelled) || 0,
                      fraud_reports: fraudReports,
                    };

                    if (fraudReports.length > 0) {
                      flags.push(
                        `Steadfast Courier Fraud Alert: Customer has ${fraudReports.length} complaint/fraud flag(s) registered by merchants.`
                      );
                    }
                  }
                }
              } else if (sfRes?.status === 401) {
                courierApiError = "Steadfast API credentials in Settings are invalid or expired.";
              }
            } else {
              courierApiError = "Steadfast Courier API credentials are not configured in Settings. Connect your Steadfast account to enable nationwide fraud checking.";
            }
          } catch (err) {
            console.warn("Steadfast API check notice:", err.message);
          }
        }

        // ── Check 4: Address Clarity Check ──────────────────────
        const addressWords = cleanAddress.split(/\s+/).filter(Boolean);
        if (cleanAddress.length > 0 && (cleanAddress.length < 12 || addressWords.length < 3)) {
          flags.push("Incomplete or vague delivery address (missing house/road/thana).");
        }

        // ── Check 5: Consolidate Real Logistics Metrics ─────────
        let netParcels = 0;
        let netDelivered = 0;
        let netCancelled = 0;
        let dataSource = "Store Order Database";

        if (steadfastData && steadfastData.total_parcels > 0) {
          netParcels = steadfastData.total_parcels;
          netDelivered = steadfastData.total_delivered;
          netCancelled = steadfastData.total_cancelled;
          dataSource = storeTotal > 0
            ? `Steadfast Network (${netParcels} parcels) + Store (${storeTotal} orders)`
            : "Steadfast Courier Nationwide Network";
        } else if (storeTotal > 0) {
          netParcels = storeTotal;
          netDelivered = storeDelivered;
          netCancelled = storeCancelled;
          dataSource = `Your Store Order History (${storeTotal} logged orders)`;
        } else {
          dataSource = courierApiChecked
            ? "Steadfast Network (0 Prior Consignments)"
            : "Store Database (No Prior Orders)";
        }

        // Compute Truthful Ratio
        const hasHistory = netParcels > 0;
        const deliveryRatioNumeric = hasHistory
          ? Math.round((netDelivered / netParcels) * 100)
          : null;

        let riskLevel = "NEW";
        let riskScore = 20;
        let recommendation = "";
        let advanceFeeRequired = false;

        if (cleanPhone.length !== 11 || !hasValidPrefix || isRepeatedDummy) {
          riskLevel = "HIGH";
          riskScore = 92;
          recommendation = "Invalid customer phone number. Do not dispatch until verified via direct phone call.";
          advanceFeeRequired = true;
        } else if (!hasHistory) {
          riskLevel = "NEW";
          riskScore = 25;
          recommendation =
            "First-time buyer with no prior courier history recorded. Standard practice: Call customer to confirm availability before packing, or collect ৳100–৳150 delivery fee in advance.";
          advanceFeeRequired = numAmount > 4000;
          flags.push("No prior delivery history found across store or connected carrier for this number.");
        } else if (deliveryRatioNumeric >= 85) {
          riskLevel = "LOW";
          riskScore = Math.max(5, 100 - deliveryRatioNumeric);
          recommendation = `Reliable buyer with proven ${deliveryRatioNumeric}% delivery success rate (${netDelivered}/${netParcels} delivered). Safe for automated 1-click dispatch.`;
          advanceFeeRequired = false;
        } else if (deliveryRatioNumeric >= 60) {
          riskLevel = "MEDIUM";
          riskScore = 100 - deliveryRatioNumeric;
          recommendation = `Moderate delivery ratio (${deliveryRatioNumeric}%). Customer has returned/refused ${netCancelled} parcels in the past. Call before dispatch.`;
          advanceFeeRequired = false;
          flags.push(`Customer has refused/returned ${netCancelled} parcels in past delivery records.`);
        } else {
          riskLevel = "HIGH";
          riskScore = Math.min(95, 100 - deliveryRatioNumeric);
          recommendation = `High RTO return risk! Customer delivery ratio is only ${deliveryRatioNumeric}% (${netCancelled} of ${netParcels} parcels cancelled/returned). Mandatory: Collect full delivery charge in advance via bKash/Nagad.`;
          advanceFeeRequired = true;
          flags.push(`High refusal rate: ${netCancelled} of ${netParcels} parcels were returned to merchants.`);
        }

        if (numAmount > 6000) {
          flags.push(`High COD consignment value (৳${numAmount.toLocaleString()}) increases return exposure.`);
        }

        return NextResponse.json({
          success: true,
          phone: cleanPhone,
          hasHistory,
          totalParcels: netParcels,
          totalDelivered: netDelivered,
          totalCancelled: netCancelled,
          deliveryRatio: deliveryRatioNumeric !== null ? `${deliveryRatioNumeric}%` : "N/A (New Buyer)",
          deliveryRatioNumeric,
          riskScore,
          riskLevel,
          flags,
          recommendation,
          advanceFeeRequired,
          dataSource,
          courierApiChecked,
          courierApiError,
          estimatedLossPrevented:
            riskLevel === "HIGH" || riskLevel === "MEDIUM"
              ? 160 + Math.round(numAmount * 0.04)
              : 0,
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

          // If no specific match was found, perform basic token split fallback
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

          // Category detection rules
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
      // 3. AUTOMATED PURCHASE ORDER (PO) GENERATOR
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
