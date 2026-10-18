import {
  PrismaClient,
  MembershipRole,
  MembershipStatus,
  BusinessStatus,
  TransactionType,
  ProductCategory,
  UnitOfMeasure,
  BatchPhase,
  BatchStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Password123!";

async function main() {
  console.log("🌱 Starting idempotent database seeding...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // 1. Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@businesshub.local" },
    update: {
      fullName: "Platform Super Admin",
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
    },
    create: {
      email: "admin@businesshub.local",
      fullName: "Platform Super Admin",
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
    },
  });
  console.log(`✓ Super Admin seeded: ${superAdmin.email}`);

  // 2. Demo Business
  const business = await prisma.business.upsert({
    where: { slug: "green-valley-agro" },
    update: {
      name: "Green Valley Agro Farms",
      status: BusinessStatus.ACTIVE,
      maxOwners: 10,
    },
    create: {
      name: "Green Valley Agro Farms",
      slug: "green-valley-agro",
      status: BusinessStatus.ACTIVE,
      maxOwners: 10,
    },
  });
  console.log(`✓ Business seeded: ${business.name} (${business.slug})`);

  // 3. Business Settings
  await prisma.businessSettings.upsert({
    where: { businessId: business.id },
    update: {
      businessType: "Mushroom Cultivation & Agribusiness",
      contactEmail: "contact@greenvalley.local",
      contactPhone: "+94 11 234 5678",
      address: "123 Agro Innovation Park, Kandy Road, Sri Lanka",
      currency: "LKR",
      timezone: "Asia/Colombo",
      expenseApprovalThreshold: 10000.00,
    },
    create: {
      businessId: business.id,
      businessType: "Mushroom Cultivation & Agribusiness",
      contactEmail: "contact@greenvalley.local",
      contactPhone: "+94 11 234 5678",
      address: "123 Agro Innovation Park, Kandy Road, Sri Lanka",
      currency: "LKR",
      timezone: "Asia/Colombo",
      expenseApprovalThreshold: 10000.00,
    },
  });

  // 4. Role-based Users & Memberships
  const seedMembers = [
    {
      email: "owner@businesshub.local",
      fullName: "Saman Perera (Owner)",
      role: MembershipRole.OWNER,
      equityPercentage: 60.0,
      profitSharePercentage: 60.0,
    },
    {
      email: "finance@businesshub.local",
      fullName: "Anura Silva (Finance Partner)",
      role: MembershipRole.PARTNER_FINANCE,
      equityPercentage: 40.0,
      profitSharePercentage: 40.0,
    },
    {
      email: "operations@businesshub.local",
      fullName: "Kamal Fernando (Operations Partner)",
      role: MembershipRole.PARTNER_OPERATIONS,
      equityPercentage: 0.0,
      profitSharePercentage: 0.0,
    },
    {
      email: "staff@businesshub.local",
      fullName: "Nimal Jayasinghe (Farm Staff)",
      role: MembershipRole.STAFF,
      equityPercentage: 0.0,
      profitSharePercentage: 0.0,
    },
    {
      email: "viewer@businesshub.local",
      fullName: "Dilshan Wickramasinghe (Auditor/Viewer)",
      role: MembershipRole.VIEWER,
      equityPercentage: 0.0,
      profitSharePercentage: 0.0,
    },
  ];

  for (const m of seedMembers) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {
        fullName: m.fullName,
        passwordHash,
        isSuperAdmin: false,
        isActive: true,
      },
      create: {
        email: m.email,
        fullName: m.fullName,
        passwordHash,
        isSuperAdmin: false,
        isActive: true,
      },
    });

    await prisma.businessMembership.upsert({
      where: {
        businessId_userId: {
          businessId: business.id,
          userId: user.id,
        },
      },
      update: {
        role: m.role,
        status: MembershipStatus.ACTIVE,
        equityPercentage: m.equityPercentage,
        profitSharePercentage: m.profitSharePercentage,
      },
      create: {
        businessId: business.id,
        userId: user.id,
        role: m.role,
        status: MembershipStatus.ACTIVE,
        equityPercentage: m.equityPercentage,
        profitSharePercentage: m.profitSharePercentage,
      },
    });

    console.log(`✓ Seeded user [${m.role}]: ${m.email}`);
  }

  // 5. Default Transaction Categories
  const categories = [
    { name: "Mushroom Sales", type: TransactionType.INCOME },
    { name: "Spore & Spawn Sales", type: TransactionType.INCOME },
    { name: "Consulting & Training", type: TransactionType.INCOME },
    { name: "Substrate & Raw Materials", type: TransactionType.EXPENSE },
    { name: "Packaging & Supplies", type: TransactionType.EXPENSE },
    { name: "Utilities & Electricity", type: TransactionType.EXPENSE },
    { name: "Staff Wages", type: TransactionType.EXPENSE },
    { name: "Equipment & Maintenance", type: TransactionType.EXPENSE },
  ];

  for (const cat of categories) {
    await prisma.transactionCategory.upsert({
      where: {
        businessId_name_type: {
          businessId: business.id,
          name: cat.name,
          type: cat.type,
        },
      },
      update: {},
      create: {
        businessId: business.id,
        name: cat.name,
        type: cat.type,
      },
    });
  }
  // 6. Products & Raw Materials
  const seedProducts = [
    {
      sku: "RAW-SAWDUST-01",
      name: "Rubber Wood Sawdust",
      category: ProductCategory.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KG,
      currentStock: 1000.0,
      unitCost: 25.0,
      sellingPrice: 0.0,
    },
    {
      sku: "RAW-RICEBRAN-01",
      name: "Rice Bran (Fine)",
      category: ProductCategory.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KG,
      currentStock: 250.0,
      unitCost: 60.0,
      sellingPrice: 0.0,
    },
    {
      sku: "RAW-LIME-01",
      name: "Agricultural Lime (CaCO3)",
      category: ProductCategory.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KG,
      currentStock: 50.0,
      unitCost: 40.0,
      sellingPrice: 0.0,
    },
    {
      sku: "RAW-SPAWN-AWO",
      name: "American Oyster Grain Spawn",
      category: ProductCategory.RAW_MATERIAL,
      unitOfMeasure: UnitOfMeasure.KG,
      currentStock: 50.0,
      unitCost: 350.0,
      sellingPrice: 0.0,
    },
    {
      sku: "MSH-FRESH-AWO",
      name: "Fresh American Oyster Mushroom",
      category: ProductCategory.FRESH_MUSHROOM,
      unitOfMeasure: UnitOfMeasure.KG,
      currentStock: 15.0,
      unitCost: 350.0,
      sellingPrice: 750.0,
    },
    {
      sku: "MSH-DRIED-AWO",
      name: "Dried American Oyster Mushrooms (Pack)",
      category: ProductCategory.DRIED_MUSHROOM,
      unitOfMeasure: UnitOfMeasure.KG,
      currentStock: 5.0,
      unitCost: 3800.0,
      sellingPrice: 7500.0,
    },
  ];

  const productMap: Record<string, string> = {};
  for (const p of seedProducts) {
    const prod = await prisma.product.upsert({
      where: {
        businessId_sku: {
          businessId: business.id,
          sku: p.sku,
        },
      },
      update: {
        name: p.name,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure,
        currentStock: p.currentStock,
        unitCost: p.unitCost,
        sellingPrice: p.sellingPrice,
        isActive: true,
      },
      create: {
        businessId: business.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure,
        currentStock: p.currentStock,
        unitCost: p.unitCost,
        sellingPrice: p.sellingPrice,
        isActive: true,
      },
    });
    productMap[p.sku] = prod.id;
  }
  console.log(`✓ Seeded ${seedProducts.length} inventory products (including FRESH_MUSHROOM).`);

  // 7. Mushroom Strains, Chambers & Substrate Recipes
  const strain = await prisma.mushroomStrain.upsert({
    where: {
      businessId_name: {
        businessId: business.id,
        name: "American White Oyster",
      },
    },
    update: {
      scientificName: "Pleurotus ostreatus",
      optimalTempRange: "18-24 C",
      optimalHumidity: "85-95%",
      incubationDays: 21,
      fruitingDays: 7,
    },
    create: {
      businessId: business.id,
      name: "American White Oyster",
      scientificName: "Pleurotus ostreatus",
      optimalTempRange: "18-24 C",
      optimalHumidity: "85-95%",
      incubationDays: 21,
      fruitingDays: 7,
    },
  });

  const chamber = await prisma.fruitingChamber.upsert({
    where: {
      businessId_name: {
        businessId: business.id,
        name: "Chamber 01 - Humidified Tunnel",
      },
    },
    update: {
      capacityBags: 1200,
      status: "ACTIVE",
    },
    create: {
      businessId: business.id,
      name: "Chamber 01 - Humidified Tunnel",
      capacityBags: 1200,
      status: "ACTIVE",
    },
  });

  const recipe = await prisma.substrateRecipe.upsert({
    where: {
      businessId_name: {
        businessId: business.id,
        name: "Standard Sawdust Mix 1kg",
      },
    },
    update: {
      strainId: strain.id,
      standardBagWeightKg: 1.0,
      instructions: "80% Sawdust, 18% Rice Bran, 2% Lime. Autoclave 90 min at 121C.",
    },
    create: {
      businessId: business.id,
      strainId: strain.id,
      name: "Standard Sawdust Mix 1kg",
      standardBagWeightKg: 1.0,
      instructions: "80% Sawdust, 18% Rice Bran, 2% Lime. Autoclave 90 min at 121C.",
    },
  });

  // Seed recipe ingredients
  const recipeIngredients = [
    { rawSku: "RAW-SAWDUST-01", percentage: 80.0, qtyPerBag: 0.8 },
    { rawSku: "RAW-RICEBRAN-01", percentage: 18.0, qtyPerBag: 0.18 },
    { rawSku: "RAW-LIME-01", percentage: 2.0, qtyPerBag: 0.02 },
  ];

  for (const ing of recipeIngredients) {
    const rawId = productMap[ing.rawSku];
    if (rawId) {
      await prisma.recipeIngredient.upsert({
        where: {
          recipeId_rawMaterialProductId: {
            recipeId: recipe.id,
            rawMaterialProductId: rawId,
          },
        },
        update: {
          percentage: ing.percentage,
          quantityPerBag: ing.qtyPerBag,
        },
        create: {
          recipeId: recipe.id,
          rawMaterialProductId: rawId,
          percentage: ing.percentage,
          quantityPerBag: ing.qtyPerBag,
        },
      });
    }
  }

  // 8. Active Fruiting Batch (Ready for Harvest Testing)
  const ownerUser = await prisma.user.findUnique({
    where: { email: "owner@businesshub.local" },
  });

  if (ownerUser) {
    const fruitingBatch = await prisma.productionBatch.upsert({
      where: {
        businessId_batchCode: {
          businessId: business.id,
          batchCode: "MB-AWO-202610-001",
        },
      },
      update: {
        strainId: strain.id,
        recipeId: recipe.id,
        chamberId: chamber.id,
        initialBagsCount: 500,
        viableBagsCount: 485,
        currentPhase: BatchPhase.FRUITING,
        status: BatchStatus.ACTIVE,
        expectedYieldKg: 175.0,
        allocatedCost: 15000.0,
      },
      create: {
        businessId: business.id,
        batchCode: "MB-AWO-202610-001",
        strainId: strain.id,
        recipeId: recipe.id,
        chamberId: chamber.id,
        initialBagsCount: 500,
        viableBagsCount: 485,
        currentPhase: BatchPhase.FRUITING,
        status: BatchStatus.ACTIVE,
        expectedYieldKg: 175.0,
        allocatedCost: 15000.0,
        initiatedById: ownerUser.id,
      },
    });
    console.log(`✓ Seeded Fruiting Batch: ${fruitingBatch.batchCode} in FRUITING phase.`);
  }

  console.log("\n=======================================================");
  console.log("  SEED COMPLETED SUCCESSFULLY!  ");
  console.log("=======================================================");
  console.log(`Password for all seeded accounts: ${DEFAULT_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
