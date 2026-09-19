"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

type EditorTab = "details" | "features";

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

const PLAN_ORDER = ["starter", "growth", "pro_voice", "professional", "enterprise"];

function formatMoney(cents: number | null, currencyCode: string): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function centsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

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

function modulesForPlan(
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

function planModuleFormData(plan: RemoteCatalogPlan, moduleId: string): FormData {
  const fd = new FormData();
  fd.set("module_id", moduleId);
  fd.set("manage_plan_id", plan.id);
  fd.set("plan_id", plan.id);
  if (plan.monthlyPlanId) fd.set("monthly_plan_id", plan.monthlyPlanId);
  if (plan.yearlyPlanId) fd.set("yearly_plan_id", plan.yearlyPlanId);
  return fd;
}

function priceLabel(plan: RemoteCatalogPlan, interval: "monthly" | "yearly"): string {
  const cents = interval === "monthly" ? plan.monthlyPriceCents : plan.yearlyPriceCents;
  if (plan.isCustomPricing && (cents === null || cents === 0)) return "Custom";
  return formatMoney(cents, plan.currencyCode);
}

export function BillingPlansManager({
  plans,
  productModules,
  productId,
  initialManagePlanId = null,
  onCreateModule,
  onUpdateModule,
  onDeleteModule,
  onAttachModule,
  onDetachModule,
  onUpdatePlan,
  onCreatePlan,
}: BillingPlansManagerProps) {
  const [openPlanId, setOpenPlanId] = useState<string | null>(initialManagePlanId);
  const [creating, setCreating] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>(
    initialManagePlanId ? "features" : "details",
  );
  const [form, setForm] = useState<FormOverlay>(null);

  const orderedPlans = useMemo(() => sortPlans(plans), [plans]);
  const openPlan = useMemo(
    () =>
      openPlanId
        ? (plans.find(
            (plan) =>
              plan.id === openPlanId ||
              plan.monthlyPlanId === openPlanId ||
              plan.yearlyPlanId === openPlanId,
          ) ?? null)
        : null,
    [plans, openPlanId],
  );

  function openPlanEditor(plan: RemoteCatalogPlan, tab: EditorTab = "details") {
    setOpenPlanId(plan.id);
    setEditorTab(tab);
    setCreating(false);
    setForm(null);
  }

  function closeEditor() {
    setOpenPlanId(null);
    setCreating(false);
    setForm(null);
    setEditorTab("details");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Your plans</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Click a plan to change its price or features.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setOpenPlanId(null);
            setForm(null);
          }}
          disabled={!productId}
          className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add plan
        </button>
      </div>

      {orderedPlans.length === 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">No plans yet</p>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
            Create the first plan customers can subscribe to.
          </p>
          {productId ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)]"
            >
              Add plan
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orderedPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => openPlanEditor(plan)}
              className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[var(--color-text)]">{plan.name}</p>
                    {plan.featured ? (
                      <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-h)]">
                        Popular
                      </span>
                    ) : null}
                    {!plan.isActive ? (
                      <span className="rounded-full bg-[var(--color-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                        Hidden
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                    {priceLabel(plan, "monthly")}
                    <span className="ml-1 text-sm font-medium text-[var(--color-text-muted)]">
                      / month
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {priceLabel(plan, "yearly")} / year
                    {plan.trialPeriodDays > 0 ? ` · ${plan.trialPeriodDays}-day trial` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-[var(--color-text-muted)]">
                {plan.modules.length} feature{plan.modules.length === 1 ? "" : "s"} included
              </p>
            </button>
          ))}
        </div>
      )}

      {creating
        ? createPortal(
            <PlanEditor
              mode="create"
              plan={null}
              tab="details"
              onTabChange={() => undefined}
              productModules={[]}
              onClose={closeEditor}
              action={onCreatePlan}
              onAddFeature={() => undefined}
              onEditFeature={() => undefined}
              onDeleteFeature={() => undefined}
              onAttach={onAttachModule}
              onDetach={onDetachModule}
            />,
            document.body,
          )
        : null}

      {openPlan
        ? createPortal(
            <PlanEditor
              mode="edit"
              plan={openPlan}
              tab={editorTab}
              onTabChange={setEditorTab}
              productModules={modulesForPlan(openPlan, productModules, productId)}
              onClose={closeEditor}
              action={onUpdatePlan}
              onAddFeature={() => setForm({ type: "create", planName: openPlan.name })}
              onEditFeature={(module) => setForm({ type: "edit", module })}
              onDeleteFeature={(module) => setForm({ type: "delete", module })}
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
              planName={form.type === "create" ? form.planName : openPlan?.name}
              managePlanId={openPlan?.id}
              onClose={() => setForm(null)}
              action={form.type === "create" ? onCreateModule : onUpdateModule}
            />,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={form?.type === "delete"}
        title="Delete feature"
        description={
          form?.type === "delete"
            ? `This will permanently remove “${form.module.displayName}”.`
            : ""
        }
        confirmLabel="Delete feature"
        pendingLabel="Deleting…"
        onCancel={() => setForm(null)}
        action={onDeleteModule}
        hiddenFields={
          form?.type === "delete"
            ? [
                { name: "id", value: form.module.id },
                ...(openPlan ? [{ name: "manage_plan_id", value: openPlan.id }] : []),
              ]
            : []
        }
      />
    </section>
  );
}

