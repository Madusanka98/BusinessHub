import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  Prisma,
  PurchaseStatus,
  StockMovementType,
  TransactionType,
  PaymentStatus,
  PaymentMethod,
  ApprovalStatus,
} from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { recordStockMovement } from "./stock.service";
import {
  CreatePurchaseInput,
  CreateSupplierReturnInput,
  CreatePurchaseSchema,
} from "../schemas/commerce.schema";

/**
 * Finds or creates an expense category for inventory purchases.
 */
async function getOrCreatePurchaseExpenseCategory(
  businessId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const existing = await tx.transactionCategory.findFirst({
    where: {
      businessId,
      name: "Inventory Purchases",
      type: TransactionType.EXPENSE,
    },
  });

  if (existing) return existing.id;

  // Check if any expense category exists or create "Inventory Purchases"
  const created = await tx.transactionCategory.create({
    data: {
      businessId,
      name: "Inventory Purchases",
      type: TransactionType.EXPENSE,
    },
  });

  return created.id;
}

/**
 * Generates an incremented purchase document number (e.g., PO-0001, PO-0002).
 */
async function generatePurchaseNumber(
  businessId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const count = await tx.purchase.count({ where: { businessId } });
  const padded = String(count + 1).padStart(4, "0");
  return `PO-${padded}`;
}

/**
 * Creates a DRAFT purchase order.
 * A draft DOES NOT affect product stock or finance ledgers.
 */
