import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import fs from "fs";
import path from "path";
import "./globals.css";

function getTrackingSettings() {
  try {
    const settingsPath = path.join(process.cwd(), "data", "saas_settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      return JSON.parse(content) || {};
    }
  } catch {}
  return {};
}

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

export const viewport: Viewport = {
  themeColor: "#EA580C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "SmartInventory — Inventory & Courier Fulfillment System",
  description: "Warehouse inventory management and automated courier fulfillment system with smartphone barcode scanning, 1-click Steadfast courier dispatch, and automated delivery tracking.",
  authors: [{ name: "Noyon Hossain", url: "https://smartinventory.io" }],
  creator: "Noyon Hossain",
  publisher: "SmartInventory",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartInventory",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tracking = getTrackingSettings();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SmartInventory" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {tracking.google_site_verification && (
          <meta name="google-site-verification" content={tracking.google_site_verification} />
        )}
        {tracking.bing_site_verification && (
          <meta name="msvalidate.01" content={tracking.bing_site_verification} />
        )}
        {tracking.google_analytics_id && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${tracking.google_analytics_id}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${tracking.google_analytics_id}');
                `,
              }}
            />
          </>
        )}
        {tracking.google_tag_manager_id && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${tracking.google_tag_manager_id}');
              `,
            }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-[#0f172a] selection:bg-orange-500 selection:text-white font-sans">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.debug('PWA ServiceWorker registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
