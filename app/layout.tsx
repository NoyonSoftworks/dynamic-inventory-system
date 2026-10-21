import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-[#0f172a] selection:bg-orange-500 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
