/**
 * Production-safe menu bootstrap.
 *
 * Does NOT rewrite unrelated menus/roles/permissions.
 * - Ensures /subscription exists and is granted to Admin + User
 * - Ensures /platform/audit exists and is granted to Admin only
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

const AUDIT_MENU_ID = "f1a2b3c4-d5e6-4789-a012-3456789abcdf";
const AUDIT_PATH = "/platform/audit";
const PLATFORM_PARENT_ID = "18d185ec-9cb2-46d9-bd27-e65d1341b66c";

async function ensureMenuItem({
  id,
  path,
  label,
  sortOrder,
  parentId = null,
}) {
  const existingById = await prisma.menuItem.findUnique({
    where: { id },
    select: { id: true },
  });
  const existingByPath = existingById
    ? null
    : await prisma.menuItem.findFirst({
        where: { path },
        select: { id: true },
      });

  const menuItemId = existingById?.id ?? existingByPath?.id ?? null;

  if (!menuItemId) {
    await prisma.menuItem.create({
      data: {
        id,
        label,
        path,
        sortOrder,
        parentId,
      },
    });
    console.log(`[ensure-menus] Created ${label} menu item.`);
    return id;
  }

  console.log(`[ensure-menus] ${label} menu already present — left unchanged.`);
  return menuItemId;
}

async function ensureRoleGrants(menuItemId, roleNames, label) {
  const roles = await prisma.role.findMany({
    where: { name: { in: roleNames } },
    select: { id: true, name: true },
  });

  if (roles.length === 0) {
    console.warn(`[ensure-menus] No ${roleNames.join("/")} roles found; skipped ${label} grants.`);
    return;
  }

  let granted = 0;
  for (const role of roles) {
    const already = await prisma.menuAccess.findFirst({
      where: { roleId: role.id, menuItemId },
      select: { id: true },
    });
    if (already) continue;

    await prisma.menuAccess.create({
      data: { roleId: role.id, menuItemId },
    });
    granted += 1;
    console.log(`[ensure-menus] Granted ${label} to role: ${role.name}`);
  }

  if (granted === 0) {
    console.log(`[ensure-menus] ${label} grants already in place — nothing to do.`);
  }
}

async function main() {
  const subscriptionId = await ensureMenuItem({
    id: SUBSCRIPTION_MENU_ID,
    path: SUBSCRIPTION_PATH,
    label: "Subscription",
    sortOrder: 5,
  });
  await ensureRoleGrants(subscriptionId, ["Admin", "User"], "Subscription");

  const auditId = await ensureMenuItem({
    id: AUDIT_MENU_ID,
    path: AUDIT_PATH,
    label: "Audit Log",
    sortOrder: 1,
    parentId: PLATFORM_PARENT_ID,
  });
  await ensureRoleGrants(auditId, ["Admin"], "Audit Log");
}

main()
  .catch((error) => {
    console.error("[ensure-menus] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
