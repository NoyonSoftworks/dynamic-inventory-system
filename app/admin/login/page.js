"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: "signin" | "reset" | "direct-new-password"
  const [view, setView] = useState("signin");
  // Reset method: "email_otp" | "recovery_phone"
  const [resetMethod, setResetMethod] = useState("email_otp");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [otpDispatched, setOtpDispatched] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // ── Brute Force Rate Limiting State ────────────────────────
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Check and sync lockout state from sessionStorage on mount
  useEffect(() => {
    function evaluateLockout() {
      if (typeof window === "undefined") return;
      try {
        const lockoutUntil = parseInt(
          sessionStorage.getItem("saas_adm_lockout_until") || "0",
          10
        );
        const now = Date.now();
        if (lockoutUntil > now) {
          const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
          setLockoutRemaining(remainingSec);
        } else {
          setLockoutRemaining(0);
        }
      } catch (err) {
        console.warn("Rate limit sync note:", err);
      }
    }
    evaluateLockout();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem("saas_adm_lockout_until");
          sessionStorage.removeItem("saas_adm_failed_count");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  function recordFailedAttempt() {
    if (typeof window === "undefined") return;
    try {
      const currentCount =
        parseInt(sessionStorage.getItem("saas_adm_failed_count") || "0", 10) + 1;
      sessionStorage.setItem("saas_adm_failed_count", String(currentCount));

      if (currentCount >= MAX_FAILED_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        sessionStorage.setItem("saas_adm_lockout_until", String(until));
        setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
      }
    } catch {}
  }

  function resetFailedAttempts() {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("saas_adm_failed_count");
      sessionStorage.removeItem("saas_adm_lockout_until");
      setLockoutRemaining(0);
    } catch {}
  }

  function setAuthCookies(session) {
    if (!session || typeof window === "undefined") return;
    const isHttps = window.location.protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax${secureFlag}`;
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${session.expires_in}; SameSite=Lax${secureFlag}`;
  }

  // Handle URL hash recovery tokens from Supabase email links
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (accessToken && (type === "recovery" || !type)) {
          supabase.auth
            .setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            })
            .then(({ data }) => {
              if (data?.session) {
                setAuthCookies(data.session);
                setView("direct-new-password");
                setSuccessMessage(
                  "Identity verified via recovery link! Please set your new Super Admin password below."
                );
              }
            });
        }
      } catch (hashErr) {
        console.warn("Hash session parse note:", hashErr);
      }
    }
  }, []);

  // Check URL search parameters on mount
  useEffect(() => {
    const errParam = searchParams?.get("error");
    if (errParam === "unauthorized" || errParam === "forbidden") {
      setError(
        "Clearance Restricted: Authenticate with authorized administrator credentials to access the Platform Control Plane."
      );
    }
  }, [searchParams]);

  // Check active session on load
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

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("direct-new-password");
        setError(null);
        setSuccessMessage(
          "Identity verified via recovery link. Set your new Super Admin password."
        );
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
      document.cookie =
        "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      await supabase.auth.signOut();
      setCurrentUser(null);
      setError(null);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── 1. HANDLE SIGN IN ──────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (lockoutRemaining > 0) {
      setError(
        `Too many failed attempts. Terminal locked for security. Please wait ${Math.floor(
          lockoutRemaining / 60
        )}m ${lockoutRemaining % 60}s.`
      );
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail || !password) {
        throw new Error("Enter both administrator email and master password.");
      }

      // Security delay (1200ms) to throttle brute-force scripts
      await new Promise((res) => setTimeout(res, 1200));

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (signInError) {
        recordFailedAttempt();
        throw new Error("Invalid administrator credentials or unauthorized clearance.");
      }

      const user = data?.user;
      const userEmail = (user?.email || "").toLowerCase().trim();

      // Strict Super Admin Verification
      if (userEmail !== ADMIN_EMAIL) {
        recordFailedAttempt();
        await supabase.auth.signOut();
        document.cookie =
          "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        throw new Error("Invalid administrator credentials or unauthorized clearance.");
      }

      // Successful login resets rate limits
      resetFailedAttempts();

      if (data?.session) {
        setAuthCookies(data.session);
      }

      setSuccessMessage("Identity verified. Redirecting to Master Control Plane…");
      setTimeout(() => {
        router.replace("/admin");
      }, 500);
    } catch (err) {
      setError(err.message || "Invalid administrator credentials or unauthorized clearance.");
    } finally {
      setLoading(false);
    }
  }

  // ── 2. HANDLE REQUEST 6-DIGIT EMAIL CODE ───────────────────
  async function handleRequestEmailCode(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail) {
        throw new Error("Enter your registered administrator email address.");
      }

      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "request_code", email: cleanEmail }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to dispatch recovery code.");
      }

      setOtpDispatched(true);
      setSuccessMessage(
        "A 6-digit verification code has been dispatched to your email! Enter it below with your new password."
      );
    } catch (err) {
      setError(err.message || "Failed to dispatch recovery code.");
    } finally {
      setLoading(false);
    }
  }

  // ── 3. HANDLE VERIFY OTP & RESET PASSWORD ──────────────────
  async function handleVerifyOtpAndReset(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanOtp = otpCode.trim().replace(/\D/g, "");

      if (!cleanEmail) throw new Error("Administrator email is required.");
      if (cleanOtp.length < 6) throw new Error("Please enter the 6-digit verification code.");
      if (!password || password.length < 6)
        throw new Error("New password must be at least 6 characters in length.");
      if (password !== confirmPassword)
        throw new Error("Password confirmation does not match.");

      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "verify_code_and_reset",
          email: cleanEmail,
          otp: cleanOtp,
          newPassword: password,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to reset password.");
      }

      setSuccessMessage(
        "Super Admin password updated successfully! Redirecting to sign in…"
      );
      setTimeout(() => {
        setView("signin");
        setPassword("");
        setConfirmPassword("");
        setOtpCode("");
        setOtpDispatched(false);
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to reset password with code.");
    } finally {
      setLoading(false);
    }
  }

  // ── 4. HANDLE EMERGENCY RESET VIA RECOVERY PHONE ───────────
  async function handleResetViaPhone(e) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPhone = recoveryPhone.trim();

      if (!cleanEmail) throw new Error("Administrator email is required.");
      if (!cleanPhone) throw new Error("Registered recovery phone number is required.");
      if (!password || password.length < 6)
        throw new Error("New password must be at least 6 characters in length.");
      if (password !== confirmPassword)
        throw new Error("Password confirmation does not match.");

      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "recovery_phone",
          email: cleanEmail,
          recoveryPhone: cleanPhone,
          newPassword: password,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Emergency phone verification failed.");
      }

      setSuccessMessage(
        "Super Admin password updated successfully via Emergency Recovery Phone! Redirecting to sign in…"
      );
      setTimeout(() => {
        setView("signin");
        setPassword("");
        setConfirmPassword("");
        setRecoveryPhone("");
      }, 1500);
    } catch (err) {
      setError(err.message || "Emergency reset failed.");
    } finally {
      setLoading(false);
    }
  }

  // ── 5. HANDLE DIRECT PASSWORD UPDATE (AFTER MAGIC LINK HASH) ─
  async function handleDirectPasswordUpdate(e) {
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

      setSuccessMessage(
        "Super Admin password updated successfully! Entering Master Control Plane…"
      );
      setTimeout(() => {
        router.replace("/admin");
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to update administrator password.");
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 text-slate-300 font-sans">
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
        {currentUser &&
          (currentUser.email || "").toLowerCase().trim() !== ADMIN_EMAIL && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <p className="font-semibold">Active Session Detected</p>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                You are currently signed in as a non-administrative account.
              </p>
              <button
                onClick={handleSwitchAccount}
                disabled={loading}
                className="w-full rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 px-3 py-2 text-xs font-bold text-amber-100 transition cursor-pointer"
              >
                Sign Out &amp; Authenticate as Super Admin
              </button>
            </div>
          )}

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-teal-500" />

          {/* Rate Limit Lockout Banner */}
          {lockoutRemaining > 0 && (
            <div className="rounded-2xl border border-rose-500/60 bg-rose-950/80 p-4 text-xs text-rose-200 space-y-1.5 animate-pulse">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <span>🛡️</span>
                <span>Anti-Brute Force Lockout Active</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-300/90">
                Too many consecutive failed attempts detected. Access is temporarily locked.
              </p>
              <div className="pt-1 font-mono text-sm font-black text-rose-200">
                Unlock in: {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {error && !lockoutRemaining && (
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

          {/* ======================================================= */}
          {/* VIEW 1: SIGN IN                                         */}
          {/* ======================================================= */}
          {view === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Administrator Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    ✉
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourdomain.com"
                    disabled={lockoutRemaining > 0}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono transition disabled:opacity-40"
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
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                      setOtpCode("");
                      setOtpDispatched(false);
                    }}
                    className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition cursor-pointer"
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={lockoutRemaining > 0}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutRemaining > 0}
                className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying Clearance…</span>
                  </>
                ) : lockoutRemaining > 0 ? (
                  <span>Terminal Locked</span>
                ) : (
                  <>
                    <span>Sign In to Super Admin</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================= */}
          {/* VIEW 2: PASSWORD RECOVERY PORTAL                        */}
          {/* ======================================================= */}
          {view === "reset" && (
            <div className="space-y-5">
              <div className="space-y-1 text-left border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔑</span>
                  <span>Super Admin Password Recovery</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose your verified verification method to restore master access.
                </p>

                {/* Sub-Tabs: Email 6-Digit Code vs Emergency Phone */}
                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetMethod("email_otp");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      resetMethod === "email_otp"
                        ? "bg-orange-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    ✉️ 6-Digit Email Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMethod("recovery_phone");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      resetMethod === "recovery_phone"
                        ? "bg-orange-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    📞 Emergency Phone (Instant)
                  </button>
                </div>
              </div>

              {/* METHOD A: 6-DIGIT EMAIL CODE */}
              {resetMethod === "email_otp" && (
                <div className="space-y-4">
                  {!otpDispatched ? (
                    // Step 1: Send Code
                    <form onSubmit={handleRequestEmailCode} className="space-y-4" autoComplete="off">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Administrator Email
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                            ✉
                          </span>
                          <input
                            type="email"
                            required
                            autoComplete="off"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@yourdomain.com"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono transition"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Dispatching 6-Digit Code…</span>
                          </>
                        ) : (
                          <span>Send 6-Digit Verification Code</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    // Step 2: Enter Code + New Password
                    <form onSubmit={handleVerifyOtpAndReset} className="space-y-4" autoComplete="off">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          6-Digit Verification Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 123456"
                          className="w-full rounded-xl border border-orange-500/60 bg-slate-900/90 px-3.5 py-2.5 text-center text-base tracking-widest font-mono font-bold text-orange-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                        />
                        <p className="text-[11px] text-slate-400">
                          Check your email inbox for the 6-digit confirmation code.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          New Password
                        </label>
                        <input
                          type="password"
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
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Verifying Code &amp; Updating Password…</span>
                          </>
                        ) : (
                          <span>Verify Code &amp; Update Password</span>
                        )}
                      </button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setOtpDispatched(false)}
                          className="text-xs font-medium text-slate-400 hover:text-white transition"
                        >
                          Didn&apos;t receive code? Resend
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* METHOD B: EMERGENCY RECOVERY PHONE (INSTANT) */}
              {resetMethod === "recovery_phone" && (
                <form onSubmit={handleResetViaPhone} className="space-y-4" autoComplete="off">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Administrator Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@yourdomain.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Registered Recovery Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX or +88017..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono transition"
                    />
                    <p className="text-[11px] text-slate-400">
                      Must match the recovery phone number configured in Admin Settings.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      New Password
                    </label>
                    <input
                      type="password"
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
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying Recovery Phone…</span>
                      </>
                    ) : (
                      <span>Verify Phone &amp; Reset Password</span>
                    )}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setError(null);
                    setSuccessMessage(null);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                    setOtpCode("");
                    setOtpDispatched(false);
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  ← Back to Admin Sign In
                </button>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* VIEW 3: DIRECT NEW PASSWORD (FROM MAGIC LINK HASH)      */}
          {/* ======================================================= */}
          {view === "direct-new-password" && (
            <form onSubmit={handleDirectPasswordUpdate} className="space-y-4" autoComplete="off">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-white">Create New Password</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your identity has been verified via the recovery link. Set a new password for the Platform Owner account.
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
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
                    setEmail("");
                    setPassword("");
                  }}
                  className="text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
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
              IP, failed attempt signatures, and session footprints are permanently logged.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 text-slate-300 font-sans">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="text-xs font-mono text-slate-400">
              Loading Control Plane Access…
            </p>
          </div>
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
