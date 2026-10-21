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
      <main className="min-h-screen bg-[#f8fafc] text-slate-700 flex items-center justify-center font-mono text-xs">
        Loading engineering article…
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Article Not Found</h1>
        <p className="text-xs text-slate-500">The requested guide may have been updated or moved.</p>
        <Link
          href="/blog"
          className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-orange-600/20 btn-tactile hover:-translate-y-0.5"
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
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans selection:bg-orange-500 selection:text-white">
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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 h-16">
          <Link
            href="/blog"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-orange-600 transition group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>All Articles</span>
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white font-bold text-xs shadow-xs">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">SmartInventory</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-orange-600/20 btn-tactile hover:-translate-y-0.5 active:scale-[0.98] group"
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <Link href="/" className="hover:text-orange-600 transition">Home</Link>
          <span className="text-slate-300">/</span>
          <Link href="/blog" className="hover:text-orange-600 transition">Blog</Link>
          <span className="text-slate-300">/</span>
          <span className="text-orange-600 truncate max-w-xs">{post.category}</span>
        </nav>

        {/* Article Header Meta */}
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
            <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
              {post.category}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{post.reading_time || "5 min read"}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">
              Published {new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 leading-[1.25]">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            {post.excerpt}
          </p>

          {/* Author Capsule */}
          <div className="pt-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center font-bold text-orange-700 font-mono text-sm shadow-xs">
              {post.author_name?.charAt(0) || "N"}
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-900">{post.author_name || "Noyon Hossain"}</div>
              <div className="text-[11px] text-teal-700 font-mono font-semibold">{post.author_role || "Founder & Lead Systems Architect"}</div>
            </div>
          </div>
        </header>

        {/* AEO / Answer Engine Key Takeaways Callout */}
        <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-6 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-orange-700">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span>EXECUTIVE KEY TAKEAWAYS (AEO SUMMARY)</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {post.excerpt}
          </p>
        </section>

        {/* Article Body Content Rendered with Custom Markdown-to-JSX */}
        <article className="max-w-none text-slate-700 leading-relaxed">
          <MarkdownRenderer content={post.content} />
        </article>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-2.5">
            <span className="text-[11px] font-mono uppercase text-slate-500 font-bold block">
              Related Topic Entities
            </span>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 hover:border-orange-500/40 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Structured FAQ Section (AEO Snippet Target) */}
        {post.faq && post.faq.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm shadow-slate-200/50">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-orange-700 font-bold">
                Knowledge Base Q&amp;A
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Frequently Asked Technical Questions
              </h2>
            </div>

            <div className="space-y-2.5">
              {post.faq.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-sm font-bold text-slate-900 hover:text-orange-600 transition"
                    >
                      <span>{item.question}</span>
                      <span className="text-orange-600 font-mono text-base ml-4 shrink-0 font-bold">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row items-center gap-4 shadow-sm shadow-slate-200/50">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center font-bold text-orange-700 font-mono text-xl shrink-0 shadow-xs">
            {post.author_name?.charAt(0) || "N"}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base">{post.author_name || "Noyon Hossain"}</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Verified Author
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Founder &amp; Lead Systems Architect at SmartInventory. Specializes in real-time warehouse fulfillment, multi-carrier logistics APIs, and high-concurrency PostgreSQL architecture.
            </p>
          </div>
        </section>

        {/* Bottom Inbound CTA */}
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center space-y-3">
          <h3 className="text-xl font-semibold text-slate-900">
            Ready to streamline your warehouse fulfillment?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Turn any mobile phone into a barcode scanner and dispatch parcels with Steadfast in one click. 100 free orders included every month.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/demo"
              className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition"
            >
              Interactive sandbox
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#EA580C] hover:bg-[#D94E07] px-4 py-2 text-xs font-medium text-white transition shadow-2xs"
            >
              <span>Start free trial</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="space-y-4 pt-8 border-t border-slate-200">
            <h3 className="text-sm font-mono uppercase font-bold text-slate-700">
              Related Operational Blueprints
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/blog/${rel.slug}`}
                  className="card-lift rounded-2xl border border-slate-200 bg-white p-5 space-y-2 hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-200 group shadow-xs"
                >
                  <span className="text-[10px] font-mono text-slate-500 block truncate">
                    {rel.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition line-clamp-2">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] font-mono text-orange-600 flex items-center gap-1 pt-1 font-semibold">
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

          <div className="flex items-center gap-6 text-slate-600 text-xs">
            <Link href="/" className="hover:text-orange-600 transition">Home</Link>
            <Link href="/blog" className="hover:text-orange-600 transition">Blog</Link>
            <Link href="/demo" className="hover:text-orange-600 transition">Sandbox</Link>
            <Link href="/login" className="hover:text-orange-600 transition">Sign In</Link>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
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
        <main className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center font-mono text-xs">
          Loading article…
        </main>
      }
    >
      <BlogPostReaderContent />
    </Suspense>
  );
}
