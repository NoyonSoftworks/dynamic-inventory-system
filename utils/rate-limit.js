/**
 * In-Memory Sliding Window Rate Limiter for Next.js App Router API Routes.
 * Suitable for production single-instance or serverless container runtimes.
 * Prevents endpoint hammering, brute force attacks, and DDOS.
 */

const rateLimitMap = new Map();

// Periodic garbage collection every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const GC_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, GC_INTERVAL_MS).unref?.();
}

/**
 * Checks if a given identifier exceeds the rate limit.
 *
 * @param {string} identifier - Unique key (e.g. client IP, API key, user ID)
 * @param {object} options
 * @param {number} options.limit - Maximum number of requests allowed in window (default: 60)
 * @param {number} options.windowMs - Time window in milliseconds (default: 60,000 = 1 minute)
 * @returns {{ success: boolean, limit: number, remaining: number, resetTime: number, retryAfterSec: number }}
 */
export function checkRateLimit(identifier, { limit = 60, windowMs = 60000 } = {}) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime,
      retryAfterSec: 0,
    };
  }

  // Existing window
  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const isAllowed = record.count <= limit;
  const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

  return {
    success: isAllowed,
    limit,
    remaining,
    resetTime: record.resetTime,
    retryAfterSec: isAllowed ? 0 : Math.max(1, retryAfterSec),
  };
}

/**
 * Helper to extract client IP address from standard Next.js request headers.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}
