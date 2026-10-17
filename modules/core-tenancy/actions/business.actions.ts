"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext, AuthorizationError, AuthenticationError } from "@/lib/tenant/context";
import { assertTenantPermission, assertSuperAdmin } from "@/lib/tenant/guards";
import {
  CreateBusinessSchema,
  UpdateBusinessSettingsSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
  RemoveMemberSchema,
  RevokeInviteSchema,
} from "../schemas/business.schema";
import {
  createBusinessBySuperAdmin,
  updateBusinessSettings,
  updateMemberRole,
  removeMember,
} from "../services/business.service";
import { createInvitation, revokeInvitation } from "../services/invitation.service";
import { switchActiveTenant } from "../services/tenant.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Super Admin action to provision a new business tenant and assign initial owner.
 */
export async function createBusinessAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ businessId: string; slug: string }>> {
  try {
    const admin = await assertSuperAdmin("superadmin:business:create");

    const rawData = {
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
      businessType: formData.get("businessType") || undefined,
      contactEmail: formData.get("contactEmail") || undefined,
      contactPhone: formData.get("contactPhone") || undefined,
      address: formData.get("address") || undefined,
      timezone: formData.get("timezone") || "Asia/Colombo",
      currency: formData.get("currency") || "LKR",
      initialOwnerEmail: formData.get("initialOwnerEmail"),
      initialOwnerFullName: formData.get("initialOwnerFullName") || undefined,
    };

    const parsed = CreateBusinessSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please correct the form fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const result = await createBusinessBySuperAdmin(parsed.data, admin.userId);

    revalidatePath("/businesses");
    return {
      success: true,
      data: { businessId: result.businessId, slug: result.slug },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create business.";
    return { success: false, error: message };
  }
}

/**
 * Updates business profile and operational parameters.
 */
export async function updateBusinessSettingsAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "tenancy:settings:update");

    const rawData = {
      name: formData.get("name"),
      businessType: formData.get("businessType") || "",
      contactEmail: formData.get("contactEmail") || "",
      contactPhone: formData.get("contactPhone") || "",
      address: formData.get("address") || "",
      timezone: formData.get("timezone") || "Asia/Colombo",
      currency: formData.get("currency") || "LKR",
      expenseApprovalThreshold: formData.get("expenseApprovalThreshold") ?? 500,
      defaultReservePercentage: formData.get("defaultReservePercentage") ?? 20,
      autoDeductInventory: formData.get("autoDeductInventory") === "on" || formData.get("autoDeductInventory") === "true",
    };

    const parsed = UpdateBusinessSettingsSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await updateBusinessSettings(context.businessId, parsed.data, context.userId);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update business settings.";
    return { success: false, error: message };
  }
}

/**
 * Invites a co-owner, partner, or employee to the active business.
 */
export async function inviteMemberAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ invitationId: string }>> {
  try {
    const context = await getTenantContext();

    const rawData = {
      email: formData.get("email"),
      role: formData.get("role"),
      proposedEquity: formData.get("proposedEquity") || undefined,
      proposedProfitShare: formData.get("proposedProfitShare") || undefined,
    };

    const parsed = InviteMemberSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation error.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // Role-specific permission enforcement
    if (parsed.data.role === "OWNER") {
      assertTenantPermission(context, "tenancy:members:invite_owner");
    } else if (parsed.data.role === "PARTNER_FINANCE" || parsed.data.role === "PARTNER_OPERATIONS") {
      assertTenantPermission(context, "tenancy:members:invite_partner");
    } else {
      assertTenantPermission(context, "tenancy:members:invite_staff");
    }

    const invitation = await createInvitation({
      businessId: context.businessId,
      email: parsed.data.email,
      role: parsed.data.role,
      inviterUserId: context.userId,
      proposedEquity: parsed.data.proposedEquity,
      proposedProfitShare: parsed.data.proposedProfitShare,
    });

    revalidatePath("/members");
    return {
      success: true,
      data: { invitationId: invitation.invitationId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to invite member.";
    return { success: false, error: message };
  }
}

/**
 * Revokes a pending invitation token.
 */
export async function revokeInvitationAction(invitationId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "tenancy:members:revoke");

    await revokeInvitation(invitationId, context.userId);

    revalidatePath("/members");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return { success: false, error: message };
  }
}

/**
 * Updates a member's role or equity allocation.
 */
export async function updateMemberRoleAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "tenancy:members:manage_roles");

    const rawData = {
      memberId: formData.get("memberId"),
      role: formData.get("role"),
      equityPercentage: formData.get("equityPercentage") || undefined,
      profitSharePercentage: formData.get("profitSharePercentage") || undefined,
    };

    const parsed = UpdateMemberRoleSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation error.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await updateMemberRole(context.businessId, parsed.data, context.userId);

    revalidatePath("/members");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update member role.";
    return { success: false, error: message };
  }
}

/**
 * Revokes an active membership from the business.
 */
export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "tenancy:members:revoke");

    await removeMember(context.businessId, memberId, context.userId);

    revalidatePath("/members");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove member.";
    return { success: false, error: message };
  }
}

/**
 * Switches the active tenant cookie for the current session.
 */
export async function switchBusinessContextAction(businessId: string): Promise<ActionResult> {
  try {
    await switchActiveTenant(businessId);
    revalidatePath("/");
    revalidatePath("/businesses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch business.";
    return { success: false, error: message };
  }
}
