import { prisma } from "@/lib/prisma";
import { getAllStaticNavHrefs } from "@/lib/nav-config";
import { normalizeNavPath } from "@/lib/nav-access";
import { filterPathsByPlanEntitlements, getOrgBilling } from "@/lib/entitlements";

function pathsFromMenus(items: { path: string }[]): Set<string> {
  return new Set(
    [...getAllStaticNavHrefs(), ...items.map((item) => item.path)].map(normalizeNavPath),
  );
}

export async function getAllowedMenuPathsForUser(
  userId: string,
  organizationId?: string | null,
): Promise<Set<string>> {
  const [user, globalRoleAccessCount, memberAccessCount, menuPaths] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    }),
    prisma.menuAccess.count(),
    organizationId
      ? prisma.organizationMemberMenuAccess.count({
          where: { organizationId, userId },
        })
      : Promise.resolve(0),
    prisma.menuItem.findMany({ select: { path: true } }),
  ]);

  if (!user) {
    return new Set(["/logout"].map(normalizeNavPath));
  }

  const allPaths = pathsFromMenus(menuPaths);
  const logoutOnly = new Set<string>(["/logout"].map(normalizeNavPath));

  const roles = user.userRoles.map((ur) => ur.role);
  const isAdmin = userHasAdminRole(roles);
  let paths: Set<string>;

  if (globalRoleAccessCount === 0 && memberAccessCount === 0) {
    paths = allPaths;
  } else if (isAdmin) {
    paths = allPaths;
  } else if (organizationId && memberAccessCount > 0) {
    const memberAccesses = await prisma.organizationMemberMenuAccess.findMany({
      where: { organizationId, userId },
      select: { menuItem: { select: { path: true } } },
    });
    paths = new Set(logoutOnly);
    for (const access of memberAccesses) {
      paths.add(normalizeNavPath(access.menuItem.path));
    }
  } else {
    const roleIds = roles.map((role) => role.id);
    if (roleIds.length === 0) {
      paths = logoutOnly;
    } else {
      const roleAccesses = await prisma.menuAccess.findMany({
        where: { roleId: { in: roleIds } },
        select: { menuItem: { select: { path: true } } },
      });
      paths = new Set(logoutOnly);
      for (const access of roleAccesses) {
        paths.add(normalizeNavPath(access.menuItem.path));
      }
    }
  }

  // Platform and billing admin are admin-only, even if a menu row exists for other roles.
  if (!isAdmin) {
    for (const path of [...paths]) {
      if (
        path === "/platform" ||
        path.startsWith("/platform/") ||
        path === "/billing-admin" ||
        path.startsWith("/billing-admin/")
      ) {
        paths.delete(path);
      }
    }
  }

  if (organizationId) {
    const billing = await getOrgBilling(organizationId);
    paths = filterPathsByPlanEntitlements(paths, billing, { isAdmin });
  }

  return paths;
}

export function userHasAdminRole(roles: { name: string }[]): boolean {
  return roles.some((r) => r.name === "Admin");
}

export function displayRoleFromUserRoles(roles: { name: string }[]): string {
  if (userHasAdminRole(roles)) return "Admin";
  const sorted = [...roles].sort((a, b) => a.name.localeCompare(b.name));
  return sorted[0]?.name ?? "Member";
}
