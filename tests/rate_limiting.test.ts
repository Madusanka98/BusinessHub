import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

describe("Security: In-Memory Sliding-Window Rate Limiter", () => {
  const testKey = "test:auth:user@domain.com";

  beforeEach(() => {
    resetRateLimit(testKey);
  });

  it("should allow attempts within the configured threshold", () => {
    const res1 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("should reject attempts when threshold is exceeded", () => {
    checkRateLimit(testKey, { limit: 2, windowMs: 1000 });
    checkRateLimit(testKey, { limit: 2, windowMs: 1000 });

    const blocked = checkRateLimit(testKey, { limit: 2, windowMs: 1000 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("should reset rate limit explicitly upon successful authentication", () => {
    checkRateLimit(testKey, { limit: 2, windowMs: 1000 });
    checkRateLimit(testKey, { limit: 2, windowMs: 1000 });

    // Resetting
    resetRateLimit(testKey);

    const afterReset = checkRateLimit(testKey, { limit: 2, windowMs: 1000 });
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });
});
