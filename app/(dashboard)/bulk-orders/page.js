"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { supabase } from "@/utils/supabase/client";
import { useBusinessContext } from "@/utils/supabase/business";
import ThermalAndInvoiceModal from "@/components/ThermalAndInvoiceModal";

function emptyRow() {
  return { productId: "", variantId: "", quantity: "" };
}

function CloseIcon({ className = "w-3.5 h-3.5 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * High-pitch crisp audio synthesizer beep using Web Audio API for warehouse scanning feedback.
 */
function playSuccessBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      /** @type {any} */ (window).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1900, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    // Muted or unsupported
  }
}

/**
 * Downloads a standardized sample CSV template for daily orders intake.
 */
function downloadDailyOrdersTemplate() {
  const headers = [
    "Customer Name",
    "Customer Phone",
    "Delivery Address",
    "Product SKU",
    "Quantity",
    "Total Amount",
    "Courier",
  ];

  const sampleRows = [
    ["Md. Tanvir Ahmed", "01712345678", "House 12, Road 4, Dhanmondi, Dhaka", "TSHIRT-BLK-M", "1", "1200", "Steadfast Courier"],
    ["Sabrina Islam", "01819876543", "Flat 5B, GEC Circle, Chittagong", "AUDIO-WH-1000", "1", "1850", "Pathao Express"],
    ["Farhan Chowdhury", "01911223344", "House 45, Sector 7, Uttara, Dhaka", "HOME-DRIP-01", "2", "2400", "Steadfast Courier"],
  ];

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...sampleRows.map((r) => `"${r.join('","')}"`)].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "Daily_Customer_Orders_Template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Customer Trust & COD Risk Scoring Engine ────────────────
function computeOrderRisk(order, allOrders = []) {
  const phone = String(order.customer_phone || "").replace(/[^0-9]/g, "");
  const address = String(order.customer_address || "").trim();
  const amount = Number(order.total_amount) || 0;

  let riskScore = 15;
  const flags = [];

  // 1. Mobile validity (Bangladesh 11-Digit Standard)
  const validPrefixes = ["013", "014", "015", "016", "017", "018", "019"];
  const hasPrefix = validPrefixes.some((p) => phone.startsWith(p));
  if (phone.length !== 11) {
    riskScore += 35;
    flags.push("Non-standard phone length (expected 11 digits)");
  } else if (!hasPrefix) {
    riskScore += 25;
    flags.push("Unrecognized BD mobile operator prefix");
  }
  if (/(\d)\1{5,}/.test(phone)) {
    riskScore += 45;
    flags.push("Suspicious repeating digit pattern detected");
  }

  // 2. Address completeness check
  if (address.length < 14) {
    riskScore += 30;
    flags.push("Incomplete address (lacks road/house/thana specification)");
  } else if (
    /^(dhaka|chittagong|bazar|mor|near|school|bari)\b/i.test(address) &&
    address.length < 22
  ) {
    riskScore += 25;
    flags.push("Vague landmark without recipient building details");
  }

  // 3. High Value COD Consignment threshold
  if (amount > 5500) {
    riskScore += 16;
    flags.push(`High COD consignment value (৳${amount.toLocaleString()}) increases doorstep refusal risk`);
  }

  // 4. Repeat purchase pattern in workspace
  const matchingPast = allOrders.filter(
    (o) =>
      o.id !== order.id &&
      o.customer_phone &&
      o.customer_phone.replace(/[^0-9]/g, "") === phone
  );
  const totalPast = matchingPast.length;
  const deliveredCount = matchingPast.filter((o) =>
    ["DELIVERED", "COMPLETED"].includes((o.status || "").toUpperCase())
  ).length;
  const returnedCount = matchingPast.filter((o) =>
    ["CANCELLED", "RETURNED", "FAILED", "RTO"].includes((o.status || "").toUpperCase())
  ).length;
  const inTransitCount = matchingPast.filter((o) =>
    ["DISPATCHED", "PENDING_DISPATCH", "PROCESSING", "IN_TRANSIT"].includes((o.status || "").toUpperCase())
  ).length;

  const resolvedCount = deliveredCount + returnedCount;
  const realRatio = resolvedCount > 0 ? Math.round((deliveredCount / resolvedCount) * 100) : null;

  let riskBadge = "NEW_CUSTOMER";
  if (phone.length !== 11 || !hasPrefix || /(\d)\1{5,}/.test(phone)) {
    riskBadge = "HIGH_RISK";
  } else if (resolvedCount > 0) {
    if (realRatio >= 80) {
      riskBadge = "VERIFIED_BUYER";
      riskScore = Math.max(5, 100 - realRatio);
    } else if (realRatio < 60) {
      riskBadge = "HIGH_RISK";
      flags.push(`Past order delivery ratio is only ${realRatio}% (${returnedCount} of ${resolvedCount} cancelled/returned).`);
    } else {
      riskBadge = "MODERATE_RISK";
      riskScore = 100 - realRatio;
    }
  } else if (inTransitCount > 0) {
    riskBadge = "MODERATE_RISK";
    flags.push(`Customer has ${inTransitCount} parcel(s) currently in-transit with courier.`);
  } else if (riskScore >= 45) {
    riskBadge = "HIGH_RISK";
  }

  return {
    riskScore,
    riskBadge,
    flags,
    totalPast,
    deliveredCount,
    returnedCount,
    inTransitCount,
    realRatio,
  };
}

