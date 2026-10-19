import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory — Inventory & Courier Fulfillment System",
  description: "Warehouse inventory management and automated courier fulfillment system with smartphone barcode scanning, 1-click Steadfast courier dispatch, and automated delivery tracking.",
  authors: [{ name: "Noyon Hossain", url: "https://smartinventory.io" }],
  creator: "Noyon Hossain",
  publisher: "SmartInventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-[#0f172a] selection:bg-orange-500 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
