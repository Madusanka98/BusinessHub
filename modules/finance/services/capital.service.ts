import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, ApprovalStatus } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { CreateCapitalContributionInput, CreatePartnerDrawingInput } from "../schemas/finance.schema";

/**
 * Records a partner's initial or additional capital contribution.
 */
export async function recordCapitalContribution(
  businessId: string,
  input: CreateCapitalContributionInput,
  actorUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify membership belongs to this business
    const membership = await tx.businessMembership.findFirst({
      where: { id: input.membershipId, businessId },
      include: { user: { select: { fullName: true, email: true } } },
    });

    if (!membership) {
      throw new Error("Partner membership not found in this business organization.");
    }

    const amountDecimal = new Prisma.Decimal(input.amount);

    // 2. Persist contribution
    const contribution = await tx.partnerCapitalContribution.create({
      data: {
        businessId,
        membershipId: membership.id,
        amount: amountDecimal,
        paymentReference: input.paymentReference?.trim() || null,
        notes: input.notes?.trim() || null,
        contributionDate: new Date(input.contributionDate),
      },
      include: {
        membership: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
    });

    // 3. Immutable audit log
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "CAPITAL_CONTRIBUTION_RECORDED",
        targetEntity: "PartnerCapitalContribution",
        targetId: contribution.id,
        changeDetails: {
          partnerEmail: membership.user.email,
          amount: contribution.amount.toString(),
          paymentReference: contribution.paymentReference,
        },
      },
      tx
    );

    return contribution;
  });
}

/**
 * Lists all capital contributions for the active business.
 */
export async function getBusinessCapitalContributions(businessId: string) {
  return await prisma.partnerCapitalContribution.findMany({
    where: { businessId },
    include: {
      membership: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
    orderBy: { contributionDate: "desc" },
  });
}

/**
 * Requests a partner drawing / withdrawal.
 */
export async function requestPartnerDrawing(
  businessId: string,
  input: CreatePartnerDrawingInput,
  actorUserId: string,
  actorRole: string
) {
  return await prisma.$transaction(async (tx) => {
    const membership = await tx.businessMembership.findFirst({
      where: { id: input.membershipId, businessId },
      include: { user: { select: { fullName: true, email: true } } },
    });

    if (!membership) {
      throw new Error("Partner membership not found in this business.");
    }

    const amountDecimal = new Prisma.Decimal(input.amount);

    // If requester is OWNER and the business has only 1 owner, auto-approve; otherwise requires co-owner approval
    const isSoleOwner =
      actorRole === "OWNER" &&
      (await tx.businessMembership.count({
        where: { businessId, role: "OWNER", status: "ACTIVE" },
      })) === 1;

    const status = isSoleOwner ? ApprovalStatus.ACTIVE : ApprovalStatus.PENDING_APPROVAL;
    const approvedById = isSoleOwner ? actorUserId : null;
    const approvedAt = isSoleOwner ? new Date() : null;

    const drawing = await tx.partnerDrawing.create({
      data: {
        businessId,
        membershipId: membership.id,
        amount: amountDecimal,
        status,
        approvedById,
        approvedAt,
      },
      include: {
        membership: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "PARTNER_DRAWING_REQUESTED",
        targetEntity: "PartnerDrawing",
        targetId: drawing.id,
        changeDetails: {
          partnerEmail: membership.user.email,
          amount: drawing.amount.toString(),
          status: drawing.status,
        },
      },
      tx
    );

    return drawing;
  });
}

/**
 * Approves a pending partner drawing.
 */
export async function approvePartnerDrawing(
  businessId: string,
  drawingId: string,
  approverUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    const drawing = await tx.partnerDrawing.findFirst({
      where: { id: drawingId, businessId },
      include: { membership: { select: { userId: true } } },
    });

    if (!drawing) {
      throw new Error("Partner drawing request not found.");
    }

    if (drawing.status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new Error(`Drawing request is not pending approval (status: ${drawing.status}).`);
    }

    // Co-owner approval: Submitter cannot self-approve if co-owners exist
    if (drawing.membership.userId === approverUserId) {
      const activeOwners = await tx.businessMembership.count({
        where: { businessId, role: "OWNER", status: "ACTIVE" },
      });
      if (activeOwners > 1) {
        throw new Error("Dual approval rule: Partner cannot approve their own drawing when co-owners exist.");
      }
    }

    const updated = await tx.partnerDrawing.update({
      where: { id: drawingId },
      data: {
        status: ApprovalStatus.ACTIVE,
        approvedById: approverUserId,
        approvedAt: new Date(),
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: approverUserId,
        actionType: "PARTNER_DRAWING_APPROVED",
        targetEntity: "PartnerDrawing",
        targetId: drawingId,
        changeDetails: { amount: updated.amount.toString() },
      },
      tx
    );

    return updated;
  });
}

/**
 * Lists all drawings for the active business.
 */
export async function getBusinessPartnerDrawings(businessId: string) {
  return await prisma.partnerDrawing.findMany({
    where: { businessId },
    include: {
      membership: {
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
    orderBy: { requestDate: "desc" },
  });
}

/**
 * Aggregates complete partner position balance sheets for the active business.
 */
export async function getPartnerBalances(businessId: string) {
  const members = await prisma.businessMembership.findMany({
    where: {
      businessId,
      role: { in: ["OWNER", "PARTNER_FINANCE", "PARTNER_OPERATIONS"] },
      status: "ACTIVE",
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      capitalContributions: { select: { amount: true } },
      drawings: {
        where: { status: ApprovalStatus.ACTIVE },
        select: { amount: true },
      },
      profitDistributions: { select: { allocatedAmount: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((m) => {
    let totalCapital = new Prisma.Decimal(0);
    for (const c of m.capitalContributions) {
      totalCapital = totalCapital.plus(c.amount);
    }

    let totalDrawings = new Prisma.Decimal(0);
    for (const d of m.drawings) {
      totalDrawings = totalDrawings.plus(d.amount);
    }

    let totalDistributions = new Prisma.Decimal(0);
    for (const pd of m.profitDistributions) {
      totalDistributions = totalDistributions.plus(pd.allocatedAmount);
    }

    // Net partner position: (Capital Contributed + Total Profit Distributed) - Total Drawings Taken
    const netPosition = totalCapital.plus(totalDistributions).minus(totalDrawings);

    return {
      membershipId: m.id,
      userId: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      role: m.role,
      equityPercentage: m.equityPercentage.toString(),
      profitSharePercentage: m.profitSharePercentage.toString(),
      totalCapital: totalCapital.toFixed(2),
      totalDrawings: totalDrawings.toFixed(2),
      totalDistributions: totalDistributions.toFixed(2),
      netPosition: netPosition.toFixed(2),
    };
  });
}
