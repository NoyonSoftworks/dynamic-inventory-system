"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Log the error to console or error reporting service (Sentry, LogRocket, etc.)
    console.error("App Router Global Exception:", error);
  }, [error]);

  function copyErrorDetails() {
    const errorString = `Error: ${error?.message || "Unknown error"}\nDigest: ${
      error?.digest || "N/A"
    }\nStack: ${error?.stack || "N/A"}`;
    navigator.clipboard?.writeText(errorString);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-orange-500 selection:text-white">
      {/* Background subtle geometric dot grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(#ea580c 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative max-w-xl w-full rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-10 shadow-xl shadow-slate-200/50 text-center space-y-6 overflow-hidden">
        {/* Top glowing ambient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        {/* Icon & Status Badge */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-xs">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-medium text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Application error caught
          </div>
        </div>

        {/* Headline & Friendly Message */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Something unexpected occurred
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The application encountered an unhandled runtime error. Your inventory and order data remain completely safe in the database.
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-2xs transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Try again</span>
          </button>

          <Link
            href="/dashboard/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-700 btn-tactile transition"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Return to dashboard</span>
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-600 transition"
          >
            <span>Hard refresh</span>
          </button>
        </div>

        {/* Collapsible Error Diagnostics */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-slate-700 transition"
          >
            <span>{showDetails ? "Hide technical diagnostic log" : "View technical diagnostic log"}</span>
          </button>

          {showDetails && (
            <div className="mt-4 text-left rounded-xl bg-slate-900 text-slate-100 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Diagnostic Information
                </span>
                <button
                  onClick={copyErrorDetails}
                  className="text-[10px] font-mono rounded px-2 py-0.5 border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  {copied ? "Copied" : "Copy log"}
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="text-rose-400 font-semibold break-all">
                  {error?.name || "Error"}: {error?.message || "An unexpected error occurred"}
                </div>
                {error?.digest && (
                  <div className="text-slate-400 text-[11px]">
                    Next.js Digest: <span className="text-orange-400">{error.digest}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] font-mono text-slate-400">
          SaaS Fault-Tolerant Application Layer · Next.js 16 App Router
        </p>
      </div>
    </div>
  );
}
