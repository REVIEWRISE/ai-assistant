"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdminSession, requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { writePlatformAudit } from "@/lib/platform-audit";

const PERMISSIONS_PATH = "/settings/access/permissions";

function refreshPermissions() {
  revalidatePath(PERMISSIONS_PATH);
  revalidatePath("/settings/access");
  revalidatePath("/dashboard");
}

async function assertCanManageOrgPermissions(organizationId: string, actorId: string) {
  const isAdmin = await userHasAdminRole(actorId);
  if (isAdmin) return;

  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId, userId: actorId },
    select: { role: true },
  });
  if (!membership || membership.role !== "owner") {
    redirect("/settings/access/permissions?error=unauthorized");
  }
}

async function assertOrganizationMember(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId, userId },
    select: { id: true },
  });
  if (!membership) {
    redirect("/settings/access/permissions?error=invalid_member");
  }
}

export async function createMemberMenuAccess(formData: FormData) {
  const session = await requireSession();
  const organizationId = String(formData.get("organization_id") || "");
  const userId = String(formData.get("user_id") || "");
  const menuItemId = String(formData.get("menu_item_id") || "");

  if (!organizationId || !userId || !menuItemId) {
    redirect("/settings/access/permissions?error=missing");
  }

  await assertCanManageOrgPermissions(organizationId, session.userId);
  await assertOrganizationMember(organizationId, userId);

  try {
    await prisma.organizationMemberMenuAccess.create({
      data: {
        organizationId,
        userId,
        menuItemId,
      },
    });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId,
      action: "access.member_menu_granted",
      metadata: { targetUserId: userId, menuItemId },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/settings/access/permissions?error=exists");
      }
    }
    redirect("/settings/access/permissions?error=unknown");
  }

  refreshPermissions();
  redirect("/settings/access/permissions?success=created");
}

export async function deleteMemberMenuAccess(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/permissions?error=missing");
  }

  const row = await prisma.organizationMemberMenuAccess.findUnique({
    where: { id },
    select: { organizationId: true, userId: true, menuItemId: true },
  });
  if (!row) {
    redirect("/settings/access/permissions?error=not_found");
  }

  await assertCanManageOrgPermissions(row.organizationId, session.userId);

  try {
    await prisma.organizationMemberMenuAccess.delete({ where: { id } });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: row.organizationId,
      action: "access.member_menu_revoked",
      metadata: {
        targetUserId: row.userId,
        menuItemId: row.menuItemId,
      },
    });
  } catch {
    redirect("/settings/access/permissions?error=delete_failed");
  }

  refreshPermissions();
  redirect("/settings/access/permissions?success=deleted");
}

export async function createRoleMenuAccess(formData: FormData) {
  const session = await requireAdminSession();
  const roleId = String(formData.get("role_id") || "");
  const menuItemId = String(formData.get("menu_item_id") || "");

  if (!roleId || !menuItemId) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    await prisma.menuAccess.create({
      data: { roleId, menuItemId },
    });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.role_menu_granted",
      metadata: { roleId, menuItemId },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/settings/access/permissions?error=exists");
      }
    }
    redirect("/settings/access/permissions?error=unknown");
  }

  refreshPermissions();
  redirect("/settings/access/permissions?success=created");
}

export async function deleteRoleMenuAccess(formData: FormData) {
  const session = await requireAdminSession();
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    const row = await prisma.menuAccess.findUnique({
      where: { id },
      select: { roleId: true, menuItemId: true },
    });
    await prisma.menuAccess.delete({ where: { id } });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.role_menu_revoked",
      metadata: { roleId: row?.roleId ?? null, menuItemId: row?.menuItemId ?? null },
    });
  } catch {
    redirect("/settings/access/permissions?error=delete_failed");
  }

  refreshPermissions();
  redirect("/settings/access/permissions?success=deleted");
}
