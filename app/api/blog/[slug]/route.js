import { NextResponse } from "next/server";
import { getBlogPostBySlug, incrementBlogViews } from "@/utils/storage/blog-store";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required." },
        { status: 400 }
      );
    }

    const post = await getBlogPostBySlug(slug);

    if (!post || post.is_published === false) {
      return NextResponse.json(
        { error: "Article not found or not published." },
        { status: 404 }
      );
    }

    // Increment view count asynchronously in background
    incrementBlogViews(slug).catch(() => {});

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Public /api/blog/[slug] error:", err);
    return NextResponse.json(
      { error: "Failed to load article." },
      { status: 500 }
    );
  }
}
