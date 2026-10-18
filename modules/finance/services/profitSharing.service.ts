import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, SharingRuleType, LossPolicy, ApprovalStatus } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { SaveProfitSharingRuleInput, ClosePeriodInput } from "../schemas/finance.schema";
import { calculateDeterministicAllocations, toDecimalString } from "../utils/decimal";
import { getFinancialSummary } from "./transaction.service";

/**
 * Validates and saves a configurable profit/loss sharing rule.
 */
export async function saveProfitSharingRule(
  businessId: string,
  input: SaveProfitSharingRuleInput,
  actorUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate that all allocated memberships belong to this business
    const membershipIds = input.allocations.map((a) => a.membershipId);
    const validMembers = await tx.businessMembership.findMany({
      where: {
        id: { in: membershipIds },
        businessId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (validMembers.length !== membershipIds.length) {
      throw new Error("One or more allocated partners are invalid or inactive for this business.");
    }

    // 2. Validate percentage sum === 100.00%
    let totalPercentage = 0;
    for (const alloc of input.allocations) {
      if (alloc.percentage < 0) {
        throw new Error("Allocation percentages cannot be negative.");
      }
      totalPercentage += alloc.percentage;
    }

    // Allow a minuscule floating tolerance for UI inputs (e.g., 99.99 to 100.01)
    if (Math.abs(totalPercentage - 100) > 0.05) {
      throw new Error(`Total allocation percentages must equal exactly 100% (currently ${totalPercentage.toFixed(2)}%).`);
    }

    // 3. Mark previous rules inactive
    await tx.profitSharingRule.updateMany({
      where: { businessId, isActive: true },
      data: { isActive: false },
    });

    const previousMaxVersion = await tx.profitSharingRule.aggregate({
      where: { businessId },
      _max: { version: true },
    });
    const nextVersion = (previousMaxVersion._max.version || 0) + 1;

    // 4. Create new versioned rule
    const rule = await tx.profitSharingRule.create({
      data: {
        businessId,
        name: input.name.trim(),
        ruleType: input.ruleType,
        lossPolicy: input.lossPolicy,
        description: input.description?.trim() || null,
        version: nextVersion,
        createdById: actorUserId,
        allocationsJson: input.allocations as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    // 5. Immutable audit trail
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "PROFIT_SHARING_RULE_UPDATED",
        targetEntity: "ProfitSharingRule",
        targetId: rule.id,
        changeDetails: {
          name: rule.name,
          version: rule.version,
          ruleType: rule.ruleType,
          lossPolicy: rule.lossPolicy,
          allocations: input.allocations,
        },
      },
      tx
    );

    return rule;
  });
}

export interface ActiveRuleAllocation {
  membershipId: string;
  fullName: string;
  email: string;
  role: string;
  percentage: number;
}

/**
 * Retrieves the currently active profit-sharing rule.
 * If no custom rule exists, generates a default allocation based on partner equity/equal share.
 */
export async function getActiveProfitSharingRule(businessId: string): Promise<{
  id: string | null;
  name: string;
  ruleType: SharingRuleType;
  lossPolicy: LossPolicy;
  version: number;
  allocations: ActiveRuleAllocation[];
}> {
  const activeRule = await prisma.profitSharingRule.findFirst({
    where: { businessId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const activePartners = await prisma.businessMembership.findMany({
    where: {
      businessId,
      role: { in: ["OWNER", "PARTNER_FINANCE", "PARTNER_OPERATIONS"] },
      status: "ACTIVE",
    },
    include: {
      user: { select: { fullName: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (activeRule) {
    const rawAllocations = (activeRule.allocationsJson as Array<{ membershipId: string; percentage: number }>) || [];
    const allocations = activePartners.map((p) => {
      const match = rawAllocations.find((a) => a.membershipId === p.id);
      return {
        membershipId: p.id,
        fullName: p.user.fullName,
        email: p.user.email,
        role: p.role,
        percentage: match ? match.percentage : 0,
      };
    });

    return {
      id: activeRule.id,
      name: activeRule.name,
      ruleType: activeRule.ruleType,
      lossPolicy: activeRule.lossPolicy,
      version: activeRule.version,
      allocations,
    };
  }

  // Default fallback: Equal split among active owners/partners
  const count = activePartners.length || 1;
  const equalPercent = parseFloat((100 / count).toFixed(2));
  const allocations = activePartners.map((p, idx) => ({
    membershipId: p.id,
    fullName: p.user.fullName,
    email: p.user.email,
    role: p.role,
    // Adjust minor decimal rounding on first partner to total exactly 100
    percentage: idx === 0 ? parseFloat((100 - equalPercent * (count - 1)).toFixed(2)) : equalPercent,
  }));

  return {
    id: null,
    name: "Default Pro-Rata Partner Agreement",
    ruleType: SharingRuleType.EQUAL,
    lossPolicy: LossPolicy.CARRY_FORWARD,
    version: 1,
    allocations,
  };
}

/**
 * Previews profit distribution for a given date range without modifying database records.
 */
export async function previewProfitDistribution(
  businessId: string,
  startDate: Date,
  endDate: Date,
  retainedReservePercentage: number = 20
) {
  const summary = await getFinancialSummary(businessId, startDate, endDate);
  const activeRule = await getActiveProfitSharingRule(businessId);

  const netProfit = summary.netProfit;
  const reservePercent = new Prisma.Decimal(retainedReservePercentage);

  // If lossPolicy is CARRY_FORWARD, compute unabsorbed loss from prior closed periods
  let priorUnabsorbedLoss = new Prisma.Decimal(0);
  if (activeRule.lossPolicy === LossPolicy.CARRY_FORWARD) {
    const priorClosedPeriods = await prisma.closedPeriod.findMany({
      where: { businessId, endDate: { lt: startDate } },
      orderBy: { endDate: "asc" },
    });

    for (const p of priorClosedPeriods) {
      if (p.netProfit.lessThan(0)) {
        priorUnabsorbedLoss = priorUnabsorbedLoss.plus(p.netProfit.abs());
      } else if (p.netProfit.greaterThan(0)) {
        const absorbed = Prisma.Decimal.min(priorUnabsorbedLoss, p.netProfit);
        priorUnabsorbedLoss = priorUnabsorbedLoss.minus(absorbed);
      }
    }
  }

  let retainedReserve = new Prisma.Decimal(0);
  let distributableAmount = new Prisma.Decimal(0);

  if (netProfit.greaterThan(0)) {
    const netProfitAfterLoss = Prisma.Decimal.max(0, netProfit.minus(priorUnabsorbedLoss));
    if (netProfitAfterLoss.greaterThan(0)) {
      retainedReserve = netProfitAfterLoss.times(reservePercent).dividedBy(100);
      distributableAmount = netProfitAfterLoss.minus(retainedReserve);
    }
  }

  const calculatedAllocations = calculateDeterministicAllocations(
    distributableAmount,
    activeRule.allocations.map((a) => ({
      membershipId: a.membershipId,
      percentage: a.percentage,
    }))
  );

  const partnerBreakdown = activeRule.allocations.map((a) => {
    const calc = calculatedAllocations.find((c) => c.membershipId === a.membershipId);
    return {
      membershipId: a.membershipId,
      fullName: a.fullName,
      email: a.email,
      role: a.role,
      profitSharePercentage: a.percentage,
      allocatedAmount: calc ? toDecimalString(calc.allocatedAmount) : "0.00",
    };
  });

  return {
    period: {
      startDate,
      endDate,
      totalIncome: toDecimalString(summary.totalIncome),
      totalExpense: toDecimalString(summary.totalExpense),
      netProfit: toDecimalString(netProfit),
      priorUnabsorbedLoss: toDecimalString(priorUnabsorbedLoss),
      retainedReserve: toDecimalString(retainedReserve),
      distributableAmount: toDecimalString(distributableAmount),
    },
    rule: {
      name: activeRule.name,
      ruleType: activeRule.ruleType,
      lossPolicy: activeRule.lossPolicy,
    },
    partnerBreakdown,
  };
}

/**
 * Closes an accounting period atomically, locking records and creating profit distribution history.
 */
export async function closeFinancialPeriodAndDistribute(
  businessId: string,
  input: ClosePeriodInput,
  actorUserId: string
) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  if (startDate >= endDate) {
    throw new Error("Period start date must be before end date.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Prevent duplicate or overlapping closed periods
    const existingPeriod = await tx.closedPeriod.findFirst({
      where: {
        businessId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (existingPeriod) {
      throw new Error(`Period conflicts with existing closed period '${existingPeriod.periodName}'.`);
    }

    // 2. Aggregate transactions within the period
    const transactions = await tx.financialTransaction.findMany({
      where: {
        businessId,
        approvalStatus: ApprovalStatus.ACTIVE,
        transactionDate: { gte: startDate, lte: endDate },
        isLocked: false,
      },
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);

    for (const t of transactions) {
      if (t.type === "INCOME") {
        totalIncome = totalIncome.plus(t.amount);
      } else {
        totalExpense = totalExpense.plus(t.amount);
      }
    }

    const netProfit = totalIncome.minus(totalExpense);
    const reservePercent = new Prisma.Decimal(input.retainedReservePercentage);

    // 3. Resolve active rule snapshot
    const activeRule = await getActiveProfitSharingRule(businessId);

    // If lossPolicy is CARRY_FORWARD, compute unabsorbed loss from prior closed periods
    let priorUnabsorbedLoss = new Prisma.Decimal(0);
    if (activeRule.lossPolicy === LossPolicy.CARRY_FORWARD) {
      const priorClosedPeriods = await tx.closedPeriod.findMany({
        where: { businessId, endDate: { lt: startDate } },
        orderBy: { endDate: "asc" },
      });

      for (const p of priorClosedPeriods) {
        if (p.netProfit.lessThan(0)) {
          priorUnabsorbedLoss = priorUnabsorbedLoss.plus(p.netProfit.abs());
        } else if (p.netProfit.greaterThan(0)) {
          const absorbed = Prisma.Decimal.min(priorUnabsorbedLoss, p.netProfit);
          priorUnabsorbedLoss = priorUnabsorbedLoss.minus(absorbed);
        }
      }
    }

    let retainedReserve = new Prisma.Decimal(0);
    let distributedAmount = new Prisma.Decimal(0);

    if (netProfit.greaterThan(0)) {
      const netProfitAfterLoss = Prisma.Decimal.max(0, netProfit.minus(priorUnabsorbedLoss));
      if (netProfitAfterLoss.greaterThan(0)) {
        retainedReserve = netProfitAfterLoss.times(reservePercent).dividedBy(100);
        distributedAmount = netProfitAfterLoss.minus(retainedReserve);
      }
    }

    const finalizedAllocations = calculateDeterministicAllocations(
      distributedAmount,
      activeRule.allocations.map((a) => ({
        membershipId: a.membershipId,
        percentage: a.percentage,
      }))
    );

    // 4. Create ClosedPeriod
    const closedPeriod = await tx.closedPeriod.create({
      data: {
        businessId,
        periodName: input.periodName.trim(),
        startDate,
        endDate,
        totalIncome,
        totalExpense,
        netProfit,
        retainedReserve,
        distributedAmount,
        notes: input.notes?.trim() || null,
        ruleSnapshot: {
          ruleName: activeRule.name,
          ruleType: activeRule.ruleType,
          lossPolicy: activeRule.lossPolicy,
          priorUnabsorbedLoss: priorUnabsorbedLoss.toString(),
          allocations: activeRule.allocations,
        } as unknown as Prisma.InputJsonValue,
        closedById: actorUserId,
      },
    });

    // 5. Create ProfitDistribution records for each partner
    for (const alloc of finalizedAllocations) {
      await tx.profitDistribution.create({
        data: {
          closedPeriodId: closedPeriod.id,
          membershipId: alloc.membershipId,
          profitSharePercentage: alloc.profitSharePercentage,
          allocatedAmount: alloc.allocatedAmount,
        },
      });
    }

    // 6. Lock all transactions in this period
    await tx.financialTransaction.updateMany({
      where: {
        businessId,
        transactionDate: { gte: startDate, lte: endDate },
      },
      data: {
        isLocked: true,
        closedPeriodId: closedPeriod.id,
      },
    });

    // 7. Audit log
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "FINANCIAL_PERIOD_CLOSED",
        targetEntity: "ClosedPeriod",
        targetId: closedPeriod.id,
        changeDetails: {
          periodName: closedPeriod.periodName,
          totalIncome: closedPeriod.totalIncome.toString(),
          totalExpense: closedPeriod.totalExpense.toString(),
          netProfit: closedPeriod.netProfit.toString(),
          distributedAmount: closedPeriod.distributedAmount.toString(),
          lockedTransactionsCount: transactions.length,
        },
      },
      tx
    );

    return closedPeriod;
  });
}

/**
 * Returns all closed financial periods for the active business.
 */
export async function getClosedPeriods(businessId: string) {
  return await prisma.closedPeriod.findMany({
    where: { businessId },
    include: {
      distributions: {
        include: {
          membership: {
            include: { user: { select: { fullName: true, email: true } } },
          },
        },
      },
    },
    orderBy: { endDate: "desc" },
  });
}
