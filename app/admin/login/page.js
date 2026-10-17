"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: "signin" | "reset" | "update-password"
  const [view, setView] = useState("signin");
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check URL parameters on mount
  useEffect(() => {
    const errParam = searchParams?.get("error");
    if (errParam === "unauthorized" || errParam === "forbidden") {
      setError(
        "Clearance Restricted: You must authenticate with the Super Admin credentials to access the Platform Control Plane."
      );
    }
    const viewParam = searchParams?.get("view");
    if (viewParam === "update-password" || searchParams?.get("type") === "recovery") {
      setView("update-password");
    }
  }, [searchParams]);

  function setAuthCookies(session) {
    if (!session || typeof window === "undefined") return;
    const isHttps = window.location.protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax${secureFlag}`;
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${session.expires_in}; SameSite=Lax${secureFlag}`;
  }

  // Check session on load
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted) {
          if (session?.user) {
            setCurrentUser(session.user);
            const userEmail = (session.user.email || "").toLowerCase().trim();
            if (userEmail === ADMIN_EMAIL) {
              setAuthCookies(session);
              router.replace("/admin");
              return;
            }
          }
          setAuthChecking(false);
        }
      } catch (err) {
        if (isMounted) setAuthChecking(false);
      }
    }

    checkAuth();

    // Listen for auth state changes (e.g. password recovery link clicked)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("update-password");
        setError(null);
        setSuccessMessage("Identity verified via recovery link. Set your new Super Admin password.");
      } else if (event === "SIGNED_IN" && session) {
        setAuthCookies(session);
        const userEmail = (session.user?.email || "").toLowerCase().trim();
        if (userEmail === ADMIN_EMAIL) {
          router.replace("/admin");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Sign out currently active non-admin session
  async function handleSwitchAccount() {
    try {
      setLoading(true);
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      await supabase.auth.signOut();
      setCurrentUser(null);
      setError(null);
      setEmail(ADMIN_EMAIL);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Super Admin Sign In
  async function handleSignIn(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail || !password) {
        throw new Error("Please enter both administrator email and password.");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) throw signInError;

      const user = data?.user;
      const userEmail = (user?.email || "").toLowerCase().trim();

      // Strict Super Admin Verification
      if (userEmail !== ADMIN_EMAIL) {
        // Immediately revoke and reject
        await supabase.auth.signOut();
        document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        throw new Error(
          `Access Denied: Account (${userEmail}) is not the designated Platform Owner. Only ${ADMIN_EMAIL} can access the SaaS Control Plane.`
        );
      }

      if (data?.session) {
        setAuthCookies(data.session);
      }

      setSuccessMessage("Super Admin authenticated! Redirecting to Control Plane…");
      setTimeout(() => {
        router.replace("/admin");
      }, 500);
    } catch (err) {
      setError(err.message || "Failed to authenticate administrator.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Request Password Reset
  async function handleRequestReset(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail) {
        throw new Error("Please specify the Super Admin email address.");
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/admin/login?view=update-password`,
      });

      if (resetErr) throw resetErr;

      setSuccessMessage(
        `A password recovery link has been dispatched to ${cleanEmail}. Please inspect your inbox and spam folder.`
      );
    } catch (err) {
      setError(err.message || "Failed to dispatch recovery instructions.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Update New Password
  async function handleUpdatePassword(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters in length.");
      }
      if (password !== confirmPassword) {
        throw new Error("Password confirmation does not match.");
      }

      const { data, error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) throw updateErr;

      // Verify updated user is indeed admin
      const updatedEmail = (data?.user?.email || "").toLowerCase().trim();
      if (updatedEmail && updatedEmail !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        throw new Error("Unauthorized account attempted password update.");
      }

      setSuccessMessage("Super Admin password updated successfully! Entering Control Plane…");
      setTimeout(() => {
        router.replace("/admin");
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to update administrator password.");
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs font-mono text-slate-400">
            Checking Platform Clearance…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#0B1120] text-slate-100 font-sans antialiased flex items-center justify-center p-4 sm:p-6 selection:bg-orange-500 selection:text-white">
      {/* Background Decorative Grid */}
      <div
        className="absolute inset-0 -z-10 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(#EA580C 1px, transparent 1px), radial-gradient(#0D9488 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          backgroundPosition: "0 0, 16px 16px",
        }}
      />

      <div className="w-full max-w-md space-y-6">
        {/* Top Control Plane Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-950/60 border border-orange-500/40 px-3.5 py-1 text-[11px] font-mono font-bold tracking-widest text-orange-400 uppercase shadow-inner">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Master Control Plane
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Platform Owner Login</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Super Administrator clearance strictly reserved for platform management.
          </p>
        </div>

        {/* Existing Non-Admin Session Warning */}
        {currentUser && (currentUser.email || "").toLowerCase().trim() !== ADMIN_EMAIL && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-200 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <p className="font-semibold">Active Session Detected</p>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              You are signed in as <strong className="text-white font-mono">{currentUser.email}</strong>, which does not have platform owner privileges.
            </p>
            <button
              onClick={handleSwitchAccount}
              disabled={loading}
              className="w-full rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 px-3 py-2 text-xs font-bold text-amber-100 transition"
            >
              Sign Out &amp; Log In as Super Admin
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-teal-500" />

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/50 px-4 py-3 text-xs text-rose-200">
              <span className="mt-0.5 shrink-0 text-rose-400">✕</span>
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-4 py-3 text-xs text-emerald-200">
              <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
              <p className="leading-relaxed font-medium">{successMessage}</p>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {view === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Super Admin Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    ✉
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mdnoyon356268@gmail.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView("reset");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Super Admin</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 2: REQUEST RESET */}
          {view === "reset" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-white">Reset Super Admin Password</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your registered platform owner email. We will send a secure recovery link.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Admin Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    ✉
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mdnoyon356268@gmail.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sending Recovery Link…</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  ← Back to Admin Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: SET NEW PASSWORD */}
          {view === "update-password" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-white">Create New Password</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose a robust password for the Platform Owner account.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Updating Security Password…</span>
                  </>
                ) : (
                  <span>Update Password &amp; Enter Admin</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Security Footer Notice */}
          <div className="border-t border-slate-800/80 pt-4 text-center space-y-2">
            <p className="text-[11px] text-slate-500">
              Are you a client store merchant?{" "}
              <Link
                href="/login"
                className="font-semibold text-orange-400 hover:text-orange-300 underline"
              >
                Merchant Login
              </Link>
            </p>
            <p className="text-[10px] text-slate-600 font-mono">
              IP &amp; session footprints are logged for all administrative attempts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
