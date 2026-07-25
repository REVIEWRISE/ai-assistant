import { loadEnvConfig } from "@next/env";
import {
  PLAN_FEATURE_GROUPS,
  type PlanSlug,
} from "../src/lib/pricing-plans";

loadEnvConfig(process.cwd());

const DEFAULT_BILLING_API_URL = "http://localhost:4001/api/v1";
const DEFAULT_PRODUCT_NAME = "agents";

/** Map live Billing plan names → pricing-spec slug. */
const PLAN_NAME_TO_SLUG: Record<string, PlanSlug> = {
  starter: "starter",
  growth: "growth",
  professional: "growth",
  pro: "pro_voice",
  "pro voice": "pro_voice",
  pro_voice: "pro_voice",
  enterprise: "pro_voice",
};

type SeedModuleDef = {
  key: string;
  displayName: string;
  description: string;
};

type BillingModule = {
  id: string;
  key: string;
  displayName: string;
};

type BillingPlan = {
  id: string;
  name: string;
  billingInterval: string;
};

function apiBase(): string {
  return (process.env.BILLING_API_URL?.trim() || DEFAULT_BILLING_API_URL).replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.BILLING_API_KEY?.trim();
  if (!key) throw new Error("BILLING_API_KEY is not set.");
  return key;
}

function productName(): string {
  return process.env.BILLING_PRODUCT_NAME?.trim() || DEFAULT_PRODUCT_NAME;
}

async function billingFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(`${apiBase()}${normalized}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey(),
          ...options.headers,
        },
        cache: "no-store",
      });
      if (res.ok) return res;

      const error = (await res.json().catch(() => ({}))) as {
        detail?: string;
        title?: string;
        message?: string;
      };
      const message = `Billing API ${res.status}: ${error.detail ?? error.title ?? error.message ?? "Unknown"}`;
      // Retry transient upstream failures.
      if ((res.status === 503 || res.status === 429 || res.status >= 500) && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 700));
        lastError = new Error(message);
        continue;
      }
      throw new Error(message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= 4) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }

  throw lastError ?? new Error("Billing API request failed.");
}

function buildModuleDefs(): SeedModuleDef[] {
  const defs: SeedModuleDef[] = [];
  for (const group of PLAN_FEATURE_GROUPS) {
    for (const feature of group.features) {
      defs.push({
        key: feature.key,
        displayName: feature.label,
        description:
          "detail" in feature && typeof feature.detail === "string"
            ? feature.detail
            : `${group.name} · ${feature.label}`,
      });
    }
  }
  return defs;
}

function slugForPlanName(name: string): PlanSlug | null {
  return PLAN_NAME_TO_SLUG[name.trim().toLowerCase()] ?? null;
}

function shouldAttach(slug: PlanSlug, featureKey: string): boolean {
  for (const group of PLAN_FEATURE_GROUPS) {
    const feature = group.features.find((item) => item.key === featureKey);
    if (!feature) continue;
    const value = feature[slug];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
  }
  return false;
}

function featureLimitsFor(
  slug: PlanSlug,
  featureKey: string,
): Array<{ featureKey: string; limitValue: number; unit?: string; isUnlimited?: boolean }> | undefined {
  for (const group of PLAN_FEATURE_GROUPS) {
    const feature = group.features.find((item) => item.key === featureKey);
    if (!feature) continue;
    const value = feature[slug];
    if (typeof value !== "number") return undefined;
    const unit = featureKey.includes("minute")
      ? "minutes/month"
      : featureKey.includes("location")
        ? "locations"
        : featureKey.includes("member")
          ? "users"
          : undefined;
    return [{ featureKey, limitValue: value, unit, isUnlimited: false }];
  }
  return undefined;
}

async function resolveProduct(): Promise<{ id: string; displayName: string }> {
  const res = await billingFetch("/billing/admin/products");
  const body = (await res.json()) as {
    data?: Array<{ id: string; name: string; displayName?: string }>;
  };
  const needle = productName().toLowerCase();
  const match =
    (body.data ?? []).find((item) => item.name.toLowerCase() === needle) ??
    (body.data ?? []).find((item) => (item.displayName ?? "").toLowerCase() === needle);
  if (!match) throw new Error(`No product matched BILLING_PRODUCT_NAME=${productName()}`);
  return { id: match.id, displayName: match.displayName ?? match.name };
}

async function listModules(productId: string): Promise<BillingModule[]> {
  const res = await billingFetch(
    `/billing/modules?productId=${encodeURIComponent(productId)}`,
  );
  const body = (await res.json()) as { data?: BillingModule[] };
  return body.data ?? [];
}

async function listPlans(productId: string): Promise<BillingPlan[]> {
  const res = await billingFetch(`/billing/admin/products/${productId}/detail`);
  const body = (await res.json()) as { plans?: BillingPlan[] };
  return body.plans ?? [];
}

async function createModule(
  productId: string,
  def: SeedModuleDef,
): Promise<BillingModule> {
  const res = await billingFetch("/billing/modules", {
    method: "POST",
    body: JSON.stringify({
      productId,
      key: def.key,
      displayName: def.displayName,
      description: def.description,
      isActive: true,
    }),
  });
  const body = (await res.json()) as { data?: BillingModule } & BillingModule;
  const module = body.data ?? body;
  if (!module.id || !module.key) throw new Error(`Invalid create payload for ${def.key}`);
  return module;
}

async function attachModule(
  planId: string,
  moduleId: string,
  featureLimits?: Array<{
    featureKey: string;
    limitValue: number;
    unit?: string;
    isUnlimited?: boolean;
  }>,
): Promise<void> {
  await billingFetch(`/billing/admin/plans/${encodeURIComponent(planId)}/modules`, {
    method: "POST",
    body: JSON.stringify({
      moduleId,
      ...(featureLimits?.length ? { featureLimits } : {}),
    }),
  });
}

async function ensureModules(
  productId: string,
  existing: BillingModule[],
  defs: SeedModuleDef[] = buildModuleDefs(),
): Promise<Map<string, BillingModule>> {
  const byKey = new Map(existing.map((module) => [module.key, module]));
  for (const def of defs) {
    if (byKey.has(def.key)) {
      console.log(`  · exists  ${def.key}`);
      continue;
    }
    const created = await createModule(productId, def);
    byKey.set(created.key, created);
    console.log(`  + created ${def.key}`);
  }
  return byKey;
}

async function attachForPlans(
  plans: BillingPlan[],
  modulesByKey: Map<string, BillingModule>,
  onlySlug: PlanSlug | null,
) {
  const defs = buildModuleDefs();
  for (const plan of plans) {
    const slug = slugForPlanName(plan.name);
    if (!slug) {
      console.log(`  ! skip plan "${plan.name}" (no pricing-spec mapping)`);
      continue;
    }
    if (onlySlug && slug !== onlySlug) {
      console.log(`  · skip plan "${plan.name}" (only=${onlySlug})`);
      continue;
    }
    console.log(`\nPlan ${plan.name} (${plan.billingInterval}) → ${slug}`);
    for (const def of defs) {
      if (!shouldAttach(slug, def.key)) continue;
      const module = modulesByKey.get(def.key);
      if (!module) continue;
      try {
        await attachModule(plan.id, module.id, featureLimitsFor(slug, def.key));
        console.log(`  ✓ attach ${def.key}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/409|already|exist|duplicate/i.test(message)) {
          console.log(`  · already ${def.key}`);
          continue;
        }
        console.warn(`  ! attach ${def.key}: ${message}`);
      }
    }
  }
}

