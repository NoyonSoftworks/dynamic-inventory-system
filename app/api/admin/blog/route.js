import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/utils/admin-auth";
import {
  getAllBlogPosts,
  saveBlogPost,
  updateBlogPost,
  deleteBlogPost,
  seedDefaultBlogPosts,
} from "@/utils/storage/blog-store";

/**
 * GET /api/admin/blog
 * Returns all articles (published and drafts) for Super Admin management.
 */
export async function GET(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const posts = await getAllBlogPosts();

    return NextResponse.json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("GET /api/admin/blog error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load blog posts." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/blog
 * Creates a new article or seeds standard posts.
 */
export async function POST(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();

    // Special action: Seed default demo posts
    if (body.action === "seed_defaults") {
      const seeded = seedDefaultBlogPosts(body.overwrite || false);
      return NextResponse.json({
        success: true,
        message: "Default blog articles initialized successfully.",
        count: seeded.length,
        posts: seeded,
      });
    }

    const {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      author_name,
      author_role,
      author_avatar,
      cover_image,
      meta_title,
      meta_description,
      canonical_url,
      reading_time,
      is_published,
      focus_keyword,
      seo_score,
      seo_grade,
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Title and content are required fields." },
        { status: 400 }
      );
    }

    const sanitizedSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newPost = await saveBlogPost({
      title: title.trim(),
      slug: sanitizedSlug || `article-${Date.now()}`,
      excerpt: excerpt?.trim() || "",
      content: content.trim(),
      category: category?.trim() || "Logistics & Courier Automation",
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(",").map((t) => t.trim()).filter(Boolean) : []),
      author_name: author_name?.trim() || "Noyon Hossain",
      author_role: author_role?.trim() || "Founder & Lead Systems Architect",
      author_avatar: author_avatar?.trim() || "",
      cover_image: cover_image?.trim() || "",
      meta_title: meta_title?.trim() || title.trim(),
      meta_description: meta_description?.trim() || excerpt?.trim() || "",
      canonical_url: canonical_url?.trim() || `https://smartinventory.io/blog/${sanitizedSlug}`,
      reading_time: reading_time?.trim() || "5 min read",
      is_published: Boolean(is_published),
      focus_keyword: focus_keyword?.trim() || "",
      seo_score: Number(seo_score) || 0,
      seo_grade: seo_grade || "Pending",
      views_count: 0,
      unique_visitors_count: 0,
    });

    return NextResponse.json({
      success: true,
      post: newPost,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Admin blog creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create article." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/blog
 * Updates an existing article.
 */
export async function PUT(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Article ID is required." },
        { status: 400 }
      );
    }

    const updated = await updateBlogPost(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: "Article not found or could not be updated." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updated,
    });
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Admin blog update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update article." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blog
 * Deletes an article by ID.
 */
export async function DELETE(request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Article ID is required." },
        { status: 400 }
      );
    }

    const success = await deleteBlogPost(id);
    return NextResponse.json({ success, deletedId: id });
  } catch (err) {
    if (err?.digest) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to delete article." },
      { status: 500 }
    );
  }
}
