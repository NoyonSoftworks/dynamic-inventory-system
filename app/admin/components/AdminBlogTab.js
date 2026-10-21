"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/**
 * High-Performance Blog Markdown Previewer with Full Image & Video Embed Support
 */
function BlogMarkdownPreview({ content }) {
  if (!content) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs italic">
        No content written yet. Type in the markdown editor or use Piku AI Copilot to generate sections.
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
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest" | "views" | "title"
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState("split"); // "edit" | "split" | "preview"

  // Quick Preview Modal (Viewing public render without leaving admin)
  const [previewPost, setPreviewPost] = useState(null);

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
    meta_title: "",
    meta_description: "",
    canonical_url: "",
    reading_time: "5 min read",
    is_published: true,
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

  useEffect(() => {
    loadPosts();
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
    setIsModalOpen(true);
  }

  function handleOpenEdit(post) {
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
      meta_title: post.meta_title || post.title || "",
      meta_description: post.meta_description || post.excerpt || "",
      canonical_url: post.canonical_url || `https://smartinventory.io/blog/${post.slug}`,
      reading_time: post.reading_time || "5 min read",
      is_published: Boolean(post.is_published),
    });
    setIsEditing(true);
    setEditorMode("split");
    setIsAiOpen(false);
    setAiTopic(post.title || "");
    setAiKeywordMatrix(null);
    setIsModalOpen(true);
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
        triggerToast?.("success", "✨ Topic-matched article generated by Piku AI!");
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

      const q = filterQuery.toLowerCase();
      const matchQuery =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)));

      return matchCat && matchStatus && matchQuery;
    })
    .sort((a, b) => {
      if (sortOrder === "views") return (b.views_count || 0) - (a.views_count || 0);
      if (sortOrder === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortOrder === "title") return (a.title || "").localeCompare(b.title || "");
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;

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
                Piku AI Copilot Powered ✨
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

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-medium text-slate-500">Total Articles</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900 font-mono">{totalArticles}</span>
              <span className="text-[11px] text-slate-500 font-medium">in library</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-[11px] font-medium text-emerald-700">Published Live</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-800 font-mono">{publishedArticles}</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded">
                {totalArticles > 0 ? Math.round((publishedArticles / totalArticles) * 100) : 0}% Active
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <span className="text-[11px] font-medium text-amber-700">Drafts &amp; In-Review</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-amber-800 font-mono">{draftArticles}</span>
              <span className="text-[11px] text-amber-600 font-medium">pending publish</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <span className="text-[11px] font-medium text-blue-700">Total Reader Views</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-blue-800 font-mono">
                {totalViews.toLocaleString()}
              </span>
              <span className="text-[11px] text-blue-600 font-medium">impressions</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by title, slug, tag, or excerpt..."
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

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
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

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="views">Most Viewed</option>
              <option value="title">Title (A-Z)</option>
            </select>

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
                  <th className="px-4 py-3.5">Article &amp; SEO Meta</th>
                  <th className="px-4 py-3.5">Category &amp; Tags</th>
                  <th className="px-4 py-3.5">Author</th>
                  <th className="px-4 py-3.5 text-center">Views</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => {
                  const isPub = post.is_published !== false;
                  const tagsArr = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(",") : []);

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

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {post.author_name || "Noyon Hossain"}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                            {post.author_role || "Systems Architect"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {(post.views_count || 0).toLocaleString()}
                        </span>
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

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {post.excerpt || "No excerpt summary provided."}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{post.reading_time || "5 min read"}</span>
                    <span>👀 {(post.views_count || 0).toLocaleString()} views</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewPost(post)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
                    >
                      Preview
                    </button>
                    <div className="flex items-center gap-1">
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
                  <span>{isAiOpen ? "Close AI Copilot" : "Piku AI Copilot ✨"}</span>
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

                {/* Google SERP Preview Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Google Search Result Simulator (SERP Preview)
                  </span>
                  <div className="bg-white rounded-lg border border-slate-200/80 p-3 space-y-1">
                    <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1 truncate">
                      <span>https://smartinventory.io &gt; blog &gt; {formData.slug || "article-slug"}</span>
                    </div>
                    <div className="text-blue-700 hover:underline font-medium text-sm truncate font-sans cursor-pointer">
                      {formData.meta_title || formData.title || "Article Title on Google"}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {formData.meta_description || formData.excerpt || "Meta description snippet will appear here to summarize content for search engine visitors..."}
                    </p>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>Meta Description Length:</span>
                    <span className={formData.meta_description.length > 160 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                      {formData.meta_description.length} / 160 characters
                    </span>
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
                        <h4 className="font-bold text-xs text-slate-900">Piku AI Blog Copilot</h4>
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
                            <span>Piku AI Researching &amp; Writing...</span>
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
    </div>
  );
}
