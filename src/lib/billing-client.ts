import "server-only";

const DEFAULT_BILLING_API_URL = "http://localhost:4001/api/v1";
const DEFAULT_PRODUCT_NAME = "agents";

export type BillingProduct = {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isActive?: boolean;
};

export type BillingRemotePlan = {
  id: string;
  name: string;
  billingInterval: string;
  priceAmount: number;
  currencyCode: string;
  trialPeriodDays: number;
  stripePriceId: string | null;
  isActive: boolean;
  isCustomPricing: boolean;
  /** Optional marketing / limit fields when the API includes them. */
  description?: string | null;
  featureLimits?: Array<{ key: string; value: number | string | boolean }>;
  highlights?: string[];
};

export type BillingProductDetail = {
  product: BillingProduct;
  plans: BillingRemotePlan[];
  stats?: Record<string, unknown>;
};

export function getBillingApiUrl(): string {
  return (process.env.BILLING_API_URL?.trim() || DEFAULT_BILLING_API_URL).replace(/\/$/, "");
}

export function getBillingApiKey(): string | null {
  const key = process.env.BILLING_API_KEY?.trim();
  return key || null;
}

export function getBillingProductName(): string {
  return process.env.BILLING_PRODUCT_NAME?.trim() || DEFAULT_PRODUCT_NAME;
}

export function getBillingAdminUrl(): string {
  const explicit = process.env.BILLING_ADMIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  // Derive a portal root from the API base (strip /api/v1).
  return getBillingApiUrl().replace(/\/api\/v1$/i, "") || "https://billing.vyntrise.com";
}

export function isBillingConfigured(): boolean {
  return Boolean(getBillingApiKey());
}