function PlanEditor({
  mode,
  plan,
  tab,
  onTabChange,
  productModules,
  onClose,
  action,
  onAddFeature,
  onEditFeature,
  onDeleteFeature,
  onAttach,
  onDetach,
}: {
  mode: "create" | "edit";
  plan: RemoteCatalogPlan | null;
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  productModules: BillingModule[];
  onClose: () => void;
  action: (formData: FormData) => Promise<void>;
  onAddFeature: () => void;
  onEditFeature: (module: BillingModule) => void;
  onDeleteFeature: (module: BillingModule) => void;
  onAttach: (formData: FormData) => Promise<void>;
  onDetach: (formData: FormData) => Promise<void>;
}) {
  const isCreate = mode === "create";
  const [entered, setEntered] = useState(false);

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
        entered ? "bg-[var(--color-overlay)]" : "bg-transparent"
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
        aria-labelledby="plan-editor-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-[var(--color-border)] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                {isCreate ? "New plan" : "Edit plan"}
              </p>
              <h3
                id="plan-editor-title"
                className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--color-text)]"
              >
                {isCreate ? "Add a plan" : plan?.name}
              </h3>
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

          {!isCreate ? (
            <div
              role="tablist"
              className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-bg)] p-1"
            >
              {(
                [
                  ["details", "Price"],
                  ["features", "Features"],
                ] as const
              ).map(([id, label]) => {
                const selected = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => onTabChange(id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      selected
                        ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </header>

        {isCreate || tab === "details" ? (
          <PlanDetailsForm mode={mode} plan={plan} onClose={onClose} action={action} />
        ) : plan ? (
          <PlanFeaturesList
            plan={plan}
            productModules={productModules}
            onAdd={onAddFeature}
            onEdit={onEditFeature}
            onDelete={onDeleteFeature}
            onAttach={onAttach}
            onDetach={onDetach}
          />
        ) : null}
      </aside>
    </div>
  );
}

function PlanDetailsForm({
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
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [isCustomPricing, setIsCustomPricing] = useState(plan?.isCustomPricing ?? false);
  const [createYearly, setCreateYearly] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const monthlyPlanId = plan?.monthlyPlanId ?? null;
  const yearlyPlanId = plan?.yearlyPlanId ?? null;
  const showMonthly = isCreate || Boolean(monthlyPlanId);
  const showYearly = isCreate ? createYearly : true;

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {!isCreate && monthlyPlanId ? (
        <input type="hidden" name="monthly_plan_id" value={monthlyPlanId} />
      ) : null}
      {!isCreate && yearlyPlanId ? (
        <input type="hidden" name="yearly_plan_id" value={yearlyPlanId} />
      ) : null}
      {!isCreate && plan ? <input type="hidden" name="edit_plan_id" value={plan.id} /> : null}
      {isCreate && createYearly ? <input type="hidden" name="create_yearly" value="on" /> : null}
      {isActive ? <input type="hidden" name="is_active" value="on" /> : null}
      {isCustomPricing ? <input type="hidden" name="is_custom_pricing" value="on" /> : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
          Name
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
            Monthly
            <input
              name="monthly_price"
              type="number"
              min={0}
              step="0.01"
              required={!isCustomPricing && showMonthly}
              disabled={!showMonthly}
              defaultValue={centsToDollarsInput(plan?.monthlyPriceCents ?? null)}
              placeholder="39"
              className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[var(--color-raised)]`}
            />
          </label>
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
            Yearly
            <input
              name="yearly_price"
              type="number"
              min={0}
              step="0.01"
              required={!isCustomPricing && showYearly && (isCreate || Boolean(yearlyPlanId))}
              disabled={!showYearly}
              defaultValue={centsToDollarsInput(plan?.yearlyPriceCents ?? null)}
              placeholder="396"
              className={`${fieldClass} disabled:cursor-not-allowed disabled:bg-[var(--color-raised)]`}
            />
          </label>
        </div>

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
            Free trial (days)
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

        {isCreate ? (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm">
            <span>
              <span className="font-semibold text-[var(--color-text)]">Offer yearly billing</span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                Customers can pay once per year.
              </span>
            </span>
            <input
              type="checkbox"
              checked={createYearly}
              onChange={(event) => setCreateYearly(event.target.checked)}
              className="size-4 accent-[var(--color-primary)]"
            />
          </label>
        ) : null}

        <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm">
          <span>
            <span className="font-semibold text-[var(--color-text)]">Visible to customers</span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
              Turn off to hide this plan from checkout.
            </span>
          </span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm">
          <span>
            <span className="font-semibold text-[var(--color-text)]">Contact sales for price</span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
              Use this for custom quotes instead of a listed price.
            </span>
          </span>
          <input
            type="checkbox"
            checked={isCustomPricing}
            onChange={(event) => setIsCustomPricing(event.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
        </label>

        {isCreate ? (
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {showAdvanced ? "Hide advanced" : "Stripe price IDs"}
            </button>
            {showAdvanced ? (
              <div className="mt-3 grid grid-cols-1 gap-3">
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
                    className={`${fieldClass} font-mono text-[13px] disabled:cursor-not-allowed disabled:bg-[var(--color-raised)]`}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : plan?.stripePriceId ? (
          <p className="break-all font-mono text-[11px] text-[var(--color-text-subtle)]">
            Stripe · {plan.stripePriceId}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
        <PlanEditActions mode={mode} onClose={onClose} />
      </div>
    </form>
  );
}

function PlanFeaturesList({
  plan,
  productModules,
  onAdd,
  onEdit,
  onDelete,
  onAttach,
  onDetach,
}: {
  plan: RemoteCatalogPlan;
  productModules: BillingModule[];
  onAdd: () => void;
  onEdit: (module: BillingModule) => void;
  onDelete: (module: BillingModule) => void;
  onAttach: (formData: FormData) => Promise<void>;
  onDetach: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const planModuleIds = useMemo(
    () => new Set(plan.modules.map((module) => module.id)),
    [plan.modules],
  );
  const planModuleKeys = useMemo(
    () => new Set(plan.modules.map((module) => module.key)),
    [plan.modules],
  );

  function isOnPlan(module: BillingModule) {
    return planModuleIds.has(module.id) || planModuleKeys.has(module.key);
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = productModules.filter((module) => {
      if (!needle) return true;
      return (
        module.displayName.toLowerCase().includes(needle) ||
        module.key.toLowerCase().includes(needle)
      );
    });
    return [...rows].sort((a, b) => {
      const aOn = isOnPlan(a) ? 0 : 1;
      const bOn = isOnPlan(b) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [productModules, query, planModuleIds, planModuleKeys]);

  const includedCount = productModules.filter(isOnPlan).length;

  function toggle(module: BillingModule) {
    const onPlan = isOnPlan(module);
    const fd = planModuleFormData(plan, module.id);
    setPendingId(module.id);
    startTransition(async () => {
      try {
        await (onPlan ? onDetach(fd) : onAttach(fd));
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-[var(--color-border)] px-5 py-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {includedCount} of {productModules.length} features on this plan. Flip a switch to
          include or remove one.
        </p>
        <label className="relative block">
          <span className="sr-only">Search features</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {productModules.length === 0 ? "No features yet" : "No matching features"}
            </p>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              {productModules.length === 0
                ? "Add a feature, then turn it on for this plan."
                : "Try another search."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {filtered.map((module) => {
              const onPlan = isOnPlan(module);
              const pending = pendingId === module.id;
              return (
                <li key={module.id} className="group flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {module.displayName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(module)}
                        className="font-medium hover:text-[var(--color-text)]"
                      >
                        Rename
                      </button>
                      <span className="mx-1.5 text-[var(--color-border)]">·</span>
                      <button
                        type="button"
                        onClick={() => onDelete(module)}
                        className="font-medium hover:text-[var(--color-danger)]"
                      >
                        Delete
                      </button>
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onPlan}
                    aria-label={
                      onPlan
                        ? `Remove ${module.displayName} from this plan`
                        : `Add ${module.displayName} to this plan`
                    }
                    disabled={pending}
                    onClick={() => toggle(module)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                      onPlan ? "bg-emerald-500" : "bg-[var(--color-border)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        onPlan ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
        >
          Add a new feature
        </button>
      </div>
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
        className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:opacity-70"
      >
        {pending ? (isCreate ? "Creating…" : "Saving…") : isCreate ? "Create plan" : "Save plan"}
      </button>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-overlay)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2
              id="feature-dialog-title"
              className="text-base font-semibold text-[var(--color-text)]"
            >
              {isEdit ? "Rename feature" : "Add a feature"}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {isEdit
                ? "This name is what customers see on pricing."
                : planName
                  ? `Create a feature you can turn on for ${planName} and other plans.`
                  : "Create a feature you can turn on for plans."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)]"
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
            Name
            <input
              name="display_name"
              required
              defaultValue={module?.displayName ?? ""}
              placeholder="AI Responses"
              className={fieldClass}
            />
          </label>
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
            Internal key
            <input
              name="key"
              required={!isEdit}
              readOnly={isEdit}
              defaultValue={module?.key ?? ""}
              placeholder="ai_responses"
              className={`${fieldClass} font-mono text-[13px] ${isEdit ? "cursor-not-allowed bg-[var(--color-raised)] text-[var(--color-text-muted)]" : ""}`}
            />
          </label>
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
            Description
            <textarea
              name="description"
              rows={2}
              defaultValue={module?.description ?? ""}
              placeholder="Optional"
              className={fieldClass}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-[var(--color-text)]">Available to attach</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 accent-[var(--color-primary)]"
            />
          </label>
          <ModuleFormActions isEdit={isEdit} onClose={onClose} />
        </form>
      </div>
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
        className="rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-fg)] disabled:opacity-70"
      >
        {pending ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save" : "Create feature"}
      </button>
    </div>
  );
}
