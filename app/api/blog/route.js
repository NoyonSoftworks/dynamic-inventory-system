import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let posts = [];

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        let query = supabase
          .from("blog_posts")
          .select("id, slug, title, excerpt, category, tags, author_name, author_role, reading_time, created_at, updated_at, views_count, is_published")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (category && category !== "All") {
          query = query.eq("category", category);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          posts = data;
        }
      } catch (dbErr) {
        console.warn("Notice: falling back to seed blog articles:", dbErr.message);
      }
    }

    // Fallback to seed articles if database has no rows
    if (posts.length === 0) {
      posts = SEED_BLOG_POSTS;
    }

    // Apply in-memory filters if needed
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

    return NextResponse.json(
      {
        success: true,
        count: posts.length,
        posts,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Public blog list API error:", err);
    return NextResponse.json(
      { success: false, posts: SEED_BLOG_POSTS, error: "Internal fallback" },
      { status: 200 }
    );
  }
}
