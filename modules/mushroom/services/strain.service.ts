import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  CreateMushroomStrainInput,
  CreateMushroomStrainSchema,
  CreateSubstrateRecipeInput,
  CreateSubstrateRecipeSchema,
  CreateFruitingChamberInput,
  CreateFruitingChamberSchema,
} from "../schemas/mushroom.schema";

// ==========================================
// MUSHROOM STRAIN SERVICE
// ==========================================

export async function getMushroomStrains(businessId: string) {
  return await prisma.mushroomStrain.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          recipes: true,
          batches: true,
        },
      },
    },
  });
}

export async function getMushroomStrainById(businessId: string, strainId: string) {
  return await prisma.mushroomStrain.findFirst({
    where: { id: strainId, businessId },
    include: {
      recipes: {
        include: {
          ingredients: {
            include: {
              rawMaterial: true,
            },
          },
        },
      },
      batches: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createMushroomStrain(
  businessId: string,
  rawInput: CreateMushroomStrainInput,
  userId?: string
) {
  const input = CreateMushroomStrainSchema.parse(rawInput);

  const existing = await prisma.mushroomStrain.findFirst({
    where: {
      businessId,
      name: { equals: input.name.trim() },
    },
  });

  if (existing) {
    throw new Error(`A mushroom strain named "${input.name.trim()}" already exists in this business.`);
  }

  const strain = await prisma.mushroomStrain.create({
    data: {
      businessId,
      name: input.name.trim(),
      scientificName: input.scientificName?.trim() || null,
      optimalTempRange: input.optimalTempRange?.trim() || null,
      optimalHumidity: input.optimalHumidity?.trim() || null,
      incubationDays: input.incubationDays,
      fruitingDays: input.fruitingDays,
    },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "MushroomStrain",
    targetId: strain.id,
    changeDetails: {
      name: strain.name,
      scientificName: strain.scientificName,
      incubationDays: strain.incubationDays,
      fruitingDays: strain.fruitingDays,
    },
  });

  return strain;
}

// ==========================================
// SUBSTRATE RECIPE SERVICE
// ==========================================

export async function getSubstrateRecipes(businessId: string) {
  return await prisma.substrateRecipe.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: {
      strain: true,
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
      _count: {
        select: {
          batches: true,
        },
      },
    },
  });
}

export async function getSubstrateRecipeById(businessId: string, recipeId: string) {
  return await prisma.substrateRecipe.findFirst({
    where: { id: recipeId, businessId },
    include: {
      strain: true,
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
    },
  });
}

export async function createSubstrateRecipe(
  businessId: string,
  rawInput: CreateSubstrateRecipeInput,
  userId?: string
) {
  const input = CreateSubstrateRecipeSchema.parse(rawInput);

  // Validate strain belongs to business
  const strain = await prisma.mushroomStrain.findFirst({
    where: { id: input.strainId, businessId },
  });
  if (!strain) {
    throw new Error("Specified mushroom strain does not exist in this business.");
  }

  // Validate recipe name uniqueness
  const existing = await prisma.substrateRecipe.findFirst({
    where: {
      businessId,
      name: { equals: input.name.trim() },
    },
  });
  if (existing) {
    throw new Error(`A substrate recipe named "${input.name.trim()}" already exists in this business.`);
  }

  // If ingredients provided, ensure all products exist and belong to business
  if (input.ingredients && input.ingredients.length > 0) {
    const productIds = input.ingredients.map((i) => i.rawMaterialProductId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("One or more raw material ingredient products are invalid or do not belong to this business.");
    }
  }

  const recipe = await prisma.substrateRecipe.create({
    data: {
      businessId,
      strainId: input.strainId,
      name: input.name.trim(),
      standardBagWeightKg: new Prisma.Decimal(input.standardBagWeightKg.toFixed(3)),
      instructions: input.instructions?.trim() || null,
      ingredients: {
        create: (input.ingredients || []).map((ing) => ({
          rawMaterialProductId: ing.rawMaterialProductId,
          percentage: new Prisma.Decimal(ing.percentage.toFixed(2)),
          quantityPerBag: new Prisma.Decimal(ing.quantityPerBag.toFixed(4)),
        })),
      },
    },
    include: {
      strain: true,
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
    },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "SubstrateRecipe",
    targetId: recipe.id,
    changeDetails: {
      name: recipe.name,
      strainId: recipe.strainId,
      standardBagWeightKg: Number(recipe.standardBagWeightKg),
      ingredientsCount: recipe.ingredients.length,
    },
  });

  return recipe;
}

// ==========================================
// FRUITING CHAMBER SERVICE
// ==========================================

export async function getFruitingChambers(businessId: string) {
  return await prisma.fruitingChamber.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: {
      batches: {
        where: {
          currentPhase: "FRUITING",
          status: "ACTIVE",
        },
        select: {
          id: true,
          batchCode: true,
          viableBagsCount: true,
        },
      },
    },
  });
}

export async function createFruitingChamber(
  businessId: string,
  rawInput: CreateFruitingChamberInput,
  userId?: string
) {
  const input = CreateFruitingChamberSchema.parse(rawInput);

  const existing = await prisma.fruitingChamber.findFirst({
    where: {
      businessId,
      name: { equals: input.name.trim() },
    },
  });
  if (existing) {
    throw new Error(`A fruiting chamber named "${input.name.trim()}" already exists in this business.`);
  }

  const chamber = await prisma.fruitingChamber.create({
    data: {
      businessId,
      name: input.name.trim(),
      capacityBags: input.capacityBags,
    },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "CREATE",
    targetEntity: "FruitingChamber",
    targetId: chamber.id,
    changeDetails: {
      name: chamber.name,
      capacityBags: chamber.capacityBags,
    },
  });

  return chamber;
}
