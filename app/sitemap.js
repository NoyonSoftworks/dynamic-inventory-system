import { getAllBlogPosts } from "@/utils/storage/blog-store";

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartinventory.io";
  let blogPosts = [];

  try {
    blogPosts = await getAllBlogPosts();
  } catch (err) {
    console.warn("Sitemap: Failed to load blog posts, using fallback:", err.message);
  }

  const blogUrls = (blogPosts || [])
    .filter((p) => p && p.is_published !== false)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at || post.created_at || Date.now()),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  return [...staticRoutes, ...blogUrls];
}
