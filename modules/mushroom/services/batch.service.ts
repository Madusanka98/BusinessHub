import "server-only";
import { prisma } from "@/lib/db/prisma";
import { BatchPhase, BatchStatus, Prisma, StockMovementType } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { recordStockMovement } from "@/modules/commerce/services/stock.service";
import {
  AdvanceBatchPhaseInput,
  AdvanceBatchPhaseSchema,
  CreateProductionBatchInput,
  CreateProductionBatchSchema,
} from "../schemas/mushroom.schema";

// Ordered sequence of legitimate biological production phases
export const PHASE_SEQUENCE: BatchPhase[] = [
  BatchPhase.PREPARATION,
  BatchPhase.STERILIZATION,
  BatchPhase.INOCULATION,
  BatchPhase.INCUBATION,
  BatchPhase.FRUITING,
  BatchPhase.COMPLETED,
];

/**
 * Validates whether transitioning from currentPhase to targetPhase is biologically and operationally valid.
 */
export function isValidPhaseTransition(currentPhase: BatchPhase, targetPhase: BatchPhase): boolean {
  if (currentPhase === BatchPhase.COMPLETED || currentPhase === BatchPhase.TERMINATED) {
    return false; // Terminal states cannot transition
  }

  // Early termination is permissible from any active phase
  if (targetPhase === BatchPhase.TERMINATED) {
    return true;
  }

  const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);
  const targetIndex = PHASE_SEQUENCE.indexOf(targetPhase);

  // Must advance forward to the immediate next phase
  return targetIndex === currentIndex + 1;
}

