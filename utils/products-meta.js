import fs from "fs";
import path from "path";

const META_FILE = path.join(process.cwd(), "data", "products_meta.json");

/**
 * Read all product metadata stored in data/products_meta.json
 */
export function getProductsMeta() {
  try {
    if (fs.existsSync(META_FILE)) {
      const raw = fs.readFileSync(META_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to read products_meta.json:", err);
  }
  return {};
}

/**
 * Get metadata for a specific product ID or SKU
 */
export function getProductMeta(productId) {
  if (!productId) return null;
  const all = getProductsMeta();
  return all[productId] || null;
}

/**
 * Save / Update metadata for a specific product
 */
export function saveProductMeta(productId, meta = {}) {
  if (!productId) return null;
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const all = getProductsMeta();
    all[productId] = {
      ...(all[productId] || {}),
      ...meta,
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(META_FILE, JSON.stringify(all, null, 2), "utf8");
    return all[productId];
  } catch (err) {
    console.warn("Failed to save products_meta.json:", err);
    return null;
  }
}
