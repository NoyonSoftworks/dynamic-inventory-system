import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminRequest } from "@/utils/admin-auth";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

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

  const supabase = getServiceSupabase();
  let posts = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        posts = data;
      }
    } catch (err) {
      console.warn("Notice: falling back to seed posts in admin:", err.message);
    }
  }

  if (posts.length === 0) {
    posts = SEED_BLOG_POSTS;
  }

  return NextResponse.json({
    success: true,
    count: posts.length,
    posts,
  });
}

/**
 * POST /api/admin/blog
 * Creates a new article in the database.
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
    const {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      author_name,
      author_role,
      meta_title,
      meta_description,
      canonical_url,
      reading_time,
      is_published,
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

    const newPost = {
      title: title.trim(),
      slug: sanitizedSlug,
      excerpt: excerpt?.trim() || "",
      content: content.trim(),
      category: category?.trim() || "Logistics & Supply Chain",
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map((t) => t.trim()) : []),
      author_name: author_name?.trim() || "Platform Operations Team",
      author_role: author_role?.trim() || "Senior Supply Chain Architect",
      meta_title: meta_title?.trim() || title.trim(),
      meta_description: meta_description?.trim() || excerpt?.trim() || "",
      canonical_url: canonical_url?.trim() || `https://smartinventory.io/blog/${sanitizedSlug}`,
      reading_time: reading_time?.trim() || "5 min read",
      is_published: Boolean(is_published),
      views_count: 0,
      updated_at: new Date().toISOString(),
    };

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client configuration missing." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert(newPost)
      .select()
      .single();

    if (error) {
      // If table doesn't exist yet, inform clearly
      return NextResponse.json(
        {
          error: `Database error: ${error.message}. Please run the blog-engine-migration.sql script in Supabase SQL editor.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      post: data,
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

    if (updates.tags && !Array.isArray(updates.tags)) {
      updates.tags = String(updates.tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client configuration missing." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      post: data,
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

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client configuration missing." },
        { status: 500 }
      );
    }

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    if (err?.digest) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to delete article." },
      { status: 500 }
    );
  }
}
