import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Intelligent E-Commerce Product Suggestion Engine
 * Provides instant smart autofill for:
 * 1. Category Classification
 * 2. Clean, readable Base SKU
 * 3. Market Selling Price & Purchasing Cost (BDT ৳)
 * 4. Courier Package Weight (kg) for Steadfast / Pathao
 * 5. Low-Stock Reorder Threshold
 * 6. Warehouse Rack / Bin Shelving
 * 7. Key Product Specs & Marketing Description
 * 8. Sizes & Color Variants (if applicable)
 */
function analyzeProductDetails(name = "", customCategory = "") {
  const q = name.toLowerCase().trim();

  let category = "General";
  let skuPrefix = "PROD";
  let suggestedPrice = 950;
  let suggestedCost = 550;
  let weightKg = 0.35;
  let threshold = 5;
  let rackLocation = "Rack A-01";
  let description = "High-demand product with guaranteed quality packaging, ready for fast courier dispatch.";
  let suggestedVariants = [];

  // 1. T-Shirt / Polo / Shirt / Panjabi / Hoodie (Apparel)
  if (
    /t-shirt|tshirt|polo|shirt|panjabi|hoodie|jersey|পলো|শার্ট|পাঞ্জাবি|টিশার্ট|হুডি/i.test(q)
  ) {
    category = "Apparel & Fashion";
    skuPrefix = /polo/i.test(q)
      ? "POLO"
      : /hoodie/i.test(q)
      ? "HOODIE"
      : /panjabi/i.test(q)
      ? "PANJABI"
      : /jersey/i.test(q)
      ? "JERSEY"
      : "TSHIRT";

    suggestedPrice = /panjabi/i.test(q) ? 1850 : /hoodie/i.test(q) ? 1450 : 850;
    suggestedCost = Math.round(suggestedPrice * 0.58);
    weightKg = 0.28;
    threshold = 8;
    rackLocation = "Rack F-02 (Fashion)";
    description = "100% premium combed organic cotton, breathable fabric with high-durability stitching. Colorfast and machine washable.";
    suggestedVariants = [
      { size: "M", color: "Black", price: suggestedPrice, quantity: 10 },
      { size: "L", color: "Black", price: suggestedPrice, quantity: 15 },
      { size: "XL", color: "Black", price: suggestedPrice, quantity: 10 },
    ];
  }

  // 2. Jeans / Pants / Trousers / Cargo
  else if (/jean|denim|pant|trouser|cargo|প্যান্ট|জিন্স/i.test(q)) {
    category = "Apparel & Fashion";
    skuPrefix = /cargo/i.test(q) ? "CARGO" : /jean|denim/i.test(q) ? "DENIM" : "PANT";
    suggestedPrice = 1250;
    suggestedCost = 720;
    weightKg = 0.55;
    threshold = 6;
    rackLocation = "Rack F-04 (Denim)";
    description = "Comfort-stretch premium denim with durable copper-riveted pockets and fade-resistant wash.";
    suggestedVariants = [
      { size: "30", color: "Navy Blue", price: 1250, quantity: 5 },
      { size: "32", color: "Navy Blue", price: 1250, quantity: 10 },
      { size: "34", color: "Navy Blue", price: 1250, quantity: 5 },
    ];
  }

  // 3. Shoes / Sneakers / Loafers / Sandal (Footwear)
  else if (/shoe|sneaker|boot|loafer|sandal|জুতা|স্নিকার্স|লোফার/i.test(q)) {
    category = "Footwear & Shoes";
    skuPrefix = /sneaker/i.test(q) ? "SNEAKER" : /loafer/i.test(q) ? "LOAFER" : "SHOE";
    suggestedPrice = 1850;
    suggestedCost = 1050;
    weightKg = 0.95;
    threshold = 5;
    rackLocation = "Rack S-01 (Footwear)";
    description = "Ultra-lightweight shock-absorbing EVA sole with breathable upper mesh. Perfect for all-day daily wear.";
    suggestedVariants = [
      { size: "40", color: "White", price: 1850, quantity: 4 },
      { size: "41", color: "White", price: 1850, quantity: 6 },
      { size: "42", color: "White", price: 1850, quantity: 6 },
    ];
  }

  // 4. Earbuds / Headphones / Audio
  else if (/earbud|headphone|airpod|audio|tws|ইয়ারবাড|হেডফোন/i.test(q)) {
    category = "Electronics & Gadgets";
    skuPrefix = /headphone/i.test(q) ? "HEADSET" : "EARBUD";
    suggestedPrice = 1450;
    suggestedCost = 820;
    weightKg = 0.22;
    threshold = 5;
    rackLocation = "Rack E-03 (Audio)";
    description = "True Wireless Bluetooth 5.3 with ENC noise cancellation, deep bass drivers, and 30-hour total battery case.";
  }

  // 5. Smartwatch / Watch
  else if (/watch|smartwatch|ঘড়ি|ঘড়ি|স্মার্টওয়াচ/i.test(q)) {
    category = "Electronics & Gadgets";
    skuPrefix = "WATCH";
    suggestedPrice = 2250;
    suggestedCost = 1350;
    weightKg = 0.25;
    threshold = 5;
    rackLocation = "Rack E-01 (Watches)";
    description = "Vibrant AMOLED HD display, Bluetooth voice calling, 24/7 heart rate & SpO2 tracking, IP68 waterproof.";
  }

  // 6. Skincare / Serum / Cream / Lotion / Cosmetics
  else if (/cream|serum|lotion|facewash|shampoo|lipstick|ময়েশ্চারাইজার|ক্রিম|সিরাম/i.test(q)) {
    category = "Health & Beauty";
    skuPrefix = /serum/i.test(q) ? "SERUM" : /facewash/i.test(q) ? "FACEWASH" : "CREAM";
    suggestedPrice = 850;
    suggestedCost = 480;
    weightKg = 0.2;
    threshold = 8;
    rackLocation = "Rack B-02 (Beauty)";
    description = "Dermatologically tested gentle brightening formula enriched with hyaluronic acid and niacinamide. Paraben-free.";
  }

  // 7. Bags / Backpack / Wallet
  else if (/bag|backpack|wallet|purse|ব্যাগ|ওয়ালেট/i.test(q)) {
    category = "Bags & Accessories";
    skuPrefix = /wallet/i.test(q) ? "WALLET" : "BACKPACK";
    suggestedPrice = 1150;
    suggestedCost = 650;
    weightKg = 0.45;
    threshold = 5;
    rackLocation = "Rack A-05 (Bags)";
    description = "Water-resistant Oxford fabric with padded laptop compartment, anti-theft zipper, and reinforced stitching.";
  }

  // 8. General / Fallback based on words
  else {
    const words = q
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length > 0) {
      skuPrefix = words
        .slice(0, 2)
        .map((w) => w.toUpperCase())
        .join("-");
    }
  }

  // Sanitize SKU prefix
  skuPrefix = skuPrefix.replace(/[^A-Z0-9_-]/g, "").slice(0, 10);
  if (!skuPrefix) skuPrefix = "ITEM";

  return {
    suggested_category: customCategory || category,
    suggested_sku: `${skuPrefix}-${Math.floor(100 + Math.random() * 900)}`,
    suggested_price: suggestedPrice,
    suggested_cost: suggestedCost,
    suggested_weight_kg: weightKg,
    suggested_threshold: threshold,
    suggested_rack: rackLocation,
    description,
    suggested_variants: suggestedVariants,
  };
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Please provide a product title for AI suggestions." },
        { status: 400 }
      );
    }

    const suggestions = analyzeProductDetails(name, category);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("POST /api/products/ai-suggest error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate suggestions." },
      { status: 500 }
    );
  }
}
