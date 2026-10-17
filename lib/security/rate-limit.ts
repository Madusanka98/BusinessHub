/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints and actions.
 * Automatically evicts stale buckets to maintain bounded memory footprint.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit?: number; // Maximum allowed attempts in window (default: 10)
  windowMs?: number; // Window duration in milliseconds (default: 60,000 = 1 min)
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Checks and increments the rate limit count for a given key (e.g. IP or email:IP).
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 10;
  const windowMs = options.windowMs ?? 60 * 1000;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // New window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newRecord);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt: newRecord.resetAt,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Resets rate limit for a specific key (e.g., upon successful login).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
