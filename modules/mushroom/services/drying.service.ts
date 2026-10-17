import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, ProductCategory, StockMovementType } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { recordStockMovement } from "@/modules/commerce/services/stock.service";
import { CreateDryingRunInput, CreateDryingRunSchema } from "../schemas/mushroom.schema";

export async function getDryingRuns(businessId: string, batchId?: string) {
  return await prisma.dryingRun.findMany({
    where: {
      businessId,
      ...(batchId ? { batchId } : {}),
    },
    include: {
      freshProduct: true,
      driedProduct: true,
      batch: {
        include: {
          strain: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Executes an atomic drying process converting fresh mushrooms to dried mushrooms.
 * 1. Atomically deducts fresh mushrooms from inventory (PRODUCTION_CONSUMPTION).
 * 2. Atomically adds dried mushrooms to inventory (PRODUCTION_YIELD).
 * 3. Allocates cost from fresh inputs to dried inventory with weighted average valuation.
 * 4. Records DryingRun with yield ratio and moisture loss percentage.
 */
export async function executeDryingRun(
  businessId: string,
  rawInput: CreateDryingRunInput,
  userId: string
) {
  const input = CreateDryingRunSchema.parse(rawInput);

  // 1. Verify fresh product belongs to tenant and is FRESH_MUSHROOM
  const freshProduct = await prisma.product.findFirst({
    where: { id: input.freshProductId, businessId },
  });
  if (!freshProduct) {
    throw new Error("Source fresh mushroom product not found in this business.");
  }
  if (freshProduct.category !== ProductCategory.FRESH_MUSHROOM) {
    throw new Error(
      `Source product category "${freshProduct.category}" is invalid. Drying input must be a FRESH_MUSHROOM product.`
    );
  }

  // 2. Verify dried product belongs to tenant and is DRIED_MUSHROOM
  const driedProduct = await prisma.product.findFirst({
    where: { id: input.driedProductId, businessId },
  });
  if (!driedProduct) {
    throw new Error("Destination dried mushroom product not found in this business.");
  }
  if (driedProduct.category !== ProductCategory.DRIED_MUSHROOM) {
    throw new Error(
      `Destination product category "${driedProduct.category}" is invalid. Drying output must be a DRIED_MUSHROOM product.`
    );
  }

  // 3. Optional batch check
  if (input.batchId) {
    const batch = await prisma.productionBatch.findFirst({
      where: { id: input.batchId, businessId },
    });
    if (!batch) {
      throw new Error("Referenced production batch not found in this business.");
    }
  }

  // 4. Mathematical and Yield calculations
  const freshIn = Number(input.freshWeightInKg.toFixed(3));
  const driedOut = Number(input.driedWeightOutKg.toFixed(3));
  const lossKg = Number((input.lossWeightKg || 0).toFixed(3));

  // Drying yield (%) = (dried output weight / fresh input weight) * 100
  const dryingYieldRatio = Number(((driedOut / freshIn) * 100).toFixed(2));
  const moistureLossPercentage = Number((100 - dryingYieldRatio).toFixed(2));

  // Generate unique run code: DRY-[YYYYMMDD]-[SEQ]
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const todayRunsCount = await prisma.dryingRun.count({
    where: {
      businessId,
      startedAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });
  const runCode = `DRY-${todayStr}-${String(todayRunsCount + 1).padStart(3, "0")}`;

  // Cost allocation calculations
  const freshUnitCost = Number(freshProduct.unitCost);
  const totalFreshCostConsumed = freshIn * freshUnitCost;
  const driedProductionCostPerKg = driedOut > 0 ? totalFreshCostConsumed / driedOut : 0;

  // 5. Execute atomic database transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Deduct fresh mushrooms from inventory (PRODUCTION_CONSUMPTION)
    // recordStockMovement enforces non-negative stock and throws InsufficientStockError if unavailable
    const freshDeduction = await recordStockMovement(
      {
        businessId,
        productId: freshProduct.id,
        type: StockMovementType.PRODUCTION_CONSUMPTION,
        quantity: -freshIn,
        referenceId: runCode,
        notes: `Drying Run ${runCode}: Consumed ${freshIn.toFixed(3)}kg fresh mushrooms.`,
        createdById: userId,
      },
      tx
    );

    // B. Add dried mushrooms to inventory (PRODUCTION_YIELD)
    const driedAddition = await recordStockMovement(
      {
        businessId,
        productId: driedProduct.id,
        type: StockMovementType.PRODUCTION_YIELD,
        quantity: driedOut,
        referenceId: runCode,
        notes: `Drying Run ${runCode}: Produced ${driedOut.toFixed(3)}kg dried mushrooms (Yield: ${dryingYieldRatio}%).`,
        createdById: userId,
      },
      tx
    );

    // C. Update destination dried product unit cost with weighted average
    const currentDriedStock = Number(driedProduct.currentStock);
    const currentDriedCost = Number(driedProduct.unitCost);
    let newWeightedDriedCost = driedProductionCostPerKg;

    if (currentDriedStock > 0 && currentDriedCost > 0) {
      newWeightedDriedCost =
        (currentDriedStock * currentDriedCost + driedOut * driedProductionCostPerKg) /
        (currentDriedStock + driedOut);
    }

    await tx.product.update({
      where: { id: driedProduct.id },
      data: {
        unitCost: new Prisma.Decimal(newWeightedDriedCost.toFixed(2)),
      },
    });

    // D. Create DryingRun record
    const dryingRun = await tx.dryingRun.create({
      data: {
        businessId,
        runCode,
        batchId: input.batchId || null,
        freshProductId: freshProduct.id,
        driedProductId: driedProduct.id,
        freshWeightInKg: new Prisma.Decimal(freshIn.toFixed(3)),
        driedWeightOutKg: new Prisma.Decimal(driedOut.toFixed(3)),
        moistureLossPercentage: new Prisma.Decimal(moistureLossPercentage.toFixed(2)),
        dryingYieldRatio: new Prisma.Decimal(dryingYieldRatio.toFixed(2)),
        lossWeightKg: new Prisma.Decimal(lossKg.toFixed(3)),
        lossReason: input.lossReason?.trim() || null,
        conductedById: userId,
        notes: input.notes?.trim() || null,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
      },
      include: {
        freshProduct: true,
        driedProduct: true,
        batch: { include: { strain: true } },
      },
    });

    return { dryingRun, freshDeduction, driedAddition };
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "DryingRun",
    targetId: result.dryingRun.id,
    changeDetails: {
      runCode,
      freshInKg: freshIn,
      driedOutKg: driedOut,
      dryingYieldRatio,
      moistureLossPercentage,
      allocatedDriedCostPerKg: Number(driedProductionCostPerKg.toFixed(2)),
    },
  });

  return result;
}
