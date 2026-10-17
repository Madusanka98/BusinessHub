import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || "superadmin@businesshub.local";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!password || password.length < 10) {
    console.error("ERROR: Please set BOOTSTRAP_ADMIN_PASSWORD (min 10 characters) in environment variables.");
    process.exit(1);
  }

  console.log(`Starting bootstrap for Platform Super Admin: ${email}`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      isSuperAdmin: true,
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      fullName: "Platform Super Admin",
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
    },
  });

  console.log(`Super Admin provisioned successfully: ID=${admin.id}, Email=${admin.email}`);
}

main()
  .catch((e) => {
    console.error("Bootstrap failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
