import { z } from "zod";
import { ReportType, ReportFrequency, ReportFormat } from "@prisma/client";

// ==========================================
// REPORT FILTER SCHEMAS
// ==========================================

export const DateRangeFilterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type DateRangeFilterInput = z.input<typeof DateRangeFilterSchema>;
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;

// ==========================================
// SCHEDULED REPORT SCHEMAS
// ==========================================

export const CreateScheduledReportSchema = z.object({
  name: z.string().min(2, "Report schedule name must be at least 2 characters").max(100),
  reportType: z.nativeEnum(ReportType),
  frequency: z.nativeEnum(ReportFrequency).default(ReportFrequency.WEEKLY),
  dayOfWeek: z.coerce.number().int().min(0).max(6).default(1), // 0=Sun, 1=Mon
  dayOfMonth: z.coerce.number().int().min(1).max(31).default(1),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be HH:mm (24-hour format)").default("08:00"),
  timezone: z.string().default("Asia/Colombo"),
  recipients: z.array(z.string().email("Invalid recipient email address")).min(1, "At least one recipient is required"),
  format: z.nativeEnum(ReportFormat).default(ReportFormat.CSV),
});
export type CreateScheduledReportInput = z.input<typeof CreateScheduledReportSchema>;

export const UpdateScheduledReportSchema = CreateScheduledReportSchema.partial().extend({
  id: z.string().min(1, "Scheduled report ID is required"),
  isActive: z.boolean().optional(),
});
export type UpdateScheduledReportInput = z.input<typeof UpdateScheduledReportSchema>;

// ==========================================
// NOTIFICATION PREFERENCE SCHEMAS
// ==========================================

export const UpdateNotificationPreferenceSchema = z.object({
  emailNotifications: z.boolean().default(true),
  lowStockAlerts: z.boolean().default(true),
  productionPhaseAlerts: z.boolean().default(true),
  weeklySummary: z.boolean().default(true),
});
export type UpdateNotificationPreferenceInput = z.input<typeof UpdateNotificationPreferenceSchema>;

// ==========================================
// PLATFORM SETTINGS SCHEMAS
// ==========================================

export const UpdatePlatformSettingsSchema = z.object({
  platformName: z.string().min(2).max(100),
  supportEmail: z.string().email(),
  defaultTimezone: z.string(),
  defaultCurrency: z.string().length(3),
  enableRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
});
export type UpdatePlatformSettingsInput = z.input<typeof UpdatePlatformSettingsSchema>;
