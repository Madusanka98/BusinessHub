import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface RecordAuditParams {
  businessId?: string | null;
  userId?: string | null;
  actionType: string;
  targetEntity: string;
  targetId: string;
  clientIp?: string | null;
  changeDetails?: Record<string, unknown> | null;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "rawToken",
  "secret",
  "authorization",
  "creditCard",
]);

/**
 * Strips sensitive keys recursively from metadata before writing to audit logs.
 */
function sanitizeAuditPayload(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeAuditPayload);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeAuditPayload(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Appends an immutable audit event to the database.
 * Accepts optional transaction client (tx) to guarantee relational consistency during transactions.
 */
export async function recordAuditEvent(params: RecordAuditParams, tx?: Prisma.TransactionClient) {
  try {
    const client = tx ?? prisma;
    const cleanDetails = params.changeDetails
      ? (sanitizeAuditPayload(params.changeDetails) as Prisma.InputJsonValue)
      : undefined;

    return await client.auditEvent.create({
      data: {
        businessId: params.businessId ?? null,
        userId: params.userId ?? null,
        actionType: params.actionType,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        clientIp: params.clientIp ?? null,
        changeDetails: cleanDetails,
      },
    });
  } catch (error) {
    console.error("[CRITICAL AUDIT FAILURE] Failed to write audit event:", error);
    return null;
  }
}
