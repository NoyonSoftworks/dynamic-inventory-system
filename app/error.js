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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-rose-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-3xl opacity-40 animate-pulse" />
      </div>

      <div className="relative max-w-xl w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl shadow-rose-950/40 text-center space-y-6 overflow-hidden">
        {/* Top glowing ambient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        {/* Icon & Status Badge */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-inner shadow-rose-500/20">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
            Application Exception Caught
          </div>
        </div>

        {/* Headline & Friendly Message */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Something unexpected occurred
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The application encountered an unhandled runtime error. Your inventory and order data remain completely safe in the database.
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <span>🔄</span>
            <span>Try Again</span>
          </button>

          <Link
            href="/dashboard/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-800 hover:text-white px-5 py-3 text-xs sm:text-sm font-semibold text-slate-200 transition active:scale-95"
          >
            <span>📦</span>
            <span>Return to Dashboard</span>
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 transition active:scale-95"
          >
            <span>Hard Refresh</span>
          </button>
        </div>

        {/* Collapsible Error Diagnostics */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition"
          >
            <span>{showDetails ? "Hide technical diagnostic log ▲" : "View technical diagnostic log ▼"}</span>
          </button>

          {showDetails && (
            <div className="mt-4 text-left rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Exception Telemetry
                </span>
                <button
                  onClick={copyErrorDetails}
                  className="text-[10px] font-mono rounded px-2 py-0.5 border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  {copied ? "Copied! ✓" : "Copy Log"}
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="text-rose-400 font-semibold break-all">
                  {error?.name || "Error"}: {error?.message || "An unexpected error occurred"}
                </div>
                {error?.digest && (
                  <div className="text-slate-500 text-[11px]">
                    Next.js Digest: <span className="text-indigo-400">{error.digest}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] font-mono text-slate-600">
          SaaS Fault-Tolerant Application Layer · Next.js 16 App Router
        </p>
      </div>
    </div>
  );
}
