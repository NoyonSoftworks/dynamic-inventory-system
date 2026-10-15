"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminBlogTab({ triggerToast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorPreview, setEditorPreview] = useState(false);

  const emptyPostForm = {
    id: null,
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Logistics & Supply Chain",
    tags: "Steadfast Courier, Warehouse Automation, Bangladesh Ecommerce",
    author_name: "Noyon Hossain",
    author_role: "Founder & Lead Systems Architect",
    meta_title: "",
    meta_description: "",
    canonical_url: "",
    reading_time: "5 min read",
    is_published: true,
  };

  const [formData, setFormData] = useState(emptyPostForm);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/blog");
      if (res.ok) {
        const json = await res.json();
        if (json.posts) {
          setPosts(json.posts);
        }
      }
    } catch (err) {
      console.warn("Error fetching admin blog articles:", err);
      triggerToast?.("error", "Unable to load articles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function handleOpenCreate() {
    setFormData(emptyPostForm);
    setIsEditing(false);
    setEditorPreview(false);
    setIsModalOpen(true);
  }

  function handleOpenEdit(post) {
    setFormData({
      id: post.id,
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category || "Logistics & Supply Chain",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : post.tags || "",
      author_name: post.author_name || "Platform Operations Team",
      author_role: post.author_role || "Senior Supply Chain Architect",
      meta_title: post.meta_title || post.title || "",
      meta_description: post.meta_description || post.excerpt || "",
      canonical_url: post.canonical_url || `https://smartinventory.io/blog/${post.slug}`,
      reading_time: post.reading_time || "5 min read",
      is_published: Boolean(post.is_published),
    });
    setIsEditing(true);
    setEditorPreview(false);
    setIsModalOpen(true);
  }

  function handleAutoSlug(titleText) {
    const slug = titleText
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({
      ...prev,
      slug,
      canonical_url: `https://smartinventory.io/blog/${slug}`,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      triggerToast?.("error", "Title and content cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      const url = "/api/admin/blog";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save article.");
      }

      triggerToast?.(
        "success",
        isEditing ? "Article updated successfully." : "Article published to blog engine."
      );
      setIsModalOpen(false);
      loadPosts();
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete article: "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/blog?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        triggerToast?.("success", "Article deleted.");
        loadPosts();
      } else {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete.");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    }
  }

  async function handleTogglePublish(post) {
    try {
      const res = await fetch("/api/admin/blog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          is_published: !post.is_published,
        }),
      });
      if (res.ok) {
        triggerToast?.(
          "success",
          post.is_published ? "Unpublished (moved to draft)." : "Published live."
        );
        loadPosts();
      }
    } catch (err) {
      triggerToast?.("error", "Failed to toggle status.");
    }
  }

  const filteredPosts = posts.filter((p) => {
    const matchCat =
      selectedCategory === "ALL" || p.category === selectedCategory;
    const q = filterQuery.toLowerCase();
    const matchQuery =
      !q ||
      p.title?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q) ||
      p.excerpt?.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const categories = [
    "ALL",
    "Logistics & Courier Automation",
    "Barcode & Mobile Scanning",
    "COD & Delivery Success",
    "Engineering & Architecture",
  ];

  return (
    <div className="space-y-6">
      {/* ── Sub-header Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Inbound SEO &amp; Answer Engine (AEO) Engine
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Author and rank high-intent e-commerce guides to drive organic merchant acquisitions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/blog"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white shadow-2xs btn-tactile transition"
          >
            <span>View Public /blog</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 btn-tactile transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Draft New Article</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap btn-tactile ${
                selectedCategory === cat
                  ? "bg-orange-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search articles by title or slug…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:bg-white focus:outline-none focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* ── Articles Data Table ───────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-mono uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-bold">Article Title &amp; Slug</th>
                <th className="px-5 py-3.5 font-bold">Category</th>
                <th className="px-5 py-3.5 font-bold font-mono">Reading Time</th>
                <th className="px-5 py-3.5 font-bold font-mono">Views</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-mono">
                    Loading content repository…
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-mono">
                    No articles found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id || post.slug} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4 max-w-md">
                      <div className="font-bold text-slate-900 text-sm line-clamp-1">
                        {post.title}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">
                        /blog/{post.slug}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-500 whitespace-nowrap">
                      {post.reading_time || "5 min"}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-700 whitespace-nowrap font-semibold">
                      {(post.views_count || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(post)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition cursor-pointer ${
                          post.is_published
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${post.is_published ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span>{post.is_published ? "PUBLISHED" : "DRAFT"}</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                          title="View Live Article"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(post)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id, post.title)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Article"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Article Editor Modal ───────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {isEditing ? "Edit SEO Article" : "Draft New Inbound Article"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-mono text-sm cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs text-slate-800">
              {/* Row 1: Title & Auto Slug */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Article Title (H1)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (!isEditing) handleAutoSlug(e.target.value);
                    }}
                    placeholder="e.g. How to Automate Steadfast Courier API in Bangladesh"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoSlug(formData.title)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] whitespace-nowrap btn-tactile cursor-pointer"
                  >
                    Generate Slug
                  </button>
                </div>
              </div>

              {/* Row 2: Slug, Category, Reading Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 font-mono">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="automate-steadfast-courier"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Logistics & Courier Automation">Logistics &amp; Courier Automation</option>
                    <option value="Barcode & Mobile Scanning">Barcode &amp; Mobile Scanning</option>
                    <option value="COD & Delivery Success">COD &amp; Delivery Success</option>
                    <option value="Engineering & Architecture">Engineering &amp; Architecture</option>
                    <option value="SaaS Architecture & Billing">SaaS Architecture &amp; Billing</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Reading Time</label>
                  <input
                    type="text"
                    value={formData.reading_time}
                    onChange={(e) => setFormData({ ...formData, reading_time: e.target.value })}
                    placeholder="6 min read"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Row 3: Author and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Author Name</label>
                  <input
                    type="text"
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Author Role</label>
                  <input
                    type="text"
                    value={formData.author_role}
                    onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Article Summary / Excerpt (SERP &amp; AEO Answer Snippet)
                </label>
                <textarea
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="2-sentence clear overview answering the user intent directly for Perplexity & Google Snippets..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* SEO & Meta Architecture Box */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-orange-700">
                  <span>SEARCH ENGINE OPTIMIZATION (SEO &amp; OPEN GRAPH)</span>
                  <span className="text-slate-500">Google Best Practices</span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">Meta Title</label>
                    <input
                      type="text"
                      value={formData.meta_title}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Meta Description</span>
                      <span className={formData.meta_description.length > 160 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                        {formData.meta_description.length} / 160 chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Content Body Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Article Content (Markdown Supported)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditorPreview(!editorPreview)}
                    className="text-xs font-mono text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
                  >
                    {editorPreview ? "Switch to Code View" : "Live Markdown Preview"}
                  </button>
                </div>

                {editorPreview ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 max-w-none min-h-[300px] text-slate-800">
                    <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                      {formData.content || "No content written yet."}
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={12}
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write structured headings with ##, tables, code blocks, and clear step-by-step guidance..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                )}
              </div>

              {/* Status Switcher & Save Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="rounded accent-orange-600 h-4 w-4"
                  />
                  <span className="font-bold text-slate-800">
                    Publish Immediately (Visible on /blog)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 btn-tactile cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-white shadow-md shadow-orange-600/20 btn-tactile disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving Article…" : isEditing ? "Update Article" : "Save & Publish"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
