import "server-only";

import { prisma } from "@/lib/prisma";

const DEFAULT_BILLING_API_URL = "http://localhost:4001/api/v1";
const DEFAULT_PRODUCT_NAME = "agents";

const billingDebugEnabled = process.env.NODE_ENV !== "production";

function billingLog(...args: unknown[]) {
  if (!billingDebugEnabled) return;
  console.info(...args);
}

function billingLogError(...args: unknown[]) {
  if (!billingDebugEnabled) return;
  console.error(...args);
}

function billingLogWarn(...args: unknown[]) {
  if (!billingDebugEnabled) return;
  console.warn(...args);
}

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

  const method = (options.method ?? "GET").toUpperCase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getBillingApiUrl()}${normalizedPath}`;
  let lastError: Error | null = null;
  const maxAttempts = (options as { maxAttempts?: number }).maxAttempts ?? 2;
  const timeoutMs = (options as { timeoutMs?: number }).timeoutMs ?? 4500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      billingLog(
        `[billing] → ${method} ${normalizedPath}${attempt > 1 ? ` (retry ${attempt}/${maxAttempts})` : ""}`,
      );

      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const combinedSignal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

      const res = await fetch(url, {
        ...options,
        signal: combinedSignal,
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
          ...options.headers,
        },
        cache: "no-store",
      });

      const elapsedMs = Date.now() - startedAt;

      if (res.ok) {
        billingLog(`[billing] ← ${res.status} ${method} ${normalizedPath} (${elapsedMs}ms)`);
        return res;
      }

      const rawText = await res.text().catch(() => "");
      let errorBody: Record<string, unknown> = {};
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            errorBody = parsed as Record<string, unknown>;
          } else {
            errorBody = { raw: parsed };
          }
        } catch {
          errorBody = { raw: rawText };
        }
      }

      const detail =
        (typeof errorBody.detail === "string" && errorBody.detail) ||
        (typeof errorBody.title === "string" && errorBody.title) ||
        (typeof errorBody.message === "string" && errorBody.message) ||
        (typeof errorBody.raw === "string" && errorBody.raw) ||
        "Unknown";
      const message = `Billing API error ${res.status} on ${method} ${normalizedPath}: ${detail}`;

      const retryable =
        attempt < maxAttempts &&
        (res.status === 429 || (res.status >= 500 && method === "GET"));

      if (retryable) {
        billingLogWarn(`[billing] ← ${res.status} ${method} ${normalizedPath} (${elapsedMs}ms) error response (will retry)`);
        lastError = new Error(message);
        await new Promise((resolve) => setTimeout(resolve, attempt * 650));
        continue;
      }

      billingLogError(`[billing] ← ${res.status} ${method} ${normalizedPath} (${elapsedMs}ms) error response`, {
        status: res.status,
        statusText: res.statusText,
        path: normalizedPath,
        method,
        attempt,
        elapsedMs,
        body: errorBody,
        raw: rawText || null,
      });

      throw new Error(message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const willRetry = attempt < maxAttempts && !/Billing API error (4\d\d)/.test(lastError.message);
      if (!/^Billing API error /.test(lastError.message)) {
        const errorDetail = lastError.message || String(lastError);
        if (willRetry) {
          billingLogWarn(
            `[billing] ✕ ${method} ${normalizedPath} attempt ${attempt} failed (${errorDetail}), retrying...`,
          );
        } else {
          billingLogError(`[billing] ✕ ${method} ${normalizedPath} failed`, {
            error: errorDetail,
            attempt,
            elapsedMs: Date.now() - startedAt,
          });
        }
      }
      if (!willRetry) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 650));
    }
  }

  billingLogError(`[billing] giving up on ${method} ${normalizedPath}`, {
    error: lastError?.message ?? "Billing API request failed.",
  });
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

let billingProductsCache: { expiresAt: number; data: BillingProduct[] } | null = null;
let billingProductsInFlight: Promise<BillingProduct[]> | null = null;

export async function listBillingProducts(): Promise<BillingProduct[]> {
  const now = Date.now();
  if (billingProductsCache && billingProductsCache.expiresAt > now) {
    return billingProductsCache.data;
  }
  if (billingProductsInFlight) {
    return billingProductsInFlight;
  }

  billingProductsInFlight = (async () => {
    try {
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

      billingProductsCache = {
        expiresAt: Date.now() + 30_000, // 30-second TTL
        data: products,
      };
      return products;
    } finally {
      billingProductsInFlight = null;
    }
  })();

  return billingProductsInFlight;
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

let agentCatalogCache: {
  expiresAt: number;
  data: { product: BillingProduct; plans: BillingRemotePlan[] };
} | null = null;
let agentCatalogInFlight: Promise<{ product: BillingProduct; plans: BillingRemotePlan[] } | null> | null = null;

export function clearAgentBillingCatalogCache(): void {
  agentCatalogCache = null;
  billingProductsCache = null;
  planDetailCache.clear();
}

export async function getAgentBillingCatalog(options?: {
  includeInactive?: boolean;
}): Promise<{
  product: BillingProduct;
  plans: BillingRemotePlan[];
} | null> {
  if (!isBillingConfigured()) return null;

  const now = Date.now();
  if (!options?.includeInactive && agentCatalogCache && agentCatalogCache.expiresAt > now) {
    return agentCatalogCache.data;
  }

  if (!options?.includeInactive && agentCatalogInFlight) {
    return agentCatalogInFlight;
  }

  const fetchPromise = (async () => {
    try {
      const product = await resolveBillingProduct();
      if (!product) return null;

      const detail = await getBillingProductDetail(product.id);
      const result = {
        product: detail.product,
        plans: options?.includeInactive
          ? detail.plans
          : detail.plans.filter((plan) => plan.isActive),
      };
      if (!options?.includeInactive) {
        agentCatalogCache = {
          expiresAt: Date.now() + 20_000, // 20-second TTL
          data: result,
        };
      }
      return result;
    } finally {
      agentCatalogInFlight = null;
    }
  })();

  if (!options?.includeInactive) {
    agentCatalogInFlight = fetchPromise;
  }

  return fetchPromise;
}

function commercialPlanNameKey(name: string): string {
  return name
    .trim()
    .replace(/[\s_\-]*[\-(]?\s*(monthly|yearly|annual|annually|year)\s*[)]?\s*$/i, "")
    .trim()
    .toLowerCase();
}

function mapPlanNameToSlug(name: string): string | null {
  const key = name.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "starter" || key.startsWith("starter")) return "starter";
  if (
    key === "growth" ||
    key.startsWith("growth") ||
    key === "professional" ||
    key === "pro" ||
    key.startsWith("professional")
  ) {
    return "growth";
  }
  if (
    key.includes("voice") ||
    key.startsWith("pro_voice") ||
    key === "enterprise" ||
    key.startsWith("enterprise")
  ) {
    return "pro_voice";
  }
  return null;
}

export async function findBillingPlanForInterval(
  productId: string,
  name: string,
  interval: "monthly" | "yearly",
): Promise<BillingRemotePlan | null> {
  const detail = await getBillingProductDetail(productId);
  const wantYearly = interval === "yearly";
  const key = commercialPlanNameKey(name);
  const slug = mapPlanNameToSlug(name) ?? mapPlanNameToSlug(key);
  return (
    detail.plans.find((plan) => {
      const yearly = /year|annual/.test(plan.billingInterval.trim().toLowerCase());
      if (yearly !== wantYearly) return false;
      if (commercialPlanNameKey(plan.name) === key) return true;
      if (!slug) return false;
      const planSlug =
        mapPlanNameToSlug(plan.name) ?? mapPlanNameToSlug(commercialPlanNameKey(plan.name));
      return planSlug === slug;
    }) ?? null
  );
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

const planDetailCache = new Map<
  string,
  {
    expiresAt: number;
    data: { plan: BillingRemotePlan & { productId: string }; modules: BillingPlanModule[] };
  }
>();

export async function getBillingPlanDetail(planId: string): Promise<{
  plan: BillingRemotePlan & { productId: string };
  modules: BillingPlanModule[];
}> {
  const cached = planDetailCache.get(planId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const res = await billingFetch(`/billing/admin/plans/${encodeURIComponent(planId)}`, {
    maxAttempts: 2,
    timeoutMs: 4000,
  } as RequestInit);
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

  const result = {
    plan: { ...normalized, productId },
    modules,
  };

  planDetailCache.set(planId, {
    expiresAt: Date.now() + 180_000, // 3-minute cache
    data: result,
  });

  return result;
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
  const billingModule = normalizeModule(body.data ?? body);
  if (!billingModule) throw new Error("Billing API returned an invalid module payload.");
  return billingModule;
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
  const billingModule = normalizeModule(body.data ?? body);
  if (!billingModule) throw new Error("Billing API returned an invalid module payload.");
  return billingModule;
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
  const res = await billingFetch("/billing/admin/plans", {
    method: "POST",
    body: JSON.stringify({
      productId: input.productId,
      name: input.name,
      billingInterval: input.billingInterval,
      priceAmount: input.priceAmount,
      currencyCode: input.currencyCode.toLowerCase(),
      trialPeriodDays: input.trialPeriodDays,
      isActive: true,
      slug: `${input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}-${input.billingInterval}`,
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

export type BillingCheckoutCreateInput = {
  customerId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  couponId?: string | null;
};

export type BillingCheckoutCreateResult = {
  checkoutUrl: string;
  sessionId: string | null;
  subscriptionId: string | null;
};

export type BillingSubscriptionSummary = {
  id: string;
  status: string;
  customerId: string | null;
  productId: string | null;
  planId: string | null;
};

function parseBillingSubscription(raw: unknown): BillingSubscriptionSummary | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const status = asString(row.status);
  if (!id || !status) return null;
  return {
    id,
    status: status.toLowerCase(),
    customerId:
      asString(row.customerId) ??
      asString(asRecord(row.customer)?.id) ??
      asString(row.billingCustomerId) ??
      null,
    productId:
      asString(row.productId) ??
      asString(asRecord(row.product)?.id) ??
      null,
    planId:
      asString(row.planId) ??
      asString(asRecord(row.plan)?.id) ??
      null,
  };
}

/**
 * List admin subscriptions. Prefer filtering by status when clearing stuck checkouts.
 */
export async function listBillingSubscriptions(options?: {
  status?: string | string[];
  customerId?: string;
  limit?: number;
}): Promise<BillingSubscriptionSummary[]> {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("limit", String(Math.min(50, Math.max(1, options?.limit ?? 50))));
  if (options?.customerId?.trim()) {
    params.set("customerId", options.customerId.trim());
  }
  const statuses = Array.isArray(options?.status)
    ? options.status
    : options?.status
      ? [options.status]
      : [];
  for (const status of statuses) {
    if (status.trim()) params.append("status", status.trim());
  }

  const res = await billingFetch(`/billing/admin/subscriptions?${params.toString()}`);
  const body = (await res.json()) as { data?: unknown };
  const rows = Array.isArray(body.data) ? body.data : Array.isArray(body) ? (body as unknown[]) : [];
  return rows
    .map(parseBillingSubscription)
    .filter((item): item is BillingSubscriptionSummary => Boolean(item));
}

export async function cancelBillingSubscription(
  subscriptionId: string,
  mode: "now" | "period_end" = "now",
): Promise<void> {
  await billingFetch(`/billing/admin/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ mode }),
  });
}

