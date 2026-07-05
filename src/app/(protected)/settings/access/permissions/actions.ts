"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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
  const organizationId = String(formData.get("organization_id") || "");
  const userId = String(formData.get("user_id") || "");
  const menuItemId = String(formData.get("menu_item_id") || "");

  if (!organizationId || !userId || !menuItemId) {
    redirect("/settings/access/permissions?error=missing");
  }

  await assertOrganizationMember(organizationId, userId);

  try {
    await prisma.organizationMemberMenuAccess.create({
      data: {
        organizationId,
        userId,
        menuItemId,
      },
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

  redirect("/settings/access/permissions?success=created");
}

export async function deleteMemberMenuAccess(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    await prisma.organizationMemberMenuAccess.delete({ where: { id } });
  } catch {
    redirect("/settings/access/permissions?error=delete_failed");
  }

  redirect("/settings/access/permissions?success=deleted");
}

export async function createRoleMenuAccess(formData: FormData) {
  const roleId = String(formData.get("role_id") || "");
  const menuItemId = String(formData.get("menu_item_id") || "");

  if (!roleId || !menuItemId) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    await prisma.menuAccess.create({
      data: { roleId, menuItemId },
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

  redirect("/settings/access/permissions?success=created");
}

export async function deleteRoleMenuAccess(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    await prisma.menuAccess.delete({ where: { id } });
  } catch {
    redirect("/settings/access/permissions?error=delete_failed");
  }

  redirect("/settings/access/permissions?success=deleted");
}
