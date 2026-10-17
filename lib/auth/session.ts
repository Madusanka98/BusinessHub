import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SessionPayload } from "./types";

const SESSION_COOKIE_NAME = "bh_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("NEXTAUTH_SECRET environment variable is missing or insecure.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates and signs an encrypted/tamper-proof JWT session token using HS256.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSecretKey();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifies and decodes a session token. Returns null if invalid, expired, or tampered with.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie on the current HTTP response.
 * Uses strict HttpOnly, SameSite=Lax, and Secure flags in production.
 */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Retrieves and validates the current session payload from the HTTP request cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return await verifySessionToken(token);
}

/**
 * Clears the session cookie to securely log out the user.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
