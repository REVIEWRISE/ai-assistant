/**
 * Production-only bootstrap for the Subscription menu.
 *
 * Does NOT seed or rewrite any other menus/roles/permissions.
 * - Creates /subscription menu item only if missing
 * - Grants Admin + User access only if that grant is missing
 */
try {
  require("@next/env").loadEnvConfig(process.cwd());
} catch {
  // optional in production image
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SUBSCRIPTION_MENU_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const SUBSCRIPTION_PATH = "/subscription";

async function main() {
  const existingById = await prisma.menuItem.findUnique({
    where: { id: SUBSCRIPTION_MENU_ID },
    select: { id: true },
  });
  const existingByPath = existingById
    ? null
    : await prisma.menuItem.findFirst({
        where: { path: SUBSCRIPTION_PATH },
        select: { id: true },
      });

  const menuItemId = existingById?.id ?? existingByPath?.id ?? null;

  if (!menuItemId) {
    await prisma.menuItem.create({
      data: {
        id: SUBSCRIPTION_MENU_ID,
        label: "Subscription",
        path: SUBSCRIPTION_PATH,
        sortOrder: 5,
      },
    });
    console.log("[ensure-menus] Created Subscription menu item.");
  } else {
    console.log("[ensure-menus] Subscription menu already present — left unchanged.");
  }

  const resolvedMenuId = menuItemId ?? SUBSCRIPTION_MENU_ID;

  const roles = await prisma.role.findMany({
    where: { name: { in: ["Admin", "User"] } },
    select: { id: true, name: true },
  });

  if (roles.length === 0) {
    console.warn("[ensure-menus] No Admin/User roles found; skipped grants.");
    return;
  }

  let granted = 0;
  for (const role of roles) {
    const already = await prisma.menuAccess.findFirst({
      where: { roleId: role.id, menuItemId: resolvedMenuId },
      select: { id: true },
    });
    if (already) continue;

    await prisma.menuAccess.create({
      data: { roleId: role.id, menuItemId: resolvedMenuId },
    });
    granted += 1;
    console.log(`[ensure-menus] Granted Subscription to role: ${role.name}`);
  }

  if (granted === 0) {
    console.log("[ensure-menus] Subscription grants already in place — nothing to do.");
  }
}

main()
  .catch((error) => {
    console.error("[ensure-menus] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
