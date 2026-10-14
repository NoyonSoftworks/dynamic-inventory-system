import { Suspense } from "react";
import Navbar from "./navbar";

export const metadata = {
  title: "Dashboard - SmartInventory SaaS",
  description: "Enterprise multi-tenant inventory & logistics cockpit",
};

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Suspense fallback={<div className="h-14 sm:h-16 bg-white border-b border-slate-200" />}>
        <Navbar />
      </Suspense>
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
