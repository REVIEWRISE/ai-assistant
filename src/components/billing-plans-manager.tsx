"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PLAN_FEATURE_GROUPS } from "@/lib/pricing-plans";
import { DataTable, DataTableEmptyState } from "@/components/data-table";

export type ManagedBillingPlan = {
  id: string;
  slug: string;
  name: string;
  positioning: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  trialDays: number;
  includedLocations: number;
  teamMemberLimit: number;
  includedVoiceMinutes: number;
  highlights: string[];
  entitlements: Record<string, unknown>;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  featured: boolean;
  isActive: boolean;
  sortOrder: number;
};

type Modal =
  | { type: "create" }
  | { type: "edit"; plan: ManagedBillingPlan }
  | { type: "delete"; plan: ManagedBillingPlan }
  | null;

type BillingPlansManagerProps = {
  plans: ManagedBillingPlan[];
  onCreate: (formData: FormData) => Promise<void>;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
};

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function BillingPlanActionsMenu({
  plan,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: {
  plan: ManagedBillingPlan;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ bottom: number; left: number } | null>(null);

  function computeMenuPosition(rect: DOMRect) {
    const menuWidth = 260;
    const gap = 8;
    const viewportPadding = 8;
    const bottom = window.innerHeight - rect.top + gap;
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    return { bottom, left };
  }

  function handleTriggerClick() {
    if (isOpen) {
      onClose();
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition(computeMenuPosition(rect));
    onToggle();
  }

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition(computeMenuPosition(rect));
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={`Open billing plan actions for ${plan.name}`}
        title={`Actions for ${plan.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          isOpen
            ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
            : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ bottom: menuPosition.bottom, left: menuPosition.left }}
              className="fixed z-[120] min-w-[16.25rem] max-w-[16.25rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-[var(--shadow-lg)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-[var(--color-primary-soft)]"
              >
                <span className="text-sm font-semibold text-[var(--color-primary-h)]">Edit plan</span>
                <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">Pricing, limits, benefits, and product access</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-[var(--color-danger-soft)]"
              >
                <span className="text-sm font-semibold text-[var(--color-danger)]">Delete plan</span>
                <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">Remove it from admin and public pricing</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function BillingPlansManager({ plans, onCreate, onUpdate, onDelete }: BillingPlansManagerProps) {
  const [modal, setModal] = useState<Modal>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!modal) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [modal]);

  return (
    <>
      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--color-text)]">Payment plans</h2>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
                {plans.length} total
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Manage public prices, availability, limits, benefits, and billing-provider IDs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpenActionMenu(null);
              setModal({ type: "create" });
            }}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Add plan
          </button>
        </div>

        <div className="p-4 lg:p-5">
        <DataTable>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[var(--color-surface)]">
                <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  <th scope="col" className="px-4 py-3">Plan</th>
                  <th scope="col" className="px-4 py-3">Pricing</th>
                  <th scope="col" className="px-4 py-3">Limits</th>
                  <th scope="col" className="px-4 py-3">Trial</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-center">Order</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className={`align-middle transition hover:bg-[var(--color-surface)] ${
                      plan.featured ? "bg-[var(--color-primary-soft)]/30" : ""
                    }`}
                  >
                    <td className="max-w-xs px-4 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--color-text)]">{plan.name}</p>
                        {plan.featured ? (
                          <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase text-[var(--color-primary-h)]">
                            Featured
                          </span>
                        ) : null}
                      </div>
                      <code className="mt-1 block text-[11px] text-[var(--color-text-subtle)]">{plan.slug}</code>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                        {plan.positioning || "No positioning description."}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-semibold text-[var(--color-text)]">{displayDollars(plan.monthlyPriceCents)}<span className="font-normal text-[var(--color-text-muted)]">/mo</span></p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{displayDollars(plan.yearlyPriceCents)}/yr</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--color-text-muted)]">
                      <p><span className="font-semibold text-[var(--color-text)]">{plan.includedLocations}</span> locations</p>
                      <p className="mt-1"><span className="font-semibold text-[var(--color-text)]">{plan.teamMemberLimit}</span> members</p>
                      <p className="mt-1"><span className="font-semibold text-[var(--color-text)]">{plan.includedVoiceMinutes}</span> voice min</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-[var(--color-text)]">{plan.trialDays} days</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                          plan.isActive
                            ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                            : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-[var(--color-text-muted)]">#{plan.sortOrder}</td>
                    <td className="px-4 py-4">
                      <BillingPlanActionsMenu
                        plan={plan}
                        isOpen={openActionMenu === plan.id}
                        onToggle={() => setOpenActionMenu(plan.id)}
                        onClose={() => setOpenActionMenu(null)}
                        onEdit={() => setModal({ type: "edit", plan })}
                        onDelete={() => setModal({ type: "delete", plan })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {plans.length === 0 ? (
            <DataTableEmptyState
              title="No payment plans yet"
              description="Add the first plan to publish pricing."
            />
          ) : null}
        </DataTable>
        </div>
      </section>

      {modal?.type === "create" || modal?.type === "edit" ? (
        <PlanEditor
          plan={modal.type === "edit" ? modal.plan : null}
          action={modal.type === "edit" ? onUpdate : onCreate}
          onClose={() => setModal(null)}
        />
      ) : null}

      {modal?.type === "delete" ? (
        <ModalPortal><div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/55 p-3 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-plan-title"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5"
          >
            <h2 id="delete-plan-title" className="text-lg font-semibold text-[var(--color-text)]">Delete {modal.plan.name}?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
              This removes the plan from this application and the public pricing page. It does not delete a Stripe price or a remote billing-service plan.
            </p>
            <form action={onDelete} className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <input type="hidden" name="id" value={modal.plan.id} />
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[var(--color-danger)] px-3 py-2 text-sm font-semibold text-white"
              >
                Delete plan
              </button>
            </form>
          </div>
        </div></ModalPortal>
      ) : null}
    </>
  );
}

function PlanEditor({
  plan,
  action,
  onClose,
}: {
  plan: ManagedBillingPlan | null;
  action: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-editor-title"
        className="flex h-[92vh] min-h-0 w-full max-w-[min(96vw,90rem)] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div>
            <p className="text-xs font-semibold uppercase leading-5 tracking-[0.18em] text-[var(--color-primary-h)]">Admin billing</p>
            <h2 id="plan-editor-title" className="mt-2 text-lg font-semibold leading-7 text-[var(--color-text)]">
              {plan ? `Edit ${plan.name}` : "Add payment plan"}
            </h2>
            <p className="mt-1.5 text-sm leading-5 text-[var(--color-text-muted)]">
              Configure pricing, usage limits, and the features customers receive.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <form action={action} className="flex min-h-0 flex-1 flex-col">
          {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain border-t border-[var(--color-border)] px-5 py-5 sm:px-6 sm:py-6">
            <FormSection number="1" title="Plan details" description="Name the plan and control how it appears to customers.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Plan name"><input name="name" required defaultValue={plan?.name ?? ""} placeholder="Growth" className="field" /></Field>
                <Field label="Slug" hint="Lowercase letters, numbers, and underscores only."><input name="slug" required pattern="[a-z0-9]+(?:_[a-z0-9]+)*" defaultValue={plan?.slug ?? ""} placeholder="growth" className="field" /></Field>
                <div className="md:col-span-2">
                  <Field label="Customer-facing description" hint="A short sentence shown with the plan on the pricing page."><textarea name="positioning" rows={2} defaultValue={plan?.positioning ?? ""} placeholder="Best for growing teams that need..." className="field" /></Field>
                </div>
                <Field label="Display order" hint="Lower numbers appear first."><input name="sort_order" required type="number" min="0" step="1" defaultValue={plan?.sortOrder ?? 0} className="field" /></Field>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ToggleCard
                  name="is_active"
                  title="Active and public"
                  description="Show this plan on the public pricing page."
                  defaultChecked={plan?.isActive ?? true}
                />
                <ToggleCard
                  name="featured"
                  title="Featured plan"
                  description="Visually highlight this as the recommended plan."
                  defaultChecked={plan?.featured ?? false}
                />
              </div>
            </FormSection>

            <FormSection number="2" title="Pricing &amp; trial" description="Set customer prices in USD and the free-trial period.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Monthly price" prefix="$" suffix="USD"><input name="monthly_price" required type="number" min="0" step="0.01" defaultValue={plan ? dollars(plan.monthlyPriceCents) : ""} placeholder="89.00" className="field field-affixed" /></Field>
                <Field label="Yearly price" prefix="$" suffix="USD"><input name="yearly_price" required type="number" min="0" step="0.01" defaultValue={plan ? dollars(plan.yearlyPriceCents) : ""} placeholder="900.00" className="field field-affixed" /></Field>
                <Field label="Trial period" suffix="days"><input name="trial_days" required type="number" min="0" step="1" defaultValue={plan?.trialDays ?? 14} className="field field-affixed" /></Field>
              </div>
            </FormSection>

            <FormSection number="3" title="Usage limits" description="Define the resources included with this plan.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Locations" suffix="included"><input name="included_locations" required type="number" min="0" step="1" defaultValue={plan?.includedLocations ?? 1} className="field field-affixed" /></Field>
                <Field label="Team members" suffix="members"><input name="team_member_limit" required type="number" min="0" step="1" defaultValue={plan?.teamMemberLimit ?? 1} className="field field-affixed" /></Field>
                <Field label="Voice minutes" suffix="minutes"><input name="included_voice_minutes" required type="number" min="0" step="1" defaultValue={plan?.includedVoiceMinutes ?? 0} className="field field-affixed" /></Field>
              </div>
            </FormSection>

            <FormSection number="4" title="Billing provider" description="Connect the plan to existing Stripe prices. These fields are optional.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Monthly Stripe Price ID" optional><input name="stripe_monthly_price_id" defaultValue={plan?.stripeMonthlyPriceId ?? ""} placeholder="price_..." className="field font-mono text-sm" /></Field>
                <Field label="Yearly Stripe Price ID" optional><input name="stripe_yearly_price_id" defaultValue={plan?.stripeYearlyPriceId ?? ""} placeholder="price_..." className="field font-mono text-sm" /></Field>
              </div>
            </FormSection>

            <FormSection number="5" title="Benefits &amp; product access" description="Explain the plan publicly, then select the capabilities it unlocks.">
              <Field label="Public benefits" hint="Enter one customer-facing benefit per line.">
                <textarea name="highlights" rows={6} defaultValue={plan?.highlights.join("\n") ?? ""} placeholder={"Everything in Starter\nCustomizable web chatbot\nCalendar booking and reminders"} className="field text-sm" />
              </Field>

              <div className="mt-5 border-t border-[var(--color-border)] pt-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-text)]">Product entitlements</h4>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">Open a category and select every feature included in this plan.</p>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-subtle)]">Quantities come from Usage limits.</p>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {PLAN_FEATURE_GROUPS.map((group) => {
                    const booleanFeatures = group.features.filter((feature) => typeof feature.starter === "boolean");
                    if (booleanFeatures.length === 0) return null;
                    const enabledCount = booleanFeatures.filter((feature) => Boolean(plan?.entitlements[feature.key])).length;

                    return (
                      <details key={group.name} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
                          <span>{group.name}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-xs font-normal text-[var(--color-text-muted)]">{enabledCount}/{booleanFeatures.length} selected</span>
                            <span className="text-[var(--color-text-muted)] transition group-open:rotate-180">⌄</span>
                          </span>
                        </summary>
                        <div className="grid gap-1 border-t border-[var(--color-border)] p-2">
                          {booleanFeatures.map((feature) => (
                            <label key={feature.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 text-sm transition hover:bg-[var(--color-surface)] has-[:checked]:border-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] has-[:checked]:bg-[var(--color-primary-soft)]">
                              <StyledCheckbox name={`entitlement_${feature.key}`} defaultChecked={Boolean(plan?.entitlements[feature.key])} />
                              <span className="min-w-0">
                                <span className="block font-medium leading-5 text-[var(--color-text)]">{feature.label}</span>
                                {"detail" in feature && feature.detail ? <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-text-muted)]">{feature.detail}</span> : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            </FormSection>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 sm:flex sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold sm:py-2">Cancel</button>
            <button type="submit" className="vr-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold sm:py-2">{plan ? "Save changes" : "Create plan"}</button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .field { width: 100%; border-radius: 0.75rem; border: 1px solid var(--color-border); background: var(--color-surface); padding: 0.65rem 0.75rem; color: var(--color-text); outline: none; }
        .field-shell { position: relative; }
        .field-shell.has-prefix .field { padding-left: 2rem; }
        .field-shell.has-suffix .field { padding-right: 4.75rem; }
        .field:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent); }
      `}</style>
    </div></ModalPortal>
  );
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
          {number}
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-5 text-[var(--color-text)]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{description}</p>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ToggleCard({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-primary)] has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)]">
      <StyledCheckbox name={name} defaultChecked={defaultChecked} />
      <span>
        <span className="block text-sm font-semibold leading-5 text-[var(--color-text)]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{description}</span>
      </span>
    </label>
  );
}

function StyledCheckbox({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-[var(--color-border)] bg-[var(--color-bg)] text-white shadow-sm transition peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)] peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-bg)]"
      >
        <svg viewBox="0 0 16 16" className="size-3.5 scale-75 opacity-0 transition" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="m3 8 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  );
}

function Field({
  label,
  hint,
  optional = false,
  prefix,
  suffix,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium leading-5 text-[var(--color-text)]">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {optional ? <span className="text-[10px] font-normal uppercase tracking-wide text-[var(--color-text-subtle)]">Optional</span> : null}
      </span>
      <span className={`field-shell mt-1 block ${prefix ? "has-prefix" : ""} ${suffix ? "has-suffix" : ""}`}>
        {prefix ? <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-sm text-[var(--color-text-muted)]">{prefix}</span> : null}
        {children}
        {suffix ? <span className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-xs text-[var(--color-text-muted)]">{suffix}</span> : null}
      </span>
      {hint ? <span className="mt-1.5 block text-xs font-normal leading-relaxed text-[var(--color-text-muted)]">{hint}</span> : null}
    </label>
  );
}
