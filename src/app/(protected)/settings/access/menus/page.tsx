import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { MenusManager } from "@/components/menus-manager";
import { MenusToasts } from "@/components/menus-toasts";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { AccessControlNav } from "@/components/access-control-nav";
import { createMenuItem, deleteMenuItem, updateMenuItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccessMenusPage() {
  const [menus, grantCount] = await Promise.all([
    prisma.menuItem.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            menuAccess: true,
            children: true,
          },
        },
      },
    }),
    prisma.menuAccess.count(),
  ]);

  const totalMenus = menus.length;
  const topLevelCount = menus.filter((menu) => !menu.parentId).length;
  const nestedCount = totalMenus - topLevelCount;
  const newest = menus[menus.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  const status =
    totalMenus === 0
      ? "No menus yet"
      : nestedCount > 0
        ? `${topLevelCount} top-level · ${nestedCount} nested`
        : `${totalMenus} routes ready`;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <MenusToasts />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Access Control"
        title="Menu catalog"
        description="Organize navigation labels, routes, and nesting used by role and user permissions."
        status={status}
        statusTone={totalMenus > 0 ? "success" : "warning"}
        actions={[
          { href: "/settings/access/roles", label: "Manage roles" },
          { href: "/settings/access/permissions", label: "Assign permissions", primary: true },
        ]}
        metrics={[
          {
            label: "Total menus",
            value: totalMenus,
            hint: newest ? `Newest · ${newest.label} (${newestLabel})` : "none created",
          },
          {
            label: "Top level",
            value: topLevelCount,
            hint: "primary navigation items",
          },
          {
            label: "Nested",
            value: nestedCount,
            hint: nestedCount > 0 ? "child menu items" : "no nesting yet",
          },
          {
            label: "Permission grants",
            value: grantCount,
            hint: "role menu assignments",
          },
        ]}
      />

      <AccessControlNav />

      <MenusManager
        menus={menus.map((menu) => ({
          id: menu.id,
          label: menu.label,
          path: menu.path,
          description: menu.description,
          parentId: menu.parentId,
          icon: menu.icon,
          sortOrder: menu.sortOrder,
          createdAt: menu.createdAt,
          childCount: menu._count.children,
          grantCount: menu._count.menuAccess,
        }))}
        onCreateMenu={createMenuItem}
        onUpdateMenu={updateMenuItem}
        onDeleteMenu={deleteMenuItem}
      />
    </div>
  );
}
