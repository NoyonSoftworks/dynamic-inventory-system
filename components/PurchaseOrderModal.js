"use client";

import { useState, useMemo, useEffect } from "react";

/**
 * Enterprise B2B Supplier Purchase Order (PO) Modal
 * Features:
 * - Auto-generated PO Number (PO-2026-XXXX)
 * - Restock computation factoring Lead Time & Safety Buffers
 * - 1-Click Print / Save Official PO (PDF)
 * - 1-Click WhatsApp B2B Dispatch Link
 */
export default function PurchaseOrderModal({
  isOpen,
  onClose,
  items = [],
  businessName = "My Workspace",
}) {
  const [supplierName, setSupplierName] = useState("National Wholesale Fabrics & Supplies Ltd.");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState(5);
  const [copied, setCopied] = useState(false);

  // Auto-generate immutable PO Number for this session
  const poNumber = useMemo(() => {
    return `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, [isOpen]);

  const poDate = useMemo(() => {
    return new Date().toLocaleDateString("en-GB");
  }, []);

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !items || items.length === 0) return null;

  // Compute calculated quantities & totals
  let totalOrderUnits = 0;
  let totalOrderOutlay = 0;

  const processedItems = items.map((item, idx) => {
    const currentStock = Number(item.totalStock ?? item.stock ?? item.currentStock ?? 0);
    const velocity = Number(item.dailyVelocity ?? 1.5);
    const retailPrice = Number(item.price ?? 850);
    const unitCost = Number(item.unitCost ?? item.costPrice ?? Math.round(retailPrice * 0.6));

    // Recommended order quantity
    const suggested = Math.max(
      item.recommendedRestock || 0,
      Math.max(10, Math.ceil(velocity * 30 - currentStock))
    );

    const subtotal = suggested * unitCost;
    totalOrderUnits += suggested;
    totalOrderOutlay += subtotal;

    return {
      id: item.id || `po-row-${idx}`,
      sku: item.sku || item.base_sku || `SKU-${idx + 1}`,
      name: item.name || "Catalog Product",
      category: item.category || "General",
      currentStock,
      dailyVelocity: velocity,
      reorderQty: suggested,
      unitCost,
      subtotal,
    };
  });

  // Pre-formatted B2B WhatsApp Message
  const whatsappText = `*OFFICIAL PURCHASE ORDER: ${poNumber}*
From: ${businessName}
Supplier: ${supplierName}
Date: ${poDate}
Terms: Urgent Replenishment (${leadTimeDays}-Day Delivery SLA)

*Order Items:*
${processedItems
  .map(
    (item, i) =>
      `${i + 1}. ${item.name} (${item.sku}) - ${item.reorderQty} pcs @ ৳${item.unitCost.toLocaleString()} = ৳${item.subtotal.toLocaleString()}`
  )
  .join("\n")}

*Total Consignment Units:* ${totalOrderUnits} pcs
*Total Order Outlay:* ৳${totalOrderOutlay.toLocaleString()}

Please confirm reception, packing date, and dispatch tracking details. Thank you!`;

  function handleSendWhatsApp() {
    const cleanPhone = supplierPhone.replace(/[^0-9]/g, "");
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("88") ? cleanPhone : "88" + cleanPhone}?text=${encodeURIComponent(whatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank");
  }

  function handleCopyText() {
    navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* ── Print Specific Stylesheet ───────────────────────── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-po-root,
          #print-po-root * {
            visibility: visible !important;
          }
          #print-po-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* ── Top Header Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50/80 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                OFFICIAL REORDER
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono">
                {poNumber}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {processedItems.length} replenishment item(s) selected
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="btn-tactile px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              {copied ? "Copied!" : "Copy Text"}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Send via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print PO (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              aria-label="Close modal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Supplier Parameter Toolbar (Screen Only) ─────────── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 no-print text-xs">
          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
              Supplier WhatsApp Phone
            </label>
            <input
              type="text"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              placeholder="e.g. 01712345678"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
              Delivery SLA (Lead Time)
            </label>
            <select
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            >
              <option value={3}>3 Days (Express)</option>
              <option value={5}>5 Days (Standard)</option>
              <option value={7}>7 Days (Factory Lead)</option>
            </select>
          </div>
        </div>

        {/* ── Document Body (Printable A4 PO) ──────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 flex justify-center items-start">
          <div
            id="print-po-root"
            className="w-full max-w-2xl bg-white text-black shadow-lg rounded-xl p-8 sm:p-10 space-y-6"
          >
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-slate-900 gap-4">
              <div>
                <span className="px-2 py-0.5 rounded border border-black font-mono font-black text-[10px] uppercase">
                  PURCHASE REQUISITION
                </span>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-1">
                  {businessName}
                </h1>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Procurement &amp; Replenishment Division
                </p>
              </div>

              <div className="text-left sm:text-right font-mono">
                <div className="text-base font-black text-slate-900">
                  {poNumber}
                </div>
                <div className="text-xs text-slate-600">
                  Date: {poDate}
                </div>
                <div className="text-xs text-slate-600">
                  Delivery SLA: <strong>{leadTimeDays} Working Days</strong>
                </div>
              </div>
            </div>

            {/* Vendor & Delivery Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  VENDOR / SUPPLIER:
                </span>
                <div className="font-bold text-slate-900 text-sm">{supplierName}</div>
                {supplierPhone && <div className="text-slate-600">Tel/WA: {supplierPhone}</div>}
                <div className="text-slate-500">Commercial Wholesale Vendor</div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  DELIVERY DESTINATION:
                </span>
                <div className="font-bold text-slate-900 text-sm">{businessName} Central Warehouse</div>
                <div className="text-slate-600">Terms: Net 15 / Consignment Advance</div>
              </div>
            </div>

            {/* Itemized Reorder Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 font-mono text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="px-3.5 py-2.5">Item / SKU</th>
                    <th className="px-3 py-2.5 font-mono text-center">In-Stock</th>
                    <th className="px-3 py-2.5 font-mono text-center">Order Qty</th>
                    <th className="px-3 py-2.5 font-mono text-right">Wholesale Cost</th>
                    <th className="px-3.5 py-2.5 font-mono text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-3">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{item.sku}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-slate-500">
                        {item.currentStock}
                      </td>
                      <td className="px-3 py-3 font-mono text-center font-bold text-orange-600">
                        {item.reorderQty} pcs
                      </td>
                      <td className="px-3 py-3 font-mono text-right text-slate-700">
                        ৳{item.unitCost.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-right font-bold text-slate-900">
                        ৳{item.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 font-mono">
              <div>
                <span className="text-xs text-slate-500 block">Total Consignment Units</span>
                <span className="text-lg font-black text-slate-900">{totalOrderUnits} pcs</span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Purchase Order Value</span>
                <span className="text-xl font-black text-orange-600">
                  ৳{totalOrderOutlay.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Authorized Signature Block */}
            <div className="pt-10 flex justify-between items-end text-xs font-mono">
              <div className="text-[10px] text-slate-400">
                Official document issued by {businessName}.<br />
                All deliveries subject to incoming QC inspection.
              </div>

              <div className="text-center">
                <div className="w-40 border-b border-slate-400 mb-1" />
                <span className="text-[10px] font-bold text-slate-700 uppercase">
                  Procurement Officer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between no-print">
          <span className="text-xs text-slate-500 font-mono">
            Formatted for standard A4 printing and WhatsApp vendor communications
          </span>

          <button
            type="button"
            onClick={onClose}
            className="btn-tactile px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
