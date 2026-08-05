"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { saveOrganizationLogo } from "@/lib/organization-logo";
import { getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { isHrefAllowedForNav, redirectPathWhenMenuForbidden } from "@/lib/nav-access";
import {
  ensureBillingCustomerForOrganization,
  isBillingConfigured,
} from "@/lib/billing-client";

function resolveReturnTo(formData: FormData, fallback: string): string {
  const returnTo = String(formData.get("return_to") || "").trim();
  if (returnTo === "/appointments/organization" || returnTo === "/appointments/chatbot") {
    return returnTo;
  }
  return fallback;
}

async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true, activeOrganizationId: true },
  });

  if (!session) {
    redirect("/login");
  }

  return session;
}

async function assertProfileMenuAccess(userId: string, organizationId?: string | null) {
  const allowed = await getAllowedMenuPathsForUser(userId, organizationId);
  if (!isHrefAllowedForNav("/profile", allowed)) {
    redirect(redirectPathWhenMenuForbidden(allowed));
  }
}

export async function updateProfile(formData: FormData) {
  const session = await requireSession();
  await assertProfileMenuAccess(session.userId, session.activeOrganizationId);
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!fullName || !email) {
    redirect("/profile?error=missing");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== session.userId) {
    redirect("/profile?error=exists");
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { fullName, email, updatedAt: new Date() },
  });

  redirect("/profile?success=profile");
}

export async function updatePassword(formData: FormData) {
  const session = await requireSession();
  await assertProfileMenuAccess(session.userId, session.activeOrganizationId);
  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!currentPassword || !newPassword) {
    redirect("/profile?error=missing_password");
  }

  if (newPassword !== confirmPassword) {
    redirect("/profile?error=nomatch_password");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });

  if (!user) {
    redirect("/login");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    redirect("/profile?error=invalid_password");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash, updatedAt: new Date() },
  });

  redirect("/profile?success=password");
}

export async function createOrganization(formData: FormData) {
  const session = await requireSession();
  const destination = resolveReturnTo(formData, "/profile");
  const organizationName = String(formData.get("organization_name") || "").trim();

  if (!organizationName) {
    redirect(`${destination}?error=organization_missing`);
  }

  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      billingStatus: "needs_plan",
      planSlug: null,
    },
    select: { id: true, name: true },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: session.userId,
      role: "owner",
    },
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      activeOrganizationId: organization.id,
    },
  });

  // Steps 2–3: register workspace in Billing and store billingCustomerId.
  if (isBillingConfigured()) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, fullName: true },
    });
    if (user?.email) {
      try {
        await ensureBillingCustomerForOrganization({
          organizationId: organization.id,
          customerName: user.fullName?.trim() || user.email,
          primaryEmail: user.email,
        });
      } catch (error) {
        console.error("[billing] failed to register customer on org create", error);
      }
    }
  }

  redirect(`/onboarding/plan?success=organization_created`);
}

export async function switchOrganization(formData: FormData) {
  const session = await requireSession();
  const destination = resolveReturnTo(formData, "/profile");
  const organizationId = String(formData.get("organization_id") || "").trim();

  if (!organizationId) {
    redirect(`${destination}?error=organization_select`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.userId,
      organizationId,
    },
    select: { id: true },
  });

  if (!membership) {
    redirect(`${destination}?error=organization_invalid`);
  }

  await prisma.session.update({
    where: { id: session.id },
    data: {
      activeOrganizationId: organizationId,
    },
  });

  redirect(`${destination}?success=organization_switched`);
}

export async function updateOrganizationName(formData: FormData) {
  const session = await requireSession();
  const destination = resolveReturnTo(formData, "/profile");
  const organizationId = String(formData.get("organization_id") || "").trim();
  const organizationName = String(formData.get("organization_name") || "").trim();

  if (!organizationId || !organizationName) {
    redirect(`${destination}?error=organization_name_missing`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.userId,
      organizationId,
    },
    select: { role: true },
  });

  if (!membership) {
    redirect(`${destination}?error=organization_invalid`);
  }

  if (membership.role !== "owner") {
    redirect(`${destination}?error=organization_owner_required`);
  }

  const logoFile = formData.get("logo");
  const updateData: { name: string; logoUrl?: string } = { name: organizationName };

  if (logoFile instanceof File && logoFile.size > 0) {
    const logoUrl = await saveOrganizationLogo(logoFile, organizationId);
    if (logoUrl) updateData.logoUrl = logoUrl;
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
  });

  redirect(`${destination}?success=organization_updated`);
}

export async function deleteOrganization(formData: FormData) {
  const session = await requireSession();
  const destination = resolveReturnTo(formData, "/profile");
  const organizationId = String(formData.get("organization_id") || "").trim();

  if (!organizationId) {
    redirect(`${destination}?error=organization_select`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.userId,
      organizationId,
    },
    select: { role: true },
  });

  if (!membership) {
    redirect(`${destination}?error=organization_invalid`);
  }

  if (membership.role !== "owner") {
    redirect(`${destination}?error=organization_owner_required`);
  }

  const userMemberships = await prisma.organizationMember.findMany({
    where: { userId: session.userId },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });

  if (userMemberships.length <= 1) {
    redirect(`${destination}?error=organization_last`);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      _count: {
        select: {
          members: true,
          reviews: true,
          appointments: true,
          leads: true,
          reviewServices: true,
          auditEvents: true,
        },
      },
    },
  });

  if (!organization) {
    redirect(`${destination}?error=organization_invalid`);
  }

  if (organization._count.members > 1) {
    redirect(`${destination}?error=organization_has_members`);
  }

  if (
    organization._count.reviews > 0 ||
    organization._count.appointments > 0 ||
    organization._count.leads > 0 ||
    organization._count.reviewServices > 0 ||
    organization._count.auditEvents > 0
  ) {
    redirect(`${destination}?error=organization_not_empty`);
  }

  const fallbackOrganizationId =
    userMemberships.find((item) => item.organizationId !== organizationId)
      ?.organizationId ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: session.id },
      data: {
        activeOrganizationId: fallbackOrganizationId,
      },
    });

    await tx.organization.delete({
      where: { id: organizationId },
    });
  });

  redirect(`${destination}?success=organization_deleted`);
}
