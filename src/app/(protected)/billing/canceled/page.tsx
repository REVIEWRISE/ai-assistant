import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export default async function BillingCanceledPage() {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;

  if (!organizationId) {
    redirect("/profile?error=organization_required");
  }

  const billing = await getOrgBilling(organizationId);
  if (billing && isBillingAccessAllowed(billing.billingStatus) && billing.billingStatus === "active") {
    redirect("/dashboard");
  }

  const retryHref =
    billing?.billingStatus === "expired" ? "/billing/expired" : "/billing";

  return (
    <div className="py-6">
      <section className="mx-auto max-w-xl rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center shadow-[var(--shadow-md)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
          Payment
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
          Checkout canceled
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          No charge was made. You can pick a plan again whenever you’re ready.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={retryHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Choose a plan
          </Link>
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            Open profile
          </Link>
        </div>
      </section>
    </div>
  );
}