export async function getProductionBatches(
  businessId: string,
  filters?: {
    phase?: BatchPhase;
    status?: BatchStatus;
    strainId?: string;
  }
) {
  return await prisma.productionBatch.findMany({
    where: {
      businessId,
      ...(filters?.phase ? { currentPhase: filters.phase } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.strainId ? { strainId: filters.strainId } : {}),
    },
    include: {
      strain: true,
      recipe: true,
      chamber: true,
      initiator: {
        select: { id: true, fullName: true, email: true },
      },
      _count: {
        select: {
          phaseLogs: true,
          harvestLogs: true,
          contaminationLogs: true,
          dryingRuns: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductionBatchById(businessId: string, batchId: string) {
  return await prisma.productionBatch.findFirst({
    where: { id: batchId, businessId },
    include: {
      strain: true,
      recipe: {
        include: {
          ingredients: {
            include: {
              rawMaterial: true,
            },
          },
        },
      },
      chamber: true,
      initiator: {
        select: { id: true, fullName: true, email: true },
      },
      phaseLogs: {
        orderBy: { loggedAt: "asc" },
      },
      harvestLogs: {
        include: {
          product: true,
          harvester: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { harvestDate: "desc" },
      },
      contaminationLogs: {
        orderBy: { loggedAt: "desc" },
      },
      dryingRuns: {
        include: {
          freshProduct: true,
          driedProduct: true,
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });
}

/**
 * Creates a new production batch with controlled bag-group management.
 */
export async function createProductionBatch(
  businessId: string,
  rawInput: CreateProductionBatchInput,
  userId: string
) {
  const input = CreateProductionBatchSchema.parse(rawInput);

  // Validate strain belongs to business
  const strain = await prisma.mushroomStrain.findFirst({
    where: { id: input.strainId, businessId },
  });
  if (!strain) {
    throw new Error("Specified mushroom strain does not exist in this business.");
  }

  // Validate recipe belongs to business and matches strain
  const recipe = await prisma.substrateRecipe.findFirst({
    where: { id: input.recipeId, businessId },
    include: { ingredients: { include: { rawMaterial: true } } },
  });
  if (!recipe) {
    throw new Error("Specified substrate recipe does not exist in this business.");
  }

  // Optional chamber check
  if (input.chamberId) {
    const chamber = await prisma.fruitingChamber.findFirst({
      where: { id: input.chamberId, businessId },
    });
    if (!chamber) {
      throw new Error("Specified fruiting chamber does not exist in this business.");
    }
  }

  // Generate unique batch code: MB-[STRAIN_CODE]-[YYYYMMDD]-[SEQ]
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const strainPrefix = strain.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "M");
  
  const todayBatchCount = await prisma.productionBatch.count({
    where: {
      businessId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });
  const seqNumber = String(todayBatchCount + 1).padStart(3, "0");
  const batchCode = `MB-${strainPrefix}-${todayStr}-${seqNumber}`;

  // Calculate material cost estimation if ingredients exist and not manually overridden
  let initialAllocatedCost = input.allocatedCost;
  if (initialAllocatedCost === 0 && recipe.ingredients.length > 0) {
    let bagMaterialCost = 0;
    for (const ing of recipe.ingredients) {
      const unitCost = Number(ing.rawMaterial.unitCost);
      const qtyPerBag = Number(ing.quantityPerBag);
      bagMaterialCost += unitCost * qtyPerBag;
    }
    initialAllocatedCost = Number((bagMaterialCost * input.initialBagsCount).toFixed(2));
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.productionBatch.create({
      data: {
        businessId,
        batchCode,
        strainId: input.strainId,
        recipeId: input.recipeId,
        chamberId: input.chamberId || null,
        initialBagsCount: input.initialBagsCount,
        viableBagsCount: input.initialBagsCount,
        currentPhase: BatchPhase.PREPARATION,
        status: BatchStatus.ACTIVE,
        startDate: input.startDate,
        expectedYieldKg: new Prisma.Decimal(input.expectedYieldKg.toFixed(3)),
        allocatedCost: new Prisma.Decimal(initialAllocatedCost.toFixed(2)),
        notes: input.notes?.trim() || null,
        initiatedById: userId,
      },
      include: {
        strain: true,
        recipe: true,
        chamber: true,
      },
    });

    // Record initial PREPARATION phase log
    await tx.phaseLog.create({
      data: {
        batchId: created.id,
        phase: BatchPhase.PREPARATION,
        notes: `Batch initiated with ${input.initialBagsCount} substrate bags.`,
        loggedById: userId,
      },
    });

    // Atomically consume raw material substrate ingredients from inventory
    for (const ing of recipe.ingredients) {
      const qtyPerBag = Number(ing.quantityPerBag);
      const totalIngredientDeduction = Number((qtyPerBag * input.initialBagsCount).toFixed(3));
      if (totalIngredientDeduction > 0) {
        await recordStockMovement(
          {
            businessId,
            productId: ing.rawMaterialProductId,
            type: StockMovementType.PRODUCTION_CONSUMPTION,
            quantity: -Math.abs(totalIngredientDeduction),
            referenceId: created.id,
            notes: `Substrate consumption for batch ${batchCode} (${input.initialBagsCount} bags @ ${qtyPerBag}/bag)`,
            createdById: userId,
          },
          tx
        );
      }
    }

    return created;
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "ProductionBatch",
    targetId: batch.id,
    changeDetails: {
      batchCode: batch.batchCode,
      initialBagsCount: batch.initialBagsCount,
      currentPhase: batch.currentPhase,
      allocatedCost: Number(batch.allocatedCost),
    },
  });

  return batch;
}

/**
 * Strictly advances the batch through its validated lifecycle.
 */
export async function advanceBatchPhase(
  businessId: string,
  rawInput: AdvanceBatchPhaseInput,
  userId: string
) {
  const input = AdvanceBatchPhaseSchema.parse(rawInput);

  const batch = await prisma.productionBatch.findFirst({
    where: { id: input.batchId, businessId },
  });

  if (!batch) {
    throw new Error("Production batch not found in this business.");
  }

  if (batch.status !== BatchStatus.ACTIVE) {
    throw new Error(`Cannot advance phase: batch is currently ${batch.status}.`);
  }

  if (!isValidPhaseTransition(batch.currentPhase, input.targetPhase)) {
    throw new Error(
      `Invalid phase transition from ${batch.currentPhase} to ${input.targetPhase}. Permitted biological sequence: PREPARATION -> STERILIZATION -> INOCULATION -> INCUBATION -> FRUITING -> COMPLETED.`
    );
  }

  // Validate chamber if entering FRUITING phase
  let assignedChamberId = batch.chamberId;
  if (input.chamberId !== undefined) {
    if (input.chamberId) {
      const chamber = await prisma.fruitingChamber.findFirst({
        where: { id: input.chamberId, businessId },
      });
      if (!chamber) {
        throw new Error("Specified fruiting chamber does not exist in this business.");
      }
      assignedChamberId = input.chamberId;
    } else {
      assignedChamberId = null;
    }
  }

  const isCompleted = input.targetPhase === BatchPhase.COMPLETED;
  const isTerminated = input.targetPhase === BatchPhase.TERMINATED;

  const updatedBatch = await prisma.$transaction(async (tx) => {
    // 1. Create audit phase log
    await tx.phaseLog.create({
      data: {
        batchId: batch.id,
        phase: input.targetPhase,
        temperature: input.temperature !== undefined && input.temperature !== null ? new Prisma.Decimal(input.temperature.toFixed(2)) : null,
        humidity: input.humidity !== undefined && input.humidity !== null ? new Prisma.Decimal(input.humidity.toFixed(2)) : null,
        co2Ppm: input.co2Ppm ?? null,
        notes: input.notes?.trim() || `Advanced from ${batch.currentPhase} to ${input.targetPhase}`,
        loggedById: userId,
      },
    });

    // 2. Update batch phase and status
    const updated = await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        currentPhase: input.targetPhase,
        chamberId: assignedChamberId,
        status: isCompleted
          ? BatchStatus.COMPLETED
          : isTerminated
          ? BatchStatus.TERMINATED_CONTAMINATED
          : BatchStatus.ACTIVE,
        completedDate: isCompleted || isTerminated ? new Date() : batch.completedDate,
      },
      include: {
        strain: true,
        recipe: true,
        chamber: true,
        phaseLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
      },
    });

    return updated;
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "UPDATE",
    targetEntity: "ProductionBatch",
    targetId: updatedBatch.id,
    changeDetails: {
      batchCode: updatedBatch.batchCode,
      fromPhase: batch.currentPhase,
      toPhase: updatedBatch.currentPhase,
      status: updatedBatch.status,
      viableBagsCount: updatedBatch.viableBagsCount,
    },
  });

  return updatedBatch;
}

/**
 * Explicitly cancels an active production batch.
 */
export async function cancelBatch(
  businessId: string,
  batchId: string,
  reason: string,
  userId: string
) {
  const batch = await prisma.productionBatch.findFirst({
    where: { id: batchId, businessId },
  });

  if (!batch) {
    throw new Error("Production batch not found in this business.");
  }

  if (batch.status === BatchStatus.COMPLETED) {
    throw new Error("Cannot cancel a completed batch.");
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    await tx.phaseLog.create({
      data: {
        batchId: batch.id,
        phase: BatchPhase.TERMINATED,
        notes: `Batch cancelled: ${reason.trim()}`,
        loggedById: userId,
      },
    });

    return await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        status: BatchStatus.CANCELLED,
        currentPhase: BatchPhase.TERMINATED,
        completedDate: new Date(),
        notes: batch.notes ? `${batch.notes}\n[Cancelled]: ${reason.trim()}` : `[Cancelled]: ${reason.trim()}`,
      },
    });
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "UPDATE",
    targetEntity: "ProductionBatch",
    targetId: batch.id,
    changeDetails: {
      batchCode: batch.batchCode,
      action: "CANCELLED",
      reason: reason.trim(),
    },
  });

  return cancelled;
}
