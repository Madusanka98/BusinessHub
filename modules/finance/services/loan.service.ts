import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  Prisma,
  LoanStatus,
  LoanDirection,
  TransactionType,
  PaymentMethod,
  ApprovalStatus,
} from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { CreatePartnerLoanInput, CreateLoanRepaymentInput } from "../schemas/finance.schema";

/**
 * Finds or creates a transaction category for loan interest accounting.
 */
async function getOrCreateLoanInterestCategory(
  businessId: string,
  type: TransactionType,
  tx: Prisma.TransactionClient
): Promise<string> {
  const categoryName = type === TransactionType.EXPENSE ? "Loan Interest Expense" : "Loan Interest Income";

  const existing = await tx.transactionCategory.findFirst({
    where: {
      businessId,
      name: categoryName,
      type,
    },
  });

  if (existing) return existing.id;

  const created = await tx.transactionCategory.create({
    data: {
      businessId,
      name: categoryName,
      type,
    },
  });

  return created.id;
}

/**
 * Creates a new partner or business loan record.
 */
export async function recordPartnerLoan(
  businessId: string,
  input: CreatePartnerLoanInput,
  actorUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    const membership = await tx.businessMembership.findFirst({
      where: { id: input.membershipId, businessId },
      include: { user: { select: { fullName: true, email: true } } },
    });

    if (!membership) {
      throw new Error("Partner membership not found in this business.");
    }

    const principalDecimal = new Prisma.Decimal(input.principalAmount);
    const interestDecimal = new Prisma.Decimal(input.annualInterestRate);

    const loan = await tx.partnerLoan.create({
      data: {
        businessId,
        membershipId: membership.id,
        loanDirection: input.loanDirection,
        principalAmount: principalDecimal,
        annualInterestRate: interestDecimal,
        outstandingBalance: principalDecimal,
        startDate: new Date(input.startDate),
        maturityDate: input.maturityDate ? new Date(input.maturityDate) : null,
        description: input.description?.trim() || null,
        status: LoanStatus.ACTIVE,
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
        actionType: "LOAN_RECORDED",
        targetEntity: "PartnerLoan",
        targetId: loan.id,
        changeDetails: {
          partnerEmail: membership.user.email,
          direction: loan.loanDirection,
          principal: loan.principalAmount.toString(),
          interestRate: loan.annualInterestRate.toString(),
        },
      },
      tx
    );

    return loan;
  });
}

/**
 * Records an auditable loan repayment with separate principal and interest breakdown.
 */
export async function recordLoanRepayment(
  businessId: string,
  input: CreateLoanRepaymentInput,
  actorUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch loan and lock row
    const loan = await tx.partnerLoan.findFirst({
      where: { id: input.loanId, businessId },
      include: {
        membership: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });

    if (!loan) {
      throw new Error("Loan not found in this business organization.");
    }

    if (loan.status === LoanStatus.REPAID) {
      throw new Error("Loan has already been fully settled and repaid.");
    }

    const principalPayDecimal = new Prisma.Decimal(input.principalAmount);
    const interestPayDecimal = new Prisma.Decimal(input.interestAmount);
    const totalAmount = principalPayDecimal.plus(interestPayDecimal);

    // 2. Reject repayments exceeding outstanding principal
    if (principalPayDecimal.greaterThan(loan.outstandingBalance)) {
      throw new Error(
        `Repayment principal (${principalPayDecimal.toString()}) exceeds current outstanding balance (${loan.outstandingBalance.toString()}).`
      );
    }

    // 3. Compute new outstanding balance
    const newOutstanding = loan.outstandingBalance.minus(principalPayDecimal);
    const newStatus = newOutstanding.lessThanOrEqualTo(0) ? LoanStatus.REPAID : LoanStatus.ACTIVE;

    // 4. Update loan record
    const updatedLoan = await tx.partnerLoan.update({
      where: { id: loan.id },
      data: {
        outstandingBalance: newOutstanding,
        status: newStatus,
      },
    });

    // 5. Create repayment record
    const repayment = await tx.loanRepayment.create({
      data: {
        loanId: loan.id,
        amount: totalAmount,
        principalAmount: principalPayDecimal,
        interestAmount: interestPayDecimal,
        paymentDate: new Date(input.paymentDate),
        notes: input.notes?.trim() || null,
      },
    });

    // 6. Post FinancialTransaction for interest (EXPENSE if paying partner, INCOME if receiving from partner)
    let financialTxId: string | null = null;
    if (interestPayDecimal.greaterThan(0)) {
      const isPartnerToBusiness = loan.loanDirection === LoanDirection.PARTNER_TO_BUSINESS;
      const txType = isPartnerToBusiness ? TransactionType.EXPENSE : TransactionType.INCOME;
      const partnerName = loan.membership.user.fullName || loan.membership.user.email;
      const interestCategoryId = await getOrCreateLoanInterestCategory(businessId, txType, tx);

      const finTx = await tx.financialTransaction.create({
        data: {
          businessId,
          categoryId: interestCategoryId,
          type: txType,
          amount: interestPayDecimal,
          paymentMethod: PaymentMethod.CASH,
          description: isPartnerToBusiness
            ? `Loan interest payment to partner (${partnerName})`
            : `Loan interest received from partner (${partnerName})`,
          approvalStatus: ApprovalStatus.ACTIVE,
          transactionDate: new Date(input.paymentDate),
          createdById: actorUserId,
        },
      });
      financialTxId = finTx.id;
    }

    // 7. Record audit log
    await recordAuditEvent(
      {
        businessId,
        userId: actorUserId,
        actionType: "LOAN_REPAYMENT_RECORDED",
        targetEntity: "LoanRepayment",
        targetId: repayment.id,
        changeDetails: {
          loanId: loan.id,
          partnerEmail: loan.membership.user.email,
          principalPaid: principalPayDecimal.toString(),
          interestPaid: interestPayDecimal.toString(),
          remainingBalance: newOutstanding.toString(),
          status: newStatus,
          financialTransactionId: financialTxId,
        },
      },
      tx
    );

    return {
      repayment,
      loan: updatedLoan,
      financialTransactionId: financialTxId,
    };
  });
}

/**
 * Returns all loans and repayments for the active business.
 */
export async function getBusinessLoans(businessId: string) {
  return await prisma.partnerLoan.findMany({
    where: { businessId },
    include: {
      membership: {
        include: { user: { select: { fullName: true, email: true } } },
      },
      repayments: {
        orderBy: { paymentDate: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
