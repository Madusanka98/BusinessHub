import "server-only";
import { prisma } from "@/lib/db/prisma";
import { BatchPhase, BatchStatus } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  RecordContaminationInput,
  RecordContaminationSchema,
} from "../schemas/mushroom.schema";

export async function getContaminationLogs(businessId: string, batchId?: string) {
  return await prisma.contaminationLog.findMany({
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
    },
    orderBy: { loggedAt: "desc" },
  });
}

/**
 * Records contamination or discarded bags and atomically updates batch viable count.
 */
export async function recordContamination(
  businessId: string,
  rawInput: RecordContaminationInput,
  userId?: string
) {
  const input = RecordContaminationSchema.parse(rawInput);

  const batch = await prisma.productionBatch.findFirst({
    where: { id: input.batchId, businessId },
  });

  if (!batch) {
    throw new Error("Production batch not found in this business.");
  }

  if (batch.status !== BatchStatus.ACTIVE) {
    throw new Error(`Cannot record contamination on a ${batch.status} batch.`);
  }

  if (input.discardedBagsCount > batch.viableBagsCount) {
    throw new Error(
      `Cannot discard ${input.discardedBagsCount} bags: only ${batch.viableBagsCount} viable bags remain in this batch.`
    );
  }

  const newViableCount = batch.viableBagsCount - input.discardedBagsCount;
  const isTotalBatchLoss = newViableCount === 0;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create contamination log
    const contamination = await tx.contaminationLog.create({
      data: {
        businessId,
        batchId: batch.id,
        phaseDetected: input.phaseDetected,
        discardedBagsCount: input.discardedBagsCount,
        reason: input.reason,
        notes: input.notes?.trim() || null,
      },
    });

    // 2. Atomically update batch viable bags count
    const updatedBatch = await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        viableBagsCount: newViableCount,
        ...(isTotalBatchLoss
          ? {
              status: BatchStatus.TERMINATED_CONTAMINATED,
              currentPhase: BatchPhase.TERMINATED,
              completedDate: new Date(),
            }
          : {}),
      },
      include: {
        strain: true,
      },
    });

    // 3. If batch terminated due to contamination, log termination phase entry
    if (isTotalBatchLoss) {
      await tx.phaseLog.create({
        data: {
          batchId: batch.id,
          phase: BatchPhase.TERMINATED,
          notes: `Batch terminated: 100% loss due to ${input.reason}. Discarded final ${input.discardedBagsCount} bags.`,
          loggedById: userId,
        },
      });
    }

    return { contamination, updatedBatch };
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "ContaminationLog",
    targetId: result.contamination.id,
    changeDetails: {
      batchCode: batch.batchCode,
      discardedBagsCount: input.discardedBagsCount,
      reason: input.reason,
      remainingViableBags: newViableCount,
      isTotalBatchLoss,
    },
  });

  return result;
}
