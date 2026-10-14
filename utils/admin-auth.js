import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com"
)
  .toLowerCase()
  .trim();

/**
 * Validates whether the incoming request is made by the verified Super Administrator.
 * Checks HTTP-only session cookies and bearer authorization tokens.
 *
 * @param {Request} request Next.js Route Handler request
 * @returns {Promise<{ isAuthorized: boolean, user: object | null, error: string | null, status: number }>}
 */
export async function verifyAdminRequest(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isAuthorized: false,
      user: null,
      error: "Server configuration error: missing Supabase credentials.",
      status: 500,
    };
  }

  try {
    // 1. Check SSR session cookies
    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: authErr,
    } = await ssrClient.auth.getUser();

    let currentUser = user;

    // 2. Fallback to Authorization Bearer token or sb-access-token cookie
    if (!currentUser) {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;
      const cookieToken =
        request.cookies.get("sb-access-token")?.value ||
        request.cookies.get("supabase-auth-token")?.value;
      const token = bearerToken || cookieToken;

      if (token) {
        const fallbackClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: fbData } = await fallbackClient.auth.getUser(token);
        if (fbData?.user) {
          currentUser = fbData.user;
        }
      }
    }

    if (!currentUser) {
      return {
        isAuthorized: false,
        user: null,
        error: "Authentication required to access administrator endpoints.",
        status: 401,
      };
    }

    const email = currentUser.email?.toLowerCase().trim();
    if (email !== ADMIN_EMAIL) {
      return {
        isAuthorized: false,
        user: currentUser,
        error: "Forbidden: Super Administrator clearance required.",
        status: 403,
      };
    }

    return {
      isAuthorized: true,
      user: currentUser,
      error: null,
      status: 200,
    };
  } catch (err) {
    if (err?.digest) throw err;
    console.error("verifyAdminRequest unexpected error:", err);
    return {
      isAuthorized: false,
      user: null,
      error: "Authentication verification failed.",
      status: 500,
    };
  }
}
