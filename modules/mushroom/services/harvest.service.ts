import "server-only";
import { prisma } from "@/lib/db/prisma";
import { BatchPhase, BatchStatus, Prisma, ProductCategory, StockMovementType } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { recordStockMovement } from "@/modules/commerce/services/stock.service";
import { RecordHarvestInput, RecordHarvestSchema } from "../schemas/mushroom.schema";

export async function getHarvestLogs(businessId: string, batchId?: string) {
  return await prisma.harvestLog.findMany({
    where: {
      businessId,
      ...(batchId ? { batchId } : {}),
    },
    include: {
      batch: {
        include: {
          strain: true,
        },
      },
      product: true,
      harvester: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { harvestDate: "desc" },
  });
}

/**
 * Records a mushroom harvest flush and atomically credits accepted saleable weight
 * to the Fresh Mushroom Inventory using Task 6's recordStockMovement.
 */
export async function recordHarvest(
  businessId: string,
  rawInput: RecordHarvestInput,
  userId: string
) {
  const input = RecordHarvestSchema.parse(rawInput);

  // 1. Validate batch belongs to tenant and is in FRUITING phase
  const batch = await prisma.productionBatch.findFirst({
    where: { id: input.batchId, businessId },
    include: { strain: true },
  });

  if (!batch) {
    throw new Error("Production batch not found in this business.");
  }

  if (batch.status !== BatchStatus.ACTIVE) {
    throw new Error(`Cannot record harvest: batch is currently ${batch.status}.`);
  }

  if (batch.currentPhase !== BatchPhase.FRUITING) {
    throw new Error(
      `Cannot record harvest: batch is in ${batch.currentPhase} phase. Batches must be in the FRUITING phase to yield mushroom flushes.`
    );
  }

  // 2. Validate product belongs to tenant and is FRESH_MUSHROOM
  const freshProduct = await prisma.product.findFirst({
    where: { id: input.freshProductId, businessId },
  });

  if (!freshProduct) {
    throw new Error("Fresh mushroom product not found in this business.");
  }

  if (freshProduct.category !== ProductCategory.FRESH_MUSHROOM) {
    throw new Error(
      `Invalid product category "${freshProduct.category}". Harvest yields can only be credited to FRESH_MUSHROOM products.`
    );
  }

  // 3. Weight calculations
  const totalFreshWeight = Number(input.totalFreshWeightKg.toFixed(3));
  const gradeAWeight = Number(input.gradeAWeightKg.toFixed(3));
  const gradeBWeight = Number(input.gradeBWeightKg.toFixed(3));
  const scrapWeight = Number(input.scrapWeightKg.toFixed(3));
  const saleableFreshWeight = Number((gradeAWeight + gradeBWeight).toFixed(3));

  // Generate unique harvest reference: HLV-[BATCHCODE]-F[FLUSH]-[SEQ]
  const existingFlushHarvests = await prisma.harvestLog.count({
    where: { batchId: batch.id, flushNumber: input.flushNumber },
  });
  const harvestCode = `HLV-${batch.batchCode}-F${input.flushNumber}-${existingFlushHarvests + 1}`;

  // 4. Atomic transaction: create HarvestLog + recordStockMovement (PRODUCTION_YIELD)
  const result = await prisma.$transaction(async (tx) => {
    const harvest = await tx.harvestLog.create({
      data: {
        businessId,
        batchId: batch.id,
        freshProductId: freshProduct.id,
        harvestCode,
        flushNumber: input.flushNumber,
        totalFreshWeightKg: new Prisma.Decimal(totalFreshWeight.toFixed(3)),
        gradeAWeightKg: new Prisma.Decimal(gradeAWeight.toFixed(3)),
        gradeBWeightKg: new Prisma.Decimal(gradeBWeight.toFixed(3)),
        scrapWeightKg: new Prisma.Decimal(scrapWeight.toFixed(3)),
        notes: input.notes?.trim() || null,
        harvestDate: input.harvestDate,
        harvestedById: userId,
      },
      include: {
        product: true,
        batch: { include: { strain: true } },
      },
    });

    // Post saleable harvest into inventory as PRODUCTION_YIELD
    let stockMovementResult = null;
    if (saleableFreshWeight > 0) {
      stockMovementResult = await recordStockMovement(
        {
          businessId,
          productId: freshProduct.id,
          type: StockMovementType.PRODUCTION_YIELD,
          quantity: saleableFreshWeight,
          referenceId: harvest.id,
          notes: `Batch ${batch.batchCode} Harvest Flush ${input.flushNumber} (${gradeAWeight.toFixed(3)}kg Grade A, ${gradeBWeight.toFixed(3)}kg Grade B)`,
          createdById: userId,
        },
        tx
      );
    }

    return { harvest, stockMovementResult };
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "HarvestLog",
    targetId: result.harvest.id,
    changeDetails: {
      harvestCode,
      batchCode: batch.batchCode,
      flushNumber: input.flushNumber,
      totalFreshWeightKg: totalFreshWeight,
      saleableFreshWeight,
      scrapWeightKg: scrapWeight,
      creditedToProductId: freshProduct.id,
    },
  });

  return result;
}
