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
  const res = await fetch(`${getBillingApiUrl()}${normalizedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as {
      detail?: string;
      title?: string;
    };
    throw new Error(
      `Billing API error ${res.status}: ${error.detail ?? error.title ?? "Unknown"}`,
    );
  }

  return res;
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
