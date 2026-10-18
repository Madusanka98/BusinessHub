import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  recordFinancialTransaction,
  approveFinancialTransaction,
  getFinancialSummary,
  getBusinessTransactions,
  ensureStandardCategories,
} from "@/modules/finance/services/transaction.service";
import {
  recordCapitalContribution,
  requestPartnerDrawing,
  approvePartnerDrawing,
  getPartnerBalances,
} from "@/modules/finance/services/capital.service";
import {
  recordPartnerLoan,
  recordLoanRepayment,
} from "@/modules/finance/services/loan.service";
import {
  saveProfitSharingRule,
  previewProfitDistribution,
  closeFinancialPeriodAndDistribute,
  getActiveProfitSharingRule,
} from "@/modules/finance/services/profitSharing.service";
import {
  calculateDeterministicAllocations,
  toCents,
  fromCents,
} from "@/modules/finance/utils/decimal";
import { createBusinessBySuperAdmin } from "@/modules/core-tenancy/services/business.service";
import { hashPassword } from "@/lib/auth/password";
import { TransactionType, PaymentMethod, ApprovalStatus, SharingRuleType, LossPolicy } from "@prisma/client";

describe("Task 5: Finance & Profit-Sharing Module", () => {
  const timestamp = Date.now();
  let superAdminId: string;
  let ownerUserId: string;
  let partnerFinanceUserId: string;
  let businessId: string;
  let ownerMembershipId: string;
  let partnerFinanceMembershipId: string;

  beforeAll(async () => {
    // 1. Seed Super Admin
    const pwd = await hashPassword("ValidPass@123!");
    const superAdmin = await prisma.user.create({
      data: {
        email: `superadmin-fin-${timestamp}@test.local`,
        fullName: "Platform Super Admin",
        passwordHash: pwd,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    // 2. Seed Owner User
    const owner = await prisma.user.create({
      data: {
        email: `owner-fin-${timestamp}@test.local`,
        fullName: "Farm Owner",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    ownerUserId = owner.id;

    // 3. Seed Partner User
    const partner = await prisma.user.create({
      data: {
        email: `partner-fin-${timestamp}@test.local`,
        fullName: "Finance Partner",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    partnerFinanceUserId = partner.id;

    // 4. Provision Business
    const b = await createBusinessBySuperAdmin(
      {
        name: `Agro Finance Test ${timestamp}`,
        currency: "LKR",
        timezone: "Asia/Colombo",
        initialOwnerEmail: owner.email,
      },
      superAdminId
    );
    businessId = b.businessId;

    // Find owner membership
    const ownerMem = await prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId: ownerUserId } },
    });
    ownerMembershipId = ownerMem!.id;

    // Create partner membership
    const partnerMem = await prisma.businessMembership.create({
      data: {
        businessId,
        userId: partnerFinanceUserId,
        role: "PARTNER_FINANCE",
        status: "ACTIVE",
        equityPercentage: 30.0,
        profitSharePercentage: 30.0,
      },
    });
    partnerFinanceMembershipId = partnerMem.id;

    // Ensure standard categories
    await ensureStandardCategories(businessId);
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.loanRepayment.deleteMany({ where: { loan: { businessId } } }).catch(() => {});
      await prisma.partnerLoan.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.partnerCapitalContribution.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.partnerDrawing.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.profitDistribution.deleteMany({ where: { closedPeriod: { businessId } } }).catch(() => {});
      await prisma.closedPeriod.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.financialTransaction.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.transactionCategory.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.profitSharingRule.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.auditEvent.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.businessMembership.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.businessSettings.deleteMany({ where: { businessId } }).catch(() => {});
      await prisma.business.delete({ where: { id: businessId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: {
        id: { in: [superAdminId, ownerUserId, partnerFinanceUserId].filter(Boolean) },
      },
    }).catch(() => {});
  });

  describe("1. Decimal Arithmetic & Deterministic Remainder Handling", () => {
    it("allocates exactly 100.00 among 3 equal partners with zero lost cents", () => {
      const targets = [
        { membershipId: "partner-1", percentage: 33.33 },
        { membershipId: "partner-2", percentage: 33.33 },
        { membershipId: "partner-3", percentage: 33.34 },
      ];

      const result = calculateDeterministicAllocations(100.0, targets);
      expect(result).toHaveLength(3);

      const sum = result.reduce((acc, curr) => acc + Number(curr.allocatedAmount.toString()), 0);
      expect(sum).toBeCloseTo(100.0, 2);
    });

    it("distributes odd decimal amounts without rounding leakage", () => {
      const targets = [
        { membershipId: "mem-a", percentage: 60 },
        { membershipId: "mem-b", percentage: 40 },
      ];

      // 1000.73 LKR: 60% is 600.438 -> floor 600.43, 40% is 400.292 -> floor 400.29, remainder is 0.01 assigned to mem-a
      const result = calculateDeterministicAllocations(1000.73, targets);
      const sum = result.reduce((acc, curr) => acc + Number(curr.allocatedAmount.toString()), 0);
      expect(sum).toBe(1000.73);
    });
  });

  describe("2. Income & Expense Ledgers & Threshold Approvals", () => {
    let incomeCatId: string;
    let expenseCatId: string;

    beforeAll(async () => {
      const incCat = await prisma.transactionCategory.findFirst({
        where: { businessId, type: "INCOME" },
      });
      incomeCatId = incCat!.id;

      const expCat = await prisma.transactionCategory.findFirst({
        where: { businessId, type: "EXPENSE" },
      });
      expenseCatId = expCat!.id;
    });

    it("records income and immediately recognizes it in financial summary", async () => {
      await recordFinancialTransaction(
        businessId,
        {
          categoryId: incomeCatId,
          type: TransactionType.INCOME,
          amount: 5000.0,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          description: "Mushroom wholesale lot #101",
          transactionDate: new Date(),
        },
        ownerUserId,
        "OWNER"
      );

      const summary = await getFinancialSummary(businessId);
      expect(Number(summary.totalIncome.toString())).toBeGreaterThanOrEqual(5000.0);
    });

    it("auto-approves expense when recorded by OWNER even if exceeding threshold", async () => {
      const tx = await recordFinancialTransaction(
        businessId,
        {
          categoryId: expenseCatId,
          type: TransactionType.EXPENSE,
          amount: 1200.0, // Exceeds default 500 threshold
          paymentMethod: PaymentMethod.CASH,
          description: "Spawn grain bags delivery",
          transactionDate: new Date(),
        },
        ownerUserId,
        "OWNER"
      );

      expect(tx.approvalStatus).toBe(ApprovalStatus.ACTIVE);
      expect(tx.approvedById).toBe(ownerUserId);
    });

    it("marks expense as PENDING_APPROVAL when submitted by non-owner exceeding threshold", async () => {
      const tx = await recordFinancialTransaction(
        businessId,
        {
          categoryId: expenseCatId,
          type: TransactionType.EXPENSE,
          amount: 850.0, // Exceeds 500 threshold
          paymentMethod: PaymentMethod.CASH,
          description: "Bulk sawdust truckload",
          transactionDate: new Date(),
        },
        partnerFinanceUserId,
        "PARTNER_FINANCE"
      );

      expect(tx.approvalStatus).toBe(ApprovalStatus.PENDING_APPROVAL);
      expect(tx.approvedById).toBeNull();

      // Unapproved expense must NOT be counted in active financial summary
      const summaryBefore = await getFinancialSummary(businessId);
      const expenseBefore = Number(summaryBefore.totalExpense.toString());

      // Approve transaction
      const approved = await approveFinancialTransaction(businessId, tx.id, ownerUserId);
      expect(approved.approvalStatus).toBe(ApprovalStatus.ACTIVE);

      // Now recognized in financial summary
      const summaryAfter = await getFinancialSummary(businessId);
      expect(Number(summaryAfter.totalExpense.toString())).toBe(expenseBefore + 850.0);
    });
  });

  describe("3. Partner Capital Contributions & Balance Sheets", () => {
    it("records capital contributions without polluting operational revenue", async () => {
      const summaryBefore = await getFinancialSummary(businessId);

      const contribution = await recordCapitalContribution(
        businessId,
        {
          membershipId: ownerMembershipId,
          amount: 25000.0,
          paymentReference: "WIRE-CAPITAL-01",
          notes: "Initial equity investment",
          contributionDate: new Date(),
        },
        ownerUserId
      );

      expect(contribution).toBeDefined();
      expect(Number(contribution.amount.toString())).toBe(25000.0);

      // Operational revenue must remain unaffected
      const summaryAfter = await getFinancialSummary(businessId);
      expect(summaryAfter.totalIncome.toString()).toBe(summaryBefore.totalIncome.toString());
    });

    it("aggregates accurate partner positions in partner balance sheets", async () => {
      // Add contribution for partner
      await recordCapitalContribution(
        businessId,
        {
          membershipId: partnerFinanceMembershipId,
          amount: 10000.0,
          paymentReference: "WIRE-PARTNER-01",
          contributionDate: new Date(),
        },
        ownerUserId
      );

      const balances = await getPartnerBalances(businessId);
      const ownerBal = balances.find((b) => b.membershipId === ownerMembershipId);
      const partnerBal = balances.find((b) => b.membershipId === partnerFinanceMembershipId);

      expect(ownerBal).toBeDefined();
      expect(Number(ownerBal!.totalCapital)).toBeGreaterThanOrEqual(25000.0);
      expect(partnerBal).toBeDefined();
      expect(Number(partnerBal!.totalCapital)).toBe(10000.0);
    });
  });

  describe("4. Partner Loans & Repayment Limits", () => {
    let loanId: string;

    it("registers a partner loan and sets initial outstanding balance", async () => {
      const loan = await recordPartnerLoan(
        businessId,
        {
          membershipId: partnerFinanceMembershipId,
          loanDirection: "PARTNER_TO_BUSINESS",
          principalAmount: 15000.0,
          annualInterestRate: 8.5,
          startDate: new Date(),
          description: "Substrate mixer purchase advance",
        },
        ownerUserId
      );

      expect(loan).toBeDefined();
      expect(Number(loan.principalAmount.toString())).toBe(15000.0);
      expect(Number(loan.outstandingBalance.toString())).toBe(15000.0);
      expect(loan.status).toBe("ACTIVE");
      loanId = loan.id;
    });

    it("rejects repayments that exceed outstanding principal", async () => {
      await expect(
        recordLoanRepayment(
          businessId,
          {
            loanId,
            principalAmount: 16000.0, // Exceeds 15,000 principal
            interestAmount: 200.0,
            paymentDate: new Date(),
          },
          ownerUserId
        )
      ).rejects.toThrow(/exceeds current outstanding balance/);
    });

    it("records amortized repayment and updates outstanding balance", async () => {
      const { repayment, loan, financialTransactionId } = await recordLoanRepayment(
        businessId,
        {
          loanId,
          principalAmount: 5000.0,
          interestAmount: 150.0,
          paymentDate: new Date(),
          notes: "Month 1 installment",
        },
        ownerUserId
      );

      expect(Number(repayment.principalAmount.toString())).toBe(5000.0);
      expect(Number(repayment.interestAmount.toString())).toBe(150.0);
      expect(Number(repayment.amount.toString())).toBe(5150.0);
      expect(Number(loan.outstandingBalance.toString())).toBe(10000.0);
      expect(loan.status).toBe("ACTIVE");

      // Verify financial transaction created for interest expense
      expect(financialTransactionId).toBeTruthy();
      const finTx = await prisma.financialTransaction.findUnique({
        where: { id: financialTransactionId! },
        include: { category: true },
      });
      expect(finTx).toBeTruthy();
      expect(finTx?.type).toBe(TransactionType.EXPENSE);
      expect(finTx?.category.name).toBe("Loan Interest Expense");
      expect(Number(finTx?.amount)).toBe(150.0);
    });
  });

  describe("5. Profit-Sharing Rules & Period Closing", () => {
    it("validates that sharing rule percentages must sum to exactly 100%", async () => {
      await expect(
        saveProfitSharingRule(
          businessId,
          {
            name: "Invalid Rule",
            ruleType: SharingRuleType.CUSTOM_PERCENTAGE,
            lossPolicy: LossPolicy.CARRY_FORWARD,
            allocations: [
              { membershipId: ownerMembershipId, percentage: 50 },
              { membershipId: partnerFinanceMembershipId, percentage: 40 }, // Sum = 90%
            ],
          },
          ownerUserId
        )
      ).rejects.toThrow(/must equal exactly 100%/);
    });

    it("persists a valid profit-sharing rule and deactivates prior versions", async () => {
      const rule = await saveProfitSharingRule(
        businessId,
        {
          name: "Fiscal 2026 Core Agreement",
          ruleType: SharingRuleType.CUSTOM_PERCENTAGE,
          lossPolicy: LossPolicy.CARRY_FORWARD,
          allocations: [
            { membershipId: ownerMembershipId, percentage: 70 },
            { membershipId: partnerFinanceMembershipId, percentage: 30 },
          ],
        },
        ownerUserId
      );

      expect(rule).toBeDefined();
      expect(rule.isActive).toBe(true);

      const activeRule = await getActiveProfitSharingRule(businessId);
      expect(activeRule.id).toBe(rule.id);
      expect(activeRule.allocations).toHaveLength(2);
    });

    it("closes an accounting period, locks transactions, and creates distributions", async () => {
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = new Date();

      const closedPeriod = await closeFinancialPeriodAndDistribute(
        businessId,
        {
          periodName: `Close Test ${timestamp}`,
          startDate: start,
          endDate: end,
          retainedReservePercentage: 20,
          notes: "Monthly close verification",
        },
        ownerUserId
      );

      expect(closedPeriod).toBeDefined();
      expect(closedPeriod.periodName).toBe(`Close Test ${timestamp}`);

      // Verify that transactions in this date range are now locked
      const txs = await getBusinessTransactions(businessId, { startDate: start, endDate: end });
      for (const t of txs.transactions) {
        expect(t.isLocked).toBe(true);
        expect(t.closedPeriodId).toBe(closedPeriod.id);
      }

      // Verify profit distributions created
      const distributions = await prisma.profitDistribution.findMany({
        where: { closedPeriodId: closedPeriod.id },
      });
      expect(distributions.length).toBeGreaterThan(0);

      // Verify rejection of duplicate / overlapping closed period
      await expect(
        closeFinancialPeriodAndDistribute(
          businessId,
          {
            periodName: `Duplicate Close ${timestamp}`,
            startDate: start,
            endDate: end,
            retainedReservePercentage: 20,
          },
          ownerUserId
        )
      ).rejects.toThrow(/conflicts with existing closed period/);
    });
  });
});
