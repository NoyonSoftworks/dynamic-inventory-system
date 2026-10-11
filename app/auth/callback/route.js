import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request) {
  // Extract code and destination from request.nextUrl
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const origin = request.nextUrl.origin;

  if (code) {
    // Prepare the redirect response upfront so session cookies can be attached to it
    let response = NextResponse.redirect(new URL(next, origin));

    // Initialize Supabase client using @supabase/ssr with Next.js cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange the PKCE code for an authenticated session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Explicitly set sb-access-token and sb-refresh-token so proxy.js reads them immediately
      const isSecure = request.nextUrl.protocol === "https:";
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
    }

    if (error) {
      console.error("Callback Error:", error);
    }
  } else {
    console.error("Callback Error: No code parameter found in callback URL");
  }

  // Redirect to login error page if exchange fails or code is missing
  return NextResponse.redirect(new URL("/login?error=auth-callback", origin));
}
