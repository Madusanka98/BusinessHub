import "server-only";
import { Prisma } from "@prisma/client";

export class OwnerLimitExceededError extends Error {
  constructor(message: string = "Maximum business owner limit (1-10) reached.") {
    super(message);
    this.name = "OwnerLimitExceededError";
  }
}

/**
 * Validates and enforces the 1-10 owner limit within a database transaction.
 * Must be executed inside a Prisma transaction (tx).
 */
export async function assertOwnerQuotaAvailable(
  tx: Prisma.TransactionClient,
  businessId: string
): Promise<{ maxOwners: number; currentOwners: number; pendingInvites: number }> {
  // 1. Fetch business and lock settings
  const business = await tx.business.findUnique({
    where: { id: businessId },
    select: { id: true, maxOwners: true },
  });

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  // 2. Count active owners
  const activeOwnersCount = await tx.businessMembership.count({
    where: {
      businessId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // 3. Count pending, unexpired owner invitations
  const pendingOwnerInvitesCount = await tx.invitationToken.count({
    where: {
      businessId,
      role: "OWNER",
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  const totalCommittedAndPending = activeOwnersCount + pendingOwnerInvitesCount;

  // 4. Strict ceiling validation
  if (totalCommittedAndPending >= business.maxOwners) {
    throw new OwnerLimitExceededError(
      `Cannot add owner: Business has reached its maximum quota of ${business.maxOwners} owners (${activeOwnersCount} active, ${pendingOwnerInvitesCount} pending).`
    );
  }

  return {
    maxOwners: business.maxOwners,
    currentOwners: activeOwnersCount,
    pendingInvites: pendingOwnerInvitesCount,
  };
}

/**
 * Asserts that revoking or modifying a member's role will not leave the business with zero owners.
 */
export async function assertNotLastOwner(
  tx: Prisma.TransactionClient,
  businessId: string,
  userId: string
): Promise<void> {
  const currentMembership = await tx.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId } },
    select: { role: true, status: true },
  });

  if (currentMembership?.role === "OWNER" && currentMembership.status === "ACTIVE") {
    const totalOwners = await tx.businessMembership.count({
      where: { businessId, role: "OWNER", status: "ACTIVE" },
    });

    if (totalOwners <= 1) {
      throw new Error("Cannot revoke or modify role: A business must maintain at least one active owner.");
    }
  }
}
