"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { writePlatformAudit } from "@/lib/platform-audit";

function normalizeName(input: string): string {
  return input.trim();
}

export async function createRole(formData: FormData) {
  const session = await requireSession();
  const name = normalizeName(String(formData.get("name") || ""));
  if (!name) {
    redirect("/settings/access/roles?error=missing");
  }

  try {
    const role = await prisma.role.create({ data: { name } });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.role_created",
      metadata: { roleId: role.id, name },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/settings/access/roles?error=exists");
      }
    }
    redirect("/settings/access/roles?error=unknown");
  }

  redirect("/settings/access/roles?success=created");
}

export async function updateRole(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const name = normalizeName(String(formData.get("name") || ""));

  if (!id || !name) {
    redirect("/settings/access/roles?error=missing");
  }

  try {
    await prisma.role.update({ where: { id }, data: { name } });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.role_updated",
      metadata: { roleId: id, name },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/settings/access/roles?error=exists");
      }
    }
    redirect("/settings/access/roles?error=unknown");
  }

  redirect("/settings/access/roles?success=updated");
}

export async function deleteRole(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/roles?error=missing");
  }

  try {
    const role = await prisma.role.findUnique({ where: { id }, select: { name: true } });
    await prisma.role.delete({ where: { id } });
    await writePlatformAudit({
      actorId: session.userId,
      organizationId: session.activeOrganizationId,
      action: "access.role_deleted",
      metadata: { roleId: id, name: role?.name ?? null },
    });
  } catch {
    redirect("/settings/access/roles?error=delete_failed");
  }

  redirect("/settings/access/roles?success=deleted");
}
