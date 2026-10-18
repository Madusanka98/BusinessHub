import { describe, it, expect, beforeAll, afterAll } from "vitest";
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

import { prisma } from "@/lib/db/prisma";
import {
  requestPasswordReset,
  verifyPasswordResetToken,
  completePasswordResetWithToken,
} from "@/modules/core-tenancy/services/auth.service";

describe("Database-Backed Password Reset Flow", () => {
  const testEmail = `pw-reset-${Date.now()}@test.local`;
  let testUserId: string;

  beforeAll(async () => {
    const pwd = await hashPassword("InitialPass@123!");
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: "Reset Test User",
        passwordHash: pwd,
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it("persists a hashed token in database and completes password reset", async () => {
    // 1. Request password reset
    const reqResult = await requestPasswordReset(testEmail);
    expect(reqResult.success).toBe(true);

    // 2. Query token record from database
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId: testUserId, status: "PENDING" },
    });
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord?.tokenHash).toBeDefined();

    // 3. Directly test completePasswordResetWithToken by generating token
    const testRawToken = "test-raw-token-value-256bit-entropy";
    const { hashToken } = await import("@/lib/auth/tokens");
    const customHash = hashToken(testRawToken);

    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        tokenHash: customHash,
        expiresAt: new Date(Date.now() + 3600000),
        status: "PENDING",
      },
    });

    // 4. Verify token
    const verification = await verifyPasswordResetToken(testRawToken);
    expect(verification.valid).toBe(true);
    expect(verification.email).toBe(testEmail);

    // 5. Complete password reset with new password
    const newPass = "NewSecureP@ssw0rd999#";
    const completeResult = await completePasswordResetWithToken(testRawToken, newPass);
    expect(completeResult.success).toBe(true);

    // 6. Verify password updated
    const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(await verifyPassword(newPass, updatedUser!.passwordHash)).toBe(true);

    // 7. Verify token status is now CONSUMED
    const consumedToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: customHash } });
    expect(consumedToken?.status).toBe("CONSUMED");

    // 8. Replay attack rejection: token cannot be reused
    const replayAttempt = await completePasswordResetWithToken(testRawToken, "AnotherP@ssw0rd999#");
    expect(replayAttempt.success).toBe(false);
    expect(replayAttempt.error).toContain("already been used");
  });
});

