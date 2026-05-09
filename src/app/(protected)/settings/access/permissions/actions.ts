"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createMenuAccess(formData: FormData) {
  const roleId = String(formData.get("role_id") || "");
  const menuItemId = String(formData.get("menu_item_id") || "");

  if (!roleId || !menuItemId) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    await prisma.menuAccess.create({
      data: {
        roleId,
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

export async function updateMenuAccess(formData: FormData) {
  const id = String(formData.get("id") || "");
  const roleId = String(formData.get("role_id") || "");
  const menuItemId = String(formData.get("menu_item_id") || "");

  if (!id || !roleId || !menuItemId) {
    redirect("/settings/access/permissions?error=missing");
  }

  try {
    await prisma.menuAccess.update({
      where: { id },
      data: {
        roleId,
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

  redirect("/settings/access/permissions?success=updated");
}

export async function deleteMenuAccess(formData: FormData) {
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
