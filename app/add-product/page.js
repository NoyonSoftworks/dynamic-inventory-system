"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase/client";

// ── helpers ───────────────────────────────────────────────
function emptyAttribute() {
  return { key: "", value: "" };
}

function emptyVariant() {
  return { price: "", stock: "", attributes: [emptyAttribute()] };
}

// ── page component ───────────────────────────────────────
export default function AddProductPage() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [variants, setVariants] = useState([emptyVariant()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ── variant helpers ──────────────────────────────────
  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(vi) {
    setVariants((prev) => prev.filter((_, i) => i !== vi));
  }

  function updateVariant(vi, field, value) {
    setVariants((prev) =>
      prev.map((v, i) => (i === vi ? { ...v, [field]: value } : v))
    );
  }

  // ── attribute helpers ────────────────────────────────
  function addAttribute(vi) {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === vi ? { ...v, attributes: [...v.attributes, emptyAttribute()] } : v
      )
    );
  }

  function removeAttribute(vi, ai) {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === vi
          ? { ...v, attributes: v.attributes.filter((_, j) => j !== ai) }
          : v
      )
    );
  }

  function updateAttribute(vi, ai, field, value) {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === vi
          ? {
              ...v,
              attributes: v.attributes.map((a, j) =>
                j === ai ? { ...a, [field]: value } : a
              ),
            }
          : v
      )
    );
  }

  // ── submit ───────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Validate
      if (!productName.trim()) throw new Error("Product name is required.");
      if (!category.trim()) throw new Error("Category is required.");
      if (variants.length === 0) throw new Error("Add at least one variant.");

      for (const [i, v] of variants.entries()) {
        if (!v.price || Number(v.price) <= 0)
          throw new Error(`Variant ${i + 1}: price must be a positive number.`);
        if (!v.stock || Number(v.stock) < 0)
          throw new Error(`Variant ${i + 1}: stock must be 0 or more.`);
      }

      // 2. Insert product
      const { data: product, error: productErr } = await supabase
        .from("products")
        .insert({ name: productName.trim(), category: category.trim() })
        .select()
        .single();

      if (productErr) throw productErr;

      // 3. Build variant rows
      const variantRows = variants.map((v) => {
        const attrs = {};
        v.attributes.forEach((a) => {
          if (a.key.trim()) attrs[a.key.trim()] = a.value.trim();
        });

        return {
          product_id: product.id,
          price: Number(v.price),
          stock_quantity: Number(v.stock),
          attributes: attrs, // stored as JSONB
        };
      });

      // 4. Insert variants
      const { error: variantErr } = await supabase
        .from("variants")
        .insert(variantRows);

      if (variantErr) throw variantErr;

      // 5. Success – reset form
      setSuccess(true);
      setProductName("");
      setCategory("");
      setVariants([emptyVariant()]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── render ───────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl space-y-8 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200"
      >
        {/* ── header ───────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Add New Product
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the product details and add one or more variants.
          </p>
        </div>

        {/* ── alerts ───────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            🎉 Product and variants saved successfully!
          </div>
        )}

        {/* ── product fields ───────────────────────── */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-semibold text-gray-800">
            Product Info
          </legend>

          <div>
            <label
              htmlFor="productName"
              className="block text-sm font-medium text-gray-700"
            >
              Product Name
            </label>
            <input
              id="productName"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Running Shoes"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              Category
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Footwear"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
        </fieldset>

        {/* ── variants ─────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Variants</h2>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none transition"
            >
              <PlusIcon /> Add Variant
            </button>
          </div>

          {variants.map((variant, vi) => (
            <div
              key={vi}
              className="relative space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-5"
            >
              {/* remove variant */}
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(vi)}
                  className="absolute top-3 right-3 rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 transition"
                  title="Remove variant"
                >
                  <XIcon />
                </button>
              )}

              <h3 className="text-sm font-semibold text-indigo-600">
                Variant {vi + 1}
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.price}
                    onChange={(e) => updateVariant(vi, "price", e.target.value)}
                    placeholder="0.00"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant.stock}
                    onChange={(e) => updateVariant(vi, "stock", e.target.value)}
                    placeholder="0"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* ── attributes (JSONB key‑value pairs) ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Attributes{" "}
                    <span className="font-normal text-gray-400">
                      (stored as JSONB)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => addAttribute(vi)}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 transition"
                  >
                    <PlusIcon size={14} /> Add Attribute
                  </button>
                </div>

                {variant.attributes.map((attr, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={attr.key}
                      onChange={(e) =>
                        updateAttribute(vi, ai, "key", e.target.value)
                      }
                      placeholder="Key (e.g. Color)"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={attr.value}
                      onChange={(e) =>
                        updateAttribute(vi, ai, "value", e.target.value)
                      }
                      placeholder="Value (e.g. Black)"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                    {variant.attributes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttribute(vi, ai)}
                        className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 transition"
                        title="Remove attribute"
                      >
                        <XIcon size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── submit ───────────────────────────────── */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> Saving…
            </span>
          ) : (
            "Save Product"
          )}
        </button>
      </form>
    </main>
  );
}

// ── tiny inline SVG icons ────────────────────────────────
function PlusIcon({ size = 18 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function XIcon({ size = 18 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
