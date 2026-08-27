"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { TableRowActionsMenu } from "@/components/table-row-actions-menu";
import type { BillingModule, BillingPlanModule } from "@/lib/billing-client";

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
  monthlyPlanId?: string | null;
  yearlyPlanId?: string | null;
  modules: BillingPlanModule[];
};

type FormOverlay =
  | { type: "create"; planName?: string }
  | { type: "edit"; module: BillingModule | BillingPlanModule }
  | { type: "delete"; module: BillingModule | BillingPlanModule }
  | null;

type BillingPlansManagerProps = {
  plans: RemoteCatalogPlan[];
  productModules: BillingModule[];
  productId?: string;
  productDisplayName?: string;
  initialManagePlanId?: string | null;
  onCreateModule: (formData: FormData) => Promise<void>;
  onUpdateModule: (formData: FormData) => Promise<void>;
  onDeleteModule: (formData: FormData) => Promise<void>;
  onAttachModule: (formData: FormData) => Promise<void>;
  onDetachModule: (formData: FormData) => Promise<void>;
  onUpdatePlan: (formData: FormData) => Promise<void>;
  onCreatePlan: (formData: FormData) => Promise<void>;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-normal text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]";

function formatMoney(cents: number | null, currencyCode: string): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function moduleLimit(
  modules: BillingPlanModule[],
  keys: string[],
): number | null {
  for (const billingModule of modules) {
    if (keys.includes(billingModule.key)) {
      const limit = billingModule.featureLimits[0];
      if (!limit) continue;
      if (limit.isUnlimited) return Number.POSITIVE_INFINITY;
      return limit.limitValue;
    }
    for (const limit of billingModule.featureLimits) {
      if (!keys.includes(limit.featureKey)) continue;
      if (limit.isUnlimited) return Number.POSITIVE_INFINITY;
      return limit.limitValue;
    }
  }
  return null;
}

function formatLimit(value: number | null, singular: string, plural: string): string {
  if (value === null) return `— ${plural}`;
  if (!Number.isFinite(value)) return `Unlimited ${plural}`;
  return `${value} ${value === 1 ? singular : plural}`;
}

const PLAN_ORDER = ["starter", "growth", "pro_voice", "professional", "enterprise"];

