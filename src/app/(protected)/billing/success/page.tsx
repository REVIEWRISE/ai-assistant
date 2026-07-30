import { redirect } from "next/navigation";
import { BillingSuccessClient } from "@/components/billing-success-client";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { requireSession } from "@/lib/auth-session";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";
import { PRODUCT_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = (await searchParams) ?? {};
  const organizationId = session.activeOrganizationId;

  if (!organizationId) {
    redirect("/profile?error=organization_required");
  }

  const billing = await getOrgBilling(organizationId);
  if (billing && isBillingAccessAllowed(billing.billingStatus) && billing.billingStatus === "active") {
    redirect("/dashboard?success=subscription_active");
  }

  const workspaceName = session.activeOrganization?.name ?? null;

  return (
    <div className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />

      <div className="relative flex min-h-[100dvh] flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
        <header className="flex w-full items-center justify-between gap-3">
          <BrandLogo
            href="/dashboard"
            size="sm"
            primary={PRODUCT_NAME}
            secondary="Billing"
            className="min-w-0 [&_p:last-child]:hidden sm:[&_p:last-child]:block"
          />
          <ThemeSwitch className="shrink-0" />
        </header>

        <div className="flex flex-1 items-start justify-center py-8 sm:items-center sm:py-12">
          <BillingSuccessClient
            sessionId={params.session_id ?? null}
            workspaceName={workspaceName}
          />
        </div>
      </div>
    </div>
  );
}
