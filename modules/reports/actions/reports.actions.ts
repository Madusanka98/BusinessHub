"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission, assertSuperAdmin } from "@/lib/tenant/guards";
import { BusinessStatus } from "@prisma/client";
import {
  CreateScheduledReportSchema,
  UpdateNotificationPreferenceSchema,
  UpdatePlatformSettingsSchema,
} from "../schemas/reports.schema";
import {
  createScheduledReport,
  toggleScheduledReportStatus,
  deleteScheduledReport,
  executeScheduledReport,
} from "../services/scheduler.service";
import { updateNotificationPreferences } from "../services/notifications.service";
import {
  updateBusinessStatusByAdmin,
  updatePlatformSettings,
} from "../services/saas-admin.service";

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  data?: Record<string, unknown>;
}

// ==========================================
// SCHEDULED REPORT ACTIONS
// ==========================================

export async function createScheduledReportAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "reports:schedule:manage");

    const rawRecipients = String(formData.get("recipients") || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const raw = {
      name: formData.get("name"),
      reportType: formData.get("reportType"),
      frequency: formData.get("frequency"),
      dayOfWeek: formData.get("dayOfWeek") || 1,
      dayOfMonth: formData.get("dayOfMonth") || 1,
      timeOfDay: formData.get("timeOfDay") || "08:00",
      timezone: formData.get("timezone") || "Asia/Colombo",
      recipients: rawRecipients,
      format: formData.get("format") || "CSV",
    };

    const parsed = CreateScheduledReportSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please verify schedule details.",
      };
    }

    const report = await createScheduledReport(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/reports");
    revalidatePath("/reports/schedules");

    return {
      success: true,
      message: `Scheduled report "${report.name}" created successfully.`,
      data: { id: report.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create scheduled report.",
    };
  }
}

export async function toggleScheduledReportAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "reports:schedule:manage");

    const id = String(formData.get("id") || "");
    const isActive = formData.get("isActive") === "true";

    if (!id) return { success: false, error: "Report ID is required." };

    await toggleScheduledReportStatus(context.businessId, id, isActive, context.userId);

    revalidatePath("/reports/schedules");

    return {
      success: true,
      message: isActive ? "Report schedule resumed." : "Report schedule paused.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle schedule status.",
    };
  }
}

export async function deleteScheduledReportAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "reports:schedule:manage");

    const id = String(formData.get("id") || "");
    if (!id) return { success: false, error: "Report ID is required." };

    await deleteScheduledReport(context.businessId, id, context.userId);

    revalidatePath("/reports/schedules");

    return {
      success: true,
      message: "Scheduled report deleted successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete scheduled report.",
    };
  }
}

export async function runScheduledReportNowAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "reports:schedule:manage");

    const id = String(formData.get("id") || "");
    if (!id) return { success: false, error: "Report ID is required." };

    const result = await executeScheduledReport(id);

    revalidatePath("/reports/schedules");

    if (!result.success) {
      return { success: false, error: result.error || "Report execution failed." };
    }

    return {
      success: true,
      message: `Report generated and dispatched successfully in ${result.duration}ms.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to run scheduled report.",
    };
  }
}

// ==========================================
// NOTIFICATION PREFERENCE ACTIONS
// ==========================================

export async function updateNotificationPreferencesAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "notifications:preferences:manage");

    const raw = {
      emailNotifications: formData.get("emailNotifications") === "true",
      lowStockAlerts: formData.get("lowStockAlerts") === "true",
      productionPhaseAlerts: formData.get("productionPhaseAlerts") === "true",
      weeklySummary: formData.get("weeklySummary") === "true",
    };

    const parsed = UpdateNotificationPreferenceSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid preference settings.",
      };
    }

    await updateNotificationPreferences(context.businessId, context.userId, parsed.data);

    revalidatePath("/settings");
    revalidatePath("/settings/notifications");

    return {
      success: true,
      message: "Notification preferences saved successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update notification preferences.",
    };
  }
}

// ==========================================
// SAAS PLATFORM ADMINISTRATION ACTIONS
// ==========================================

export async function updateBusinessStatusByAdminAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const adminUser = await assertSuperAdmin("superadmin:business:suspend");

    const businessId = String(formData.get("businessId") || "");
    const newStatus = formData.get("status") as BusinessStatus;
    const reason = String(formData.get("reason") || "");

    if (!businessId || !newStatus) {
      return { success: false, error: "Business ID and new status are required." };
    }

    await updateBusinessStatusByAdmin(businessId, newStatus, adminUser.userId, reason);

    revalidatePath("/admin");
    revalidatePath("/admin/businesses");

    return {
      success: true,
      message: `Business status updated to ${newStatus}.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Administrative action failed.",
    };
  }
}

export async function updatePlatformSettingsAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const adminUser = await assertSuperAdmin("superadmin:platform:settings");

    const raw = {
      platformName: formData.get("platformName"),
      supportEmail: formData.get("supportEmail"),
      defaultTimezone: formData.get("defaultTimezone") || "Asia/Colombo",
      defaultCurrency: formData.get("defaultCurrency") || "LKR",
      enableRegistration: formData.get("enableRegistration") === "true",
      maintenanceMode: formData.get("maintenanceMode") === "true",
    };

    const parsed = UpdatePlatformSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please correct platform settings.",
      };
    }

    await updatePlatformSettings(parsed.data, adminUser.userId);

    revalidatePath("/admin");
    revalidatePath("/admin/settings");

    return {
      success: true,
      message: "Platform settings updated successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update platform settings.",
    };
  }
}

// ==========================================
// REPORT CSV EXPORT ACTION
// ==========================================

export async function exportReportCsvAction(
  reportType: string,
  fromDateStr?: string,
  toDateStr?: string
): Promise<{ success: boolean; filename?: string; csv?: string; error?: string }> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "reports:export");

    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;

    const { generateReportCsvContent } = await import("../services/scheduler.service");
    const { ReportType } = await import("@prisma/client");

    const validReportType = reportType as keyof typeof ReportType;
    if (!ReportType[validReportType]) {
      return { success: false, error: "Invalid report type specified for export." };
    }

    const { filename, csv } = await generateReportCsvContent(
      context.businessId,
      ReportType[validReportType],
      fromDate,
      toDate
    );

    return {
      success: true,
      filename,
      csv,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to export report.",
    };
  }
}

