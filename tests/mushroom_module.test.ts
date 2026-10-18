import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createMushroomStrain,
  getMushroomStrains,
  createSubstrateRecipe,
  getSubstrateRecipes,
  createFruitingChamber,
  getFruitingChambers,
} from "@/modules/mushroom/services/strain.service";
import {
  createProductionBatch,
  getProductionBatches,
  getProductionBatchById,
  advanceBatchPhase,
  cancelBatch,
} from "@/modules/mushroom/services/batch.service";
import {
  recordContamination,
  getContaminationLogs,
} from "@/modules/mushroom/services/contamination.service";
import {
  recordHarvest,
  getHarvestLogs,
} from "@/modules/mushroom/services/harvest.service";
import {
  executeDryingRun,
  getDryingRuns,
} from "@/modules/mushroom/services/drying.service";
import { getProductionMetrics } from "@/modules/mushroom/services/production-metrics.service";
import { createProduct } from "@/modules/commerce/services/product.service";
import { InsufficientStockError } from "@/modules/commerce/services/stock.service";
import { createBusinessBySuperAdmin } from "@/modules/core-tenancy/services/business.service";
import { hashPassword } from "@/lib/auth/password";
import {
  BatchPhase,
  BatchStatus,
  ContaminationReason,
  ProductCategory,
  UnitOfMeasure,
  StockMovementType,
} from "@prisma/client";

