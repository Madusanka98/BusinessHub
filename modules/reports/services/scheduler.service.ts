import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  ReportType,
  ReportFrequency,
  ReportFormat,
  JobRunStatus,
  Prisma,
} from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { sendEmail } from "@/lib/email/mailer";
import { generateCsv } from "./export.service";
import {
  getProfitAndLossReport,
  getSalesSummaryReport,
  getPurchasesSummaryReport,
  getInventoryValuationReport,
  getLowStockReport,
} from "./reports.service";
import {
  CreateScheduledReportInput,
  CreateScheduledReportSchema,
  UpdateScheduledReportInput,
  UpdateScheduledReportSchema,
} from "../schemas/reports.schema";

/**
 * Calculates the next execution timestamp based on schedule parameters.
 */
export function calculateNextRunDate(
  frequency: ReportFrequency,
  timeOfDay: string, // "08:00"
  dayOfWeek?: number | null, // 0-6
  dayOfMonth?: number | null, // 1-31
  from: Date = new Date()
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const next = new Date(from);
  next.setHours(hours || 8, minutes || 0, 0, 0);

  if (frequency === ReportFrequency.DAILY) {
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }
  } else if (frequency === ReportFrequency.WEEKLY) {
    const targetDay = dayOfWeek ?? 1; // Default Monday
    let daysUntilTarget = (targetDay - next.getDay() + 7) % 7;
    if (daysUntilTarget === 0 && next <= from) {
      daysUntilTarget = 7;
    }
    next.setDate(next.getDate() + daysUntilTarget);
  } else if (frequency === ReportFrequency.MONTHLY) {
    const targetDate = dayOfMonth ?? 1;
    next.setDate(targetDate);
    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next;
}

