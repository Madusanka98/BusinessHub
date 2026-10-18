import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  TransactionType,
  ApprovalStatus,
  OrderStatus,
  PurchaseStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { DateRangeFilterInput, DateRangeFilterSchema } from "../schemas/reports.schema";

function parseDateRange(
  rawFilterOrStart?: DateRangeFilterInput | Date,
  toDate?: Date
): { startDate?: Date; endDate?: Date } {
  if (rawFilterOrStart instanceof Date) {
    return { startDate: rawFilterOrStart, endDate: toDate };
  }
  if (rawFilterOrStart) {
    const parsed = DateRangeFilterSchema.safeParse(rawFilterOrStart);
    if (parsed.success) {
      return {
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      };
    }
  }
  return {};
}

// ==========================================
// 1. PROFIT AND LOSS (INCOME STATEMENT)
// ==========================================

export async function getProfitAndLossReport(
  businessId: string,
  rawFilterOrStart?: DateRangeFilterInput | Date,
  toDate?: Date
) {
  const { startDate, endDate } = parseDateRange(rawFilterOrStart, toDate);

  const dateWhere: Prisma.DateTimeFilter = {};
  if (startDate) dateWhere.gte = startDate;
  if (endDate) dateWhere.lte = endDate;

  // Query only approved / active financial transactions
  const transactions = await prisma.financialTransaction.findMany({
    where: {
      businessId,
      approvalStatus: ApprovalStatus.ACTIVE,
      ...(Object.keys(dateWhere).length > 0 ? { transactionDate: dateWhere } : {}),
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
    },
    include: {
      category: true,
    },
    orderBy: { transactionDate: "asc" },
  });

  // Calculate Realized COGS from Confirmed/Delivered Sales Orders in the date range
  const orderDateWhere: Prisma.DateTimeFilter = {};
  if (startDate) orderDateWhere.gte = startDate;
  if (endDate) orderDateWhere.lte = endDate;

  const orders = await prisma.order.findMany({
    where: {
      businessId,
      status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] },
      ...(Object.keys(orderDateWhere).length > 0 ? { orderDate: orderDateWhere } : {}),
    },
    include: {
      items: {
        include: {
          product: {
            select: { unitCost: true },
          },
        },
      },
    },
  });

  let realizedSalesCOGS = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const qty = Number(item.quantity);
      const unitCost = Number(item.product.unitCost);
      realizedSalesCOGS += qty * unitCost;
    }
  }

  let totalRevenue = 0;
  let totalOperatingExpenses = 0;
  let directCOGS = 0;

  const revenueByCategory: Record<string, number> = {};
  const expensesByCategory: Record<string, number> = {};

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const catName = tx.category?.name || "General";

    if (tx.type === TransactionType.INCOME) {
      totalRevenue += amount;
      revenueByCategory[catName] = (revenueByCategory[catName] || 0) + amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      // Check if expense is categorized as raw materials / production COGS
      const isCOGS =
        catName.toLowerCase().includes("cost of goods") ||
        catName.toLowerCase().includes("cogs") ||
        catName.toLowerCase().includes("raw material") ||
        catName.toLowerCase().includes("spawn") ||
        catName.toLowerCase().includes("substrate") ||
        Boolean(tx.purchaseId);

      if (isCOGS) {
        directCOGS += amount;
      } else {
        totalOperatingExpenses += amount;
      }

      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + amount;
    }
  }

  const totalCostOfGoodsSold = Number((realizedSalesCOGS + directCOGS).toFixed(2));
  if (realizedSalesCOGS > 0) {
    expensesByCategory["Realized Sales COGS"] = Number(realizedSalesCOGS.toFixed(2));
  }

  const grossProfit = Number((totalRevenue - totalCostOfGoodsSold).toFixed(2));
  const netIncome = Number((grossProfit - totalOperatingExpenses).toFixed(2));
  const operatingMarginPercent =
    totalRevenue > 0 ? Number(((netIncome / totalRevenue) * 100).toFixed(2)) : 0;

  return {
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    summary: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      realizedSalesCOGS: Number(realizedSalesCOGS.toFixed(2)),
      directCOGS: Number(directCOGS.toFixed(2)),
      totalCostOfGoodsSold,
      grossProfit,
      totalOperatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
      netIncome,
      operatingMarginPercent,
    },
    revenueByCategory: Object.entries(revenueByCategory).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    })),
    expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    })),
    transactionCount: transactions.length,
  };
}

// ==========================================
// 2. CASH FLOW STATEMENT
// ==========================================