function parseOnlySlug(): PlanSlug | null {
  const arg = process.argv.find((item) => item.startsWith("--only="));
  if (!arg) return null;
  const value = arg.slice("--only=".length).trim().toLowerCase();
  if (value === "starter" || value === "growth" || value === "pro_voice") return value;
  throw new Error(`Unknown --only=${value}. Use starter | growth | pro_voice`);
}

async function main() {
  const onlySlug = parseOnlySlug();
  console.log(
    onlySlug
      ? `Seeding Billing modules for ${onlySlug} only…`
      : "Seeding Billing modules from VyntRise pricing spec…",
  );
  const product = await resolveProduct();
  console.log(`Product: ${product.displayName} (${product.id})`);

  const defs = buildModuleDefs().filter((def) =>
    onlySlug ? shouldAttach(onlySlug, def.key) : true,
  );
  const existing = await listModules(product.id);
  console.log(`\nEnsuring ${defs.length} catalog modules…`);
  // Temporarily narrow ensure to filtered defs by ensuring only those keys.
  const modulesByKey = await ensureModules(
    product.id,
    existing,
    defs,
  );

  const plans = await listPlans(product.id);
  console.log(`\nAttaching modules across plans…`);
  await attachForPlans(plans, modulesByKey, onlySlug);

  const after = await listModules(product.id).catch(() => null);
  if (after) {
    console.log(`\nDone. Product catalog now has ${after.length} modules.`);
  } else {
    console.log("\nDone. (Could not re-list catalog due to a transient Billing API error.)");
  }
  console.log(
    "Mapping: Starter→starter, Professional/Growth→growth, Enterprise/Pro Voice→pro_voice",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
