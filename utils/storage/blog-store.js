import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";

const DATA_DIR = path.join(process.cwd(), "data");
const BLOG_FILE = path.join(DATA_DIR, "blog_posts.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

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

function readJsonFile(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) || defaultVal;
  } catch (err) {
    console.warn(`Failed to read ${filePath}:`, err.message);
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Get all blog posts (published & draft)
 * Returns from local storage or seeds if empty, and syncs with Supabase if available.
 */
export async function getAllBlogPosts() {
  ensureDataDir();
  let localPosts = readJsonFile(BLOG_FILE, null);

  // If local file is missing, initialize with seed posts
  if (!localPosts || !Array.isArray(localPosts) || localPosts.length === 0) {
    localPosts = [...SEED_BLOG_POSTS];
    writeJsonFile(BLOG_FILE, localPosts);
  }

  // Attempt to check Supabase
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Merge Supabase data with local data (Supabase takes precedence by ID)
        const postMap = new Map();
        for (const p of localPosts) postMap.set(p.id, p);
        for (const p of data) postMap.set(p.id, p);
        const merged = Array.from(postMap.values()).sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        writeJsonFile(BLOG_FILE, merged);
        return merged;
      }
    } catch {}
  }

  return localPosts.sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

/**
 * Get single blog post by slug
 */
export async function getBlogPostBySlug(slug) {
  if (!slug) return null;
  const cleanSlug = String(slug).toLowerCase().trim();
  const allPosts = await getAllBlogPosts();
  return allPosts.find((p) => String(p.slug).toLowerCase().trim() === cleanSlug) || null;
}

/**
 * Get single blog post by ID
 */
export async function getBlogPostById(id) {
  if (!id) return null;
  const allPosts = await getAllBlogPosts();
  return allPosts.find((p) => String(p.id) === String(id)) || null;
}

/**
 * Save new blog post (dual-syncs local JSON and Supabase)
 */
export async function saveBlogPost(postData) {
  const allPosts = await getAllBlogPosts();
  const id = postData.id || `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newPost = {
    id,
    slug: postData.slug,
    title: postData.title,
    excerpt: postData.excerpt || "",
    content: postData.content || "",
    category: postData.category || "Logistics & Courier Automation",
    tags: Array.isArray(postData.tags)
      ? postData.tags
      : (postData.tags ? String(postData.tags).split(",").map((t) => t.trim()).filter(Boolean) : []),
    author_name: postData.author_name || "Platform Operations Team",
    author_role: postData.author_role || "Senior Supply Chain Architect",
    author_avatar: postData.author_avatar || "",
    cover_image: postData.cover_image || "",
    reading_time: postData.reading_time || "5 min read",
    is_published: postData.is_published !== undefined ? Boolean(postData.is_published) : true,
    views_count: Number(postData.views_count) || 0,
    meta_title: postData.meta_title || postData.title,
    meta_description: postData.meta_description || postData.excerpt || "",
    canonical_url: postData.canonical_url || `https://smartinventory.io/blog/${postData.slug}`,
    created_at: postData.created_at || now,
    updated_at: now,
  };

  // Update local file
  const updated = [newPost, ...allPosts.filter((p) => p.id !== id)];
  writeJsonFile(BLOG_FILE, updated);

  // Sync with Supabase asynchronously
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from("blog_posts").upsert(newPost);
    } catch (err) {
      console.warn("Notice: Supabase upsert skipped (local storage persisted):", err.message);
    }
  }

  return newPost;
}

/**
 * Update existing blog post by ID
 */
export async function updateBlogPost(id, updates) {
  if (!id) return null;
  const allPosts = await getAllBlogPosts();
  const existingIdx = allPosts.findIndex((p) => String(p.id) === String(id));
  if (existingIdx === -1) return null;

  const now = new Date().toISOString();
  const updatedPost = {
    ...allPosts[existingIdx],
    ...updates,
    id, // Preserve ID
    updated_at: now,
  };

  if (updates.tags && !Array.isArray(updates.tags)) {
    updatedPost.tags = String(updates.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  allPosts[existingIdx] = updatedPost;
  writeJsonFile(BLOG_FILE, allPosts);

  // Sync with Supabase asynchronously
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from("blog_posts").update(updatedPost).eq("id", id);
    } catch (err) {
      console.warn("Notice: Supabase update skipped (local storage persisted):", err.message);
    }
  }

  return updatedPost;
}

/**
 * Delete blog post by ID
 */
export async function deleteBlogPost(id) {
  if (!id) return false;
  const allPosts = await getAllBlogPosts();
  const filtered = allPosts.filter((p) => String(p.id) !== String(id));
  writeJsonFile(BLOG_FILE, filtered);

  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from("blog_posts").delete().eq("id", id);
    } catch {}
  }

  return true;
}

/**
 * Increment blog post view count by slug
 */
export async function incrementBlogViews(slug) {
  if (!slug) return false;
  const allPosts = await getAllBlogPosts();
  const post = allPosts.find((p) => String(p.slug).toLowerCase() === String(slug).toLowerCase());
  if (post) {
    post.views_count = (post.views_count || 0) + 1;
    writeJsonFile(BLOG_FILE, allPosts);
    return true;
  }
  return false;
}

/**
 * Reset / Re-seed standard demo blog posts
 */
export function seedDefaultBlogPosts(overwrite = false) {
  if (overwrite || !fs.existsSync(BLOG_FILE)) {
    writeJsonFile(BLOG_FILE, SEED_BLOG_POSTS);
    return SEED_BLOG_POSTS;
  }
  return readJsonFile(BLOG_FILE, SEED_BLOG_POSTS);
}
