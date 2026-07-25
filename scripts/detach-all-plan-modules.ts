/**
 * Detach ALL modules from every Billing plan for the agents product.
 *
 * Usage:
 *   npx tsx scripts/detach-all-plan-modules.ts           # dry-run
 *   npx tsx scripts/detach-all-plan-modules.ts --apply
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const DEFAULT_BILLING_API_URL = "http://localhost:4001/api/v1";
const DEFAULT_PRODUCT_NAME = "agents";

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

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY: detach ALL modules from plans" : "DRY-RUN: pass --apply to execute.\n");

  const product = await resolveProduct();
  console.log(`Product: ${product.displayName} (${product.id})\n`);

  const plans = await listPlans(product.id);
  let total = 0;
  let detached = 0;

  for (const plan of plans) {
    const modules = await listPlanModules(plan.id);
    total += modules.length;
    console.log(`${plan.name} (${plan.billingInterval}): ${modules.length} modules`);
    for (const billingModule of modules) {
      console.log(`  - ${billingModule.key}`);
      if (!apply) continue;
      try {
        await detachModule(plan.id, billingModule.id);
        detached += 1;
        console.log(`    ✓ detached`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`    ! ${message}`);
      }
    }
  }

  console.log(
    `\nSummary: ${apply ? `detached ${detached}/${total}` : `would detach ${total}`} module attachments.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
