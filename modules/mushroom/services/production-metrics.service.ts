import "server-only";
import { prisma } from "@/lib/db/prisma";
import { BatchPhase, BatchStatus, ProductCategory } from "@prisma/client";

export async function getProductionMetrics(businessId: string) {
  // 1. Batches statistics
  const batches = await prisma.productionBatch.findMany({
    where: { businessId },
    select: {
      id: true,
      currentPhase: true,
      status: true,
      initialBagsCount: true,
      viableBagsCount: true,
      expectedYieldKg: true,
      allocatedCost: true,
    },
  });

  const batchesByPhase: Record<string, number> = {
    PREPARATION: 0,
    STERILIZATION: 0,
    INOCULATION: 0,
    INCUBATION: 0,
    FRUITING: 0,
    COMPLETED: 0,
    TERMINATED: 0,
  };

  let totalBagsPrepared = 0;
  let totalActiveViableBags = 0;
  let totalExpectedYieldKg = 0;
  let totalAllocatedCost = 0;

  for (const b of batches) {
    batchesByPhase[b.currentPhase] = (batchesByPhase[b.currentPhase] || 0) + 1;
    totalBagsPrepared += b.initialBagsCount;
    if (b.status === BatchStatus.ACTIVE) {
      totalActiveViableBags += b.viableBagsCount;
    }
    totalExpectedYieldKg += Number(b.expectedYieldKg || 0);
    totalAllocatedCost += Number(b.allocatedCost || 0);
  }

  // 2. Contamination / Loss statistics
  const contaminationSummary = await prisma.contaminationLog.aggregate({
    where: { businessId },
    _sum: {
      discardedBagsCount: true,
    },
  });
  const totalDiscardedBags = contaminationSummary._sum.discardedBagsCount || 0;
  const bagLossRate =
    totalBagsPrepared > 0
      ? Number(((totalDiscardedBags / totalBagsPrepared) * 100).toFixed(2))
      : 0;

  // 3. Harvest statistics
  const harvestSummary = await prisma.harvestLog.aggregate({
    where: { businessId },
    _sum: {
      totalFreshWeightKg: true,
      gradeAWeightKg: true,
      gradeBWeightKg: true,
      scrapWeightKg: true,
    },
    _count: {
      id: true,
    },
  });

  const totalFreshHarvestedKg = Number(harvestSummary._sum.totalFreshWeightKg || 0);
  const totalGradeAKg = Number(harvestSummary._sum.gradeAWeightKg || 0);
  const totalGradeBKg = Number(harvestSummary._sum.gradeBWeightKg || 0);
  const totalScrapKg = Number(harvestSummary._sum.scrapWeightKg || 0);
  const totalSaleableKg = Number((totalGradeAKg + totalGradeBKg).toFixed(3));

  const averageYieldPerBag =
    totalBagsPrepared > 0
      ? Number((totalFreshHarvestedKg / totalBagsPrepared).toFixed(3))
      : 0;

  const costPerKg =
    totalSaleableKg > 0
      ? Number((totalAllocatedCost / totalSaleableKg).toFixed(2))
      : 0;

  // 4. Current inventory stock for mushrooms
  const mushroomProducts = await prisma.product.findMany({
    where: {
      businessId,
      category: { in: [ProductCategory.FRESH_MUSHROOM, ProductCategory.DRIED_MUSHROOM] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      currentStock: true,
      unitOfMeasure: true,
      unitCost: true,
      sellingPrice: true,
    },
  });

  let freshStockAvailableKg = 0;
  let driedStockAvailableKg = 0;

  for (const p of mushroomProducts) {
    if (p.category === ProductCategory.FRESH_MUSHROOM) {
      freshStockAvailableKg += Number(p.currentStock);
    } else if (p.category === ProductCategory.DRIED_MUSHROOM) {
      driedStockAvailableKg += Number(p.currentStock);
    }
  }

  // 5. Drying run statistics
  const dryingSummary = await prisma.dryingRun.aggregate({
    where: { businessId },
    _sum: {
      freshWeightInKg: true,
      driedWeightOutKg: true,
      lossWeightKg: true,
    },
    _count: {
      id: true,
    },
  });

  const totalFreshDryingInputKg = Number(dryingSummary._sum.freshWeightInKg || 0);
  const totalDriedDryingOutputKg = Number(dryingSummary._sum.driedWeightOutKg || 0);
  const averageDryingYieldRatio =
    totalFreshDryingInputKg > 0
      ? Number(((totalDriedDryingOutputKg / totalFreshDryingInputKg) * 100).toFixed(2))
      : 0;

  return {
    batches: {
      total: batches.length,
      active: batches.filter((b) => b.status === BatchStatus.ACTIVE).length,
      byPhase: batchesByPhase,
      totalBagsPrepared,
      totalActiveViableBags,
      totalDiscardedBags,
      bagLossRate,
      totalExpectedYieldKg,
      totalAllocatedCost,
    },
    harvest: {
      totalHarvestEvents: harvestSummary._count.id,
      totalFreshHarvestedKg,
      totalGradeAKg,
      totalGradeBKg,
      totalScrapKg,
      totalSaleableKg,
      averageYieldPerBag,
      costPerKg,
    },
    inventory: {
      freshStockAvailableKg: Number(freshStockAvailableKg.toFixed(3)),
      driedStockAvailableKg: Number(driedStockAvailableKg.toFixed(3)),
      products: mushroomProducts,
    },
    drying: {
      totalRunsCount: dryingSummary._count.id,
      totalFreshDryingInputKg,
      totalDriedDryingOutputKg,
      averageDryingYieldRatio,
    },
  };
}
