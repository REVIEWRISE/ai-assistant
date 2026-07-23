"use client";

import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";

export type RemoteCatalogPlan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  billingInterval: string;
  priceAmount: number;
  currencyCode: string;
  trialPeriodDays: number;
  stripePriceId: string | null;
  isActive: boolean;
  isCustomPricing: boolean;
  featured: boolean;
  includedLocations: number;
  teamMemberLimit: number;
  includedVoiceMinutes: number;
  contents: string[];
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
};

type BillingPlansManagerProps = {
  plans: RemoteCatalogPlan[];
  productDisplayName?: string;
  adminUrl: string;
  error?: string | null;
};

function formatMoney(cents: number | null, currencyCode: string): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function BillingPlansManager({
  plans,
  productDisplayName,
  adminUrl,
  error,
}: BillingPlansManagerProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Billing service
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Plan catalog</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}
            </span>
            {!error ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                Live from Billing API
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {productDisplayName
              ? `Showing plans for ${productDisplayName}. `
              : ""}
            Create and edit plans, prices, and entitlements in Billing Admin — this app only reads the catalog.
          </p>
        </div>
        <a
          href={adminUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
        >
          Manage plans in Billing Admin ↗
        </a>
      </div>

      <div className="p-4 lg:p-5">
        {plans.length === 0 ? (
          <DataTable>
            <DataTableEmptyState
              title="No billing plans loaded"
              description="Plans are loaded only from the billing microservice. Fix the API connection or add plans in Billing Admin."
            />
          </DataTable>
        ) : (
          <DataTable>
            <DataTableHeader className="hidden grid-cols-[minmax(0,1.4fr)_7rem_7rem_6rem_minmax(0,1.6fr)] lg:grid">
              <span>Plan</span>
              <span>Monthly</span>
              <span>Yearly</span>
              <span>Trial</span>
              <span>Contains</span>
            </DataTableHeader>
            <DataTableBody>
              {plans.map((plan) => (
                <DataTableRow
                  key={plan.id}
                  className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_7rem_7rem_6rem_minmax(0,1.6fr)] lg:items-start"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-text)]">{plan.name}</p>
                      {plan.featured ? (
                        <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-h)]">
                          Featured
                        </span>
                      ) : null}
                      {plan.isCustomPricing ? (
                        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                          Custom pricing
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{plan.description}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--color-text-subtle)]">
                      {plan.slug}
                      {plan.stripePriceId ? ` · ${plan.stripePriceId}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                      Monthly
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {plan.isCustomPricing && plan.monthlyPriceCents === null
                        ? "Custom"
                        : formatMoney(plan.monthlyPriceCents, plan.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                      Yearly
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {plan.isCustomPricing && plan.yearlyPriceCents === null
                        ? "Custom"
                        : formatMoney(plan.yearlyPriceCents, plan.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                      Trial
                    </p>
                    <p className="text-sm text-[var(--color-text)]">
                      {plan.trialPeriodDays > 0 ? `${plan.trialPeriodDays} days` : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                      Contains
                    </p>
                    <ul className="space-y-1 text-xs text-[var(--color-text-muted)]">
                      {plan.contents.slice(0, 6).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span
                            className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--color-primary)]"
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                      {plan.contents.length > 6 ? (
                        <li className="pl-3 text-[10px] font-semibold text-[var(--color-text-subtle)]">
                          +{plan.contents.length - 6} more
                        </li>
                      ) : null}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                      <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1">
                        {plan.includedLocations} locations
                      </span>
                      <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1">
                        {plan.teamMemberLimit} members
                      </span>
                      <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1">
                        {plan.includedVoiceMinutes} voice min
                      </span>
                    </div>
                  </div>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </div>
    </section>
  );
}
