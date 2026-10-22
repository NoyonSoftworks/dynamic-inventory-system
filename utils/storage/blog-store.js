import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";
import { calculateSeoScore, extractDefaultKeyword } from "@/utils/seo-analyzer";

const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NEXT_RUNTIME === "edge"
);

const DATA_DIR = path.join(process.cwd(), "data");
const BUNDLED_BLOG_FILE = path.join(DATA_DIR, "blog_posts.json");
const TMP_BLOG_FILE = path.join("/tmp", "dynamic-inventory", "blog_posts.json");
const BLOG_FILE = IS_SERVERLESS ? TMP_BLOG_FILE : BUNDLED_BLOG_FILE;

function ensureDataDir() {
  try {
    const dir = path.dirname(BLOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    // Graceful on serverless
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
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content) || defaultVal;
    }
    if (IS_SERVERLESS && fs.existsSync(BUNDLED_BLOG_FILE)) {
      const content = fs.readFileSync(BUNDLED_BLOG_FILE, "utf8");
      return JSON.parse(content) || defaultVal;
    }
    return defaultVal;
  } catch (err) {
    console.warn(`Failed to read ${filePath}:`, err.message);
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  try {
    ensureDataDir();
    const targetPath = IS_SERVERLESS ? TMP_BLOG_FILE : filePath;
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.warn(`Failed to write ${filePath}:`, err.message);
    return false;
  }
}

function enrichPostWithSeoAndMetrics(p) {
  if (!p) return p;
  const views = Number(p.views_count) || 0;
  const uniques = Number(p.unique_visitors_count) || Math.max(1, Math.round(views * 0.74));
  const focusKw = p.focus_keyword || extractDefaultKeyword(p.title);

  let score = Number(p.seo_score);
  let grade = p.seo_grade;
  if (!score || !grade || grade === "Pending") {
    const analysis = calculateSeoScore({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
      content: p.content,
      focus_keyword: focusKw,
    });
    score = analysis.score;
    grade = analysis.grade;
  }

  return {
    ...p,
    views_count: views,
    unique_visitors_count: uniques,
    last_viewed_at: p.last_viewed_at || p.updated_at || p.created_at,
    focus_keyword: focusKw,
    seo_score: score,
    seo_grade: grade,
  };
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
        for (const p of localPosts) postMap.set(p.id, enrichPostWithSeoAndMetrics(p));
        for (const p of data) postMap.set(p.id, enrichPostWithSeoAndMetrics(p));
        const merged = Array.from(postMap.values()).sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        writeJsonFile(BLOG_FILE, merged);
        return merged;
      }
    } catch {}
  }

  return localPosts
    .map(enrichPostWithSeoAndMetrics)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
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

  const focusKw = postData.focus_keyword || extractDefaultKeyword(postData.title);
  const autoSeo = calculateSeoScore({
    title: postData.title,
    slug: postData.slug,
    excerpt: postData.excerpt,
    meta_title: postData.meta_title,
    meta_description: postData.meta_description,
    content: postData.content,
    focus_keyword: focusKw,
  });

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
    unique_visitors_count: Number(postData.unique_visitors_count) || 0,
    last_viewed_at: postData.last_viewed_at || null,
    focus_keyword: focusKw,
    seo_score: Number(postData.seo_score) || autoSeo.score,
    seo_grade: postData.seo_grade || autoSeo.grade,
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
  const focusKw =
    updates.focus_keyword ||
    allPosts[existingIdx].focus_keyword ||
    extractDefaultKeyword(updates.title || allPosts[existingIdx].title);
  const mergedForSeo = { ...allPosts[existingIdx], ...updates, focus_keyword: focusKw };
  const autoSeo = calculateSeoScore({
    title: mergedForSeo.title,
    slug: mergedForSeo.slug,
    excerpt: mergedForSeo.excerpt,
    meta_title: mergedForSeo.meta_title,
    meta_description: mergedForSeo.meta_description,
    content: mergedForSeo.content,
    focus_keyword: focusKw,
  });

  const updatedPost = {
    ...allPosts[existingIdx],
    ...updates,
    id, // Preserve ID
    focus_keyword: focusKw,
    seo_score: updates.seo_score !== undefined ? Number(updates.seo_score) : autoSeo.score,
    seo_grade: updates.seo_grade || autoSeo.grade,
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
 * Increment blog post view count and unique visitors by slug
 */
export async function incrementBlogViews(slug, isUniqueVisitor = false) {
  if (!slug) return false;
  const allPosts = await getAllBlogPosts();
  const post = allPosts.find((p) => String(p.slug).toLowerCase() === String(slug).toLowerCase());
  if (post) {
    post.views_count = (Number(post.views_count) || 0) + 1;
    if (isUniqueVisitor) {
      post.unique_visitors_count = (Number(post.unique_visitors_count) || 0) + 1;
    }
    post.last_viewed_at = new Date().toISOString();
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
