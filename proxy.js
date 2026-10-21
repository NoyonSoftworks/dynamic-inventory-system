import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * Super Admin master identity
 */
const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

/**
 * Explicitly whitelisted public routes that completely bypass authentication.
 */
const PUBLIC_EXACT_ROUTES = new Set([
  "/",
  "/demo",
  "/login",
  "/register",
  "/update-password",
  "/admin/login",
]);

const PUBLIC_ROUTE_PREFIXES = [
  "/demo",
  "/login",
  "/register",
  "/auth",
  "/api/auth/business-context",
  "/api/admin/settings",
  "/api/admin/reset-password",
  "/admin/login",
];

/**
 * Protected route prefixes that strictly require an active Supabase session.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/operations",
  "/bulk-orders",
  "/reports",
  "/settings",
  "/add-product",
];

export async function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Skip Next.js internal static assets and public media files
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Explicit Whitelist Check: Completely bypass auth for public routes
  if (
    PUBLIC_EXACT_ROUTES.has(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return NextResponse.next();
  }

  // 3. Protected Route Verification: Only enforce auth for declared protected surfaces
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // If the route is NOT declared as protected (and not public API), allow pass-through
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // 4. Validate Supabase environment configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // 5. Initialize Supabase SSR Middleware Client
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 6. Verify authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fallback: Check manual token cookie if SSR cookie session isn't available
  let currentUser = user;
  if (!currentUser) {
    const rawToken = request.cookies.get("sb-access-token")?.value;
    if (rawToken) {
      try {
        const fallbackClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: rawData } = await fallbackClient.auth.getUser(rawToken);
        if (rawData?.user) {
          currentUser = rawData.user;
        }
      } catch (tokenErr) {
        console.warn("Fallback token verification note:", tokenErr);
      }
    }
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const userEmail = (currentUser?.email || "").toLowerCase().trim();

  // 7. Enforce Redirect to Login for Unauthenticated Access to Protected Routes
  if (!currentUser) {
    if (isAdminRoute) {
      // 100% Stealth: Never reveal /admin exists or redirect to /admin/login.
      // Silently redirect unauthenticated visitors to regular /login.
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 8. Strict Stealth Super Admin Route Protection
  if (isAdminRoute) {
    if (userEmail !== ADMIN_EMAIL) {
      // 100% Stealth: If a regular merchant visits /admin, silently redirect them
      // straight to their merchant dashboard without any error notice or admin clues.
      const dashUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashUrl);
    }
  }



  // 9. Propagate user context headers downstream
  response.headers.set("x-user-id", currentUser.id);
  response.headers.set("x-user-email", userEmail);

  return response;
}

// Aliases for Next.js convention compatibility
export const middleware = proxy;
export default proxy;

/**
 * Strictly scoped matcher: Ignores static files, images, favicon, and file extensions
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml)$).*)",
  ],
};