export async function createPurchaseDraft(
  businessId: string,
  rawInput: CreatePurchaseInput,
  userId?: string
) {
  const input = CreatePurchaseSchema.parse(rawInput);
  // Validate supplier belongs to this business
  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, businessId },
  });

  if (!supplier) {
    throw new Error("Supplier not found or unauthorized.");
  }

  return await prisma.$transaction(async (tx) => {
    // Validate each product belongs to this business
    let subtotalNum = 0;
    const validatedItems: {
      productId: string;
      quantity: number;
      unitCost: number;
      subtotal: number;
    }[] = [];

    for (const item of input.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, businessId },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} does not belong to this business.`);
      }

      const itemQty = item.quantity;
      const itemCost = item.unitCost;
      const itemSubtotal = Number((itemQty * itemCost).toFixed(2));
      subtotalNum += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        quantity: itemQty,
        unitCost: itemCost,
        subtotal: itemSubtotal,
      });
    }

    const discountNum = input.discountAmount ?? 0;
    const taxNum = input.taxAmount ?? 0;
    const totalNum = Number((subtotalNum - discountNum + taxNum).toFixed(2));

    const purchaseNumber = await generatePurchaseNumber(businessId, tx);

    const purchase = await tx.purchase.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        purchaseNumber,
        status: PurchaseStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
        subtotal: new Prisma.Decimal(subtotalNum.toFixed(2)),
        discountAmount: new Prisma.Decimal(discountNum.toFixed(2)),
        taxAmount: new Prisma.Decimal(taxNum.toFixed(2)),
        totalAmount: new Prisma.Decimal(totalNum.toFixed(2)),
        notes: input.notes?.trim() || null,
        createdById: userId ?? null,
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity.toFixed(3)),
            unitCost: new Prisma.Decimal(item.unitCost.toFixed(2)),
            subtotal: new Prisma.Decimal(item.subtotal.toFixed(2)),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "PURCHASE_DRAFT_CREATED",
        targetEntity: "Purchase",
        targetId: purchase.id,
        changeDetails: {
          purchaseNumber: purchase.purchaseNumber,
          totalAmount: purchase.totalAmount.toString(),
          itemCount: validatedItems.length,
        },
      },
      tx
    );

    return purchase;
  });
}

/**
 * Posts an approved purchase order:
 * 1. Validates status is DRAFT.
 * 2. Marks status as POSTED.
 * 3. Records atomic StockMovement (PURCHASE_RECEIPT) for each line item, increasing stock.
 * 4. Recalculates Product.unitCost using Weighted Average Cost (WAC).
 * 5. Creates linked FinancialTransaction (EXPENSE) in Task 5 Finance module.
 * 6. Everything commits in a single ACID transaction boundary.
 */
export async function postPurchase(
  businessId: string,
  purchaseId: string,
  paymentMethod: PaymentMethod = PaymentMethod.CASH,
  userId?: string
) {
  return await prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, businessId },
        include: {
          items: {
            include: { product: true },
          },
          supplier: true,
        },
      });

      if (!purchase) {
        throw new Error("Purchase order not found or unauthorized.");
      }

      if (purchase.status !== PurchaseStatus.DRAFT) {
        throw new Error(`Cannot post a purchase with status "${purchase.status}". Only DRAFT purchases can be posted.`);
      }

      // 1. Process stock receipts and update moving weighted average costs
      for (const item of purchase.items) {
        const receivedQty = Number(item.quantity);
        const receivedCost = Number(item.unitCost);
        const currentStock = Number(item.product.currentStock);
        const currentCost = Number(item.product.unitCost);

        // Record stock movement (increases stock)
        await recordStockMovement(
          {
            businessId,
            productId: item.productId,
            type: StockMovementType.PURCHASE_RECEIPT,
            quantity: receivedQty,
            referenceId: purchase.id,
            notes: `Stock receipt from ${purchase.purchaseNumber} (Supplier: ${purchase.supplier.name})`,
            createdById: userId ?? null,
          },
          tx
        );

        // Weighted Average Cost calculation:
        // If currentStock <= 0, new cost is received cost
        // Otherwise: ((currentStock * currentCost) + (receivedQty * receivedCost)) / (currentStock + receivedQty)
        let updatedWeightedCost = receivedCost;
        if (currentStock > 0) {
          const totalInventoryValue = (currentStock * currentCost) + (receivedQty * receivedCost);
          const totalUnits = currentStock + receivedQty;
          if (totalUnits > 0) {
            updatedWeightedCost = Number((totalInventoryValue / totalUnits).toFixed(2));
          }
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            unitCost: new Prisma.Decimal(updatedWeightedCost.toFixed(2)),
          },
        });
      }

      // 2. Post Task 5 Finance Transaction (EXPENSE)
      const expenseCategoryId = await getOrCreatePurchaseExpenseCategory(businessId, tx);
      const totalAmountNum = Number(purchase.totalAmount);

      const financialTx = await tx.financialTransaction.create({
        data: {
          businessId,
          categoryId: expenseCategoryId,
          purchaseId: purchase.id,
          type: TransactionType.EXPENSE,
          amount: purchase.totalAmount,
          paymentMethod,
          description: `Inventory Purchase: ${purchase.purchaseNumber} - ${purchase.supplier.name}`,
          approvalStatus: ApprovalStatus.ACTIVE,
          transactionDate: purchase.purchaseDate,
          createdById: userId || (await tx.user.findFirstOrThrow({ where: { isActive: true } })).id,
        },
      });

      // 3. Mark Purchase as POSTED & PAID/CONFIRMED
      const postedPurchase = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          status: PurchaseStatus.POSTED,
          paymentStatus: PaymentStatus.PAID,
          postedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
          transactions: true,
        },
      });

      await recordAuditEvent(
        {
          businessId,
          userId: userId ?? null,
          actionType: "PURCHASE_POSTED",
          targetEntity: "Purchase",
          targetId: purchase.id,
          changeDetails: {
            purchaseNumber: purchase.purchaseNumber,
            totalAmount: totalAmountNum,
            financialTransactionId: financialTx.id,
          },
        },
        tx
      );

      return postedPurchase;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    }
  );
}

/**
 * Cancels a DRAFT purchase order.
 * Cancelled draft leaves zero stock or financial side effects.
 */
export async function cancelPurchaseDraft(
  businessId: string,
  purchaseId: string,
  userId?: string
) {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, businessId },
  });

  if (!purchase) {
    throw new Error("Purchase order not found or unauthorized.");
  }

  if (purchase.status !== PurchaseStatus.DRAFT) {
    throw new Error(`Cannot cancel a purchase in status "${purchase.status}". Only DRAFT purchases can be cancelled.`);
  }

  return await prisma.$transaction(async (tx) => {
    const cancelled = await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: PurchaseStatus.CANCELLED },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "PURCHASE_CANCELLED",
        targetEntity: "Purchase",
        targetId: purchaseId,
        changeDetails: { purchaseNumber: purchase.purchaseNumber },
      },
      tx
    );

    return cancelled;
  });
}

/**
 * Records a supplier return against a posted purchase:
 * - Decreases stock atomically (SUPPLIER_RETURN).
 * - Validates sufficient stock available to return.
 * - Records corresponding return in audit history.
 */
export async function recordSupplierReturn(
  businessId: string,
  input: CreateSupplierReturnInput,
  userId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id: input.purchaseId, businessId },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!purchase) {
      throw new Error("Purchase order not found or unauthorized.");
    }

    if (purchase.status !== PurchaseStatus.POSTED) {
      throw new Error("Returns can only be executed against POSTED purchases.");
    }

    for (const item of input.items) {
      // Validate that product was in the original purchase
      const originalItem = purchase.items.find((i) => i.productId === item.productId);
      if (!originalItem) {
        throw new Error(`Product ${item.productId} was not part of purchase ${purchase.purchaseNumber}.`);
      }

      // Record negative stock movement (returns goods to supplier)
      await recordStockMovement(
        {
          businessId,
          productId: item.productId,
          type: StockMovementType.SUPPLIER_RETURN,
          quantity: -Math.abs(item.quantity),
          referenceId: purchase.id,
          notes: `Supplier return for ${purchase.purchaseNumber}: ${input.reason}`,
          createdById: userId ?? null,
        },
        tx
      );
    }

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "SUPPLIER_RETURN_RECORDED",
        targetEntity: "Purchase",
        targetId: purchase.id,
        changeDetails: {
          purchaseNumber: purchase.purchaseNumber,
          reason: input.reason,
          itemCount: input.items.length,
        },
      },
      tx
    );

    return { success: true, purchaseId: purchase.id };
  });
}

/**
 * Retrieves paginated purchases.
 */
export async function getPurchases(
  businessId: string,
  options?: {
    supplierId?: string;
    status?: PurchaseStatus;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(options?.page ?? 1, 1);
  const limit = Math.max(options?.limit ?? 50, 1);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.PurchaseWhereInput = {
    businessId,
    ...(options?.supplierId ? { supplierId: options.supplierId } : {}),
    ...(options?.status ? { status: options.status } : {}),
  };

  const [purchases, totalCount] = await Promise.all([
    prisma.purchase.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true },
            },
          },
        },
      },
      orderBy: { purchaseDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchase.count({ where: whereClause }),
  ]);

  return {
    purchases,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Retrieves single purchase order details.
 */
export async function getPurchaseById(businessId: string, purchaseId: string) {
  return await prisma.purchase.findFirst({
    where: { id: purchaseId, businessId },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
      transactions: {
        include: { category: true },
      },
    },
  });
}
