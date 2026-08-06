"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-session";

// Platform-level admin actions aren't scoped to a single organization —
// audit events still require an organizationId, so use the same null-org
// sentinel already established in src/app/login/actions.ts.
const PLATFORM_AUDIT_ORG_ID = "00000000-0000-0000-0000-000000000000";

export async function createUser(formData: FormData) {
  const session = await requireAdminSession();

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const roleId = String(formData.get("role_id") || "");
  const accountStatus = String(formData.get("account_status") || "").trim();

  if (!fullName || !email || !password) {
    redirect("/users?error=missing");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        accountStatus: accountStatus || "active",
      },
    });

    const resolvedRole =
      roleId || (await prisma.role.findUnique({ where: { name: "User" } }))?.id;

    if (resolvedRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: resolvedRole,
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        organizationId: PLATFORM_AUDIT_ORG_ID,
        actorId: session.userId,
        action: "admin.user_created",
        metadata: { targetUserId: user.id, email, roleId: resolvedRole ?? null },
      },
    }).catch(() => {/* non-blocking */});
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/users?error=exists");
      }
    }
    redirect("/users?error=unknown");
  }

  redirect("/users?success=created");
}

export async function updateUser(formData: FormData) {
  const session = await requireAdminSession();

  const id = String(formData.get("id") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleId = String(formData.get("role_id") || "");
  const accountStatus = String(formData.get("account_status") || "").trim();

  if (!id || !fullName || !email) {
    redirect("/users?error=missing");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id) {
    redirect("/users?error=exists");
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        fullName,
        email,
        accountStatus: accountStatus || "active",
        updatedAt: new Date(),
      },
    });

    if (roleId) {
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.create({
        data: {
          userId: id,
          roleId,
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        organizationId: PLATFORM_AUDIT_ORG_ID,
        actorId: session.userId,
        action: "admin.user_updated",
        metadata: { targetUserId: id, email, roleId: roleId || null, accountStatus },
      },
    }).catch(() => {/* non-blocking */});
  } catch {
    redirect("/users?error=unknown");
  }

  redirect("/users?success=updated");
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdminSession();

  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/users?error=missing");
  }

  try {
    await prisma.user.delete({ where: { id } });

    await prisma.auditEvent.create({
      data: {
        organizationId: PLATFORM_AUDIT_ORG_ID,
        actorId: session.userId,
        action: "admin.user_deleted",
        metadata: { targetUserId: id },
      },
    }).catch(() => {/* non-blocking */});
  } catch {
    redirect("/users?error=delete_failed");
  }

  redirect("/users?success=deleted");
}
