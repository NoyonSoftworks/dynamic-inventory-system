export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartinventory.io";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/*", "/demo", "/login"],
        disallow: ["/api/", "/admin/", "/dashboard/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
