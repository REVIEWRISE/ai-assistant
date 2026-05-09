"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function normalizeName(input: string): string {
  return input.trim();
}

export async function createRole(formData: FormData) {
  const name = normalizeName(String(formData.get("name") || ""));
  if (!name) {
    redirect("/settings/access/roles?error=missing");
  }

  try {
    await prisma.role.create({ data: { name } });
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
  const id = String(formData.get("id") || "");
  const name = normalizeName(String(formData.get("name") || ""));

  if (!id || !name) {
    redirect("/settings/access/roles?error=missing");
  }

  try {
    await prisma.role.update({ where: { id }, data: { name } });
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
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/settings/access/roles?error=missing");
  }

  try {
    await prisma.role.delete({ where: { id } });
  } catch {
    redirect("/settings/access/roles?error=delete_failed");
  }

  redirect("/settings/access/roles?success=deleted");
}
