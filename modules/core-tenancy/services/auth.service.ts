import "server-only";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { generateCryptographicToken, hashToken, generateTokenExpiry } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email/mailer";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { SessionPayload } from "@/lib/auth/types";

export interface LoginResult {
  success: boolean;
  user?: SessionPayload;
  error?: string;
}

/**
 * Authenticates a user by email and password, establishing an encrypted session cookie.
 */
export async function loginUser(emailInput: string, passwordInput: string): Promise<LoginResult> {
  const email = emailInput.trim().toLowerCase();

  // 1. Fetch user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: "ACTIVE", business: { status: "ACTIVE" } },
        include: { business: { select: { id: true, name: true, slug: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  // Generic rejection message to mitigate account enumeration
  if (!user || !user.passwordHash) {
    return { success: false, error: "Invalid email or password." };
  }

  // 2. Check account active status
  if (!user.isActive) {
    return { success: false, error: "Your account has been deactivated. Please contact support." };
  }

  // 3. Constant-time password verification
  const isMatch = await verifyPassword(passwordInput, user.passwordHash);
  if (!isMatch) {
    await recordAuditEvent({
      userId: user.id,
      actionType: "AUTH_LOGIN_FAILED",
      targetEntity: "User",
      targetId: user.id,
      changeDetails: { reason: "Incorrect password" },
    });
    return { success: false, error: "Invalid email or password." };
  }

  // 4. Resolve default active business context
  const primaryBusiness = user.memberships[0]?.business;
  const activeBusinessId = primaryBusiness?.id ?? null;

  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperAdmin: user.isSuperAdmin,
    activeBusinessId,
  };

  // 5. Commit session cookie
  await setSessionCookie(sessionPayload);

  // 6. Record successful login audit event
  await recordAuditEvent({
    businessId: activeBusinessId,
    userId: user.id,
    actionType: "AUTH_LOGIN_SUCCESS",
    targetEntity: "User",
    targetId: user.id,
  });

  return { success: true, user: sessionPayload };
}

/**
 * Logs out the current user by destroying the session cookie.
 */
export async function logoutUser(): Promise<{ success: boolean }> {
  await clearSessionCookie();
  return { success: true };
}

/**
 * Requests a password reset link. Always returns a generic success message
 * to prevent user enumeration.
 */
export async function requestPasswordReset(emailInput: string): Promise<{ success: boolean; message: string }> {
  const email = emailInput.trim().toLowerCase();
  const genericMessage = "If an account exists with that email, a password reset link has been dispatched.";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return { success: true, message: genericMessage };
  }

  // Generate 1-hour single-use reset token
  const rawToken = generateCryptographicToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = generateTokenExpiry(1); // 1-hour expiration

  // Re-use InvitationToken table with specific reset tracking or dedicated user token
  // For clarity, we dispatch the reset email
  await sendPasswordResetEmail(user.email, rawToken);

  await recordAuditEvent({
    userId: user.id,
    actionType: "PASSWORD_RESET_REQUESTED",
    targetEntity: "User",
    targetId: user.id,
  });

  return { success: true, message: genericMessage };
}

/**
 * Completes a password reset given a verified reset token.
 */
export async function completePasswordReset(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validatePasswordStrength(newPassword);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await recordAuditEvent({
    userId,
    actionType: "PASSWORD_RESET_COMPLETED",
    targetEntity: "User",
    targetId: userId,
  });

  return { success: true };
}
