import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { MembershipRole } from "@prisma/client";

export interface TenantContext {
  userId: string;
  email: string;
  fullName: string;
  businessId: string;
  businessName: string;
  role: MembershipRole;
  isSuperAdmin: boolean;
}

export class AuthenticationError extends Error {
  constructor(message: string = "User is not authenticated.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "User is not authorized for this business operation.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Resolves and strictly verifies the active business context on the server.
 * Never trusts client-supplied tenant IDs without verifying active database membership.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new AuthenticationError("Authentication required.");
  }

  // Verify that the user account is active in the database
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, fullName: true, isActive: true, isSuperAdmin: true },
  });

  if (!user || !user.isActive) {
    throw new AuthenticationError("User account is inactive or disabled.");
  }

  let activeBusinessId = session.activeBusinessId;

  // If no active business is saved in session, resolve the first active membership
  if (!activeBusinessId) {
    const firstMembership = await prisma.businessMembership.findFirst({
      where: { userId: user.id, status: "ACTIVE", business: { status: "ACTIVE" } },
      select: { businessId: true },
      orderBy: { joinedAt: "asc" },
    });

    if (!firstMembership) {
      throw new AuthorizationError("User does not hold active membership in any business.");
    }
    activeBusinessId = firstMembership.businessId;
  }

  // Perform mandatory database verification of the active membership
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: {
        businessId: activeBusinessId,
        userId: user.id,
      },
    },
    include: {
      business: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new AuthorizationError("User is not an active member of this business.");
  }

  if (membership.business.status !== "ACTIVE") {
    throw new AuthorizationError(`Business is currently ${membership.business.status.toLowerCase()}.`);
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    businessId: membership.businessId,
    businessName: membership.business.name,
    role: membership.role,
    isSuperAdmin: user.isSuperAdmin,
  };
}

/**
 * Non-throwing variant of getTenantContext. Returns null if unauthenticated or without active business.
 */
export async function tryGetTenantContext(): Promise<TenantContext | null> {
  try {
    return await getTenantContext();
  } catch {
    return null;
  }
}

