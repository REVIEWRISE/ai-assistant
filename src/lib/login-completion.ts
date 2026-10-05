import "server-only";

import { redirect } from "next/navigation";
import { resolveDefaultOrganizationId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { resetFailedLogins } from "@/lib/account-lockout";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { getOrgBilling, billingRedirectForStatus } from "@/lib/entitlements";
import { createUserSession } from "@/lib/session-token";

/** Statuses an admin sets to revoke access (see users/actions.ts, which also ends their sessions). */
export function isAccountBlocked(accountStatus: string): boolean {
  const status = accountStatus.trim().toLowerCase();
  return status === "suspended" || status === "inactive";
}

/**
 * Final step of an email/password sign-in (after the password and, if enabled, the
 * two-step code have been verified): create the session, audit, and redirect.
 */
export async function finishCredentialsLogin(
  user: { id: string; email: string; emailVerified: boolean; accountStatus: string },
  options: { twoFactor?: boolean } = {},
): Promise<never> {
  if (isAccountBlocked(user.accountStatus)) {
    redirect("/login?error=suspended");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });

  let activeOrganizationId = membership?.organizationId ?? null;
  if (!activeOrganizationId) {
    activeOrganizationId = await resolveDefaultOrganizationId(user.id);
  }

  await createUserSession(user.id, activeOrganizationId, "credentials");

  // Audit successful login
  if (activeOrganizationId) {
    await prisma.auditEvent.create({
      data: {
        organizationId: activeOrganizationId,
        actorId: user.id,
        action: "auth.login_success",
        metadata: { emailVerified: user.emailVerified, twoFactor: Boolean(options.twoFactor) },
      },
    }).catch(() => {/* non-blocking */});
  }

  await resetFailedLogins(user.id);

  if (!user.emailVerified) {
    redirect(
      `/verify-email/pending?email=${encodeURIComponent(user.email)}&error=unverified`,
    );
  }

  if (activeOrganizationId && !(await userHasAdminRole(user.id))) {
    const billing = await getOrgBilling(activeOrganizationId);
    const billingHome = billing ? billingRedirectForStatus(billing.billingStatus) : null;
    if (billingHome) redirect(`${billingHome}?success=login`);
  }

  redirect("/dashboard?success=login");
}
