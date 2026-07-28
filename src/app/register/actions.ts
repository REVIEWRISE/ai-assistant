"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function registerUser(formData: FormData) {
  const fullName = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  if (!fullName || !email || !password) {
    redirect("/register?error=missing");
  }

  if (password !== confirm) {
    redirect("/register?error=nomatch");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let userId: string;
  let organizationId: string | null = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: `${fullName.split(" ")[0] || "New"} Workspace`,
          billingStatus: "needs_plan",
          planSlug: null,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
        },
      });

      const userRole = await tx.role.findUnique({ where: { name: "User" } });
      if (userRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: userRole.id,
          },
        });
      }

      return { userId: user.id, organizationId: organization.id };
    });

    userId = result.userId;
    organizationId = result.organizationId;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/register?error=exists");
      }
    }
    redirect("/register?error=unknown");
  }

  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      userId,
      activeOrganizationId: organizationId,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("ai_session", sessionToken, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  const planHint = String(formData.get("plan") || "").trim();
  const intervalHint = String(formData.get("interval") || "").trim();
  const onboardingQs = new URLSearchParams({ success: "register" });
  if (planHint) onboardingQs.set("plan", planHint);
  if (intervalHint === "monthly" || intervalHint === "yearly") {
    onboardingQs.set("interval", intervalHint);
  } else {
    onboardingQs.set("interval", "yearly");
  }
  redirect(`/onboarding/plan?${onboardingQs.toString()}`);
}
