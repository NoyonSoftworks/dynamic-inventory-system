import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

/**
 * Clean & normalize a website URL
 */
function normalizeUrl(rawUrl) {
  let url = String(rawUrl || "").trim();
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

/**
 * Generate a clean alphanumeric SKU fallback
 */
function makeFallbackSku(prefix, title) {
  const cleanTitle = String(title || "PROD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${cleanTitle || "ITEM"}-${rand}`;
}

/**
 * POST /api/products/website-import
 * Intelligent catalog scanner & fetcher for Shopify, WooCommerce, and e-commerce websites.
 */
export async function POST(request) {
  try {
    // 1. Authenticate caller
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

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
        if (fbData?.user) user = fbData.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to scan and import catalog." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const { websiteUrl, platform = "auto" } = body || {};

    if (!websiteUrl || typeof websiteUrl !== "string" || !websiteUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid website URL (e.g. https://yourstore.com)." },
        { status: 400 }
      );
    }

    const baseUrl = normalizeUrl(websiteUrl);

    // ── Strategy 1: Shopify Public Products Feed ──────────────
    if (platform === "auto" || platform === "shopify") {
      try {
        const shopifyEndpoint = `${baseUrl}/products.json?limit=250`;
        const res = await fetch(shopifyEndpoint, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmartInventory-Bot/2.0",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.products && Array.isArray(json.products) && json.products.length > 0) {
            const parsed = json.products.map((p) => {
              const primaryVariant = p.variants?.[0] || {};
              const price = Math.round(Number(primaryVariant.price || 0));
              const stock = Math.max(1, Number(primaryVariant.inventory_quantity || 15));
              const sku = primaryVariant.sku?.trim()
                ? primaryVariant.sku.trim().toUpperCase()
                : makeFallbackSku("SHP", p.title);

              return {
                name: p.title || "Untitled Product",
                category: p.product_type || "General",
                base_sku: sku,
                price: price,
                initial_stock: stock,
                image_url: p.images?.[0]?.src || "",
                vendor: p.vendor || "",
                product_url: `${baseUrl}/products/${p.handle || ""}`,
                platform: "Shopify",
              };
            });

            return NextResponse.json({
              success: true,
              platform: "Shopify Store",
              products: parsed,
              count: parsed.length,
              sourceUrl: shopifyEndpoint,
              message: `Found ${parsed.length} products on your Shopify store catalog.`,
            });
          }
        }
      } catch (shopErr) {
        // Continue to WooCommerce
      }
    }

    // ── Strategy 2: WooCommerce Public REST API Feed ──────────
    if (platform === "auto" || platform === "woocommerce") {
      const wooEndpoints = [
        `${baseUrl}/wp-json/wc/v3/products?per_page=100`,
        `${baseUrl}/wp-json/wp/v2/product?per_page=100`,
        `${baseUrl}/wp-json/wc/store/products?per_page=100`,
      ];

      for (const ep of wooEndpoints) {
        try {
          const res = await fetch(ep, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmartInventory-Bot/2.0",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8000),
          });

          if (res.ok) {
            const items = await res.json().catch(() => null);
            if (Array.isArray(items) && items.length > 0) {
              const parsed = items.map((p) => {
                const name = p.name || p.title?.rendered || "Woo Product";
                const price = Math.round(Number(p.price || p.regular_price || p.prices?.price || 0));
                const stock = Math.max(1, Number(p.stock_quantity || 20));
                const sku = p.sku?.trim()
                  ? p.sku.trim().toUpperCase()
                  : makeFallbackSku("WC", name);
                const category = p.categories?.[0]?.name || "General";
                const img = p.images?.[0]?.src || "";

                return {
                  name,
                  category,
                  base_sku: sku,
                  price,
                  initial_stock: stock,
                  image_url: img,
                  product_url: p.permalink || `${baseUrl}/product/${p.slug || ""}`,
                  platform: "WooCommerce",
                };
              });

              return NextResponse.json({
                success: true,
                platform: "WooCommerce / WordPress",
                products: parsed,
                count: parsed.length,
                sourceUrl: ep,
                message: `Found ${parsed.length} products on your WooCommerce catalog feed.`,
              });
            }
          }
        } catch (wooErr) {
          // Continue to next endpoint or HTML scanner
        }
      }
    }

    // ── Strategy 3: Universal E-Commerce HTML & JSON-LD Scanner ─
    const scanUrls = [baseUrl, `${baseUrl}/shop`, `${baseUrl}/products`];
    for (const targetPage of scanUrls) {
      try {
        const pageRes = await fetch(targetPage, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          const discovered = [];

          // 1. Check for JSON-LD Structured Data Schema (<script type="application/ld+json">)
          const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
          let match;
          while ((match = jsonLdRegex.exec(html)) !== null) {
            try {
              const ld = JSON.parse(match[1]);
              const items = Array.isArray(ld) ? ld : ld["@graph"] || [ld];
              for (const it of items) {
                if (it["@type"] === "Product" || it["@type"]?.includes?.("Product")) {
                  const name = it.name;
                  if (!name) continue;
                  const price = Math.round(Number(it.offers?.price || it.offers?.[0]?.price || 0));
                  const sku = it.sku || makeFallbackSku("WEB", name);
                  const img = typeof it.image === "string" ? it.image : it.image?.[0] || "";

                  discovered.push({
                    name,
                    category: it.category || "General",
                    base_sku: String(sku).toUpperCase(),
                    price,
                    initial_stock: 15,
                    image_url: img,
                    product_url: it.url || targetPage,
                    platform: "Website Product Schema",
                  });
                }
              }
            } catch {}
          }

          if (discovered.length > 0) {
            // Deduplicate by name
            const unique = [];
            const seen = new Set();
            for (const p of discovered) {
              const key = p.name.toLowerCase().trim();
              if (!seen.has(key)) {
                seen.add(key);
                unique.push(p);
              }
            }

            return NextResponse.json({
              success: true,
              platform: "Website Product Schema (JSON-LD)",
              products: unique,
              count: unique.length,
              sourceUrl: targetPage,
              message: `Found ${unique.length} products automatically scanned from ${targetPage}.`,
            });
          }
        }
      } catch (crawlErr) {
        // Try next page
      }
    }

    // ── Strategy 4: Fallback helpful response ─────────────────
    return NextResponse.json(
      {
        success: false,
        error:
          "No public product catalog feed was detected on this URL. " +
          "If your store is on WooCommerce, ensure the REST API is accessible. " +
          "If on Shopify, ensure products are public. You can also import your catalog instantly using our downloadable CSV template.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("POST /api/products/website-import error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to scan website catalog." },
      { status: 500 }
    );
  }
}
