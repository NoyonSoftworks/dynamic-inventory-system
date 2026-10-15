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
    <div className="min-h-screen bg-[#0b1120] text-[#f8fafc] flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* ── TOP HEADER (Swiss Minimalist Bar) ───────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#0b1120]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-100">
                SmartInventory
              </span>
              <span className="text-[11px] font-mono text-orange-400 font-semibold">
                /blog
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <Link href="/" className="hover:text-slate-200 transition">
              Overview
            </Link>
            <Link href="/demo" className="hover:text-slate-200 transition flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Interactive Sandbox</span>
            </Link>
            <Link href="/#pricing" className="hover:text-slate-200 transition">
              Pricing
            </Link>
            <Link href="/#faq" className="hover:text-slate-200 transition">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="btn-tactile inline-flex items-center rounded-lg bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm shadow-orange-600/30"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-12 border-b border-[#1e293b] bg-[#131d31]/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-mono text-orange-300">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span>KNOWLEDGE BASE &amp; OPERATIONAL BLUEPRINTS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-50 leading-[1.15]">
            Engineering &amp; Logistics Guides
          </h1>

          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-400 leading-relaxed">
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
                className="w-full rounded-xl border border-[#1e293b] bg-[#131d31] px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-orange-500 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY FILTER TABS ────────────────────────────────── */}
      <section className="border-b border-[#1e293b] bg-[#0b1120] sticky top-16 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-orange-600 text-white font-semibold shadow-xs shadow-orange-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50"
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
          <article className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 sm:p-10 hover:border-orange-500/40 transition group shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
                  <span className="px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/20 font-semibold">
                    {featuredPost.category}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400 font-medium">
                    {featuredPost.reading_time || "6 min read"}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-teal-400 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                    Flagship Guide
                  </span>
                </div>

                <Link href={`/blog/${featuredPost.slug}`}>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-50 group-hover:text-orange-400 transition leading-snug">
                    {featuredPost.title}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center justify-center text-[10px] font-bold">
                      N
                    </span>
                    By {featuredPost.author_name}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>{new Date(featuredPost.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-3 text-xs font-bold text-white transition shadow-md shadow-orange-600/30 group/btn"
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
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              Published Operational Blueprints ({filteredPosts.length})
            </span>
            <span className="text-xs font-mono text-slate-500">
              Updated for 2026 E-Commerce
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <article
                key={post.id || post.slug}
                className="card-lift rounded-2xl border border-[#1e293b] bg-[#131d31] p-6 flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/80">
                      {post.category}
                    </span>
                    <span className="text-slate-500">
                      {post.reading_time || "5 min read"}
                    </span>
                  </div>

                  <Link href={`/blog/${post.slug}`}>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-orange-400 transition line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 group/link"
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
        <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-950/25 via-[#131d31] to-[#131d31] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black text-slate-50 tracking-tight">
              Automate your warehouse fulfillment today.
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Start with 100 free orders per month. Connect your private Steadfast keys and scan barcodes using mobile cameras.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <Link
              href="/demo"
              className="btn-tactile rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Interactive Sandbox
            </Link>
            <Link
              href="/login"
              className="btn-tactile rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm shadow-orange-600/30"
            >
              Start Free Trial →
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-[#1e293b] bg-[#0b1120] py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200">SmartInventory</span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/" className="hover:text-slate-200 transition">Home</Link>
            <Link href="/demo" className="hover:text-slate-200 transition">Sandbox</Link>
            <Link href="/login" className="hover:text-slate-200 transition">Sign In</Link>
            <Link href="/#pricing" className="hover:text-slate-200 transition">Pricing</Link>
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            © 2026 SmartInventory SaaS. 256-Bit SSL Encrypted.
          </div>
        </div>
      </footer>
    </div>
  );
}
