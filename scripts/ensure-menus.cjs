/**
 * Idempotent menu bootstrap for production (db push does not run SQL migrations).
 * Ensures Subscription exists and is granted to Admin + User roles.
 */
try {
  // Local runs: load .env / .env.local. In Docker, DATABASE_URL is already injected.
  require("@next/env").loadEnvConfig(process.cwd());
} catch {
  // optional in production image
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SUBSCRIPTION_MENU = {
  id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
  label: "Subscription",
  path: "/subscription",
  sortOrder: 5,
};

async function main() {
  await prisma.menuItem.upsert({
    where: { id: SUBSCRIPTION_MENU.id },
    create: {
      id: SUBSCRIPTION_MENU.id,
      label: SUBSCRIPTION_MENU.label,
      path: SUBSCRIPTION_MENU.path,
      sortOrder: SUBSCRIPTION_MENU.sortOrder,
    },
    update: {
      label: SUBSCRIPTION_MENU.label,
      path: SUBSCRIPTION_MENU.path,
      sortOrder: SUBSCRIPTION_MENU.sortOrder,
    },
  });

  const roles = await prisma.role.findMany({
    where: { name: { in: ["Admin", "User"] } },
    select: { id: true, name: true },
  });

  if (roles.length === 0) {
    console.warn("[ensure-menus] No Admin/User roles found; skipped subscription grants.");
    return;
  }

  await prisma.menuAccess.createMany({
    data: roles.map((role) => ({
      menuItemId: SUBSCRIPTION_MENU.id,
      roleId: role.id,
    })),
    skipDuplicates: true,
  });

  console.log(
    `[ensure-menus] Subscription menu ready for roles: ${roles.map((r) => r.name).join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error("[ensure-menus] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
