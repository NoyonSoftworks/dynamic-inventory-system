"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBusinessContext } from "@/utils/supabase/business";

/**
 * Lightweight, zero-dependency Markdown renderer for Piku's chat bubbles
 * Handles headers, bold, italics, code blocks, bullet points, and internal Next.js links.
 */
function MarkdownText({ content }) {
  if (!content) return null;

  // Split into lines
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-[13px] text-slate-900 mt-2 mb-1 flex items-center gap-1.5">
              {renderInline(trimmed.replace("### ", ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-sm text-slate-900 mt-2.5 mb-1">
              {renderInline(trimmed.replace("## ", ""))}
            </h3>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-orange-500 font-bold select-none text-xs leading-4">•</span>
              <span className="flex-1 text-slate-700">{renderInline(text)}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="font-mono text-[11px] font-semibold text-orange-600 select-none">
                {numMatch[1]}.
              </span>
              <span className="flex-1 text-slate-700">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-orange-400 pl-2.5 py-1 text-slate-600 bg-orange-50/40 rounded-r-md text-[11px] my-1"
            >
              {renderInline(trimmed.replace("> ", ""))}
            </blockquote>
          );
        }

        // Regular paragraph line
        return (
          <p key={idx} className="text-slate-700">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Inline formatting parser: **bold**, *italic*, `code`, and [link](/path)
 */
function renderInline(text) {
  if (!text) return text;

  // Simple token regex for links [text](url), bold **bold**, code `code`
  const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Link: [Label](/href)
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, label, href] = match;
        return (
          <Link
            key={i}
            href={href}
            className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 decoration-blue-300 hover:decoration-blue-600 transition"
          >
            <span>{label}</span>
            <span className="text-[10px] text-blue-400">↗</span>
          </Link>
        );
      }
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Code: `code`
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

export default function PikuAIAssistant() {
  const pathname = usePathname();
  const { businessName } = useBusinessContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnreadIndicator, setHasUnreadIndicator] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial welcome message from Piku
  const initialMessages = [
    {
      sender: "piku",
      text: `### 👋 হ্যালো! আমি **পিকু (Piku)**, আপনার স্টোরের স্মার্ট এআই সহকারী! 🤖✨\n\nআমি **${
        businessName || "আপনার স্টোর"
      }** এর ইনভেন্টরি, কুরিয়ার ডেলিভারি, রিকনসিলিয়েশন এবং সেলস বাড়ানোর জন্য ২৪/৭ প্রস্তুত।\n\n**আমি যা যা করতে পারি:**\n- 📦 **স্টক ও রিস্টক গাইডেন্স:** কোন প্রোডাক্টের স্টক কম এবং কখন অর্ডার করবেন।\n- 🚚 **RTO ও রিটার্ন কমানো:** ফেক কাস্টমার চিহ্নিত করা ও অগ্রিম ডেলিভারি চার্জের কৌশল।\n- 💰 **কুরিয়ার অটো-রিকনসিলিয়েশন:** Steadfast ও Pathao এর পেমেন্ট মেলানো ও বকেয়া উদ্ধার।\n- 💵 **আসল নিট প্রফিট হিসাব:** প্রতিদিনের খরচ ও মার্জিন বিশ্লেষণ।\n\nনিচের যেকোনো প্রশ্নে ক্লিক করুন অথবা আপনার যা জানার তা বাংলায় বা ইংরেজিতে লিখুন!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      quickActions: [
        { label: "🚀 অর্ডার ডিসপ্যাচ", href: "/bulk-orders" },
        { label: "📑 কুরিয়ার রিকনসিলিয়েশন", href: "/dashboard/reconciliation" },
        { label: "📦 প্রোডাক্ট ক্যাটালগ", href: "/dashboard/products" },
      ],
      suggestedQuestions: [
        "🏬 আমার স্টোরের বর্তমান অবস্থা কি?",
        "📦 কুরিয়ারে RTO রিটার্ন পার্সেল কমানোর উপায় কি?",
        "💰 Steadfast & Pathao অটো-রিকনসিলিয়েশন কিভাবে করব?",
        "📊 স্টক শেষ হওয়ার আগেই রিস্টক করার সূত্র কি?",
      ],
    },
  ];

  const [messages, setMessages] = useState(initialMessages);

  // Load chat history from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("piku_chat_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  // Save chat history to sessionStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem("piku_chat_messages", JSON.stringify(messages));
      }
    } catch {}
  }, [messages]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasUnreadIndicator(false);
    }
  }, [isOpen, isMinimized]);

  async function handleSendMessage(customPrompt = null) {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/piku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: messages.slice(-6),
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const pikuReply = {
          sender: "piku",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          quickActions: data.quickActions || [],
          suggestedQuestions: data.suggestedQuestions || [],
          storeSnapshot: data.storeSnapshot || null,
        };
        setMessages((prev) => [...prev, pikuReply]);
        if (!isOpen) setHasUnreadIndicator(true);
      } else {
        throw new Error(data.error || "পিকুর রেসপন্স পেতে সমস্যা হচ্ছে।");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "piku",
          text: `⚠️ **পিকুর সংযোগে সমস্যা:** ${err.message || "দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।"}\n\nআপনার যদি জরুরি কোনো হেল্প দরকার হয় তবে সরাসরি [Help & Support](/dashboard/support) এ যোগাযোগ করতে পারেন।`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    if (confirm("আপনি কি পিকুর সাথে আগের চ্যাট হিস্ট্রি মুছে নতুন কথোপকথন শুরু করতে চান?")) {
      setMessages(initialMessages);
      try {
        sessionStorage.removeItem("piku_chat_messages");
      } catch {}
    }
  }

  function handleCopy(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  // Do not render floating button on the dedicated /dashboard/piku full-page view to avoid duplicate UI
  if (pathname === "/dashboard/piku") {
    return null;
  }

  return (
    <>
      {/* ── 1. Floating Launcher Button (Bottom Right) ───────────── */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in zoom-in duration-200">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex items-center gap-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white pl-3.5 pr-4 py-2.5 shadow-xl hover:shadow-2xl border border-slate-700/60 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            title="Chat with Piku AI - Your Store Copilot & Assistant"
          >
            {/* Glowing Bot Sparkle Avatar */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white shadow-xs">
              <span className="text-base select-none">🤖</span>
              {/* Pulsing online ring */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
              </span>
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1">
                Ask Piku AI <span className="text-amber-400 text-[10px]">✨</span>
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Store Copilot</span>
            </div>

            {hasUnreadIndicator && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-orange-500 border-2 border-white" />
            )}
          </button>
        </div>
      )}

      {/* ── 2. Floating Interactive Chat Window ──────────────────── */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xl transition-all duration-200 overflow-hidden ${
            isMinimized
              ? "w-80 h-14"
              : "w-[420px] max-w-[calc(100vw-24px)] h-[620px] max-h-[calc(100vh-60px)]"
          }`}
        >
          {/* Header Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-2xs">
                <span className="text-base select-none">🤖</span>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-tight truncate">
                    Piku (পিকু) AI Copilot
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-orange-500/30 text-orange-300 border border-orange-500/40">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 truncate">
                  {businessName || "Store"} • 24/7 Operations Advisor
                </p>
              </div>
            </div>

            {/* Top Window Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Clear conversation history"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <Link
                href="/dashboard/piku"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Open Piku in full-page workspace"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </Link>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title={isMinimized ? "Expand window" : "Minimize window"}
              >
                {isMinimized ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Close Piku"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Body (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === "user";

                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"} group animate-in fade-in duration-200`}
                    >
                      {/* Piku Avatar */}
                      {!isUser && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 border border-orange-200 text-orange-600 text-xs shadow-2xs mt-0.5">
                          🤖
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`max-w-[85%] space-y-2`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 shadow-2xs relative ${
                            isUser
                              ? "bg-slate-900 text-white rounded-tr-xs"
                              : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs"
                          }`}
                        >
                          {isUser ? (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          ) : (
                            <MarkdownText content={msg.text} />
                          )}

                          {/* Message Footer / Copy */}
                          <div
                            className={`flex items-center justify-between gap-3 mt-1.5 pt-1 text-[10px] ${
                              isUser ? "text-slate-400 border-t border-slate-800" : "text-slate-400 border-t border-slate-100"
                            }`}
                          >
                            <span className="font-mono">{msg.timestamp}</span>
                            {!isUser && (
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.text, idx)}
                                className="hover:text-slate-700 transition cursor-pointer flex items-center gap-1"
                                title="Copy answer"
                              >
                                {copiedIndex === idx ? (
                                  <span className="text-emerald-600 font-medium">Copied!</span>
                                ) : (
                                  <span>Copy</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick Action Navigation Pills (from Piku) */}
                        {!isUser && msg.quickActions && msg.quickActions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.quickActions.map((qa, i) => (
                              <Link
                                key={i}
                                href={qa.href}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition hover:border-slate-300"
                              >
                                <span>{qa.label}</span>
                                <span className="text-slate-400 text-[10px]">→</span>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Suggested Follow-up Questions */}
                        {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && idx === messages.length - 1 && (
                          <div className="space-y-1.5 pt-1.5">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                              Suggested Questions:
                            </span>
                            <div className="flex flex-col gap-1">
                              {msg.suggestedQuestions.map((sq, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSendMessage(sq)}
                                  className="text-left px-2.5 py-1.5 rounded-lg text-xs bg-white/90 hover:bg-orange-50/80 border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-900 transition shadow-2xs cursor-pointer flex items-center justify-between"
                                >
                                  <span>{sq}</span>
                                  <span className="text-orange-500 text-xs">✨</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading / Typing Indicator */}
                {loading && (
                  <div className="flex items-start gap-2.5 animate-in fade-in duration-150">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 border border-orange-200 text-orange-600 text-xs">
                      🤖
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">পিকু তথ্য বিশ্লেষণ করছে...</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input & Prompt Composer */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2"
                >
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      rows={2}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="পিকুকে যেকোনো প্রশ্ন করুন... (e.g. স্টকের কি অবস্থা?)"
                      className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none transition leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white shadow-2xs transition cursor-pointer"
                    title="Send message (Enter)"
                  >
                    <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Press <kbd className="font-mono bg-slate-100 px-1 rounded border border-slate-200">Enter</kbd> to send</span>
                  <span>Piku AI Assistant • SmartInventory</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
