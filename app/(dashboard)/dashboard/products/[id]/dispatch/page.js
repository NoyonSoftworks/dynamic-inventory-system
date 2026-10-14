"use client";

import { useEffect, useState, useRef, use, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";

const COURIERS = [
  { id: "Steadfast", name: "Steadfast Courier", badge: "Fastest / Reliable", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "Pathao", name: "Pathao Courier", badge: "API Ready", color: "bg-red-50 text-red-700 border-red-200" },
  { id: "RedX", name: "RedX Delivery", badge: "Wide Network", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "Paperfly", name: "Paperfly", badge: "Doorstep Delivery", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Carrybee", name: "Carrybee Logistics", badge: "Economy", color: "bg-amber-50 text-amber-700 border-amber-200" },
];

function ProductDispatchContent({ params }) {
  const router = useRouter();
  const clientParams = useParams();
  const resolvedParams = params ? (typeof params.then === "function" ? use(params) : params) : null;
  const productId = resolvedParams?.id || clientParams?.id;

  const { businessId } = useBusinessContext();

  // ── Product & Stock State ────────────────────────────────
  const [product, setProduct] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message: string }

  // ── Scanned Items Queue ──────────────────────────────────
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const scannerInputRef = useRef(null);

  // ── Customer Details Form ────────────────────────────────
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("Steadfast");
  const [deliveryArea, setDeliveryArea] = useState("inside_dhaka"); // inside_dhaka | outside_dhaka
  const [orderNotes, setOrderNotes] = useState("");

  // ── Auto-focus Scanner Input ─────────────────────────────
  useEffect(() => {
    if (!loading && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [loading]);

  // ── Toast Helper ─────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // ── Data Fetching ────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Product
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (prodErr || !prodData) {
          throw new Error(prodErr?.message || "Product not found.");
        }

        if (prodData.business_id && businessId && prodData.business_id !== businessId) {
          throw new Error("Unauthorized: Product belongs to another workspace.");
        }

        // 2. Fetch Available inventory_items (where status = 'IN_STOCK')
        const { data: itemsData, error: itemsErr } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("product_id", productId)
          .eq("status", "IN_STOCK");

        if (itemsErr) {
          throw new Error(itemsErr.message || "Failed to load stock barcodes.");
        }

        if (isMounted) {
          setProduct(prodData);
          setAvailableItems(itemsData || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "An error occurred.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [productId, businessId]);

  // ── Barcode Scanner Logic ────────────────────────────────
  function handleBarcodeScan(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const rawCode = barcodeInput.trim();

      if (!rawCode) return;

      // 1. Search for matching code in the available in-stock inventory
      const matchedItem = availableItems.find(
        (item) => item.unique_barcode.toUpperCase() === rawCode.toUpperCase()
      );

      if (!matchedItem) {
        showToast(
          "error",
          `⚠️ Barcode "${rawCode}" not found in available stock for this product!`
        );
        setBarcodeInput("");
        return;
      }

      // 2. Check if already added to current queue
      const alreadyAdded = scannedItems.some((item) => item.id === matchedItem.id);
      if (alreadyAdded) {
        showToast("info", `Item "${rawCode}" is already in your dispatch queue.`);
        setBarcodeInput("");
        return;
      }

      // 3. Add to scanned list
      setScannedItems((prev) => [...prev, matchedItem]);
      showToast("success", `✓ Barcode "${matchedItem.unique_barcode}" ready to dispatch!`);
      setBarcodeInput("");

      // Refocus scanner
      setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 50);
    }
  }

  // ── Remove Scanned Item ──────────────────────────────────
  function removeScannedItem(id) {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 50);
  }

  // ── Fast Manual Select from available list ───────────────
  function quickAddBarcode(item) {
    if (scannedItems.some((i) => i.id === item.id)) return;
    setScannedItems((prev) => [...prev, item]);
    showToast("success", `✓ Added "${item.unique_barcode}"`);
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 50);
  }

  // ── Price Calculation ────────────────────────────────────
  const unitPrice = Number(product?.price) || 0;
  const deliveryFee = deliveryArea === "inside_dhaka" ? 60 : 120;
  const subtotal = unitPrice * scannedItems.length;
  const grandTotal = subtotal + (scannedItems.length > 0 ? deliveryFee : 0);

  // ── Submission Logic ─────────────────────────────────────
  async function handleDispatchSubmit(e) {
    e.preventDefault();

    if (scannedItems.length === 0) {
      showToast("error", "Please scan or select at least one physical item barcode!");
      scannerInputRef.current?.focus();
      return;
    }
    if (!customerName.trim()) {
      showToast("error", "Customer name is required.");
      return;
    }
    if (!customerPhone.trim()) {
      showToast("error", "Customer phone number is required.");
      return;
    }
    if (!customerAddress.trim()) {
      showToast("error", "Full delivery address is required.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Insert order record into 'orders' table
      const orderPayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        courier: selectedCourier,
        product_id: product.id,
        quantity: scannedItems.length,
        total_amount: grandTotal,
        status: "DISPATCHED",
      };

      if (businessId) {
        orderPayload.business_id = businessId;
      }

      let { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      // Graceful fallback if business_id or optional columns differ
      if (orderErr && orderErr.message?.includes("business_id")) {
        delete orderPayload.business_id;
        const retry = await supabase
          .from("orders")
          .insert(orderPayload)
          .select()
          .single();
        orderData = retry.data;
        orderErr = retry.error;
      }

      if (orderErr && !orderData) {
        throw new Error(orderErr.message || "Failed to create order record.");
      }

      // 2. Update status of each scanned inventory item to 'SHIPPED' & link order_id
      const scannedItemIds = scannedItems.map((item) => item.id);

      const updatePayload = {
        status: "SHIPPED",
      };
      if (orderData?.id) {
        updatePayload.order_id = orderData.id;
      }

      let { error: updateErr } = await supabase
        .from("inventory_items")
        .update(updatePayload)
        .in("id", scannedItemIds);

      // Fallback if 'order_id' foreign key column is not yet on inventory_items
      if (updateErr && updateErr.message?.includes("order_id")) {
        const retryUpdate = await supabase
          .from("inventory_items")
          .update({ status: "SHIPPED" })
          .in("id", scannedItemIds);
        updateErr = retryUpdate.error;
      }

      if (updateErr) {
        throw new Error(
          `Order created (#${orderData?.id || "N/A"}), but failed to update stock status: ${updateErr.message}`
        );
      }

      // 3. Trigger Courier API (Steadfast Integration)
      if (selectedCourier === "Steadfast") {
        try {
          const courierRes = await fetch("/api/courier/steadfast", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              order_id: orderData?.id,
              customer_name: customerName.trim(),
              customer_phone: customerPhone.trim(),
              customer_address: customerAddress.trim(),
              amount_to_collect: grandTotal,
              invoice_note:
                orderNotes.trim() ||
                `${product.name} (Qty: ${scannedItems.length})`,
            }),
          });

          const courierData = await courierRes.json().catch(() => null);

          if (courierRes.ok && courierData?.success) {
            const trackId =
              courierData.consignment_id ||
              courierData.tracking_code ||
              "Generated";
            showToast(
              "success",
              `🎉 Order created & Steadfast tracking generated! Tracking ID: #${trackId}`
            );
          } else {
            showToast(
              "error",
              `⚠️ Order saved locally (#${orderData?.id || "N/A"}), but Steadfast API warning: ${courierData?.error || "Dispatch sync failed"}`
            );
          }
        } catch (courierErr) {
          console.error("Courier API dispatch error:", courierErr);
          showToast(
            "error",
            `⚠️ Order saved locally (#${orderData?.id || "N/A"}), but could not contact Steadfast API.`
          );
        }
      } else {
        showToast(
          "success",
          `🎉 Order successfully dispatched via ${selectedCourier}! ${scannedItems.length} unit(s) marked as SHIPPED.`
        );
      }

      // Remove dispatched items from available local inventory
      setAvailableItems((prev) =>
        prev.filter((item) => !scannedItemIds.includes(item.id))
      );
      setScannedItems([]);

      // Reset customer form
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setOrderNotes("");

      // Redirect back to dashboard after brief delay
      setTimeout(() => {
        router.push("/dashboard/products");
      }, 2000);
    } catch (err) {
      showToast("error", err.message || "Failed to process dispatch.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading Screen ─────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
          <Spinner size={24} />
          <span>Loading dispatch console…</span>
        </div>
      </main>
    );
  }

  // ── Error Screen ───────────────────────────────────────────
  if (error || !product) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900">Product Not Found</h2>
          <p className="text-xs text-rose-600">{error || "Could not retrieve product."}</p>
          <Link
            href="/dashboard/products"
            className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            ← Return to Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Breadcrumb & Top Bar ────────────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link href="/" className="hover:text-indigo-600 transition">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/dashboard/products" className="hover:text-indigo-600 transition">
                Products
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-semibold truncate max-w-[200px]">
                {product.name}
              </span>
              <span>/</span>
              <span className="text-indigo-600 font-semibold">Dispatch Checkout</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>⚡</span> Product Dispatch &amp; Checkout
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Scan serialized barcodes and generate multi-courier delivery orders.
            </p>
          </div>

          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            ← Back to Products
          </Link>
        </div>

        {/* ── Toast Banner ───────────────────────────────── */}
        {toast && (
          <div
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-md transition-all ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-indigo-200 bg-indigo-50 text-indigo-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠️" : "ℹ️"}</span>
              <span className="font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs font-semibold opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── 2-Column SaaS Layout ───────────────────────── */}
        <form onSubmit={handleDispatchSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ================================================= */}
          {/* ── LEFT COLUMN: Customer & Courier Form (7 Cols) ─ */}
          {/* ================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Customer Details Card */}
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>👤</span> Customer &amp; Recipient Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter recipient information for the courier waybill.
                </p>
              </div>

              <div className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Phone Number (11 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    disabled={submitting}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                  />
                </div>

                {/* Full Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Delivery Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    disabled={submitting}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="House / Flat #, Road #, Sector / Thana, City"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                  />
                </div>

                {/* Order Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Delivery Notes / Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    disabled={submitting}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="e.g. Call before delivery / Deliver after 3 PM"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none transition disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Courier Selection Card */}
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🚚</span> Select Courier Partner
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick the delivery partner to generate consignment tracking.
                </p>
              </div>

              {/* Courier Radios Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COURIERS.map((c) => {
                  const isChosen = selectedCourier === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCourier(c.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 flex items-center justify-between transition-all ${
                        isChosen
                          ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">{c.name}</div>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.color}`}>
                          {c.badge}
                        </span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isChosen ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                      }`}>
                        {isChosen && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Area Selection */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Delivery Zone &amp; Shipping Fee
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryArea("inside_dhaka")}
                    className={`rounded-xl border p-3 text-left transition ${
                      deliveryArea === "inside_dhaka"
                        ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 font-bold text-indigo-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold">Inside Dhaka</div>
                    <div className="text-xs text-slate-500">৳60 Delivery Charge</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryArea("outside_dhaka")}
                    className={`rounded-xl border p-3 text-left transition ${
                      deliveryArea === "outside_dhaka"
                        ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 font-bold text-indigo-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold">Outside Dhaka</div>
                    <div className="text-xs text-slate-500">৳120 Delivery Charge</div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* ── RIGHT COLUMN: Barcode Scanner & Summary (5) ── */}
          {/* ================================================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* Product Snapshot Card */}
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Product
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {availableItems.length} Units in Stock
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                  <span>SKU: <code className="font-mono font-bold text-slate-800">{product.base_sku}</code></span>
                  <span>·</span>
                  <span>Unit Price: <strong className="text-slate-900">${unitPrice.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            {/* ── BARCODE SCANNER CONSOLE ─────────────────── */}
            <div className="rounded-2xl bg-slate-900 p-6 shadow-2xl text-white space-y-4 border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Live Barcode Scanner
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  USB / Bluetooth Ready
                </span>
              </div>

              {/* Physical Scanner Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Scan Barcode with Handheld Scanner:
                </label>
                <div className="relative">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                    placeholder="Aim scanner & pull trigger…"
                    className="block w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-sm font-mono tracking-wider text-emerald-400 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-xs text-slate-400 font-mono bg-slate-700/60 px-2 py-0.5 rounded">
                      [Enter]
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Pressing trigger automatically validates serial against in-stock records.
                </p>
              </div>

              {/* Scanned Items Bucket */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    Scanned for Dispatch ({scannedItems.length})
                  </span>
                  {scannedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannedItems([])}
                      className="text-[11px] text-rose-400 hover:text-rose-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {scannedItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                    No barcodes scanned yet. Scan a sticker to add to order.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {scannedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">#{idx + 1}</span>
                          <span className="text-white font-bold">{item.unique_barcode}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeScannedItem(item.id)}
                          className="text-rose-400 hover:text-rose-300 px-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Pick from Available Stock (Fallback) */}
              {availableItems.length > 0 && availableItems.length > scannedItems.length && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Or click an available barcode to add manually:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {availableItems
                      .filter((i) => !scannedItems.some((s) => s.id === i.id))
                      .slice(0, 10)
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => quickAddBarcode(item)}
                          className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-[10px] font-mono text-slate-300 transition"
                        >
                          + {item.unique_barcode}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order Financials & Submit Button Card */}
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Order Billing Summary
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Unit Price:</span>
                  <span>${unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Quantity Scanned:</span>
                  <span className="font-bold text-slate-900">{scannedItems.length} pcs</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery ({selectedCourier}):</span>
                  <span>৳{scannedItems.length > 0 ? deliveryFee : 0}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="text-indigo-600">${subtotal.toFixed(2)} + ৳{deliveryFee}</span>
                </div>
              </div>

              {/* Submit Dispatch Button */}
              <button
                type="submit"
                disabled={submitting || scannedItems.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/40 focus:ring-2 focus:ring-indigo-600/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <Spinner size={18} />
                    <span>Processing Order &amp; Dispatching…</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Confirm Dispatch via {selectedCourier}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

// ── Spinner Icon ──────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
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

export default function ProductDispatchPage(props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Spinner size={32} />
        </main>
      }
    >
      <ProductDispatchContent {...props} />
    </Suspense>
  );
}
