import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, MembershipRole } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { assertOwnerQuotaAvailable, assertNotLastOwner } from "./ownerQuota.service";
import { createInvitation } from "./invitation.service";
import { hashPassword } from "@/lib/auth/password";
import { generateCryptographicToken } from "@/lib/auth/tokens";
import {
  CreateBusinessInput,
  UpdateBusinessSettingsInput,
  UpdateMemberRoleInput,
} from "../schemas/business.schema";

/**
 * Generates a URL-safe, unique slug from a business name.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ensures slug uniqueness by appending a random suffix if a conflict exists.
 */
async function generateUniqueSlug(baseName: string, customSlug?: string): Promise<string> {
  const base = customSlug ? slugify(customSlug) : slugify(baseName);
  let candidate = base || "business";

  const existing = await prisma.business.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });

  if (!existing) {
    return candidate;
  }

  // Collision detected: append 4 random alphanumeric characters
  const suffix = generateCryptographicToken().slice(0, 4).toLowerCase();
  candidate = `${candidate}-${suffix}`;
  return candidate;
}

/**
 * Creates a new business tenant and assigns the initial owner.
 * Strictly restricted to Platform Super Admin callers.
 */
export async function createBusinessBySuperAdmin(input: CreateBusinessInput, superAdminUserId: string) {
  const normalizedOwnerEmail = input.initialOwnerEmail.trim().toLowerCase();
  const slug = await generateUniqueSlug(input.name, input.slug);

  return await prisma.$transaction(async (tx) => {
    // 1. Create the Business record
    const business = await tx.business.create({
      data: {
        name: input.name.trim(),
        slug,
        status: "ACTIVE",
        maxOwners: 10,
      },
    });

    // 2. Create the associated BusinessSettings
    const settings = await tx.businessSettings.create({
      data: {
        businessId: business.id,
        businessType: input.businessType?.trim() || null,
        contactEmail: input.contactEmail?.trim() || normalizedOwnerEmail,
        contactPhone: input.contactPhone?.trim() || null,
        address: input.address?.trim() || null,
        timezone: input.timezone || "Asia/Colombo",
        currency: input.currency?.toUpperCase() || "LKR",
      },
    });

    // 3. Resolve or create the initial Owner User
    let ownerUser = await tx.user.findUnique({
      where: { email: normalizedOwnerEmail },
      select: { id: true, email: true },
    });

    let isNewUser = false;
    if (!ownerUser) {
      isNewUser = true;
      // Initialize with high-entropy unguessable hash; invitation or reset flow sets final password
      const initialSecret = generateCryptographicToken();
      const passwordHash = await hashPassword(initialSecret);

      ownerUser = await tx.user.create({
        data: {
          email: normalizedOwnerEmail,
          fullName: input.initialOwnerFullName?.trim() || "Business Owner",
          passwordHash,
          isActive: true,
        },
        select: { id: true, email: true },
      });
    }

    // 4. Create primary OWNER BusinessMembership
    const membership = await tx.businessMembership.create({
      data: {
        businessId: business.id,
        userId: ownerUser.id,
        role: "OWNER",
        status: "ACTIVE",
        equityPercentage: 100.0,
        profitSharePercentage: 100.0,
      },
    });

    // 5. Record immutable audit logs
    await recordAuditEvent(
      {
        businessId: business.id,
        userId: superAdminUserId,
        actionType: "BUSINESS_CREATED",
        targetEntity: "Business",
        targetId: business.id,
        changeDetails: {
          name: business.name,
          slug: business.slug,
          initialOwnerEmail: normalizedOwnerEmail,
          initialOwnerUserId: ownerUser.id,
          currency: settings.currency,
          timezone: settings.timezone,
        },
      },
      tx
    );

    await recordAuditEvent(
      {
        businessId: business.id,
        userId: superAdminUserId,
        actionType: "MEMBER_ASSIGNED_OWNER",
        targetEntity: "BusinessMembership",
        targetId: membership.id,
        changeDetails: {
          role: "OWNER",
          assignedToUserId: ownerUser.id,
          assignedToEmail: normalizedOwnerEmail,
          isInitialOwner: true,
        },
      },
      tx
    );

    return {
      businessId: business.id,
      name: business.name,
      slug: business.slug,
      ownerUserId: ownerUser.id,
      ownerEmail: ownerUser.email,
      isNewUser,
    };
  });
}

/**
 * Retrieves full details and settings for a verified business tenant.
 */
export async function getBusinessDetails(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      settings: true,
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
          invitationTokens: { where: { status: "PENDING", expiresAt: { gt: new Date() } } },
        },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found.");
  }

  // Count active owners
  const activeOwnersCount = await prisma.businessMembership.count({
    where: { businessId, role: "OWNER", status: "ACTIVE" },
  });

  return {
    ...business,
    activeOwnersCount,
  };
}

/**
 * Updates business profile and settings with strict tenant audit logging.
 */
