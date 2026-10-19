"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Root layout critical exception:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans selection:bg-orange-500 selection:text-white">
        <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200/80 p-8 text-center space-y-5 shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 shadow-xs">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Unexpected application error</h2>
            <p className="text-xs text-slate-500">
              An error occurred while loading this page. Please refresh or return to login.
            </p>
          </div>
          <div className="flex gap-2.5 justify-center pt-2">
            <button
              onClick={() => reset()}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition"
            >
              Reload application
            </button>
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 btn-tactile transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
