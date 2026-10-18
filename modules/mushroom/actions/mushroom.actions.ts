"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import {
  CreateMushroomStrainSchema,
  CreateSubstrateRecipeSchema,
  CreateFruitingChamberSchema,
  CreateProductionBatchSchema,
  AdvanceBatchPhaseSchema,
  RecordContaminationSchema,
  RecordHarvestSchema,
  CreateDryingRunSchema,
} from "../schemas/mushroom.schema";
import {
  createMushroomStrain,
  createSubstrateRecipe,
  createFruitingChamber,
} from "../services/strain.service";
import {
  createProductionBatch,
  advanceBatchPhase,
  cancelBatch,
} from "../services/batch.service";
import { recordContamination } from "../services/contamination.service";
import { recordHarvest } from "../services/harvest.service";
import { executeDryingRun } from "../services/drying.service";

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  data?: Record<string, unknown>;
}

// ==========================================
// STRAIN & RECIPE ACTIONS
// ==========================================

export async function createMushroomStrainAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:recipes:manage");

    const raw = {
      name: formData.get("name"),
      scientificName: formData.get("scientificName") || undefined,
      optimalTempRange: formData.get("optimalTempRange") || undefined,
      optimalHumidity: formData.get("optimalHumidity") || undefined,
      incubationDays: formData.get("incubationDays"),
      fruitingDays: formData.get("fruitingDays"),
    };

    const parsed = CreateMushroomStrainSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please correct the highlighted errors.",
      };
    }

    const strain = await createMushroomStrain(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/strains");

    return {
      success: true,
      message: `Strain "${strain.name}" created successfully.`,
      data: { id: strain.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create mushroom strain.",
    };
  }
}

export async function createSubstrateRecipeAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:recipes:manage");

    let ingredients = [];
    const rawIngredients = formData.get("ingredientsJson");
    if (rawIngredients) {
      try {
        ingredients = JSON.parse(String(rawIngredients));
      } catch {
        // ignore
      }
    }

    const raw = {
      strainId: formData.get("strainId"),
      name: formData.get("name"),
      standardBagWeightKg: formData.get("standardBagWeightKg"),
      instructions: formData.get("instructions") || undefined,
      ingredients,
    };

    const parsed = CreateSubstrateRecipeSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please correct the recipe details.",
      };
    }

    const recipe = await createSubstrateRecipe(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/strains");

    return {
      success: true,
      message: `Recipe "${recipe.name}" created successfully.`,
      data: { id: recipe.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create substrate recipe.",
    };
  }
}

export async function createFruitingChamberAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:recipes:manage");

    const raw = {
      name: formData.get("name"),
      capacityBags: formData.get("capacityBags"),
    };

    const parsed = CreateFruitingChamberSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please correct the chamber details.",
      };
    }

    const chamber = await createFruitingChamber(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");

    return {
      success: true,
      message: `Fruiting chamber "${chamber.name}" created successfully.`,
      data: { id: chamber.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create fruiting chamber.",
    };
  }
}

// ==========================================
// PRODUCTION BATCH ACTIONS
// ==========================================

export async function createProductionBatchAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:batches:create");

    const raw = {
      strainId: formData.get("strainId"),
      recipeId: formData.get("recipeId"),
      chamberId: formData.get("chamberId") || undefined,
      initialBagsCount: formData.get("initialBagsCount"),
      startDate: formData.get("startDate") || undefined,
      expectedYieldKg: formData.get("expectedYieldKg") || 0,
      allocatedCost: formData.get("allocatedCost") || 0,
      notes: formData.get("notes") || undefined,
    };

    const parsed = CreateProductionBatchSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please correct the batch inputs.",
      };
    }

    const batch = await createProductionBatch(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/batches");
    revalidatePath("/inventory");
    revalidatePath("/inventory/movements");

    return {
      success: true,
      message: `Production batch "${batch.batchCode}" initialized with ${batch.initialBagsCount} bags.`,
      data: { id: batch.id, batchCode: batch.batchCode },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create production batch.",
    };
  }
}

export async function advanceBatchPhaseAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:batches:advance_phase");

    const raw = {
      batchId: formData.get("batchId"),
      targetPhase: formData.get("targetPhase"),
      chamberId: formData.get("chamberId") || undefined,
      temperature: formData.get("temperature") || undefined,
      humidity: formData.get("humidity") || undefined,
      co2Ppm: formData.get("co2Ppm") || undefined,
      notes: formData.get("notes") || undefined,
    };

    const parsed = AdvanceBatchPhaseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please check phase advance details.",
      };
    }

    const updated = await advanceBatchPhase(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/batches");
    revalidatePath(`/mushroom/batches/${updated.id}`);

    return {
      success: true,
      message: `Batch "${updated.batchCode}" advanced to ${updated.currentPhase}.`,
      data: { id: updated.id, currentPhase: updated.currentPhase },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to advance batch phase.",
    };
  }
}

