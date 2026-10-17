import { PrismaClient, MembershipRole, MembershipStatus, BusinessStatus, TransactionType } from "@prisma/client";
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
  console.log(`✓ Seeded ${categories.length} transaction categories.`);

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