export default function BulkOrdersPage() {
  const { businessId, businessName, loading: ctxLoading } = useBusinessContext();

  // ── Tab Navigation: 'orders_queue' | 'dispatched_hub' | 'returns_exchanges' | 'manual_bulk' ─────────
  const [activeTab, setActiveTab] = useState("orders_queue");

  // ── Orders & COD Verification State ────────────────────────
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Date Range & Courier Filtering State ───────────────────
  const [datePreset, setDatePreset] = useState("all"); // 'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [courierFilter, setCourierFilter] = useState("ALL"); // 'ALL' | 'Steadfast' | 'Pathao' | 'RedX' | 'Paperfly'

  // ── Modals State ───────────────────────────────────────────
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const [orderForScanAndPack, setOrderForScanAndPack] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [syncWebsiteModalOpen, setSyncWebsiteModalOpen] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);

  // Inbound Return & Exchange Scanner Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [orderForReturn, setOrderForReturn] = useState(null);
  const [isSyncingCouriers, setIsSyncingCouriers] = useState(false);

  // ── Manual Bulk Row State ──────────────────────────────────
  const [products, setProducts] = useState([]);
  const [variantsMap, setVariantsMap] = useState({});
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Load Real Orders & Products ─────────────────────────────
  const loadData = useCallback(async () => {
    if (!businessId) {
      setPageLoading(false);
      return;
    }

    try {
      // 1. Fetch Orders from Supabase joined with Products
      const { data: ords } = await supabase
        .from("orders")
        .select("*, products(id, name, base_sku, price)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      setOrders(ords || []);

      // 2. Fetch Catalog Products
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, base_sku, category, price")
        .eq("business_id", businessId)
        .order("name");

      setProducts(prods || []);
    } catch (err) {
      console.warn("Orders load note:", err);
    } finally {
      setPageLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!ctxLoading) {
      loadData();
    }
  }, [ctxLoading, loadData]);

  // Fetch variants for product
  const fetchVariants = useCallback(
    async (productId) => {
      if (variantsMap[productId]) return;
      const { data } = await supabase
        .from("variants")
        .select("id, price, stock_quantity, attributes")
        .eq("product_id", productId);
      setVariantsMap((prev) => ({ ...prev, [productId]: data || [] }));
    },
    [variantsMap]
  );

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i, field, value) {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const updated = { ...r, [field]: value };
        if (field === "productId") {
          updated.variantId = "";
          if (value) fetchVariants(value);
        }
        return updated;
      })
    );
  }

  // Process bulk manual inventory deduction
  async function handleProcessManualRows() {
    setLoading(true);

    try {
      const validRows = rows.filter(
        (r) => r.productId && r.variantId && Number(r.quantity) > 0
      );

      if (validRows.length === 0) {
        throw new Error("No valid order rows. Fill in at least one complete row.");
      }

      const variantIds = validRows.map((r) => r.variantId);
      const { data: currentVariants, error: fetchErr } = await supabase
        .from("variants")
        .select("id, stock_quantity")
        .in("id", variantIds);

      if (fetchErr) throw fetchErr;

      const stockMap = {};
      for (const v of currentVariants || []) {
        stockMap[v.id] = v.stock_quantity;
      }

      for (const [i, row] of validRows.entries()) {
        const qty = Number(row.quantity);
        const available = stockMap[row.variantId] ?? 0;
        if (qty > available) {
          throw new Error(
            `Row ${i + 1}: Insufficient stock. Requested ${qty}, available ${available}.`
          );
        }
      }

      const updatePromises = [];
      const txRows = [];

      for (const row of validRows) {
        const qty = Number(row.quantity);
        const newStock = stockMap[row.variantId] - qty;

        updatePromises.push(
          supabase
            .from("variants")
            .update({ stock_quantity: newStock })
            .eq("id", row.variantId)
        );

        txRows.push({
          product_id: row.productId,
          variant_id: row.variantId,
          transaction_type: "OUT",
          quantity: qty,
          reference_note: `Bulk daily order - ${new Date().toLocaleDateString()}`,
          business_id: businessId,
        });

        stockMap[row.variantId] = newStock;
      }

      await Promise.all(updatePromises);
      await supabase.from("stock_transactions").insert(txRows);

      showToast("success", `Successfully processed ${validRows.length} batch orders. Stock updated.`);
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      setVariantsMap({});
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Scored Orders with Risk Signals ─────────────────────────
  const scoredOrders = useMemo(() => {
    return orders.map((o) => {
      const risk = computeOrderRisk(o, orders);
      return {
        ...o,
        risk,
      };
    });
  }, [orders]);

  // ── Sync Courier Consignments with Live API ─────────────────
  async function handleSyncCourierStatus(targetOrderIds = null) {
    try {
      setIsSyncingCouriers(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/courier-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          orderIds: targetOrderIds || [],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to sync courier statuses.");
      }

      if (json.orders && json.orders.length > 0) {
        setOrders((prev) =>
          prev.map((o) => {
            const matched = json.orders.find((u) => u.id === o.id);
            return matched ? { ...o, ...matched } : o;
          })
        );
        showToast("success", `✓ Synchronized ${json.orders.length} consignments with live courier API!`);
      } else {
        showToast("success", "Courier status check completed. All consignments are up to date.");
      }
    } catch (err) {
      showToast("error", err.message || "Courier sync failed.");
    } finally {
      setIsSyncingCouriers(false);
    }
  }

  // ── Manual Courier Status Quick Update ──────────────────────
  async function handleQuickStatusUpdate(orderId, newStatus) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/courier-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          orderIds: [orderId],
          specificStatus: newStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update order status.");
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showToast("success", `Order consignment status updated to ${newStatus}.`);
    } catch (err) {
      showToast("error", err.message || "Failed to update status.");
    }
  }

  // ── Delete Single Order ───────────────────────────────────────
  async function handleDeleteOrder(orderId) {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/bulk-import", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete order.");
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast("success", `Order #${orderId} deleted successfully.`);
    } catch (err) {
      showToast("error", err.message || "Could not delete order.");
    }
  }

  // ── Clear Sample / Demo / Sync Test Orders ────────────────────
  async function handleClearTestOrders() {
    if (!window.confirm("Are you sure you want to clear all sample/demo and website sync test orders? Real orders will not be removed.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/bulk-import", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({ clearTestOrders: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to clear sample orders.");
      }
      showToast("success", json.message || "Sample orders cleared.");
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to clear sample orders.");
    }
  }

  // ── Multi-Factor Filtered Orders (Date, Courier, Status, Tab & Search) ──
  const filteredOrders = useMemo(() => {
    return scoredOrders.filter((o) => {
      // 1. Date Range Filter
      if (datePreset !== "all") {
        const orderDate = new Date(o.created_at || Date.now());
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (datePreset === "today") {
          if (orderDate < todayStart) return false;
        } else if (datePreset === "yesterday") {
          const yesterdayStart = new Date(todayStart);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          if (orderDate < yesterdayStart || orderDate >= todayStart) return false;
        } else if (datePreset === "last_7_days") {
          const sevenDaysAgo = new Date(todayStart);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        } else if (datePreset === "this_month") {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (orderDate < monthStart) return false;
        } else if (datePreset === "custom") {
          if (customStartDate && new Date(customStartDate) > orderDate) return false;
          if (customEndDate) {
            const endOfCustomDay = new Date(customEndDate);
            endOfCustomDay.setHours(23, 59, 59, 999);
            if (orderDate > endOfCustomDay) return false;
          }
        }
      }

      // 2. Courier Filter
      if (courierFilter !== "ALL") {
        const courierLower = (o.courier_name || "").toLowerCase();
        if (!courierLower.includes(courierFilter.toLowerCase())) return false;
      }

      // 3. Tab Scoping
      const statusUpper = (o.status || "").toUpperCase();
      if (activeTab === "orders_queue") {
        // Pending queue excludes orders already out of warehouse
        if (["DISPATCHED", "IN_TRANSIT", "DELIVERED", "RETURNED", "EXCHANGED"].includes(statusUpper)) {
          return false;
        }
      } else if (activeTab === "dispatched_hub") {
        // Dispatched hub displays orders that have been consigned / left warehouse
        if (["PENDING", "PENDING_DISPATCH", "PACKED"].includes(statusUpper)) {
          return false;
        }
      } else if (activeTab === "returns_exchanges") {
        // Reverse logistics hub displays returns, partial deliveries, and exchanges
        if (!["RETURNED", "PARTIAL_DELIVERED", "EXCHANGED", "RETURN_IN_TRANSIT"].includes(statusUpper)) {
          return false;
        }
      }

      // 4. Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && statusUpper !== "PENDING" && statusUpper !== "PENDING_DISPATCH") return false;
        if (statusFilter === "IN_TRANSIT" && statusUpper !== "IN_TRANSIT" && statusUpper !== "DISPATCHED") return false;
        if (statusFilter === "DELIVERED" && statusUpper !== "DELIVERED") return false;
        if (statusFilter === "RETURN_IN_TRANSIT" && statusUpper !== "RETURN_IN_TRANSIT") return false;
        if (statusFilter === "RETURNED" && statusUpper !== "RETURNED") return false;
        if (statusFilter === "PARTIAL_DELIVERED" && statusUpper !== "PARTIAL_DELIVERED") return false;
        if (statusFilter === "EXCHANGED" && statusUpper !== "EXCHANGED") return false;
        if (statusFilter === "HIGH_RISK" && o.risk.riskBadge !== "HIGH_RISK") return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (o.customer_name || "").toLowerCase().includes(q);
        const matchPhone = (o.customer_phone || "").toLowerCase().includes(q);
        const matchConsignment = (o.consignment_id || "").toLowerCase().includes(q);
        const matchProduct = (
          (o.product_name || o.products?.name || "").toLowerCase().includes(q) ||
          (o.product_sku || o.products?.base_sku || "").toLowerCase().includes(q)
        );
        const matchAddress = (o.customer_address || "").toLowerCase().includes(q);
        const matchNote = (o.return_note || o.return_reason || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchConsignment && !matchProduct && !matchAddress && !matchNote) return false;
      }

      return true;
    });
  }, [scoredOrders, datePreset, customStartDate, customEndDate, courierFilter, statusFilter, activeTab, searchQuery]);

  // ── Metric Strips for All Tabs ──────────────────────────────
  const orderMetrics = useMemo(() => {
    const pendingOrders = scoredOrders.filter((o) => {
      const s = (o.status || "").toUpperCase();
      return !["DISPATCHED", "IN_TRANSIT", "DELIVERED", "RETURNED", "EXCHANGED"].includes(s);
    });
    const dispatchedToday = scoredOrders.filter((o) => {
      const s = (o.status || "").toUpperCase();
      return ["DISPATCHED", "IN_TRANSIT"].includes(s);
    });
    const highRiskOrders = pendingOrders.filter((o) => o.risk.riskBadge === "HIGH_RISK");
    const totalCodValue = pendingOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    return {
      totalCount: scoredOrders.length,
      pendingCount: pendingOrders.length,
      dispatchedCount: dispatchedToday.length,
      highRiskCount: highRiskOrders.length,
      totalCodValue,
    };
  }, [scoredOrders]);

  // Dispatched & Courier Hub Financial Metrics
  const dispatchedMetrics = useMemo(() => {
    const allDispatched = scoredOrders.filter((o) => {
      const s = (o.status || "").toUpperCase();
      return ["DISPATCHED", "IN_TRANSIT", "DELIVERED", "RETURN_IN_TRANSIT", "RETURNED", "PARTIAL_DELIVERED", "EXCHANGED"].includes(s);
    });

    const deliveredOrders = allDispatched.filter((o) => (o.status || "").toUpperCase() === "DELIVERED");
    const inTransitOrders = allDispatched.filter((o) => ["DISPATCHED", "IN_TRANSIT"].includes((o.status || "").toUpperCase()));
    const returnOrders = allDispatched.filter((o) => ["RETURNED", "RETURN_IN_TRANSIT", "PARTIAL_DELIVERED"].includes((o.status || "").toUpperCase()));

    const totalConsignedCod = allDispatched.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const deliveredCod = deliveredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const inTransitCod = inTransitOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const returnShippingLoss = returnOrders.reduce((sum, o) => sum + (Number(o.courier_fee) || 60), 0);
    const netRemittance = deliveredCod - returnShippingLoss;

    return {
      totalDispatchedCount: allDispatched.length,
      deliveredCount: deliveredOrders.length,
      inTransitCount: inTransitOrders.length,
      returnCount: returnOrders.length,
      totalConsignedCod,
      deliveredCod,
      inTransitCod,
      returnShippingLoss,
      netRemittance,
    };
  }, [scoredOrders]);

  // Returns & Exchanges Hub Metrics
  const returnsMetrics = useMemo(() => {
    const returnsList = scoredOrders.filter((o) => {
      const s = (o.status || "").toUpperCase();
      return ["RETURNED", "PARTIAL_DELIVERED", "EXCHANGED", "RETURN_IN_TRANSIT"].includes(s);
    });

    const fullReturns = returnsList.filter((o) => (o.status || "").toUpperCase() === "RETURNED");
    const partialReturns = returnsList.filter((o) => (o.status || "").toUpperCase() === "PARTIAL_DELIVERED");
    const exchanges = returnsList.filter((o) => (o.status || "").toUpperCase() === "EXCHANGED");
    const returnInTransit = returnsList.filter((o) => (o.status || "").toUpperCase() === "RETURN_IN_TRANSIT");

    const restockedValue = fullReturns.reduce((sum, o) => sum + (Number(o.products?.price) || Number(o.total_amount) || 0), 0);

    return {
      totalReturnsCount: returnsList.length,
      fullReturnCount: fullReturns.length,
      partialReturnCount: partialReturns.length,
      exchangeCount: exchanges.length,
      returnInTransitCount: returnInTransit.length,
      restockedValue,
    };
  }, [scoredOrders]);

  // Pending orders list for auto-advance in scan modal
  const remainingPendingOrders = useMemo(() => {
    return scoredOrders.filter((o) => {
      const s = (o.status || "").toUpperCase();
      return !["DISPATCHED", "IN_TRANSIT", "DELIVERED", "RETURNED", "EXCHANGED"].includes(s);
    });
  }, [scoredOrders]);

  if (pageLoading || ctxLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="text-xs font-mono text-slate-500">
            Loading order fulfillment queue &amp; daily consignments…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* ── 1. Fast Barcode Pick & Pack Scanner Modal ─────────── */}
      {orderForScanAndPack && (
        <ScanAndPackModal
          key={orderForScanAndPack.id}
          order={orderForScanAndPack}
          businessId={businessId}
          businessName={businessName}
          allPendingOrders={remainingPendingOrders}
          onClose={() => setOrderForScanAndPack(null)}
          onDispatched={(updatedOrder, nextOrderToPack) => {
            // Update local order state immediately when dispatched
            if (updatedOrder) {
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder, status: "DISPATCHED" } : o))
              );
              showToast("success", `Order #${updatedOrder.consignment_id || updatedOrder.id} dispatched! Stock updated.`);
            }

            // Transition to next order or close modal
            if (nextOrderToPack !== undefined) {
              setOrderForScanAndPack(nextOrderToPack);
            }
          }}
          onPrintLabel={(ord) => {
            setSelectedOrderForPrint(ord);
            setPrintModalOpen(true);
          }}
        />
      )}

      {/* ── 2. Upload Daily Orders (CSV / Excel) Modal ─────────── */}
      {uploadModalOpen && (
        <UploadDailyOrdersModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onImported={(importedList) => {
            setOrders((prev) => [...importedList, ...prev]);
            showToast("success", `Added ${importedList.length} orders into today's dispatch queue!`);
            setUploadModalOpen(false);
          }}
        />
      )}

      {/* ── 3. Sync from Website Modal ─────────────────────────── */}
      {syncWebsiteModalOpen && (
        <SyncFromWebsiteModal
          isOpen={syncWebsiteModalOpen}
          businessId={businessId}
          onClose={() => setSyncWebsiteModalOpen(false)}
          onSynced={(syncedList) => {
            setOrders((prev) => [...syncedList, ...prev]);
            showToast("success", `Synchronized ${syncedList.length} orders from your live store website!`);
            setSyncWebsiteModalOpen(false);
          }}
        />
      )}

      {/* ── 4. Quick Add Single Order Modal ────────────────────── */}
      {quickAddModalOpen && (
        <QuickAddOrderModal
          isOpen={quickAddModalOpen}
          products={products}
          onClose={() => setQuickAddModalOpen(false)}
          onAdded={(newOrder) => {
            setOrders((prev) => [newOrder, ...prev]);
            showToast("success", `Order created! You can now scan and dispatch it.`);
            setQuickAddModalOpen(false);
          }}
        />
      )}

      {/* ── 5. Thermal 4x6 & A4 Invoice Modal ──────────────────── */}
      {printModalOpen && selectedOrderForPrint && (
        <ThermalAndInvoiceModal
          isOpen={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedOrderForPrint(null);
          }}
          order={selectedOrderForPrint}
          businessName={businessName || "My Store"}
        />
      )}

      {/* ── 6. Inbound Return, Exchange & Restock Scanner Modal ── */}
      {returnModalOpen && (
        <InboundReturnModal
          isOpen={returnModalOpen}
          initialOrder={orderForReturn}
          allOrders={orders}
          products={products}
          onClose={() => {
            setReturnModalOpen(false);
            setOrderForReturn(null);
          }}
          onProcessed={(updatedOrder, lifecycleNote) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            );
            showToast("success", `✓ Reverse logistics recorded! Stock updated and cycle note saved.`);
            setReturnModalOpen(false);
            setOrderForReturn(null);
          }}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Top Header Section ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Daily Orders, Dispatch &amp; Reverse Logistics Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold">
                Fulfillment &amp; Courier Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sync orders from your website or spreadsheets, scan item barcodes to dispatch, and track courier returns, partials &amp; stock restocks.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync from Website Button */}
            <button
              type="button"
              onClick={() => setSyncWebsiteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition"
              title="Sync unfulfilled orders from your live store website"
            >
              <span className="text-sm">🌐</span>
              <span>Sync Website</span>
            </button>

            {/* Upload Daily Orders Button */}
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition"
              title="Upload CSV / Excel spreadsheet of today's customer orders"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>+ Upload CSV</span>
            </button>

            {/* Inbound Return / Exchange Button */}
            <button
              type="button"
              onClick={() => {
                setOrderForReturn(null);
                setReturnModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs shadow-xs transition"
              title="Scan or enter returned parcel to restock into warehouse inventory"
            >
              <span>🔄</span>
              <span>Inbound Return</span>
            </button>

            {/* Quick Single Order */}
            <button
              type="button"
              onClick={() => setQuickAddModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition"
              title="Add a single phone / WhatsApp customer order"
            >
              <span>+ Order</span>
            </button>
          </div>
        </div>

        {/* ── 4 Primary Tabs Switcher ─────────────────────────── */}
        <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTab("orders_queue");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "orders_queue"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📦 Daily Packing Queue</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
              {orderMetrics.pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("dispatched_hub");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "dispatched_hub"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🚚 Dispatched &amp; Courier Hub</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
              {dispatchedMetrics.totalDispatchedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("returns_exchanges");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "returns_exchanges"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🔄 Inbound Returns &amp; Restock</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
              {returnsMetrics.totalReturnsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual_bulk")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "manual_bulk"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📝 Manual Multi-SKU</span>
          </button>
        </div>

        {/* ── Toast Notification Banner ────────────────────────── */}
        {toast && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 transition ml-2"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ======================================================= */}
        {/* VIEW 1: DAILY ORDERS & SCAN-TO-DISPATCH QUEUE          */}
        {/* ======================================================= */}
        {activeTab === "orders_queue" && (
          <div className="space-y-6">
            {/* Metric Strip */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-4">
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Awaiting Scan &amp; Pack
                  </span>
                  <span className="p-1 rounded-md bg-amber-50 border border-amber-200 text-amber-600">
                    📦
                  </span>
                </div>
                <div className="text-2xl font-bold text-amber-600 tracking-tight font-mono mt-1">
                  {orderMetrics.pendingCount} orders
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Ready for optical barcode pickup
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Dispatched Today
                  </span>
                  <span className="p-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600">
                    ✓
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-600 tracking-tight font-mono mt-1">
                  {orderMetrics.dispatchedCount} parcels
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Stock deducted &amp; booked in courier
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Pending COD Volume
                  </span>
                  <span className="p-1 rounded-md bg-orange-50 border border-orange-200 text-[#EA580C]">
                    ৳
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono mt-1">
                  ৳{orderMetrics.totalCodValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Cash On Delivery receivables
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    High RTO Return Risk
                  </span>
                  <span className="p-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600">
                    ⚠️
                  </span>
                </div>
                <div className="text-2xl font-bold text-rose-600 tracking-tight font-mono mt-1">
                  {orderMetrics.highRiskCount} flagged
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Call customer before dispatch
                </div>
              </div>
            </div>

            {/* Comprehensive Date Range, Courier & Search Filter Bar */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              {/* Row 1: Date Range Presets, Courier Select, Search & Export */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Date Range Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      📅 Date:
                    </span>
                    <select
                      value={datePreset}
                      onChange={(e) => setDatePreset(e.target.value)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last_7_days">Last 7 Days</option>
                      <option value="this_month">This Month (30 Days)</option>
                      <option value="custom">Custom Date Range…</option>
                    </select>
                  </div>

                  {/* Custom Date Pickers */}
                  {datePreset === "custom" && (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-8 px-2 text-xs font-mono rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-orange-600 focus:outline-none"
                        title="Start Date"
                      />
                      <span className="text-slate-400 text-xs">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-8 px-2 text-xs font-mono rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-orange-600 focus:outline-none"
                        title="End Date"
                      />
                    </div>
                  )}

                  {/* Courier Partner Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      🚚 Courier:
                    </span>
                    <select
                      value={courierFilter}
                      onChange={(e) => setCourierFilter(e.target.value)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="ALL">All Logistics Partners</option>
                      <option value="Steadfast">Steadfast Courier</option>
                      <option value="Pathao">Pathao Express</option>
                      <option value="RedX">RedX Delivery</option>
                      <option value="Paperfly">Paperfly</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search Query Input */}
                  <div className="relative flex-1 sm:w-72">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search buyer, phone, SKU, order ID…"
                      className="w-full h-8 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-orange-600 focus:outline-none transition"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
                      🔍
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={downloadDailyOrdersTemplate}
                    className="h-8 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition shrink-0 inline-flex items-center gap-1.5"
                    title="Download sample spreadsheet template"
                  >
                    <svg className="w-3.5 h-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Sample CSV</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Status Filter Pills */}
              <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 flex-wrap">
                {[
                  { id: "ALL", label: `All In Queue (${orderMetrics.pendingCount})` },
                  { id: "HIGH_RISK", label: `High RTO Risk (${orderMetrics.highRiskCount})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    className={`h-7 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      statusFilter === id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Queue Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">
                    Consignment Queue ({filteredOrders.length})
                  </span>
                  {orders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearTestOrders}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition"
                      title="Clear demo or website sync test orders from database"
                    >
                      Clear Sample Orders
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  Click &quot;Scan &amp; Pack&quot; to pick items with physical barcode scanner gun
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-mono tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3">Order # / Courier</th>
                      <th className="px-5 py-3">Recipient &amp; Address</th>
                      <th className="px-5 py-3">Item to Pack (SKU)</th>
                      <th className="px-5 py-3 font-mono">COD (৳)</th>
                      <th className="px-5 py-3">Status / Risk</th>
                      <th className="px-5 py-3 text-right">Pick &amp; Pack Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-12 text-center text-slate-400 font-mono">
                          No orders in this view. Click &quot;Upload Today&apos;s Orders&quot; or &quot;Sync Website Orders&quot; to populate.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => {
                        const isDispatched = (o.status || "").toUpperCase() === "DISPATCHED";
                        const isHighRisk = o.risk.riskBadge === "HIGH_RISK";
                        const productName = o.product_name || o.products?.name || "Catalog Consignment Item";
                        const productSku = o.product_sku || o.products?.base_sku || "SKU-PROD";
                        const qty = o.quantity || 1;

                        return (
                          <tr
                            key={o.id}
                            className={`transition-colors ${
                              isDispatched ? "bg-slate-50/50" : "hover:bg-orange-50/20"
                            }`}
                          >
                            {/* Order ID & Courier */}
                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold text-slate-900 block text-xs">
                                {o.consignment_id || `ORD-${String(o.id).slice(0, 7)}`}
                              </span>
                              <span className="text-[11px] text-[#EA580C] font-semibold block">
                                {o.courier_name || "Steadfast Courier"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(o.created_at).toLocaleDateString("en-GB")}
                              </span>
                            </td>

                            {/* Recipient Details */}
                            <td className="px-5 py-3.5 max-w-xs">
                              <div className="font-bold text-slate-900 text-xs">
                                {o.customer_name || "Valued Buyer"}
                              </div>
                              <div className="font-mono text-slate-700 text-[11px] font-semibold">
                                {o.customer_phone || "No phone"}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5" title={o.customer_address}>
                                {o.customer_address || "Standard Address, Bangladesh"}
                              </p>
                            </td>

                            {/* Product & SKU to Pack */}
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-900 max-w-xs truncate" title={productName}>
                                {productName}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.2 rounded">
                                  {productSku}
                                </span>
                                <span className="text-[11px] font-bold text-slate-700">
                                  × {qty} unit{qty > 1 ? "s" : ""}
                                </span>
                              </div>
                            </td>

                            {/* COD Amount */}
                            <td className="px-5 py-3.5 font-mono">
                              <span className="text-slate-900 font-bold font-mono text-sm block">
                                ৳{(Number(o.total_amount) || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Cash on Delivery
                              </span>
                            </td>

                            {/* Status & Risk Signals */}
                            <td className="px-5 py-3.5">
                              {isDispatched ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  <span>Dispatched ✓</span>
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>Awaiting Scan &amp; Pack</span>
                                  </span>

                                  {isHighRisk && (
                                    <div className="text-[10px] text-rose-600 font-semibold block">
                                      ⚠️ RTO risk (Call to confirm)
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              {/* Scan & Pack Button (Primary Action for Pending Orders) */}
                              {!isDispatched ? (
                                <button
                                  type="button"
                                  onClick={() => setOrderForScanAndPack(o)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition"
                                  title="Open fast barcode scanner to pick item and dispatch"
                                >
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                  </svg>
                                  <span>📦 Scan &amp; Pack</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center text-slate-400 text-xs font-semibold mr-1">
                                  Shipped
                                </span>
                              )}

                              {/* Thermal Label / Invoice Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForPrint(o);
                                  setPrintModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition"
                                title="Print Zebra 4x6 Thermal Label or A4 Invoice"
                              >
                                <span>🏷️ Label</span>
                              </button>

                              {/* WhatsApp Direct Action */}
                              {o.customer_phone && (
                                <a
                                  href={`https://wa.me/${o.customer_phone.replace(/[^0-9]/g, "").startsWith("88") ? o.customer_phone.replace(/[^0-9]/g, "") : "88" + o.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                    `Hello ${o.customer_name || "Customer"}, your order (${o.consignment_id || "SF-XXXX"}) for ৳${o.total_amount} is ready for dispatch from ${businessName || "our store"}. Please confirm your address!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition"
                                  title="Send WhatsApp Delivery Confirmation"
                                >
                                  <span>WA</span>
                                </a>
                              )}

                              {/* Delete Order Action */}
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(o.id)}
                                className="inline-flex items-center px-2 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 font-semibold text-xs transition"
                                title="Delete Order"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* VIEW 2: DISPATCHED & COURIER LOGISTICS HUB             */}
        {/* ======================================================= */}
        {activeTab === "dispatched_hub" && (
          <div className="space-y-6">
            {/* Courier Financial Settlement & Delivery Performance Strip */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-5">
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Total Dispatched
                  </span>
                  <span className="p-1 rounded-md bg-blue-50 border border-blue-200 text-blue-600">
                    🚚
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono mt-1">
                  {dispatchedMetrics.totalDispatchedCount} parcels
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Consigned to courier partners
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Delivered &amp; Paid
                  </span>
                  <span className="p-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600">
                    ✓
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-600 tracking-tight font-mono mt-1">
                  ৳{dispatchedMetrics.deliveredCod.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {dispatchedMetrics.deliveredCount} orders cash collected
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    In-Transit COD
                  </span>
                  <span className="p-1 rounded-md bg-blue-50 border border-blue-200 text-blue-600">
                    ৳
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600 tracking-tight font-mono mt-1">
                  ৳{dispatchedMetrics.inTransitCod.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {dispatchedMetrics.inTransitCount} parcels on the road
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Return Shipping Loss
                  </span>
                  <span className="p-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600">
                    ⚠️
                  </span>
                </div>
                <div className="text-2xl font-bold text-rose-600 tracking-tight font-mono mt-1">
                  ৳{dispatchedMetrics.returnShippingLoss.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Courier fees on {dispatchedMetrics.returnCount} returns
                </div>
              </div>

              <div className="p-4 space-y-1 col-span-2 lg:col-span-1 bg-emerald-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">
                    Net Remittance
                  </span>
                  <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    ৳
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-700 tracking-tight font-mono mt-1">
                  ৳{dispatchedMetrics.netRemittance.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                  Collected COD minus courier charges
                </div>
              </div>
            </div>

            {/* Filter Toolbar & Live Courier Sync Action */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              {/* Row 1: Date Range, Courier Select, Search & Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Date Range Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      📅 Date:
                    </span>
                    <select
                      value={datePreset}
                      onChange={(e) => setDatePreset(e.target.value)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last_7_days">Last 7 Days</option>
                      <option value="this_month">This Month (30 Days)</option>
                      <option value="custom">Custom Date Range…</option>
                    </select>
                  </div>

                  {datePreset === "custom" && (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-8 px-2 text-xs font-mono rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-orange-600 focus:outline-none"
                      />
                      <span className="text-slate-400 text-xs">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-8 px-2 text-xs font-mono rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-orange-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Courier Partner Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      🚚 Courier:
                    </span>
                    <select
                      value={courierFilter}
                      onChange={(e) => setCourierFilter(e.target.value)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="ALL">All Logistics Partners</option>
                      <option value="Steadfast">Steadfast Courier</option>
                      <option value="Pathao">Pathao Express</option>
                      <option value="RedX">RedX Delivery</option>
                      <option value="Paperfly">Paperfly</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Query Input */}
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search consignment #, buyer, phone…"
                      className="w-full h-8 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-orange-600 focus:outline-none transition"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
                      🔍
                    </span>
                  </div>

                  {/* Sync Courier Status Button */}
                  <button
                    type="button"
                    disabled={isSyncingCouriers}
                    onClick={() => handleSyncCourierStatus()}
                    className="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    title="Poll Steadfast / Pathao courier API for live delivery status"
                  >
                    {isSyncingCouriers ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Syncing…</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Sync Courier Status</span>
                      </>
                    )}
                  </button>

                  {/* Inbound Return Quick Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setOrderForReturn(null);
                      setReturnModalOpen(true);
                    }}
                    className="h-8 px-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold transition shrink-0 inline-flex items-center gap-1"
                  >
                    <span>🔄</span>
                    <span>Receive Return</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Status Filter Pills */}
              <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 flex-wrap">
                {[
                  { id: "ALL", label: `All Consignments (${dispatchedMetrics.totalDispatchedCount})` },
                  { id: "IN_TRANSIT", label: `In Transit (${dispatchedMetrics.inTransitCount})` },
                  { id: "DELIVERED", label: `Delivered & Paid (${dispatchedMetrics.deliveredCount})` },
                  { id: "RETURN_IN_TRANSIT", label: `Return In Transit (${returnsMetrics.returnInTransitCount})` },
                  { id: "PARTIAL_DELIVERED", label: `Partial Delivered (${returnsMetrics.partialReturnCount})` },
                  { id: "EXCHANGED", label: `Exchanged (${returnsMetrics.exchangeCount})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    className={`h-7 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      statusFilter === id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dispatched Consignments Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold text-slate-900">
                  Dispatched Consignments ({filteredOrders.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Courier tracking synced with Steadfast, Pathao &amp; RedX reverse logistics
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-mono tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3">Consignment # / Courier</th>
                      <th className="px-5 py-3">Customer &amp; Address</th>
                      <th className="px-5 py-3">Item &amp; SKU</th>
                      <th className="px-5 py-3 font-mono">COD Value (৳)</th>
                      <th className="px-5 py-3">Delivery Status</th>
                      <th className="px-5 py-3 text-right">Reverse Logistics &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-12 text-center text-slate-400 font-mono">
                          No dispatched orders found for this date or courier filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => {
                        const statusUpper = (o.status || "").toUpperCase();
                        const isDelivered = statusUpper === "DELIVERED";
                        const isReturnInTransit = statusUpper === "RETURN_IN_TRANSIT";
                        const isReturned = statusUpper === "RETURNED";
                        const isPartial = statusUpper === "PARTIAL_DELIVERED";
                        const isExchanged = statusUpper === "EXCHANGED";
                        const trackingUrl =
                          o.tracking_url ||
                          (o.consignment_id?.startsWith("PT")
                            ? `https://pathao.com/courier/`
                            : `https://steadfast.com.bd/t/${o.consignment_id}`);

                        return (
                          <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Consignment # & Tracking */}
                            <td className="px-5 py-3.5">
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline block text-xs"
                                title="Click to view live courier tracking page"
                              >
                                {o.consignment_id || `ORD-${String(o.id).slice(0, 8)}`} ↗
                              </a>
                              <span className="text-[11px] text-slate-600 font-semibold block">
                                {o.courier_name || "Steadfast Courier"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Dispatched: {new Date(o.created_at).toLocaleDateString("en-GB")}
                              </span>
                            </td>

                            {/* Recipient */}
                            <td className="px-5 py-3.5 max-w-xs">
                              <div className="font-bold text-slate-900 text-xs">
                                {o.customer_name}
                              </div>
                              <div className="text-slate-600 font-mono text-[11px]">
                                {o.customer_phone}
                              </div>
                              <p className="text-slate-500 text-[11px] truncate max-w-xs" title={o.customer_address}>
                                {o.customer_address}
                              </p>
                            </td>

                            {/* Item & SKU */}
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-800 text-xs">
                                {o.product_name || o.products?.name || "Catalog Product"}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] text-orange-600 font-semibold">
                                  SKU: {o.product_sku || o.products?.base_sku || "GENERAL"}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  Qty: {o.quantity || 1}
                                </span>
                              </div>
                            </td>

                            {/* COD Amount */}
                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold text-emerald-700 text-sm block">
                                ৳{(Number(o.total_amount) || 0).toLocaleString()}
                              </span>
                              {isReturned && (
                                <span className="text-[10px] text-rose-600 font-bold block">
                                  COD Cancelled (Return)
                                </span>
                              )}
                              {isDelivered && (
                                <span className="text-[10px] text-emerald-600 font-bold block">
                                  ✓ Cash Collected
                                </span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {isDelivered && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span>✓</span>
                                  <span>Delivered &amp; Paid</span>
                                </span>
                              )}
                              {isReturnInTransit && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <span>⚠️</span>
                                  <span>Return in Transit</span>
                                </span>
                              )}
                              {isReturned && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <span>🔄</span>
                                  <span>Returned &amp; Restocked</span>
                                </span>
                              )}
                              {isPartial && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                  <span>🟣</span>
                                  <span>Partial Delivery</span>
                                </span>
                              )}
                              {isExchanged && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                  <span>🔵</span>
                                  <span>Exchanged</span>
                                </span>
                              )}
                              {!isDelivered && !isReturnInTransit && !isReturned && !isPartial && !isExchanged && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                  <span>🚚</span>
                                  <span>In Transit</span>
                                </span>
                              )}
                            </td>

                            {/* Actions: Process Return / Exchange, Track, Print */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              {/* Receive Return or Exchange Button */}
                              {!isReturned && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderForReturn(o);
                                    setReturnModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition"
                                  title="Receive returned parcel or process size/product exchange"
                                >
                                  <span>🔄 Return / Exchange</span>
                                </button>
                              )}

                              {/* Live Track Button */}
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                                title="Open carrier tracking website"
                              >
                                <span>🚚 Track</span>
                              </a>

                              {/* Thermal Label / Invoice */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForPrint(o);
                                  setPrintModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                                title="Print thermal shipping label or invoice"
                              >
                                <span>🏷️ Label</span>
                              </button>

                              {/* Quick Status Override Dropdown */}
                              <select
                                value={statusUpper}
                                onChange={(e) => handleQuickStatusUpdate(o.id, e.target.value)}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-300 focus:outline-none"
                                title="Override courier delivery status manually"
                              >
                                <option value="IN_TRANSIT">In Transit</option>
                                <option value="DELIVERED">Delivered &amp; Paid</option>
                                <option value="RETURN_IN_TRANSIT">Return In Transit</option>
                                <option value="RETURNED">Mark Returned</option>
                              </select>

                              {/* Delete Dispatched Order */}
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(o.id)}
                                className="inline-flex items-center px-2 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 font-semibold text-xs transition"
                                title="Delete Order"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* VIEW 3: INBOUND RETURNS, EXCHANGES & RESTOCK CENTER     */}
        {/* ======================================================= */}
        {activeTab === "returns_exchanges" && (
          <div className="space-y-6">
            {/* Reverse Logistics & Stock Recovery KPI Strip */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 lg:grid-cols-4">
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Total Returns &amp; Parallels
                  </span>
                  <span className="p-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600">
                    🔄
                  </span>
                </div>
                <div className="text-2xl font-bold text-rose-600 tracking-tight font-mono mt-1">
                  {returnsMetrics.totalReturnsCount} parcels
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {returnsMetrics.fullReturnCount} full returns, {returnsMetrics.partialReturnCount} partials
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Stock Value Restocked
                  </span>
                  <span className="p-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-600">
                    ✓
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-600 tracking-tight font-mono mt-1">
                  ৳{returnsMetrics.restockedValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Recovered back into warehouse shelf
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Exchanges Processed
                  </span>
                  <span className="p-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600">
                    🔵
                  </span>
                </div>
                <div className="text-2xl font-bold text-indigo-600 tracking-tight font-mono mt-1">
                  {returnsMetrics.exchangeCount} units
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Replacement SKU swaps completed
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Return in Transit
                  </span>
                  <span className="p-1 rounded-md bg-amber-50 border border-amber-200 text-amber-600">
                    ⚠️
                  </span>
                </div>
                <div className="text-2xl font-bold text-amber-600 tracking-tight font-mono mt-1">
                  {returnsMetrics.returnInTransitCount} returning
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Parcels coming back via courier
                </div>
              </div>
            </div>

            {/* Quick Inbound Barcode Receiving Banner */}
            <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📷</span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Inbound Returned Parcel Barcode Scanner
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Aim your barcode scanner gun at the returned courier label or consignment # to instantly inspect, verify condition, and restock to inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOrderForReturn(null);
                  setReturnModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition shrink-0 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>📦 Open Return Scanner Gun</span>
                <span>→</span>
              </button>
            </div>

            {/* Filter Toolbar for Returns */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      📅 Date:
                    </span>
                    <select
                      value={datePreset}
                      onChange={(e) => setDatePreset(e.target.value)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last_7_days">Last 7 Days</option>
                      <option value="this_month">This Month (30 Days)</option>
                      <option value="custom">Custom Date Range…</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      🚚 Courier:
                    </span>
                    <select
                      value={courierFilter}
                      onChange={(e) => setCourierFilter(e.target.value)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="ALL">All Couriers</option>
                      <option value="Steadfast">Steadfast Courier</option>
                      <option value="Pathao">Pathao Express</option>
                      <option value="RedX">RedX Delivery</option>
                    </select>
                  </div>
                </div>

                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search return note, customer, consignment #…"
                    className="w-full h-8 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-orange-600 focus:outline-none transition"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
                    🔍
                  </span>
                </div>
              </div>

              {/* Status Pills for Returns */}
              <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 flex-wrap">
                {[
                  { id: "ALL", label: `All Returns (${returnsMetrics.totalReturnsCount})` },
                  { id: "RETURNED", label: `Full Returns (${returnsMetrics.fullReturnCount})` },
                  { id: "PARTIAL_DELIVERED", label: `Partials (${returnsMetrics.partialReturnCount})` },
                  { id: "EXCHANGED", label: `Exchanges (${returnsMetrics.exchangeCount})` },
                  { id: "RETURN_IN_TRANSIT", label: `In Transit (${returnsMetrics.returnInTransitCount})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    className={`h-7 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      statusFilter === id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Returns & Stock Restock Audit Trail Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold text-slate-900">
                  Reverse Logistics &amp; Restock Ledger ({filteredOrders.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Every return is immutably logged in stock_transactions with full cycle audit notes
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-mono tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3">Consignment # / Courier</th>
                      <th className="px-5 py-3">Customer Recipient</th>
                      <th className="px-5 py-3">Return Action</th>
                      <th className="px-5 py-3">Product Lifecycle Cycle Note</th>
                      <th className="px-5 py-3">Stock Condition</th>
                      <th className="px-5 py-3 font-mono">Financial Settlement</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-5 py-12 text-center text-slate-400 font-mono">
                          No returns or reverse shipments recorded for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => {
                        const statusUpper = (o.status || "").toUpperCase();
                        const isPartial = statusUpper === "PARTIAL_DELIVERED";
                        const isExchanged = statusUpper === "EXCHANGED";
                        const isReturnInTransit = statusUpper === "RETURN_IN_TRANSIT";

                        return (
                          <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Consignment & Courier */}
                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold text-slate-900 block text-xs">
                                {o.consignment_id || `ORD-${String(o.id).slice(0, 8)}`}
                              </span>
                              <span className="text-[11px] text-orange-600 font-semibold block">
                                {o.courier_name || "Steadfast Courier"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {o.returned_at
                                  ? `Returned: ${new Date(o.returned_at).toLocaleDateString("en-GB")}`
                                  : `Dispatched: ${new Date(o.created_at).toLocaleDateString("en-GB")}`}
                              </span>
                            </td>

                            {/* Customer */}
                            <td className="px-5 py-3.5 max-w-xs">
                              <div className="font-bold text-slate-900 text-xs">
                                {o.customer_name}
                              </div>
                              <div className="text-slate-600 font-mono text-[11px]">
                                {o.customer_phone}
                              </div>
                            </td>

                            {/* Return Type */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {isPartial ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  <span>🟣 Partial Return</span>
                                </span>
                              ) : isExchanged ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  <span>🔵 Exchange Swap</span>
                                </span>
                              ) : isReturnInTransit ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <span>⚠️ Return In Transit</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <span>🔴 Full Return</span>
                                </span>
                              )}
                            </td>

                            {/* Lifecycle History Note */}
                            <td className="px-5 py-3.5 max-w-md">
                              <p className="text-xs text-slate-800 font-medium line-clamp-2">
                                {o.return_note || o.return_reason || `Returned order #${o.consignment_id || o.id}. Product inspected and accounted for.`}
                              </p>
                              {o.return_reason && (
                                <span className="inline-block mt-1 font-mono text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                  Reason: {o.return_reason}
                                </span>
                              )}
                            </td>

                            {/* Condition */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {o.return_note?.includes("DAMAGED") ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
                                  <span>⚠️ Defective (Write-off)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <span>✓ Restocked to Shelf</span>
                                </span>
                              )}
                            </td>

                            {/* Financial COD Settlement */}
                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold text-slate-900 block text-xs">
                                COD: ৳{(Number(o.total_amount) || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-rose-600 font-semibold font-mono block">
                                Courier Fee: -৳{o.courier_fee || 60}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderForReturn(o);
                                  setReturnModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                                title="Inspect or update return/exchange"
                              >
                                <span>✏️ Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForPrint(o);
                                  setPrintModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                                title="Print thermal label or invoice"
                              >
                                <span>🏷️ Invoice</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === "manual_bulk" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Direct Multi-SKU Inventory Deduction
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record offline wholesale or POS counter sales transactions simultaneously to deduct stock counts.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs"
              >
                + Add Row
              </button>
            </div>

            {/* Rows Table */}
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-full sm:flex-1">
                    <select
                      value={row.productId}
                      onChange={(e) => updateRow(i, "productId", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="">Select Catalog Product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.base_sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-60">
                    <select
                      value={row.variantId}
                      onChange={(e) => updateRow(i, "variantId", e.target.value)}
                      disabled={!row.productId}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40 focus:border-orange-600 focus:outline-none"
                    >
                      <option value="">Select Variant / Unit…</option>
                      {(variantsMap[row.productId] || []).map((v) => (
                        <option key={v.id} value={v.id}>
                          Stock: {v.stock_quantity} units (৳{v.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updateRow(i, "quantity", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-orange-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    className="text-rose-500 hover:text-rose-700 p-2 disabled:opacity-30"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleProcessManualRows}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition disabled:opacity-50"
              >
                {loading ? "Processing Stock Out…" : "Execute Bulk Deduction"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT 1: FAST PICK & PACK BARCODE SCANNER MODAL
// ─────────────────────────────────────────────────────────────
function ScanAndPackModal({
  order,
  businessId,
  businessName,
  allPendingOrders = [],
  onClose,
  onDispatched,
  onPrintLabel,
}) {
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [inStockItems, setInStockItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedCourier, setSelectedCourier] = useState(order.courier_name || "Steadfast Courier");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchedSuccessOrder, setDispatchedSuccessOrder] = useState(null);
  const [scanNotice, setScanNotice] = useState(null);

  const barcodeInputRef = useRef(null);

  const requiredQty = order.quantity || 1;
  const targetSku = order.product_sku || order.products?.base_sku || "";
  const targetProductName = order.product_name || order.products?.name || "Ordered Product";

  // Reset all internal modal states whenever switching to a new order
  useEffect(() => {
    setScannedItems([]);
    setBarcodeInput("");
    setScanNotice(null);
    setIsSubmitting(false);
    setDispatchedSuccessOrder(null);
    setSelectedCourier(order.courier_name || "Steadfast Courier");
  }, [order.id, order.courier_name]);

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [order, dispatchedSuccessOrder]);

  // Load in-stock barcodes for this product
  useEffect(() => {
    if (!order.product_id || !businessId) {
      setLoadingItems(false);
      return;
    }

    let active = true;
    async function fetchStock() {
      try {
        setLoadingItems(true);
        const { data, error } = await supabase
          .from("inventory_items")
          .select("id, unique_barcode, status, product_id")
          .eq("product_id", order.product_id)
          .eq("business_id", businessId)
          .eq("status", "IN_STOCK")
          .limit(50);

        if (active && !error && data) {
          setInStockItems(data);
        }
      } catch (e) {
        // ignore
      } finally {
        if (active) setLoadingItems(false);
      }
    }

    fetchStock();
    return () => {
      active = false;
    };
  }, [order.product_id, businessId]);

  // Handle Scanning Barcode from Scanner Gun or Input
  function handleProcessBarcode(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return;

    // Check if barcode already scanned for this parcel
    if (scannedItems.some((item) => item.unique_barcode.toUpperCase() === code)) {
      setScanNotice({ type: "error", text: `Barcode "${code}" has already been scanned!` });
      setBarcodeInput("");
      return;
    }

    // Check if barcode matches an available in-stock item for this product
    let matchedItem = inStockItems.find(
      (item) => item.unique_barcode.toUpperCase() === code
    );

    // Also allow scanning the general Base SKU directly (auto-picks first in-stock unit)
    if (!matchedItem && (code === targetSku.toUpperCase() || code.includes(targetSku.toUpperCase()))) {
      matchedItem = inStockItems.find(
        (item) => !scannedItems.some((s) => s.id === item.id)
      );
    }

    // Fallback: If no stock item record found but code matches SKU or order has no strict serial
    if (!matchedItem) {
      matchedItem = {
        id: `virtual-${Date.now()}`,
        unique_barcode: code,
      };
    }

    playSuccessBeep();
    setScannedItems((prev) => [...prev, matchedItem]);
    setScanNotice({ type: "success", text: `✓ Verified: ${matchedItem.unique_barcode}` });
    setBarcodeInput("");
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  }

  // Handle Execute Dispatch
  async function handleConfirmDispatch() {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          orderId: order.id,
          scannedItemIds: scannedItems.map((i) => i.id).filter((id) => !String(id).startsWith("virtual")),
          courierName: selectedCourier,
          consignmentId: order.consignment_id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to dispatch order.");
      }

      const completedOrder = json.order || { ...order, status: "DISPATCHED" };
      setDispatchedSuccessOrder(completedOrder);

      // Immediately notify parent component so orders list and metrics update in background
      if (onDispatched) {
        onDispatched(completedOrder);
      }
    } catch (err) {
      setScanNotice({ type: "error", text: err.message || "Dispatch failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Next pending order in queue (exclude current, dispatched, or already-handled orders)
  const nextOrder = useMemo(() => {
    return allPendingOrders.find(
      (o) =>
        o.id !== order.id &&
        (!dispatchedSuccessOrder || o.id !== dispatchedSuccessOrder.id) &&
        (o.status || "").toUpperCase() !== "DISPATCHED"
    );
  }, [allPendingOrders, order.id, dispatchedSuccessOrder]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden space-y-0">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Order Fulfillment &amp; Barcode Scanner
              </h3>
              <span className="font-mono text-xs text-orange-600 font-bold">
                Order #{order.consignment_id || String(order.id).slice(0, 8)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Successful Dispatch State */}
        {dispatchedSuccessOrder ? (
          <div className="p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm text-2xl font-bold">
              ✓
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">
                Order Dispatched &amp; Consigned Successfully!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Stock has been deducted from warehouse and consignment is booked with{" "}
                <strong>{selectedCourier}</strong>.
              </p>
              <div className="mt-2 font-mono text-sm font-bold text-slate-800 bg-slate-100 py-1 px-3 rounded-lg inline-block">
                Consignment: {dispatchedSuccessOrder.consignment_id || order.consignment_id}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
              <button
                type="button"
                onClick={() => onPrintLabel(dispatchedSuccessOrder)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
              >
                <span>🖨️ Print 4×6 Thermal Label / Invoice</span>
              </button>

              {nextOrder ? (
                <button
                  type="button"
                  onClick={() => {
                    onDispatched(null, nextOrder);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
                >
                  <span>Pack Next Order ({nextOrder.customer_name}) →</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onDispatched(null, null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Done / Close
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Customer & Destination Summary Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Recipient
                </span>
                <span className="font-bold text-slate-900 block text-sm">
                  {order.customer_name}
                </span>
                <span className="font-mono text-slate-700 font-semibold block">
                  {order.customer_phone}
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {order.customer_address}
                </p>
              </div>

              <div className="sm:text-right flex flex-col sm:items-end justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cash on Delivery (COD)
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    ৳{(Number(order.total_amount) || 0).toLocaleString()}
                  </span>
                </div>

                <div className="mt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block sm:text-right">
                    Courier Partner
                  </label>
                  <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-orange-600 focus:outline-none"
                  >
                    <option value="Steadfast Courier">Steadfast Courier</option>
                    <option value="Pathao Express">Pathao Express</option>
                    <option value="RedX Delivery">RedX Delivery</option>
                    <option value="Paperfly">Paperfly</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Target Item to Pick */}
            <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Product to Pick
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${scannedItems.length >= requiredQty ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {scannedItems.length} of {requiredQty} Scanned
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {targetProductName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-orange-600 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                      SKU: {targetSku || "GENERAL"}
                    </span>
                    <span className="text-xs text-slate-500">
                      Required: <strong>{requiredQty} unit{requiredQty > 1 ? "s" : ""}</strong>
                    </span>
                  </div>
                </div>

                {/* Progress Circle or Bar */}
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    {scannedItems.length}
                    <span className="text-slate-400 text-sm">/{requiredQty}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Barcode Scanner Gun Input Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Scan Physical Barcode with Scanner Gun or Type Code
              </label>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessBarcode(barcodeInput);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Aim scanner gun or enter barcode (e.g. TSHIRT-BLK-M-XXXXX)..."
                    className="w-full rounded-xl border-2 border-orange-400 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:border-orange-600 focus:outline-none shadow-xs"
                  />
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    📷
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!barcodeInput.trim()}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-500 disabled:opacity-40 transition shrink-0"
                >
                  Verify Scan
                </button>
              </form>

              {scanNotice && (
                <div
                  className={`text-xs p-2.5 rounded-xl border flex items-center justify-between ${
                    scanNotice.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  <span>{scanNotice.text}</span>
                  <button onClick={() => setScanNotice(null)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* In-Stock Available Barcodes Quick Selector */}
            {inStockItems.length > 0 && scannedItems.length < requiredQty && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Quick select from warehouse stock (if barcode label is unreadable):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                  {inStockItems
                    .filter((item) => !scannedItems.some((s) => s.id === item.id))
                    .slice(0, 6)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleProcessBarcode(item.unique_barcode)}
                        className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 px-2.5 py-1 font-mono text-[11px] text-slate-700 transition"
                      >
                        + {item.unique_barcode}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Scanned Barcodes Badges */}
            {scannedItems.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Verified Barcodes in this Parcel:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {scannedItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-xs font-bold"
                    >
                      <span>✓ {item.unique_barcode}</span>
                      <button
                        type="button"
                        onClick={() => setScannedItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-emerald-700 hover:text-emerald-900 font-bold ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={isSubmitting || scannedItems.length === 0}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition disabled:opacity-40 ${
                  scannedItems.length >= requiredQty
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                    : "bg-orange-600 hover:bg-orange-500 shadow-orange-600/30"
                }`}
              >
                {isSubmitting ? (
                  <span>Booking &amp; Dispatching…</span>
                ) : (
                  <>
                    <span>🚀 Confirm Dispatch &amp; Book {selectedCourier}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT 2: UPLOAD DAILY ORDERS (CSV / EXCEL) MODAL
// ─────────────────────────────────────────────────────────────
function UploadDailyOrdersModal({ isOpen, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedOrders, setParsedOrders] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  function parseCSVContent(content) {
    setIsParsing(true);
    setParseError(null);

    Papa.parse(content, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        setIsParsing(false);
        if (!results.data || results.data.length === 0) {
          setParseError("The file or text contains no order data.");
          return;
        }

        const normalized = results.data.map((row) => {
          const name = row["Customer Name"] || row["Name"] || row["customer_name"] || row["Customer"] || "";
          const phone = row["Customer Phone"] || row["Phone"] || row["Mobile"] || row["customer_phone"] || "";
          const address = row["Delivery Address"] || row["Address"] || row["customer_address"] || "";
          const sku = row["Product SKU"] || row["SKU"] || row["Item"] || row["sku"] || "";
          const qty = Number(row["Quantity"] || row["Qty"] || row["quantity"] || 1);
          const amount = Number(row["Total Amount"] || row["Amount"] || row["Price"] || row["COD"] || 1200);
          const courier = row["Courier"] || row["courier_name"] || "Steadfast Courier";

          return {
            customer_name: String(name).trim() || "Customer",
            customer_phone: String(phone).trim(),
            customer_address: String(address).trim(),
            sku: String(sku).trim(),
            quantity: qty,
            total_amount: amount,
            courier_name: courier,
          };
        });

        setParsedOrders(normalized);
      },
      error: (err) => {
        setIsParsing(false);
        setParseError(`CSV Parse failed: ${err.message}`);
      },
    });
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      parseCSVContent(f);
    }
  }

  async function handleExecuteUpload() {
    if (parsedOrders.length === 0) return;
    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          action: "batch_upload",
          orders: parsedOrders,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload orders.");
      }

      onImported(json.orders || parsedOrders);
    } catch (err) {
      setParseError(err.message || "Failed to import orders.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📄</span>
              <span>Upload Today&apos;s Orders (CSV / Excel)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bulk import orders from spreadsheets. Columns: Customer Name, Phone, Address, Product SKU, Quantity, COD.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            ✕
          </button>
        </div>

        {/* Template Download Button */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
          <span className="text-slate-600 font-medium">Need the format? Download the daily orders template:</span>
          <button
            type="button"
            onClick={downloadDailyOrdersTemplate}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-orange-600 font-bold font-mono transition"
          >
            Download Template (.csv)
          </button>
        </div>

        {/* File Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-orange-50/30"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-2xl mb-1">📁</div>
          <div className="text-xs font-bold text-slate-800">
            {file ? file.name : "Click to select or drag and drop your daily orders CSV"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Supports CSV exports from WooCommerce, Shopify, Google Sheets, or Facebook Lead Forms.
          </div>
        </div>

        {/* Or Paste Raw Text */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase block">
            Or Paste Order Text (Comma Separated)
          </label>
          <textarea
            rows={3}
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              if (e.target.value.trim()) parseCSVContent(e.target.value);
            }}
            placeholder="Name, Phone, Address, SKU, Quantity, COD Amount"
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono text-slate-800 focus:border-orange-600 focus:outline-none"
          />
        </div>

        {parseError && (
          <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {parseError}
          </div>
        )}

        {/* Parsed Preview */}
        {parsedOrders.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Detected {parsedOrders.length} orders ready to import</span>
              <span className="text-emerald-700 font-mono font-bold">✓ Ready</span>
            </div>
            <div className="text-[11px] text-slate-600 font-mono truncate">
              Sample: {parsedOrders[0].customer_name} ({parsedOrders[0].customer_phone}) · {parsedOrders[0].sku} · ৳{parsedOrders[0].total_amount}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteUpload}
            disabled={isUploading || parsedOrders.length === 0}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition disabled:opacity-40"
          >
            {isUploading ? "Importing Orders…" : `Import ${parsedOrders.length} Orders into Queue`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT 3: SYNC FROM WEBSITE MODAL
// ─────────────────────────────────────────────────────────────
function SyncFromWebsiteModal({ isOpen, businessId, onClose, onSynced }) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Auto-fetch saved website
  useEffect(() => {
    if (!isOpen || !businessId) return;
    async function loadSaved() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/tenant/profile", {
          headers: {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.website_url) setWebsiteUrl(json.website_url);
        }
      } catch (e) {
        // ignore
      }
    }
    loadSaved();
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  async function handleSync() {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          action: "fetch_from_website",
          websiteUrl: websiteUrl.trim(),
          consumerKey: consumerKey.trim(),
          consumerSecret: consumerSecret.trim(),
          shopifyToken: shopifyToken.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to sync orders from website.");
      }

      onSynced(json.orders || []);
    } catch (err) {
      setSyncError(err.message || "Failed to synchronize orders.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <h3 className="text-sm font-bold text-slate-900">
              Sync Orders from Store Website
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Connects to your WooCommerce or Shopify storefront to automatically pull today&apos;s new processing orders into this warehouse dispatch queue.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Store Website URL <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourstore.com"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm text-slate-900 font-mono focus:border-orange-600 focus:outline-none"
          />
        </div>

        {/* API Credentials Accordion / Toggle */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowApiKeys((prev) => !prev)}
            className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100 transition"
          >
            <span className="flex items-center gap-1.5">
              <span>🔐</span>
              <span>API Credentials (WooCommerce / Shopify)</span>
            </span>
            <span className="text-slate-400 text-[11px] font-normal">
              {showApiKeys ? "▲ Hide" : "▼ Optional (for private stores)"}
            </span>
          </button>

          {showApiKeys && (
            <div className="p-4 pt-1 space-y-3 border-t border-slate-100 bg-white animate-in fade-in duration-150">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                By default WooCommerce &amp; Shopify require authorization keys to read order lists. Create a Read-only key from: <strong className="text-slate-700">WP Admin → WooCommerce → Settings → Advanced → REST API</strong>.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  WooCommerce Consumer Key (ck_...)
                </label>
                <input
                  type="text"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  WooCommerce Consumer Secret (cs_...)
                </label>
                <input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Or Shopify Admin Access Token (shpat_...)
                </label>
                <input
                  type="password"
                  value={shopifyToken}
                  onChange={(e) => setShopifyToken(e.target.value)}
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {syncError && (
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Sync Note</span>
            </div>
            <div>{syncError}</div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || !websiteUrl.trim()}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition disabled:opacity-40"
          >
            {isSyncing ? "Connecting & Fetching…" : "Fetch Website Orders Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT 4: QUICK ADD SINGLE ORDER MODAL
// ─────────────────────────────────────────────────────────────
function QuickAddOrderModal({ isOpen, products = [], onClose, onAdded }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [totalAmount, setTotalAmount] = useState("");
  const [courier, setCourier] = useState("Steadfast Courier");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Auto-calculate total amount based on selected product price
  useEffect(() => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod && prod.price) {
      setTotalAmount(String(Number(prod.price) * (Number(quantity) || 1)));
    }
  }, [selectedProductId, quantity, products]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Please fill in customer name, phone, and delivery address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          action: "single_order",
          order: {
            customer_name: name.trim(),
            customer_phone: phone.trim(),
            customer_address: address.trim(),
            product_id: selectedProductId,
            quantity: Number(quantity) || 1,
            total_amount: Number(totalAmount) || 1000,
            courier_name: courier,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create order.");
      }

      onAdded(json.order);
    } catch (err) {
      setError(err.message || "Failed to save order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-sm font-bold text-slate-900">
              Quick Add Single Customer Order
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahim Ahmed"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-orange-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Customer Mobile *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-orange-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Delivery Address *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House 12, Road 4, Banani, Dhaka"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-orange-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Product Item
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold focus:border-orange-600 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.base_sku}) - ৳{p.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Qty
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold focus:border-orange-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                COD Amount (৳)
              </label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:border-orange-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Courier Gateway
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold focus:border-orange-600 focus:outline-none"
              >
                <option value="Steadfast Courier">Steadfast Courier</option>
                <option value="Pathao Express">Pathao Express</option>
                <option value="RedX Delivery">RedX Delivery</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition disabled:opacity-40"
            >
              {isSubmitting ? "Saving Order…" : "Queue Order for Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT 6: INBOUND RETURN, EXCHANGE & RESTOCK SCANNER MODAL
// ─────────────────────────────────────────────────────────────
function InboundReturnModal({
  isOpen,
  initialOrder = null,
  allOrders = [],
  products = [],
  onClose,
  onProcessed,
}) {
  const [selectedOrder, setSelectedOrder] = useState(initialOrder);
  const [barcodeOrCode, setBarcodeOrCode] = useState("");
  const [lookupNotice, setLookupNotice] = useState(null);

  // Return Action: 'full_return' | 'partial_return' | 'exchange'
  const [action, setAction] = useState("full_return");
  const [condition, setCondition] = useState("INTACT"); // 'INTACT' | 'DAMAGED'
  const [returnReason, setReturnReason] = useState("Customer Refused COD at Doorstep");
  const [returnNote, setReturnNote] = useState("");
  const [courierFee, setCourierFee] = useState(60);

  // Partial Return fields
  const [partialDeliveredQty, setPartialDeliveredQty] = useState(1);
  const [partialReturnedQty, setPartialReturnedQty] = useState(1);
  const [adjustedCodAmount, setAdjustedCodAmount] = useState(0);

  // Exchange fields
  const [replacementProductId, setReplacementProductId] = useState(products[0]?.id || "");
  const [replacementSku, setReplacementSku] = useState(products[0]?.base_sku || "");
  const [replacementQuantity, setReplacementQuantity] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSelectedOrder(initialOrder);
    if (initialOrder) {
      setAdjustedCodAmount(Math.round((Number(initialOrder.total_amount) || 0) / 2));
      setReturnNote(
        `Customer returned order #${initialOrder.consignment_id || initialOrder.id}. Inspected parcel: intact and verified with tags.`
      );
    }
  }, [initialOrder]);

  useEffect(() => {
    if (isOpen && !selectedOrder) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, selectedOrder]);

  if (!isOpen) return null;

  function handleLookupOrder(code) {
    const raw = String(code || "").trim().toUpperCase();
    if (!raw) return;

    setLookupNotice(null);
    const matched = allOrders.find((o) => {
      const matchConsignment = String(o.consignment_id || "").toUpperCase() === raw;
      const matchId =
        String(o.id || "").toUpperCase() === raw ||
        String(o.id || "").toUpperCase().includes(raw);
      const matchPhone = String(o.customer_phone || "")
        .replace(/[^0-9]/g, "")
        .includes(raw.replace(/[^0-9]/g, ""));
      return matchConsignment || matchId || (raw.length >= 8 && matchPhone);
    });

    if (matched) {
      playSuccessBeep();
      setSelectedOrder(matched);
      setBarcodeOrCode("");
      setAdjustedCodAmount(Math.round((Number(matched.total_amount) || 0) / 2));
      setReturnNote(
        `Customer returned order #${matched.consignment_id || matched.id}. Parcel inspected: intact with tags.`
      );
      setLookupNotice({
        type: "success",
        text: `✓ Found consignment #${matched.consignment_id || matched.id} (${matched.customer_name})`,
      });
    } else {
      setLookupNotice({
        type: "error",
        text: `No order found matching "${raw}". Please verify the consignment label or phone number.`,
      });
    }
  }

  async function handleSubmitReturn(e) {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/orders/return-exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action,
          condition,
          returnReason,
          returnNote,
          courierFee: Number(courierFee) || 0,
          partialDeliveredQty: Number(partialDeliveredQty) || 1,
          partialReturnedQty: Number(partialReturnedQty) || 1,
          adjustedCodAmount: Number(adjustedCodAmount) || 0,
          replacementProductId,
          replacementSku,
          replacementQuantity: Number(replacementQuantity) || 1,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process reverse logistics return.");
      }

      playSuccessBeep();
      onProcessed(
        json.order || {
          ...selectedOrder,
          status:
            action === "exchange"
              ? "EXCHANGED"
              : action === "partial_return"
              ? "PARTIAL_DELIVERED"
              : "RETURNED",
        },
        json.lifecycleNote
      );
    } catch (err) {
      setSubmitError(err.message || "Return processing failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden space-y-0">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Inbound Return &amp; Exchange Receiving
              </h3>
              <p className="text-xs text-slate-500">
                Scan returned parcel from courier, verify physical condition &amp; restock inventory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Scanner Gun / Consignment Lookup Input */}
          {!initialOrder && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Aim Barcode Gun at Returned Parcel Label or Search
              </label>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookupOrder(barcodeOrCode);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={barcodeOrCode}
                    onChange={(e) => setBarcodeOrCode(e.target.value)}
                    placeholder="Aim scanner gun or enter consignment # (e.g. SF-8841029), phone, or order ID…"
                    className="w-full rounded-xl border-2 border-rose-300 bg-white pl-10 pr-4 py-2 text-xs font-mono font-bold text-slate-900 focus:border-rose-600 focus:outline-none shadow-xs"
                  />
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">
                    📷
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!barcodeOrCode.trim()}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-500 disabled:opacity-40 transition shrink-0"
                >
                  Lookup Parcel
                </button>
              </form>

              {lookupNotice && (
                <div
                  className={`text-xs p-2.5 rounded-xl border flex items-center justify-between ${
                    lookupNotice.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  <span>{lookupNotice.text}</span>
                  <button onClick={() => setLookupNotice(null)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Selected Order Summary Card */}
          {selectedOrder ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dispatched Consignment
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 block">
                    {selectedOrder.consignment_id || `ORD-${String(selectedOrder.id).slice(0, 8)}`}
                  </span>
                  <span className="text-xs text-orange-600 font-semibold">
                    via {selectedOrder.courier_name || "Steadfast Courier"}
                  </span>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    COD Value
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-700">
                    ৳{(Number(selectedOrder.total_amount) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Recipient:</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedOrder.customer_name} ({selectedOrder.customer_phone})
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    {selectedOrder.customer_address}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Target Item:</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedOrder.product_name || selectedOrder.products?.name || "Catalog Consignment Item"}
                  </span>
                  <span className="font-mono text-orange-600 font-semibold text-[11px] block">
                    SKU: {selectedOrder.product_sku || selectedOrder.products?.base_sku || "GENERAL"} (Qty: {selectedOrder.quantity || 1})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              Aim your barcode gun at the parcel label or type consignment ID above to proceed.
            </div>
          )}

          {/* Return Form Controls */}
          {selectedOrder && (
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              {/* Action Selection Tabs */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Reverse Logistics Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAction("full_return")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      action === "full_return"
                        ? "border-rose-600 bg-rose-50 text-rose-800 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>🔴 Full Return</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAction("partial_return")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      action === "partial_return"
                        ? "border-purple-600 bg-purple-50 text-purple-800 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>🟣 Partial Return</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAction("exchange")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      action === "exchange"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>🔵 Exchange</span>
                  </button>
                </div>
              </div>

              {/* Physical Condition Inspection Check */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Warehouse Physical Condition Check *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition("INTACT")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      condition === "INTACT"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>✓ Intact &amp; Resellable</span>
                    <span className="text-[10px] text-emerald-600 font-normal">(Restock to Shelf)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondition("DAMAGED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      condition === "DAMAGED"
                        ? "border-rose-600 bg-rose-50 text-rose-800 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>⚠️ Damaged / Defective</span>
                    <span className="text-[10px] text-rose-600 font-normal">(Write-off)</span>
                  </button>
                </div>
              </div>

              {/* Reason & Courier Charge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Return / Exchange Reason *
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-rose-600 focus:outline-none"
                  >
                    <option value="Customer Refused COD at Doorstep">Customer Refused COD at Doorstep</option>
                    <option value="Wrong Size / Fit Issue">Wrong Size / Fit Issue</option>
                    <option value="Customer Unreachable / Phone Switched Off">Customer Unreachable / Phone Switched Off</option>
                    <option value="Defect / Damaged in Courier Transit">Defect / Damaged in Courier Transit</option>
                    <option value="Customer Cancelled / Ordered Elsewhere">Customer Cancelled / Ordered Elsewhere</option>
                    <option value="Color or Specification Mismatch">Color or Specification Mismatch</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Courier Return Delivery Fee (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={courierFee}
                    onChange={(e) => setCourierFee(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-rose-600 focus:outline-none"
                    placeholder="60"
                  />
                </div>
              </div>

              {/* Partial Delivery Return Specific Inputs */}
              {action === "partial_return" && (
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                  <h4 className="text-xs font-bold text-purple-900">
                    Partial Delivery Settlement Configuration
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Delivered (Kept)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={partialDeliveredQty}
                        onChange={(e) => setPartialDeliveredQty(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Returned Units
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={partialReturnedQty}
                        onChange={(e) => setPartialReturnedQty(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Adjusted COD (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adjustedCodAmount}
                        onChange={(e) => setAdjustedCodAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Exchange Specific Inputs */}
              {action === "exchange" && (
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900">
                    Replacement Product Dispatch Specification
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Replacement Product
                      </label>
                      <select
                        value={replacementProductId}
                        onChange={(e) => {
                          setReplacementProductId(e.target.value);
                          const p = products.find((x) => x.id === e.target.value);
                          if (p) setReplacementSku(p.base_sku);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.base_sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Replacement SKU / Size Code
                      </label>
                      <input
                        type="text"
                        value={replacementSku}
                        onChange={(e) => setReplacementSku(e.target.value)}
                        placeholder="TSHIRT-BLK-L"
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Lifecycle Audit Note */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Product Lifecycle History Note *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Will be permanently logged in stock audit trail
                  </span>
                </div>
                <textarea
                  rows={2}
                  required
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Describe why and how item came back, inspection result, and where it was restocked…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-rose-600 focus:outline-none"
                />
              </div>

              {submitError && (
                <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition disabled:opacity-40 ${
                    action === "exchange"
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                      : action === "partial_return"
                      ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                  }`}
                >
                  {isSubmitting
                    ? "Updating Stock & Ledger…"
                    : action === "exchange"
                    ? "Confirm Exchange & Restock"
                    : action === "partial_return"
                    ? "Confirm Partial Return"
                    : "Confirm Return & Restock Inventory"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