export async function cancelBatchAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:batches:advance_phase");

    const batchId = String(formData.get("batchId") || "");
    const reason = String(formData.get("reason") || "Cancelled by operator");

    if (!batchId) {
      return { success: false, error: "Batch ID is required." };
    }

    const cancelled = await cancelBatch(
      context.businessId,
      batchId,
      reason,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/batches");
    revalidatePath(`/mushroom/batches/${batchId}`);

    return {
      success: true,
      message: `Batch "${cancelled.batchCode}" has been cancelled.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel production batch.",
    };
  }
}

// ==========================================
// CONTAMINATION ACTIONS
// ==========================================

export async function recordContaminationAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:waste:log");

    const raw = {
      batchId: formData.get("batchId"),
      phaseDetected: formData.get("phaseDetected"),
      discardedBagsCount: formData.get("discardedBagsCount"),
      reason: formData.get("reason"),
      notes: formData.get("notes") || undefined,
    };

    const parsed = RecordContaminationSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please correct contamination details.",
      };
    }

    const result = await recordContamination(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/batches");
    revalidatePath("/mushroom/contamination");
    revalidatePath(`/mushroom/batches/${result.updatedBatch.id}`);

    return {
      success: true,
      message: `Logged ${result.contamination.discardedBagsCount} discarded bags. Viable remaining: ${result.updatedBatch.viableBagsCount}.`,
      data: { id: result.contamination.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record contamination.",
    };
  }
}

// ==========================================
// HARVEST ACTIONS
// ==========================================

export async function recordHarvestAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:harvest:log");

    const raw = {
      batchId: formData.get("batchId"),
      freshProductId: formData.get("freshProductId"),
      flushNumber: formData.get("flushNumber"),
      totalFreshWeightKg: formData.get("totalFreshWeightKg"),
      gradeAWeightKg: formData.get("gradeAWeightKg") || 0,
      gradeBWeightKg: formData.get("gradeBWeightKg") || 0,
      scrapWeightKg: formData.get("scrapWeightKg") || 0,
      harvestDate: formData.get("harvestDate") || undefined,
      notes: formData.get("notes") || undefined,
    };

    const parsed = RecordHarvestSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please verify harvest weight figures.",
      };
    }

    const result = await recordHarvest(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/batches");
    revalidatePath("/mushroom/harvests");
    revalidatePath("/inventory/products");
    revalidatePath(`/mushroom/batches/${result.harvest.batchId}`);

    return {
      success: true,
      message: `Recorded harvest ${result.harvest.harvestCode}: ${Number(result.harvest.totalFreshWeightKg)}kg posted to inventory.`,
      data: { id: result.harvest.id, harvestCode: result.harvest.harvestCode || "" },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record harvest flush.",
    };
  }
}

// ==========================================
// DRYING RUN ACTIONS
// ==========================================

export async function executeDryingRunAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "mushroom:drying:process");

    const raw = {
      batchId: formData.get("batchId") || undefined,
      freshProductId: formData.get("freshProductId"),
      driedProductId: formData.get("driedProductId"),
      freshWeightInKg: formData.get("freshWeightInKg"),
      driedWeightOutKg: formData.get("driedWeightOutKg"),
      lossWeightKg: formData.get("lossWeightKg") || 0,
      lossReason: formData.get("lossReason") || undefined,
      notes: formData.get("notes") || undefined,
      startedAt: formData.get("startedAt") || undefined,
      completedAt: formData.get("completedAt") || undefined,
    };

    const parsed = CreateDryingRunSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
        error: "Validation failed. Please check drying weights and products.",
      };
    }

    const result = await executeDryingRun(
      context.businessId,
      parsed.data,
      context.userId
    );

    revalidatePath("/mushroom");
    revalidatePath("/mushroom/drying");
    revalidatePath("/inventory/products");

    return {
      success: true,
      message: `Drying Run ${result.dryingRun.runCode} completed: Yield ${Number(result.dryingRun.dryingYieldRatio)}%.`,
      data: { id: result.dryingRun.id, runCode: result.dryingRun.runCode || "" },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute drying run.",
    };
  }
}
