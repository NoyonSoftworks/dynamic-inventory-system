import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Role-based route access control
const ROLE_ACCESS = {
  viewer: ["/", "/reports", "/login", "/update-password"],
  operator: [
    "/",
    "/reports",
    "/operations",
    "/bulk-orders",
    "/login",
    "/update-password",
  ],
  admin: [
    "/",
    "/reports",
    "/operations",
    "/bulk-orders",
    "/add-product",
    "/settings",
    "/login",
    "/update-password",
  ],
};

function hasAccess(role, pathname) {
  const routes = ROLE_ACCESS[role] || ROLE_ACCESS.viewer;
  return routes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Skip static files, api routes, images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow login page and auth callbacks to process securely
  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Service role key bypasses RLS — required for middleware admin lookups
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Read auth token from cookies
  const accessToken = request.cookies.get("sb-access-token")?.value;

  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate the user's JWT token
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  // No valid user → clear stale cookies and redirect to login
  if (userError || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");
    return response;
  }

  // Use service role key (bypasses RLS) for admin lookups in middleware.
  // Falls back to anon key + user's Bearer token if service key isn't set.
  const dbClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

  // Fetch role AND business_id in a single query
  const { data: roleData } = await dbClient
    .from("user_roles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  const role = roleData?.role || "viewer";
  const businessId = roleData?.business_id || "";

  // Check route access
  if (!hasAccess(role, pathname)) {
    const dashUrl = new URL("/", request.url);
    dashUrl.searchParams.set("denied", "1");
    return NextResponse.redirect(dashUrl);
  }

  // Pass user + tenant info via headers so pages can read them
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  response.headers.set("x-user-email", user.email || "");
  response.headers.set("x-user-role", role);
  response.headers.set("x-user-business-id", businessId);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
