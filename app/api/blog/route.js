import { NextResponse } from "next/server";
import { getAllBlogPosts } from "@/utils/storage/blog-store";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    let posts = await getAllBlogPosts();

    // Only return published posts for public API
    posts = posts.filter((p) => p.is_published !== false);

    // Apply filters
    if (category && category !== "All") {
      posts = posts.filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (tag) {
      posts = posts.filter((p) =>
        (p.tags || []).some((t) => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Public /api/blog error:", err);
    return NextResponse.json(
      { error: "Failed to load articles." },
      { status: 500 }
    );
  }
}
