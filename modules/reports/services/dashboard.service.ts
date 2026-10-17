import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getProfitAndLossReport, getInventoryValuationReport, getCustomerSupplierBalancesReport } from "./reports.service";
import { getProductionMetrics } from "@/modules/mushroom/services/production-metrics.service";
import { TransactionType, OrderStatus, PurchaseStatus } from "@prisma/client";

export async function getBusinessDashboardMetrics(businessId: string, fromDate?: Date, toDate?: Date) {
  // Parallel fetch of core operational domains
  const [pnl, inventory, balances, mushroomMetrics, recentTransactions, recentAuditLogs] = await Promise.all([
    getProfitAndLossReport(businessId, fromDate, toDate),
    getInventoryValuationReport(businessId),
    getCustomerSupplierBalancesReport(businessId),
    getProductionMetrics(businessId).catch(() => null), // Gracefully null if no mushroom batches configured
    prisma.financialTransaction.findMany({
      where: { businessId },
      include: { category: true },
      orderBy: { transactionDate: "desc" },
      take: 5,
    }),
    prisma.auditEvent.findMany({
      where: { businessId },
      include: { user: { select: { fullName: true } } },
      orderBy: { timestamp: "desc" },
      take: 6,
    }),
  ]);

  return {
    finance: {
      revenue: pnl.summary.totalRevenue,
      cogs: pnl.summary.totalCostOfGoodsSold,
      grossProfit: pnl.summary.grossProfit,
      expenses: pnl.summary.totalOperatingExpenses,
      netIncome: pnl.summary.netIncome,
      marginPercent: pnl.summary.operatingMarginPercent,
      receivables: balances.totalReceivables,
      payables: balances.totalPayables,
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        amount: Number(tx.amount),
        type: tx.type,
        status: tx.approvalStatus,
        date: tx.transactionDate,
        categoryName: tx.category?.name || "General",
        description: tx.description,
      })),
    },
    inventory: {
      totalProducts: inventory.totalProducts,
      totalCostValuation: inventory.totalCostValuation,
      totalRetailValuation: inventory.totalRetailValuation,
      lowStockCount: inventory.lowStockCount,
      lowStockItems: inventory.items.filter((i) => i.isLowStock).slice(0, 5),
    },
    mushroom: mushroomMetrics ? {
      activeBatches: mushroomMetrics.batches.active,
      totalBagsViable: mushroomMetrics.batches.totalActiveViableBags,
      freshYieldKg: mushroomMetrics.harvest.totalSaleableKg,
      freshStockKg: mushroomMetrics.inventory.freshStockAvailableKg,
      driedStockKg: mushroomMetrics.inventory.driedStockAvailableKg,
    } : null,
    recentActivity: recentAuditLogs.map((log) => ({
      id: log.id,
      actionType: log.actionType,
      targetEntity: log.targetEntity,
      timestamp: log.timestamp,
      userName: log.user?.fullName || "System",
    })),
  };
}
