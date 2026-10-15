"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SEED_BLOG_POSTS } from "@/utils/blog-seed";
import MarkdownRenderer from "@/components/MarkdownRenderer";

function BlogPostReaderContent() {
  const params = useParams();
  const slug = params?.slug;

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return;
      try {
        const res = await fetch(`/api/blog/${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.post) {
            setPost(json.post);
            if (json.relatedPosts) setRelatedPosts(json.relatedPosts);
            return;
          }
        }
      } catch (err) {
        console.warn("Fallback to seed article lookup:", err);
      }

      // Fallback
      const found = SEED_BLOG_POSTS.find((p) => p.slug === slug);
      if (found) {
        setPost(found);
        setRelatedPosts(SEED_BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3));
      }
      setLoading(false);
    }

    fetchArticle();
  }, [slug]);

  if (loading && !post) {
    return (
      <main className="min-h-screen bg-[#0b1120] text-slate-100 flex items-center justify-center font-mono text-xs text-slate-400">
        Loading engineering article…
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <h1 className="text-xl font-bold text-slate-50">Article Not Found</h1>
        <p className="text-xs text-slate-400">The requested guide may have been updated or moved.</p>
        <Link
          href="/blog"
          className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-orange-500/20 btn-tactile hover:-translate-y-0.5"
        >
          ← Return to Blog Directory
        </Link>
      </main>
    );
  }

  // Schema.org Article, Breadcrumb, and FAQ JSON-LD
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": post.title,
    "description": post.excerpt || post.meta_description,
    "articleSection": post.category,
    "keywords": (post.tags || []).join(", "),
    "datePublished": post.created_at,
    "dateModified": post.updated_at || post.created_at,
    "author": {
      "@type": "Person",
      "name": post.author_name || "Noyon Hossain",
      "jobTitle": post.author_role || "Founder & Lead Systems Architect"
    },
    "publisher": {
      "@type": "Organization",
      "name": "SmartInventory",
      "url": "https://smartinventory.io"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": post.canonical_url || `https://smartinventory.io/blog/${post.slug}`
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://smartinventory.io"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://smartinventory.io/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": post.canonical_url || `https://smartinventory.io/blog/${post.slug}`
      }
    ]
  };

  const faqSchema =
    post.faq && post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": post.faq.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.answer
            }
          }))
        }
      : null;

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans selection:bg-orange-600 selection:text-white">
      {/* Schema.org Injections */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── TOP HEADER (Velocity Warm Bar) ───────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0b1120]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          <Link
            href="/blog"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-400 transition group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>All Articles</span>
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-100 tracking-tight">SmartInventory</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-orange-500/25 btn-tactile hover:-translate-y-0.5 active:scale-[0.98] group"
            >
              <span>Get Started</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── ARTICLE CONTAINER ───────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-12 flex-1 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Link href="/" className="hover:text-orange-400 transition">Home</Link>
          <span className="text-slate-600">/</span>
          <Link href="/blog" className="hover:text-orange-400 transition">Blog</Link>
          <span className="text-slate-600">/</span>
          <span className="text-orange-400 truncate max-w-xs">{post.category}</span>
        </nav>

        {/* Article Header Meta */}
        <header className="space-y-4 border-b border-slate-800 pb-8">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
              {post.category}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{post.reading_time || "5 min read"}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              Published {new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-slate-50 leading-[1.25]">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            {post.excerpt}
          </p>

          {/* Author Capsule */}
          <div className="pt-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500/20 to-teal-500/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-400 font-mono text-sm shadow-xs">
              {post.author_name?.charAt(0) || "N"}
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-100">{post.author_name || "Noyon Hossain"}</div>
              <div className="text-[11px] text-teal-400 font-mono">{post.author_role || "Founder & Lead Systems Architect"}</div>
            </div>
          </div>
        </header>

        {/* AEO / Answer Engine Key Takeaways Callout */}
        <section className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-6 space-y-2.5 shadow-md">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            <span>EXECUTIVE KEY TAKEAWAYS (AEO SUMMARY)</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {post.excerpt}
          </p>
        </section>

        {/* Article Body Content Rendered with Custom Markdown-to-JSX */}
        <article className="max-w-none text-slate-200 leading-relaxed">
          <MarkdownRenderer content={post.content} />
        </article>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t border-slate-800 space-y-2.5">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
              Related Topic Entities
            </span>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-[#131d31] border border-slate-800 text-xs font-mono text-slate-300 hover:border-orange-500/40 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Structured FAQ Section (AEO Snippet Target) */}
        {post.faq && post.faq.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-[#131d31] p-6 sm:p-8 space-y-6 shadow-md">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-orange-400 font-bold">
                Knowledge Base Q&amp;A
              </span>
              <h2 className="text-xl font-bold text-slate-50">
                Frequently Asked Technical Questions
              </h2>
            </div>

            <div className="space-y-2.5">
              {post.faq.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-[#0b1120] overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-bold text-slate-200 hover:text-orange-400 transition"
                    >
                      <span>{item.question}</span>
                      <span className="text-orange-400 font-mono text-base ml-4 shrink-0 font-bold">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Author Bio Card */}
        <section className="rounded-2xl border border-slate-800 bg-[#131d31] p-6 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-teal-500/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-400 font-mono text-xl shrink-0 shadow-xs">
            {post.author_name?.charAt(0) || "N"}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-bold text-slate-100 text-sm sm:text-base">{post.author_name || "Noyon Hossain"}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                Verified Author
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Founder &amp; Lead Systems Architect at SmartInventory. Specializes in real-time warehouse orchestration, multi-carrier APIs, and high-concurrency PostgreSQL multi-tenancy.
            </p>
          </div>
        </section>

        {/* Bottom Inbound CTA */}
        <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-950/30 via-slate-900 to-[#131d31] p-8 sm:p-10 text-center space-y-4 shadow-xl">
          <h3 className="text-xl sm:text-2xl font-black text-slate-50">
            Ready to streamline your warehouse fulfillment?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Turn any mobile phone into a barcode scanner and dispatch parcels with Steadfast in one click. 100 free orders included every month.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demo"
              className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-200 transition btn-tactile hover:-translate-y-0.5"
            >
              Interactive Sandbox
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-6 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-orange-500/25 btn-tactile hover:-translate-y-0.5 active:scale-[0.98] group"
            >
              <span>Start Free Trial</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </section>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="space-y-4 pt-8 border-t border-slate-800">
            <h3 className="text-sm font-mono uppercase font-bold text-slate-400">
              Related Operational Blueprints
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  className="card-lift rounded-xl border border-slate-800 bg-[#131d31] p-4 space-y-2 hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-200 group"
                >
                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    {rel.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-orange-400 transition line-clamp-2">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] font-mono text-orange-400 flex items-center gap-1 pt-1 font-semibold">
                    <span>Read Guide</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-[#0b1120] py-10 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200">SmartInventory</span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-xs">
            <Link href="/" className="hover:text-orange-400 transition">Home</Link>
            <Link href="/blog" className="hover:text-orange-400 transition">Blog</Link>
            <Link href="/demo" className="hover:text-orange-400 transition">Sandbox</Link>
            <Link href="/login" className="hover:text-orange-400 transition">Sign In</Link>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            © 2026 SmartInventory SaaS. Founded by Noyon Hossain.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function BlogPostReaderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center font-mono text-xs text-zinc-500">
          Loading article…
        </main>
      }
    >
      <BlogPostReaderContent />
    </Suspense>
  );
}
