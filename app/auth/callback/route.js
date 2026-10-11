import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Default redirect to dashboard
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Exchange the Auth code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Create the redirection response
      const response = NextResponse.redirect(new URL(next, request.url));

      // ── CRITICAL FIX ──
      // Standard @supabase/supabase-js defaults to local storage on the client side.
      // We must explicitly extract the session tokens and manually set them
      // as browser cookies here on the server so that proxy.js can read them instantly.
      const isSecure = requestUrl.protocol === "https:";
      const maxAge = data.session.expires_in;

      response.cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        maxAge: maxAge,
        sameSite: "lax",
        secure: isSecure,
      });

      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        maxAge: maxAge,
        sameSite: "lax",
        secure: isSecure,
      });

      return response;
    } else {
      console.error("Supabase Auth Callback Error:", error);
    }
  }

  // Fallback if code is missing or exchange fails (e.g. PKCE error)
  return NextResponse.redirect(new URL("/login?error=auth-callback", request.url));
}