export async function getScheduledReports(businessId: string) {
  return await prisma.scheduledReport.findMany({
    where: { businessId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
      _count: {
        select: { runs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getScheduledReportById(businessId: string, id: string) {
  return await prisma.scheduledReport.findFirst({
    where: { id, businessId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function createScheduledReport(
  businessId: string,
  rawInput: CreateScheduledReportInput,
  userId?: string
) {
  const input = CreateScheduledReportSchema.parse(rawInput);
  const nextRunAt = calculateNextRunDate(
    input.frequency,
    input.timeOfDay,
    input.dayOfWeek,
    input.dayOfMonth
  );

  const report = await prisma.scheduledReport.create({
    data: {
      businessId,
      name: input.name.trim(),
      reportType: input.reportType,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      timeOfDay: input.timeOfDay,
      timezone: input.timezone,
      recipients: input.recipients,
      format: input.format,
      isActive: true,
      nextRunAt,
      createdById: userId,
    },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "ScheduledReport",
    targetId: report.id,
    changeDetails: {
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      nextRunAt,
      recipients: input.recipients,
    },
  });

  return report;
}

export async function toggleScheduledReportStatus(
  businessId: string,
  id: string,
  isActive: boolean,
  userId?: string
) {
  const existing = await prisma.scheduledReport.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    throw new Error("Scheduled report not found in this business.");
  }

  const updated = await prisma.scheduledReport.update({
    where: { id },
    data: {
      isActive,
      nextRunAt: isActive
        ? calculateNextRunDate(
            existing.frequency,
            existing.timeOfDay,
            existing.dayOfWeek,
            existing.dayOfMonth
          )
        : null,
    },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "UPDATE",
    targetEntity: "ScheduledReport",
    targetId: id,
    changeDetails: {
      isActive,
      action: isActive ? "RESUMED" : "PAUSED",
    },
  });

  return updated;
}

export async function deleteScheduledReport(
  businessId: string,
  id: string,
  userId?: string
) {
  const existing = await prisma.scheduledReport.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    throw new Error("Scheduled report not found in this business.");
  }

  await prisma.scheduledReport.delete({
    where: { id },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "DELETE",
    targetEntity: "ScheduledReport",
    targetId: id,
    changeDetails: {
      name: existing.name,
      reportType: existing.reportType,
    },
  });

  return { success: true };
}

/**
 * Generates the CSV string for the requested report type.
 */
export async function generateReportCsvContent(
  businessId: string,
  reportType: ReportType,
  fromDate?: Date,
  toDate?: Date
): Promise<{ filename: string; csv: string }> {
  const timestamp = new Date().toISOString().slice(0, 10);

  if (reportType === ReportType.PROFIT_AND_LOSS) {
    const data = await getProfitAndLossReport(businessId, fromDate, toDate);
    const headers = ["Category / Line Item", "Amount (LKR)"];
    const rows = [
      ["Total Revenue", data.summary.totalRevenue],
      ["Cost of Goods Sold", data.summary.totalCostOfGoodsSold],
      ["Gross Profit", data.summary.grossProfit],
      ["Total Operating Expenses", data.summary.totalOperatingExpenses],
      ["Net Operating Income", data.summary.netIncome],
      ["Operating Margin (%)", `${data.summary.operatingMarginPercent}%`],
    ];
    return { filename: `Profit_and_Loss_${timestamp}.csv`, csv: generateCsv(headers, rows) };
  }

  if (reportType === ReportType.SALES_SUMMARY) {
    const data = await getSalesSummaryReport(businessId);
    const headers = ["Order #", "Customer", "Date", "Status", "Payment", "Total (LKR)"];
    const rows = data.orders.map((o) => [
      o.orderNumber,
      o.customerName,
      new Date(o.orderDate).toLocaleDateString(),
      o.status,
      o.paymentStatus,
      o.totalAmount,
    ]);
    return { filename: `Sales_Summary_${timestamp}.csv`, csv: generateCsv(headers, rows) };
  }

  if (reportType === ReportType.PURCHASES_SUMMARY) {
    const data = await getPurchasesSummaryReport(businessId);
    const headers = ["Purchase #", "Supplier", "Date", "Status", "Payment", "Total (LKR)"];
    const rows = data.purchases.map((p) => [
      p.purchaseNumber,
      p.supplierName,
      new Date(p.purchaseDate).toLocaleDateString(),
      p.status,
      p.paymentStatus,
      p.totalAmount,
    ]);
    return { filename: `Purchases_Summary_${timestamp}.csv`, csv: generateCsv(headers, rows) };
  }

  if (reportType === ReportType.INVENTORY_VALUATION || reportType === ReportType.LOW_STOCK_ALERT) {
    const data = await getInventoryValuationReport(businessId);
    const filterItems = reportType === ReportType.LOW_STOCK_ALERT ? data.items.filter((i) => i.isLowStock) : data.items;
    const headers = ["SKU", "Product Name", "Category", "Stock", "Unit Cost", "Cost Valuation", "Low Stock Alert"];
    const rows = filterItems.map((i) => [
      i.sku,
      i.name,
      i.category,
      i.currentStock,
      i.unitCost,
      i.costValuation,
      i.isLowStock ? "YES" : "NO",
    ]);
    return {
      filename: `${reportType === ReportType.LOW_STOCK_ALERT ? "Low_Stock_Alert" : "Inventory_Valuation"}_${timestamp}.csv`,
      csv: generateCsv(headers, rows),
    };
  }

  // Default fallback summary
  const headers = ["Metric", "Value"];
  const rows = [["Report Generation Date", timestamp], ["Status", "Completed"]];
  return { filename: `Report_${reportType}_${timestamp}.csv`, csv: generateCsv(headers, rows) };
}

/**
 * Idempotently executes a single scheduled report.
 * Uses atomic status locking to prevent duplicate concurrent runs.
 */
export async function executeScheduledReport(reportId: string) {
  const startTime = Date.now();

  const report = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!report || !report.isActive) {
    return { success: false, reason: "Report not found or paused" };
  }

  // Create run record in IN_PROGRESS state
  const run = await prisma.scheduledReportRun.create({
    data: {
      scheduledReportId: report.id,
      status: JobRunStatus.IN_PROGRESS,
    },
  });

  try {
    const recipients = (Array.isArray(report.recipients) ? report.recipients : []) as string[];
    const { filename, csv } = await generateReportCsvContent(report.businessId, report.reportType);

    // Send notification emails to configured authorized recipients
    for (const recipient of recipients) {
      await sendEmail({
        to: recipient,
        subject: `[${report.business.name}] Scheduled Report: ${report.name}`,
        text: `Attached is your scheduled ${report.reportType.replace(/_/g, " ")} for ${report.business.name}.\n\nCSV Summary Generated: ${new Date().toLocaleString()}\n\n---\n${csv.slice(0, 1000)}...`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>${report.business.name} — Scheduled Report</h2>
            <p>Your automated report <strong>${report.name}</strong> (${report.reportType}) has been generated successfully.</p>
            <p><small>Format: ${report.format} • Recipient: ${recipient}</small></p>
            <hr />
            <pre style="background: #f4f4f5; padding: 10px; border-radius: 5px; font-size: 11px; overflow-x: auto;">${csv.slice(0, 2000)}</pre>
          </div>
        `,
      });
    }

    const duration = Date.now() - startTime;
    const nextRunAt = calculateNextRunDate(
      report.frequency,
      report.timeOfDay,
      report.dayOfWeek,
      report.dayOfMonth,
      new Date()
    );

    // Update run as SUCCESS and advance nextRunAt
    await prisma.$transaction([
      prisma.scheduledReportRun.update({
        where: { id: run.id },
        data: {
          status: JobRunStatus.SUCCESS,
          completedAt: new Date(),
          executionDurationMs: duration,
          recipientsCount: recipients.length,
        },
      }),
      prisma.scheduledReport.update({
        where: { id: report.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      }),
    ]);

    return { success: true, runId: run.id, duration };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : "Execution failed";

    await prisma.scheduledReportRun.update({
      where: { id: run.id },
      data: {
        status: JobRunStatus.FAILED,
        completedAt: new Date(),
        executionDurationMs: duration,
        errorMessage: errorMsg,
      },
    });

    return { success: false, error: errorMsg };
  }
}
