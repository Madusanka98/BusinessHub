import { z } from "zod";
import { MembershipRole } from "@prisma/client";

export const CreateBusinessSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must not exceed 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
    .optional(),
  businessType: z.string().max(50).optional(),
  contactEmail: z.string().email("Invalid contact email").optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required").default("Asia/Colombo"),
  currency: z.string().min(3).max(3).default("LKR"),
  initialOwnerEmail: z.string().email("A valid email is required for the initial owner"),
  initialOwnerFullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
});

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;

export const UpdateBusinessSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters"),
  businessType: z.string().max(50).optional().or(z.literal("")),
  contactEmail: z.string().email("Invalid contact email").optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required").default("Asia/Colombo"),
  currency: z.string().min(3).max(3).default("LKR"),
  expenseApprovalThreshold: z.coerce.number().min(0, "Threshold must be positive").default(500),
  defaultReservePercentage: z.coerce.number().min(0).max(100, "Reserve % must be between 0 and 100").default(20),
  autoDeductInventory: z.boolean().default(true),
});

export type UpdateBusinessSettingsInput = z.infer<typeof UpdateBusinessSettingsSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email("A valid email address is required"),
  role: z.nativeEnum(MembershipRole),
  proposedEquity: z.coerce.number().min(0).max(100).optional(),
  proposedProfitShare: z.coerce.number().min(0).max(100).optional(),
});

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  role: z.nativeEnum(MembershipRole),
  equityPercentage: z.coerce.number().min(0).max(100).optional(),
  profitSharePercentage: z.coerce.number().min(0).max(100).optional(),
});

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const RemoveMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
});

export type RemoveMemberInput = z.infer<typeof RemoveMemberSchema>;

export const RevokeInviteSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export type RevokeInviteInput = z.infer<typeof RevokeInviteSchema>;
