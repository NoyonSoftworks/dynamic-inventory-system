"use client";

import { useState, useEffect } from "react";
import Barcode from "react-barcode";

/**
 * Enterprise 4x6 Thermal Courier Label & Commercial Invoice Modal
 * Supports:
 * - 4x6 Thermal Courier Label (Zebra/Xprinter 100mm x 150mm standard)
 * - A4 Commercial Tax/POS Invoice
 */
export default function ThermalAndInvoiceModal({
  isOpen,
  onClose,
  order,
  businessName = "My Store",
  businessPhone = "01700-000000",
}) {
  const [activeMode, setActiveMode] = useState("thermal"); // 'thermal' | 'invoice'

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // Format order parameters with fallbacks
  const customerName = order.customer_name || "Valued Merchant Customer";
  const customerPhone = order.customer_phone || "017XXXXXXXX";
  const customerAddress =
    order.customer_address || "Standard Delivery Destination, Bangladesh";
  const consignmentId =
    order.consignment_id || `SF-${String(order.id || "88410").replace(/[^0-9]/g, "").slice(0, 7) || "9482103"}`;
  const courierName = order.courier_name || order.courier || "Steadfast Courier";
  const codAmount = Number(order.total_amount) || 1650;
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(order.id || "1001").replace(/[^0-9]/g, "").slice(0, 5) || "5521"}`;

  // Item details fallback
  const items = order.items || [
    {
      sku: order.product_sku || "SKU-MAIN-01",
      name: order.product_name || "Catalog Consignment Item",
      quantity: order.quantity || 1,
      price: codAmount > 0 ? codAmount : 1650,
    },
  ];

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
          #print-document-root,
          #print-document-root * {
            visibility: visible !important;
          }
          #print-document-root {
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

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* ── Modal Header & Mode Switcher ─────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Print Documents: {order.customer_name || "Order #" + (order.id || "").slice(0, 6)}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Consignment: {consignmentId} · {courierName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex p-0.5 rounded-xl bg-slate-200/80 border border-slate-300/60">
              <button
                type="button"
                onClick={() => setActiveMode("thermal")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeMode === "thermal"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                4×6 Thermal Label
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("invoice")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeMode === "invoice"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A4 Tax Invoice
              </button>
            </div>

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Now</span>
            </button>

            {/* Close Button */}
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

        {/* ── Document Preview Body ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center items-start">
          <div
            id="print-document-root"
            className="w-full bg-white text-black shadow-lg rounded-xl overflow-hidden"
            style={{
              maxWidth: activeMode === "thermal" ? "400px" : "100%",
            }}
          >
            {/* =================================================== */}
            {/* MODE 1: 4x6 THERMAL COURIER LABEL                   */}
            {/* =================================================== */}
            {activeMode === "thermal" && (
              <div
                className="p-5 font-sans text-black border border-black/40 space-y-3"
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                {/* 1. Header: Merchant Brand & Courier Network */}
                <div className="flex items-start justify-between border-b-2 border-black pb-2">
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight leading-none text-black">
                      {businessName}
                    </h2>
                    <p className="text-[10px] font-bold text-black/80 mt-0.5">
                      Merchant Support: {businessPhone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 border-2 border-black font-black text-xs uppercase font-mono">
                      {courierName}
                    </span>
                    <p className="text-[9px] font-mono font-bold mt-0.5">STANDARD COD</p>
                  </div>
                </div>

                {/* 2. Barcode Centerpiece */}
                <div className="flex flex-col items-center justify-center py-1 border-b border-black">
                  <Barcode
                    value={consignmentId}
                    width={1.6}
                    height={46}
                    fontSize={12}
                    font="monospace"
                    margin={2}
                    displayValue={true}
                    lineColor="#000000"
                    background="transparent"
                  />
                  <div className="flex justify-between w-full text-[10px] font-mono font-bold pt-1">
                    <span>DATE: {orderDate}</span>
                    <span>HUB: DHAKA METRO</span>
                  </div>
                </div>

                {/* 3. Recipient Delivery Details */}
                <div className="border-b-2 border-black pb-3 space-y-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-black/70 block">
                    SHIP TO (CONSIGNEE):
                  </span>
                  <div className="text-sm font-black text-black leading-tight">
                    {customerName}
                  </div>
                  <div className="text-xs font-mono font-black text-black">
                    TEL: {customerPhone}
                  </div>
                  <p className="text-[11px] font-medium leading-snug pt-0.5 text-black">
                    {customerAddress}
                  </p>
                </div>

                {/* 4. Giant COD Box (Critical for Delivery Riders) */}
                <div className="p-3 border-2 border-black bg-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-black block leading-none">
                      COLLECT FROM BUYER (COD):
                    </span>
                    <span className="text-2xl font-black font-mono leading-none mt-1 block">
                      ৳{codAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold block">TERMS</span>
                    <span className="text-xs font-black uppercase">CASH ONLY</span>
                  </div>
                </div>

                {/* 5. Package SKU Summary */}
                <div className="text-[10px] font-mono border-t border-black pt-2 flex justify-between items-center text-black/80">
                  <span className="truncate max-w-[240px]">
                    ITEMS: {items.map((i) => `${i.name} (x${i.quantity || 1})`).join(", ")}
                  </span>
                  <span className="font-bold">QTY: {items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)}</span>
                </div>

                {/* 6. Footer Courier Instructions */}
                <div className="text-[8px] font-mono text-center border-t border-dashed border-black pt-1.5 uppercase font-bold text-black/70">
                  Fragile Goods · Do Not Open Parcel Before Payment · SmartInventory Verified
                </div>
              </div>
            )}

            {/* =================================================== */}
            {/* MODE 2: A4 COMMERCIAL TAX/POS INVOICE               */}
            {/* =================================================== */}
            {activeMode === "invoice" && (
              <div className="p-8 sm:p-10 font-sans text-black space-y-6">
                {/* Invoice Top Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                      {businessName}
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5 font-mono">
                      Official Tax Invoice &amp; Delivery Challan
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      Helpline: {businessPhone}
                    </p>
                  </div>

                  <div className="text-left sm:text-right font-mono">
                    <div className="text-base font-black text-slate-900">
                      {invoiceNumber}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Date: {orderDate}
                    </div>
                    <div className="text-xs text-slate-500">
                      Status: <strong className="text-slate-900">COD PENDING</strong>
                    </div>
                  </div>
                </div>

                {/* Bill To & Dispatch Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <span className="font-mono font-bold text-[10px] uppercase text-slate-400 block">
                      BILLED &amp; DELIVERED TO:
                    </span>
                    <div className="font-bold text-sm text-slate-900">{customerName}</div>
                    <div className="font-mono text-slate-700">Phone: {customerPhone}</div>
                    <div className="text-slate-600 leading-relaxed pt-0.5">
                      Address: {customerAddress}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 font-mono">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block">
                      LOGISTICS DISPATCH ROUTING:
                    </span>
                    <div className="text-slate-900 font-bold">Courier: {courierName}</div>
                    <div className="text-slate-700">Consignment: {consignmentId}</div>
                    <div className="text-slate-700">Payment: Cash on Delivery</div>
                  </div>
                </div>

                {/* Itemized Invoice Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-100 font-mono text-[10px] uppercase font-bold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Item Description</th>
                        <th className="px-4 py-2.5 font-mono text-center">Qty</th>
                        <th className="px-4 py-2.5 font-mono text-right">Unit Price</th>
                        <th className="px-4 py-2.5 font-mono text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">{item.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              SKU: {item.sku}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-center font-bold text-slate-800">
                            {item.quantity || 1}
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-slate-700">
                            ৳{Number(item.price || codAmount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-right font-bold text-slate-900">
                            ৳{(Number(item.price || codAmount) * Number(item.quantity || 1)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-64 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>৳{codAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Estimated Shipping:</span>
                      <span className="text-emerald-700 font-bold">FREE / INCLUDED</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax / VAT (0%):</span>
                      <span>৳0</span>
                    </div>
                    <div className="flex justify-between text-sm font-black border-t-2 border-slate-900 pt-2 text-slate-900">
                      <span>TOTAL PAYABLE (COD):</span>
                      <span className="text-base">৳{codAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Signature & Seal Block */}
                <div className="pt-12 flex justify-between items-end text-xs font-mono">
                  <div className="text-[10px] text-slate-400">
                    Generated by SmartInventory Cloud Operating System.<br />
                    Computer generated document — No physical stamp required.
                  </div>

                  <div className="text-center">
                    <div className="w-40 border-b border-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase">
                      Authorized Signatory
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Modal Footer ─────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between no-print">
          <span className="text-xs text-slate-500 font-mono">
            {activeMode === "thermal"
              ? "Recommended: Set printer paper size to 4x6 in (100x150mm)"
              : "Standard A4 layout ready for tax audit & billing"}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-tactile px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-tactile px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition"
            >
              Print Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
