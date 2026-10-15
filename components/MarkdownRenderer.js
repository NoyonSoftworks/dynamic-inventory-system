"use client";

import React from "react";

/**
 * Custom High-Performance Markdown to JSX Renderer
 * Transforms raw markdown (headings, bold, lists, tables, callouts, code blocks)
 * into semantic, styled, accessible JSX with anchor links.
 */

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function renderInline(text) {
  if (!text) return null;

  // Split by inline markdown tokens: `code`, **bold**, *italic*, [link](url)
  const tokens = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={key++}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800/90 text-orange-400 border border-slate-700/60 font-medium"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Bold text: **bold** or __bold__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={key++} className="font-bold text-slate-100">
          {renderInline(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 3. Italic text: *italic* or _italic_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch && italicMatch[2]) {
      tokens.push(
        <em key={key++} className="italic text-slate-200">
          {renderInline(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 4. Markdown links: [anchor](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target={linkMatch[2].startsWith("http") ? "_blank" : undefined}
          rel={linkMatch[2].startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-orange-400 hover:text-orange-300 underline underline-offset-4 font-medium transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Find nearest match
    const nextSpecial = remaining.search(/[`*_\[]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial > 0) {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    } else {
      // Single orphan character
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements = [];
  let i = 0;
  let elementKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={elementKey++} className="my-10 border-slate-800" />
      );
      i++;
      continue;
    }

    // Code Block: ```lang
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```

      elements.push(
        <div
          key={elementKey++}
          className="my-6 rounded-xl border border-slate-800 bg-[#070b14] p-4 font-mono text-xs text-slate-200 shadow-xl overflow-x-auto relative group"
        >
          {lang && (
            <div className="absolute top-2.5 right-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto pr-8">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Heading 2: ## Title
    if (trimmed.startsWith("## ")) {
      const headingText = trimmed.replace(/^##\s+/, "");
      const id = slugify(headingText);
      elements.push(
        <h2
          key={elementKey++}
          id={id}
          className="text-xl sm:text-2xl font-bold text-slate-100 mt-10 mb-4 pb-2 border-b border-slate-800 flex items-center gap-2 group scroll-mt-24"
        >
          <a
            href={`#${id}`}
            className="text-orange-500 opacity-60 group-hover:opacity-100 transition-opacity font-mono text-lg font-bold"
            aria-label={`Link to section: ${headingText}`}
          >
            #
          </a>
          <span>{renderInline(headingText)}</span>
        </h2>
      );
      i++;
      continue;
    }

    // Heading 3: ### Title
    if (trimmed.startsWith("### ")) {
      const headingText = trimmed.replace(/^###\s+/, "");
      const id = slugify(headingText);
      elements.push(
        <h3
          key={elementKey++}
          id={id}
          className="text-lg sm:text-xl font-bold text-slate-200 mt-8 mb-3 flex items-center gap-2 group scroll-mt-24"
        >
          <a
            href={`#${id}`}
            className="text-teal-400 opacity-60 group-hover:opacity-100 transition-opacity font-mono text-sm font-bold"
            aria-label={`Link to subsection: ${headingText}`}
          >
            ##
          </a>
          <span>{renderInline(headingText)}</span>
        </h3>
      );
      i++;
      continue;
    }

    // Heading 4: #### Title
    if (trimmed.startsWith("#### ")) {
      const headingText = trimmed.replace(/^####\s+/, "");
      elements.push(
        <h4
          key={elementKey++}
          className="text-base font-bold text-slate-200 mt-6 mb-2"
        >
          {renderInline(headingText)}
        </h4>
      );
      i++;
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ""));
        i++;
      }
      elements.push(
        <blockquote
          key={elementKey++}
          className="border-l-4 border-orange-500 bg-orange-950/20 px-5 py-3.5 rounded-r-xl my-6 text-slate-200 italic leading-relaxed text-sm shadow-xs"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className={qIdx > 0 ? "mt-2" : ""}>
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Markdown Table: starts with | and next line has | ---
    if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (r) =>
          r
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        // line 1 is divider (| :--- | :--- |)
        const rows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div
            key={elementKey++}
            className="overflow-x-auto my-6 rounded-xl border border-slate-800 bg-slate-900/60 shadow-md"
          >
            <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
              <thead className="bg-slate-800/80 font-mono uppercase text-slate-300 tracking-wider font-semibold">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-5 py-3 font-semibold">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-5 py-3 text-slate-300">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Unordered List: - item or * item
    if (/^[\-\*]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\-\*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={elementKey++} className="my-4 space-y-2.5 pl-1">
          {listItems.map((item, lIdx) => (
            <li
              key={lIdx}
              className="flex items-start gap-2.5 text-sm sm:text-base text-slate-300 leading-relaxed"
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemNumber = lines[i].trim().match(/^(\d+)\.\s+/)[1];
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        listItems.push({ number: itemNumber, text: itemText });
        i++;
      }
      elements.push(
        <ol key={elementKey++} className="my-4 space-y-2.5 pl-1">
          {listItems.map(({ number, text }, oIdx) => (
            <li
              key={oIdx}
              className="flex items-start gap-2.5 text-sm sm:text-base text-slate-300 leading-relaxed"
            >
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/80 font-mono text-[11px] text-orange-400 font-bold shrink-0">
                {number}
              </span>
              <span className="flex-1">{renderInline(text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Default: Regular Paragraph
    elements.push(
      <p
        key={elementKey++}
        className="text-slate-300 text-sm sm:text-base leading-relaxed my-4"
      >
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}
