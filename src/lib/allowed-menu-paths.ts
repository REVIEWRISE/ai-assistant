import { prisma } from "@/lib/prisma";
import { getAllStaticNavHrefs } from "@/lib/nav-config";
import { normalizeNavPath } from "@/lib/nav-access";

export async function getAllowedMenuPathsForUser(userId: string): Promise<Set<string>> {
  const [user, globalAccessCount, menuPaths] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    }),
    prisma.menuAccess.count(),
    prisma.menuItem.findMany({ select: { path: true } }),
  ]);

  if (!user) {
    return new Set(["/logout"].map(normalizeNavPath));
  }

  const pathsFromMenus = (items: { path: string }[]) => {
    if (items.length === 0) {
      return new Set(getAllStaticNavHrefs().map(normalizeNavPath));
    }
    return new Set(items.map((m) => normalizeNavPath(m.path)));
  };

  if (globalAccessCount === 0) {
    return pathsFromMenus(menuPaths);
  }

  const isAdmin = user.userRoles.some((ur) => ur.role.name === "Admin");
  if (isAdmin) {
    return pathsFromMenus(menuPaths);
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
