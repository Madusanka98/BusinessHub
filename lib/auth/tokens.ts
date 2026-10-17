import "server-only";
import crypto from "node:crypto";

/**
 * Generates an unpredictable 256-bit cryptographically secure random token (64 hex characters).
 */
export function generateCryptographicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a SHA-256 hash of a raw token for safe database persistence.
 * Raw tokens must NEVER be stored in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Constant-time comparison of token hashes to mitigate timing attacks.
 */
export function compareTokenHashes(hashA: string, hashB: string): boolean {
  if (!hashA || !hashB || hashA.length !== hashB.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hashA), Buffer.from(hashB));
}

/**
 * Generates an expiration timestamp relative to now.
 * Default: 48 hours for business invitations, 1 hour for password resets.
 */
export function generateTokenExpiry(hours: number = 48): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
