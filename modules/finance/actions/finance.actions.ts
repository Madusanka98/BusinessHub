"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import {
  CreateFinancialTransactionSchema,
  CreateCapitalContributionSchema,
  CreatePartnerDrawingSchema,
  CreatePartnerLoanSchema,
  CreateLoanRepaymentSchema,
  SaveProfitSharingRuleSchema,
  SaveProfitSharingRuleInput,
  ClosePeriodSchema,
} from "../schemas/finance.schema";
import {
  recordFinancialTransaction,
  approveFinancialTransaction,
} from "../services/transaction.service";
import {
  recordCapitalContribution,
  requestPartnerDrawing,
  approvePartnerDrawing,
} from "../services/capital.service";
import {
  recordPartnerLoan,
  recordLoanRepayment,
} from "../services/loan.service";
import {
  saveProfitSharingRule,
  closeFinancialPeriodAndDistribute,
} from "../services/profitSharing.service";
import { ActionResult } from "@/modules/core-tenancy/actions/business.actions";

export async function recordTransactionAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:transactions:create");

    const rawData = {
      categoryId: formData.get("categoryId"),
      type: formData.get("type"),
      amount: formData.get("amount"),
      paymentMethod: formData.get("paymentMethod") || "CASH",
      description: formData.get("description"),
      transactionDate: formData.get("transactionDate") || new Date().toISOString(),
      receiptUrl: formData.get("receiptUrl") || undefined,
    };

    const parsed = CreateFinancialTransactionSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await recordFinancialTransaction(context.businessId, parsed.data, context.userId, context.role);

    revalidatePath("/finance");
    revalidatePath("/finance/transactions");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record transaction.";
    return { success: false, error: message };
  }
}

export async function approveTransactionAction(transactionId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:transactions:approve");

    await approveFinancialTransaction(context.businessId, transactionId, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/transactions");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve transaction.";
    return { success: false, error: message };
  }
}

export async function recordCapitalContributionAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:capital:manage");

    const rawData = {
      membershipId: formData.get("membershipId"),
      amount: formData.get("amount"),
      paymentReference: formData.get("paymentReference") || undefined,
      notes: formData.get("notes") || undefined,
      contributionDate: formData.get("contributionDate") || new Date().toISOString(),
    };

    const parsed = CreateCapitalContributionSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await recordCapitalContribution(context.businessId, parsed.data, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/capital");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record capital contribution.";
    return { success: false, error: message };
  }
}

export async function requestPartnerDrawingAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:drawings:request");

    const rawData = {
      membershipId: formData.get("membershipId"),
      amount: formData.get("amount"),
    };

    const parsed = CreatePartnerDrawingSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await requestPartnerDrawing(context.businessId, parsed.data, context.userId, context.role);

    revalidatePath("/finance");
    revalidatePath("/finance/capital");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to request partner drawing.";
    return { success: false, error: message };
  }
}

export async function approvePartnerDrawingAction(drawingId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:drawings:approve");

    await approvePartnerDrawing(context.businessId, drawingId, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/capital");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve drawing.";
    return { success: false, error: message };
  }
}

export async function recordPartnerLoanAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:loans:manage");

    const rawData = {
      membershipId: formData.get("membershipId"),
      loanDirection: formData.get("loanDirection") || "PARTNER_TO_BUSINESS",
      principalAmount: formData.get("principalAmount"),
      annualInterestRate: formData.get("annualInterestRate") || 0,
      startDate: formData.get("startDate") || new Date().toISOString(),
      maturityDate: formData.get("maturityDate") || undefined,
      description: formData.get("description") || undefined,
    };

    const parsed = CreatePartnerLoanSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await recordPartnerLoan(context.businessId, parsed.data, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/loans");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record loan.";
    return { success: false, error: message };
  }
}

export async function recordLoanRepaymentAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:loans:manage");

    const rawData = {
      loanId: formData.get("loanId"),
      principalAmount: formData.get("principalAmount"),
      interestAmount: formData.get("interestAmount") || 0,
      paymentDate: formData.get("paymentDate") || new Date().toISOString(),
      notes: formData.get("notes") || undefined,
    };

    const parsed = CreateLoanRepaymentSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await recordLoanRepayment(context.businessId, parsed.data, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/loans");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record loan repayment.";
    return { success: false, error: message };
  }
}

export async function saveProfitSharingRuleAction(
  input: SaveProfitSharingRuleInput
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:rules:manage");

    const parsed = SaveProfitSharingRuleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await saveProfitSharingRule(context.businessId, parsed.data, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/profit-sharing");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save profit sharing rule.";
    return { success: false, error: message };
  }
}

export async function closePeriodAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "finance:period:close");

    const rawData = {
      periodName: formData.get("periodName"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      retainedReservePercentage: formData.get("retainedReservePercentage") || 20,
      notes: formData.get("notes") || undefined,
    };

    const parsed = ClosePeriodSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await closeFinancialPeriodAndDistribute(context.businessId, parsed.data, context.userId);

    revalidatePath("/finance");
    revalidatePath("/finance/profit-sharing");
    revalidatePath("/finance/transactions");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to close accounting period.";
    return { success: false, error: message };
  }
}
