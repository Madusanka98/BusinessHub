import { describe, it, expect } from "vitest";
import { validatePasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Password Security & Hashing", () => {
  it("rejects passwords shorter than 10 characters", () => {
    const res = validatePasswordStrength("Short1!");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("at least 10 characters");
  });

  it("rejects passwords without uppercase letters", () => {
    const res = validatePasswordStrength("lowercase123!@#");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("uppercase letter");
  });

  it("rejects passwords without numbers", () => {
    const res = validatePasswordStrength("NoNumbersInThis!@#");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("number");
  });

  it("rejects passwords without special characters", () => {
    const res = validatePasswordStrength("NoSpecialChars1234");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("special character");
  });

  it("accepts strong passwords meeting all criteria", () => {
    const res = validatePasswordStrength("SecureP@ssw0rd2026!");
    expect(res.isValid).toBe(true);
  });

  it("hashes password and verifies successfully with constant-time compare", async () => {
    const plain = "StrongP@ssw0rd999#";
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix

    const isMatch = await verifyPassword(plain, hash);
    expect(isMatch).toBe(true);

    const wrongMatch = await verifyPassword("WrongPassword123!", hash);
    expect(wrongMatch).toBe(false);
  });
});
