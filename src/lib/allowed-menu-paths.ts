import { prisma } from "@/lib/prisma";
import { getAllStaticNavHrefs } from "@/lib/nav-config";
import { normalizeNavPath } from "@/lib/nav-access";

export async function getAllowedMenuPathsForUser(userId: string): Promise<Set<string>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: true } },
    },
  });

  if (!user) {
    return new Set(["/logout"].map(normalizeNavPath));
  }

  const globalAccessCount = await prisma.menuAccess.count();
  if (globalAccessCount === 0) {
    const dbMenus = await prisma.menuItem.findMany({ select: { path: true } });
    if (dbMenus.length === 0) {
      return new Set(getAllStaticNavHrefs().map(normalizeNavPath));
    }
    return new Set(dbMenus.map((m) => normalizeNavPath(m.path)));
  }

  const isAdmin = user.userRoles.some((ur) => ur.role.name === "Admin");
  if (isAdmin) {
    const items = await prisma.menuItem.findMany({ select: { path: true } });
    if (items.length === 0) {
      return new Set(getAllStaticNavHrefs().map(normalizeNavPath));
    }
    return new Set(items.map((m) => normalizeNavPath(m.path)));
  }

  const roleIds = user.userRoles.map((ur) => ur.role.id);
  const paths = new Set<string>(["/logout"].map(normalizeNavPath));
  if (roleIds.length === 0) {
    return paths;
  }

  const accesses = await prisma.menuAccess.findMany({
    where: { roleId: { in: roleIds } },
    select: { menuItem: { select: { path: true } } },
  });
  for (const a of accesses) {
    paths.add(normalizeNavPath(a.menuItem.path));
  }
  return paths;
}

export function displayRoleFromUserRoles(roles: { name: string }[]): string {
  if (roles.some((r) => r.name === "Admin")) return "Admin";
  const sorted = [...roles].sort((a, b) => a.name.localeCompare(b.name));
  return sorted[0]?.name ?? "Member";
}
