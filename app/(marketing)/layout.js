export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://smartinventory.io"),
  title: "SmartInventory — Inventory Management & Automated Courier Fulfillment Software",
  description: "All-in-one warehouse inventory OS with smartphone camera barcode scanning, 1-click Steadfast courier dispatch, automated WhatsApp parcel tracking, and multi-location stock control.",
  keywords: [
    "inventory management software bangladesh",
    "steadfast courier api automation",
    "ecommerce warehouse management system",
    "mobile camera barcode scanner",
    "pathao courier integration",
    "whatsapp parcel tracking notification",
    "thermal shipping label print 4x6",
    "cod reconciliation software",
    "stock control multi location",
    "smart inventory saas",
  ],
  authors: [{ name: "SmartInventory Logistics Architecture" }],
  creator: "SmartInventory",
  publisher: "SmartInventory",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "SmartInventory — Inventory & Automated Courier Fulfillment OS",
    description: "Eliminate manual spreadsheets, lost parcels, and scanner gun costs. Barcode scan with phone cameras, dispatch Steadfast in 1-click, and alert buyers on WhatsApp.",
    url: "https://smartinventory.io",
    siteName: "SmartInventory",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartInventory — Inventory & Automated Courier Fulfillment",
    description: "Smartphone barcode scanning, 1-click Steadfast courier dispatch, automated WhatsApp tracking, and zero spreadsheet headaches.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function MarketingLayout({ children }) {
  // Structured Data Schema for Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SmartInventory",
    "operatingSystem": "All (Web-based, iOS, Android)",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "SupplyChainAndInventoryManagement",
    "description": "Modern warehouse inventory management software with mobile camera barcode decoding, Steadfast and Pathao multi-carrier API integration, and automated WhatsApp delivery tracking.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free Starter plan includes 100 orders per month and mobile barcode scanning."
    },
    "featureList": [
      "In-Browser Mobile Camera Barcode Scanner (No Laser Hardware)",
      "Automated Steadfast, Pathao & RedX 1-Click Courier Dispatch",
      "Real-Time WhatsApp & SMS Parcel Consignment Tracking",
      "PostgreSQL Multi-Tenant Row-Level Security",
      "Bulk CSV/Excel Product Catalog Import",
      "4x6 Thermal Shipping Label Auto Generation"
    ]
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-[#f8fafc] flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
