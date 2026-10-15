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
        <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200/80 p-8 text-center space-y-5 shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-2xl shadow-xs">
            ⚠️
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Critical System Exception</h2>
            <p className="text-xs text-slate-500">
              A root-level layout error occurred. You can attempt to reinitialize the session.
            </p>
          </div>
          <div className="flex gap-2.5 justify-center pt-2">
            <button
              onClick={() => reset()}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition"
            >
              Reload Application
            </button>
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 btn-tactile transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
