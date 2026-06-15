import {
  asOAuthProviderConfig,
  isOAuthProviderConfig,
  parseOAuthScopes,
} from "@/lib/google-oauth";

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseIntegration(config: Record<string, unknown>): string {
  return readString(config.integration).toLowerCase().replace(/-/g, "_");
}

export function detectReviewIntegration(provider: {
  name: string;
  apiUrl: string | null;
  config: unknown;
}): "google_business_profile" | "generic_http_reviews" | null {
  const config = asRecord(provider.config);
  const integration = parseIntegration(config);
  if (
    integration === "google_business_profile" ||
    integration === "google" ||
    integration === "gbp"
  ) {
    return "google_business_profile";
  }
  if (integration === "generic_http_reviews" || integration === "custom_http_json") {
    return "generic_http_reviews";
  }
  if (isOAuthProviderConfig(config)) {
    const oauthConfig = asOAuthProviderConfig(config);
    const scopes = parseOAuthScopes(oauthConfig).toLowerCase();
    if (scopes.includes("business.manage") || scopes.includes("plus.business.manage")) {
      return "google_business_profile";
    }
    if (readString(oauthConfig.auth_url).includes("accounts.google.com")) {
      return "google_business_profile";
    }
  }
  const name = provider.name.toLowerCase();
  if (name.includes("google") && isOAuthProviderConfig(config)) {
    return "google_business_profile";
  }
  if (readString(config.reviews_url) || readString(provider.apiUrl)) {
    return "generic_http_reviews";
  }
  return null;
}
