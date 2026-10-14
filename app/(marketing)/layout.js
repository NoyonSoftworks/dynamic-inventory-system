export const metadata = {
  title: "SmartInventory SaaS - Autonomous Inventory & Logistics Intelligence",
  description: "Eliminate manual spreadsheets, lost courier parcels, and laser hardware costs with mobile camera barcode decoding and automated dispatch.",
};

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {children}
    </div>
  );
}
