import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative max-w-lg w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-2xl text-center space-y-6 overflow-hidden">
        {/* Top glowing ambient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

        {/* 404 Icon & Badge */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-4xl shadow-inner shadow-indigo-500/20">
            🔍
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            404 · Page Not Located
          </div>
        </div>

        {/* Headline & Friendly Message */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Resource does not exist
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The requested inventory route or document could not be found. It may have been moved, deleted, or the URL might be mistyped.
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
          <Link
            href="/dashboard/products"
            className="flex items-center gap-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 hover:border-indigo-500/50 hover:bg-slate-800/60 transition group"
          >
            <span className="text-xl">📦</span>
            <div>
              <div className="font-bold text-white group-hover:text-indigo-400 transition">
                Products Catalog
              </div>
              <div className="text-[10px] text-slate-500">Live inventory & stock</div>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 hover:border-indigo-500/50 hover:bg-slate-800/60 transition group"
          >
            <span className="text-xl">📊</span>
            <div>
              <div className="font-bold text-white group-hover:text-indigo-400 transition">
                Main Dashboard
              </div>
              <div className="text-[10px] text-slate-500">Overview & metrics</div>
            </div>
          </Link>

          <Link
            href="/operations"
            className="flex items-center gap-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 hover:border-indigo-500/50 hover:bg-slate-800/60 transition group"
          >
            <span className="text-xl">🚚</span>
            <div>
              <div className="font-bold text-white group-hover:text-indigo-400 transition">
                Warehouse Operations
              </div>
              <div className="text-[10px] text-slate-500">Stock IN & OUT scans</div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 hover:border-indigo-500/50 hover:bg-slate-800/60 transition group"
          >
            <span className="text-xl">🛡️</span>
            <div>
              <div className="font-bold text-white group-hover:text-indigo-400 transition">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <span>← Return to Products Directory</span>
          </Link>
        </div>

        <p className="text-[10px] font-mono text-slate-600">
          Dynamic Inventory Multi-Tenant SaaS · HTTP 404 Route Handler
        </p>
      </div>
    </main>
  );
}