export type BillingRefundResult = {
  id: string | null;
};

/**
 * Request a money-side refund in Billing for a customer.
 * POST /billing/admin/refunds
 */
export async function createBillingRefund(input: {
  customerId: string;
  organizationId: string;
  reason: string;
  notes?: string;
}): Promise<BillingRefundResult> {
  const res = await billingFetch("/billing/admin/refunds", {
    method: "POST",
    body: JSON.stringify({
      customerId: input.customerId.trim(),
      organizationId: input.organizationId.trim(),
      reason: input.reason.trim(),
      notes: input.notes?.trim() || undefined,
    }),
  });

  const body = (await res.json().catch(() => null)) as unknown;
  const root = asRecord(body);
  const nested = asRecord(root?.refund) ?? asRecord(root?.data) ?? root;
  return {
    id: nested ? asString(nested.id) : null,
  };
}

/**
 * Cancel stuck checkout_pending subscriptions for a Billing customer so a new
 * checkout/create can proceed (Billing returns 409 while one is open).
 */
export async function clearCheckoutPendingSubscriptions(input: {
  customerId: string;
  productId?: string | null;
}): Promise<number> {
  let pending = await listBillingSubscriptions({
    status: "checkout_pending",
    customerId: input.customerId,
    limit: 50,
  });

  // Some Billing versions ignore customerId on list — fall back to status filter.
  if (pending.length === 0) {
    pending = await listBillingSubscriptions({
      status: "checkout_pending",
      limit: 50,
    });
  }

  const targets = pending.filter((sub) => {
    if (sub.customerId && sub.customerId !== input.customerId) return false;
    // Without a customerId on the row, only cancel when the list was customer-scoped
    // (first request) or when we cannot distinguish — require matching customerId.
    if (!sub.customerId) return false;
    if (input.productId && sub.productId && sub.productId !== input.productId) {
      return false;
    }
    return true;
  });

  let canceled = 0;
  for (const sub of targets) {
    try {
      await cancelBillingSubscription(sub.id, "now");
      canceled += 1;
      billingLog("[billing] canceled checkout_pending subscription", {
        subscriptionId: sub.id,
        customerId: input.customerId,
      });
    } catch (error) {
      billingLogError("[billing] failed to cancel checkout_pending subscription", {
        subscriptionId: sub.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return canceled;
}

export type BillingCustomer = {
  id: string;
  name: string | null;
  primaryEmail: string | null;
};

function parseBillingCustomer(body: unknown): BillingCustomer | null {
  const root = asRecord(body);
  if (!root) return null;
  // Documented shape: { customer: { id, name, primaryEmail, ... } }
  const nested = asRecord(root.customer) ?? asRecord(root.data) ?? root;
  const id = asString(nested.id);
  if (!id) return null;
  return {
    id,
    name: asString(nested.name),
    primaryEmail: asString(nested.primaryEmail) ?? asString(nested.email),
  };
}

export async function createBillingCustomer(input: {
  name: string;
  primaryEmail: string;
}): Promise<BillingCustomer> {
  const res = await billingFetch("/billing/admin/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      primaryEmail: input.primaryEmail.trim(),
    }),
  });

  const customer = parseBillingCustomer(await res.json());
  if (!customer) {
    throw new Error("Billing did not return a customer id.");
  }
  return customer;
}

export async function findBillingCustomerIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const res = await billingFetch(
    `/billing/admin/customers?search=${encodeURIComponent(normalized)}&limit=20`,
  );
  const body = (await res.json()) as { data?: unknown };
  const rows = Array.isArray(body.data) ? body.data : [];

  for (const row of rows) {
    const record = asRecord(row);
    if (!record) continue;
    const id = asString(record.id);
    const primaryEmail = (asString(record.primaryEmail) ?? asString(record.email) ?? "").toLowerCase();
    if (id && primaryEmail === normalized) return id;
  }
  return null;
}

