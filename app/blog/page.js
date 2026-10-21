"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";

export default function BlogIndexPage() {
  const [posts, setPosts] = useState(SEED_BLOG_POSTS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/blog");
        if (res.ok) {
          const json = await res.json();
          if (json?.posts && json.posts.length > 0) {
            setPosts(json.posts);
          }
        }
      } catch (err) {
        console.warn("Using fallback seed articles:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const categories = [
    "ALL",
    "Logistics & Courier Automation",
    "Barcode & Mobile Scanning",
    "COD & Delivery Success",
    "Engineering & Architecture",
  ];

  const filteredPosts = posts.filter((post) => {
    const matchCat =
      selectedCategory === "ALL" || post.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      post.title?.toLowerCase().includes(q) ||
      post.excerpt?.toLowerCase().includes(q) ||
      (post.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const featuredPost = filteredPosts[0] || posts[0];
  const remainingPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* ── TOP HEADER (Swiss Minimalist Bar) ───────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                SmartInventory
              </span>
              <span className="text-[11px] font-mono text-orange-600 font-semibold">
                /blog
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition">
              Overview
            </Link>
            <Link href="/demo" className="hover:text-slate-900 transition flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Interactive Sandbox</span>
            </Link>
            <Link href="/#pricing" className="hover:text-slate-900 transition">
              Pricing
            </Link>
            <Link href="/#faq" className="hover:text-slate-900 transition">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="btn-tactile inline-flex items-center rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-orange-600/20"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-12 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-mono text-orange-700">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span>KNOWLEDGE BASE &amp; GUIDES</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-[1.15]">
            Engineering &amp; Logistics Guides
          </h1>

          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
            In-depth architectural guides on courier API automation, in-browser camera barcode decoding, RTO reduction, and high-concurrency multi-tenant security.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides by keyword, topic, or courier…"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-orange-500 focus:bg-white transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 transition"
                  aria-label="Clear search query"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY FILTER TABS ────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-[#f8fafc]/95 backdrop-blur-md sticky top-16 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`btn-tactile px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-orange-600 text-white font-semibold shadow-xs shadow-orange-600/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ── ARTICLES DIRECTORY ──────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-12 flex-1 space-y-12">
        {/* Featured Flagship Article */}
        {featuredPost && !searchQuery && (
          <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 hover:border-slate-300 transition group shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                    {featuredPost.category}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-medium">
                    {featuredPost.reading_time || "6 min read"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-teal-700 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    Flagship Guide
                  </span>
                </div>

                <Link href={`/blog/${featuredPost.slug}`}>
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 group-hover:text-orange-600 transition leading-snug">
                    {featuredPost.title}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center text-[10px] font-bold">
                      N
                    </span>
                    By {featuredPost.author_name}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>{new Date(featuredPost.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-3 text-xs font-bold text-white transition shadow-md shadow-orange-600/20 group/btn"
                >
                  <span>Read Article</span>
                  <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </article>
        )}

        {/* Article Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Published Operational Blueprints ({filteredPosts.length})
            </span>
            <span className="text-xs font-mono text-slate-400">
              Updated for 2026 E-Commerce
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <article
                key={post.id || post.slug}
                className="card-lift rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition group shadow-sm shadow-slate-200/50"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {post.category}
                    </span>
                    <span className="text-slate-400">
                      {post.reading_time || "5 min read"}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`}>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-bold text-orange-600 hover:text-orange-500 flex items-center gap-1 group/link"
                  >
                    <span>Read Guide</span>
                    <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Inbound Conversion Box */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-1.5 max-w-xl text-center sm:text-left">
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
              Automate your warehouse fulfillment today.
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Start with 100 free orders per month. Connect your private Steadfast keys and scan barcodes using mobile cameras.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/demo"
              className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition"
            >
              Interactive sandbox
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-4 py-1.5 text-xs font-medium text-white transition shadow-2xs"
            >
              Start free trial →
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">SmartInventory</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition">Home</Link>
            <Link href="/demo" className="hover:text-slate-900 transition">Sandbox</Link>
            <Link href="/login" className="hover:text-slate-900 transition">Sign In</Link>
            <Link href="/#pricing" className="hover:text-slate-900 transition">Pricing</Link>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            © 2026 SmartInventory SaaS. 256-Bit SSL Encrypted.
          </div>
        </div>
      </footer>
    </div>
  );
}
