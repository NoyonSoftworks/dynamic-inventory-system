"use client";

import { supabase } from "@/utils/supabase/client";

/**
 * Standard fetch helper for Super Admin endpoints.
 * Automatically attaches Authorization: Bearer <session.access_token>
 * so that serverless Route Handlers can verify the Super Admin identity reliably
 * even when SSR cookies are partitioned, delayed, or cross-origin.
 *
 * @param {string} url Request URL
 * @param {RequestInit} [options] Fetch options
 * @returns {Promise<Response>}
 */
export async function adminFetch(url, options = {}) {
  let token = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch (err) {
    // Session retrieval note
  }

  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
