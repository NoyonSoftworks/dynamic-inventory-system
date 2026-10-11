import { supabase } from "./client";

/**
 * Get the current authenticated user session.
 * Returns { user, session } or nulls.
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) return { user: null, session: null };
  return { user: session.user, session };
}

/**
 * Get the role for a given email from user_roles table.
 * Defaults to "viewer" if no role row exists.
 */
export async function getUserRole(email) {
  if (!email) return "viewer";

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("email", email)
    .single();

  if (error || !data) return "viewer";
  return data.role;
}

/**
 * Sign out the current user and aggressively clear cookies
 * so proxy.js doesn't attempt to read a revoked token.
 */
export async function signOut() {
  await supabase.auth.signOut();
  if (typeof document !== "undefined") {
    document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  }
}