function sortPlans(plans: RemoteCatalogPlan[]): RemoteCatalogPlan[] {
  return [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.slug);
    const bi = PLAN_ORDER.indexOf(b.slug);
    const aRank = ai === -1 ? 99 : ai;
    const bRank = bi === -1 ? 99 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

function resolveEditableModule(
  module: BillingModule | BillingPlanModule,
  productModules: BillingModule[],
  productId?: string,
): BillingModule {
  const fromCatalog = productModules.find((item) => item.id === module.id);
  if (fromCatalog) return fromCatalog;
  return {
    id: module.id,
    productId: productId ?? ("productId" in module ? module.productId : ""),
    key: module.key,
    displayName: module.displayName,
    description: "description" in module ? (module.description ?? null) : null,
    isActive: module.isActive,
    createdAt: null,
    updatedAt: null,
  };
}

/** Prefer product catalog; always include plan attachments so Manage never looks empty. */
function modulesForManageSheet(
  plan: RemoteCatalogPlan,
  productModules: BillingModule[],
  productId?: string,
): BillingModule[] {
  const byId = new Map<string, BillingModule>();
  for (const billingModule of productModules) byId.set(billingModule.id, billingModule);
  for (const billingModule of plan.modules) {
    if (byId.has(billingModule.id)) continue;
    byId.set(billingModule.id, resolveEditableModule(billingModule, productModules, productId));
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

export function BillingPlansManager({
  plans,
  productModules,
  productId,
  productDisplayName,
  initialManagePlanId = null,
  onCreateModule,
  onUpdateModule,
  onDeleteModule,
  onAttachModule,
  onDetachModule,
  onUpdatePlan,
  onCreatePlan,
}: BillingPlansManagerProps) {
  const [managingPlanId, setManagingPlanId] = useState<string | null>(initialManagePlanId);

  useEffect(() => {
    if (initialManagePlanId) setManagingPlanId(initialManagePlanId);
  }, [initialManagePlanId]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [form, setForm] = useState<FormOverlay>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const managedPlan = useMemo(
    () =>
      managingPlanId
        ? (plans.find((plan) => plan.id === managingPlanId) ?? null)
        : null,
    [plans, managingPlanId],
  );

  const editingPlan = useMemo(() => {
    if (!editingPlanId) return null;
    return (
      plans.find(
        (plan) =>
          plan.id === editingPlanId ||
          plan.monthlyPlanId === editingPlanId ||
          plan.yearlyPlanId === editingPlanId,
      ) ?? null
    );
  }, [plans, editingPlanId]);

  function openManage(plan: RemoteCatalogPlan) {
    setManagingPlanId(plan.id);
    setEditingPlanId(null);
    setCreatingPlan(false);
    setForm(null);
  }

  function closeManage() {
    setManagingPlanId(null);
    setForm(null);
  }

  function openEdit(plan: RemoteCatalogPlan) {
    setEditingPlanId(plan.id);
    setManagingPlanId(null);
    setCreatingPlan(false);
    setForm(null);
  }

  function closeEdit() {
    setEditingPlanId(null);
  }

  function openCreate() {
    setCreatingPlan(true);
    setEditingPlanId(null);
    setManagingPlanId(null);
    setForm(null);
  }

  function closeCreate() {
    setCreatingPlan(false);
  }

  const orderedPlans = useMemo(() => sortPlans(plans), [plans]);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Billing service
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Plan catalog</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {productDisplayName ? `Plans for ${productDisplayName}. ` : ""}
            Edit plans and manage feature modules from the Billing service.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            disabled={!productId}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add plan
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-5">
        {orderedPlans.length === 0 ? (
          <DataTable>
            <DataTableEmptyState
              title="No billing plans loaded"
              description="Create the first plan here, or fix the Billing API connection if plans should already exist."
              action={
                productId ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)]"
                  >
                    Add plan
                  </button>
                ) : null
              }
            />
          </DataTable>
        ) : (
          <DataTable>
            <DataTableHeader className="hidden grid-cols-[64px_minmax(0,1.5fr)_6.5rem_6.5rem_minmax(0,1.2fr)_3rem] lg:grid">
              <span>Index</span>
              <span>Plan</span>
              <span>Monthly</span>
              <span>Yearly</span>
              <span>Modules</span>
              <span className="sr-only">Actions</span>
            </DataTableHeader>
            <DataTableBody>
              {orderedPlans.map((plan, index) => {
                const locations = moduleLimit(plan.modules, [
                  "locations",
                  "max_locations",
                  "included_locations",
                ]);
                const members = moduleLimit(plan.modules, [
                  "team_members",
                  "max_team_members",
                  "team_member_limit",
                ]);
                const voice = moduleLimit(plan.modules, [
                  "included_calling_minutes",
                  "voice_minutes",
                  "included_voice_minutes",
                ]);
                const preview = plan.modules.slice(0, 3);
                const remaining = Math.max(0, plan.modules.length - preview.length);
                const monthlyLabel =
                  plan.isCustomPricing &&
                  (plan.monthlyPriceCents === null || plan.monthlyPriceCents === 0)
                    ? "Custom"
                    : formatMoney(plan.monthlyPriceCents, plan.currencyCode);
                const yearlyLabel =
                  plan.isCustomPricing &&
                  (plan.yearlyPriceCents === null || plan.yearlyPriceCents === 0)
                    ? "Custom"
                    : formatMoney(plan.yearlyPriceCents, plan.currencyCode);

                return (
                  <DataTableRow
                    key={plan.id}
                    className="grid grid-cols-1 gap-3 lg:grid-cols-[64px_minmax(0,1.5fr)_6.5rem_6.5rem_minmax(0,1.2fr)_3rem] lg:items-center"
                  >
                    <div className="text-xs font-semibold text-[var(--color-text-muted)] lg:text-sm">
                      <span className="inline-flex min-w-[40px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
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
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {plan.trialPeriodDays > 0
                          ? `${plan.trialPeriodDays}-day trial`
                          : "No trial"}
                        {" · "}
                        {[
                          formatLimit(locations, "location", "locations"),
                          formatLimit(members, "member", "members"),
                          voice && voice > 0
                            ? formatLimit(voice, "voice min", "voice mins")
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                        Monthly
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{monthlyLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                        Yearly
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{yearlyLabel}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] lg:hidden">
                        Modules
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-[var(--color-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
                          {plan.modules.length} attached
                        </span>
                        {preview.map((module) => (
                          <span
                            key={module.id}
                            className="max-w-[9rem] truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]"
                            title={module.displayName}
                          >
                            {module.displayName}
                          </span>
                        ))}
                        {remaining > 0 ? (
                          <span className="text-[10px] font-semibold text-[var(--color-text-subtle)]">
                            +{remaining}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <TableRowActionsMenu
                        label={plan.name}
                        isOpen={openMenuId === plan.id}
                        onToggle={() =>
                          setOpenMenuId((current) => (current === plan.id ? null : plan.id))
                        }
                        onClose={() => setOpenMenuId(null)}
                        actions={[
                          {
                            id: "edit",
                            label: "Edit plan",
                            description: "Update name, prices, trial, and status",
                            onClick: () => openEdit(plan),
                          },
                          {
                            id: "manage",
                            label: "Manage modules",
                            description: "Browse and edit the product catalog",
                            onClick: () => openManage(plan),
                          },
                        ]}
                      />
                    </div>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </div>

      {creatingPlan
        ? createPortal(
            <PlanEditSheet
              mode="create"
              plan={null}
              onClose={closeCreate}
              action={onCreatePlan}
            />,
            document.body,
          )
        : null}

      {editingPlan
        ? createPortal(
            <PlanEditSheet
              mode="edit"
              plan={editingPlan}
              onClose={closeEdit}
              action={onUpdatePlan}
            />,
            document.body,
          )
        : null}

      {managedPlan
        ? createPortal(
            <PlanModulesPanel
              plan={managedPlan}
              productModules={modulesForManageSheet(
                managedPlan,
                productModules,
                productId,
              )}
              dimmed={Boolean(form)}
              onClose={closeManage}
              onAdd={() => setForm({ type: "create", planName: managedPlan.name })}
              onEdit={(module) => setForm({ type: "edit", module })}
              onDelete={(module) => setForm({ type: "delete", module })}
              onAttach={onAttachModule}
              onDetach={onDetachModule}
            />,
            document.body,
          )
        : null}

      {form?.type === "create" || form?.type === "edit"
        ? createPortal(
            <ModuleFormModal
              module={
                form.type === "edit"
                  ? resolveEditableModule(form.module, productModules, productId)
                  : null
              }
              planName={form.type === "create" ? form.planName : managedPlan?.name}
              managePlanId={managedPlan?.id}
              onClose={() => setForm(null)}
              action={form.type === "create" ? onCreateModule : onUpdateModule}
            />,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={form?.type === "delete"}
        title="Delete module"
        description={
          form?.type === "delete"
            ? `This will permanently remove “${form.module.displayName}” (${form.module.key}).`
            : ""
        }
        confirmLabel="Delete module"
        pendingLabel="Deleting…"
        onCancel={() => setForm(null)}
        action={onDeleteModule}
        hiddenFields={
          form?.type === "delete"
            ? [
                { name: "id", value: form.module.id },
                ...(managedPlan
                  ? [{ name: "manage_plan_id", value: managedPlan.id }]
                  : []),
              ]
            : []
        }
      />
    </section>
  );
}

type ModuleSheetFilter = "all" | "on_plan" | "catalog";

function centsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

function PlanEditSheet({
  mode,
  plan,
  onClose,
  action,
}: {
  mode: "create" | "edit";
  plan: RemoteCatalogPlan | null;
  onClose: () => void;
  action: (formData: FormData) => Promise<void>;
}) {
  const isCreate = mode === "create";
  const [entered, setEntered] = useState(false);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [isCustomPricing, setIsCustomPricing] = useState(plan?.isCustomPricing ?? false);
  const [createYearly, setCreateYearly] = useState(true);
  const monthlyPlanId = plan?.monthlyPlanId ?? null;
  const yearlyPlanId = plan?.yearlyPlanId ?? null;
  const showMonthly = isCreate || Boolean(monthlyPlanId);
  const showYearly = isCreate ? createYearly : true;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
        entered
          ? "bg-[var(--color-overlay)]"
          : "bg-transparent"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-edit-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-[var(--color-border)] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                {isCreate ? "Add plan" : "Edit plan"}
              </p>
              <h3
                id="plan-edit-title"
                className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--color-text)]"
              >
                {isCreate ? "New billing plan" : plan?.name}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                {isCreate
                  ? "Create a monthly plan, optionally with a yearly price."
                  : "Update pricing and trial for monthly and yearly billing intervals."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
        </header>

        <form action={action} className="flex min-h-0 flex-1 flex-col">
          {!isCreate && monthlyPlanId ? (
            <input type="hidden" name="monthly_plan_id" value={monthlyPlanId} />
          ) : null}
          {!isCreate && yearlyPlanId ? (
            <input type="hidden" name="yearly_plan_id" value={yearlyPlanId} />
          ) : null}
          {!isCreate && plan ? (
            <input type="hidden" name="edit_plan_id" value={plan.id} />
          ) : null}
          {isCreate && createYearly ? (
            <input type="hidden" name="create_yearly" value="on" />
          ) : null}
          {isActive ? <input type="hidden" name="is_active" value="on" /> : null}
          {isCustomPricing ? (
            <input type="hidden" name="is_custom_pricing" value="on" />
          ) : null}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Plan name
              <input
                name="name"
                required
                defaultValue={plan?.name ?? ""}
                placeholder="Starter"
                className={fieldClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                Currency
                <input
                  name="currency_code"
                  required
                  defaultValue={plan?.currencyCode || "USD"}
                  maxLength={3}
                  className={`${fieldClass} uppercase`}
                />
              </label>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                Trial days
                <input
                  name="trial_period_days"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={plan?.trialPeriodDays ?? 14}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                Monthly price
                <input
                  name="monthly_price"
                  type="number"
                  min={0}
                  step="0.01"
                  required={!isCustomPricing && showMonthly}
                  disabled={!showMonthly}
                  defaultValue={centsToDollarsInput(plan?.monthlyPriceCents ?? null)}
                  placeholder={showMonthly ? "29" : "—"}
                  className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[var(--color-raised)] disabled:text-[var(--color-text-muted)]`}
                />
                <span className="mt-1.5 block text-[10px] font-normal text-[var(--color-text-subtle)]">
                  Amount in major units (e.g. 29 = $29). Sent as cents to Billing.
                </span>
              </label>
              <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                Yearly price
                <input
                  name="yearly_price"
                  type="number"
                  min={0}
                  step="0.01"
                  required={!isCustomPricing && showYearly && (isCreate || Boolean(yearlyPlanId))}
                  disabled={!showYearly}
                  defaultValue={centsToDollarsInput(plan?.yearlyPriceCents ?? null)}
                  placeholder={showYearly ? "290" : "—"}
                  className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[var(--color-raised)] disabled:text-[var(--color-text-muted)]`}
                />
                <span className="mt-1.5 block text-[10px] font-normal text-[var(--color-text-subtle)]">
                  {isCreate
                    ? "Optional — enable yearly below. Use monthly equivalent (e.g. 33) or annual total (e.g. 396)."
                    : yearlyPlanId
                      ? "Monthly equivalent when billed yearly (e.g. 33), or annual total (e.g. 396)."
                      : "No yearly plan yet — enter a price to create yearly billing."}
                </span>
              </label>
            </div>

            {isCreate ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                  Monthly Stripe price ID
                  <input
                    name="monthly_stripe_price_id"
                    placeholder="price_…"
                    className={`${fieldClass} font-mono text-[13px]`}
                  />
                </label>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                  Yearly Stripe price ID
                  <input
                    name="yearly_stripe_price_id"
                    placeholder="price_…"
                    disabled={!createYearly}
                    className={`${fieldClass} font-mono text-[13px] disabled:cursor-not-allowed disabled:bg-[var(--color-raised)] disabled:text-[var(--color-text-muted)]`}
                  />
                </label>
              </div>
            ) : null}

            {isCreate ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3">
                <ModuleStatusToggle
                  isActive={createYearly}
                  onToggle={() => setCreateYearly((current) => !current)}
                  activeLabel="Include yearly"
                  inactiveLabel="Monthly only"
                  activeHint="Also create a yearly billing interval for this plan."
                  inactiveHint="Create only the monthly billing interval."
                />
              </div>
            ) : null}

            {!isCreate && plan?.stripePriceId ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Stripe price
                </p>
                <p className="mt-1 break-all font-mono text-xs text-[var(--color-text)]">
                  {plan.stripePriceId}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">
                  Stripe price IDs are managed in Billing Admin.
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3">
              <ModuleStatusToggle
                isActive={isActive}
                onToggle={() => setIsActive((current) => !current)}
                activeLabel="Active"
                inactiveLabel="Inactive"
                activeHint="This plan can be offered to customers."
                inactiveHint="This plan is hidden from new checkouts."
              />
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3">
              <ModuleStatusToggle
                isActive={isCustomPricing}
                onToggle={() => setIsCustomPricing((current) => !current)}
                activeLabel="Custom pricing"
                inactiveLabel="Fixed pricing"
                activeHint="Show as custom / contact sales. Prices can be zero."
                inactiveHint="Use the monthly and yearly amounts above."
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
            <PlanEditActions mode={mode} onClose={onClose} />
          </div>
        </form>
      </aside>
    </div>
  );
}

function PlanEditActions({
  mode,
  onClose,
}: {
  mode: "create" | "edit";
  onClose: () => void;
}) {
  const { pending } = useFormStatus();
  const isCreate = mode === "create";

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:cursor-wait disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? (
          <>
            <span
              className="size-3.5 animate-spin rounded-full border-2 border-[var(--color-primary-fg)] border-r-transparent"
              aria-hidden
            />
            {isCreate ? "Creating…" : "Saving…"}
          </>
        ) : isCreate ? (
          "Create plan"
        ) : (
          "Save plan"
        )}
      </button>
    </div>
  );
}

function formatPlanLimit(module: BillingPlanModule | undefined): string | null {
  const limits = module?.featureLimits ?? [];
  if (!limits.length) return null;
  return limits
    .map((limit) => {
      if (limit.isUnlimited) return `${limit.featureKey}: unlimited`;
      const unit = limit.unit ? ` ${limit.unit}` : "";
      return `${limit.featureKey}: ${limit.limitValue}${unit}`;
    })
    .join(" · ");
}

function PlanModulesPanel({
  plan,
  productModules,
  dimmed,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onAttach,
  onDetach,
}: {
  plan: RemoteCatalogPlan;
  productModules: BillingModule[];
  dimmed?: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (module: BillingModule) => void;
  onDelete: (module: BillingModule) => void;
  onAttach: (formData: FormData) => Promise<void>;
  onDetach: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ModuleSheetFilter>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const planModuleByKey = useMemo(() => {
    const map = new Map<string, BillingPlanModule>();
    for (const billingModule of plan.modules) map.set(billingModule.key, billingModule);
    return map;
  }, [plan.modules]);
  const planModuleIds = useMemo(
    () => new Set(plan.modules.map((module) => module.id)),
    [plan.modules],
  );

  function isOnPlan(module: BillingModule) {
    return planModuleIds.has(module.id) || planModuleByKey.has(module.key);
  }

  const onPlanCount = productModules.filter(isOnPlan).length;
  const catalogOnlyCount = productModules.length - onPlanCount;

  const filteredModules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return productModules.filter((module) => {
      const onPlan = planModuleIds.has(module.id) || planModuleByKey.has(module.key);
      if (filter === "on_plan" && !onPlan) return false;
      if (filter === "catalog" && onPlan) return false;
      if (!needle) return true;
      return (
        module.displayName.toLowerCase().includes(needle) ||
        module.key.toLowerCase().includes(needle) ||
        (module.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [productModules, query, filter, planModuleIds, planModuleByKey]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !dimmed) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose, dimmed]);

  const filters: Array<{ id: ModuleSheetFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: productModules.length },
    { id: "on_plan", label: "On plan", count: onPlanCount },
    { id: "catalog", label: "Catalog only", count: catalogOnlyCount },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
        entered
          ? "bg-[var(--color-overlay)]"
          : "bg-transparent"
      } ${dimmed ? "opacity-90" : ""}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
        disabled={dimmed}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modules-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-[var(--color-border)] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                Manage modules
              </p>
              <h3
                id="plan-modules-title"
                className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--color-text)]"
              >
                {plan.name}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                Modules on this plan drive “what’s included” on pricing, onboarding, and checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold tabular-nums text-[var(--color-text)]">
              {productModules.length}
            </span>{" "}
            in catalog
            <span className="mx-2 text-[var(--color-border)]">·</span>
            <span className="font-semibold tabular-nums text-[var(--color-text)]">{onPlanCount}</span>{" "}
            on this plan
            {plan.monthlyPriceCents !== null || plan.isCustomPricing ? (
              <>
                <span className="mx-2 text-[var(--color-border)]">·</span>
                {plan.isCustomPricing && plan.monthlyPriceCents === null
                  ? "Custom pricing"
                  : `${formatMoney(plan.monthlyPriceCents, plan.currencyCode)} / mo`}
              </>
            ) : null}
          </p>
        </header>

        <div className="shrink-0 space-y-3 border-b border-[var(--color-border)] px-5 py-3">
          <label className="relative block">
            <span className="sr-only">Search modules</span>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-subtle)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or key"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
            />
          </label>

          <div
            role="tablist"
            aria-label="Filter modules"
            className="flex gap-1 border-b border-[var(--color-border)]"
          >
            {filters.map((item) => {
              const selected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(item.id)}
                  className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition ${
                    selected
                      ? "border-[var(--color-primary)] text-[var(--color-text)]"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 tabular-nums text-[var(--color-text-subtle)]">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredModules.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M4 7h16M4 12h10M4 17h7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {productModules.length === 0
                  ? "No modules in the catalog"
                  : filter === "on_plan"
                    ? "Nothing attached to this plan"
                    : "No matching modules"}
              </p>
              <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-[var(--color-text-muted)]">
                {productModules.length === 0
                  ? "Add a feature module to the product catalog, then attach it to this plan."
                  : filter === "on_plan"
                    ? "Attach a catalog module to include it on this plan’s pricing."
                    : "Try another search or filter."}
              </p>
              {productModules.length === 0 ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="mt-5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
                >
                  Add first module
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {filteredModules.map((module) => {
                const onPlan = isOnPlan(module);
                const planModule =
                  planModuleByKey.get(module.key) ??
                  plan.modules.find((item) => item.id === module.id);
                const limitLabel = formatPlanLimit(planModule);

                return (
                  <li
                    key={module.id}
                    className="group px-5 py-3.5 transition hover:bg-[var(--color-bg)]"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          module.isActive
                            ? "bg-emerald-500"
                            : "bg-[var(--color-border)]"
                        }`}
                        title={module.isActive ? "Active" : "Inactive"}
                        aria-label={module.isActive ? "Active" : "Inactive"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {module.displayName}
                          </p>
                          {onPlan ? (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary-h)]">
                              On plan
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
                              Catalog
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--color-text-subtle)]">
                          {module.key}
                        </p>
                        {module.description ? (
                          <p className="mt-1.5 line-clamp-2 text-xs text-[var(--color-text-muted)]">
                            {module.description}
                          </p>
                        ) : null}
                        {limitLabel ? (
                          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
                            Limit · {limitLabel}
                          </p>
                        ) : null}
                      </div>
                      <TableRowActionsMenu
                        label={module.displayName}
                        isOpen={openMenuId === module.id}
                        onToggle={() =>
                          setOpenMenuId((current) => (current === module.id ? null : module.id))
                        }
                        onClose={() => setOpenMenuId(null)}
                        actions={[
                          onPlan
                            ? {
                                id: "detach",
                                label: "Remove from plan",
                                description: "Hide from pricing “what's included”",
                                onClick: () => {
                                  const fd = new FormData();
                                  fd.set("module_id", module.id);
                                  fd.set("manage_plan_id", plan.id);
                                  fd.set("plan_id", plan.id);
                                  if (plan.monthlyPlanId) {
                                    fd.set("monthly_plan_id", plan.monthlyPlanId);
                                  }
                                  if (plan.yearlyPlanId) {
                                    fd.set("yearly_plan_id", plan.yearlyPlanId);
                                  }
                                  void onDetach(fd);
                                },
                              }
                            : {
                                id: "attach",
                                label: "Add to plan",
                                description: "Show on pricing “what's included”",
                                onClick: () => {
                                  const fd = new FormData();
                                  fd.set("module_id", module.id);
                                  fd.set("manage_plan_id", plan.id);
                                  fd.set("plan_id", plan.id);
                                  if (plan.monthlyPlanId) {
                                    fd.set("monthly_plan_id", plan.monthlyPlanId);
                                  }
                                  if (plan.yearlyPlanId) {
                                    fd.set("yearly_plan_id", plan.yearlyPlanId);
                                  }
                                  void onAttach(fd);
                                },
                              },
                          {
                            id: "edit",
                            label: "Edit module",
                            description: "Update name, description, or status",
                            onClick: () => onEdit(module),
                          },
                          {
                            id: "delete",
                            label: "Delete module",
                            description: "Permanently remove this feature",
                            danger: true,
                            onClick: () => onDelete(module),
                          },
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            <span className="text-base leading-none" aria-hidden>
              +
            </span>
            Add module
          </button>
        </div>
      </aside>
    </div>
  );
}

function ModuleFormModal({
  module,
  planName,
  managePlanId,
  onClose,
  action,
}: {
  module: BillingModule | null;
  planName?: string;
  managePlanId?: string;
  onClose: () => void;
  action: (formData: FormData) => Promise<void>;
}) {
  const isEdit = Boolean(module);
  const [isActive, setIsActive] = useState(module?.isActive ?? true);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Platform settings
            </p>
            <h2
              id="module-dialog-title"
              className="mt-1 text-base font-semibold text-[var(--color-text)]"
            >
              {isEdit ? "Edit module" : "Add a module"}
            </h2>
            <p className="mt-1 text-xs font-normal text-[var(--color-text-muted)]">
              {isEdit
                ? "Update display name, description, or active status."
                : planName
                  ? `Create a feature module for ${planName}.`
                  : "Create a product feature module."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <form action={action} className="space-y-3.5 p-5">
          {module ? <input type="hidden" name="id" value={module.id} /> : null}
          {managePlanId ? (
            <input type="hidden" name="manage_plan_id" value={managePlanId} />
          ) : null}
          {isActive ? <input type="hidden" name="is_active" value="on" /> : null}
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
            Display name
            <input
              name="display_name"
              required
              defaultValue={module?.displayName ?? ""}
              placeholder="AI Responses"
              className={fieldClass}
            />
          </label>
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
            Key
            <input
              name="key"
              required={!isEdit}
              readOnly={isEdit}
              defaultValue={module?.key ?? ""}
              placeholder="ai_responses"
              className={`${fieldClass} font-mono text-[13px] ${isEdit ? "cursor-not-allowed bg-[var(--color-raised)] text-[var(--color-text-muted)]" : ""}`}
            />
            <span className="mt-1.5 block text-[10px] font-normal text-[var(--color-text-subtle)]">
              Stable slug for entitlements. Use lowercase letters, numbers, dots, dashes, or
              underscores.
            </span>
          </label>
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
            Description
            <textarea
              name="description"
              rows={3}
              defaultValue={module?.description ?? ""}
              placeholder="Optional description of what this feature unlocks"
              className={fieldClass}
            />
          </label>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3">
            <ModuleStatusToggle isActive={isActive} onToggle={() => setIsActive((current) => !current)} />
          </div>

          <ModuleFormActions isEdit={isEdit} onClose={onClose} />
        </form>
      </div>
    </div>
  );
}

function ModuleStatusToggle({
  isActive,
  onToggle,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  activeHint = "This module can be attached to plans and entitlements.",
  inactiveHint = "This module is disabled and hidden from new plan attachments.",
}: {
  isActive: boolean;
  onToggle: () => void;
  activeLabel?: string;
  inactiveLabel?: string;
  activeHint?: string;
  inactiveHint?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Status
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
            }`}
          >
            {isActive ? activeLabel : inactiveLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {isActive ? activeHint : inactiveHint}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? `Turn off ${activeLabel}` : `Turn on ${activeLabel}`}
        disabled={pending}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-wait disabled:opacity-60 ${
          isActive ? "bg-emerald-500" : "bg-[var(--color-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            isActive ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function ModuleFormActions({
  isEdit,
  onClose,
}: {
  isEdit: boolean;
  onClose: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:cursor-wait disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? (
          <>
            <span
              className="size-3.5 animate-spin rounded-full border-2 border-[var(--color-primary-fg)] border-r-transparent"
              aria-hidden
            />
            {isEdit ? "Saving…" : "Creating…"}
          </>
        ) : isEdit ? (
          "Save changes"
        ) : (
          "Create module"
        )}
      </button>
    </div>
  );
}
