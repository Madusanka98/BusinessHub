import { z } from "zod";
import { PaymentMethod, TransactionType, SharingRuleType, LossPolicy, LoanDirection } from "@prisma/client";

export const CreateTransactionCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(50),
  type: z.nativeEnum(TransactionType),
});

export const CreateFinancialTransactionSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  type: z.nativeEnum(TransactionType),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentMethod: z.nativeEnum(PaymentMethod).default("CASH"),
  description: z.string().min(2, "Description must be at least 2 characters").max(500),
  transactionDate: z.string().or(z.date()),
  receiptUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type CreateFinancialTransactionInput = z.infer<typeof CreateFinancialTransactionSchema>;

export const CreateCapitalContributionSchema = z.object({
  membershipId: z.string().min(1, "Partner is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentReference: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  contributionDate: z.string().or(z.date()),
});

export type CreateCapitalContributionInput = z.infer<typeof CreateCapitalContributionSchema>;

export const CreatePartnerDrawingSchema = z.object({
  membershipId: z.string().min(1, "Partner is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});

export type CreatePartnerDrawingInput = z.infer<typeof CreatePartnerDrawingSchema>;

export const CreatePartnerLoanSchema = z.object({
  membershipId: z.string().min(1, "Partner is required"),
  loanDirection: z.nativeEnum(LoanDirection).default("PARTNER_TO_BUSINESS"),
  principalAmount: z.coerce.number().positive("Principal must be greater than zero"),
  annualInterestRate: z.coerce.number().min(0, "Interest cannot be negative").max(100).default(0),
  startDate: z.string().or(z.date()),
  maturityDate: z.string().or(z.date()).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

export type CreatePartnerLoanInput = z.infer<typeof CreatePartnerLoanSchema>;

export const CreateLoanRepaymentSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  principalAmount: z.coerce.number().positive("Principal payment must be greater than zero"),
  interestAmount: z.coerce.number().min(0, "Interest cannot be negative").default(0),
  paymentDate: z.string().or(z.date()),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type CreateLoanRepaymentInput = z.infer<typeof CreateLoanRepaymentSchema>;

export const PartnerAllocationItemSchema = z.object({
  membershipId: z.string().min(1),
  percentage: z.number().min(0).max(100),
  points: z.number().optional(),
  weight: z.number().optional(),
});

export const SaveProfitSharingRuleSchema = z.object({
  name: z.string().min(2, "Rule name is required").max(100),
  ruleType: z.nativeEnum(SharingRuleType),
  lossPolicy: z.nativeEnum(LossPolicy).default("CARRY_FORWARD"),
  description: z.string().max(500).optional().or(z.literal("")),
  allocations: z.array(PartnerAllocationItemSchema).min(1, "At least one partner must be allocated"),
});

export type SaveProfitSharingRuleInput = z.infer<typeof SaveProfitSharingRuleSchema>;

export const ClosePeriodSchema = z.object({
  periodName: z.string().min(2, "Period name is required (e.g. October 2026)").max(50),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  retainedReservePercentage: z.coerce.number().min(0).max(100).default(20),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type ClosePeriodInput = z.infer<typeof ClosePeriodSchema>;
