import "server-only";
import { prisma } from "@/lib/db/prisma";
import { generateCryptographicToken, hashToken, generateTokenExpiry } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { sendInvitationEmail } from "@/lib/email/mailer";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { assertOwnerQuotaAvailable } from "./ownerQuota.service";
import { MembershipRole } from "@prisma/client";

export interface CreateInvitationInput {
  businessId: string;
  email: string;
  role: MembershipRole;
  inviterUserId: string;
  proposedEquity?: number;
  proposedProfitShare?: number;
}

export interface AcceptInvitationInput {
  rawToken: string;
  fullName?: string;
  password?: string;
  existingUserId?: string;
}

export async function createInvitation(input: CreateInvitationInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const rawToken = generateCryptographicToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = generateTokenExpiry(48); // 48-hour expiration

  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify business exists and is active
    const business = await tx.business.findUnique({
      where: { id: input.businessId },
      select: { id: true, name: true, status: true, maxOwners: true },
    });

    if (!business || (business.status !== "ACTIVE" && business.status !== "PENDING_SETUP")) {
      throw new Error("Business is not active or available for invitations.");
    }

    // 2. Check if the email is already an active member of this business
    const existingMembership = await tx.businessMembership.findFirst({
      where: {
        businessId: input.businessId,
        user: { email: normalizedEmail },
        status: "ACTIVE",
      },
    });

    if (existingMembership) {
      throw new Error(`User with email '${normalizedEmail}' is already an active member of this business.`);
    }

    // 3. If inviting an OWNER, enforce concurrency-safe owner quota
    if (input.role === "OWNER") {
      await assertOwnerQuotaAvailable(tx, input.businessId);
    }

    // 4. Invalidate any existing pending invites for this email + business
    await tx.invitationToken.updateMany({
      where: {
        businessId: input.businessId,
        email: normalizedEmail,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    // 5. Persist SHA-256 hash
    const invitation = await tx.invitationToken.create({
      data: {
        businessId: input.businessId,
        email: normalizedEmail,
        tokenHash,
        role: input.role,
        proposedEquity: input.proposedEquity ? input.proposedEquity : undefined,
        proposedProfitShare: input.proposedProfitShare ? input.proposedProfitShare : undefined,
        status: "PENDING",
        expiresAt,
      },
    });

    // 6. Record audit event within transaction
    await recordAuditEvent(
      {
        businessId: input.businessId,
        userId: input.inviterUserId,
        actionType: "MEMBER_INVITED",
        targetEntity: "InvitationToken",
        targetId: invitation.id,
        changeDetails: {
          invitedEmail: normalizedEmail,
          assignedRole: input.role,
          expiresAt: expiresAt.toISOString(),
        },
      },
      tx
    );

    return {
      invitationId: invitation.id,
      email: normalizedEmail,
      businessName: business.name,
      expiresAt,
      role: input.role,
      devTokenPreview: process.env.NODE_ENV !== "production" ? rawToken : undefined,
    };
  });

  // 7. Dispatch invitation email outside transaction to avoid blocking DB
  await sendInvitationEmail(normalizedEmail, result.businessName, rawToken, input.role);

  return result;
}

/**
 * Validates a raw token from the URL. Returns public invitation details if valid.
 */
export async function getInvitationByToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== "string") {
    return { valid: false, error: "Invalid token provided." };
  }

  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.invitationToken.findUnique({
    where: { tokenHash },
    include: {
      business: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  if (!invitation) {
    return { valid: false, error: "Invitation not found or link is invalid." };
  }

  if (invitation.status === "CONSUMED") {
    return { valid: false, error: "This invitation link has already been used." };
  }

  if (invitation.status === "REVOKED") {
    return { valid: false, error: "This invitation was revoked by the business administrator." };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: "This invitation has expired (valid for 48 hours). Please request a new link." };
  }

  // Check if a user account already exists for this email
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, fullName: true },
  });

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      businessId: invitation.businessId,
      businessName: invitation.business.name,
      role: invitation.role,
      proposedEquity: invitation.proposedEquity?.toString(),
      proposedProfitShare: invitation.proposedProfitShare?.toString(),
      hasExistingAccount: !!existingUser,
      existingFullName: existingUser?.fullName,
    },
  };
}

