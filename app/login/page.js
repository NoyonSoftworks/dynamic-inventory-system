"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";

// ── View Modes ──────────────────────────────────────────────
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
    const target = (params.get("redirect") || params.get("next") || "").trim();

    const isSuperAdmin =
      Boolean(currentUserEmail) &&
      currentUserEmail.toLowerCase().trim() === ADMIN_EMAIL;
    const defaultTarget = isSuperAdmin ? "/admin" : "/dashboard/products";

    if (
      target.startsWith("/") &&
      !target.startsWith("//") &&
      !target.startsWith("/\\") &&
      !target.includes("://")
    ) {
      return target === "/" ? defaultTarget : target;
    }

    return defaultTarget;
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

      setMessage("A verification code has been sent to your email address.");
      setResendTimer(60);
    } catch (err) {
      setError(err?.message || "Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  // ── Form Submit Handler ────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // 1. SIGN IN WITH PASSWORD
      if (view === VIEW.SIGN_IN) {
        const { data, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInErr) {
          if (
            signInErr.message?.toLowerCase().includes("email not confirmed")
          ) {
            setOtpType("signup");
            switchView(VIEW.OTP_VERIFICATION);
            setMessage("Please enter the verification code sent to your email.");
            setResendTimer(60);
            return;
          }
          throw signInErr;
        }

        if (data?.session) {
          setAuthCookies(data.session);
          const target = getRedirectTarget(data.user?.email);
          router.replace(target);
        }
      }

      // 2. SIGN UP WITH EMAIL & PASSWORD
      if (view === VIEW.SIGN_UP) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpErr) throw signUpErr;

        if (data?.session) {
          setAuthCookies(data.session);
          const target = getRedirectTarget(data.user?.email);
          router.replace(target);
          return;
        }

        setOtpType("signup");
        switchView(VIEW.OTP_VERIFICATION);
        setMessage("We've sent a 6-digit confirmation code to your email.");
        setResendTimer(60);
      }

      // 3. RESET PASSWORD (REQUEST CODE)
      if (view === VIEW.RESET) {
        const { error: resetErr } =
          await supabase.auth.resetPasswordForEmail(email.trim());

        if (resetErr) throw resetErr;

        setOtpType("recovery");
        switchView(VIEW.OTP_VERIFICATION);
        setMessage("Password reset code sent. Please check your inbox.");
        setResendTimer(60);
      }

      // 4. VERIFY OTP CODE
      if (view === VIEW.OTP_VERIFICATION) {
        const cleanOtp = otp.trim().replace(/\D/g, "");
        if (cleanOtp.length !== 6) {
          throw new Error("Please enter a valid 6-digit verification code.");
        }

        const verifyType = otpType === "recovery" ? "recovery" : "signup";
        const { data, error: verifyErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: verifyType,
        });

        if (verifyErr) throw verifyErr;

        if (verifyType === "recovery") {
          router.replace("/update-password");
          return;
        }

        if (data?.session) {
          setAuthCookies(data.session);
          const target = getRedirectTarget(data.user?.email);
          router.replace(target);
        } else {
          switchView(VIEW.SIGN_IN);
          setMessage("Email verified successfully. You can now sign in.");
        }
      }
    } catch (err) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth Handler ───────────────────────────────
  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const params = new URLSearchParams(window.location.search);
      const requestedRedirect = params.get("redirect") || params.get("next") || "/dashboard/products";

      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        requestedRedirect
      )}`;

      const { error: googleErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (googleErr) throw googleErr;
    } catch (err) {
      setError(err?.message || "Google authentication failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  const headings = {
    [VIEW.SIGN_IN]: {
      title: "Sign in to workspace",
      sub: "Enter your credentials to access your inventory and orders.",
    },
    [VIEW.SIGN_UP]: {
      title: "Create your account",
      sub: "Start managing your physical inventory with automated logistics.",
    },
    [VIEW.RESET]: {
      title: "Reset password",
      sub: "Enter your email to receive a secure recovery code.",
    },
    [VIEW.OTP_VERIFICATION]: {
      title: "Enter verification code",
      sub: `Sent to ${email || "your email address"}`,
    },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 font-sans antialiased px-4 py-12 selection:bg-orange-500 selection:text-white">
      {/* ── Subtle Geometric Background Dot Grid ───────────── */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(#ea580c 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="w-full max-w-[420px] space-y-6">
        {/* ── Brand Header ─────────────────────────────────── */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {headings[view].title}
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {headings[view].sub}
          </p>
        </div>

        {/* ── Enterprise Card ──────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-8 shadow-xl shadow-slate-200/50 space-y-5">
          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              <span className="mt-0.5 shrink-0 text-rose-500">
                <ErrorIcon />
              </span>
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              <span className="mt-0.5 shrink-0 text-emerald-600">
                <CheckIcon />
              </span>
              <p className="leading-relaxed font-medium">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === VIEW.OTP_VERIFICATION ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 text-center font-mono uppercase tracking-wider">
                    6-Digit Security Code
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
                    className="block w-full rounded-xl border border-slate-300 bg-white py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] text-slate-900 placeholder:text-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center text-[11px] text-slate-500 font-mono">
                  Code sent to <span className="font-bold text-slate-800">{email}</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner /> Verifying…
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => switchView(VIEW.SIGN_IN)}
                    className="text-slate-500 hover:text-slate-800 transition font-medium"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendTimer > 0 || resendLoading}
                    className="text-slate-500 hover:text-orange-600 disabled:text-slate-300 disabled:cursor-not-allowed transition font-mono font-semibold"
                  >
                    {resendLoading
                      ? "Sending…"
                      : resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : "Resend Code"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Work Email
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-3 text-slate-400">
                      <MailIcon />
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Password field */}
                {view !== VIEW.RESET && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Password
                      </label>
                      {view === VIEW.SIGN_IN && (
                        <button
                          type="button"
                          onClick={() => switchView(VIEW.RESET)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-orange-600 transition"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-3 text-slate-400">
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
                        className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 transition"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-500 btn-tactile transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      {view === VIEW.RESET
                        ? "Sending code…"
                        : view === VIEW.SIGN_UP
                        ? "Creating account…"
                        : "Signing in…"}
                    </span>
                  ) : view === VIEW.RESET ? (
                    "Send Recovery Code"
                  ) : view === VIEW.SIGN_UP ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </button>

                {view === VIEW.RESET && (
                  <button
                    type="button"
                    onClick={() => switchView(VIEW.SIGN_IN)}
                    className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition pt-1"
                  >
                    ← Back to Sign In
                  </button>
                )}

                {/* OAuth & View Toggle */}
                {(view === VIEW.SIGN_IN || view === VIEW.SIGN_UP) && (
                  <>
                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-[11px] font-mono">
                        <span className="bg-white px-2 text-slate-400 uppercase">or</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs btn-tactile transition disabled:opacity-40"
                    >
                      {googleLoading ? <Spinner /> : <GoogleLogo />}
                      <span>{googleLoading ? "Redirecting…" : "Continue with Google"}</span>
                    </button>

                    <div className="pt-2 text-center text-xs text-slate-500">
                      {view === VIEW.SIGN_UP ? (
                        <span>
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => switchView(VIEW.SIGN_IN)}
                            className="font-bold text-orange-600 hover:text-orange-500 hover:underline"
                          >
                            Sign in
                          </button>
                        </span>
                      ) : (
                        <span>
                          Don&apos;t have an account?{" "}
                          <button
                            type="button"
                            onClick={() => switchView(VIEW.SIGN_UP)}
                            className="font-bold text-orange-600 hover:text-orange-500 hover:underline"
                          >
                            Create one
                          </button>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </form>
        </div>

        {/* ── Security & Compliance Footer ─────────────────── */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400 text-center">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>256-Bit SSL Encrypted · Multi-Tenant Isolation</span>
        </div>
      </div>
    </main>
  );
}

// ── Minimalist SVG Icons ─────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-zinc-900"
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
    <svg width="15" height="15" viewBox="0 0 48 48">
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
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
