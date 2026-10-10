"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/operations", label: "Operations" },
  { href: "/reports", label: "Reports" },
  { href: "/add-product", label: "+ Add Product" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
          📦 <span className="hidden sm:inline">Dynamic</span> Inventory
        </Link>

        <div className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : pathname.startsWith(l.href);

            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
