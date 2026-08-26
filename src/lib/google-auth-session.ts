import { cookies } from "next/headers";
import {
  ensureBillingCustomerForOrganization,
  isBillingConfigured,
} from "@/lib/billing-client";
import { resolveDefaultOrganizationId } from "@/lib/auth-session";
import {
  defaultWorkspaceName,
  GOOGLE_AUTH_PROVIDER,
  type GoogleAuthProfile,
} from "@/lib/google-auth";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const log = createLogger("google-auth");

export type GoogleAuthIntent = {
  nonce: string;
  plan?: string;
  interval?: "monthly" | "yearly";
};

export function encodeGoogleAuthState(intent: GoogleAuthIntent): string {
  return Buffer.from(JSON.stringify(intent), "utf-8").toString("base64url");
}

export function decodeGoogleAuthState(state: string): GoogleAuthIntent | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8")) as GoogleAuthIntent;
    if (!parsed?.nonce || typeof parsed.nonce !== "string") return null;
    return {
      nonce: parsed.nonce,
      plan: typeof parsed.plan === "string" ? parsed.plan : undefined,
      interval: parsed.interval === "monthly" || parsed.interval === "yearly" ? parsed.interval : undefined,
    };
  } catch {
    return null;
  }
}

async function createSessionForUser(userId: string, activeOrganizationId: string | null) {
  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      userId,
      activeOrganizationId,
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
}

async function ensureGoogleIdentity(userId: string, profile: GoogleAuthProfile) {
  await prisma.authIdentity.upsert({
    where: {
      provider_providerUserId: {
        provider: GOOGLE_AUTH_PROVIDER,
        providerUserId: profile.id,
      },
    },
    create: {
      userId,
      provider: GOOGLE_AUTH_PROVIDER,
      providerUserId: profile.id,
      email: profile.email,
    },
    update: {
      email: profile.email,
      updatedAt: new Date(),
    },
  });
}

async function provisionNewGoogleUser(profile: GoogleAuthProfile) {
  const organizationName = defaultWorkspaceName(profile.name);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: profile.name,
        email: profile.email,
        passwordHash: null,
        emailVerified: true,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: organizationName,
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

    await tx.authIdentity.create({
      data: {
        userId: user.id,
        provider: GOOGLE_AUTH_PROVIDER,
        providerUserId: profile.id,
        email: profile.email,
      },
    });

    return {
      userId: user.id,
      organizationId: organization.id,
      organizationName: organization.name,
    };
  });

  if (isBillingConfigured()) {
    try {
      await ensureBillingCustomerForOrganization({
        organizationId: result.organizationId,
        customerName: profile.name,
        primaryEmail: profile.email,
      });
    } catch (error) {
      log.error("failed to register billing customer on Google signup", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await prisma.auditEvent
    .create({
      data: {
        organizationId: result.organizationId,
        actorId: result.userId,
        action: "auth.register",
        metadata: { emailVerified: true, provider: GOOGLE_AUTH_PROVIDER },
      },
    })
    .catch(() => {
      /* non-blocking */
    });

  return result;
}

export async function completeGoogleAuthLogin(
  profile: GoogleAuthProfile,
  intent: GoogleAuthIntent,
): Promise<{ redirectTo: string }> {
  if (!profile.emailVerified) {
    return { redirectTo: "/login?error=oauth_email" };
  }

  const existingIdentity = await prisma.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: GOOGLE_AUTH_PROVIDER,
        providerUserId: profile.id,
      },
    },
    select: { userId: true },
  });

  let userId = existingIdentity?.userId ?? null;
  let isNewUser = false;

  if (!userId) {
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, emailVerified: true },
    });

    if (existingUser) {
      userId = existingUser.id;
      await ensureGoogleIdentity(userId, profile);
      if (!existingUser.emailVerified) {
        await prisma.user.update({
          where: { id: userId },
          data: { emailVerified: true, updatedAt: new Date() },
        });
      }
    } else {
      const created = await provisionNewGoogleUser(profile);
      userId = created.userId;
      isNewUser = true;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, emailVerified: true, accountStatus: true },
  });

  if (!user || user.accountStatus !== "active") {
    return { redirectTo: "/login?error=oauth_failed" };
  }

  let activeOrganizationId =
    (
      await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
        orderBy: { createdAt: "asc" },
      })
    )?.organizationId ?? null;

  if (!activeOrganizationId) {
    activeOrganizationId = await resolveDefaultOrganizationId(user.id);
  }

  await createSessionForUser(user.id, activeOrganizationId);

  if (!isNewUser && activeOrganizationId) {
    await prisma.auditEvent
      .create({
        data: {
          organizationId: activeOrganizationId,
          actorId: user.id,
          action: "auth.login_success",
          metadata: { emailVerified: true, provider: GOOGLE_AUTH_PROVIDER },
        },
      })
      .catch(() => {
        /* non-blocking */
      });
  }

  if (isNewUser) {
    const onboardingQs = new URLSearchParams({ success: "register" });
    if (intent.plan) onboardingQs.set("plan", intent.plan);
    onboardingQs.set(
      "interval",
      intent.interval === "monthly" || intent.interval === "yearly" ? intent.interval : "yearly",
    );
    return { redirectTo: `/onboarding/plan?${onboardingQs.toString()}` };
  }

  if (!user.emailVerified) {
    return {
      redirectTo: `/verify-email/pending?email=${encodeURIComponent(profile.email)}&error=unverified`,
    };
  }

  return { redirectTo: "/dashboard?success=login" };
}
