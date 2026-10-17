import { describe, it, expect } from "vitest";
import {
  generateCryptographicToken,
  hashToken,
  compareTokenHashes,
  generateTokenExpiry,
} from "@/lib/auth/tokens";

describe("Cryptographic Token & Hashing Security", () => {
  it("generates 256-bit (64 hex characters) unpredictable tokens", () => {
    const token1 = generateCryptographicToken();
    const token2 = generateCryptographicToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it("hashes raw tokens using SHA-256 deterministically", () => {
    const raw = "test-raw-token-1234567890abcdef";
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(raw);
  });

  it("compares token hashes with constant-time equality", () => {
    const raw = generateCryptographicToken();
    const hash = hashToken(raw);

    expect(compareTokenHashes(hash, hash)).toBe(true);
    expect(compareTokenHashes(hash, hashToken("different-token"))).toBe(false);
    expect(compareTokenHashes(hash, "")).toBe(false);
  });

  it("generates future expiration timestamps properly", () => {
    const now = Date.now();
    const expiry48h = generateTokenExpiry(48);

    expect(expiry48h.getTime()).toBeGreaterThan(now + 47 * 3600 * 1000);
    expect(expiry48h.getTime()).toBeLessThan(now + 49 * 3600 * 1000);
  });
});
