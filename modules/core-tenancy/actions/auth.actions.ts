"use server";

import { loginSchema, forgotPasswordSchema, acceptInvitationSchema, inviteMemberSchema } from "../schemas/auth.schema";
import { loginUser, logoutUser, requestPasswordReset } from "../services/auth.service";
import { acceptInvitation, createInvitation } from "../services/invitation.service";
import { switchActiveTenant } from "../services/tenant.service";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { redirect } from "next/navigation";

import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

export interface FormActionState {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function loginAction(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  // Rate-limiting check: max 5 attempts per minute per email
  const rl = checkRateLimit(`auth:login:${parsed.data.email.toLowerCase()}`, { limit: 5, windowMs: 60 * 1000 });
  if (!rl.success) {
    return { error: "Too many login attempts. Please wait 1 minute before trying again." };
  }

  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.success) {
    return { error: result.error || "Login failed." };
  }

  // Clear rate limit on successful authentication
  resetRateLimit(`auth:login:${parsed.data.email.toLowerCase()}`);

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await logoutUser();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const rawData = { email: formData.get("email") };
  const parsed = forgotPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid email address." };
  }

  // Rate-limiting check: max 3 reset requests per 15 minutes per email
  const rl = checkRateLimit(`auth:reset:${parsed.data.email.toLowerCase()}`, { limit: 3, windowMs: 15 * 60 * 1000 });
  if (!rl.success) {
    return { error: "Too many reset requests. Please wait 15 minutes before trying again." };
  }

  const result = await requestPasswordReset(parsed.data.email);
  return { success: true, message: result.message };
}

export async function acceptInvitationAction(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const rawData = {
    token: formData.get("token"),
    fullName: formData.get("fullName") || undefined,
    password: formData.get("password") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
  };

  const parsed = acceptInvitationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed." };
  }

  try {
    await acceptInvitation({
      rawToken: parsed.data.token,
      fullName: parsed.data.fullName,
      password: parsed.data.password,
    });
  } catch (error) {
    return { error: (error as Error).message || "Failed to accept invitation." };
  }

  redirect("/login?accepted=true");
}

export async function switchTenantAction(targetBusinessId: string): Promise<FormActionState> {
  try {
    await switchActiveTenant(targetBusinessId);
  } catch (error) {
    return { error: (error as Error).message || "Failed to switch business organization." };
  }

  redirect("/dashboard");
}

export async function inviteMemberAction(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const context = await getTenantContext();

  const rawData = {
    email: formData.get("email"),
    role: formData.get("role"),
    proposedEquity: formData.get("proposedEquity") ? Number(formData.get("proposedEquity")) : undefined,
    proposedProfitShare: formData.get("proposedProfitShare") ? Number(formData.get("proposedProfitShare")) : undefined,
  };

  const parsed = inviteMemberSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  // Permission checks matching role
  if (parsed.data.role === "OWNER") {
    assertTenantPermission(context, "tenancy:members:invite_owner");
  } else if (parsed.data.role.startsWith("PARTNER")) {
    assertTenantPermission(context, "tenancy:members:invite_partner");
  } else {
    assertTenantPermission(context, "tenancy:members:invite_staff");
  }

  try {
    const invite = await createInvitation({
      businessId: context.businessId,
      email: parsed.data.email,
      role: parsed.data.role,
      inviterUserId: context.userId,
      proposedEquity: parsed.data.proposedEquity,
      proposedProfitShare: parsed.data.proposedProfitShare,
    });

    return {
      success: true,
      message: `Invitation successfully dispatched to ${invite.email} (${invite.role}).`,
    };
  } catch (error) {
    return { error: (error as Error).message || "Failed to send invitation." };
  }
}
