"use client";

import { useState, useEffect } from "react";

// Global singleton to hold deferred prompt across re-renders
let globalDeferredPrompt = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    window.dispatchEvent(new Event("pwa-prompt-available"));
  });
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already in standalone display mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    if (globalDeferredPrompt) {
      setCanInstall(true);
    }

    const handlePromptAvail = () => {
      setCanInstall(true);
    };

    window.addEventListener("pwa-prompt-available", handlePromptAvail);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      globalDeferredPrompt = null;
    });

    return () => {
      window.removeEventListener("pwa-prompt-available", handlePromptAvail);
    };
  }, []);

  const triggerInstall = async () => {
    if (globalDeferredPrompt) {
      try {
        globalDeferredPrompt.prompt();
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setCanInstall(false);
        }
        globalDeferredPrompt = null;
      } catch (err) {
        console.error("Install prompt error:", err);
        setModalOpen(true);
      }
    } else {
      // Show instructional modal (iOS, already prompted, or non-Chrome browser)
      setModalOpen(true);
    }
  };

  return {
    canInstall,
    isInstalled,
    isIOS,
    isAndroid,
    modalOpen,
    setModalOpen,
    triggerInstall,
  };
}

export function PWAInstallModal({ isOpen, onClose, isIOS }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">মোবাইল অ্যাপ ইনস্টল করুন</h3>
              <p className="text-xs text-orange-100 font-medium">SmartInventory Mobile App</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            কোনো অ্যাপ স্টোর (Google Play / App Store) এ না গিয়েই সরাসরি আপনার ফোনে দ্রুতগতির নেটিভ অ্যাপ হিসেবে ইনস্টল করে ব্যবহার করুন।
          </p>

          {isIOS ? (
            /* iOS Safari Instructions */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>🍎 iPhone / iPad (Safari) ব্যবহারকারীদের জন্য:</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside pl-1">
                <li>
                  সাফারি ব্রাউজারের নিচে থাকা <span className="font-semibold text-slate-800">Share বাটন (⎋)</span> এ চাপ দিন।
                </li>
                <li>
                  মেনু স্ক্রোল করে <span className="font-semibold text-orange-600">"Add to Home Screen"</span> (বা হোম স্ক্রিনে যোগ করুন) চাপুন।
                </li>
                <li>
                  উপরের ডান কোণায় <span className="font-semibold text-slate-800">"Add"</span> বাটনে চাপ দিলে আপনার মোবাইল স্ক্রিনে অ্যাপটি চলে আসবে!
                </li>
              </ol>
            </div>
          ) : (
            /* Android / Chrome Instructions */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>🤖 Android ও Chrome ব্যবহারকারীদের জন্য:</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside pl-1">
                <li>
                  ব্রাউজারের উপরের ডান কোণায় থাকা <span className="font-semibold text-slate-800">৩ ডট মেনু (⋮)</span> চাপুন।
                </li>
                <li>
                  <span className="font-semibold text-orange-600">"Install app"</span> অথবা <span className="font-semibold text-orange-600">"Add to Home screen"</span> অপশনটি সিলেক্ট করুন।
                </li>
                <li>
                  <span className="font-semibold text-slate-800">"Install"</span> চাপলে সেকেন্ডের মধ্যেই আপনার ফোনে মোবাইল অ্যাপ হিসেবে যুক্ত হবে।
                </li>
              </ol>
            </div>
          )}

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 bg-orange-50/60 p-2 rounded-lg border border-orange-100">
              <span className="text-orange-600 font-bold">⚡</span>
              <span>ফুলস্ক্রিন দ্রুত স্পিড</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-50/60 p-2 rounded-lg border border-orange-100">
              <span className="text-orange-600 font-bold">📷</span>
              <span>ক্যামেরা বারকোড গান</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-orange-600 text-white font-semibold text-xs hover:bg-orange-700 transition cursor-pointer shadow-md shadow-orange-500/20"
          >
            বুঝেছি / Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile Bottom Banner Prompt: Shows on mobile devices if not yet installed.
 */
export function PWAMobileBanner() {
  const { canInstall, isInstalled, isIOS, modalOpen, setModalOpen, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("pwa_banner_dismissed") === "true") {
        setDismissed(true);
      }
    } catch {}
  }, []);

  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    } catch {}
  };

  return (
    <>
      <div className="md:hidden fixed bottom-16 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border border-orange-200 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">স্মার্টফোনে অ্যাপ ইনস্টল করুন</div>
            <div className="text-[10px] text-slate-500 truncate">এক ট্যাপে ওপেন করুন ও ব্যবহার করুন</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={triggerInstall}
            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            ডাউনলোড
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} isIOS={isIOS} />
    </>
  );
}

/**
 * Reusable Install App Button component for headers / menus
 */
export default function PWAInstallButton({ className = "", compact = false }) {
  const { isInstalled, isIOS, modalOpen, setModalOpen, triggerInstall } = usePWAInstall();

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {compact ? "App" : "App Installed"}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50/80 hover:bg-orange-100/80 text-orange-700 text-xs font-semibold px-2.5 py-1.5 transition cursor-pointer shadow-2xs ${className}`}
        title="Install Mobile App / ডাউনলোড করুন"
      >
        <svg className="w-3.5 h-3.5 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>{compact ? "App" : "Install App"}</span>
      </button>

      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} isIOS={isIOS} />
    </>
  );
}
