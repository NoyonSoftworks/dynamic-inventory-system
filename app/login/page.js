"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

// ── view modes ───────────────────────────────────────────
const VIEW = {
  SIGN_IN: "signin",
  SIGN_UP: "signup",
  RESET: "reset",
  OTP_VERIFICATION: "otp_verification",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpType, setOtpType] = useState("signup"); // "signup" | "recovery"
  const [view, setView] = useState(VIEW.SIGN_IN);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const ADMIN_EMAIL = (
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
  )
    .toLowerCase()
    .trim();

  function getRedirectTarget(currentUserEmail) {
    if (typeof window === "undefined") return "/dashboard/products";
    const params = new URLSearchParams(window.location.search);
    const target = params.get("redirect") || params.get("next");
    if (target && target.startsWith("/")) return target;

    // Super admin default: /admin | Merchant default: /dashboard/products
    const isSuperAdmin =
      Boolean(currentUserEmail) &&
      currentUserEmail.toLowerCase().trim() === ADMIN_EMAIL;
    return isSuperAdmin ? "/admin" : "/dashboard/products";
  }

  function setAuthCookies(session) {
    if (!session || typeof window === "undefined") return;
    const isHttps = window.location.protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax${secureFlag}`;
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${session.expires_in}; SameSite=Lax${secureFlag}`;
  }

  // ── Auth State Listener for Cookies & Auto-Redirect ───────
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          setAuthCookies(session);
        }
      }

      if (event === "SIGNED_OUT") {
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    });

    // If already authenticated, redirect to requested page
    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthCookies(session);
        const target = getRedirectTarget(session.user.email);
        router.replace(target);
      }
    }
    checkExistingSession();

    return () => subscription.unsubscribe();
  }, [router]);

  // ── 60-Second Cooldown Countdown Timer ─────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  function switchView(v) {
    setView(v);
    setError(null);
    setMessage(null);
    setOtp("");
  }

  // ── Resend OTP Code Handler ────────────────────────────
  async function handleResendCode() {
    if (resendTimer > 0 || resendLoading || !email.trim()) return;
    setResendLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (otpType === "recovery") {
        const { error: resendErr } = await supabase.auth.resetPasswordForEmail(
          email.trim()
        );
        if (resendErr) throw resendErr;
      } else {
        const { error: resendErr } = await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
        });
        if (resendErr) throw resendErr;
      }

      setMessage("A fresh 6-digit verification code has been sent to your email.");
      setResendTimer(60);
    } catch (err) {
      setError(err.message || "Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  // ── Form Submission ────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // 1. ── OTP Verification Mode ────────────────────────
      if (view === VIEW.OTP_VERIFICATION) {
        if (!otp.trim() || otp.trim().length !== 6) {
          throw new Error("Please enter a valid 6-digit verification code.");
        }

        const { data, error: verifyErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: otpType, // 'signup' | 'recovery'
        });

        if (verifyErr) {
          throw new Error(verifyErr.message || "Invalid or expired verification code.");
        }

        // Set cookies immediately before redirect
        if (data?.session) {
          setAuthCookies(data.session);
        }

        setMessage("Verification successful! Redirecting...");
        const target = getRedirectTarget(data?.user?.email || email);
        router.push(target);
        return;
      }

      // 2. ── Reset Password (Request OTP) ────────────────
      if (view === VIEW.RESET) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim()
        );
        if (resetErr) throw resetErr;

        setOtpType("recovery");
        setResendTimer(60);
        setView(VIEW.OTP_VERIFICATION);
        setMessage(
          "Password reset code sent! Please enter the 6-digit code from your email."
        );
        return;
      }

      // 3. ── Sign Up (Triggers OTP) ───────────────────────
      if (view === VIEW.SIGN_UP) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpErr) {
          if (signUpErr.message.includes("already registered")) {
            throw new Error(
              "This email is already registered. Try signing in instead."
            );
          }
          throw signUpErr;
        }

        if (data?.user?.identities?.length === 0) {
          throw new Error(
            "This email is already registered. Try signing in instead."
          );
        }

        setOtpType("signup");
        setResendTimer(60);
        setView(VIEW.OTP_VERIFICATION);
        setMessage(
          "Account created! Please enter the 6-digit verification code sent to your email."
        );
        setPassword("");
        return;
      }

      // 4. ── Standard Sign In (with Email Confirmation Intercept) ─
      const { error: signInErr, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        // Intercept 'Email not confirmed' specifically
        if (
          signInErr.message.toLowerCase().includes("email not confirmed") ||
          signInErr.message.toLowerCase().includes("email address not confirmed")
        ) {
          // Trigger a fresh OTP code to be sent to them
          try {
            await supabase.auth.resend({
              type: "signup",
              email: email.trim(),
            });
          } catch (resendErr) {
            console.warn("Auto-resend OTP error:", resendErr);
          }

          setOtpType("signup");
          setOtp("");
          setResendTimer(60);
          setView(VIEW.OTP_VERIFICATION);
          setMessage(
            "Your email is not confirmed yet. We've sent a new 6-digit verification code to your email."
          );
          return;
        }

        if (signInErr.message.includes("Invalid login credentials")) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again."
          );
        }

        throw signInErr;
      }

      // ── Manual Frontend Email Confirmation Security Lock ──
      if (!data?.user?.email_confirmed_at) {
        // 1. Immediately destroy unverified session
        await supabase.auth.signOut();
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
        document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;

        // 2. Automatically trigger a new OTP
        try {
          await supabase.auth.resend({
            type: "signup",
            email: email.trim(),
          });
        } catch (resendErr) {
          console.warn("Auto-resend OTP error:", resendErr);
        }

        // 3. Switch UI back to OTP_VERIFICATION and start 60s cooldown
        setOtpType("signup");
        setOtp("");
        setResendTimer(60);
        setView(VIEW.OTP_VERIFICATION);

        // 4. Set error message
        setError("Please verify your email first. A new 6-digit code has been sent to your email.");
        return;
      }

      // Set cookies immediately before redirect to prevent race conditions
      if (data?.session) {
        setAuthCookies(data.session);
      }

      const target = getRedirectTarget(data?.user?.email || email);
      router.push(target);
      return;
    } catch (err) {
      setError(
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ───────────────────────────────────────
  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);

    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthErr) throw oauthErr;
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  // ── heading config per view ────────────────────
  const headings = {
    [VIEW.SIGN_IN]: {
      title: "Welcome Back",
      sub: "Sign in to your inventory dashboard",
    },
    [VIEW.SIGN_UP]: {
      title: "Create Account",
      sub: "Sign up to start managing your inventory",
    },
    [VIEW.RESET]: {
      title: "Reset Password",
      sub: "We'll send a 6-digit verification code to your email",
    },
    [VIEW.OTP_VERIFICATION]: {
      title: "Enter 6-Digit Code",
      sub: `Enter the code sent to ${email || "your email address"}`,
    },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* ── animated gradient background ────────────────── */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950" />
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-500/40 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-500/40 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-cyan-500/20 blur-[100px] animate-pulse [animation-delay:4s]" />
      </div>

      {/* ── subtle grid overlay ─────────────────────────── */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="w-full max-w-md space-y-8">
        {/* ── logo & heading ───────────────────────────── */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 shadow-lg">
            <span className="text-3xl">📦</span>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
            {headings[view].title}
          </h1>
          <p className="mt-2 text-sm text-indigo-200/70">
            {headings[view].sub}
          </p>
        </div>

        {/* ── glassmorphism card ────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="relative rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl space-y-6"
        >
          {/* decorative corner glows */}
          <div className="pointer-events-none absolute -top-px -right-px h-20 w-20 rounded-tr-3xl bg-gradient-to-bl from-indigo-400/20 to-transparent" />
          <div className="pointer-events-none absolute -bottom-px -left-px h-20 w-20 rounded-bl-3xl bg-gradient-to-tr from-purple-400/20 to-transparent" />

          {/* ── alerts ─────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 backdrop-blur">
              <span className="mt-0.5 shrink-0 text-red-400">
                <ErrorIcon />
              </span>
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          {message && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 backdrop-blur">
              <span className="mt-0.5 shrink-0 text-emerald-400">
                <CheckIcon />
              </span>
              <p className="text-sm text-emerald-200">{message}</p>
            </div>
          )}

          {/* ── VIEW: OTP VERIFICATION ──────────────────── */}
          {view === VIEW.OTP_VERIFICATION ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-indigo-100/80 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="block w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 px-4 text-center text-3xl font-mono tracking-widest text-white shadow-inner placeholder:text-indigo-300/30 focus:border-indigo-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition"
                />
              </div>

              <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                <p className="text-xs text-indigo-200/60">
                  Code sent to <span className="font-semibold text-white">{email}</span>
                </p>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 focus:ring-2 focus:ring-indigo-400/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700" />
                {loading ? (
                  <span className="inline-flex items-center gap-2.5">
                    <Spinner /> Verifying Code…
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              {/* Resend Code Text Button with 60s Cooldown */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || resendLoading}
                  className="text-xs font-medium text-indigo-300/80 hover:text-white disabled:text-indigo-300/40 disabled:cursor-not-allowed transition"
                >
                  {resendLoading ? (
                    "Sending new code…"
                  ) : resendTimer > 0 ? (
                    <span>
                      Resend code in{" "}
                      <strong className="text-white font-mono">{resendTimer}s</strong>
                    </span>
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>

              {/* Back to sign in */}
              <button
                type="button"
                onClick={() => switchView(VIEW.SIGN_IN)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-indigo-200 hover:bg-white/[0.08] hover:border-white/20 focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition-all duration-200"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : (
            /* ── VIEW: SIGN IN / SIGN UP / RESET ──────────── */
            <>
              {/* email field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-indigo-100/80">
                  Email Address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300/50">
                    <MailIcon />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="block w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-sm text-white shadow-inner placeholder:text-indigo-300/30 focus:border-indigo-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* password field (hidden in RESET) */}
              {view !== VIEW.RESET && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-indigo-100/80">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300/50">
                      <LockIcon />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete={
                        view === VIEW.SIGN_IN ? "current-password" : "new-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-12 text-sm text-white shadow-inner placeholder:text-indigo-300/30 focus:border-indigo-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-indigo-300/50 hover:text-indigo-200 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {view === VIEW.SIGN_UP && (
                    <p className="text-xs text-indigo-300/40">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>
              )}

              {/* forgot password link (sign-in only) */}
              {view === VIEW.SIGN_IN && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchView(VIEW.RESET)}
                    className="text-xs font-medium text-indigo-300/60 hover:text-indigo-200 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* submit button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 focus:ring-2 focus:ring-indigo-400/40 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700" />

                {loading ? (
                  <span className="inline-flex items-center gap-2.5">
                    <Spinner />
                    {view === VIEW.RESET
                      ? "Sending Code…"
                      : view === VIEW.SIGN_UP
                      ? "Creating Account…"
                      : "Signing In…"}
                  </span>
                ) : view === VIEW.RESET ? (
                  "Send 6-Digit Code"
                ) : view === VIEW.SIGN_UP ? (
                  "Sign Up with Code"
                ) : (
                  "Sign In"
                )}
              </button>

              {/* back to login (reset view only) */}
              {view === VIEW.RESET && (
                <button
                  type="button"
                  onClick={() => switchView(VIEW.SIGN_IN)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-indigo-200 hover:bg-white/[0.08] hover:border-white/20 focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition-all duration-200"
                >
                  ← Back to Sign In
                </button>
              )}

              {/* OAuth + toggle (sign-in / sign-up views) */}
              {(view === VIEW.SIGN_IN || view === VIEW.SIGN_UP) && (
                <>
                  {/* divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 text-indigo-300/40 bg-[rgba(15,15,30,0.5)]">
                        or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="group w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-medium text-white hover:bg-white/[0.12] hover:border-white/20 focus:ring-2 focus:ring-indigo-400/20 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {googleLoading ? <Spinner /> : <GoogleLogo />}
                    {googleLoading ? "Redirecting…" : "Sign in with Google"}
                  </button>

                  {/* toggle sign-in / sign-up */}
                  <div className="relative mt-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 text-indigo-300/40 bg-[rgba(15,15,30,0.5)]">
                        {view === VIEW.SIGN_UP
                          ? "Already registered?"
                          : "New here?"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      switchView(
                        view === VIEW.SIGN_UP ? VIEW.SIGN_IN : VIEW.SIGN_UP
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-indigo-200 hover:bg-white/[0.08] hover:border-white/20 focus:ring-2 focus:ring-indigo-400/20 focus:outline-none transition-all duration-200"
                  >
                    {view === VIEW.SIGN_UP
                      ? "Sign in to existing account"
                      : "Create a new account"}
                  </button>
                </>
              )}
            </>
          )}
        </form>

        {/* footer */}
        <p className="text-center text-xs text-indigo-300/30">
          Dynamic Inventory Management System
        </p>
      </div>
    </main>
  );
}

// ── icons ─────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
