import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const role = body.role || "admin"; // "admin" | "merchant"

    const targetEmail =
      role === "admin"
        ? (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mdnoyon356268@gmail.com")
            .toLowerCase()
            .trim()
        : "freelancerhousepolash@gmail.com";

    const password = "Password@12345";

    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let response = NextResponse.json({
      success: true,
      email: targetEmail,
      redirect: role === "admin" ? "/admin" : "/dashboard/products",
    });

    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // 1. Attempt password sign-in
    let { data, error } = await ssrClient.auth.signInWithPassword({
      email: targetEmail,
      password: password,
    });

    // 2. Self-healing fallback: If user password needs syncing, update via admin client and retry
    if (error) {
      const adminClient = createAdminClient();
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const foundUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase().trim() === targetEmail
      );

      if (foundUser) {
        await adminClient.auth.admin.updateUserById(foundUser.id, {
          password: password,
          email_confirm: true,
        });
        const retry = await ssrClient.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });
        if (retry.error) throw retry.error;
        data = retry.data;
      } else {
        throw error;
      }
    }

    // 3. Set fallback manual token cookies for broad network IP support
    if (data?.session) {
      const isHttps = request.url.startsWith("https:");
      response.cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        maxAge: data.session.expires_in,
        sameSite: "lax",
        secure: isHttps,
      });
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        maxAge: data.session.expires_in,
        sameSite: "lax",
        secure: isHttps,
      });

      return NextResponse.json({
        success: true,
        email: targetEmail,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          user: data.user,
        },
        redirect: role === "admin" ? "/admin" : "/dashboard/products",
      }, {
        headers: response.headers,
      });
    }

    return response;
  } catch (err) {
    console.error("Quick login error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Quick login failed." },
      { status: 500 }
    );
  }
}