describe("Task 7: Mushroom Farming Production Module", () => {
  const timestamp = Date.now();
  let superAdminId: string;
  let ownerUserId: string;
  let businessAId: string;
  let businessBId: string;

  let strainAId: string;
  let recipeAId: string;
  let chamberAId: string;

  let freshProductAId: string;
  let driedProductAId: string;

  beforeAll(async () => {
    const pwd = await hashPassword("ValidPass@123!");

    // Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: `mushroom_admin_${timestamp}@hub.test`,
        passwordHash: pwd,
        fullName: "Mushroom Admin",
        isSuperAdmin: true,
      },
    });
    superAdminId = superAdmin.id;

    // Business Owner
    const ownerEmail = `mushroom_owner_${timestamp}@hub.test`;
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash: pwd,
        fullName: "Mushroom Grower",
      },
    });
    ownerUserId = owner.id;

    // Tenant Business A
    const bA = await createBusinessBySuperAdmin(
      {
        name: `AgriFarm Alpha ${timestamp}`,
        slug: `agrifarm-alpha-${timestamp}`,
        initialOwnerEmail: ownerEmail,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessAId = bA.businessId;

    // Tenant Business B (for cross-tenant security isolation checks)
    const bB = await createBusinessBySuperAdmin(
      {
        name: `AgriFarm Beta ${timestamp}`,
        slug: `agrifarm-beta-${timestamp}`,
        initialOwnerEmail: ownerEmail,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessBId = bB.businessId;

    // Create Fresh Mushroom Product for Business A
    const freshProduct = await createProduct(
      businessAId,
      {
        sku: `FSH-OYST-${timestamp}`,
        name: "Fresh Oyster Mushrooms (Grade A/B)",
        category: ProductCategory.FRESH_MUSHROOM,
        unitOfMeasure: UnitOfMeasure.KG,
        sellingPrice: 850.0,
        unitCost: 350.0,
      },
      ownerUserId
    );
    freshProductAId = freshProduct.id;

    // Create Dried Mushroom Product for Business A
    const driedProduct = await createProduct(
      businessAId,
      {
        sku: `DRY-OYST-${timestamp}`,
        name: "Dehydrated Premium Oyster Mushrooms",
        category: ProductCategory.DRIED_MUSHROOM,
        unitOfMeasure: UnitOfMeasure.KG,
        sellingPrice: 7500.0,
        unitCost: 3500.0,
      },
      ownerUserId
    );
    driedProductAId = driedProduct.id;
  });

  afterAll(async () => {
    // Cascade cleanups
    const bIds = [businessAId, businessBId].filter(Boolean);
    if (bIds.length > 0) {
      await prisma.dryingRun.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.harvestLog.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.contaminationLog.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.phaseLog.deleteMany({ where: { batch: { businessId: { in: bIds } } } });
      await prisma.productionBatch.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.fruitingChamber.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.recipeIngredient.deleteMany({ where: { recipe: { businessId: { in: bIds } } } });
      await prisma.substrateRecipe.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.mushroomStrain.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.stockMovement.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.product.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.auditEvent.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.businessMembership.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.businessSettings.deleteMany({ where: { businessId: { in: bIds } } });
      await prisma.business.deleteMany({ where: { id: { in: bIds } } });
    }
    const uIds = [superAdminId, ownerUserId].filter(Boolean);
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
  });

  // ==========================================
  // 1. STRAIN, RECIPE & CHAMBER MANAGEMENT
  // ==========================================
  describe("1. Mushroom Strains, Recipes & Chambers", () => {
    it("creates a mushroom strain scoped to tenant business", async () => {
      const strain = await createMushroomStrain(
        businessAId,
        {
          name: "American Pearl Oyster",
          scientificName: "Pleurotus ostreatus",
          optimalTempRange: "20-25 C",
          optimalHumidity: "85-95%",
          incubationDays: 21,
          fruitingDays: 7,
        },
        ownerUserId
      );

      expect(strain.id).toBeDefined();
      expect(strain.businessId).toBe(businessAId);
      expect(strain.name).toBe("American Pearl Oyster");
      strainAId = strain.id;
    });

    it("rejects duplicate strain names in the same business", async () => {
      await expect(
        createMushroomStrain(
          businessAId,
          {
            name: "American Pearl Oyster",
            incubationDays: 20,
            fruitingDays: 6,
          },
          ownerUserId
        )
      ).rejects.toThrow(/already exists/i);
    });

    it("creates a substrate recipe linked to the strain", async () => {
      const recipe = await createSubstrateRecipe(
        businessAId,
        {
          strainId: strainAId,
          name: "Standard Hardwood Sawdust Mix 1kg",
          standardBagWeightKg: 1.0,
          instructions: "Sawdust 80%, Rice Bran 18%, Gypsum 2%, 65% moisture content",
        },
        ownerUserId
      );

      expect(recipe.id).toBeDefined();
      expect(recipe.businessId).toBe(businessAId);
      expect(Number(recipe.standardBagWeightKg)).toBe(1.0);
      recipeAId = recipe.id;
    });

    it("creates a fruiting chamber", async () => {
      const chamber = await createFruitingChamber(
        businessAId,
        {
          name: "Chamber Alpha 01",
          capacityBags: 1200,
        },
        ownerUserId
      );

      expect(chamber.id).toBeDefined();
      expect(chamber.businessId).toBe(businessAId);
      expect(chamber.capacityBags).toBe(1200);
      chamberAId = chamber.id;
    });
  });

  // ==========================================
  // 2. PRODUCTION BATCH LIFECYCLE
  // ==========================================
  describe("2. Production Batches Lifecycle & Controlled Bag Groups", () => {
    let batchId: string;

    it("creates a production batch with controlled bag counts", async () => {
      const batch = await createProductionBatch(
        businessAId,
        {
          strainId: strainAId,
          recipeId: recipeAId,
          chamberId: chamberAId,
          initialBagsCount: 500,
          expectedYieldKg: 125.0,
          allocatedCost: 25000.0,
          notes: "Lot #1 American Pearl Oyster commercial batch",
        },
        ownerUserId
      );

      expect(batch.id).toBeDefined();
      expect(batch.businessId).toBe(businessAId);
      expect(batch.initialBagsCount).toBe(500);
      expect(batch.viableBagsCount).toBe(500);
      expect(batch.currentPhase).toBe(BatchPhase.PREPARATION);
      expect(batch.status).toBe(BatchStatus.ACTIVE);
      expect(batch.batchCode).toMatch(/^MB-AME-\d{8}-\d{3}$/);
      expect(Number(batch.expectedYieldKg)).toBe(125.0);
      batchId = batch.id;
    });

    it("atomically consumes substrate raw materials when recipe defines ingredients", async () => {
      // 1. Create a raw material product (e.g. Sawdust) with initial stock = 100 kg
      const sawdustProduct = await createProduct(
        businessAId,
        {
          name: `Hardwood Sawdust-${timestamp}`,
          sku: `RAW-SD-${timestamp}`,
          category: ProductCategory.RAW_MATERIAL,
          unitOfMeasure: UnitOfMeasure.KG,
          unitCost: 15.0,
          sellingPrice: 0,
          initialStock: 100.0,
        },
        ownerUserId
      );

      // 2. Create recipe with sawdust as ingredient (0.8 kg per bag)
      const mixRecipe = await createSubstrateRecipe(
        businessAId,
        {
          strainId: strainAId,
          name: `Sawdust Mix With Ingredient-${timestamp}`,
          standardBagWeightKg: 1.0,
          ingredients: [
            {
              rawMaterialProductId: sawdustProduct.id,
              percentage: 80,
              quantityPerBag: 0.8,
            },
          ],
        },
        ownerUserId
      );

      // 3. Initializing a batch of 50 bags requires 50 * 0.8 = 40 kg sawdust
      const batchWithIng = await createProductionBatch(
        businessAId,
        {
          strainId: strainAId,
          recipeId: mixRecipe.id,
          chamberId: chamberAId,
          initialBagsCount: 50,
          expectedYieldKg: 15.0,
          allocatedCost: 0,
        },
        ownerUserId
      );

      expect(batchWithIng.id).toBeDefined();

      // Check stock was deducted: 100 - 40 = 60 kg
      const updatedSawdust = await prisma.product.findUniqueOrThrow({
        where: { id: sawdustProduct.id },
      });
      expect(Number(updatedSawdust.currentStock)).toBe(60);

      // Verify stock movement ledger entry
      const movement = await prisma.stockMovement.findFirst({
        where: {
          productId: sawdustProduct.id,
          referenceId: batchWithIng.id,
          type: StockMovementType.PRODUCTION_CONSUMPTION,
        },
      });
      expect(movement).toBeTruthy();
      expect(Number(movement?.quantity)).toBe(-40);

      // 4. Attempting to initialize another batch requiring 100 bags (80 kg) when only 60 kg available must fail
      await expect(
        createProductionBatch(
          businessAId,
          {
            strainId: strainAId,
            recipeId: mixRecipe.id,
            chamberId: chamberAId,
            initialBagsCount: 100,
            expectedYieldKg: 30.0,
            allocatedCost: 0,
          },
          ownerUserId
        )
      ).rejects.toThrow(InsufficientStockError);

      // Verify stock remains untouched at 60 kg
      const untouchedSawdust = await prisma.product.findUniqueOrThrow({
        where: { id: sawdustProduct.id },
      });
      expect(Number(untouchedSawdust.currentStock)).toBe(60);
    });

    it("advances through legitimate biological phases sequentially", async () => {
      // PREPARATION -> STERILIZATION
      const afterSterilization = await advanceBatchPhase(
        businessAId,
        {
          batchId,
          targetPhase: BatchPhase.STERILIZATION,
          notes: "Autoclaved at 121°C for 2.5 hours",
        },
        ownerUserId
      );
      expect(afterSterilization.currentPhase).toBe(BatchPhase.STERILIZATION);

      // STERILIZATION -> INOCULATION
      const afterInoculation = await advanceBatchPhase(
        businessAId,
        {
          batchId,
          targetPhase: BatchPhase.INOCULATION,
          notes: "Grain spawn transferred under laminar flow hood",
        },
        ownerUserId
      );
      expect(afterInoculation.currentPhase).toBe(BatchPhase.INOCULATION);

      // INOCULATION -> INCUBATION
      const afterIncubation = await advanceBatchPhase(
        businessAId,
        {
          batchId,
          targetPhase: BatchPhase.INCUBATION,
          temperature: 24.0,
          humidity: 70.0,
          notes: "Transferred to dark incubation room",
        },
        ownerUserId
      );
      expect(afterIncubation.currentPhase).toBe(BatchPhase.INCUBATION);
    });

    it("strictly rejects skipping biological phases or going backwards", async () => {
      // Cannot skip from INCUBATION directly to COMPLETED
      await expect(
        advanceBatchPhase(
          businessAId,
          {
            batchId,
            targetPhase: BatchPhase.COMPLETED,
          },
          ownerUserId
        )
      ).rejects.toThrow(/invalid phase transition/i);

      // Cannot regress backwards to PREPARATION
      await expect(
        advanceBatchPhase(
          businessAId,
          {
            batchId,
            targetPhase: BatchPhase.PREPARATION,
          },
          ownerUserId
        )
      ).rejects.toThrow(/invalid phase transition/i);
    });

    it("advances from INCUBATION to FRUITING", async () => {
      const afterFruiting = await advanceBatchPhase(
        businessAId,
        {
          batchId,
          targetPhase: BatchPhase.FRUITING,
          chamberId: chamberAId,
          temperature: 22.0,
          humidity: 92.0,
          co2Ppm: 750,
          notes: "Pins forming, misting and fresh air exchange initiated",
        },
        ownerUserId
      );
      expect(afterFruiting.currentPhase).toBe(BatchPhase.FRUITING);
      expect(afterFruiting.chamberId).toBe(chamberAId);
    });
  });

  // ==========================================
  // 3. CONTAMINATION & BAG LOSS TRACKING
  // ==========================================
  describe("3. Contamination & Bag Loss Deductions", () => {
    let testBatchId: string;

    beforeAll(async () => {
      const batch = await createProductionBatch(
        businessAId,
        {
          strainId: strainAId,
          recipeId: recipeAId,
          initialBagsCount: 100,
        },
        ownerUserId
      );
      testBatchId = batch.id;
    });

    it("records contamination and atomically decrements viable bags count", async () => {
      const result = await recordContamination(
        businessAId,
        {
          batchId: testBatchId,
          phaseDetected: BatchPhase.INCUBATION,
          discardedBagsCount: 5,
          reason: ContaminationReason.GREEN_MOLD_TRICHODERMA,
          notes: "Trichoderma green mold spotted on bag corners",
        },
        ownerUserId
      );

      expect(result.contamination.id).toBeDefined();
      expect(result.contamination.discardedBagsCount).toBe(5);
      expect(result.updatedBatch.viableBagsCount).toBe(95);

      // Verify batch query reflects updated viable bags
      const updated = await getProductionBatchById(businessAId, testBatchId);
      expect(updated?.viableBagsCount).toBe(95);
    });

    it("rejects discarding more bags than current viable bags count", async () => {
      await expect(
        recordContamination(
          businessAId,
          {
            batchId: testBatchId,
            phaseDetected: BatchPhase.INCUBATION,
            discardedBagsCount: 96, // Only 95 remain
            reason: ContaminationReason.BACTERIAL_BLOTCH,
          },
          ownerUserId
        )
      ).rejects.toThrow(/only 95 viable bags remain/i);
    });

    it("auto-terminates batch when viable bags reach zero", async () => {
      const result = await recordContamination(
        businessAId,
        {
          batchId: testBatchId,
          phaseDetected: BatchPhase.INCUBATION,
          discardedBagsCount: 95,
          reason: ContaminationReason.STERILIZATION_FAILURE,
          notes: "Total loss due to autoclave pressure valve failure",
        },
        ownerUserId
      );

      expect(result.updatedBatch.viableBagsCount).toBe(0);
      expect(result.updatedBatch.status).toBe(BatchStatus.TERMINATED_CONTAMINATED);
      expect(result.updatedBatch.currentPhase).toBe(BatchPhase.TERMINATED);
    });
  });

  // ==========================================
  // 4. HARVEST MANAGEMENT & FRESH INVENTORY INTEGRATION
  // ==========================================
  describe("4. Multi-Flush Harvests & Atomic Fresh Inventory Posting", () => {
    let fruitingBatchId: string;

    beforeAll(async () => {
      const batch = await createProductionBatch(
        businessAId,
        {
          strainId: strainAId,
          recipeId: recipeAId,
          chamberId: chamberAId,
          initialBagsCount: 300,
        },
        ownerUserId
      );
      fruitingBatchId = batch.id;

      // Advance through to FRUITING
      await advanceBatchPhase(businessAId, { batchId: batch.id, targetPhase: BatchPhase.STERILIZATION }, ownerUserId);
      await advanceBatchPhase(businessAId, { batchId: batch.id, targetPhase: BatchPhase.INOCULATION }, ownerUserId);
      await advanceBatchPhase(businessAId, { batchId: batch.id, targetPhase: BatchPhase.INCUBATION }, ownerUserId);
      await advanceBatchPhase(businessAId, { batchId: batch.id, targetPhase: BatchPhase.FRUITING }, ownerUserId);
    });

    it("rejects harvest if batch is not in FRUITING phase", async () => {
      // Create a batch in PREPARATION
      const prepBatch = await createProductionBatch(
        businessAId,
        {
          strainId: strainAId,
          recipeId: recipeAId,
          initialBagsCount: 50,
        },
        ownerUserId
      );

      await expect(
        recordHarvest(
          businessAId,
          {
            batchId: prepBatch.id,
            freshProductId: freshProductAId,
            flushNumber: 1,
            totalFreshWeightKg: 10.0,
            gradeAWeightKg: 10.0,
          },
          ownerUserId
        )
      ).rejects.toThrow(/must be in the FRUITING phase/i);
    });

    it("records Flush 1 harvest and atomically credits fresh inventory", async () => {
      const initialProduct = await prisma.product.findUniqueOrThrow({
        where: { id: freshProductAId },
      });
      const initialStock = Number(initialProduct.currentStock);

      const result = await recordHarvest(
        businessAId,
        {
          batchId: fruitingBatchId,
          freshProductId: freshProductAId,
          flushNumber: 1,
          totalFreshWeightKg: 45.5,
          gradeAWeightKg: 35.0,
          gradeBWeightKg: 9.0,
          scrapWeightKg: 1.5,
          notes: "First flush morning pick, pristine caps",
        },
        ownerUserId
      );

      expect(result.harvest.id).toBeDefined();
      expect(result.harvest.harvestCode).toMatch(/^HLV-/);
      expect(Number(result.harvest.totalFreshWeightKg)).toBe(45.5);
      expect(Number(result.harvest.gradeAWeightKg)).toBe(35.0);
      expect(Number(result.harvest.gradeBWeightKg)).toBe(9.0);
      expect(Number(result.harvest.scrapWeightKg)).toBe(1.5);

      // Verify Task 6 stock movement and updated inventory balance
      // Saleable fresh weight = 35.0 (Grade A) + 9.0 (Grade B) = 44.0 kg
      const updatedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: freshProductAId },
      });
      expect(Number(updatedProduct.currentStock)).toBe(initialStock + 44.0);

      const stockMovement = await prisma.stockMovement.findFirst({
        where: { referenceId: result.harvest.id },
      });
      expect(stockMovement).toBeDefined();
      expect(stockMovement?.type).toBe("PRODUCTION_YIELD");
      expect(Number(stockMovement?.quantity)).toBe(44.0);
    });

    it("records Flush 2 harvest from the same batch", async () => {
      const initialProduct = await prisma.product.findUniqueOrThrow({
        where: { id: freshProductAId },
      });
      const initialStock = Number(initialProduct.currentStock);

      const result = await recordHarvest(
        businessAId,
        {
          batchId: fruitingBatchId,
          freshProductId: freshProductAId,
          flushNumber: 2,
          totalFreshWeightKg: 28.0,
          gradeAWeightKg: 20.0,
          gradeBWeightKg: 7.0,
          scrapWeightKg: 1.0,
          notes: "Second flush, slightly smaller cap sizes",
        },
        ownerUserId
      );

      expect(result.harvest.flushNumber).toBe(2);
      const updatedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: freshProductAId },
      });
      // Saleable = 20.0 + 7.0 = 27.0 kg
      expect(Number(updatedProduct.currentStock)).toBe(initialStock + 27.0);
    });

    it("rejects harvest where sum of parts exceeds total weight", async () => {
      await expect(
        recordHarvest(
          businessAId,
          {
            batchId: fruitingBatchId,
            freshProductId: freshProductAId,
            flushNumber: 3,
            totalFreshWeightKg: 10.0,
            gradeAWeightKg: 8.0,
            gradeBWeightKg: 4.0, // 8 + 4 = 12 > 10
            scrapWeightKg: 0.0,
          },
          ownerUserId
        )
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // 5. DRYING CONVERSION & DRIED INVENTORY
  // ==========================================
  describe("5. Drying & Dehydration Atomic Stock Conversion", () => {
    it("executes an atomic drying run: deducts fresh stock, credits dried stock, and calculates yield %", async () => {
      const freshBefore = await prisma.product.findUniqueOrThrow({ where: { id: freshProductAId } });
      const driedBefore = await prisma.product.findUniqueOrThrow({ where: { id: driedProductAId } });

      const freshStockBefore = Number(freshBefore.currentStock);
      const driedStockBefore = Number(driedBefore.currentStock);

      expect(freshStockBefore).toBeGreaterThanOrEqual(20.0);

      const result = await executeDryingRun(
        businessAId,
        {
          freshProductId: freshProductAId,
          driedProductId: driedProductAId,
          freshWeightInKg: 20.0,
          driedWeightOutKg: 2.1, // 10.5% yield
          lossWeightKg: 0.2, // 200g crumbling/loss
          lossReason: "Dehydrator tray crumb loss",
          notes: "Commercial dehydrator at 55°C for 12 hours",
        },
        ownerUserId
      );

      expect(result.dryingRun.id).toBeDefined();
      expect(result.dryingRun.runCode).toMatch(/^DRY-/);
      expect(Number(result.dryingRun.freshWeightInKg)).toBe(20.0);
      expect(Number(result.dryingRun.driedWeightOutKg)).toBe(2.1);
      // Yield ratio = (2.1 / 20.0) * 100 = 10.50%
      expect(Number(result.dryingRun.dryingYieldRatio)).toBe(10.5);
      // Moisture loss = 100 - 10.5 = 89.50%
      expect(Number(result.dryingRun.moistureLossPercentage)).toBe(89.5);

      // Verify fresh stock deducted
      const freshAfter = await prisma.product.findUniqueOrThrow({ where: { id: freshProductAId } });
      expect(Number(freshAfter.currentStock)).toBe(freshStockBefore - 20.0);

      // Verify dried stock credited
      const driedAfter = await prisma.product.findUniqueOrThrow({ where: { id: driedProductAId } });
      expect(Number(driedAfter.currentStock)).toBe(driedStockBefore + 2.1);

      // Verify stock movements linked by runCode
      const consumptionMvt = await prisma.stockMovement.findFirst({
        where: {
          productId: freshProductAId,
          type: "PRODUCTION_CONSUMPTION",
          referenceId: result.dryingRun.runCode,
        },
      });
      expect(consumptionMvt).toBeDefined();
      expect(Number(consumptionMvt?.quantity)).toBe(-20.0);

      const yieldMvt = await prisma.stockMovement.findFirst({
        where: {
          productId: driedProductAId,
          type: "PRODUCTION_YIELD",
          referenceId: result.dryingRun.runCode,
        },
      });
      expect(yieldMvt).toBeDefined();
      expect(Number(yieldMvt?.quantity)).toBe(2.1);
    });

    it("rejects drying run if requested fresh quantity exceeds available stock", async () => {
      const freshProduct = await prisma.product.findUniqueOrThrow({ where: { id: freshProductAId } });
      const currentStock = Number(freshProduct.currentStock);

      await expect(
        executeDryingRun(
          businessAId,
          {
            freshProductId: freshProductAId,
            driedProductId: driedProductAId,
            freshWeightInKg: currentStock + 500.0, // Insufficient stock
            driedWeightOutKg: 50.0,
          },
          ownerUserId
        )
      ).rejects.toThrow(InsufficientStockError);
    });
  });

  // ==========================================
  // 6. DASHBOARD METRICS & COSTING
  // ==========================================
  describe("6. Production Dashboard Metrics & Costing", () => {
    it("calculates accurate aggregate metrics for the business", async () => {
      const metrics = await getProductionMetrics(businessAId);

      expect(metrics.batches.total).toBeGreaterThanOrEqual(1);
      expect(metrics.batches.totalBagsPrepared).toBeGreaterThan(0);
      expect(metrics.harvest.totalFreshHarvestedKg).toBeGreaterThan(0);
      expect(metrics.harvest.totalSaleableKg).toBeGreaterThan(0);
      expect(metrics.drying.totalRunsCount).toBeGreaterThanOrEqual(1);
      expect(metrics.inventory.freshStockAvailableKg).toBeGreaterThanOrEqual(0);
      expect(metrics.inventory.driedStockAvailableKg).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // 7. TENANT ISOLATION & SECURITY BOUNDARIES
  // ==========================================
  describe("7. Tenant Isolation & Security Boundaries", () => {
    it("prevents Business B from accessing Business A's production batches", async () => {
      const batchesA = await getProductionBatches(businessAId);
      expect(batchesA.length).toBeGreaterThan(0);
      const batchA = batchesA[0];

      // Querying by Business B must return null
      const crossBatch = await getProductionBatchById(businessBId, batchA.id);
      expect(crossBatch).toBeNull();
    });

    it("prevents Business B from recording harvest against Business A's batch", async () => {
      const batchesA = await getProductionBatches(businessAId);
      const batchA = batchesA[0];

      await expect(
        recordHarvest(
          businessBId,
          {
            batchId: batchA.id,
            freshProductId: freshProductAId,
            flushNumber: 1,
            totalFreshWeightKg: 10.0,
            gradeAWeightKg: 10.0,
          },
          ownerUserId
        )
      ).rejects.toThrow(/not found in this business/i);
    });

    it("prevents cross-tenant drying run execution", async () => {
      // Trying to run drying in Business B consuming Business A's product
      await expect(
        executeDryingRun(
          businessBId,
          {
            freshProductId: freshProductAId,
            driedProductId: driedProductAId,
            freshWeightInKg: 5.0,
            driedWeightOutKg: 0.5,
          },
          ownerUserId
        )
      ).rejects.toThrow(/not found in this business/i);
    });
  });
});
