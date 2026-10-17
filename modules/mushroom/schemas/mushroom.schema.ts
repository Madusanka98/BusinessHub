import { z } from "zod";
import { BatchPhase, BatchStatus, ContaminationReason } from "@prisma/client";

// ==========================================
// MUSHROOM STRAINS & SUBSTRATE RECIPES SCHEMAS
// ==========================================

export const CreateMushroomStrainSchema = z.object({
  name: z.string().min(2, "Strain name must be at least 2 characters").max(100),
  scientificName: z.string().max(100).optional().nullable(),
  optimalTempRange: z.string().max(50).optional().nullable(),
  optimalHumidity: z.string().max(50).optional().nullable(),
  incubationDays: z.coerce.number().int().min(1, "Incubation days must be at least 1").default(21),
  fruitingDays: z.coerce.number().int().min(1, "Fruiting days must be at least 1").default(7),
});
export type CreateMushroomStrainInput = z.infer<typeof CreateMushroomStrainSchema>;

export const RecipeIngredientInputSchema = z.object({
  rawMaterialProductId: z.string().min(1, "Raw material product is required"),
  percentage: z.coerce.number().positive("Percentage must be positive").max(100),
  quantityPerBag: z.coerce.number().positive("Quantity per bag must be positive"),
});

export const CreateSubstrateRecipeSchema = z.object({
  strainId: z.string().min(1, "Strain reference is required"),
  name: z.string().min(2, "Recipe name must be at least 2 characters").max(100),
  standardBagWeightKg: z.coerce.number().positive("Standard bag weight must be positive"),
  instructions: z.string().max(2000).optional().nullable(),
  ingredients: z.array(RecipeIngredientInputSchema).optional().default([]),
});
export type CreateSubstrateRecipeInput = z.input<typeof CreateSubstrateRecipeSchema>;

export const CreateFruitingChamberSchema = z.object({
  name: z.string().min(2, "Chamber name must be at least 2 characters").max(100),
  capacityBags: z.coerce.number().int().min(1, "Capacity must be at least 1 bag").default(1000),
});
export type CreateFruitingChamberInput = z.infer<typeof CreateFruitingChamberSchema>;

// ==========================================
// PRODUCTION BATCH SCHEMAS
// ==========================================

export const CreateProductionBatchSchema = z.object({
  strainId: z.string().min(1, "Mushroom strain is required"),
  recipeId: z.string().min(1, "Substrate recipe is required"),
  chamberId: z.string().optional().nullable(),
  initialBagsCount: z.coerce.number().int().min(1, "Initial bag count must be at least 1"),
  startDate: z.coerce.date().default(() => new Date()),
  expectedYieldKg: z.coerce.number().min(0, "Expected yield cannot be negative").default(0),
  allocatedCost: z.coerce.number().min(0, "Allocated cost cannot be negative").default(0),
  notes: z.string().max(1000).optional().nullable(),
});
export type CreateProductionBatchInput = z.input<typeof CreateProductionBatchSchema>;

export const AdvanceBatchPhaseSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  targetPhase: z.nativeEnum(BatchPhase),
  chamberId: z.string().optional().nullable(),
  temperature: z.coerce.number().optional().nullable(),
  humidity: z.coerce.number().min(0).max(100).optional().nullable(),
  co2Ppm: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type AdvanceBatchPhaseInput = z.input<typeof AdvanceBatchPhaseSchema>;

export const RecordPhaseLogSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  temperature: z.coerce.number().optional().nullable(),
  humidity: z.coerce.number().min(0).max(100).optional().nullable(),
  co2Ppm: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type RecordPhaseLogInput = z.input<typeof RecordPhaseLogSchema>;

// ==========================================
// CONTAMINATION & WASTAGE SCHEMAS
// ==========================================

export const RecordContaminationSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  phaseDetected: z.nativeEnum(BatchPhase),
  discardedBagsCount: z.coerce.number().int().min(1, "Discarded bag count must be at least 1"),
  reason: z.nativeEnum(ContaminationReason).default(ContaminationReason.UNKNOWN),
  notes: z.string().max(500).optional().nullable(),
});
export type RecordContaminationInput = z.input<typeof RecordContaminationSchema>;

// ==========================================
// HARVEST SCHEMAS
// ==========================================

export const RecordHarvestSchema = z
  .object({
    batchId: z.string().min(1, "Batch ID is required"),
    freshProductId: z.string().min(1, "Fresh mushroom product ID is required"),
    flushNumber: z.coerce.number().int().min(1, "Flush number must be at least 1").default(1),
    totalFreshWeightKg: z.coerce.number().positive("Total harvest weight must be positive"),
    gradeAWeightKg: z.coerce.number().min(0, "Grade A weight cannot be negative").default(0),
    gradeBWeightKg: z.coerce.number().min(0, "Grade B weight cannot be negative").default(0),
    scrapWeightKg: z.coerce.number().min(0, "Scrap weight cannot be negative").default(0),
    harvestDate: z.coerce.date().default(() => new Date()),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      const breakdownSum = Number(
        (data.gradeAWeightKg + data.gradeBWeightKg + data.scrapWeightKg).toFixed(3)
      );
      return breakdownSum <= Number(data.totalFreshWeightKg.toFixed(3));
    },
    {
      message:
        "The sum of Grade A, Grade B, and Scrap weights cannot exceed the total fresh harvest weight.",
      path: ["totalFreshWeightKg"],
    }
  );
export type RecordHarvestInput = z.input<typeof RecordHarvestSchema>;

// ==========================================
// DRYING & PROCESSING SCHEMAS
// ==========================================

export const CreateDryingRunSchema = z
  .object({
    batchId: z.string().optional().nullable(),
    freshProductId: z.string().min(1, "Source fresh mushroom product is required"),
    driedProductId: z.string().min(1, "Destination dried mushroom product is required"),
    freshWeightInKg: z.coerce.number().positive("Fresh input weight must be positive"),
    driedWeightOutKg: z.coerce.number().positive("Dried output weight must be positive"),
    lossWeightKg: z.coerce.number().min(0, "Loss weight cannot be negative").default(0),
    lossReason: z.string().max(255).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    startedAt: z.coerce.date().default(() => new Date()),
    completedAt: z.coerce.date().default(() => new Date()),
  })
  .refine(
    (data) => data.freshProductId !== data.driedProductId,
    {
      message: "Destination dried product must be different from source fresh product.",
      path: ["driedProductId"],
    }
  )
  .refine(
    (data) => {
      // In biological mushroom drying, fresh weight is always significantly greater than dried weight (typical 8-12% yield)
      return data.freshWeightInKg >= data.driedWeightOutKg + (data.lossWeightKg || 0);
    },
    {
      message:
        "Fresh input weight must be greater than or equal to dried output plus recorded loss weight.",
      path: ["driedWeightOutKg"],
    }
  );
export type CreateDryingRunInput = z.input<typeof CreateDryingRunSchema>;
