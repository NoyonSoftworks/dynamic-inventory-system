import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

const ROLE_ACCESS = {
  viewer: [
    "/",
    "/dashboard/products",
    "/reports",
    "/login",
    "/update-password",
  ],
  operator: [
    "/",
    "/dashboard",
    "/reports",
    "/operations",
    "/bulk-orders",
    "/login",
    "/update-password",
  ],
  admin: [
    "/",
    "/dashboard",
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

  // 1. Skip static assets, Next.js internal files, and API endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Allow authentication routes without redirection
  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // 3. Initialize Supabase SSR Middleware Client properly
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

  // 4. Retrieve current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Also check manual token cookie fallback if SSR cookie is not present
  let currentUser = user;
  if (!currentUser) {
    const rawToken = request.cookies.get("sb-access-token")?.value;
    if (rawToken) {
      const fallbackClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: rawData } = await fallbackClient.auth.getUser(rawToken);
      if (rawData?.user) {
        currentUser = rawData.user;
      }
    }
  }

  const userEmail = (currentUser?.email || "").toLowerCase().trim();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  // 5. REQUIREMENT: Handle /admin Route Security
  if (isAdminRoute) {
    // If not logged in OR email does NOT match admin email -> strictly redirect to /?denied=1
    if (!currentUser || userEmail !== ADMIN_EMAIL) {
      const deniedUrl = new URL("/", request.url);
      deniedUrl.searchParams.set("denied", "1");
      return NextResponse.redirect(deniedUrl);
    }

    // If they ARE the admin -> allow access to proceed
    return response;
  }

  // 6. REQUIREMENT: Ensure other existing dashboard protection rules remain intact
  // Unauthenticated users are redirected to /login
  if (!currentUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Look up user role and business workspace
  const dbClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : supabase;

  const { data: roleData } = await dbClient
    .from("user_roles")
    .select("role, business_id")
    .eq("id", currentUser.id)
    .maybeSingle();

  let role = roleData?.role || "viewer";
  const businessId = roleData?.business_id || "";

  // Admin email always has admin role across all standard client views
  if (userEmail === ADMIN_EMAIL) {
    role = "admin";
  }

  // Role-based route check
  if (!hasAccess(role, pathname)) {
    const deniedUrl = new URL("/", request.url);
    deniedUrl.searchParams.set("denied", "1");
    return NextResponse.redirect(deniedUrl);
  }

  // Pass user headers downstream
  response.headers.set("x-user-email", currentUser.email || "");
  response.headers.set("x-user-role", role);
  response.headers.set("x-user-business-id", businessId);

  return response;
}

// Support both `proxy` and `middleware` naming conventions
export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
