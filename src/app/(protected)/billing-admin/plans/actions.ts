"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  attachBillingModuleToPlan,
  createBillingModule,
  createBillingPlan,
  deleteBillingModule,
  detachBillingModuleFromPlan,
  findBillingPlanForInterval,
  getBillingPlanDetail,
  isBillingConfigured,
  resolveBillingProduct,
  updateBillingModule,
  updateBillingPlan,
} from "@/lib/billing-client";

const ADMIN_PATH = "/billing-admin/plans";

// Billing catalog admin actions aren't scoped to a single organization —
// audit events still require an organizationId, so use the same null-org
// sentinel already established in src/app/login/actions.ts.
const PLATFORM_AUDIT_ORG_ID = "00000000-0000-0000-0000-000000000000";

async function logAdminAudit(actorId: string, action: string, metadata: Prisma.InputJsonObject) {
  await prisma.auditEvent
    .create({
      data: { organizationId: PLATFORM_AUDIT_ORG_ID, actorId, action, metadata },
    })
    .catch(() => {/* non-blocking */});
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function moneyToCents(raw: string): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function intField(formData: FormData, key: string, fallback = 0): number {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : fallback;
}

function refresh() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/");
}

function redirectResult(_formData: FormData, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  redirect(`${ADMIN_PATH}?${qs.toString()}`);
}

export async function createModuleAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const key = text(formData, "key").toLowerCase().replace(/\s+/g, "_");
  const displayName = text(formData, "display_name");
  const description = text(formData, "description") || null;
  const isActive = formData.get("is_active") === "on";

  if (!key || !displayName || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(key)) {
    redirectResult(formData, { error: "invalid" });
  }

  const product = await resolveBillingProduct();
  if (!product) redirectResult(formData, { error: "product_missing" });

  try {
    await createBillingModule({
      productId: product!.id,
      key,
      displayName,
      description,
      isActive,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("409") || message.includes("already") || message.includes("duplicate")) {
      redirectResult(formData, { error: "duplicate" });
    }
    redirectResult(formData, { error: "create_failed" });
  }

  await logAdminAudit(session.userId, "billing_admin.module_created", { key, displayName });
  refresh();
  redirectResult(formData, { success: "created" });
}

export async function updateModuleAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const id = text(formData, "id");
  const displayName = text(formData, "display_name");
  const description = text(formData, "description") || null;
  const isActive = formData.get("is_active") === "on";

  if (!id || !displayName) redirectResult(formData, { error: "invalid" });

  try {
    await updateBillingModule(id, {
      displayName,
      description,
      isActive,
    });
  } catch {
    redirectResult(formData, { error: "update_failed" });
  }

  await logAdminAudit(session.userId, "billing_admin.module_updated", { id, displayName, isActive });
  refresh();
  redirectResult(formData, { success: "updated" });
}

export async function deleteModuleAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const id = text(formData, "id");
  if (!id) redirectResult(formData, { error: "invalid" });

  try {
    await deleteBillingModule(id);
  } catch {
    redirectResult(formData, { error: "delete_failed" });
  }

  await logAdminAudit(session.userId, "billing_admin.module_deleted", { id });
  refresh();
  redirectResult(formData, { success: "deleted" });
}

export async function updatePlanAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const monthlyPlanId = text(formData, "monthly_plan_id");
  const yearlyPlanId = text(formData, "yearly_plan_id");
  const name = text(formData, "name");
  const currencyCode = (text(formData, "currency_code") || "USD").toUpperCase();
  const trialPeriodDays = intField(formData, "trial_period_days");
  const isActive = formData.get("is_active") === "on";
  const isCustomPricing = formData.get("is_custom_pricing") === "on";
  const monthlyCents = moneyToCents(text(formData, "monthly_price"));
  const yearlyCents = moneyToCents(text(formData, "yearly_price"));

  if (!name || (!monthlyPlanId && !yearlyPlanId)) {
    redirectResult(formData, { error: "plan_invalid" });
  }

  if (!isCustomPricing) {
    if (monthlyPlanId && monthlyCents === null) {
      redirectResult(formData, { error: "plan_invalid" });
    }
    if (yearlyPlanId && yearlyCents === null) {
      redirectResult(formData, { error: "plan_invalid" });
    }
  }

  const shared = {
    name,
    currencyCode,
    trialPeriodDays,
    isActive,
    isCustomPricing,
  };

  try {
    if (monthlyPlanId) {
      await updateBillingPlan(monthlyPlanId, {
        ...shared,
        priceAmount: isCustomPricing ? (monthlyCents ?? 0) : (monthlyCents as number),
      });
    }
    if (yearlyPlanId) {
      await updateBillingPlan(yearlyPlanId, {
        ...shared,
        priceAmount: isCustomPricing ? (yearlyCents ?? 0) : (yearlyCents as number),
      });
    } else if (yearlyCents !== null) {
      const product = await resolveBillingProduct();
      if (!product) redirectResult(formData, { error: "product_missing" });
      const existingYearly = await findBillingPlanForInterval(
        product!.id,
        name,
        "yearly",
      );
      const yearly = existingYearly
        ? await updateBillingPlan(existingYearly.id, {
            ...shared,
            priceAmount: yearlyCents,
            isActive,
          })
        : await createBillingPlan({
            productId: product!.id,
            name,
            billingInterval: "yearly",
            priceAmount: yearlyCents,
            currencyCode,
            trialPeriodDays,
          });
      if (!existingYearly) {
        await updateBillingPlan(yearly.id, { isActive, isCustomPricing });
      }
      if (!existingYearly && monthlyPlanId) {
        try {
          const detail = await getBillingPlanDetail(monthlyPlanId);
          for (const billingModule of detail.modules) {
            await attachBillingModuleToPlan(
              yearly.id,
              billingModule.id,
              billingModule.featureLimits.map((limit) => ({
                featureKey: limit.featureKey,
                limitValue: limit.limitValue,
                unit: limit.unit ?? undefined,
                isUnlimited: limit.isUnlimited,
              })),
            );
          }
        } catch {
          // Price row can exist without module copy; attach later from Manage modules.
        }
      }
    }
  } catch {
    redirectResult(formData, { error: "plan_update_failed" });
  }

  await logAdminAudit(session.userId, "billing_admin.plan_updated", {
    monthlyPlanId: monthlyPlanId || null,
    yearlyPlanId: yearlyPlanId || null,
    name,
  });
  refresh();
  // Stay on plans list after save (clear edit sheet).
  const qs = new URLSearchParams({ success: "plan_updated" });
  redirect(`${ADMIN_PATH}?${qs.toString()}`);
}

