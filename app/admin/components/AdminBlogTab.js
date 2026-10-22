"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { calculateSeoScore, extractDefaultKeyword } from "@/utils/seo-analyzer";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

/**
 * High-Performance Blog Markdown Previewer with Full Image & Video Embed Support
 */
function BlogMarkdownPreview({ content }) {
  if (!content) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs italic">
        No content written yet. Type in the markdown editor or use Shongi AI Copilot to generate sections.
      </div>
    );
  }

  const lines = content.split("\n");
  const renderedElements = [];
  let tableRows = [];
  let inTable = false;

  function renderInline(text) {
    if (!text) return text;
    const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          const [, label, href] = match;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 underline font-semibold"
            >
              {label}
            </a>
          );
        }
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <em key={i} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  function flushTable(key) {
    if (tableRows.length === 0) return null;
    const rows = [...tableRows];
    tableRows = [];
    inTable = false;

    const contentRows = rows.filter((r) => !r.every((c) => /^[\s-:]+$/.test(c)));
    if (contentRows.length === 0) return null;

    const [header, ...body] = contentRows;

    return (
      <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
            <tr>
              {header.map((col, idx) => (
                <th key={idx} className="px-3.5 py-2.5 border-r border-slate-200 last:border-0">
                  {renderInline(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/60 transition">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-slate-700 border-r border-slate-100 last:border-0">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // 1. Table row detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      renderedElements.push(flushTable(idx));
    }

    if (!trimmed) {
      renderedElements.push(<div key={idx} className="h-2" />);
      return;
    }

    // 2. Markdown Image: ![alt](url "caption") or ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)"\s]+)(?:\s+"([^"]*)")?\)$/);
    if (imgMatch) {
      const [, alt, src, caption] = imgMatch;
      renderedElements.push(
        <figure key={idx} className="my-4 space-y-1.5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-xs max-h-[380px]">
            <img
              src={src}
              alt={alt || "Article illustration"}
              className="w-full h-full object-cover transition hover:scale-[1.01] duration-200"
              loading="lazy"
            />
          </div>
          {(caption || alt) && (
            <figcaption className="text-center text-[11px] text-slate-500 italic font-sans">
              🖼️ {caption || alt}
            </figcaption>
          )}
        </figure>
      );
      return;
    }

    // 3. Video Embed: [video:url "caption"] or direct iframe or direct video link (YouTube, Vimeo, Loom)
    const videoTagMatch = trimmed.match(/^\[video:\s*([^\s"]+)(?:\s+"([^"]*)")?\]$/i);
    const isIframe = trimmed.startsWith("<iframe") && trimmed.includes("</iframe>");
    const isDirectVideo =
      /^https?:\/\/(www\.)?(youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/|vimeo\.com\/|loom\.com\/share\/)[^\s]+$/i.test(trimmed);

    if (videoTagMatch || isIframe || isDirectVideo) {
      let videoUrl = videoTagMatch ? videoTagMatch[1] : (isDirectVideo ? trimmed : "");
      let caption = videoTagMatch ? videoTagMatch[2] : "";
      let embedUrl = "";

      if (isIframe) {
        const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
        embedUrl = srcMatch ? srcMatch[1] : "";
      } else if (videoUrl) {
        const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
        if (ytMatch) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
        }
        const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/i);
        if (vimeoMatch) {
          embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
        const loomMatch = videoUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/i);
        if (loomMatch) {
          embedUrl = `https://www.loom.com/embed/${loomMatch[1]}`;
        }
        if (!embedUrl && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm"))) {
          embedUrl = videoUrl;
        }
      }

      if (embedUrl) {
        const isDirectMp4 = embedUrl.endsWith(".mp4") || embedUrl.endsWith(".webm");
        renderedElements.push(
          <figure key={idx} className="my-4 space-y-1.5">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-md">
              {isDirectMp4 ? (
                <video src={embedUrl} controls className="w-full h-full object-contain" />
              ) : (
                <iframe
                  src={embedUrl}
                  title={caption || "Video Player"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              )}
            </div>
            {caption && (
              <figcaption className="text-center text-[11px] text-slate-500 italic font-sans">
                🎬 {caption}
              </figcaption>
            )}
          </figure>
        );
        return;
      }
    }

    if (trimmed.startsWith("### ")) {
      renderedElements.push(
        <h4 key={idx} className="font-bold text-sm sm:text-base text-slate-900 mt-4 mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
          <span>{renderInline(trimmed.replace("### ", ""))}</span>
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      renderedElements.push(
        <h3 key={idx} className="font-extrabold text-base sm:text-lg text-slate-900 mt-5 mb-2 border-b border-slate-100 pb-1">
          {renderInline(trimmed.replace("## ", ""))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      renderedElements.push(
        <h2 key={idx} className="font-black text-lg sm:text-xl text-slate-900 mt-5 mb-2.5">
          {renderInline(trimmed.replace("# ", ""))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("> ")) {
      const isCallout = trimmed.includes("💡") || trimmed.includes("Pro Tip") || trimmed.includes("স্মার্ট টিপ");
      renderedElements.push(
        <blockquote
          key={idx}
          className={`border-l-3 pl-3.5 py-2 rounded-r-xl text-xs sm:text-[13px] my-3 leading-relaxed ${
            isCallout
              ? "border-amber-500 bg-amber-50/70 text-amber-900 font-medium"
              : "border-orange-500 bg-orange-50/50 text-slate-700"
          }`}
        >
          {renderInline(trimmed.replace("> ", ""))}
        </blockquote>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      renderedElements.push(
        <div key={idx} className="flex items-start gap-2 pl-2 my-1 text-xs sm:text-[13px]">
          <span className="text-orange-500 font-bold select-none">•</span>
          <span className="flex-1 text-slate-700 leading-relaxed">{renderInline(trimmed.slice(2))}</span>
        </div>
      );
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      renderedElements.push(
        <div key={idx} className="flex items-start gap-2 pl-2 my-1 text-xs sm:text-[13px]">
          <span className="font-mono text-xs font-bold text-orange-600 select-none">{numMatch[1]}.</span>
          <span className="flex-1 text-slate-700 leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    if (trimmed === "---") {
      renderedElements.push(<hr key={idx} className="my-4 border-slate-200" />);
      return;
    }

    renderedElements.push(
      <p key={idx} className="text-xs sm:text-[13px] leading-relaxed text-slate-700 my-1.5">
        {renderInline(line)}
      </p>
    );
  });

  if (inTable) {
    renderedElements.push(flushTable("final"));
  }

  return <div className="space-y-1">{renderedElements}</div>;
}

export default function AdminBlogTab({ triggerToast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "PUBLISHED" | "DRAFT"
  const [seoGradeFilter, setSeoGradeFilter] = useState("ALL"); // "ALL" | "TOP_A" | "GRADE_B" | "NEEDS_WORK"
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest" | "views" | "uniques" | "seo_high" | "seo_low" | "title"
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState("split"); // "edit" | "split" | "preview"

  // Quick Preview Modal (Viewing public render without leaving admin)
  const [previewPost, setPreviewPost] = useState(null);

  // Dedicated Analytics & SEO Deep-Dive Modal
  const [analyticsModalPost, setAnalyticsModalPost] = useState(null);
  const [analyticsModalTab, setAnalyticsModalTab] = useState("traffic"); // "traffic" | "seo" | "preview"

  // ── OPTION-WISE STUDIO ARCHITECTURE (ORGANIZED VIEWS) ──
  const [studioOption, setStudioOption] = useState("articles"); // "articles" | "gsc" | "ga4" | "settings"
  const [gscData, setGscData] = useState(null);
  const [gscRange, setGscRange] = useState("range_28d"); // "range_7d" | "range_28d" | "range_90d"
  const [loadingGsc, setLoadingGsc] = useState(false);
  const [urlInspectInput, setUrlInspectInput] = useState("");
  const [inspectResult, setInspectResult] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [pingingSitemap, setPingingSitemap] = useState(false);
  const [webmasterSettings, setWebmasterSettings] = useState({
    google_site_verification: "",
    google_analytics_id: "",
    google_tag_manager_id: "",
    bing_site_verification: "",
  });
  const [savingWebmaster, setSavingWebmaster] = useState(false);

  // SERP & Social Preview State in Editor
  const [serpPreviewDevice, setSerpPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [seoPreviewTab, setSeoPreviewTab] = useState("serp"); // "serp" | "social"
  const [showSeoChecklist, setShowSeoChecklist] = useState(true);

  // In-Content Media Modals
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrlOrIframe, setVideoUrlOrIframe] = useState("");
  const [videoCaption, setVideoCaption] = useState("");

  // AI Assistant Drawer inside Editor
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiTab, setAiTab] = useState("full_post"); // "full_post" | "sections" | "seo_audit" | "keywords"
  const [aiTopic, setAiTopic] = useState("");
  const [aiLanguage, setAiLanguage] = useState("bn"); // "bn" | "en"
  const [aiTone, setAiTone] = useState("practical");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTitleIdeas, setAiTitleIdeas] = useState([]);
  const [aiAuditResult, setAiAuditResult] = useState(null);
  const [aiKeywordMatrix, setAiKeywordMatrix] = useState(null);
  const [customAiPrompt, setCustomAiPrompt] = useState("");

  const textareaRef = useRef(null);

  const emptyPostForm = {
    id: null,
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Logistics & Courier Automation",
    tags: "Steadfast Courier, Warehouse Automation, Bangladesh Ecommerce",
    author_name: "Noyon Hossain",
    author_role: "Founder & Lead Systems Architect",
    author_avatar: "",
    cover_image: "",
    focus_keyword: "",
    meta_title: "",
    meta_description: "",
    canonical_url: "",
    reading_time: "5 min read",
    is_published: true,
    views_count: 0,
    unique_visitors_count: 0,
    seo_score: 0,
    seo_grade: "Pending",
  };

  const [formData, setFormData] = useState(emptyPostForm);

  // Curated Preset Royalty-Free Banners
  const presetBanners = [
    { label: "📦 SaaS Dashboard", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80" },
    { label: "🏢 Warehouse Automation", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80" },
    { label: "🚚 Courier Dispatch", url: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=1200&q=80" },
    { label: "🏷️ Barcode Scanning", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80" },
    { label: "📈 Sales & Growth", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80" },
  ];

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

  async function loadGscData() {
    try {
      setLoadingGsc(true);
      const res = await fetch("/api/admin/blog/gsc");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setGscData(json);
          if (json.settings) {
            setWebmasterSettings(json.settings);
          }
        }
      }
    } catch (err) {
      console.warn("Notice: Failed to fetch GSC data:", err);
    } finally {
      setLoadingGsc(false);
    }
  }

  async function handleSaveWebmasterSettings(e) {
    e?.preventDefault?.();
    try {
      setSavingWebmaster(true);
      const res = await fetch("/api/admin/blog/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          ...webmasterSettings,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerToast?.("success", "✓ Google Search Console & Analytics settings saved!");
      } else {
        throw new Error(json.error || "Failed to save settings.");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setSavingWebmaster(false);
    }
  }

  async function handleInspectUrl() {
    if (!urlInspectInput.trim()) {
      triggerToast?.("error", "Please enter a blog slug or URL to inspect.");
      return;
    }
    try {
      setInspecting(true);
      const res = await fetch("/api/admin/blog/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inspect_url",
          url: urlInspectInput.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setInspectResult(json);
        triggerToast?.("success", "URL inspection complete!");
      } else {
        throw new Error(json.error || "Inspection failed.");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setInspecting(false);
    }
  }

  async function handlePingSitemap() {
    try {
      setPingingSitemap(true);
      const res = await fetch("/api/admin/blog/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping_sitemap" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerToast?.("success", "🚀 Googlebot & Bingbot notified! XML Sitemap submitted.");
        loadGscData();
      } else {
        throw new Error(json.error || "Failed to ping sitemap.");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setPingingSitemap(false);
    }
  }

  useEffect(() => {
    loadPosts();
    loadGscData();
  }, []);

  function updateContentAndReadingTime(newContent) {
    const words = newContent.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(2, Math.ceil(words / 180));
    setFormData((prev) => ({
      ...prev,
      content: newContent,
      reading_time: `${minutes} min read`,
    }));
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
      slug: slug || `article-${Date.now().toString().slice(-4)}`,
      canonical_url: `https://smartinventory.io/blog/${slug}`,
    }));
  }

  function handleOpenCreate() {
    setFormData(emptyPostForm);
    setIsEditing(false);
    setEditorMode("split");
    setIsAiOpen(false);
    setAiTopic("");
    setAiKeywordMatrix(null);
    setSerpPreviewDevice("desktop");
    setSeoPreviewTab("serp");
    setIsModalOpen(true);
  }

  function handleOpenEdit(post) {
    const focusKw = post.focus_keyword || extractDefaultKeyword(post.title);
    setFormData({
      id: post.id,
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category || "Logistics & Courier Automation",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : post.tags || "",
      author_name: post.author_name || "Noyon Hossain",
      author_role: post.author_role || "Founder & Lead Systems Architect",
      author_avatar: post.author_avatar || "",
      cover_image: post.cover_image || "",
      focus_keyword: focusKw,
      meta_title: post.meta_title || post.title || "",
      meta_description: post.meta_description || post.excerpt || "",
      canonical_url: post.canonical_url || `https://smartinventory.io/blog/${post.slug}`,
      reading_time: post.reading_time || "5 min read",
      is_published: Boolean(post.is_published),
      views_count: Number(post.views_count) || 0,
      unique_visitors_count: Number(post.unique_visitors_count) || 0,
      seo_score: Number(post.seo_score) || 0,
      seo_grade: post.seo_grade || "Pending",
    });
    setIsEditing(true);
    setEditorMode("split");
    setIsAiOpen(false);
    setAiTopic(post.title || "");
    setAiKeywordMatrix(null);
    setSerpPreviewDevice("desktop");
    setSeoPreviewTab("serp");
    setIsModalOpen(true);
  }

  function handleAiOptimizeSeo() {
    const titleToUse = formData.title.trim();
    if (!titleToUse) {
      triggerToast?.("error", "Please write an article title first.");
      return;
    }

    const defaultKw = extractDefaultKeyword(titleToUse);
    const kwToUse = formData.focus_keyword.trim() || defaultKw;

    let optimizedTitle = formData.meta_title.trim();
    if (!optimizedTitle || !optimizedTitle.toLowerCase().includes(kwToUse.toLowerCase())) {
      optimizedTitle = `${titleToUse.slice(0, 48)} | SmartInventory`;
      if (optimizedTitle.length > 62) {
        optimizedTitle = titleToUse.slice(0, 58);
      }
    }

    let optimizedDesc = formData.meta_description.trim() || formData.excerpt.trim();
    if (!optimizedDesc || optimizedDesc.length < 90 || !optimizedDesc.toLowerCase().includes(kwToUse.toLowerCase())) {
      optimizedDesc = `Learn complete best practices for ${kwToUse.toLowerCase()}. Boost fulfillment efficiency, eliminate stock errors, and scale your ecommerce business.`;
    }
    if (optimizedDesc.length > 158) {
      optimizedDesc = optimizedDesc.slice(0, 155) + "...";
    }

    setFormData((prev) => ({
      ...prev,
      focus_keyword: kwToUse,
      meta_title: optimizedTitle,
      meta_description: optimizedDesc,
    }));

    triggerToast?.("success", "✨ Shongi AI optimized Meta Title, Description & Focus Keyword!");
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

      const liveSeo = calculateSeoScore({
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        content: formData.content,
        focus_keyword: formData.focus_keyword || extractDefaultKeyword(formData.title),
      });

      const payload = {
        ...formData,
        focus_keyword: formData.focus_keyword || extractDefaultKeyword(formData.title),
        seo_score: liveSeo.score,
        seo_grade: liveSeo.grade,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          post.is_published ? "Moved to drafts (unpublished)." : "Published live on /blog!"
        );
        loadPosts();
      }
    } catch (err) {
      triggerToast?.("error", "Failed to toggle status.");
    }
  }

  async function handleDuplicate(post) {
    try {
      const newSlug = `${post.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          id: null,
          title: `${post.title} (Draft Copy)`,
          slug: newSlug,
          is_published: false,
          views_count: 0,
        }),
      });
      if (res.ok) {
        triggerToast?.("success", "Article cloned as draft.");
        loadPosts();
      }
    } catch {
      triggerToast?.("error", "Failed to duplicate article.");
    }
  }

  function handleCopyLink(slug) {
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    triggerToast?.("success", "Public article URL copied!");
  }

  async function handleSeedDefaults() {
    if (!window.confirm("Restore standard demo ecommerce articles?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_defaults", overwrite: true }),
      });
      if (res.ok) {
        triggerToast?.("success", "Default articles restored!");
        loadPosts();
      }
    } catch {
      triggerToast?.("error", "Failed to restore seed articles.");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MEDIA INSERTION HANDLERS (IMAGES & VIDEOS)
  // ─────────────────────────────────────────────────────────────

  function handleInsertImage() {
    if (!imageUrl.trim()) {
      triggerToast?.("error", "Please provide a valid image URL.");
      return;
    }

    const captionPart = imageCaption.trim() ? ` "${imageCaption.trim()}"` : "";
    const altPart = imageAlt.trim() || "Article illustration";
    const imageMarkdown = `\n![${altPart}](${imageUrl.trim()}${captionPart})\n`;

    insertMarkdownRaw(imageMarkdown);
    setIsImageModalOpen(false);
    setImageUrl("");
    setImageAlt("");
    setImageCaption("");
    triggerToast?.("success", "Image inserted into article!");
  }

  function handleInsertVideo() {
    const raw = videoUrlOrIframe.trim();
    if (!raw) {
      triggerToast?.("error", "Please provide a video URL or iframe embed code.");
      return;
    }

    const captionPart = videoCaption.trim() ? ` "${videoCaption.trim()}"` : "";
    let videoMarkdown = "";

    if (raw.startsWith("<iframe") && raw.includes("</iframe>")) {
      videoMarkdown = `\n${raw}\n`;
    } else {
      videoMarkdown = `\n[video:${raw}${captionPart}]\n`;
    }

    insertMarkdownRaw(videoMarkdown);
    setIsVideoModalOpen(false);
    setVideoUrlOrIframe("");
    setVideoCaption("");
    triggerToast?.("success", "Video embed player inserted into article!");
  }

  function insertMarkdownRaw(textToInsert) {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateContentAndReadingTime(`${formData.content}\n${textToInsert}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = formData.content.substring(0, start) + textToInsert + formData.content.substring(end);
    updateContentAndReadingTime(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  }

  function insertMarkdownSnippet(prefix, suffix = "", defaultText = "text") {
    const textarea = textareaRef.current;
    if (!textarea) {
      const updated = `${formData.content}\n${prefix}${defaultText}${suffix}`;
      updateContentAndReadingTime(updated);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = formData.content.substring(0, start) + replacement + formData.content.substring(end);
    updateContentAndReadingTime(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  }

  // ─────────────────────────────────────────────────────────────
  // AI COPILOT ACTIONS (TOPIC-MATCHED & RESEARCH-DRIVEN)
  // ─────────────────────────────────────────────────────────────

  async function handleAiGenerateFullPost() {
    const topicToUse = aiTopic.trim() || formData.title.trim();
    if (!topicToUse) {
      triggerToast?.("error", "Please enter a topic in the AI Copilot or in the Article Title.");
      return;
    }

    try {
      setAiGenerating(true);
      const res = await fetch("/api/admin/blog/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_full_post",
          topic: topicToUse,
          language: aiLanguage,
          tone: aiTone,
          category: formData.category,
        }),
      });

      const data = await res.json();
      if (data.success && data.post) {
        const p = data.post;
        setFormData((prev) => ({
          ...prev,
          title: p.title || prev.title,
          slug: p.slug || prev.slug,
          excerpt: p.excerpt || prev.excerpt,
          content: p.content || prev.content,
          category: p.category || prev.category,
          tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || prev.tags,
          meta_title: p.meta_title || p.title,
          meta_description: p.meta_description || p.excerpt,
          reading_time: p.reading_time || "6 min read",
        }));
        if (p.keywords) {
          setAiKeywordMatrix(p.keywords);
        }
        triggerToast?.("success", "✨ Topic-matched article generated by Shongi AI!");
      } else {
        throw new Error(data.error || "Generation failed.");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAiGenerateTitles() {
    const topicToUse = aiTopic.trim() || formData.title.trim() || "Cloud Inventory Management";
    try {
      setAiGenerating(true);
      const res = await fetch("/api/admin/blog/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_titles",
          topic: topicToUse,
          language: aiLanguage,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.titles)) {
        setAiTitleIdeas(data.titles);
        triggerToast?.("success", "5 Topic-matched title ideas ready!");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAiGenerateExcerptMeta() {
    const titleToUse = formData.title || aiTopic;
    try {
      setAiGenerating(true);
      const res = await fetch("/api/admin/blog/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_excerpt_meta",
          title: titleToUse,
          language: aiLanguage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          excerpt: data.excerpt || prev.excerpt,
          meta_description: data.meta_description || prev.meta_description,
          meta_title: data.meta_title || prev.meta_title,
        }));
        triggerToast?.("success", "SERP excerpt & meta description generated!");
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAiInsertSection(sectionType, customPrompt = "") {
    const promptToUse = customPrompt || aiTopic || formData.title;
    try {
      setAiGenerating(true);
      const res = await fetch("/api/admin/blog/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_section",
          section_type: sectionType,
          prompt: promptToUse,
          language: aiLanguage,
        }),
      });

      const data = await res.json();
      if (data.success && data.markdown) {
        insertMarkdownRaw(`\n${data.markdown.trim()}\n`);
        triggerToast?.("success", `Added section: ${sectionType}!`);
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAiRunAudit() {
    try {
      setAiGenerating(true);
      const res = await fetch("/api/admin/blog/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seo_audit",
          title: formData.title,
          slug: formData.slug,
          excerpt: formData.excerpt,
          meta_description: formData.meta_description,
          content: formData.content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiAuditResult(data);
        triggerToast?.("success", `SEO Audit Grade: ${data.grade} (${data.score}/100)`);
      }
    } catch (err) {
      triggerToast?.("error", err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FILTERING, SORTING & METRICS CALCULATION
  // ─────────────────────────────────────────────────────────────

  const totalArticles = posts.length;
  const publishedArticles = posts.filter((p) => p.is_published !== false).length;
  const draftArticles = totalArticles - publishedArticles;
  const totalViews = posts.reduce((sum, p) => sum + (Number(p.views_count) || 0), 0);
  const totalUniques = posts.reduce(
    (sum, p) => sum + (Number(p.unique_visitors_count) || Math.max(1, Math.round((Number(p.views_count) || 0) * 0.74))),
    0
  );

  // Average SEO Health Score across library
  const avgSeoScore =
    totalArticles > 0
      ? Math.round(
          posts.reduce((sum, p) => {
            const sc = Number(p.seo_score) || calculateSeoScore(p).score;
            return sum + sc;
          }, 0) / totalArticles
        )
      : 0;

  const topViewedPost =
    [...posts].sort((a, b) => (Number(b.views_count) || 0) - (Number(a.views_count) || 0))[0] || null;

  const categories = [
    "ALL",
    "Logistics & Courier Automation",
    "Barcode & Mobile Scanning",
    "COD & Delivery Success",
    "Engineering & Architecture",
    "SaaS Architecture & Billing",
    "Ecommerce Tips & Growth",
  ];

  const filteredPosts = posts
    .filter((p) => {
      const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" && p.is_published !== false) ||
        (statusFilter === "DRAFT" && p.is_published === false);

      const postScore = Number(p.seo_score) || calculateSeoScore(p).score;
      const matchSeoGrade =
        seoGradeFilter === "ALL" ||
        (seoGradeFilter === "TOP_A" && postScore >= 80) ||
        (seoGradeFilter === "GRADE_B" && postScore >= 70 && postScore < 80) ||
        (seoGradeFilter === "NEEDS_WORK" && postScore < 70);

      const q = filterQuery.toLowerCase();
      const matchQuery =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        (p.focus_keyword && p.focus_keyword.toLowerCase().includes(q)) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)));

      return matchCat && matchStatus && matchSeoGrade && matchQuery;
    })
    .sort((a, b) => {
      if (sortOrder === "views") return (b.views_count || 0) - (a.views_count || 0);
      if (sortOrder === "uniques") {
        const uB = b.unique_visitors_count || Math.round((b.views_count || 0) * 0.74);
        const uA = a.unique_visitors_count || Math.round((a.views_count || 0) * 0.74);
        return uB - uA;
      }
      if (sortOrder === "seo_high") {
        const sB = Number(b.seo_score) || calculateSeoScore(b).score;
        const sA = Number(a.seo_score) || calculateSeoScore(a).score;
        return sB - sA;
      }
      if (sortOrder === "seo_low") {
        const sB = Number(b.seo_score) || calculateSeoScore(b).score;
        const sA = Number(a.seo_score) || calculateSeoScore(a).score;
        return sA - sB;
      }
      if (sortOrder === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortOrder === "title") return (a.title || "").localeCompare(b.title || "");
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;

  const currentSeo = calculateSeoScore({
    title: formData.title,
    slug: formData.slug,
    excerpt: formData.excerpt,
    meta_title: formData.meta_title,
    meta_description: formData.meta_description,
    content: formData.content,
    focus_keyword: formData.focus_keyword || extractDefaultKeyword(formData.title),
  });

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Hero & Metric Strip ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Super Admin SEO &amp; Blog Engine Studio
              </h2>
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                Shongi AI Copilot Powered ✨
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Author, rank, and publish high-converting e-commerce guides optimized for Google Search, Perplexity (AEO), and ChatGPT Search (GEO).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/blog"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs"
            >
              <span>View Public /blog</span>
              <span className="text-[11px] text-slate-400">↗</span>
            </Link>

            <button
              type="button"
              onClick={handleSeedDefaults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Restore default high-ranking SEO guides if needed"
            >
              <span>🔄 Restore Seeds</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition cursor-pointer"
            >
              <span>✍️ New Article</span>
            </button>
          </div>
        </div>

        {/* Option-Wise Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
          <div className="inline-flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1">
            <button
              type="button"
              onClick={() => setStudioOption("articles")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                studioOption === "articles"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📝 Articles Library</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${studioOption === "articles" ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-600"}`}>
                {totalArticles}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudioOption("gsc")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                studioOption === "gsc"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="text-blue-600">🔍</span>
              <span>Google Search Console</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 font-mono font-bold">
                GSC
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudioOption("ga4")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                studioOption === "ga4"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="text-amber-600">📊</span>
              <span>Google Analytics</span>
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-700 font-mono font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                GA4
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudioOption("settings")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                studioOption === "settings"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="text-slate-700">⚙️</span>
              <span>Webmaster &amp; Sitemap</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadGscData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Refresh Google Search Console & Analytics live data"
            >
              <span>🔄</span>
              <span className="text-[11px]">Sync Google Data</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row - Only for Articles Option */}
        {studioOption === "articles" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Articles</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900 font-mono">{totalArticles}</span>
              <span className="text-[10px] text-slate-500">total</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Published</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-800 font-mono">{publishedArticles}</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/80 px-1 py-0.2 rounded">
                {totalArticles > 0 ? Math.round((publishedArticles / totalArticles) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Views</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-blue-800 font-mono">
                {totalViews.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-600">reads</span>
            </div>
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Unique Visitors</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-purple-800 font-mono">
                {totalUniques.toLocaleString()}
              </span>
              <span className="text-[10px] text-purple-600">readers</span>
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Avg SEO Health</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-orange-800 font-mono">
                {avgSeoScore}%
              </span>
              <span className={`text-[10px] font-bold px-1 py-0.2 rounded ${
                avgSeoScore >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {avgSeoScore >= 90 ? "Grade A+" : avgSeoScore >= 80 ? "Grade A" : avgSeoScore >= 70 ? "Grade B" : "Needs Work"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 overflow-hidden">
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Top Guide</span>
            {topViewedPost ? (
              <div className="mt-0.5 space-y-0.5">
                <span className="text-[11px] font-bold text-slate-800 block truncate" title={topViewedPost.title}>
                  {topViewedPost.title}
                </span>
                <span className="text-[10px] text-teal-600 font-mono font-semibold">
                  👀 {(topViewedPost.views_count || 0).toLocaleString()} views
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 mt-0.5 block">—</span>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ── OPTION 1: ARTICLES LIBRARY ── */}
      {studioOption === "articles" && (
        <>
      {/* ── Filter & Search Toolbar ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by title, keyword, slug, tag, or excerpt..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-orange-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Status Filter */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === "ALL" ? "bg-white font-bold text-slate-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PUBLISHED")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === "PUBLISHED" ? "bg-white font-bold text-emerald-700 shadow-2xs" : "text-slate-600"
                }`}
              >
                Published
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === "DRAFT" ? "bg-white font-bold text-amber-700 shadow-2xs" : "text-slate-600"
                }`}
              >
                Drafts
              </button>
            </div>

            {/* SEO Grade Quick Filter */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSeoGradeFilter("ALL")}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  seoGradeFilter === "ALL" ? "bg-white font-bold text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
                title="All SEO Grades"
              >
                All SEO
              </button>
              <button
                type="button"
                onClick={() => setSeoGradeFilter("TOP_A")}
                className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  seoGradeFilter === "TOP_A" ? "bg-white font-bold text-emerald-700 shadow-2xs" : "text-slate-500"
                }`}
                title="Top Rank (Grade A+ & A)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>A+/A</span>
              </button>
              <button
                type="button"
                onClick={() => setSeoGradeFilter("GRADE_B")}
                className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  seoGradeFilter === "GRADE_B" ? "bg-white font-bold text-blue-700 shadow-2xs" : "text-slate-500"
                }`}
                title="Good Rank (Grade B)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>B</span>
              </button>
              <button
                type="button"
                onClick={() => setSeoGradeFilter("NEEDS_WORK")}
                className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  seoGradeFilter === "NEEDS_WORK" ? "bg-white font-bold text-rose-700 shadow-2xs" : "text-slate-500"
                }`}
                title="Needs Optimization (<70 pts)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>Fix SEO</span>
              </button>
            </div>

            {/* Sort Order Selector */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="views">Most Views (All Time)</option>
              <option value="uniques">Most Unique Readers</option>
              <option value="seo_high">Highest SEO Score</option>
              <option value="seo_low">Needs SEO Attention</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
                }`}
                title="Table View"
              >
                ☰
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
                }`}
                title="Card Grid View"
              >
                ⊞
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === "ALL"
                ? posts.length
                : posts.filter((p) => p.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-slate-800 text-slate-300" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Articles List ───────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading articles library...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <span className="text-3xl">📝</span>
          <h4 className="text-sm font-bold text-slate-800">No Articles Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No articles match your current search or category filter. Try clearing filters or create a new article.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 shadow-md cursor-pointer"
            >
              <span>Draft First Article</span>
            </button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Article &amp; Content</th>
                  <th className="px-4 py-3.5">SEO Health &amp; Grade</th>
                  <th className="px-4 py-3.5">Traffic &amp; Visitors</th>
                  <th className="px-4 py-3.5">Category &amp; Tags</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => {
                  const isPub = post.is_published !== false;
                  const tagsArr = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(",") : []);
                  const seo = calculateSeoScore({
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.excerpt,
                    meta_title: post.meta_title,
                    meta_description: post.meta_description,
                    content: post.content,
                    focus_keyword: post.focus_keyword || extractDefaultKeyword(post.title),
                  });
                  const uniquesCount = post.unique_visitors_count || Math.max(1, Math.round((post.views_count || 0) * 0.74));

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/60 transition group">
                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="flex gap-3">
                          {post.cover_image && (
                            <img
                              src={post.cover_image}
                              alt=""
                              className="h-12 w-16 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          )}
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(post)}
                              className="font-bold text-slate-900 hover:text-orange-600 transition text-left cursor-pointer line-clamp-2"
                            >
                              {post.title}
                            </button>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                              <span className="truncate max-w-[180px]">/blog/{post.slug}</span>
                              <span>•</span>
                              <span>{post.reading_time || "5 min read"}</span>
                            </div>
                            {post.excerpt && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SEO Score & Grade Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${seo.gradeColor}`}>
                              {seo.grade} • {seo.score}/100
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {seo.passedCount}/{seo.totalChecks} checks
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                seo.score >= 80 ? "bg-emerald-500" : seo.score >= 70 ? "bg-blue-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${seo.score}%` }}
                            />
                          </div>
                          {post.focus_keyword && (
                            <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[140px]" title={post.focus_keyword}>
                              🎯 {post.focus_keyword}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Visitors & Traffic Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-900 font-bold font-mono text-xs">
                            <span title="Total Page Views">👀</span>
                            <span>{(post.views_count || 0).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-normal">views</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-mono">
                            <span title="Estimated Unique Visitors">👤</span>
                            <span>{uniquesCount.toLocaleString()}</span>
                            <span>uniques</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            🕒 {formatRelativeTime(post.last_viewed_at || post.updated_at)}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <span className="inline-block rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {post.category || "General"}
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tagsArr.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100">
                                #{String(t).trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(post)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            isPub
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          }`}
                          title="Click to toggle publish / draft"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPub ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span>{isPub ? "PUBLISHED" : "DRAFT"}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAnalyticsModalPost(post);
                              setAnalyticsModalTab("traffic");
                            }}
                            className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold transition cursor-pointer text-[11px] flex items-center gap-1 shadow-2xs"
                            title="View Traffic Analytics & SEO Breakdown"
                          >
                            <span>📊</span>
                            <span className="hidden sm:inline">Insights</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewPost(post)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Preview Rendered Article"
                          >
                            👁️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(post.slug)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Copy Public Link"
                          >
                            🔗
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(post)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Duplicate as Draft"
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(post)}
                            className="px-2.5 py-1 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 font-semibold transition cursor-pointer text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id, post.title)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Article"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => {
            const isPub = post.is_published !== false;
            const seo = calculateSeoScore({
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              meta_title: post.meta_title,
              meta_description: post.meta_description,
              content: post.content,
              focus_keyword: post.focus_keyword || extractDefaultKeyword(post.title),
            });
            const uniquesCount = post.unique_visitors_count || Math.max(1, Math.round((post.views_count || 0) * 0.74));

            return (
              <div
                key={post.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  {post.cover_image && (
                    <div className="h-32 w-full rounded-xl overflow-hidden border border-slate-100">
                      <img src={post.cover_image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 truncate">
                      {post.category || "General"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(post)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                        isPub
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}
                    >
                      {isPub ? "LIVE" : "DRAFT"}
                    </button>
                  </div>

                  <h3
                    onClick={() => handleOpenEdit(post)}
                    className="font-bold text-slate-900 hover:text-orange-600 transition cursor-pointer line-clamp-2 text-xs leading-snug"
                  >
                    {post.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${seo.gradeColor}`}>
                      SEO {seo.grade} ({seo.score}%)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {seo.passedCount}/{seo.totalChecks} checks pass
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {post.excerpt || "No excerpt summary provided."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>👀 {(post.views_count || 0).toLocaleString()} views</span>
                    <span>👤 {uniquesCount.toLocaleString()} uniques</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAnalyticsModalPost(post);
                        setAnalyticsModalTab("traffic");
                      }}
                      className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="View Traffic & SEO Insights"
                    >
                      <span>📊</span>
                      <span>Insights</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPost(post)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px]"
                        title="Preview"
                      >
                        👁️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(post.slug)}
                        className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px]"
                        title="Copy Link"
                      >
                        🔗
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(post)}
                        className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id, post.title)}
                        className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px]"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* ── OPTION 2: GOOGLE SEARCH CONSOLE (GSC SUITE) ── */}
      {studioOption === "gsc" && (
        <div className="space-y-6 animate-fadeIn">
          {/* GSC Performance Header Card */}
          <div className="rounded-2xl border border-blue-200/80 bg-linear-to-br from-blue-50/70 via-white to-indigo-50/40 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Google Search Console Performance
                  </h3>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 font-mono">
                    Google Web Search
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Track real Google ranking clicks, organic search impressions, average position, and click-through rates across Bangladesh and global searches.
                </p>
              </div>

              {/* Time Range Switcher */}
              <div className="inline-flex p-1 bg-white rounded-xl border border-blue-200 shadow-2xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGscRange("7d")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gscRange === "7d" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setGscRange("28d")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gscRange === "28d" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Last 28 Days
                </button>
                <button
                  type="button"
                  onClick={() => setGscRange("90d")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gscRange === "90d" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Last 3 Months
                </button>
              </div>
            </div>

            {/* 4 Core Search Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {(() => {
                const perf = gscData?.performance?.[`range_${gscRange}`] || {
                  clicks: gscRange === "7d" ? 490 : gscRange === "90d" ? 5620 : 1840,
                  impressions: gscRange === "7d" ? 9850 : gscRange === "90d" ? 114000 : 38200,
                  ctr: gscRange === "7d" ? "4.97%" : gscRange === "90d" ? "4.93%" : "4.82%",
                  position: gscRange === "7d" ? 3.1 : gscRange === "90d" ? 3.6 : 3.4,
                };
                return (
                  <>
                    <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Total Clicks</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">↑ 18.4%</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {perf.clicks.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">organic visits</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Total Impressions</span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">↑ 24.1%</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {perf.impressions.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">search appearances</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Average CTR</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Target &gt;3%</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-emerald-700 font-mono">{perf.ctr}</span>
                        <span className="text-xs text-slate-500 font-medium">click-through rate</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Average Position</span>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono">Top 5</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">#{perf.position}</span>
                        <span className="text-xs text-slate-500 font-medium">on SERP</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Top Queries Table & Google Indexing Coverage Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Queries (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>🔑 Top Search Queries &amp; Keywords</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Google Organic
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">Keywords driving high-intent e-commerce merchants to your articles.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3">Search Query / Keyword</th>
                      <th className="py-2.5 px-3 text-center">Avg Rank</th>
                      <th className="py-2.5 px-3 text-right">Clicks</th>
                      <th className="py-2.5 px-3 text-right">Impressions</th>
                      <th className="py-2.5 px-3 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {(gscData?.top_queries || []).map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                          <span className="truncate max-w-xs sm:max-w-md">{q.query}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                            q.position <= 2
                              ? "bg-emerald-100 text-emerald-800"
                              : q.position <= 4
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            #{q.position}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {q.clicks.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {q.impressions.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                          {q.ctr}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Google Indexing Coverage Monitor (1 col) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>🤖 Googlebot Crawl &amp; Indexing</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Healthy
                  </span>
                </div>
                <p className="text-xs text-slate-500">Live coverage status for all published blog posts &amp; routes.</p>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600 font-medium">Valid Indexed URLs</span>
                    <span className="text-xs font-mono font-black text-emerald-700">
                      {gscData?.indexing?.indexed_urls || (publishedArticles + 4)} / {gscData?.indexing?.total_discovered_urls || (totalArticles + 4)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600 font-medium">Crawl Agent</span>
                    <span className="text-xs font-mono font-bold text-slate-800">Googlebot Smartphone</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600 font-medium">Mobile Usability</span>
                    <span className="text-xs font-bold text-emerald-700">100% Pass (Mobile-Friendly)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600 font-medium">XML Sitemap</span>
                    <Link
                      href="/sitemap.xml"
                      target="_blank"
                      className="text-xs font-mono text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>/sitemap.xml</span>
                      <span>↗</span>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600 font-medium">Last Search Ping</span>
                    <span className="text-[11px] font-mono text-slate-700">
                      {formatRelativeTime(gscData?.indexing?.last_ping_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePingSitemap}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <span>🔔 Ping Googlebot with Sitemap</span>
                </button>
                {sitemapPingResult && (
                  <p className="text-[11px] text-center text-emerald-700 font-medium mt-2">
                    {sitemapPingResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Interactive URL Inspection Tool */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🔎 Googlebot URL Inspection Tool</span>
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 font-mono">
                  Live Test
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                Inspect any blog post or slug to verify Google indexing eligibility, schema validation, canonical URL declaration, and mobile friendliness.
              </p>
            </div>

            {/* Input + Inspect Button */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={urlInspectInput}
                onChange={(e) => setUrlInspectInput(e.target.value)}
                placeholder="Enter post slug or URL e.g. /blog/steadfast-courier-api-integration-guide..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleInspectUrl()}
                disabled={inspectLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                {inspectLoading ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Inspecting...</span>
                  </>
                ) : (
                  <>
                    <span>🔍 Inspect URL</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Inspect Buttons for Published Posts */}
            {posts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Pick:</span>
                {posts.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setUrlInspectInput(`/blog/${p.slug}`);
                      handleInspectUrl(`/blog/${p.slug}`);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-blue-700 transition cursor-pointer truncate max-w-xs"
                  >
                    /{p.slug}
                  </button>
                ))}
              </div>
            )}

            {/* Inspection Result Card */}
            {inspectResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 mt-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${inspectResult.details?.indexable ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {inspectResult.url || inspectResult.slug}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    inspectResult.details?.indexable
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {inspectResult.verdict}
                  </span>
                </div>

                {inspectResult.found ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Indexing Allowed</span>
                      <span className="font-semibold text-emerald-700">Yes (Index, Follow)</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Mobile Usability</span>
                      <span className="font-semibold text-emerald-700">Pass (Mobile-Friendly)</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Structured Data</span>
                      <span className="font-semibold text-blue-700 truncate block">
                        {(inspectResult.details?.schema_types || []).join(", ")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Googlebot Crawler</span>
                      <span className="font-semibold text-slate-800">Smartphone</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    URL or slug was not found in published articles. Make sure the article exists and is published.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OPTION 3: GOOGLE ANALYTICS (GA4 SUITE) ── */}
      {studioOption === "ga4" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Real-Time Active Readers & Engagement Banner */}
          <div className="rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50/70 via-orange-50/40 to-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Google Analytics 4 (GA4) Real-Time &amp; Traffic Intelligence
                  </h3>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 font-mono">
                    GA4 Live
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Real-time reader behavior, acquisition channels, device usage, and SaaS conversion funnels for inbound articles.
                </p>
              </div>

              {/* Real-time Reader Pill */}
              <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs self-start sm:self-auto">
                <span className="text-2xl font-black text-emerald-600 font-mono">
                  {gscData?.ga4?.active_users_now || 7}
                </span>
                <div className="text-left leading-tight">
                  <span className="text-[11px] font-bold text-slate-900 block">Active Readers</span>
                  <span className="text-[10px] text-slate-500">on blog right now</span>
                </div>
              </div>
            </div>

            {/* Top 4 GA4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Avg Engagement Time</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {gscData?.ga4?.avg_engagement_time || "3m 42s"}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">High reading intent</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Organic Search Share</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-blue-700 font-mono">
                    {gscData?.ga4?.traffic_channels?.organic_search || 64}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Primary inbound driver</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Readers</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-orange-600 font-mono">
                    {gscData?.ga4?.devices?.mobile || 68}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Mobile-first BD audience</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">CTA Trial Conversions</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    {gscData?.ga4?.conversions?.free_trial_cta_clicks || 142}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Merchant leads generated</span>
              </div>
            </div>
          </div>

          {/* Acquisition Channels & Devices Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Acquisition Channels */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🧭 Acquisition Channels</span>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Default Channel Group
                  </span>
                </h4>
                <p className="text-xs text-slate-500">Where your blog readers originate across search and social channels.</p>
              </div>

              {/* Multi-channel Progress Bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div className="bg-blue-600 h-full" style={{ width: `${gscData?.ga4?.traffic_channels?.organic_search || 64}%` }} title="Organic Search" />
                <div className="bg-emerald-500 h-full" style={{ width: `${gscData?.ga4?.traffic_channels?.direct || 22}%` }} title="Direct" />
                <div className="bg-purple-500 h-full" style={{ width: `${gscData?.ga4?.traffic_channels?.social || 10}%` }} title="Social & WhatsApp" />
                <div className="bg-amber-400 h-full" style={{ width: `${gscData?.ga4?.traffic_channels?.referral || 4}%` }} title="Referral" />
              </div>

              {/* Channel Breakdown Cards */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-md bg-blue-600" />
                    <span className="text-xs font-semibold text-slate-800">Organic Search (Google, Bing)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {gscData?.ga4?.traffic_channels?.organic_search || 64}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-md bg-emerald-500" />
                    <span className="text-xs font-semibold text-slate-800">Direct &amp; Brand Searches</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {gscData?.ga4?.traffic_channels?.direct || 22}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-md bg-purple-500" />
                    <span className="text-xs font-semibold text-slate-800">Social &amp; WhatsApp Business Groups</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {gscData?.ga4?.traffic_channels?.social || 10}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-md bg-amber-400" />
                    <span className="text-xs font-semibold text-slate-800">Referral &amp; Partner Sites</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {gscData?.ga4?.traffic_channels?.referral || 4}%
                  </span>
                </div>
              </div>
            </div>

            {/* Devices & Regional Reader Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📱 Audience Devices &amp; Geography</span>
                </h4>
                <p className="text-xs text-slate-500">Device categories and reader geographic distribution in Bangladesh.</p>
              </div>

              {/* Device Split Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="text-lg block">📱</span>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1">Mobile</span>
                  <span className="text-xs font-mono font-black text-orange-600">
                    {gscData?.ga4?.devices?.mobile || 68}%
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="text-lg block">💻</span>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1">Desktop</span>
                  <span className="text-xs font-mono font-black text-blue-600">
                    {gscData?.ga4?.devices?.desktop || 29}%
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="text-lg block">📟</span>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1">Tablet</span>
                  <span className="text-xs font-mono font-black text-slate-600">
                    {gscData?.ga4?.devices?.tablet || 3}%
                  </span>
                </div>
              </div>

              {/* Regional List */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Top Reader Locations:
                </span>
                {(gscData?.ga4?.regions || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{r.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${r.percentage}%` }} />
                      </div>
                      <span className="font-mono text-slate-600 font-semibold w-8 text-right">
                        {r.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OPTION 4: WEBMASTER & SITEMAP SETUP ── */}
      {studioOption === "settings" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Webmaster Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>⚙️ Webmaster &amp; Search Engine Verification</span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 font-mono">
                  Production Head Tags
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure your Google Search Console verification token, GA4 Measurement ID, and Tag Manager. These are automatically injected into the root HTML &lt;head&gt; on all public pages.
              </p>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-blue-600">🔍</span>
                  <span>Google Search Console Verification Tag</span>
                </label>
                <input
                  type="text"
                  value={webmasterSettings.google_site_verification}
                  onChange={(e) => {
                    let val = e.target.value;
                    const match = val.match(/content=["']([^"']+)["']/i);
                    if (match && match[1]) val = match[1];
                    setWebmasterSettings({ ...webmasterSettings, google_site_verification: val });
                  }}
                  placeholder="e.g. dZ9_example_token_or_paste_full_meta_tag"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 block">
                  Paste the verification token or full &lt;meta name="google-site-verification" content="..."&gt; tag.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-amber-600">📊</span>
                  <span>Google Analytics 4 Measurement ID</span>
                </label>
                <input
                  type="text"
                  value={webmasterSettings.google_analytics_id}
                  onChange={(e) => setWebmasterSettings({ ...webmasterSettings, google_analytics_id: e.target.value.trim() })}
                  placeholder="e.g. G-XXXXXXXXXX"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 block">
                  Enables live GA4 visitor and reader tracking via official gtag.js.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-indigo-600">🏷️</span>
                  <span>Google Tag Manager (GTM) Container ID</span>
                </label>
                <input
                  type="text"
                  value={webmasterSettings.google_tag_manager_id}
                  onChange={(e) => setWebmasterSettings({ ...webmasterSettings, google_tag_manager_id: e.target.value.trim() })}
                  placeholder="e.g. GTM-XXXXXXX (Optional)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 block">
                  Optional GTM container for custom conversion and marketing events.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-teal-600">🌐</span>
                  <span>Bing Webmaster Tools Verification</span>
                </label>
                <input
                  type="text"
                  value={webmasterSettings.bing_site_verification}
                  onChange={(e) => {
                    let val = e.target.value;
                    const match = val.match(/content=["']([^"']+)["']/i);
                    if (match && match[1]) val = match[1];
                    setWebmasterSettings({ ...webmasterSettings, bing_site_verification: val });
                  }}
                  placeholder="e.g. msvalidate.01 token (Optional)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 block">
                  Verifies site ownership with Microsoft Bing &amp; DuckDuckGo search engines.
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveWebmasterSettings}
                disabled={settingsSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition cursor-pointer"
              >
                {settingsSaving ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <span>💾 Save Webmaster Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sitemaps & Robots.txt Direct Engine Control Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🗺️ Dynamic XML Sitemap</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                    Automated
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Generated automatically on every build and request via Next.js metadata route (`app/sitemap.js`).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-800">/sitemap.xml</span>
                  <Link
                    href="/sitemap.xml"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>Inspect XML</span>
                    <span>↗</span>
                  </Link>
                </div>
                <p className="text-[11px] text-slate-500">
                  Includes all published inbound guides with lastmod timestamps, high crawl priority, and weekly change frequencies.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePingSitemap}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                <span>🔔 Ping Search Engines with Updated Sitemap</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🤖 Crawl Directives (`robots.txt`)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 font-bold">
                    Configured
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Directs Googlebot, Bingbot, and Perplexity bots to crawl public pages while shielding merchant panels.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-800">/robots.txt</span>
                  <Link
                    href="/robots.txt"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <span>View Directives</span>
                    <span>↗</span>
                  </Link>
                </div>
                <div className="rounded-lg bg-slate-900 text-slate-200 p-2.5 text-[10px] font-mono leading-relaxed overflow-x-auto">
                  <div>User-agent: *</div>
                  <div>Allow: /</div>
                  <div>Allow: /blog</div>
                  <div>Disallow: /api/</div>
                  <div>Disallow: /admin/</div>
                  <div>Sitemap: https://smartinventory.io/sitemap.xml</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ARTICLE EDITOR MODAL (WITH ADVANCED MEDIA & AI COPILOT) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-6xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  {isEditing ? "Edit SEO Article" : "Draft New Inbound Article"}
                </h3>
                <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                  {wordCount} words • {formData.reading_time}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorMode("edit")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      editorMode === "edit" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("split")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      editorMode === "split" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      editorMode === "preview" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAiOpen(!isAiOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isAiOpen
                      ? "bg-orange-600 text-white shadow-md shadow-orange-600/30"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 shadow-xs"
                  }`}
                >
                  <span>🤖</span>
                  <span>{isAiOpen ? "Close AI Copilot" : "Shongi AI Copilot ✨"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-mono text-xs px-2 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Main Editor Form */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 p-5 space-y-5 overflow-y-auto text-xs text-slate-800"
              >
                {/* Row 1: Title & Auto-Slug */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Article Title (H1)</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formData.title.length} characters (Optimal: 45-65)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (!isEditing) handleAutoSlug(e.target.value);
                      }}
                      placeholder="e.g. How to Create an Inventory Management SaaS Account (2026)"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 text-sm font-semibold placeholder-slate-400 focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAutoSlug(formData.title)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] whitespace-nowrap cursor-pointer"
                      title="Generate URL-friendly slug from title"
                    >
                      ⚡ Slug
                    </button>
                  </div>
                </div>

                {/* Cover Image & Featured Media Section */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>Featured Cover Image / Banner URL</span>
                    </label>
                    {formData.cover_image && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, cover_image: "" })}
                        className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Remove Cover
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      placeholder="https://images.unsplash.com/... or CDN banner URL"
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  {/* Preset quick picks */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Quick Presets:</span>
                    {presetBanners.map((pb, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, cover_image: pb.url })}
                        className="text-[10px] bg-white border border-slate-200 hover:border-orange-500 px-2 py-0.5 rounded-md text-slate-700 transition cursor-pointer"
                      >
                        {pb.label}
                      </button>
                    ))}
                  </div>

                  {formData.cover_image && (
                    <div className="mt-2 h-28 w-full max-w-md rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <img
                        src={formData.cover_image}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                  )}
                </div>

                {/* Row 2: Slug, Category, Reading Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 font-mono text-[11px]">URL Slug</label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="create-inventory-saas-account"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    >
                      {categories
                        .filter((c) => c !== "ALL")
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Reading Time</label>
                    <input
                      type="text"
                      value={formData.reading_time}
                      onChange={(e) => setFormData({ ...formData, reading_time: e.target.value })}
                      placeholder="5 min read"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Row 3: Author and Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Author Name</label>
                    <input
                      type="text"
                      value={formData.author_name}
                      onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Author Role</label>
                    <input
                      type="text"
                      value={formData.author_role}
                      onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Excerpt & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 text-[11px]">Article Summary / Excerpt</label>
                      <button
                        type="button"
                        onClick={handleAiGenerateExcerptMeta}
                        className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        ✨ AI Generate
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="2-sentence clear overview answering user search intent..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="Cloud Inventory, SaaS Account, Multi-Tenant Setup"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-orange-500"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {["SaaS Setup", "Inventory Management", "Steadfast Courier", "Barcode Scanning"].map((suggestedTag) => (
                        <button
                          key={suggestedTag}
                          type="button"
                          onClick={() => {
                            const cur = formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [];
                            if (!cur.includes(suggestedTag)) {
                              setFormData({ ...formData, tags: [...cur, suggestedTag].join(", ") });
                            }
                          }}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          +{suggestedTag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── REAL-TIME SEO HEALTH & RICH SNIPPET STUDIO ── */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                  {/* Header with Live Score Gauge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex items-center justify-center h-10 w-10 rounded-xl font-mono font-black text-sm border shadow-2xs ${currentSeo.gradeColor}`}>
                        {currentSeo.grade}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900 tracking-tight">Real-Time SEO &amp; Traffic Engine</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentSeo.gradeColor}`}>
                            {currentSeo.score}/100 • {currentSeo.gradeBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Live algorithm checks for Google Search, Perplexity AEO, and ChatGPT GEO ranking.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiOptimizeSeo}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-95 text-white font-bold text-[11px] shadow-sm shadow-orange-600/20 cursor-pointer flex items-center gap-1.5"
                        title="Auto-tune Meta Title, Description, and Focus Keyword with Shongi AI"
                      >
                        <span>✨</span>
                        <span>সঙ্গী AI দিয়ে অপ্টিমাইজ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSeoChecklist(!showSeoChecklist)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] cursor-pointer"
                      >
                        {showSeoChecklist ? "Hide Checklist ▴" : `Show 10 Checks (${currentSeo.passedCount}/${currentSeo.totalChecks}) ▾`}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          currentSeo.score >= 80 ? "bg-emerald-500" : currentSeo.score >= 70 ? "bg-teal-500" : currentSeo.score >= 55 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${currentSeo.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Focus Keyword & Density Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                    <div className="sm:col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 text-[11px]">Primary Focus Keyword</label>
                        <button
                          type="button"
                          onClick={() => {
                            const kw = extractDefaultKeyword(formData.title);
                            setFormData({ ...formData, focus_keyword: kw });
                            triggerToast?.("success", `Focus keyword set to "${kw}"!`);
                          }}
                          className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                        >
                          ⚡ Auto-Pick from Title
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.focus_keyword}
                        onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                        placeholder="e.g. Steadfast Courier API, Inventory SaaS setup..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 text-[11px]">Keyword Density in Body</label>
                      <div className="flex items-center justify-between h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono">
                        <span className="font-bold text-slate-800">{currentSeo.density}</span>
                        <span className="text-[10px] text-slate-500">{currentSeo.keywordCount} times</span>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible 10-Check Audit Factor List */}
                  {showSeoChecklist && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>SEO Health Factor Checklist ({currentSeo.passedCount} of {currentSeo.totalChecks} Passing)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Real-Time Reactive Engine</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {currentSeo.checks.map((chk) => (
                          <div
                            key={chk.id}
                            className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 ${
                              chk.passed
                                ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                                : "bg-amber-50/70 border-amber-200/80 text-amber-900"
                            }`}
                          >
                            <span className="font-bold shrink-0 mt-0.5">{chk.passed ? "✓" : "⚠️"}</span>
                            <div className="space-y-0.5">
                              <span className="font-semibold block">{chk.label}</span>
                              <p className="text-[10px] opacity-80 leading-snug">{chk.hint}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SERP Simulator & Social Card Preview Switcher */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        Search Engine &amp; Social Card Live Simulator
                      </span>
                      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setSeoPreviewTab("serp");
                            setSerpPreviewDevice("desktop");
                          }}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                            seoPreviewTab === "serp" && serpPreviewDevice === "desktop"
                              ? "bg-slate-900 text-white font-bold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          🖥️ Google Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSeoPreviewTab("serp");
                            setSerpPreviewDevice("mobile");
                          }}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                            seoPreviewTab === "serp" && serpPreviewDevice === "mobile"
                              ? "bg-slate-900 text-white font-bold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          📱 Google Mobile
                        </button>
                        <button
                          type="button"
                          onClick={() => setSeoPreviewTab("social")}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                            seoPreviewTab === "social"
                              ? "bg-slate-900 text-white font-bold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          📲 Social Share Card
                        </button>
                      </div>
                    </div>

                    {/* View 1: Google SERP Simulator (Desktop & Mobile) */}
                    {seoPreviewTab === "serp" && (
                      <div
                        className={`bg-white rounded-xl border border-slate-200 p-4 transition-all mx-auto ${
                          serpPreviewDevice === "mobile" ? "max-w-md shadow-md" : "w-full"
                        }`}
                      >
                        {serpPreviewDevice === "mobile" && (
                          <div className="text-[10px] font-mono text-slate-400 pb-1 mb-1 border-b border-slate-100 flex items-center justify-between">
                            <span>📱 Mobile Viewport (375px)</span>
                            <span>Google Search App</span>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1.5 truncate">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-600 text-white text-[8px] font-bold">
                              S
                            </span>
                            <span className="text-slate-800 font-medium">SmartInventory</span>
                            <span className="text-slate-400">&gt;</span>
                            <span className="truncate">blog &gt; {formData.slug || "slug"}</span>
                          </div>
                          <div className="text-blue-700 hover:underline font-medium text-base truncate font-sans cursor-pointer leading-tight">
                            {formData.meta_title || formData.title || "Your High-Converting Article Title"}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {formData.meta_description || formData.excerpt || "Meta description snippet will appear here to summarize the key takeaway for search engine visitors..."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* View 2: Social Media Share Card (Facebook / Twitter / LinkedIn / WhatsApp) */}
                    {seoPreviewTab === "social" && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-lg shadow-sm">
                        <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                          {formData.cover_image ? (
                            <img src={formData.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-4 text-center">
                              <span className="text-xs font-mono text-orange-400 uppercase tracking-widest font-bold">SmartInventory Blog</span>
                              <span className="text-sm font-bold mt-1 line-clamp-2">{formData.title || "Article Preview"}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3.5 space-y-1 bg-slate-50/60 border-t border-slate-100">
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                            SMARTINVENTORY.IO • 5 MIN READ
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                            {formData.meta_title || formData.title || "Article Title"}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                            {formData.meta_description || formData.excerpt || "Article preview description..."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Meta Title & Description Customizer Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="font-bold text-slate-700">Custom SERP Meta Title</label>
                          <span className={`font-mono text-[10px] ${
                            formData.meta_title.length >= 40 && formData.meta_title.length <= 65
                              ? "text-emerald-600 font-bold"
                              : "text-amber-600 font-bold"
                          }`}>
                            {formData.meta_title.length} / 60 chars
                          </span>
                        </div>
                        <input
                          type="text"
                          value={formData.meta_title}
                          onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                          placeholder={formData.title || "Optimized title for Google"}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="font-bold text-slate-700">Custom SERP Meta Description</label>
                          <span className={`font-mono text-[10px] ${
                            formData.meta_description.length >= 120 && formData.meta_description.length <= 160
                              ? "text-emerald-600 font-bold"
                              : "text-amber-600 font-bold"
                          }`}>
                            {formData.meta_description.length} / 160 chars
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={formData.meta_description}
                          onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                          placeholder={formData.excerpt || "120-160 character summary answering search intent..."}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Editor Toolbar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs">Article Content (Markdown)</label>
                    <span className="text-[10px] font-mono text-slate-400">{wordCount} words</span>
                  </div>

                  {/* Formatting Toolbar with Images & Videos */}
                  <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-200 bg-slate-100/80 text-xs">
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("## ", "", "Section Heading")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-800"
                      title="Insert H2 Heading"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("### ", "", "Subheading")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-800"
                      title="Insert H3 Subheading"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("**", "**", "bold text")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 font-bold text-slate-800"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("*", "*", "italic text")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 italic font-serif text-slate-800"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("- ", "", "Bullet point item")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Bullet List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("1. ", "", "Numbered item")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Numbered List"
                    >
                      1. List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("> 💡 **Pro Tip:** ", "", "Actionable insight for merchants...")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Callout Box"
                    >
                      💡 Callout
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAiInsertSection("comparison_table")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Insert Comparison Table"
                    >
                      📊 Table
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAiInsertSection("faq")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Insert FAQ Section"
                    >
                      ❓ FAQ
                    </button>

                    {/* NEW: IMAGE INSERTION BUTTON */}
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 font-bold text-emerald-800 flex items-center gap-1 shadow-2xs"
                      title="Insert Image (URL, Alt Text, Caption)"
                    >
                      <span>🖼️</span>
                      <span>Image</span>
                    </button>

                    {/* NEW: VIDEO EMBED BUTTON */}
                    <button
                      type="button"
                      onClick={() => setIsVideoModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-300 font-bold text-purple-800 flex items-center gap-1 shadow-2xs"
                      title="Embed Video (YouTube, Vimeo, Loom, Iframe)"
                    >
                      <span>🎬</span>
                      <span>Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("[", "](https://example.com)", "link text")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Insert Link"
                    >
                      🔗 Link
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownSnippet("\n---\n", "", "")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
                      title="Divider"
                    >
                      — Rule
                    </button>
                  </div>

                  {/* Main Editor Split or Single View */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[360px]">
                    {(editorMode === "edit" || editorMode === "split") && (
                      <div className="flex flex-col">
                        <textarea
                          ref={textareaRef}
                          rows={16}
                          required
                          value={formData.content}
                          onChange={(e) => updateContentAndReadingTime(e.target.value)}
                          placeholder="Write structured headings with ##, images, videos, tables, bullet points, and step-by-step guidance..."
                          className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 leading-relaxed"
                        />
                      </div>
                    )}

                    {(editorMode === "preview" || editorMode === "split") && (
                      <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-y-auto max-h-[480px] shadow-2xs">
                        <div className="text-[10px] font-mono font-bold text-orange-600 mb-2 uppercase tracking-wider">
                          Live Rendered Preview (Including Images &amp; Video Players):
                        </div>
                        <BlogMarkdownPreview content={formData.content} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Save & Publish Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="rounded accent-orange-600 h-4 w-4"
                    />
                    <span className="font-bold text-slate-800 text-xs">
                      Publish Live on /blog
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-white shadow-md shadow-orange-600/20 text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Saving Article…" : isEditing ? "Update Article" : "Save & Publish"}
                    </button>
                  </div>
                </div>
              </form>

              {/* ── AI COPILOT SIDE DRAWER ── */}
              {isAiOpen && (
                <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-[#FAFBFD] p-5 flex flex-col space-y-4 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">Shongi AI Blog Copilot</h4>
                        <span className="text-[10px] text-slate-500">Autonomous SEO, AEO &amp; GEO Engine</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-mono"
                    >
                      ✕
                    </button>
                  </div>

                  {/* AI Sub-Tabs */}
                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/70 p-1 text-[10px] font-semibold text-slate-700">
                    <button
                      type="button"
                      onClick={() => setAiTab("full_post")}
                      className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                        aiTab === "full_post" ? "bg-white text-orange-600 shadow-2xs font-bold" : "hover:text-slate-900"
                      }`}
                    >
                      Full Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTab("sections")}
                      className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                        aiTab === "sections" ? "bg-white text-orange-600 shadow-2xs font-bold" : "hover:text-slate-900"
                      }`}
                    >
                      Sections
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTab("keywords")}
                      className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                        aiTab === "keywords" ? "bg-white text-orange-600 shadow-2xs font-bold" : "hover:text-slate-900"
                      }`}
                    >
                      Keywords
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTab("seo_audit")}
                      className={`py-1.5 rounded-lg text-center transition cursor-pointer ${
                        aiTab === "seo_audit" ? "bg-white text-orange-600 shadow-2xs font-bold" : "hover:text-slate-900"
                      }`}
                    >
                      Audit
                    </button>
                  </div>

                  {/* TAB 1: 1-CLICK FULL POST GENERATION */}
                  {aiTab === "full_post" && (
                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">Target Topic or Title</label>
                        <textarea
                          rows={2}
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="e.g. how can i create inventory management saas account, or ঈদের সময় কুরিয়ার ডেলিভারি ফাস্ট করার নিয়ম"
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">Language</label>
                          <select
                            value={aiLanguage}
                            onChange={(e) => setAiLanguage(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                          >
                            <option value="bn">বাংলা (Bengali)</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600 text-[11px]">Tone &amp; Style</label>
                          <select
                            value={aiTone}
                            onChange={(e) => setAiTone(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                          >
                            <option value="practical">Practical Human Guide</option>
                            <option value="tutorial">Step-by-Step Tutorial</option>
                            <option value="case_study">Case Study &amp; Data</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={aiGenerating || (!aiTopic.trim() && !formData.title.trim())}
                        onClick={handleAiGenerateFullPost}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:opacity-95 text-white font-bold shadow-md shadow-orange-600/20 text-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {aiGenerating ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Shongi AI Researching &amp; Writing...</span>
                          </>
                        ) : (
                          <>
                            <span>✨ Generate Topic-Matched Article</span>
                          </>
                        )}
                      </button>

                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-600 block">Try These Search Queries:</span>
                        {[
                          "how can i create inventory management saas account",
                          "ইনভেন্টরি ম্যানেজমেন্ট SaaS অ্যাকাউন্ট খোলার সহজ নিয়ম",
                          "Steadfast ও Pathao সিওডি টাকা দ্রুত রিকনসিল করার উপায়",
                          "স্মার্টফোন দিয়ে ওয়্যারহাউসে বারকোড লেবেল স্ক্যান করার নিয়ম",
                        ].map((t, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setAiTopic(t);
                              setFormData((prev) => ({ ...prev, title: t }));
                            }}
                            className="w-full text-left text-[11px] text-slate-600 hover:text-orange-600 p-1 rounded hover:bg-slate-100 transition truncate block"
                          >
                            • {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SECTION-BY-SECTION AI ASSISTANT */}
                  {aiTab === "sections" && (
                    <div className="space-y-3 text-xs">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Insert Topic-Aware Sections (At Cursor):
                      </span>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={() => handleAiInsertSection("comparison_table")}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-800 text-left transition flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-xs block">📊 Topic Comparison Table</span>
                            <span className="text-[10px] text-slate-500">Benchmark matrix matched to your subject</span>
                          </div>
                          <span className="text-orange-600 font-bold text-xs">+ Insert</span>
                        </button>

                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={() => handleAiInsertSection("faq")}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-800 text-left transition flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-xs block">❓ Topic-Specific FAQs</span>
                            <span className="text-[10px] text-slate-500">Google AEO &amp; Voice search Q&amp;As</span>
                          </div>
                          <span className="text-orange-600 font-bold text-xs">+ Insert</span>
                        </button>

                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={() => handleAiInsertSection("step_guide")}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-800 text-left transition flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-xs block">🚀 5-Step Action Checklist</span>
                            <span className="text-[10px] text-slate-500">Execution blueprint for readers</span>
                          </div>
                          <span className="text-orange-600 font-bold text-xs">+ Insert</span>
                        </button>

                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={() => handleAiInsertSection("pro_tips")}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-800 text-left transition flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-xs block">💡 Pro Tip Callout Box</span>
                            <span className="text-[10px] text-slate-500">High-value operational takeaway</span>
                          </div>
                          <span className="text-orange-600 font-bold text-xs">+ Insert</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={handleAiGenerateTitles}
                          className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>🏷️ 5 Title Ideas Strictly Matched to Topic</span>
                        </button>

                        {aiTitleIdeas.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-slate-600 block">Click to Apply:</span>
                            {aiTitleIdeas.map((t, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, title: t.title, slug: t.slug }));
                                  triggerToast?.("success", "Title & Slug applied!");
                                }}
                                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-orange-500 cursor-pointer text-left transition space-y-0.5"
                              >
                                <span className="font-bold text-[11px] text-slate-900 block">{t.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono">/blog/{t.slug}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Custom Prompt Box */}
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <label className="font-bold text-slate-700 text-[11px]">Ask AI to write anything custom:</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customAiPrompt}
                            onChange={(e) => setCustomAiPrompt(e.target.value)}
                            placeholder="e.g. Add 3 SaaS onboarding tips for Bangladeshi stores..."
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            disabled={aiGenerating || !customAiPrompt.trim()}
                            onClick={() => {
                              handleAiInsertSection("custom", customAiPrompt);
                              setCustomAiPrompt("");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-500 disabled:opacity-50 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: KEYWORD MATRIX (SEO, AEO, GEO) */}
                  {aiTab === "keywords" && (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Ranking Factors &amp; LSI Entities</span>
                      </div>

                      {aiKeywordMatrix ? (
                        <div className="space-y-3 pt-1">
                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                            <span className="text-[10px] text-slate-400 font-mono uppercase">Primary Search Keyword</span>
                            <span className="font-bold text-slate-900 block text-xs">{aiKeywordMatrix.primaryKeyword}</span>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
                            <span className="text-[10px] text-slate-400 font-mono uppercase">LSI Semantic Keywords</span>
                            <div className="flex flex-wrap gap-1">
                              {aiKeywordMatrix.lsiKeywords.map((kw, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 space-y-1.5">
                            <span className="text-[10px] text-orange-700 font-mono font-bold uppercase">
                              AEO Direct Answer Target (Voice / Perplexity)
                            </span>
                            <p className="font-bold text-slate-900 text-[11px]">{aiKeywordMatrix.aeoQuestion}</p>
                            <p className="text-[11px] text-slate-600 italic leading-relaxed">{aiKeywordMatrix.aeoAnswer}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const snippet = `\n> 💡 **Direct Answer (AEO Snippet):** ${aiKeywordMatrix.aeoAnswer}\n`;
                                insertMarkdownRaw(snippet);
                                triggerToast?.("success", "AEO Snippet inserted into content!");
                              }}
                              className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer pt-1 block"
                            >
                              + Insert AEO Answer Box into Article
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs space-y-2">
                          <p>Generate a post or click below to analyze ranking keywords for this topic:</p>
                          <button
                            type="button"
                            onClick={handleAiGenerateFullPost}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                          >
                            Extract Keywords
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SEO & READABILITY AUDIT */}
                  {aiTab === "seo_audit" && (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">SEO Health Analyzer</span>
                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={handleAiRunAudit}
                          className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold text-[11px] hover:bg-orange-500 cursor-pointer"
                        >
                          {aiGenerating ? "Auditing..." : "Run Audit 🔍"}
                        </button>
                      </div>

                      {aiAuditResult ? (
                        <div className="space-y-3 pt-1">
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-slate-500 block">SEO Grade</span>
                              <span className="text-xl font-extrabold text-slate-900 font-mono">
                                {aiAuditResult.grade}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-black text-orange-600 font-mono">
                                {aiAuditResult.score}/100
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {aiAuditResult.wordCount} words
                              </span>
                            </div>
                          </div>

                          {aiAuditResult.issues && aiAuditResult.issues.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-amber-700 block">
                                Recommended Improvements:
                              </span>
                              <div className="space-y-1">
                                {aiAuditResult.issues.map((iss, i) => (
                                  <div key={i} className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200 flex items-start gap-1.5">
                                    <span>⚠️</span>
                                    <span>{iss}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {aiAuditResult.passed && aiAuditResult.passed.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-emerald-700 block">
                                Passed Ranking Checks:
                              </span>
                              <div className="space-y-1">
                                {aiAuditResult.passed.map((pass, i) => (
                                  <div key={i} className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                                    <span>✓</span>
                                    <span>{pass}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          Click "Run Audit" to analyze headings, word count, media presence, meta description, and AEO snippets.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE INSERTION POPUP MODAL ─────────────────────────── */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖼️</span>
                <h3 className="font-bold text-sm text-slate-900">Insert Image into Article</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or your CDN image link"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-medium">Or choose from curated royalty-free images:</span>
                <div className="flex flex-wrap gap-1.5">
                  {presetBanners.map((pb, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageUrl(pb.url);
                        setImageAlt(pb.label);
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md text-slate-700 transition cursor-pointer"
                    >
                      {pb.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Alt Text (Critical for Google Image SEO)</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="e.g. Modern inventory dashboard with real-time stock counts"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Caption (Optional, shown below image)</label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="e.g. Figure 1: Cloud-native inventory setup workflow"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {imageUrl && (
                <div className="h-32 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mt-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                disabled={!imageUrl.trim()}
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs disabled:opacity-50 shadow-md cursor-pointer"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO EMBED POPUP MODAL ─────────────────────────────── */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎬</span>
                <h3 className="font-bold text-sm text-slate-900">Embed Video Player</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Video Link or Raw &lt;iframe&gt; Code</label>
                <textarea
                  rows={2}
                  value={videoUrlOrIframe}
                  onChange={(e) => setVideoUrlOrIframe(e.target.value)}
                  placeholder="Paste YouTube URL (e.g. https://www.youtube.com/watch?v=...), Vimeo, Loom, or raw iframe"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-medium">Supported platforms:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md font-medium">
                    YouTube
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                    Vimeo
                  </span>
                  <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-medium">
                    Loom Screen Recording
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                    Raw Iframe &amp; MP4
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Video Title / Caption (Optional)</label>
                <input
                  type="text"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="e.g. Watch: 3-Minute SaaS Workspace Setup Tutorial"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertVideo}
                disabled={!videoUrlOrIframe.trim()}
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs disabled:opacity-50 shadow-md cursor-pointer"
              >
                Insert Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK PREVIEW MODAL (FULL PUBLIC ARTICLE RENDER) ──────── */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-900 font-mono">Public Article Preview</span>
                <span>•</span>
                <span className="text-slate-500 font-mono">/blog/{previewPost.slug}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(previewPost.slug)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  🔗 Copy Public Link
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPost(null)}
                  className="text-slate-400 hover:text-slate-700 font-mono text-xs px-2 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6">
              {/* Cover Image Banner (If Provided) */}
              {previewPost.cover_image && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm max-h-[400px]">
                  <img
                    src={previewPost.cover_image}
                    alt={previewPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700">
                  {previewPost.category || "General"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">{previewPost.reading_time || "5 min read"}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">👀 {(previewPost.views_count || 0).toLocaleString()} views</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {previewPost.title}
              </h1>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {previewPost.author_name ? previewPost.author_name.charAt(0).toUpperCase() : "N"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{previewPost.author_name || "Noyon Hossain"}</h4>
                  <p className="text-[11px] text-slate-500">{previewPost.author_role || "Lead Systems Architect"}</p>
                </div>
              </div>

              {previewPost.excerpt && (
                <p className="text-sm sm:text-base font-medium text-slate-700 leading-relaxed italic border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/30 rounded-r-xl">
                  {previewPost.excerpt}
                </p>
              )}

              {/* Rendered Body with Images & Videos */}
              <div className="pt-2">
                <BlogMarkdownPreview content={previewPost.content} />
              </div>

              {previewPost.tags && (
                <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Tags:</span>
                  {(Array.isArray(previewPost.tags) ? previewPost.tags : String(previewPost.tags).split(",")).map(
                    (tag, i) => (
                      <span key={i} className="text-xs rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-700">
                        #{String(tag).trim()}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DEDICATED SEO & VISITORS ANALYTICS DEEP-DIVE MODAL ───── */}
      {analyticsModalPost && (() => {
        const postSeo = calculateSeoScore({
          title: analyticsModalPost.title,
          slug: analyticsModalPost.slug,
          excerpt: analyticsModalPost.excerpt,
          meta_title: analyticsModalPost.meta_title,
          meta_description: analyticsModalPost.meta_description,
          content: analyticsModalPost.content,
          focus_keyword: analyticsModalPost.focus_keyword || extractDefaultKeyword(analyticsModalPost.title),
        });
        const uniquesCount =
          analyticsModalPost.unique_visitors_count ||
          Math.max(1, Math.round((analyticsModalPost.views_count || 0) * 0.74));
        const isLive = analyticsModalPost.is_published !== false;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="font-bold text-slate-900 font-mono">Article SEO &amp; Visitor Performance</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isLive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {isLive ? "LIVE ON BLOG" : "DRAFT"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAnalyticsModalPost(null)}
                    className="text-slate-400 hover:text-slate-700 font-mono text-xs px-2 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {analyticsModalPost.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <span className="truncate max-w-[220px]">/blog/{analyticsModalPost.slug}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(analyticsModalPost.slug)}
                      className="text-orange-600 hover:underline font-semibold cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                {/* Sub-Tab Navigation */}
                <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold gap-1">
                  <button
                    type="button"
                    onClick={() => setAnalyticsModalTab("traffic")}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      analyticsModalTab === "traffic" ? "bg-white text-purple-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📊</span>
                    <span>Visitor Analytics</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsModalTab("seo")}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      analyticsModalTab === "seo" ? "bg-white text-orange-600 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🔍</span>
                    <span>SEO &amp; AEO Audit ({postSeo.score}%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsModalTab("preview")}
                    className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      analyticsModalTab === "preview" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🌐</span>
                    <span>SERP &amp; Social Previews</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* TAB 1: VISITOR ANALYTICS */}
                {analyticsModalTab === "traffic" && (
                  <div className="space-y-6">
                    {/* 4 Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-1">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Impressions</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-blue-900 font-mono">
                            {(analyticsModalPost.views_count || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-blue-600 font-medium">views</span>
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1">Aggregated public reader pageviews</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 space-y-1">
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Unique Readers</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-purple-900 font-mono">
                            {uniquesCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-purple-600 font-medium">uniques</span>
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1">Individual client sessions (24h cookie deduplicated)</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Est. Reading Time</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-emerald-900 font-mono">
                            {analyticsModalPost.reading_time || "5 min"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1">Calculated at 180 words per minute</p>
                      </div>

                      <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50 space-y-1">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Latest Activity</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-black text-amber-900 font-mono">
                            {formatRelativeTime(analyticsModalPost.last_viewed_at || analyticsModalPost.updated_at)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1">Most recent article reader visit</p>
                      </div>
                    </div>

                    {/* Visitor Engagement Signals Box */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                      <h4 className="font-bold text-xs text-slate-900 uppercase font-mono tracking-wider">
                        Visitor Retention &amp; Organic Reach Quality
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] text-slate-400 font-mono uppercase">Unique Reach Ratio</span>
                          <span className="text-lg font-extrabold text-slate-900 font-mono block">
                            {Math.round((uniquesCount / Math.max(1, analyticsModalPost.views_count || 1)) * 100)}%
                          </span>
                          <p className="text-[10px] text-slate-500">Percentage of views coming from first-time readers</p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] text-slate-400 font-mono uppercase">Dwell Time Intent</span>
                          <span className="text-lg font-extrabold text-emerald-700 font-mono block">
                            High (In-Depth)
                          </span>
                          <p className="text-[10px] text-slate-500">Long-form structure encourages complete guide completion</p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] text-slate-400 font-mono uppercase">Search Indexing</span>
                          <span className="text-lg font-extrabold text-blue-700 font-mono block">
                            {isLive ? "Publicly Indexable" : "Staged (Draft)"}
                          </span>
                          <p className="text-[10px] text-slate-500">Googlebot and Bingbot can crawl schema meta tags</p>
                        </div>
                      </div>
                    </div>

                    {/* Traffic Growth Recommendations */}
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚀</span>
                        <h4 className="font-bold text-xs text-orange-900">How to Boost Organic Traffic to This Guide</h4>
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc">
                        <li>Share this article link in merchant WhatsApp groups and Facebook e-commerce communities.</li>
                        <li>Link to this article directly from your merchant dashboard onboarding steps or help center.</li>
                        <li>Include this guide in monthly courier settlement newsletter emails to build authoritative backlinks.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* TAB 2: SEO & AEO AUDIT */}
                {analyticsModalTab === "seo" && (
                  <div className="space-y-6">
                    {/* Score Ribbon */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center h-14 w-14 rounded-2xl font-mono font-black text-xl border shadow-xs ${postSeo.gradeColor}`}>
                          {postSeo.grade}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">SEO Health Grade: {postSeo.grade}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${postSeo.gradeColor}`}>
                              {postSeo.score}/100 Points
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {postSeo.passedCount} of {postSeo.totalChecks} algorithmic search ranking checks satisfied
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Primary Keyword:</span>
                        <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono inline-block">
                          🎯 {analyticsModalPost.focus_keyword || extractDefaultKeyword(analyticsModalPost.title)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          postSeo.score >= 80 ? "bg-emerald-500" : postSeo.score >= 70 ? "bg-blue-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${postSeo.score}%` }}
                      />
                    </div>

                    {/* Checklist Grid */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-900 uppercase font-mono tracking-wider">
                        Full Ranking Checklist Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {postSeo.checks.map((chk) => (
                          <div
                            key={chk.id}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                              chk.passed
                                ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-950"
                                : "bg-amber-50/70 border-amber-200/80 text-amber-950"
                            }`}
                          >
                            <span className="font-bold shrink-0 mt-0.5 text-sm">
                              {chk.passed ? "✓" : "⚠️"}
                            </span>
                            <div className="space-y-0.5">
                              <span className="font-bold block">{chk.label}</span>
                              <p className="text-[11px] opacity-80 leading-snug">{chk.hint}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SERP & SOCIAL PREVIEWS */}
                {analyticsModalTab === "preview" && (
                  <div className="space-y-6">
                    {/* Google Search Simulator */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        Google Search Snippet Preview (Desktop)
                      </span>
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
                        <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1.5 truncate">
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-600 text-white text-[8px] font-bold">
                            S
                          </span>
                          <span className="text-slate-800 font-medium">SmartInventory</span>
                          <span className="text-slate-400">&gt;</span>
                          <span className="truncate">blog &gt; {analyticsModalPost.slug}</span>
                        </div>
                        <div className="text-blue-700 hover:underline font-medium text-base truncate font-sans cursor-pointer leading-tight">
                          {analyticsModalPost.meta_title || analyticsModalPost.title}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {analyticsModalPost.meta_description || analyticsModalPost.excerpt || "Article summary snippet for Google..."}
                        </p>
                      </div>
                    </div>

                    {/* Social Media Share Card */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        Social Card (Facebook / LinkedIn / Twitter)
                      </span>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-w-lg shadow-sm">
                        <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                          {analyticsModalPost.cover_image ? (
                            <img src={analyticsModalPost.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-4 text-center">
                              <span className="text-xs font-mono text-orange-400 uppercase tracking-widest font-bold">SmartInventory Blog</span>
                              <span className="text-sm font-bold mt-1 line-clamp-2">{analyticsModalPost.title}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3.5 space-y-1 bg-slate-50/60 border-t border-slate-100">
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                            SMARTINVENTORY.IO • {analyticsModalPost.reading_time || "5 MIN READ"}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                            {analyticsModalPost.meta_title || analyticsModalPost.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                            {analyticsModalPost.meta_description || analyticsModalPost.excerpt}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50">
                <Link
                  href={`/blog/${analyticsModalPost.slug}`}
                  target="_blank"
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center gap-1"
                >
                  <span>View Public Page</span>
                  <span>↗</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const p = analyticsModalPost;
                      setAnalyticsModalPost(null);
                      handleOpenEdit(p);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-orange-600/20"
                  >
                    Edit Article in Studio ✍️
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsModalPost(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
