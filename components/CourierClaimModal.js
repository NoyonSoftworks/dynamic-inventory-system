"use client";

import { useState, useMemo, useEffect } from "react";

export default function CourierClaimModal({
  isOpen,
  onClose,
  record,
  businessName = "My Store",
  onClaimSubmitted,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Set default dispute description
  useEffect(() => {
    if (!record) return;
    if (record.status === "SHORT_PAID") {
      setDisputeReason(
        `Discrepancy: Consignment was successfully delivered to customer, but settlement statement deducted ৳${Math.abs(
          record.variance || 0
        ).toLocaleString()} without valid justification or charged improper return fee.`
      );
    } else if (record.status === "LOST_STUCK" || record.days_in_transit >= 7) {
      setDisputeReason(
        `Parcel Lost/Stuck: Parcel has been in transit for ${
          record.days_in_transit || 7
        } days without scan update. Immediate courier compensation or delivery trace required.`
      );
    } else {
      setDisputeReason("Payment settlement inquiry and remittance verification requested.");
    }
  }, [record]);

  const claimTicketText = useMemo(() => {
    if (!record) return "";
    const isLost = record.status === "LOST_STUCK" || (record.days_in_transit || 0) >= 7;
    const isShortPaid = record.status === "SHORT_PAID";

    return `*OFFICIAL COURIER DISPUTE & SETTLEMENT CLAIM*
--------------------------------------------------
Merchant / Store: ${businessName}
Courier Network: ${record.courier || "Steadfast Courier"}
Consignment ID: ${record.consignment_id}
Tracking Code: ${record.tracking_code || record.consignment_id}
Customer: ${record.customer_name} (${record.customer_phone})
Expected COD Value: ৳${(record.order_amount || 0).toLocaleString()}
${isShortPaid ? `Courier Remitted Payout: ৳${(record.payout_amount || 0).toLocaleString()}
Discrepancy / Shortfall Variance: ৳${Math.abs(record.variance || 0).toLocaleString()} (OVERCHARGED)` : ""}
${isLost ? `Days in Transit without scan: ${record.days_in_transit || 7} Days (CRITICAL DELAY)` : ""}
Dispute Category: ${isLost ? "LOST / SEVERELY STUCK PARCEL CLAIM" : "COD SHORT-PAYMENT RECONCILIATION"}

Details / Demand:
${disputeReason}

Please audit your settlement batch and disburse the missing amount or provide formal courier compensation.
Reference Order ID: ${record.order_id || record.consignment_id}
Logged via SmartInventory Financial Reconciliation Engine.`;
  }, [record, businessName, disputeReason]);

  if (!isOpen || !record) return null;

  async function handleCopyTicket() {
    try {
      await navigator.clipboard.writeText(claimTicketText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  }

  async function handleFileClaim() {
    try {
      setSubmitting(true);
      const res = await fetch("/api/reconciliation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          claim_status: "CLAIM_FILED",
          claim_notes: disputeReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onClaimSubmitted?.(data.record || { ...record, claim_status: "CLAIM_FILED" });
        onClose?.();
      }
    } catch (err) {
      console.error("Failed to file claim:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const helpline =
    record.courier === "Pathao"
      ? { phone: "09610-003030", portal: "merchant.pathao.com" }
      : record.courier === "RedX"
      ? { phone: "09612-223344", portal: "redx.com.bd" }
      : { phone: "09678-045045", portal: "steadfast.com.bd/merchant" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Courier Dispute &amp; Settlement Claim Ticket
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Consignment: <span className="font-bold text-slate-700">{record.consignment_id}</span> • {record.courier}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected COD</span>
              <span className="text-sm font-black text-slate-900">৳{Number(record.order_amount).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Courier Payout</span>
              <span className="text-sm font-black text-slate-700">৳{Number(record.payout_amount).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Discrepancy</span>
              <span className={`text-sm font-black ${record.variance < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {record.variance < 0 ? `-৳${Math.abs(record.variance).toLocaleString()}` : "৳0"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">In Transit</span>
              <span className={`text-sm font-black ${record.days_in_transit >= 7 ? "text-amber-600" : "text-slate-800"}`}>
                {record.days_in_transit || 0} Days
              </span>
            </div>
          </div>

          {/* Dispute Reason Edit */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Dispute Rationale &amp; Merchant Demand
            </label>
            <textarea
              rows={2}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Formatted Dispute Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">
                Official Formatted Ticket (Copy-Ready for Courier Portal / WhatsApp)
              </span>
              <button
                type="button"
                onClick={handleCopyTicket}
                className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Dispute Text</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-all border border-slate-800">
              {claimTicketText}
            </pre>
          </div>

          {/* Courier Support Helplines */}
          <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-orange-900 block">
                Official {record.courier} Merchant Support Desk
              </span>
              <span className="text-[10px] text-orange-700 font-mono">
                Helpline: {helpline.phone} • Portal: {helpline.portal}
              </span>
            </div>
            <a
              href={`https://${helpline.portal}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 underline"
            >
              Open Portal ↗
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTicket}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold btn-tactile transition"
            >
              {copied ? "Copied!" : "1-Click Copy Ticket"}
            </button>

            <button
              type="button"
              onClick={handleFileClaim}
              disabled={submitting || record.claim_status === "CLAIM_FILED"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs shadow-orange-600/20 btn-tactile transition disabled:opacity-50"
            >
              {submitting ? (
                <span>Recording Claim…</span>
              ) : record.claim_status === "CLAIM_FILED" ? (
                <span>Claim Already Filed</span>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Mark as Claim Filed</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