export async function detachModuleFromPlanAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const moduleId = text(formData, "module_id");
  const managePlanId = text(formData, "manage_plan_id");
  const planId = text(formData, "plan_id");
  const monthlyPlanId = text(formData, "monthly_plan_id");
  const yearlyPlanId = text(formData, "yearly_plan_id");
  const planIds = [
    ...new Set([monthlyPlanId, yearlyPlanId, planId].filter(Boolean)),
  ];

  if (!moduleId || planIds.length === 0) {
    redirectResult(formData, {
      error: "attach_failed",
      ...(managePlanId ? { manage: managePlanId } : {}),
    });
  }

  try {
    for (const id of planIds) {
      await detachBillingModuleFromPlan(id, moduleId);
    }
  } catch {
    redirectResult(formData, {
      error: "detach_failed",
      ...(managePlanId ? { manage: managePlanId } : {}),
    });
  }

  await logAdminAudit(session.userId, "billing_admin.module_detached", {
    moduleId,
    planIds,
  });
  refresh();
  redirectResult(formData, {
    success: "module_detached",
    ...(managePlanId ? { manage: managePlanId } : {}),
  });
}

export async function attachModuleToPlanAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const moduleId = text(formData, "module_id");
  const managePlanId = text(formData, "manage_plan_id");
  const planId = text(formData, "plan_id");
  const monthlyPlanId = text(formData, "monthly_plan_id");
  const yearlyPlanId = text(formData, "yearly_plan_id");
  const planIds = [
    ...new Set([monthlyPlanId, yearlyPlanId, planId].filter(Boolean)),
  ];

  if (!moduleId || planIds.length === 0) {
    redirectResult(formData, {
      error: "attach_failed",
      ...(managePlanId ? { manage: managePlanId } : {}),
    });
  }

  try {
    for (const id of planIds) {
      await attachBillingModuleToPlan(id, moduleId);
    }
  } catch {
    redirectResult(formData, {
      error: "attach_failed",
      ...(managePlanId ? { manage: managePlanId } : {}),
    });
  }

  await logAdminAudit(session.userId, "billing_admin.module_attached", {
    moduleId,
    planIds,
  });
  refresh();
  redirectResult(formData, {
    success: "module_attached",
    ...(managePlanId ? { manage: managePlanId } : {}),
  });
}

export async function createPlanAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!isBillingConfigured()) redirectResult(formData, { error: "not_configured" });

  const name = text(formData, "name");
  const currencyCode = text(formData, "currency_code") || "usd";
  const trialPeriodDays = intField(formData, "trial_period_days");
  const isActive = formData.get("is_active") === "on";
  const isCustomPricing = formData.get("is_custom_pricing") === "on";
  const createYearly = formData.get("create_yearly") === "on";
  const monthlyCents = moneyToCents(text(formData, "monthly_price"));
  const yearlyCents = moneyToCents(text(formData, "yearly_price"));
  const monthlyStripePriceId = text(formData, "monthly_stripe_price_id") || null;
  const yearlyStripePriceId = text(formData, "yearly_stripe_price_id") || null;

  const product = await resolveBillingProduct();
  if (!product) redirect(`${ADMIN_PATH}?error=product_missing`);

  if (!name) redirect(`${ADMIN_PATH}?error=plan_invalid`);
  if (monthlyCents === null) redirect(`${ADMIN_PATH}?error=plan_invalid`);
  if (createYearly && yearlyCents === null) {
    redirect(`${ADMIN_PATH}?error=plan_invalid`);
  }

  try {
    const monthly = await createBillingPlan({
      productId: product!.id,
      name,
      billingInterval: "monthly",
      priceAmount: monthlyCents as number,
      currencyCode,
      trialPeriodDays,
      stripePriceId: monthlyStripePriceId,
    });
    await updateBillingPlan(monthly.id, { isActive, isCustomPricing });

    if (createYearly) {
      const yearly = await createBillingPlan({
        productId: product!.id,
        name,
        billingInterval: "yearly",
        priceAmount: yearlyCents as number,
        currencyCode,
        trialPeriodDays,
        stripePriceId: yearlyStripePriceId,
      });
      await updateBillingPlan(yearly.id, { isActive, isCustomPricing });
    }
  } catch {
    redirect(`${ADMIN_PATH}?error=plan_create_failed`);
  }

  await logAdminAudit(session.userId, "billing_admin.plan_created", { name, createYearly });
  refresh();
  redirect(`${ADMIN_PATH}?success=plan_created`);
}
