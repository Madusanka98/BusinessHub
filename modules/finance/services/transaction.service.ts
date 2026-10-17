import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, TransactionType, PaymentMethod, ApprovalStatus } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { CreateFinancialTransactionInput } from "../schemas/finance.schema";

const DEFAULT_INCOME_CATEGORIES = [
  "Mushroom Harvest Sales",
  "Fresh Wholesale Produce",
  "Dehydrated / Value-Add Products",
  "Consulting & Farm Visits",
  "Other Revenue",
];

const DEFAULT_EXPENSE_CATEGORIES = [
  "Substrate Raw Materials (Sawdust, Lime, Bran)",
  "Spawn / Culture Genetics",
  "Growing Bags & Consumables",
  "Utilities (Electricity, Water)",
  "Equipment Maintenance & Chamber Parts",
  "Packaging & Labeling",
  "Delivery & Transportation",
  "Labor & Farm Wages",
  "Facility Rent",
  "General & Administrative",
];

/**
 * Ensures standard default categories exist for the tenant.
 */
export async function ensureStandardCategories(businessId: string): Promise<void> {
  const existingCount = await prisma.transactionCategory.count({
    where: { businessId },
  });

  if (existingCount > 0) return;

  const categories = [
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ businessId, name, type: TransactionType.INCOME })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ businessId, name, type: TransactionType.EXPENSE })),
  ];

  await prisma.transactionCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });
}

/**
 * Retrieves all categories configured for the business tenant.
 */
export async function getTransactionCategories(businessId: string, type?: TransactionType) {
  await ensureStandardCategories(businessId);

  return await prisma.transactionCategory.findMany({
    where: {
      businessId,
      ...(type ? { type } : {}),
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Records a new financial transaction with threshold approval checks.
 */
export async function recordFinancialTransaction(
  businessId: string,
  input: CreateFinancialTransactionInput,
  actorUserId: string,
  actorRole: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate category belongs to this business
    const category = await tx.transactionCategory.findFirst({
      where: { id: input.categoryId, businessId },
    });

    if (!category) {
      throw new Error("Invalid transaction category for this business.");
    }

    if (category.type !== input.type) {
      throw new Error(`Category type '${category.type}' does not match transaction type '${input.type}'.`);
    }

    // 2. Fetch business settings for threshold check
    const settings = await tx.businessSettings.findUnique({
      where: { businessId },
      select: { expenseApprovalThreshold: true },
    });

    const threshold = settings?.expenseApprovalThreshold ?? new Prisma.Decimal(500);
    const amountDecimal = new Prisma.Decimal(input.amount);

    // 3. Determine approval status:
    // If expense exceeds threshold and submitter is not an OWNER, it requires dual approval
    let approvalStatus: ApprovalStatus = ApprovalStatus.ACTIVE;
    let approvedById: string | null = actorUserId;

    if (input.type === TransactionType.EXPENSE && amountDecimal.greaterThan(threshold)) {
      if (actorRole !== "OWNER") {
        approvalStatus = ApprovalStatus.PENDING_APPROVAL;
        approvedById = null;
      }
    }

    // 4. Create the transaction
    const transaction = await tx.financialTransaction.create({
      data: {
        businessId,
        categoryId: category.id,
        type: input.type,
        amount: amountDecimal,
        paymentMethod: input.paymentMethod,
        description: input.description.trim(),
        receiptUrl: input.receiptUrl?.trim() || null,
        approvalStatus,
        transactionDate: new Date(input.transactionDate),
        createdById: actorUserId,
        approvedById,
      },
      include: {
        category: true,
        creator: { select: { fullName: true, email: true } },
      },
    });

    // 5. Log audit trail
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "FINANCIAL_TRANSACTION_RECORDED",
        targetEntity: "FinancialTransaction",
        targetId: transaction.id,
        changeDetails: {
          type: transaction.type,
          category: category.name,
          amount: transaction.amount.toString(),
          paymentMethod: transaction.paymentMethod,
          approvalStatus: transaction.approvalStatus,
        },
      },
      tx
    );

    return transaction;
  });
}

/**
 * Approves a pending financial expense.
 */
export async function approveFinancialTransaction(
  businessId: string,
  transactionId: string,
  approverUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    const txRecord = await tx.financialTransaction.findFirst({
      where: { id: transactionId, businessId },
    });

    if (!txRecord) {
      throw new Error("Financial transaction not found.");
    }

    if (txRecord.approvalStatus !== ApprovalStatus.PENDING_APPROVAL) {
      throw new Error(`Transaction is not pending approval (status: ${txRecord.approvalStatus}).`);
    }

    const updated = await tx.financialTransaction.update({
      where: { id: transactionId },
      data: {
        approvalStatus: ApprovalStatus.ACTIVE,
        approvedById: approverUserId,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: approverUserId,
        actionType: "FINANCIAL_TRANSACTION_APPROVED",
        targetEntity: "FinancialTransaction",
        targetId: transactionId,
        changeDetails: { amount: updated.amount.toString() },
      },
      tx
    );

    return updated;
  });
}

export interface TransactionFilterOptions {
  type?: TransactionType;
  approvalStatus?: ApprovalStatus;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Returns filtered, paginated transactions for the active tenant.
 */
export async function getBusinessTransactions(businessId: string, options: TransactionFilterOptions = {}) {
  const { type, approvalStatus, categoryId, startDate, endDate, page = 1, limit = 50 } = options;

  const where: Prisma.FinancialTransactionWhereInput = {
    businessId,
    ...(type ? { type } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(startDate || endDate
      ? {
          transactionDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const [totalCount, transactions] = await Promise.all([
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.findMany({
      where,
      include: {
        category: true,
        creator: { select: { id: true, fullName: true, email: true } },
        approver: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    transactions,
  };
}

/**
 * Computes exact decimal-safe financial summary (recognized revenue, operating expenses, and net profit).
 */
export async function getFinancialSummary(
  businessId: string,
  startDate?: Date,
  endDate?: Date
) {
  const dateFilter: Prisma.DateTimeFilter | undefined =
    startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
      : undefined;

  const transactions = await prisma.financialTransaction.findMany({
    where: {
      businessId,
      approvalStatus: ApprovalStatus.ACTIVE,
      ...(dateFilter ? { transactionDate: dateFilter } : {}),
    },
    select: {
      type: true,
      amount: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  let totalIncome = new Prisma.Decimal(0);
  let totalExpense = new Prisma.Decimal(0);
  const categoryBreakdown: Record<string, { name: string; type: TransactionType; total: Prisma.Decimal }> = {};

  for (const t of transactions) {
    if (t.type === TransactionType.INCOME) {
      totalIncome = totalIncome.plus(t.amount);
    } else {
      totalExpense = totalExpense.plus(t.amount);
    }

    if (!categoryBreakdown[t.categoryId]) {
      categoryBreakdown[t.categoryId] = {
        name: t.category.name,
        type: t.type,
        total: new Prisma.Decimal(0),
      };
    }
    categoryBreakdown[t.categoryId].total = categoryBreakdown[t.categoryId].total.plus(t.amount);
  }

  const netProfit = totalIncome.minus(totalExpense);

  return {
    totalIncome,
    totalExpense,
    netProfit,
    categoryBreakdown: Object.values(categoryBreakdown).map((c) => ({
      name: c.name,
      type: c.type,
      total: c.total.toFixed(2),
    })),
  };
}
