"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { writePlatformAudit } from "@/lib/platform-audit";

function normalizeText(input: string): string {
  return input.trim();
}

export async function createMenuItem(formData: FormData) {
  const session = await requireSession();
  const label = normalizeText(String(formData.get("label") || ""));
  const path = normalizeText(String(formData.get("path") || ""));
  const description = normalizeText(String(formData.get("description") || ""));
  const parentId = String(formData.get("parent_id") || "");
  const icon = normalizeText(String(formData.get("icon") || ""));
  const sortOrderRaw = String(formData.get("sort_order") || "");
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  if (!label || !path) {
    redirect("/settings/access/menus?error=missing");
  }

  if (Number.isNaN(sortOrder)) {
    redirect("/settings/access/menus?error=invalid_order");
  }

  try {
    await prisma.menuItem.create({
      data: {
        label,
        path,
        description: description || null,
        parentId: parentId || null,
        icon: icon || null,
        sortOrder,
      },
    });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.menu_created",
      metadata: { label, path },
    });
  } catch {
    redirect("/settings/access/menus?error=unknown");
  }

  redirect("/settings/access/menus?success=created");
}

export async function updateMenuItem(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const label = normalizeText(String(formData.get("label") || ""));
  const path = normalizeText(String(formData.get("path") || ""));
  const description = normalizeText(String(formData.get("description") || ""));
  const parentId = String(formData.get("parent_id") || "");
  const icon = normalizeText(String(formData.get("icon") || ""));
  const sortOrderRaw = String(formData.get("sort_order") || "");
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  if (!id || !label || !path) {
    redirect("/settings/access/menus?error=missing");
  }

  if (Number.isNaN(sortOrder)) {
    redirect("/settings/access/menus?error=invalid_order");
  }

  try {
    await prisma.menuItem.update({
      where: { id },
      data: {
        label,
        path,
        description: description || null,
        parentId: parentId || null,
        icon: icon || null,
        sortOrder,
      },
    });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.menu_updated",
      metadata: { menuItemId: id, label, path },
    });
  } catch {
    redirect("/settings/access/menus?error=unknown");
  }

  redirect("/settings/access/menus?success=updated");
}

export async function deleteMenuItem(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/menus?error=missing");
  }

  try {
    const menu = await prisma.menuItem.findUnique({
      where: { id },
      select: { label: true, path: true },
    });
    await prisma.menuItem.delete({ where: { id } });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.menu_deleted",
      metadata: { menuItemId: id, label: menu?.label ?? null, path: menu?.path ?? null },
    });
  } catch {
    redirect("/settings/access/menus?error=delete_failed");
  }

  redirect("/settings/access/menus?success=deleted");
}
