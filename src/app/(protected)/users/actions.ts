"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-session";
import { validatePasswordStrength } from "@/lib/password-policy";

// Platform-level admin actions aren't scoped to a single organization —
// audit events still require an organizationId, so use the same null-org
// sentinel already established in src/app/login/actions.ts.
const PLATFORM_AUDIT_ORG_ID = "00000000-0000-0000-0000-000000000000";

function organizationFields(formData: FormData) {
  return {
    id: String(formData.get("organization_id") || "").trim(),
    name: String(formData.get("organization_name") || "").trim(),
    businessType: String(formData.get("business_type") || "").trim(),
    description: String(formData.get("organization_description") || "").trim(),
  };
}

function validateOrganizationFields(fields: ReturnType<typeof organizationFields>) {
  if (!fields.name && (fields.businessType || fields.description)) return "organization_missing";
  if (fields.name.length > 100 || fields.businessType.length > 80 || fields.description.length > 2000) {
    return "organization_invalid";
  }
  return null;
}

export async function createUser(formData: FormData) {
  const session = await requireAdminSession();

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const roleId = String(formData.get("role_id") || "");
  const accountStatus = String(formData.get("account_status") || "").trim();
  const organization = organizationFields(formData);

  if (!fullName || !email || !password) {
    redirect("/users?error=missing");
  }

  const passwordViolation = validatePasswordStrength(password, { email, fullName });
  if (passwordViolation) {
    redirect(`/users?error=${passwordViolation}`);
  }

  const organizationError = validateOrganizationFields(organization);
  if (organizationError) {
    redirect(`/users?error=${organizationError}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const resolvedRole =
      roleId || (await prisma.role.findUnique({ where: { name: "User" } }))?.id;

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          accountStatus: accountStatus || "active",
        },
      });

      if (resolvedRole) {
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: resolvedRole,
          },
        });
      }

      if (organization.name) {
        const createdOrganization = await tx.organization.create({
          data: {
            name: organization.name,
            businessType: organization.businessType || null,
            description: organization.description || null,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: createdOrganization.id,
            userId: createdUser.id,
            role: "owner",
          },
        });
      }

      return createdUser;
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: PLATFORM_AUDIT_ORG_ID,
        actorId: session.userId,
        action: "admin.user_created",
        metadata: {
          targetUserId: user.id,
          email,
          roleId: resolvedRole ?? null,
          organizationName: organization.name || null,
        },
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
  const organization = organizationFields(formData);

  if (!id || !fullName || !email) {
    redirect("/users?error=missing");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id) {
    redirect("/users?error=exists");
  }

  const organizationError = validateOrganizationFields(organization);
  if (organizationError) {
    redirect(`/users?error=${organizationError}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          fullName,
          email,
          accountStatus: accountStatus || "active",
          updatedAt: new Date(),
        },
      });

      if (roleId) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({
          data: {
            userId: id,
            roleId,
          },
        });
      }

      if (organization.id) {
        const ownedOrganization = await tx.organizationMember.findFirst({
          where: {
            organizationId: organization.id,
            userId: id,
            role: "owner",
          },
          select: { id: true },
        });

        if (!ownedOrganization) throw new Error("Organization ownership mismatch.");
        if (!organization.name) throw new Error("Organization name is required.");

        await tx.organization.update({
          where: { id: organization.id },
          data: {
            name: organization.name,
            businessType: organization.businessType || null,
            description: organization.description || null,
          },
        });
      } else if (organization.name) {
        const createdOrganization = await tx.organization.create({
          data: {
            name: organization.name,
            businessType: organization.businessType || null,
            description: organization.description || null,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: createdOrganization.id,
            userId: id,
            role: "owner",
          },
        });
      }
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: PLATFORM_AUDIT_ORG_ID,
        actorId: session.userId,
        action: "admin.user_updated",
        metadata: {
          targetUserId: id,
          email,
          roleId: roleId || null,
          accountStatus,
          organizationId: organization.id || null,
          organizationName: organization.name || null,
        },
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