export async function getCashFlowReport(
  businessId: string,
  rawFilterOrStart?: DateRangeFilterInput | Date,
  toDate?: Date
) {
  const { startDate, endDate } = parseDateRange(rawFilterOrStart, toDate);

  const dateWhere: Prisma.DateTimeFilter = {};
  if (startDate) dateWhere.gte = startDate;
  if (endDate) dateWhere.lte = endDate;

  const [transactions, capitalContributions, partnerDrawings, loans] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        businessId,
        approvalStatus: ApprovalStatus.ACTIVE,
        ...(Object.keys(dateWhere).length > 0 ? { transactionDate: dateWhere } : {}),
      },
    }),
    prisma.partnerCapitalContribution.findMany({
      where: {
        membership: { businessId },
        ...(Object.keys(dateWhere).length > 0 ? { contributionDate: dateWhere } : {}),
      },
    }),
    prisma.partnerDrawing.findMany({
      where: {
        membership: { businessId },
        status: ApprovalStatus.ACTIVE,
        ...(Object.keys(dateWhere).length > 0 ? { requestDate: dateWhere } : {}),
      },
    }),
    prisma.partnerLoan.findMany({
      where: {
        membership: { businessId },
        status: "ACTIVE",
        ...(Object.keys(dateWhere).length > 0 ? { startDate: dateWhere } : {}),
      },
    }),
  ]);

  let operatingInflow = 0;
  let operatingOutflow = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === TransactionType.INCOME) operatingInflow += amt;
    else if (tx.type === TransactionType.EXPENSE) operatingOutflow += amt;
  }

  const netOperatingCash = Number((operatingInflow - operatingOutflow).toFixed(2));

  let capitalInflow = 0;
  for (const c of capitalContributions) {
    capitalInflow += Number(c.amount);
  }

  let drawingOutflow = 0;
  for (const d of partnerDrawings) {
    drawingOutflow += Number(d.amount);
  }

  const netFinancingCash = Number((capitalInflow - drawingOutflow).toFixed(2));
  const netCashChange = Number((netOperatingCash + netFinancingCash).toFixed(2));

  return {
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    operating: {
      inflow: Number(operatingInflow.toFixed(2)),
      outflow: Number(operatingOutflow.toFixed(2)),
      net: netOperatingCash,
    },
    financing: {
      capitalInflow: Number(capitalInflow.toFixed(2)),
      drawingOutflow: Number(drawingOutflow.toFixed(2)),
      net: netFinancingCash,
    },
    netCashChange,
  };
}

// ==========================================
// 3. SALES & REVENUE REPORT
// ==========================================

export async function getSalesSummaryReport(
  businessId: string,
  rawFilterOrStart?: DateRangeFilterInput | Date,
  toDate?: Date
) {
  const { startDate, endDate } = parseDateRange(rawFilterOrStart, toDate);

  const dateWhere: Prisma.DateTimeFilter = {};
  if (startDate) dateWhere.gte = startDate;
  if (endDate) dateWhere.lte = endDate;

  const orders = await prisma.order.findMany({
    where: {
      businessId,
      status: { notIn: [OrderStatus.CANCELLED] },
      ...(Object.keys(dateWhere).length > 0 ? { orderDate: dateWhere } : {}),
    },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { orderDate: "desc" },
  });

  let totalGrossSales = 0;
  let totalDiscounts = 0;
  let totalTax = 0;
  let totalNetSales = 0;
  let totalPaid = 0;
  let totalUnpaidReceivables = 0;

  for (const o of orders) {
    const subtotal = Number(o.subtotal);
    const disc = Number(o.discountAmount);
    const tax = Number(o.taxAmount);
    const total = Number(o.totalAmount);

    totalGrossSales += subtotal;
    totalDiscounts += disc;
    totalTax += tax;
    totalNetSales += total;

    if (o.paymentStatus === PaymentStatus.PAID) {
      totalPaid += total;
    } else {
      totalUnpaidReceivables += total;
    }
  }

  return {
    summary: {
      totalOrders: orders.length,
      totalSalesVolume: Number(totalNetSales.toFixed(2)),
      totalCollected: Number(totalPaid.toFixed(2)),
    },
    totalOrders: orders.length,
    totalGrossSales: Number(totalGrossSales.toFixed(2)),
    totalDiscounts: Number(totalDiscounts.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalNetSales: Number(totalNetSales.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    totalUnpaidReceivables: Number(totalUnpaidReceivables.toFixed(2)),
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer ? o.customer.name : o.walkInName || "Walk-In Customer",
      orderDate: o.orderDate,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: Number(o.totalAmount),
      itemCount: o.items.length,
    })),
  };
}

// ==========================================
// 4. PURCHASES & INVENTORY INFLUX REPORT
// ==========================================

