"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  ensureBillingCustomerForOrganization,
  isBillingConfigured,
} from "@/lib/billing-client";
import { sendEmailVerification } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { checkRegisterRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { createLogger } from "@/lib/logger";
import { validatePasswordStrength } from "@/lib/password-policy";
import { isSmtpConfigured } from "@/lib/smtp-mail";

const log = createLogger("register");

function redirectRegisterError(
  error: string,
  values: {
    name?: string;
    email?: string;
    organizationName?: string;
    plan?: string;
    interval?: string;
  },
): never {
  const qs = new URLSearchParams({ error });
  if (values.name) qs.set("name", values.name);
  if (values.email) qs.set("email", values.email);
  if (values.organizationName) qs.set("organization_name", values.organizationName);
  if (values.plan) qs.set("plan", values.plan);
  if (values.interval === "monthly" || values.interval === "yearly") {
    qs.set("interval", values.interval);
  }
  redirect(`/register?${qs.toString()}`);
}

export async function registerUser(formData: FormData) {
  const fullName = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");
  const organizationNameInput = String(formData.get("organization_name") || "").trim();
  const planHint = String(formData.get("plan") || "").trim();
  const intervalHint = String(formData.get("interval") || "").trim();
  const preserved = {
    name: fullName,
    email,
    organizationName: organizationNameInput,
    plan: planHint,
    interval: intervalHint,
  };

  const ip = await getRequestIp();
  const rl = checkRegisterRateLimit(ip);
  if (!rl.allowed) {
    redirectRegisterError("rate_limited", preserved);
  }

  if (!fullName || !email || !password || !organizationNameInput) {
    redirectRegisterError("missing", preserved);
  }

  if (organizationNameInput.length > 100) {
    redirectRegisterError("organization_name", preserved);
  }

  const passwordViolation = validatePasswordStrength(password, { email, fullName });
  if (passwordViolation) {
    redirectRegisterError(passwordViolation, preserved);
  }

  if (password !== confirm) {
    redirectRegisterError("nomatch", preserved);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let userId: string;
  let organizationId: string | null = null;
  let organizationName: string | null = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          emailVerified: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: organizationNameInput,
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

      return {
        userId: user.id,
        organizationId: organization.id,
        organizationName: organization.name,
      };
    });

    userId = result.userId;
    organizationId = result.organizationId;
    organizationName = result.organizationName;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirectRegisterError("exists", preserved);
      }
    }
    redirectRegisterError("unknown", preserved);
  }

  // Step 2–3: register Billing customer as soon as the account/workspace exists.
  if (!organizationId || !organizationName) {
    redirect("/register?error=unknown");
  }
  if (!isBillingConfigured()) {
    log.warn("BILLING_API_KEY missing — skipped customer create on signup");
  } else {
    try {
      await ensureBillingCustomerForOrganization({
        organizationId,
        customerName: fullName,
        primaryEmail: email,
      });
    } catch (error) {
      log.error("failed to register billing customer on signup", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Account exists locally; customer can still be created later at plan select / checkout.
    }
  }

  const onboardingQs = new URLSearchParams({ success: "register" });
  if (planHint) onboardingQs.set("plan", planHint);
  if (intervalHint === "monthly" || intervalHint === "yearly") {
    onboardingQs.set("interval", intervalHint);
  } else {
    onboardingQs.set("interval", "yearly");
  }
  const postVerifyPath = `/onboarding/plan?${onboardingQs.toString()}`;

  let emailVerified = false;
  if (!isSmtpConfigured() && process.env.NODE_ENV !== "production") {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    emailVerified = true;
    log.warn("SMTP missing in development — auto-verified new account", { userId });
  } else {
    const sendResult = await sendEmailVerification({ userId, email, fullName });
    if (!sendResult.sent && process.env.NODE_ENV !== "production" && sendResult.skipped) {
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
      emailVerified = true;
    }
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
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  cookieStore.set("post_verify_next", postVerifyPath, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });

  // Audit registration event
  await prisma.auditEvent.create({
    data: {
      organizationId,
      actorId: userId,
      action: "auth.register",
      metadata: { emailVerified },
    },
  }).catch(() => {/* non-blocking */});

  if (emailVerified) {
    redirect(postVerifyPath);
  }

  const pendingQs = new URLSearchParams({ email });
  redirect(`/verify-email/pending?${pendingQs.toString()}`);
}
