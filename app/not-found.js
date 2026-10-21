import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-orange-500 selection:text-white">
      {/* Background subtle geometric dot grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(#ea580c 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative max-w-lg w-full rounded-3xl bg-white border border-slate-200/80 p-8 sm:p-10 shadow-xl shadow-slate-200/50 text-center space-y-6 overflow-hidden">
        {/* Top glowing ambient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

        {/* 404 Icon & Badge */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 shadow-xs">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-700">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            404 · Page not found
          </div>
        </div>

        {/* Headline & Friendly Message */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Page not found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The requested page or document could not be found. It may have been moved, deleted, or the URL might be mistyped.
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
          <Link
            href="/dashboard/products"
            className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 hover:border-orange-500/50 hover:bg-orange-50/20 card-lift transition group"
          >
            <span className="p-2 rounded-lg bg-orange-100/70 text-orange-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </span>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-orange-600 transition">
                Products Catalog
              </div>
              <div className="text-[10px] text-slate-500">Live inventory &amp; stock</div>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 hover:border-orange-500/50 hover:bg-orange-50/20 card-lift transition group"
          >
            <span className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-orange-600 transition">
                Home Overview
              </div>
              <div className="text-[10px] text-slate-500">Overview &amp; metrics</div>
            </div>
          </Link>

          <Link
            href="/operations"
            className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 hover:border-orange-500/50 hover:bg-orange-50/20 card-lift transition group"
          >
            <span className="p-2 rounded-lg bg-teal-100/70 text-teal-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </span>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-orange-600 transition">
                Warehouse Operations
              </div>
              <div className="text-[10px] text-slate-500">Stock IN &amp; OUT scans</div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 hover:border-orange-500/50 hover:bg-orange-50/20 card-lift transition group"
          >
            <span className="p-2 rounded-lg bg-purple-100/70 text-purple-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-orange-600 transition">
                Super Admin Console
              </div>
              <div className="text-[10px] text-slate-500">Owner control plane</div>
            </div>
          </Link>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/20 btn-tactile transition"
          >
            <span>← Return to Products Directory</span>
          </Link>
        </div>

        <p className="text-[10px] font-mono text-slate-400">
          SmartInventory Multi-Tenant SaaS · HTTP 404 Route Handler
        </p>
      </div>
    </main>
  );
}
