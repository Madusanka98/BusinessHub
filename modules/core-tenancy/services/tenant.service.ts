import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getSession, setSessionCookie } from "@/lib/auth/session";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { AuthorizationError } from "@/lib/tenant/context";

/**
 * Returns all active business organizations where the given user has active membership.
 */
export async function getUserAuthorizedBusinesses(userId: string) {
  const memberships = await prisma.businessMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      business: { status: "ACTIVE" },
    },
    include: {
      business: {
        select: { id: true, name: true, slug: true, status: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    businessId: m.business.id,
    businessName: m.business.name,
    businessSlug: m.business.slug,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

/**
 * Switches the active tenant context for the authenticated user, setting a new session cookie.
 */
export async function switchActiveTenant(targetBusinessId: string) {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new AuthorizationError("Authentication required.");
  }

  // 1. Mandatory server-side verification: Does user have active membership in targetBusinessId?
  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: {
        businessId: targetBusinessId,
        userId: session.userId,
      },
    },
    include: {
      business: { select: { id: true, name: true, status: true } },
    },
  });

  if (!membership || membership.status !== "ACTIVE" || membership.business.status !== "ACTIVE") {
    throw new AuthorizationError("You do not hold an active membership in this business organization.");
  }

  // 2. Commit updated session cookie
  const updatedPayload = {
    ...session,
    activeBusinessId: targetBusinessId,
  };
  await setSessionCookie(updatedPayload);

  // 3. Audit trail
  await recordAuditEvent({
    businessId: targetBusinessId,
    userId: session.userId,
    actionType: "TENANT_CONTEXT_SWITCHED",
    targetEntity: "Business",
    targetId: targetBusinessId,
  });

  return {
    success: true,
    activeBusinessId: targetBusinessId,
    activeBusinessName: membership.business.name,
    role: membership.role,
  };
}
