import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request) {
  // Extract code and destination from request.nextUrl
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const origin = request.nextUrl.origin;

  if (code) {
    const cookieStore = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookieStore.push(...cookiesToSet);
          },
        },
      }
    );

    // Exchange the PKCE code for an authenticated session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      const userEmail = (data.session.user.email || "").toLowerCase().trim();
      const adminEmail = (
        process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
      )
        .toLowerCase()
        .trim();
      const isSuperAdmin = userEmail === adminEmail;

      let destination = next;
      if (!destination || destination === "/") {
        destination = isSuperAdmin ? "/admin" : "/dashboard/products";
      }

      const redirectUrl = new URL(destination, origin);
      const response = NextResponse.redirect(redirectUrl);

      const isSecure = request.nextUrl.protocol === "https:";
      const maxAge = data.session.expires_in;

      cookieStore.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, {
          ...options,
          path: options?.path || "/",
          sameSite: "lax",
          secure: isSecure,
        });
      });

      // Explicitly set sb-access-token and sb-refresh-token
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