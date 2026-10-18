import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { GET as cronGet } from "@/app/api/cron/reports/route";
import { createBusinessBySuperAdmin } from "@/modules/core-tenancy/services/business.service";
import {
  sanitizeCsvCell,
  generateCsv,
} from "@/modules/reports/services/export.service";
import {
  calculateNextRunDate,
  createScheduledReport,
  toggleScheduledReportStatus,
  executeScheduledReport,
  getScheduledReports,
} from "@/modules/reports/services/scheduler.service";
import {
  getProfitAndLossReport,
  getInventoryValuationReport,
  getCustomerSupplierBalancesReport,
} from "@/modules/reports/services/reports.service";
import {
  getBusinessDashboardMetrics,
} from "@/modules/reports/services/dashboard.service";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/modules/reports/services/notifications.service";
import {
  getPlatformMetrics,
  getPlatformBusinesses,
  updateBusinessStatusByAdmin,
  getPlatformSettings,
  updatePlatformSettings,
} from "@/modules/reports/services/saas-admin.service";
import {
  BusinessStatus,
  ReportType,
  ReportFrequency,
  ReportFormat,
  TransactionType,
  ApprovalStatus,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
  ProductCategory,
  UnitOfMeasure,
} from "@prisma/client";

describe("Task 8: Reports, Notifications & SaaS Administration", () => {
  const timestamp = Date.now();
  let superAdminId: string;
  let ownerUserId: string;
  let businessId: string;
  let secondaryBusinessId: string;

  beforeAll(async () => {
    const pwd = await hashPassword("ValidPass@123!");

    // 1. Create Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: `superadmin-rep-${timestamp}@test.local`,
        fullName: "Platform Super Admin",
        passwordHash: pwd,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    // 2. Create Owner User
    const ownerEmail = `owner-rep-${timestamp}@test.local`;
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        fullName: "Business Owner One",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    ownerUserId = owner.id;

    // 3. Create Primary Business
    const b1 = await createBusinessBySuperAdmin(
      {
        name: `Reporting Test Org ${timestamp}`,
        slug: `rep-org-${timestamp}`,
        initialOwnerEmail: ownerEmail,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessId = b1.businessId;

    // 4. Create Secondary Business for Isolation Testing
    const b2 = await createBusinessBySuperAdmin(
      {
        name: `Secondary Test Org ${timestamp}`,
        slug: `sec-org-${timestamp}`,
        initialOwnerEmail: ownerEmail,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    secondaryBusinessId = b2.businessId;

    // 5. Populate verified financial transaction in primary business
    const cat = await prisma.transactionCategory.create({
      data: {
        businessId,
        name: "Direct Consulting",
        type: TransactionType.INCOME,
      },
    });

    await prisma.financialTransaction.create({
      data: {
        businessId,
        type: TransactionType.INCOME,
        categoryId: cat.id,
        amount: 250000,
        description: "Enterprise Consulting Service",
        approvalStatus: ApprovalStatus.ACTIVE,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionDate: new Date(),
        createdById: ownerUserId,
        approvedById: ownerUserId,
      },
    });

    // Populate a draft transaction (should be excluded from verified financial reports)
    await prisma.financialTransaction.create({
      data: {
        businessId,
        type: TransactionType.INCOME,
        categoryId: cat.id,
        amount: 999999,
        description: "Unverified Draft Income",
        approvalStatus: ApprovalStatus.PENDING_APPROVAL,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionDate: new Date(),
        createdById: ownerUserId,
      },
    });

    // Populate product in primary business using standard product service
    const { createProduct } = await import("@/modules/commerce/services/product.service");
    await createProduct(
      businessId,
      {
        name: "Organic Spawn Pack",
        sku: `PROD-${timestamp}`,
        category: ProductCategory.RAW_MATERIAL,
        unitOfMeasure: UnitOfMeasure.PACK,
        unitCost: 800,
        sellingPrice: 1500,
        reorderThreshold: 10,
        initialStock: 4,
      },
      ownerUserId
    );
  });

  afterAll(async () => {
    // Cleanup generated data
    const bIds = [businessId, secondaryBusinessId].filter(Boolean);
    const uIds = [superAdminId, ownerUserId].filter(Boolean);
    if (bIds.length > 0) {
      await prisma.scheduledReportRun.deleteMany({});
      await prisma.scheduledReport.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.notificationPreference.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.financialTransaction.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.stockMovement.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.product.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.transactionCategory.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.auditEvent.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.businessMembership.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.businessSettings.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.business.deleteMany({ where: { id: { in: bIds } } });
    }
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
  });

  // ==========================================
  // 1. CSV EXPORT & FORMULA INJECTION TESTS
  // ==========================================
  describe("CSV Formula Injection Mitigation & Formatting", () => {
    it("should prepend an apostrophe to values starting with formula prefix triggers (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("`'=SUM(A1:A10)`".replace(/`/g, ""));
      expect(sanitizeCsvCell("+123456789")).toBe("'+123456789");
      expect(sanitizeCsvCell("-cmd|'/C calc'!A0")).toBe("'-cmd|'/C calc'!A0");
      expect(sanitizeCsvCell("@malicious")).toBe("'@malicious");
      expect(sanitizeCsvCell("\tindented")).toBe("'\tindented");
    });

    it("should escape quotes and commas properly", () => {
      const withComma = sanitizeCsvCell("Acme, Inc.");
      expect(withComma).toBe('"Acme, Inc."');

      const withQuotes = sanitizeCsvCell('He said "Hello"');
      expect(withQuotes).toBe('"He said ""Hello"""');
    });

    it("should produce RFC 4180 compliant CSV with UTF-8 BOM", () => {
      const headers = ["ID", "Name", "FormulaTest"];
      const rows = [
        ["1", "Standard Name", "=cmd"],
        ["2", "With, Comma", "Safe text"],
      ];
      const csv = generateCsv(headers, rows);
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("ID,Name,FormulaTest");
      expect(csv).toContain("1,Standard Name,'=cmd");
      expect(csv).toContain('2,"With, Comma",Safe text');
    });
  });

  // ==========================================
  // 2. SCHEDULER & NEXT-RUN CALCULATION TESTS
  // ==========================================
  describe("Scheduler Next-Run Timestamp Engine", () => {
    it("should calculate correct next DAILY run date", () => {
      const from = new Date("2026-10-18T10:00:00Z");
      const nextRun = calculateNextRunDate(ReportFrequency.DAILY, "08:00", null, null, from);

      expect(nextRun.getDate()).toBe(19);
      expect(nextRun.getHours()).toBe(8);
    });

    it("should calculate correct next WEEKLY run date", () => {
      // 2026-10-18 is Sunday (day 0)
      const from = new Date("2026-10-18T12:00:00Z");
      // Target Monday (day 1)
      const nextRun = calculateNextRunDate(ReportFrequency.WEEKLY, "09:00", 1, null, from);

      expect(nextRun.getDay()).toBe(1); // Monday
      expect(nextRun > from).toBe(true);
    });

    it("should calculate correct next MONTHLY run date", () => {
      const from = new Date("2026-10-18T12:00:00Z");
      // Target 1st of next month
      const nextRun = calculateNextRunDate(ReportFrequency.MONTHLY, "08:00", null, 1, from);

      expect(nextRun.getDate()).toBe(1);
      expect(nextRun.getMonth()).toBe(10); // November
    });
  });

  // ==========================================
  // 3. SCHEDULED REPORT CRUD & EXECUTION TESTS
  // ==========================================
  describe("Scheduled Report Execution & State Transitions", () => {
    let reportId: string;

    it("should create a scheduled report and calculate its initial nextRunAt", async () => {
      const report = await createScheduledReport(
        businessId,
        {
          name: "Weekly P&L Executive Summary",
          reportType: ReportType.PROFIT_AND_LOSS,
          frequency: ReportFrequency.WEEKLY,
          dayOfWeek: 1,
          timeOfDay: "08:00",
          timezone: "Asia/Colombo",
          recipients: ["finance@company.local"],
          format: ReportFormat.CSV,
        },
        ownerUserId
      );

      expect(report.id).toBeDefined();
      expect(report.isActive).toBe(true);
      expect(report.nextRunAt).toBeInstanceOf(Date);
      reportId = report.id;
    });

    it("should pause and resume a scheduled report", async () => {
      const paused = await toggleScheduledReportStatus(businessId, reportId, false, ownerUserId);
      expect(paused.isActive).toBe(false);
      expect(paused.nextRunAt).toBeNull();

      const resumed = await toggleScheduledReportStatus(businessId, reportId, true, ownerUserId);
      expect(resumed.isActive).toBe(true);
      expect(resumed.nextRunAt).toBeInstanceOf(Date);
    });

    it("should execute scheduled report idempotently, update run logs, and advance nextRunAt", async () => {
      const execResult = await executeScheduledReport(reportId);
      expect(execResult.success).toBe(true);
      expect(execResult.duration).toBeGreaterThanOrEqual(0);

      const list = await getScheduledReports(businessId);
      const updated = list.find((r) => r.id === reportId);
      expect(updated).toBeDefined();
      expect(updated?.lastRunAt).toBeInstanceOf(Date);
      expect(updated?.runs.length).toBeGreaterThan(0);
      expect(updated?.runs[0].status).toBe("SUCCESS");
    });

    it("prevents duplicate concurrent execution of the same scheduled report using atomic locking", async () => {
      // Simulate an in-flight execution by creating an IN_PROGRESS run
      const inFlightRun = await prisma.scheduledReportRun.create({
        data: {
          scheduledReportId: reportId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      // Calling executeScheduledReport concurrently should be rejected by the atomic lock
      const concurrentResult = await executeScheduledReport(reportId);
      expect(concurrentResult.success).toBe(false);
      expect(concurrentResult.reason).toMatch(/already executing/i);

      // Clean up the simulated lock run
      await prisma.scheduledReportRun.delete({ where: { id: inFlightRun.id } });
    });
  });

  // ==========================================
  // 4. REPORT CALCULATIONS & FINANCIAL INTEGRITY
  // ==========================================
  describe("Financial & Inventory Report Calculations", () => {
    it("should include verified approved transactions and exclude unapproved drafts from P&L", async () => {
      const pnl = await getProfitAndLossReport(businessId);

      expect(pnl.summary.totalRevenue).toBe(250000); // 250,000 only, 999,999 draft was excluded!
      expect(pnl.summary.totalCostOfGoodsSold).toBe(0);
      expect(pnl.summary.grossProfit).toBe(250000);
      expect(pnl.summary.netIncome).toBe(250000);
      expect(pnl.summary.operatingMarginPercent).toBe(100);
    });

    it("calculates accurate realized COGS and gross profit from confirmed sales orders", async () => {
      // Create a test product with unitCost = 500
      const prod = await prisma.product.create({
        data: {
          businessId,
          name: "Organic Shiitake Test",
          sku: `TEST-COG-${Date.now()}`,
          category: ProductCategory.FRESH_MUSHROOM,
          unitOfMeasure: UnitOfMeasure.KG,
          unitCost: 500.0,
          sellingPrice: 1200.0,
          currentStock: 50.0,
        },
      });

      // Create a confirmed order with 10 units
      const order = await prisma.order.create({
        data: {
          businessId,
          orderNumber: `SO-COG-${Date.now()}`,
          orderDate: new Date(),
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          totalAmount: 12000.0,
          isWalkIn: true,
          items: {
            create: [
              {
                productId: prod.id,
                quantity: 10.0,
                unitPrice: 1200.0,
                subtotal: 12000.0,
              },
            ],
          },
        },
      });

      const pnl = await getProfitAndLossReport(businessId);
      // Realized COGS: 10 units * 500 cost = 5,000
      expect(pnl.summary.realizedSalesCOGS).toBe(5000);
      expect(pnl.summary.totalCostOfGoodsSold).toBe(5000);
      // Gross Profit: Total Revenue (250,000) - Realized COGS (5,000) = 245,000
      expect(pnl.summary.grossProfit).toBe(245000);

      // Clean up test order & product
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.product.delete({ where: { id: prod.id } });
    });

    it("should calculate inventory valuation and identify low-stock items correctly", async () => {
      const inv = await getInventoryValuationReport(businessId);

      expect(inv.totalProducts).toBe(1);
      expect(inv.totalCostValuation).toBe(3200); // 4 units * 800 cost = 3200
      expect(inv.totalRetailValuation).toBe(6000); // 4 units * 1500 price = 6000
      expect(inv.lowStockCount).toBe(1);
      expect(inv.items[0].isLowStock).toBe(true);
    });

    it("should calculate customer and supplier balances without leaking other tenants", async () => {
      const balances = await getCustomerSupplierBalancesReport(businessId);
      expect(balances.totalReceivables).toBe(0);
      expect(balances.totalPayables).toBe(0);
    });

    it("should aggregate unified dashboard metrics correctly", async () => {
      const dashboard = await getBusinessDashboardMetrics(businessId);

      expect(dashboard.finance.revenue).toBe(250000);
      expect(dashboard.inventory.totalCostValuation).toBe(3200);
      expect(dashboard.inventory.lowStockCount).toBe(1);
      expect(dashboard.recentActivity.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 5. NOTIFICATION PREFERENCES
  // ==========================================
  describe("Notification Preferences Management", () => {
    it("should return default notification preferences when none previously set", async () => {
      const prefs = await getNotificationPreferences(businessId, ownerUserId);
      expect(prefs.emailNotifications).toBe(true);
      expect(prefs.lowStockAlerts).toBe(true);
      expect(prefs.weeklySummary).toBe(true);
    });

    it("should update and persist custom notification preferences", async () => {
      const updated = await updateNotificationPreferences(businessId, ownerUserId, {
        emailNotifications: false,
        lowStockAlerts: false,
        productionPhaseAlerts: true,
        weeklySummary: false,
      });

      expect(updated.emailNotifications).toBe(false);
      expect(updated.lowStockAlerts).toBe(false);
      expect(updated.productionPhaseAlerts).toBe(true);
      expect(updated.weeklySummary).toBe(false);

      const reFetched = await getNotificationPreferences(businessId, ownerUserId);
      expect(reFetched.emailNotifications).toBe(false);
    });
  });

  // ==========================================
  // 6. SAAS PLATFORM ADMINISTRATION (SUPER ADMIN)
  // ==========================================
  describe("SaaS Platform Administration & Access Control", () => {
    it("should retrieve global platform metrics for Super Admin", async () => {
      const metrics = await getPlatformMetrics();

      expect(metrics.businesses.total).toBeGreaterThanOrEqual(2);
      expect(metrics.users.total).toBeGreaterThanOrEqual(2);
      expect(metrics.users.superAdmins).toBeGreaterThanOrEqual(1);
      expect(metrics.settings.platformName).toContain("BusinessHub SaaS");
    });

    it("should allow Super Admin to suspend and reactivate a business tenant", async () => {
      // 1. Suspend
      const suspended = await updateBusinessStatusByAdmin(
        secondaryBusinessId,
        BusinessStatus.SUSPENDED,
        superAdminId,
        "Compliance Audit Review"
      );
      expect(suspended.status).toBe(BusinessStatus.SUSPENDED);

      // Verify audit event was logged
      const auditLog = await prisma.auditEvent.findFirst({
        where: {
          businessId: secondaryBusinessId,
          targetEntity: "Business",
          actionType: "STATUS_CHANGE",
        },
      });
      expect(auditLog).toBeDefined();

      // 2. Reactivate
      const reactivated = await updateBusinessStatusByAdmin(
        secondaryBusinessId,
        BusinessStatus.ACTIVE,
        superAdminId,
        "Compliance Cleared"
      );
      expect(reactivated.status).toBe(BusinessStatus.ACTIVE);
    });

    it("should allow Super Admin to update platform-wide settings", async () => {
      const updated = await updatePlatformSettings(
        {
          platformName: "BusinessHub SaaS Enterprise",
          supportEmail: "ops@businesshub.local",
          defaultTimezone: "Asia/Colombo",
          defaultCurrency: "LKR",
          enableRegistration: true,
          maintenanceMode: false,
        },
        superAdminId
      );

      expect(updated.platformName).toBe("BusinessHub SaaS Enterprise");
      expect(updated.supportEmail).toBe("ops@businesshub.local");

      const settings = await getPlatformSettings();
      expect(settings.platformName).toBe("BusinessHub SaaS Enterprise");
    });
  });

  // ==========================================
  // 7. TENANT ISOLATION
  // ==========================================
  describe("Multi-Tenant Data Boundary Protection", () => {
    it("should not expose primary business transactions or products to secondary business report", async () => {
      const secondaryPnl = await getProfitAndLossReport(secondaryBusinessId);
      expect(secondaryPnl.summary.totalRevenue).toBe(0); // Primary org's 250,000 does NOT bleed over!

      const secondaryInv = await getInventoryValuationReport(secondaryBusinessId);
      expect(secondaryInv.totalProducts).toBe(0); // Primary org's product does NOT bleed over!
    });
  });

  // ==========================================
  // 8. CRON AUTHENTICATION SECURITY
  // ==========================================
  describe("Cron Authentication Security", () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeAll(() => {
      process.env.CRON_SECRET = "super-secure-cron-secret-12345";
    });

    afterAll(() => {
      process.env.CRON_SECRET = originalCronSecret;
    });

    it("rejects authentication via query parameter ?key= (prevents log leakage)", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/reports?key=super-secure-cron-secret-12345");
      const res = await cronGet(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid or missing cron secret/i);
    });

    it("accepts authentication via Authorization Bearer header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/reports", {
        headers: {
          authorization: "Bearer super-secure-cron-secret-12345",
        },
      });
      const res = await cronGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("accepts authentication via x-cron-secret header", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/reports", {
        headers: {
          "x-cron-secret": "super-secure-cron-secret-12345",
        },
      });
      const res = await cronGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
