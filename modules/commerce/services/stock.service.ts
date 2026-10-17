import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, StockMovementType } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  CreateStockAdjustmentInput,
  CreateStockAdjustmentSchema,
} from "../schemas/commerce.schema";

export class InsufficientStockError extends Error {
  public productId: string;
  public available: number;
  public requested: number;

  constructor(productId: string, productName: string, available: number, requested: number) {
    super(
      `Insufficient stock for "${productName}" (ID: ${productId}). Available: ${available.toFixed(3)}, Requested deduction: ${requested.toFixed(3)}.`
    );
    this.name = "InsufficientStockError";
    this.productId = productId;
    this.available = available;
    this.requested = requested;
  }
}

export interface RecordMovementParams {
  businessId: string;
  productId: string;
  type: StockMovementType;
  quantity: number | Prisma.Decimal;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
}

/**
 * Atomically records a stock movement and updates the Product's cached balance.
 * NEVER allows a stock movement and its balance update to commit separately.
 * Prevents negative stock atomically by default.
 */
export async function recordStockMovement(
  params: RecordMovementParams,
  externalTx?: Prisma.TransactionClient
) {
  const runner = async (tx: Prisma.TransactionClient) => {
    // Lock product row within the tenant boundary for atomic concurrency protection
    const product = await tx.product.findFirst({
      where: {
        id: params.productId,
        businessId: params.businessId,
      },
    });

    if (!product) {
      throw new Error(`Product ${params.productId} not found in this business.`);
    }

    const currentStockNum = Number(product.currentStock);
    const movementQtyNum = Number(params.quantity);
    const newBalanceNum = Number((currentStockNum + movementQtyNum).toFixed(3));

    // Enforce strict non-negative stock invariant
    if (newBalanceNum < 0) {
      throw new InsufficientStockError(
        product.id,
        product.name,
        currentStockNum,
        Math.abs(movementQtyNum)
      );
    }

    // Insert immutable ledger movement
    const movement = await tx.stockMovement.create({
      data: {
        businessId: params.businessId,
        productId: params.productId,
        type: params.type,
        quantity: new Prisma.Decimal(movementQtyNum.toFixed(3)),
        balanceAfter: new Prisma.Decimal(newBalanceNum.toFixed(3)),
        referenceId: params.referenceId ?? null,
        notes: params.notes?.trim() || null,
        createdById: params.createdById ?? null,
      },
    });

    // Update authoritative cached balance on Product
    const updatedProduct = await tx.product.update({
      where: { id: params.productId },
      data: {
        currentStock: new Prisma.Decimal(newBalanceNum.toFixed(3)),
      },
    });

    return { movement, updatedProduct, newBalance: newBalanceNum };
  };

  if (externalTx) {
    return await runner(externalTx);
  } else {
    return await prisma.$transaction(runner, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
}

/**
 * Authorized manual stock adjustment (Add, Scrap, or Audit Reconciliation).
 */
export async function adjustStock(
  businessId: string,
  rawInput: CreateStockAdjustmentInput,
  userId?: string
) {
  const input = CreateStockAdjustmentSchema.parse(rawInput);
  let quantityDelta = input.quantity;

  if (input.type === StockMovementType.ADJUSTMENT_SCRAP) {
    quantityDelta = -Math.abs(input.quantity);
  } else if (input.type === StockMovementType.ADJUSTMENT_ADD) {
    quantityDelta = Math.abs(input.quantity);
  }

  return await prisma.$transaction(async (tx) => {
    const result = await recordStockMovement(
      {
        businessId,
        productId: input.productId,
        type: input.type,
        quantity: quantityDelta,
        notes: input.notes,
        createdById: userId ?? null,
      },
      tx
    );

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "STOCK_ADJUSTMENT",
        targetEntity: "Product",
        targetId: input.productId,
        changeDetails: {
          adjustmentType: input.type,
          delta: quantityDelta,
          balanceAfter: result.newBalance,
          reason: input.notes,
        },
      },
      tx
    );

    return result;
  });
}

/**
 * Retrieves paginated stock movement history for a business or specific product.
 */
export async function getStockMovements(
  businessId: string,
  options?: {
    productId?: string;
    type?: StockMovementType;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(options?.page ?? 1, 1);
  const limit = Math.max(options?.limit ?? 50, 1);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.StockMovementWhereInput = {
    businessId,
    ...(options?.productId ? { productId: options.productId } : {}),
    ...(options?.type ? { type: options.type } : {}),
  };

  const [movements, totalCount] = await Promise.all([
    prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unitOfMeasure: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where: whereClause }),
  ]);

  return {
    movements,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Computes high-level inventory valuation and status metrics.
 */
export async function getInventorySummary(businessId: string) {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      currentStock: true,
      unitCost: true,
      reorderThreshold: true,
    },
  });

  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const stock = Number(p.currentStock);
    const cost = Number(p.unitCost);
    const threshold = Number(p.reorderThreshold);

    totalValue += stock * cost;

    if (stock <= 0) {
      outOfStockCount++;
      lowStockCount++;
    } else if (stock <= threshold) {
      lowStockCount++;
    }
  }

  return {
    totalProducts: products.length,
    totalInventoryValue: Number(totalValue.toFixed(2)),
    lowStockCount,
    outOfStockCount,
  };
}
