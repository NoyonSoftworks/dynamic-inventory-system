"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useBusinessContext } from "@/utils/supabase/business";

function SparkleIcon({ className = "w-4 h-4 text-orange-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function SendIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function ClearIcon({ className = "w-3.5 h-3.5 text-slate-400" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

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
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
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

function MarkdownText({ content }) {
  if (!content) return null;
  const lines = content.split("\n");

  return (
    <div className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-sm text-slate-900 mt-3 mb-1">
              {renderInline(trimmed.replace("### ", ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-base text-slate-900 mt-3.5 mb-1.5">
              {renderInline(trimmed.replace("## ", ""))}
            </h3>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-1">
              <span className="text-orange-500 font-bold select-none">•</span>
              <span className="flex-1 text-slate-700">{renderInline(text)}</span>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-1">
              <span className="font-mono text-xs font-semibold text-orange-600 select-none">
                {numMatch[1]}.
              </span>
              <span className="flex-1 text-slate-700">{renderInline(numMatch[2])}</span>
            </div>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={idx}
              className="border-l-3 border-orange-400 pl-3 py-1.5 text-slate-600 bg-orange-50/50 rounded-r-md text-xs my-1.5"
            >
              {renderInline(trimmed.replace("> ", ""))}
            </blockquote>
          );
        }
        return (
          <p key={idx} className="text-slate-700">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function PikuFullPage() {
  const { businessName, role } = useBusinessContext();
  const [messages, setMessages] = useState([
    {
      sender: "piku",
      text: `### 👋 স্বাগতম! আমি **পিকু (Piku)**, আপনার স্টোরের সার্বক্ষণিক এআই অ্যাডভাইজার। 🤖✨\n\nআমি **${
        businessName || "আপনার স্টোর"
      }** এর লাইভ ইনভেন্টরি, অর্ডার ভলিউম, কুরিয়ার স্টেটমেন্ট ও খরচ বিশ্লেষণ করে আপনাকে সঠিক সিদ্ধান্ত নিতে সাহায্য করি।\n\n**আপনি যা যা জিজ্ঞাসা করতে পারেন:**\n- 📦 *\"আমার কোন কোন প্রোডাক্টের স্টক শেষ হয়ে যাচ্ছে?\"*\n- 🚚 *\"Steadfast ও Pathao এ রিটার্ন পার্সেল কমানোর উপায় কি?\"*\n- 💰 *\"কুরিয়ার অটো-রিকনসিলিয়েশন কিভাবে করব?\"*\n- 💵 *\"গত সপ্তাহের নিট প্রফিট কিভাবে হিসাব করব?\"*\n\nনিচের সাজেস্টেড প্রশ্নে ক্লিক করুন বা নিজের ভাষায় লিখুন!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedQuestions: [
        "🏬 আমার স্টোরের বর্তমান লাইভ অবস্থা কি?",
        "📦 কুরিয়ারে RTO রিটার্ন পার্সেল কমানোর কৌশল",
        "💰 Steadfast & Pathao অটো-রিকনসিলিয়েশন গাইড",
        "📊 রিঅর্ডার পয়েন্ট (ROP) ও সেফটি স্টক সূত্র",
      ],
      quickActions: [
        { label: "🚀 অর্ডার ডিসপ্যাচ", href: "/bulk-orders" },
        { label: "📑 কুরিয়ার রিকনসিলিয়েশন", href: "/dashboard/reconciliation" },
        { label: "📦 প্রোডাক্ট ক্যাটালগ", href: "/dashboard/products" },
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [storeSnapshot, setStoreSnapshot] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
          history: messages.slice(-8),
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        if (data.storeSnapshot) {
          setStoreSnapshot(data.storeSnapshot);
        }

        const pikuReply = {
          sender: "piku",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          quickActions: data.quickActions || [],
          suggestedQuestions: data.suggestedQuestions || [],
        };
        setMessages((prev) => [...prev, pikuReply]);
      } else {
        throw new Error(data.error || "পিকুর রেসপন্স পেতে সমস্যা হচ্ছে।");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "piku",
          text: `⚠️ **পিকুর সংযোগে সমস্যা:** ${err.message || "দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।"}\n\nজরুরি সহায়তার জন্য আমাদের [Help & Support](/dashboard/support) ডেস্কে যোগাযোগ করুন।`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleClearChat() {
    if (confirm("আপনি কি চ্যাট ক্লিয়ার করতে চান?")) {
      setMessages([messages[0]]);
    }
  }

  const topicPlaybooks = [
    {
      title: "🏬 স্টোরের লাইভ অবস্থা",
      desc: "স্টক, অর্ডার ও ব্যালেন্স সারসংক্ষেপ",
      prompt: "আমার স্টোরের বর্তমান অবস্থা কি?",
      icon: "🏬",
    },
    {
      title: "📦 রিটার্ন ও RTO কমানো",
      desc: "ফেক অর্ডার প্রতিরোধ ও অগ্রিম ডেলিভারি ফি",
      prompt: "কুরিয়ারে RTO রিটার্ন পার্সেল কমানোর উপায় কি?",
      icon: "🛡️",
    },
    {
      title: "💰 কুরিয়ার রিকনসিলিয়েশন",
      desc: "Steadfast ও Pathao সিওডি টাকা মেলানো",
      prompt: "Steadfast & Pathao অটো-রিকনসিলিয়েশন কিভাবে করব?",
      icon: "📑",
    },
    {
      title: "📊 স্টক ও রিঅর্ডার পয়েন্ট",
      desc: "স্টকআউট প্রতিরোধে সেফটি স্টক সূত্র",
      prompt: "স্টক শেষ হওয়ার আগেই রিস্টক করার সূত্র কি?",
      icon: "📈",
    },
    {
      title: "🏷️ বারকোড ও লেবেল প্রিন্ট",
      desc: "থার্মাল প্রিন্টার ও স্ক্যানার গাইড",
      prompt: "বারকোড স্ক্যানার এবং লেবেল প্রিন্ট কিভাবে করব?",
      icon: "🏷️",
    },
    {
      title: "💵 লাভ-ক্ষতি ও নিট প্রফিট",
      desc: "রিটার্ন লস ও দৈনিক খরচ হিসাবের নিয়ম",
      prompt: "নিট প্রফিট এবং দৈনিক খরচ কিভাবে হিসাব করব?",
      icon: "💵",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header Strip ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white shadow-md text-2xl select-none">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Piku AI Assistant &amp; Store Copilot
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 uppercase font-mono">
                <SparkleIcon className="w-2.5 h-2.5 text-orange-600" />
                Live AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {businessName || "Your Store"} এর ইনভেন্টরি, কুরিয়ার রিকনসিলিয়েশন এবং সেলস বাড়ানোর স্মার্ট সহায়ক
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClearChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs transition cursor-pointer"
            title="Clear chat thread"
          >
            <ClearIcon />
            <span>নতুন চ্যাট শুরু করুন</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Playbooks + Chat Stream ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Topics & Live Context (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Topic Playbooks */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Quick Topics &amp; Playbooks</span>
              <span className="text-[10px] text-orange-600 font-sans">১-ক্লিক প্রশ্ন</span>
            </h3>

            <div className="space-y-1.5">
              {topicPlaybooks.map((tp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(tp.prompt)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200/70 hover:border-orange-300 hover:bg-orange-50/50 transition shadow-2xs group cursor-pointer flex items-start gap-2.5"
                >
                  <span className="text-lg select-none shrink-0 mt-0.5">{tp.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-orange-900 truncate">
                      {tp.title}
                    </div>
                    <div className="text-[11px] text-slate-400 group-hover:text-slate-600 truncate">
                      {tp.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Module Jump Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Direct Module Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <Link
                href="/bulk-orders"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 transition text-center"
              >
                🚀 Orders
              </Link>
              <Link
                href="/dashboard/reconciliation"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 transition text-center"
              >
                📑 Reconciliation
              </Link>
              <Link
                href="/dashboard/products"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 transition text-center"
              >
                📦 Products
              </Link>
              <Link
                href="/dashboard/reports"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 transition text-center"
              >
                📈 Profit Report
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Full Chat Stream (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col h-[700px]">
          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F8FAFC]">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === "user";

              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} group animate-in fade-in duration-200`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 border border-orange-200 text-orange-600 text-sm shadow-2xs mt-0.5">
                      🤖
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-2xs relative ${
                        isUser
                          ? "bg-slate-900 text-white rounded-tr-xs"
                          : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <MarkdownText content={msg.text} />
                      )}

                      {/* Footer */}
                      <div
                        className={`flex items-center justify-between gap-3 mt-2 pt-1 text-[11px] ${
                          isUser ? "text-slate-400 border-t border-slate-800" : "text-slate-400 border-t border-slate-100"
                        }`}
                      >
                        <span className="font-mono">{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.text, idx)}
                            className="hover:text-slate-700 transition cursor-pointer flex items-center gap-1"
                            title="Copy reply text"
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

                    {/* Quick Action Navigation Pills */}
                    {!isUser && msg.quickActions && msg.quickActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.quickActions.map((qa, i) => (
                          <Link
                            key={i}
                            href={qa.href}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition hover:border-slate-300"
                          >
                            <span>{qa.label}</span>
                            <span className="text-slate-400 text-xs">→</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Suggested Questions */}
                    {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && idx === messages.length - 1 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                          Suggested Next Questions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((sq, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendMessage(sq)}
                              className="px-3 py-1.5 rounded-lg text-xs bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-900 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
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

            {loading && (
              <div className="flex items-start gap-3 animate-in fade-in duration-150">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 border border-orange-200 text-orange-600 text-sm">
                  🤖
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">পিকু আপনার স্টোরের তথ্য বিশ্লেষণ করছে...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-3"
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
                  placeholder="পিকুকে যেকোনো প্রশ্ন করুন... (e.g. আমার স্টোরে লো স্টক প্রোডাক্ট কি কি? বা কুরিয়ারে রিটার্ন কমানোর উপায় কি?)"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none transition leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white shadow-2xs transition cursor-pointer"
                title="Send message (Enter)"
              >
                <SendIcon />
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-sans">
              <span>Press <kbd className="font-mono bg-slate-100 px-1 rounded border border-slate-200">Enter</kbd> to send, <kbd className="font-mono bg-slate-100 px-1 rounded border border-slate-200">Shift+Enter</kbd> for new line</span>
              <span>Piku AI Assistant • 24/7 E-Commerce Copilot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