/**
 * Consumes an invitation atomically and creates/attaches the user membership.
 */
export async function acceptInvitation(input: AcceptInvitationInput) {
  const tokenHash = hashToken(input.rawToken);

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch and atomically check invitation record
    const invitation = await tx.invitationToken.findUnique({
      where: { tokenHash },
      include: {
        business: { select: { id: true, name: true, status: true, maxOwners: true } },
      },
    });

    if (!invitation) {
      throw new Error("Invalid invitation token.");
    }

    if (invitation.status !== "PENDING") {
      throw new Error(`Invitation is no longer active (status: ${invitation.status}).`);
    }

    if (invitation.expiresAt < new Date()) {
      await tx.invitationToken.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Invitation has expired.");
    }

    // 2. Resolve or create user account
    let targetUserId = input.existingUserId;

    if (!targetUserId) {
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        if (!input.password || !input.fullName) {
          throw new Error("Full name and password are required to create a new account.");
        }
        const passwordHash = await hashPassword(input.password);
        const newUser = await tx.user.create({
          data: {
            email: invitation.email,
            fullName: input.fullName.trim(),
            passwordHash,
            isActive: true,
          },
        });
        targetUserId = newUser.id;
      }
    }

    // 3. If accepting an OWNER role, verify quota one final time
    if (invitation.role === "OWNER") {
      const activeOwners = await tx.businessMembership.count({
        where: { businessId: invitation.businessId, role: "OWNER", status: "ACTIVE" },
      });
      if (activeOwners >= invitation.business.maxOwners) {
        throw new Error("Cannot accept: Maximum owner quota reached for this business.");
      }
    }

    // 4. Create or activate BusinessMembership
    const membership = await tx.businessMembership.upsert({
      where: {
        businessId_userId: {
          businessId: invitation.businessId,
          userId: targetUserId,
        },
      },
      update: {
        role: invitation.role,
        status: "ACTIVE",
        equityPercentage: invitation.proposedEquity ?? 0.00,
        profitSharePercentage: invitation.proposedProfitShare ?? 0.00,
      },
      create: {
        businessId: invitation.businessId,
        userId: targetUserId,
        role: invitation.role,
        status: "ACTIVE",
        equityPercentage: invitation.proposedEquity ?? 0.00,
        profitSharePercentage: invitation.proposedProfitShare ?? 0.00,
      },
    });

    // 5. If business was in PENDING_SETUP, transition it to ACTIVE
    if (invitation.business.status === "PENDING_SETUP") {
      await tx.business.update({
        where: { id: invitation.businessId },
        data: { status: "ACTIVE" },
      });
    }

    // 6. Mark token CONSUMED atomically
    await tx.invitationToken.update({
      where: { id: invitation.id },
      data: { status: "CONSUMED" },
    });

    // 7. Audit log within transaction
    await recordAuditEvent(
      {
        businessId: invitation.businessId,
        userId: targetUserId,
        actionType: "INVITATION_ACCEPTED",
        targetEntity: "BusinessMembership",
        targetId: membership.id,
        changeDetails: {
          email: invitation.email,
          assignedRole: invitation.role,
        },
      },
      tx
    );

    return {
      success: true,
      userId: targetUserId,
      businessId: invitation.businessId,
      businessName: invitation.business.name,
      role: membership.role,
    };
  });
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(invitationId: string, actorUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const invite = await tx.invitationToken.findUnique({
      where: { id: invitationId },
    });

    if (!invite || invite.status !== "PENDING") {
      throw new Error("Invitation not found or cannot be revoked.");
    }

    const updated = await tx.invitationToken.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });

    await recordAuditEvent(
      {
        businessId: invite.businessId,
        userId: actorUserId,
        actionType: "INVITATION_REVOKED",
        targetEntity: "InvitationToken",
        targetId: invite.id,
        changeDetails: { email: invite.email },
      },
      tx
    );

    return updated;
  });
}