export async function billingFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const apiKey = getBillingApiKey();
  if (!apiKey) {
    throw new Error("Billing API key is not configured (BILLING_API_KEY).");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(`${getBillingApiUrl()}${normalizedPath}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
          ...options.headers,
        },
        cache: "no-store",
      });

      if (res.ok) return res;

      const error = (await res.json().catch(() => ({}))) as {
        detail?: string;
        title?: string;
      };
      const message = `Billing API error ${res.status}: ${error.detail ?? error.title ?? "Unknown"}`;
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        lastError = new Error(message);
        await new Promise((resolve) => setTimeout(resolve, attempt * 650));
        continue;
      }
      throw new Error(message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= 4 || /Billing API error (4\d\d)/.test(lastError.message)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 650));
    }
  }

  throw lastError ?? new Error("Billing API request failed.");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePlan(raw: unknown): BillingRemotePlan | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const name = asString(row.name);
  if (!id || !name) return null;

  const featureLimitsRaw = Array.isArray(row.featureLimits) ? row.featureLimits : [];
  const featureLimits = featureLimitsRaw
    .map((item) => {
      const limit = asRecord(item);
      if (!limit) return null;
      const key = asString(limit.key);
      if (!key) return null;
      return { key, value: limit.value as number | string | boolean };
    })
    .filter((item): item is { key: string; value: number | string | boolean } => Boolean(item));

  const highlights = Array.isArray(row.highlights)
    ? row.highlights.map((item) => String(item)).filter(Boolean)
    : undefined;

  return {
    id,
    name,
    billingInterval: asString(row.billingInterval) ?? "monthly",
    priceAmount: asNumber(row.priceAmount),
    currencyCode: asString(row.currencyCode) ?? "USD",
    trialPeriodDays: asNumber(row.trialPeriodDays),
    stripePriceId: asString(row.stripePriceId),
    isActive: asBoolean(row.isActive, true),
    isCustomPricing: asBoolean(row.isCustomPricing),
    description: asString(row.description) ?? asString(row.positioning),
    featureLimits: featureLimits.length ? featureLimits : undefined,
    highlights,
  };
}

export async function listBillingProducts(): Promise<BillingProduct[]> {
  const res = await billingFetch("/billing/admin/products");
  const body = (await res.json()) as { data?: unknown };
  const rows = Array.isArray(body.data) ? body.data : [];
  const products: BillingProduct[] = [];

  for (const item of rows) {
    const row = asRecord(item);
    if (!row) continue;
    const id = asString(row.id);
    const name = asString(row.name);
    if (!id || !name) continue;
    products.push({
      id,
      name,
      displayName: asString(row.displayName) ?? name,
      description: asString(row.description),
      isActive: asBoolean(row.isActive, true),
    });
  }

  return products;
}

export async function resolveBillingProduct(
  productName = getBillingProductName(),
): Promise<BillingProduct | null> {
  const products = await listBillingProducts();
  const needle = productName.trim().toLowerCase();
  return (
    products.find((product) => product.name.toLowerCase() === needle) ??
    products.find((product) => product.displayName.toLowerCase() === needle) ??
    null
  );
}

export async function getBillingProductDetail(
  productId: string,
): Promise<BillingProductDetail> {
  const res = await billingFetch(`/billing/admin/products/${productId}/detail`);
  const body = (await res.json()) as {
    product?: unknown;
    plans?: unknown;
    stats?: Record<string, unknown>;
  };

  const productRow = asRecord(body.product);
  const productIdResolved = asString(productRow?.id) ?? productId;
  const productName = asString(productRow?.name) ?? "unknown";
  const product: BillingProduct = {
    id: productIdResolved,
    name: productName,
    displayName: asString(productRow?.displayName) ?? productName,
    description: asString(productRow?.description),
    isActive: asBoolean(productRow?.isActive, true),
  };

  const plans = (Array.isArray(body.plans) ? body.plans : [])
    .map(normalizePlan)
    .filter((plan): plan is BillingRemotePlan => Boolean(plan));

  return { product, plans, stats: body.stats };
}

export async function getAgentBillingCatalog(): Promise<{
  product: BillingProduct;
  plans: BillingRemotePlan[];
} | null> {
  if (!isBillingConfigured()) return null;

  const product = await resolveBillingProduct();
  if (!product) return null;

  const detail = await getBillingProductDetail(product.id);
  return {
    product: detail.product,
    plans: detail.plans.filter((plan) => plan.isActive),
  };
}

export type BillingModule = {
  id: string;
  productId: string;
  key: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BillingPlanModuleFeatureLimit = {
  id: string | null;
  featureKey: string;
  limitValue: number;
  unit: string | null;
  isUnlimited: boolean;
};

export type BillingPlanModule = {
  id: string;
  key: string;
  displayName: string;
  isActive: boolean;
  featureLimits: BillingPlanModuleFeatureLimit[];
};

export type BillingModuleInput = {
  productId: string;
  key: string;
  displayName: string;
  description?: string | null;
  isActive?: boolean;
};

function normalizeModule(raw: unknown, fallbackProductId?: string): BillingModule | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const productId = asString(row.productId) ?? fallbackProductId ?? null;
  const key = asString(row.key);
  const displayName = asString(row.displayName);
  if (!id || !productId || !key || !displayName) return null;
  return {
    id,
    productId,
    key,
    displayName,
    description: asString(row.description),
    isActive: asBoolean(row.isActive, true),
    createdAt: asString(row.createdAt),
    updatedAt: asString(row.updatedAt),
  };
}

function normalizePlanModule(raw: unknown): BillingPlanModule | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const key = asString(row.key);
  const displayName = asString(row.displayName);
  if (!id || !key || !displayName) return null;

  const featureLimits = (Array.isArray(row.featureLimits) ? row.featureLimits : [])
    .map((item) => {
      const limit = asRecord(item);
      if (!limit) return null;
      const featureKey = asString(limit.featureKey) ?? asString(limit.key);
      if (!featureKey) return null;
      return {
        id: asString(limit.id),
        featureKey,
        limitValue: asNumber(limit.limitValue, asNumber(limit.value)),
        unit: asString(limit.unit),
        isUnlimited: asBoolean(limit.isUnlimited),
      } satisfies BillingPlanModuleFeatureLimit;
    })
    .filter((item): item is BillingPlanModuleFeatureLimit => Boolean(item));

  return {
    id,
    key,
    displayName,
    isActive: asBoolean(row.isActive, true),
    featureLimits,
  };
}

export async function listBillingModules(productId: string): Promise<BillingModule[]> {
  const res = await billingFetch(
    `/billing/modules?productId=${encodeURIComponent(productId)}&limit=100`,
  );
  const body = (await res.json()) as { data?: unknown };
  const rows = Array.isArray(body.data) ? body.data : [];
  return rows
    .map((row) => normalizeModule(row, productId))
    .filter((item): item is BillingModule => Boolean(item));
}

export async function getBillingPlanDetail(planId: string): Promise<{
  plan: BillingRemotePlan & { productId: string };
  modules: BillingPlanModule[];
}> {
  const res = await billingFetch(`/billing/admin/plans/${encodeURIComponent(planId)}`);
  const body = (await res.json()) as { plan?: unknown; modules?: unknown };
  const planRow = asRecord(body.plan);
  const normalized = normalizePlan(planRow);
  const productId = asString(planRow?.productId);
  if (!normalized || !productId) {
    throw new Error("Billing API returned an invalid plan detail payload.");
  }

  const modules = (Array.isArray(body.modules) ? body.modules : [])
    .map(normalizePlanModule)
    .filter((item): item is BillingPlanModule => Boolean(item));

  return {
    plan: { ...normalized, productId },
    modules,
  };
}

export async function createBillingModule(input: BillingModuleInput): Promise<BillingModule> {
  const res = await billingFetch("/billing/modules", {
    method: "POST",
    body: JSON.stringify({
      productId: input.productId,
      key: input.key,
      displayName: input.displayName,
      description: input.description?.trim() || undefined,
      isActive: input.isActive ?? true,
    }),
  });
  const body = (await res.json()) as { data?: unknown } & Record<string, unknown>;
  const module = normalizeModule(body.data ?? body);
  if (!module) throw new Error("Billing API returned an invalid module payload.");
  return module;
}

export async function updateBillingModule(
  moduleId: string,
  input: Omit<BillingModuleInput, "productId" | "key"> & { key?: string },
): Promise<BillingModule> {
  const res = await billingFetch(`/billing/admin/modules/${encodeURIComponent(moduleId)}`, {
    method: "PUT",
    body: JSON.stringify({
      ...(input.key ? { key: input.key } : {}),
      displayName: input.displayName,
      description: input.description?.trim() || undefined,
      isActive: input.isActive ?? true,
    }),
  });
  const body = (await res.json()) as { data?: unknown } & Record<string, unknown>;
  const module = normalizeModule(body.data ?? body);
  if (!module) throw new Error("Billing API returned an invalid module payload.");
  return module;
}

export async function deleteBillingModule(moduleId: string): Promise<void> {
  await billingFetch(`/billing/admin/modules/${encodeURIComponent(moduleId)}`, {
    method: "DELETE",
  });
}

export type BillingPlanUpdateInput = {
  name?: string;
  priceAmount?: number;
  currencyCode?: string;
  trialPeriodDays?: number;
  isActive?: boolean;
  isCustomPricing?: boolean;
  stripePriceId?: string | null;
};

export type BillingPlanCreateInput = {
  productId: string;
  name: string;
  billingInterval: "monthly" | "yearly";
  priceAmount: number;
  currencyCode: string;
  trialPeriodDays: number;
  stripePriceId?: string | null;
};

export async function createBillingPlan(
  input: BillingPlanCreateInput,
): Promise<BillingRemotePlan> {
  const res = await billingFetch("/billing/plans", {
    method: "POST",
    body: JSON.stringify({
      productId: input.productId,
      name: input.name,
      billingInterval: input.billingInterval,
      priceAmount: input.priceAmount,
      currencyCode: input.currencyCode.toLowerCase(),
      trialPeriodDays: input.trialPeriodDays,
      ...(input.stripePriceId ? { stripePriceId: input.stripePriceId } : {}),
    }),
  });
  const body = (await res.json()) as { plan?: unknown } & Record<string, unknown>;
  const normalized = normalizePlan(body.plan ?? body);
  if (!normalized) throw new Error("Billing API returned an invalid plan payload.");
  return normalized;
}

export async function updateBillingPlan(
  planId: string,
  input: BillingPlanUpdateInput,
): Promise<BillingRemotePlan> {
  const res = await billingFetch(`/billing/admin/plans/${encodeURIComponent(planId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.priceAmount !== undefined ? { priceAmount: input.priceAmount } : {}),
      ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
      ...(input.trialPeriodDays !== undefined ? { trialPeriodDays: input.trialPeriodDays } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isCustomPricing !== undefined ? { isCustomPricing: input.isCustomPricing } : {}),
      ...(input.stripePriceId !== undefined ? { stripePriceId: input.stripePriceId } : {}),
    }),
  });
  const body = (await res.json()) as { plan?: unknown } & Record<string, unknown>;
  const normalized = normalizePlan(body.plan ?? body);
  if (!normalized) throw new Error("Billing API returned an invalid plan payload.");
  return normalized;
}

export async function attachBillingModuleToPlan(
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

export async function detachBillingModuleFromPlan(
  planId: string,
  moduleId: string,
): Promise<void> {
  await billingFetch(
    `/billing/admin/plans/${encodeURIComponent(planId)}/modules/${encodeURIComponent(moduleId)}`,
    { method: "DELETE" },
  );
}