export async function updateBusinessSettings(
  businessId: string,
  input: UpdateBusinessSettingsInput,
  actorUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current settings for diff audit
    const current = await tx.business.findUnique({
      where: { id: businessId },
      include: { settings: true },
    });

    if (!current) {
      throw new Error("Business not found.");
    }

    // 2. Update Business name
    const updatedBusiness = await tx.business.update({
      where: { id: businessId },
      data: { name: input.name.trim() },
    });

    // 3. Upsert BusinessSettings
    const updatedSettings = await tx.businessSettings.upsert({
      where: { businessId },
      update: {
        businessType: input.businessType?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        contactPhone: input.contactPhone?.trim() || null,
        address: input.address?.trim() || null,
        timezone: input.timezone,
        currency: input.currency.toUpperCase(),
        expenseApprovalThreshold: new Prisma.Decimal(input.expenseApprovalThreshold),
        defaultReservePercentage: new Prisma.Decimal(input.defaultReservePercentage),
        autoDeductInventory: input.autoDeductInventory,
      },
      create: {
        businessId,
        businessType: input.businessType?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        contactPhone: input.contactPhone?.trim() || null,
        address: input.address?.trim() || null,
        timezone: input.timezone,
        currency: input.currency.toUpperCase(),
        expenseApprovalThreshold: new Prisma.Decimal(input.expenseApprovalThreshold),
        defaultReservePercentage: new Prisma.Decimal(input.defaultReservePercentage),
        autoDeductInventory: input.autoDeductInventory,
      },
    });

    // 4. Audit event
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "BUSINESS_SETTINGS_UPDATED",
        targetEntity: "BusinessSettings",
        targetId: updatedSettings.id,
        changeDetails: {
          previousName: current.name,
          newName: updatedBusiness.name,
          currency: updatedSettings.currency,
          timezone: updatedSettings.timezone,
          expenseThreshold: updatedSettings.expenseApprovalThreshold.toString(),
          reservePercentage: updatedSettings.defaultReservePercentage.toString(),
        },
      },
      tx
    );

    return {
      business: updatedBusiness,
      settings: updatedSettings,
    };
  });
}

/**
 * Returns all memberships for a business, ensuring tenant scoping.
 */
export async function getBusinessMembers(businessId: string) {
  const members = await prisma.businessMembership.findMany({
    where: { businessId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    fullName: m.user.fullName,
    email: m.user.email,
    phone: m.user.phone,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    status: m.status,
    equityPercentage: m.equityPercentage.toString(),
    profitSharePercentage: m.profitSharePercentage.toString(),
    joinedAt: m.joinedAt,
  }));
}

/**
 * Updates a member's role and equity, strictly enforcing owner quotas and last-owner rules.
 */
export async function updateMemberRole(
  businessId: string,
  input: UpdateMemberRoleInput,
  actorUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify membership exists and belongs to this business
    const member = await tx.businessMembership.findFirst({
      where: { id: input.memberId, businessId },
      include: { user: { select: { email: true, fullName: true } } },
    });

    if (!member) {
      throw new Error("Membership record not found in this business.");
    }

    const previousRole = member.role;
    const targetRole = input.role;

    // 2. Prevent removing the last active owner
    if (previousRole === "OWNER" && targetRole !== "OWNER") {
      await assertNotLastOwner(tx, businessId, member.userId);
    }

    // 3. If promoting to OWNER, verify 1-10 owner limit
    if (targetRole === "OWNER" && previousRole !== "OWNER") {
      await assertOwnerQuotaAvailable(tx, businessId);
    }

    // 4. Update membership
    const updated = await tx.businessMembership.update({
      where: { id: member.id },
      data: {
        role: targetRole,
        equityPercentage: input.equityPercentage !== undefined ? new Prisma.Decimal(input.equityPercentage) : undefined,
        profitSharePercentage:
          input.profitSharePercentage !== undefined ? new Prisma.Decimal(input.profitSharePercentage) : undefined,
      },
    });

    // 5. Record audit trail
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "MEMBER_ROLE_UPDATED",
        targetEntity: "BusinessMembership",
        targetId: member.id,
        changeDetails: {
          memberEmail: member.user.email,
          previousRole,
          newRole: targetRole,
          newEquity: updated.equityPercentage.toString(),
          newProfitShare: updated.profitSharePercentage.toString(),
        },
      },
      tx
    );

    return updated;
  });
}

/**
 * Revokes a business membership, preventing any subsequent access.
 * Protected against deleting or revoking the last active owner.
 */
export async function removeMember(businessId: string, memberId: string, actorUserId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify membership belongs to this business
    const member = await tx.businessMembership.findFirst({
      where: { id: memberId, businessId },
      include: { user: { select: { email: true } } },
    });

    if (!member) {
      throw new Error("Member not found in this business.");
    }

    if (member.status === "REVOKED") {
      throw new Error("Membership is already revoked.");
    }

    // 2. Assure not last owner
    if (member.role === "OWNER" && member.status === "ACTIVE") {
      await assertNotLastOwner(tx, businessId, member.userId);
    }

    // 3. Mark membership as REVOKED
    const updated = await tx.businessMembership.update({
      where: { id: member.id },
      data: { status: "REVOKED" },
    });

    // 4. Audit trail
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "MEMBER_REMOVED",
        targetEntity: "BusinessMembership",
        targetId: member.id,
        changeDetails: {
          memberUserId: member.userId,
          memberEmail: member.user.email,
          revokedRole: member.role,
        },
      },
      tx
    );

    return updated;
  });
}

/**
 * Returns pending unexpired invitations for a business.
 */
export async function getBusinessInvitations(businessId: string) {
  return await prisma.invitationToken.findMany({
    where: {
      businessId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      proposedEquity: true,
      proposedProfitShare: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Fetches tenant-scoped audit activity history.
 */
export async function getBusinessAuditTrail(businessId: string, limit: number = 50) {
  const events = await prisma.auditEvent.findMany({
    where: { businessId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
    take: Math.min(limit, 100),
  });

  return events.map((e) => ({
    id: e.id,
    actionType: e.actionType,
    targetEntity: e.targetEntity,
    targetId: e.targetId,
    timestamp: e.timestamp,
    clientIp: e.clientIp,
    changeDetails: e.changeDetails,
    actor: e.user
      ? { id: e.user.id, fullName: e.user.fullName, email: e.user.email }
      : { id: null, fullName: "System / Super Admin", email: "system" },
  }));
}
