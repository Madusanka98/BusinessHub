import { describe, it, expect, beforeAll } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session";
import { SessionPayload } from "@/lib/auth/types";

describe("Session JWT Encryption & Validation", () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "super-secret-test-key-32-chars-long-12345";
  });

  const mockPayload: SessionPayload = {
    userId: "user_test_123",
    email: "owner@farm.local",
    fullName: "Kasun Owner",
    isSuperAdmin: false,
    activeBusinessId: "biz_test_456",
  };

  it("signs and successfully decodes a valid session token", async () => {
    const token = await signSessionToken(mockPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(mockPayload.userId);
    expect(decoded?.email).toBe(mockPayload.email);
    expect(decoded?.activeBusinessId).toBe(mockPayload.activeBusinessId);
    expect(decoded?.isSuperAdmin).toBe(false);
  });

  it("rejects tampered tokens with invalid signature", async () => {
    const token = await signSessionToken(mockPayload);
    const tampered = token.slice(0, -6) + "abcdef"; // corrupt signature

    const result = await verifySessionToken(tampered);
    expect(result).toBeNull();
  });

  it("rejects garbage strings safely", async () => {
    const result = await verifySessionToken("not-a-valid-jwt-token");
    expect(result).toBeNull();
  });
});
