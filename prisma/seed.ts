import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const fullName = (process.env.SEED_ADMIN_NAME ?? "Seed Admin").trim();

  if (!email || !password || !fullName) {
    throw new Error("Seed admin email, password, and display name must be non-empty.");
  }

  if (process.env.SEED_ADMIN_PASSWORD === undefined) {
    console.warn(
      "[seed] SEED_ADMIN_PASSWORD not set; using default \"changeme\". Set SEED_ADMIN_PASSWORD in production.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    create: { name: "Admin" },
    update: {},
  });

  await prisma.role.upsert({
    where: { name: "User" },
    create: { name: "User" },
    update: {},
  });

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        fullName,
        passwordHash,
        accountStatus: "active",
        emailVerified: true,
      },
      update: {
        fullName,
        passwordHash,
        accountStatus: "active",
      },
    });

    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    const membership = await tx.organizationMember.findFirst({
      where: { userId: user.id },
    });

    if (!membership) {
      const organization = await tx.organization.create({
        data: {
          name: `${fullName.split(/\s+/)[0] || "Admin"} Workspace`,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
        },
      });
    }
  });

  console.log(`[seed] Admin user ready: ${email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
