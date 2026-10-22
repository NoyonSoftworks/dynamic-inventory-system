import { generateSmartSlug } from "@/utils/slug-generator";

/**
 * High-Precision Real-Time SEO & Content Analytics Engine
 * Evaluates on-page SEO, semantic keyword density, AEO (Answer Engine Optimization),
 * and GEO (Generative Engine Optimization for ChatGPT / Perplexity).
 */

export function calculateSeoScore({
  title = "",
  slug = "",
  excerpt = "",
  meta_title = "",
  meta_description = "",
  content = "",
  focus_keyword = "",
}) {
  const cleanTitle = (meta_title || title || "").trim();
  const cleanSlug = (slug || "").trim().toLowerCase();
  const cleanDesc = (meta_description || excerpt || "").trim();
  const cleanContent = (content || "").trim();
  const targetKw = (focus_keyword || "").trim().toLowerCase();

  const words = cleanContent ? cleanContent.split(/\s+/).filter(Boolean).length : 0;
  const h2Matches = cleanContent.match(/^##\s+.+$/gm) || [];
  const h3Matches = cleanContent.match(/^###\s+.+$/gm) || [];
  const imageMatches = cleanContent.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
  const videoMatches = cleanContent.match(/\[video:[^\]]+\]|<iframe/gi) || [];
  const tableMatches = cleanContent.match(/\|[\s-:]+\|/g) || [];
  const aeoMatches = cleanContent.match(/(?:Direct Answer|সরাসরি উত্তর|AEO|Key Takeaway|FAQ)/i);

  let score = 0;
  const checks = [];

  // 1. Focus Keyword Provided (5 pts)
  const hasKeyword = Boolean(targetKw && targetKw.length >= 2);
  if (hasKeyword) {
    score += 5;
    checks.push({
      id: "focus_kw_set",
      label: `Focus keyword defined ("${targetKw}")`,
      passed: true,
      impact: "high",
      hint: "Great! Having a target search keyword grounds on-page optimization.",
    });
  } else {
    checks.push({
      id: "focus_kw_set",
      label: "No focus keyword specified",
      passed: false,
      impact: "high",
      hint: "Specify a primary search query (e.g., 'Courier Dispatch API') to unlock deep keyword checks.",
    });
  }

  // 2. Keyword in Title (H1) (15 pts) - Flexible Unicode & Stem matching
  let kwInTitle = false;
  if (hasKeyword && cleanTitle) {
    const titleLower = cleanTitle.toLowerCase();
    if (titleLower.includes(targetKw)) {
      kwInTitle = true;
    } else {
      const kwWords = targetKw.split(/\s+/).filter((w) => w.length >= 2);
      if (kwWords.length > 0) {
        const matches = kwWords.filter((w) => {
          const root = w.replace(/(ের|ার|ে|য়|কে|তে|র|দের)$/u, "");
          return titleLower.includes(w) || (root.length >= 2 && titleLower.includes(root));
        });
        if (matches.length / kwWords.length >= 0.5) {
          kwInTitle = true;
        }
      }
    }
  }

  if (kwInTitle) {
    score += 15;
    checks.push({
      id: "kw_in_title",
      label: "Focus keyword appears in title",
      passed: true,
      impact: "high",
      hint: "Excellent placement for Google Search & Click-Through-Rate.",
    });
  } else {
    checks.push({
      id: "kw_in_title",
      label: hasKeyword ? "Focus keyword missing from title" : "Title keyword check pending",
      passed: false,
      impact: "high",
      hint: hasKeyword ? `Include "${targetKw}" near the start of your article title.` : "Set focus keyword first.",
    });
  }

  // 3. Keyword in URL Slug (10 pts)
  let kwInSlug = false;
  if (hasKeyword && cleanSlug && !cleanSlug.startsWith("article-")) {
    const expectedSlug = generateSmartSlug(targetKw);
    const expectedTokens = expectedSlug.split("-").filter((t) => t.length >= 2);
    const actualTokens = cleanSlug.split("-").filter((t) => t.length >= 2);

    const directOverlap = expectedTokens.filter((token) => cleanSlug.includes(token));
    const tokenRatio = expectedTokens.length > 0 ? directOverlap.length / expectedTokens.length : 0;

    if (cleanSlug.includes(expectedSlug) || tokenRatio >= 0.35 || actualTokens.some((t) => expectedSlug.includes(t))) {
      kwInSlug = true;
    }
  }

  if (kwInSlug) {
    score += 10;
    checks.push({
      id: "kw_in_slug",
      label: "Focus keyword present in URL slug",
      passed: true,
      impact: "medium",
      hint: "Clean, keyword-rich URL helps search crawlers index your page.",
    });
  } else {
    checks.push({
      id: "kw_in_slug",
      label: cleanSlug.startsWith("article-") ? "Default placeholder slug detected" : "URL slug does not match focus keyword",
      passed: false,
      impact: "medium",
      hint: "Click '⚡ Slug' button near Title to generate a clean, keyword-rich English URL.",
    });
  }

  // 4. Keyword in Meta Description (10 pts)
  let kwInDesc = false;
  if (hasKeyword && cleanDesc) {
    const descLower = cleanDesc.toLowerCase();
    if (descLower.includes(targetKw)) {
      kwInDesc = true;
    } else {
      const kwWords = targetKw.split(/\s+/).filter((w) => w.length >= 2);
      if (kwWords.length > 0) {
        const matches = kwWords.filter((w) => {
          const root = w.replace(/(ের|ার|ে|য়|কে|তে|র|দের)$/u, "");
          return descLower.includes(w) || (root.length >= 2 && descLower.includes(root));
        });
        if (matches.length / kwWords.length >= 0.5) {
          kwInDesc = true;
        }
      }
    }
  }

  if (kwInDesc) {
    score += 10;
    checks.push({
      id: "kw_in_desc",
      label: "Focus keyword found in meta description",
      passed: true,
      impact: "medium",
      hint: "Google will bold this search query in user search result snippets.",
    });
  } else {
    checks.push({
      id: "kw_in_desc",
      label: "Focus keyword missing from meta description",
      passed: false,
      impact: "medium",
      hint: "Include the target keyword naturally within the 120-160 character description.",
    });
  }

  // 5. Title Length (Optimal: 40-65 chars) (10 pts)
  const titleLen = cleanTitle.length;
  if (titleLen >= 40 && titleLen <= 65) {
    score += 10;
    checks.push({
      id: "title_length",
      label: `Optimal title length (${titleLen} chars)`,
      passed: true,
      impact: "high",
      hint: "Within the optimal 40-65 character boundary for Google desktop and mobile.",
    });
  } else if (titleLen >= 25 && titleLen <= 80) {
    score += 6;
    checks.push({
      id: "title_length",
      label: `Acceptable title length (${titleLen} chars)`,
      passed: true,
      impact: "medium",
      hint: titleLen < 40 ? "Consider adding a descriptive benefit to reach 45+ chars." : "Title may truncate slightly on mobile.",
    });
  } else {
    checks.push({
      id: "title_length",
      label: titleLen === 0 ? "Title is missing" : `Title is ${titleLen > 80 ? "too long" : "too short"} (${titleLen} chars)`,
      passed: false,
      impact: "high",
      hint: "Target 45-65 characters so it renders completely without getting cut off on Google.",
    });
  }

  // 6. Meta Description Length (Optimal: 120-160 chars) (10 pts)
  const descLen = cleanDesc.length;
  if (descLen >= 120 && descLen <= 160) {
    score += 10;
    checks.push({
      id: "desc_length",
      label: `Ideal meta description length (${descLen} chars)`,
      passed: true,
      impact: "high",
      hint: "Perfect length for desktop and mobile SERP cards.",
    });
  } else if (descLen >= 80 && descLen <= 180) {
    score += 6;
    checks.push({
      id: "desc_length",
      label: `Moderate meta description length (${descLen} chars)`,
      passed: true,
      impact: "medium",
      hint: descLen > 160 ? "Over 160 chars may be truncated with '...' on mobile." : "Add a clear call to action to reach 130+ chars.",
    });
  } else {
    checks.push({
      id: "desc_length",
      label: descLen === 0 ? "Meta description is missing" : `Meta description length (${descLen} chars)`,
      passed: false,
      impact: "high",
      hint: "Aim for 120-160 characters summarizing the reader's benefit.",
    });
  }

  // 7. Word Count & In-Depth Coverage (15 pts)
  if (words >= 600) {
    score += 15;
    checks.push({
      id: "word_count",
      label: `Comprehensive guide depth (${words} words)`,
      passed: true,
      impact: "high",
      hint: "Thorough articles (>600 words) rank 3.8x higher on competitive search queries.",
    });
  } else if (words >= 350) {
    score += 10;
    checks.push({
      id: "word_count",
      label: `Adequate content length (${words} words)`,
      passed: true,
      impact: "medium",
      hint: "Expanding step-by-step guidance to 600+ words will enhance search authority.",
    });
  } else if (words >= 150) {
    score += 5;
    checks.push({
      id: "word_count",
      label: `Thin content warning (${words} words)`,
      passed: false,
      impact: "high",
      hint: "Search engines consider articles under 300 words thin. Expand key sections.",
    });
  } else {
    checks.push({
      id: "word_count",
      label: `Content is incomplete (${words} words)`,
      passed: false,
      impact: "high",
      hint: "Draft comprehensive sections explaining the solution in detail.",
    });
  }

  // 8. Structured Headings (H2 / H3) (10 pts)
  if (h2Matches.length >= 2) {
    score += 10;
    checks.push({
      id: "heading_structure",
      label: `Well-structured with ${h2Matches.length} H2 sections`,
      passed: true,
      impact: "medium",
      hint: "Clear headings allow Google to generate structured table of contents.",
    });
  } else if (h2Matches.length === 1) {
    score += 5;
    checks.push({
      id: "heading_structure",
      label: "Only 1 H2 heading found",
      passed: false,
      impact: "medium",
      hint: "Add at least 2-3 H2 (##) headings to break up content for readers.",
    });
  } else {
    checks.push({
      id: "heading_structure",
      label: "Missing H2 (##) section headings",
      passed: false,
      impact: "high",
      hint: "Use '## Heading' in Markdown to structure key article topics.",
    });
  }

  // 9. Rich Visuals & Media (Images, Video, or Tables) (10 pts)
  const totalMedia = imageMatches.length + videoMatches.length + (tableMatches.length > 0 ? 1 : 0);
  if (totalMedia >= 2) {
    score += 10;
    checks.push({
      id: "rich_media",
      label: `Rich multimedia included (${imageMatches.length} images, ${videoMatches.length} videos, ${tableMatches.length > 0 ? "table" : "none"})`,
      passed: true,
      impact: "medium",
      hint: "Increases visitor dwell time and qualifies for Google Image & Video search.",
    });
  } else if (totalMedia === 1) {
    score += 6;
    checks.push({
      id: "rich_media",
      label: "Contains 1 media asset",
      passed: true,
      impact: "low",
      hint: "Add a comparison table or video embed to further boost dwell time.",
    });
  } else {
    checks.push({
      id: "rich_media",
      label: "No images, videos, or comparison tables found",
      passed: false,
      impact: "medium",
      hint: "Use the '🖼️ Image', '🎬 Video', or '📊 Table' toolbar buttons to enrich the article.",
    });
  }

  // 10. AEO / Generative Engine Direct Answer (5 pts)
  if (aeoMatches) {
    score += 5;
    checks.push({
      id: "aeo_readiness",
      label: "AEO / Direct Answer block detected",
      passed: true,
      impact: "low",
      hint: "Optimized for Google AI Overviews, Perplexity, and voice search answers.",
    });
  } else {
    checks.push({
      id: "aeo_readiness",
      label: "AEO direct answer snippet recommended",
      passed: false,
      impact: "low",
      hint: "Add a 2-sentence callout answering the primary question directly.",
    });
  }

  // Calculate keyword density accurately across all languages (Bengali & English)
  let keywordCount = 0;
  let density = "0%";
  if (hasKeyword && words > 0) {
    const lowerContent = cleanContent.toLowerCase();
    const lowerKw = targetKw.toLowerCase();

    // 1. Direct phrase occurrence count (works for English & Bengali)
    let count = 0;
    let pos = lowerContent.indexOf(lowerKw);
    while (pos !== -1) {
      count++;
      pos = lowerContent.indexOf(lowerKw, pos + Math.max(1, lowerKw.length));
    }

    // 2. If phrase is inflected or multi-word with slight variation, count root words
    if (count === 0) {
      const kwWords = lowerKw.split(/\s+/).filter((w) => w.length >= 2);
      if (kwWords.length > 0) {
        let partialHits = 0;
        for (const w of kwWords) {
          const root = w.replace(/(ের|ার|ে|য়|কে|তে|র|দের)$/u, "");
          let p = lowerContent.indexOf(root);
          while (p !== -1) {
            partialHits++;
            p = lowerContent.indexOf(root, p + Math.max(1, root.length));
          }
        }
        count = Math.round(partialHits / kwWords.length);
      }
    }

    keywordCount = count;
    const pct = ((keywordCount / words) * 100).toFixed(1);
    density = `${pct}%`;
  }

  // Normalize final score bounds
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine Grade
  let grade = "Needs Work";
  let gradeColor = "text-rose-600 bg-rose-50 border-rose-200";
  let gradeBadge = "Needs Work";

  if (finalScore >= 90) {
    grade = "A+";
    gradeBadge = "Top Rank";
    gradeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  } else if (finalScore >= 80) {
    grade = "A";
    gradeBadge = "Strong SEO";
    gradeColor = "text-teal-700 bg-teal-50 border-teal-200";
  } else if (finalScore >= 70) {
    grade = "B";
    gradeBadge = "Good";
    gradeColor = "text-blue-700 bg-blue-50 border-blue-200";
  } else if (finalScore >= 55) {
    grade = "C";
    gradeBadge = "Fair";
    gradeColor = "text-amber-700 bg-amber-50 border-amber-200";
  }

  const readingTime = `${Math.max(2, Math.ceil(words / 180))} min read`;

  return {
    score: finalScore,
    grade,
    gradeBadge,
    gradeColor,
    wordCount: words,
    readingTime,
    checks,
    density,
    keywordCount,
    passedCount: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
  };
}

/**
 * Extracts a sensible default focus keyword from the title if not set
 */
export function extractDefaultKeyword(title = "") {
  if (!title) return "Inventory SaaS";
  // Convert title using smart slug generator to get key semantic terms
  const slug = generateSmartSlug(title);
  const words = slug.split("-").filter((w) => w.length >= 3 && !/^\d+$/.test(w));
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return "Inventory Logistics";
}
