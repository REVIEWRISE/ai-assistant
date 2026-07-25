/**
 * Detach legacy / junk modules from Billing plans, keeping only VyntRise
 * pricing-spec feature keys from PLAN_FEATURE_GROUPS.
 *
 * Usage:
 *   npx tsx scripts/cleanup-legacy-plan-modules.ts           # dry-run
 *   npx tsx scripts/cleanup-legacy-plan-modules.ts --apply   # detach + delete catalog orphans
 *   npx tsx scripts/cleanup-legacy-plan-modules.ts --apply --keep-catalog
 */
import { loadEnvConfig } from "@next/env";
import { PLAN_FEATURE_GROUPS } from "../src/lib/pricing-plans";

loadEnvConfig(process.cwd());

const DEFAULT_BILLING_API_URL = "http://localhost:4001/api/v1";
const DEFAULT_PRODUCT_NAME = "agents";

const PRICING_SPEC_KEYS: Set<string> = new Set(
  PLAN_FEATURE_GROUPS.flatMap((group) => group.features.map((feature) => feature.key)),
);

type BillingModule = { id: string; key: string; displayName: string };
type BillingPlan = { id: string; name: string; billingInterval: string };
type PlanModule = { id: string; key: string; displayName: string };

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
      if (res.ok || res.status === 204) return res;

      const error = (await res.json().catch(() => ({}))) as {
        detail?: string;
        title?: string;
        message?: string;
      };
      const message = `Billing API ${res.status}: ${error.detail ?? error.title ?? error.message ?? "Unknown"}`;
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

async function listPlans(productId: string): Promise<BillingPlan[]> {
  const res = await billingFetch(`/billing/admin/products/${productId}/detail`);
  const body = (await res.json()) as { plans?: BillingPlan[] };
  return body.plans ?? [];
}

async function listCatalog(productId: string): Promise<BillingModule[]> {
  const res = await billingFetch(
    `/billing/modules?productId=${encodeURIComponent(productId)}&limit=100`,
  );
  const body = (await res.json()) as { data?: BillingModule[] };
  return body.data ?? [];
}

async function listPlanModules(planId: string): Promise<PlanModule[]> {
  const res = await billingFetch(`/billing/admin/plans/${encodeURIComponent(planId)}`);
  const body = (await res.json()) as { modules?: PlanModule[] };
  return body.modules ?? [];
}

async function detachModule(planId: string, moduleId: string): Promise<void> {
  await billingFetch(
    `/billing/admin/plans/${encodeURIComponent(planId)}/modules/${encodeURIComponent(moduleId)}`,
    { method: "DELETE" },
  );
}

async function deleteCatalogModule(moduleId: string): Promise<void> {
  await billingFetch(`/billing/admin/modules/${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const keepCatalog = process.argv.includes("--keep-catalog");

  console.log(
    apply
      ? "APPLY: detach legacy modules from plans" +
          (keepCatalog ? " (keep catalog orphans)" : " + delete catalog orphans")
      : "DRY-RUN: no changes. Pass --apply to execute.",
  );
  console.log(`Keeping ${PRICING_SPEC_KEYS.size} pricing-spec keys.\n`);

  const product = await resolveProduct();
  console.log(`Product: ${product.displayName} (${product.id})`);

  const plans = await listPlans(product.id);
  const detachedKeys = new Set<string>();
  let detachCount = 0;

  for (const plan of plans) {
    const modules = await listPlanModules(plan.id);
    const legacy = modules.filter((module) => !PRICING_SPEC_KEYS.has(module.key));
    console.log(
      `\n${plan.name} (${plan.billingInterval}): ${modules.length} attached, ${legacy.length} legacy`,
    );
    for (const module of legacy) {
      console.log(`  - ${module.key} (${module.displayName})`);
      if (apply) {
        try {
          await detachModule(plan.id, module.id);
          console.log(`    ✓ detached`);
          detachCount += 1;
          detachedKeys.add(module.key);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`    ! detach failed: ${message}`);
        }
      } else {
        detachedKeys.add(module.key);
      }
    }
  }

  const catalog = await listCatalog(product.id);
  const orphanCatalog = catalog.filter((module) => !PRICING_SPEC_KEYS.has(module.key));
  console.log(`\nCatalog orphans (not pricing-spec): ${orphanCatalog.length}`);
  for (const module of orphanCatalog) {
    console.log(`  - ${module.key}`);
  }

  let deletedCount = 0;
  if (apply && !keepCatalog) {
    console.log("\nDeleting catalog orphans…");
    for (const module of orphanCatalog) {
      try {
        await deleteCatalogModule(module.id);
        console.log(`  ✓ deleted ${module.key}`);
        deletedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  ! delete ${module.key}: ${message}`);
      }
    }
  }

  console.log(
    `\nSummary: ${apply ? "detached" : "would detach"} ${apply ? detachCount : Array.from(detachedKeys).length} plan attachments` +
      (apply && !keepCatalog ? `, deleted ${deletedCount} catalog modules` : "") +
      ".",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
