import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let post = null;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single();

        if (!error && data) {
          post = data;

          // Increment view count asynchronously in background
          supabase
            .from("blog_posts")
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq("id", data.id)
            .then(() => {})
            .catch(() => {});
        }
      } catch (dbErr) {
        console.warn("Notice: falling back to seed article lookup:", dbErr.message);
      }
    }

    // Fallback to seed articles
    if (!post) {
      post = SEED_BLOG_POSTS.find((p) => p.slug === slug);
    }

    if (!post) {
      return NextResponse.json(
        { error: "Article not found." },
        { status: 404 }
      );
    }

    // Fetch related articles
    const relatedPosts = SEED_BLOG_POSTS.filter(
      (p) => p.slug !== slug
    ).slice(0, 3);

    return NextResponse.json(
      {
        success: true,
        post,
        relatedPosts,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    if (err?.digest) throw err;
    console.error("Public blog article API error:", err);
    return NextResponse.json(
      { error: "Unable to retrieve article." },
      { status: 500 }
    );
  }
}
