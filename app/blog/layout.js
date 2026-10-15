export const metadata = {
  title: "Engineering & Logistics Guides | SmartInventory Blog",
  description: "In-depth guides on warehouse operations, multi-carrier courier automation, camera barcode scanning, and multi-tenant SaaS architecture.",
  keywords: [
    "e-commerce logistics bangladesh",
    "steadfast courier api tutorial",
    "mobile barcode scanning guide",
    "reduce rto e-commerce",
    "warehouse management system guide",
  ],
  openGraph: {
    title: "Engineering & Logistics Guides | SmartInventory Blog",
    description: "In-depth architectural and operational guides for high-volume ecommerce merchants.",
    url: "https://smartinventory.io/blog",
    siteName: "SmartInventory",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Engineering & Logistics Guides | SmartInventory Blog",
    description: "Automate fulfillment, reduce RTO, and eliminate scanner hardware costs.",
  },
};

export default function BlogLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "SmartInventory Engineering & Logistics Blog",
    "description": "Technical guides, case studies, and operational blueprints for e-commerce warehouses.",
    "url": "https://smartinventory.io/blog",
    "publisher": {
      "@type": "Organization",
      "name": "SmartInventory",
      "url": "https://smartinventory.io",
      "logo": {
        "@type": "ImageObject",
        "url": "https://smartinventory.io/favicon.ico"
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