export async function getOrganizationBillingCustomerId(
  organizationId: string,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ billing_customer_id: string | null }>>`
    SELECT billing_customer_id
    FROM organizations
    WHERE id = ${organizationId}::uuid
    LIMIT 1
  `;
  return rows[0]?.billing_customer_id?.trim() || null;
}

async function storeOrganizationBillingCustomerId(
  organizationId: string,
  billingCustomerId: string,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE organizations
    SET billing_customer_id = ${billingCustomerId}
    WHERE id = ${organizationId}::uuid
  `;
}

/**
 * Steps 2–3 of platform onboarding:
 * reuse an existing Billing customer when possible, otherwise create one,
 * then store billingCustomerId locally.
 */
export async function ensureBillingCustomerForOrganization(input: {
  organizationId: string;
  customerName: string;
  primaryEmail: string;
}): Promise<string> {
  // 1) Already linked on this workspace?
  const existingId = await getOrganizationBillingCustomerId(input.organizationId);
  if (existingId) return existingId;

  const email = input.primaryEmail.trim();
  if (!email) {
    throw new Error("A billing email is required before registering with Billing.");
  }

  // 2) Already exists in Billing for this email? Reuse — don't create again.
  let customerId = await findBillingCustomerIdByEmail(email);

  // 3) Create only when Billing has no customer yet.
  if (!customerId) {
    const created = await createBillingCustomer({
      name: input.customerName.trim() || email,
      primaryEmail: email,
    });
    customerId = created.id;
  }

  await storeOrganizationBillingCustomerId(input.organizationId, customerId);
  return customerId;
}

export type BillingCustomerEntitlements = {
  customerId: string;
  moduleKeys: string[];
  featureKeys: string[];
  raw: Record<string, unknown>;
};

/**
 * Step 6: load entitlements for a Billing customer.
 * GET /billing/admin/entitlements?customerId=...
 */
export async function getBillingCustomerEntitlements(
  customerId: string,
): Promise<BillingCustomerEntitlements> {
  const res = await billingFetch(
    `/billing/admin/entitlements?customerId=${encodeURIComponent(customerId)}`,
  );
  const body = (await res.json()) as unknown;
  const root = asRecord(body) ?? {};
  const payload = asRecord(root.data) ?? asRecord(root.entitlements) ?? root;

  const moduleKeys = new Set<string>();
  const featureKeys = new Set<string>();

  const collectKey = (value: unknown) => {
    const record = asRecord(value);
    const key =
      asString(record?.key) ??
      asString(record?.moduleKey) ??
      asString(record?.featureKey) ??
      asString(record?.name) ??
      (typeof value === "string" ? value.trim() : null);
    if (!key) return;
    const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (record?.featureKey || record?.limitValue != null || /feature/.test(key)) {
      featureKeys.add(normalized);
    } else {
      moduleKeys.add(normalized);
    }
    featureKeys.add(normalized);
  };

  for (const listKey of ["modules", "features", "entitlements", "items", "data"] as const) {
    const list = payload[listKey];
    if (Array.isArray(list)) list.forEach(collectKey);
  }
  if (Array.isArray(body)) body.forEach(collectKey);

  return {
    customerId,
    moduleKeys: [...moduleKeys],
    featureKeys: [...featureKeys],
    raw: root,
  };
}

export async function createBillingCheckout(
  input: BillingCheckoutCreateInput,
): Promise<BillingCheckoutCreateResult> {
  const payload = {
    customerId: input.customerId,
    planId: input.planId,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.couponId ? { couponId: input.couponId } : {}),
  };

  billingLog("[billing] checkout/create payload", payload);

  const res = await billingFetch("/billing/checkout/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    checkoutUrl?: unknown;
    sessionId?: unknown;
    subscriptionId?: unknown;
    [key: string]: unknown;
  };

  const checkoutUrl =
    typeof body.checkoutUrl === "string" && body.checkoutUrl.trim()
      ? body.checkoutUrl.trim()
      : null;
  if (!checkoutUrl) {
    billingLogError("[billing] checkout/create missing checkoutUrl", { body });
    throw new Error("Billing checkout did not return a checkout URL.");
  }

  return {
    checkoutUrl,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    subscriptionId: typeof body.subscriptionId === "string" ? body.subscriptionId : null,
  };
}
