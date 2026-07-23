"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { PLAN_FEATURE_GROUPS } from "@/lib/pricing-plans";

const ADMIN_PATH = "/platform/billing-plans";

function requiredText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string): string | null {
  const value = requiredText(formData, key);
  return value || null;
}

function nonNegativeInteger(formData: FormData, key: string): number | null {
  const value = Number(requiredText(formData, key));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function moneyToCents(formData: FormData, key: string): number | null {
  const raw = requiredText(formData, key);
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function parseEntitlements(
  formData: FormData,
  includedLocations: number,
  teamMemberLimit: number,
  includedVoiceMinutes: number,
): Prisma.InputJsonObject {
  const entitlements: Record<string, boolean | number> = {
    locations: includedLocations,
    team_members: teamMemberLimit,
    included_calling_minutes: includedVoiceMinutes,
  };

  for (const group of PLAN_FEATURE_GROUPS) {
    for (const feature of group.features) {
      if (typeof feature.starter === "boolean") {
        entitlements[feature.key] = formData.get(`entitlement_${feature.key}`) === "on";
      }
    }
  }

  return entitlements as Prisma.InputJsonObject;
}

function parsePlanInput(formData: FormData) {
  const slug = requiredText(formData, "slug").toLowerCase();
  const name = requiredText(formData, "name");
  const positioning = requiredText(formData, "positioning");
  const monthlyPriceCents = moneyToCents(formData, "monthly_price");
  const yearlyPriceCents = moneyToCents(formData, "yearly_price");
  const trialDays = nonNegativeInteger(formData, "trial_days");
  const includedLocations = nonNegativeInteger(formData, "included_locations");
  const teamMemberLimit = nonNegativeInteger(formData, "team_member_limit");
  const includedVoiceMinutes = nonNegativeInteger(formData, "included_voice_minutes");
  const sortOrder = nonNegativeInteger(formData, "sort_order");
  const highlights = requiredText(formData, "highlights")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (
    !name ||
    !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(slug) ||
    monthlyPriceCents === null ||
    yearlyPriceCents === null ||
    trialDays === null ||
    includedLocations === null ||
    teamMemberLimit === null ||
    includedVoiceMinutes === null ||
    sortOrder === null
  ) {
    return null;
  }

  const entitlements = parseEntitlements(
    formData,
    includedLocations,
    teamMemberLimit,
    includedVoiceMinutes,
  );

  return {
    slug,
    name,
    positioning,
    monthlyPriceCents,
    yearlyPriceCents,
    currency: "USD",
    trialDays,
    includedLocations,
    teamMemberLimit,
    includedVoiceMinutes,
    highlights,
    entitlements,
    stripeMonthlyPriceId: optionalText(formData, "stripe_monthly_price_id"),
    stripeYearlyPriceId: optionalText(formData, "stripe_yearly_price_id"),
    featured: formData.get("featured") === "on",
    isActive: formData.get("is_active") === "on",
    sortOrder,
  } satisfies Prisma.BillingPlanUncheckedCreateInput;
}

async function saveFeaturedExclusively(
  input: Prisma.BillingPlanUncheckedCreateInput,
  operation: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  await prisma.$transaction(async (tx) => {
    if (input.featured) {
      await tx.billingPlan.updateMany({ data: { featured: false } });
    }
    await operation(tx);
  });
}

function refreshPricing() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/");
}

export async function createBillingPlan(formData: FormData) {
  await requireAdminSession();

  let input: ReturnType<typeof parsePlanInput>;
  try {
    input = parsePlanInput(formData);
  } catch {
    redirect(`${ADMIN_PATH}?error=invalid_json`);
  }
  if (!input) redirect(`${ADMIN_PATH}?error=invalid`);

  try {
    await saveFeaturedExclusively(input, async (tx) => {
      await tx.billingPlan.create({ data: input });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`${ADMIN_PATH}?error=duplicate`);
    }
    redirect(`${ADMIN_PATH}?error=create_failed`);
  }

  refreshPricing();
  redirect(`${ADMIN_PATH}?success=created`);
}

export async function updateBillingPlan(formData: FormData) {
  await requireAdminSession();

  const id = requiredText(formData, "id");
  let input: ReturnType<typeof parsePlanInput>;
  try {
    input = parsePlanInput(formData);
  } catch {
    redirect(`${ADMIN_PATH}?error=invalid_json`);
  }
  if (!id || !input) redirect(`${ADMIN_PATH}?error=invalid`);

  try {
    await saveFeaturedExclusively(input, async (tx) => {
      await tx.billingPlan.update({ where: { id }, data: input });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`${ADMIN_PATH}?error=duplicate`);
    }
    redirect(`${ADMIN_PATH}?error=update_failed`);
  }

  refreshPricing();
  redirect(`${ADMIN_PATH}?success=updated`);
}

export async function deleteBillingPlan(formData: FormData) {
  await requireAdminSession();
  const id = requiredText(formData, "id");
  if (!id) redirect(`${ADMIN_PATH}?error=invalid`);

  try {
    await prisma.billingPlan.delete({ where: { id } });
  } catch {
    redirect(`${ADMIN_PATH}?error=delete_failed`);
  }

  refreshPricing();
  redirect(`${ADMIN_PATH}?success=deleted`);
}
