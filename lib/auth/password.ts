import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Validates password complexity:
 * Minimum 10 characters, at least one uppercase letter, one lowercase letter, one number, and one symbol.
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 10) {
    return { isValid: false, error: "Password must be at least 10 characters in length." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number." };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character." };
  }
  return { isValid: true };
}

/**
 * Hashes a plaintext password using bcrypt with work factor 12.
 * Never logs or exposes plaintext password.
 */
export async function hashPassword(password: string): Promise<string> {
  const strength = validatePasswordStrength(password);
  if (!strength.isValid) {
    throw new Error(strength.error || "Password does not meet strength requirements.");
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Constant-time comparison prevents timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}