export async function getPurchasesSummaryReport(
  businessId: string,
  rawFilterOrStart?: DateRangeFilterInput | Date,
  toDate?: Date
) {
  const { startDate, endDate } = parseDateRange(rawFilterOrStart, toDate);

  const dateWhere: Prisma.DateTimeFilter = {};
  if (startDate) dateWhere.gte = startDate;
  if (endDate) dateWhere.lte = endDate;

  const purchases = await prisma.purchase.findMany({
    where: {
      businessId,
      status: { notIn: [PurchaseStatus.CANCELLED] },
      ...(Object.keys(dateWhere).length > 0 ? { purchaseDate: dateWhere } : {}),
    },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { purchaseDate: "desc" },
  });

  let totalPurchases = 0;
  let totalPaid = 0;
  let totalUnpaidPayables = 0;

  for (const p of purchases) {
    const total = Number(p.totalAmount);
    totalPurchases += total;
    if (p.paymentStatus === PaymentStatus.PAID) {
      totalPaid += total;
    } else {
      totalUnpaidPayables += total;
    }
  }

  return {
    summary: {
      totalPurchases: purchases.length,
      totalPurchasesVolume: Number(totalPurchases.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
    },
    totalPurchasesCount: purchases.length,
    totalPurchasesAmount: Number(totalPurchases.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    totalUnpaidPayables: Number(totalUnpaidPayables.toFixed(2)),
    purchases: purchases.map((p) => ({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierName: p.supplier.name,
      purchaseDate: p.purchaseDate,
      status: p.status,
      paymentStatus: p.paymentStatus,
      totalAmount: Number(p.totalAmount),
      itemCount: p.items.length,
    })),
  };
}

// ==========================================
// 5. INVENTORY VALUATION & LOW STOCK
// ==========================================

export async function getInventoryValuationReport(businessId: string) {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
  });

  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let totalStockUnits = 0;
  let lowStockCount = 0;

  const items = products.map((p) => {
    const stock = Number(p.currentStock);
    const unitCost = Number(p.unitCost);
    const sellingPrice = Number(p.sellingPrice);
    const reorderThreshold = Number(p.reorderThreshold);

    const costValuation = Number((stock * unitCost).toFixed(2));
    const retailValuation = Number((stock * sellingPrice).toFixed(2));
    const isLowStock = stock <= reorderThreshold;

    totalCostValuation += costValuation;
    totalRetailValuation += retailValuation;
    totalStockUnits += stock;
    if (isLowStock) lowStockCount++;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitOfMeasure: p.unitOfMeasure,
      currentStock: stock,
      unitCost,
      sellingPrice,
      costValuation,
      retailValuation,
      reorderLevel: reorderThreshold,
      reorderThreshold,
      isLowStock,
    };
  });

  return {
    totalProducts: products.length,
    totalStockUnits: Number(totalStockUnits.toFixed(3)),
    totalCostValuation: Number(totalCostValuation.toFixed(2)),
    totalRetailValuation: Number(totalRetailValuation.toFixed(2)),
    potentialMargin: Number((totalRetailValuation - totalCostValuation).toFixed(2)),
    lowStockCount,
    items,
  };
}

export async function getLowStockReport(businessId: string) {
  const valuation = await getInventoryValuationReport(businessId);
  return {
    ...valuation,
    items: valuation.items.filter((i) => i.isLowStock),
  };
}

// ==========================================
// 6. CUSTOMER & SUPPLIER BALANCES
// ==========================================

export async function getCustomerSupplierBalancesReport(businessId: string) {
  const [unpaidOrders, unpaidPurchases] = await Promise.all([
    prisma.order.findMany({
      where: {
        businessId,
        paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] },
        status: { notIn: [OrderStatus.CANCELLED] },
      },
      include: { customer: true },
    }),
    prisma.purchase.findMany({
      where: {
        businessId,
        paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID] },
        status: { notIn: [PurchaseStatus.CANCELLED] },
      },
      include: { supplier: true },
    }),
  ]);

  const customerReceivables: Record<string, { id: string; name: string; outstandingBalance: number; count: number }> = {};
  for (const o of unpaidOrders) {
    const id = o.customerId || "walk-in";
    const name = o.customer ? o.customer.name : o.walkInName || "Walk-In Customer";
    const amt = Number(o.totalAmount);

    if (!customerReceivables[id]) {
      customerReceivables[id] = { id, name, outstandingBalance: 0, count: 0 };
    }
    customerReceivables[id].outstandingBalance += amt;
    customerReceivables[id].count += 1;
  }

  const supplierPayables: Record<string, { id: string; name: string; outstandingBalance: number; count: number }> = {};
  for (const p of unpaidPurchases) {
    const id = p.supplierId;
    const name = p.supplier.name;
    const amt = Number(p.totalAmount);

    if (!supplierPayables[id]) {
      supplierPayables[id] = { id, name, outstandingBalance: 0, count: 0 };
    }
    supplierPayables[id].outstandingBalance += amt;
    supplierPayables[id].count += 1;
  }

  const totalReceivables = Object.values(customerReceivables).reduce((acc, c) => acc + c.outstandingBalance, 0);
  const totalPayables = Object.values(supplierPayables).reduce((acc, s) => acc + s.outstandingBalance, 0);

  return {
    totalReceivables: Number(totalReceivables.toFixed(2)),
    totalPayables: Number(totalPayables.toFixed(2)),
    netWorkingCapital: Number((totalReceivables - totalPayables).toFixed(2)),
    customers: Object.values(customerReceivables).map((c) => ({
      ...c,
      outstandingBalance: Number(c.outstandingBalance.toFixed(2)),
    })),
    suppliers: Object.values(supplierPayables).map((s) => ({
      ...s,
      outstandingBalance: Number(s.outstandingBalance.toFixed(2)),
    })),
  };
}
