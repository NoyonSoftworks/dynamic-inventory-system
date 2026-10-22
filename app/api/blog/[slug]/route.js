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

    // Determine unique reader session via cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const cleanCookieKey = `si_rd_${String(post.id || slug).replace(/[^a-zA-Z0-9]/g, "_")}`;
    const isReturning = cookieHeader.includes(cleanCookieKey);

    // Increment view count and unique visitor tracking asynchronously
    incrementBlogViews(slug, !isReturning).catch(() => {});

    const response = NextResponse.json({
      success: true,
      post,
    });

    if (!isReturning) {
      // Set 24h reading session cookie
      response.cookies.set(cleanCookieKey, "1", {
        maxAge: 86400,
        path: "/",
        sameSite: "lax",
      });
    }

    return response;
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Public /api/blog/[slug] error:", err);
    return NextResponse.json(
      { error: "Failed to load article." },
      { status: 500 }
    );
  }
}
