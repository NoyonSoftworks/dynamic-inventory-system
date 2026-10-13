"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Root layout critical exception:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-white">Critical System Exception</h2>
          <p className="text-xs text-slate-400">
            A root-level layout error occurred. You can attempt to reinitialize the session.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => reset()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
            >
              Reload Application
            </button>
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
