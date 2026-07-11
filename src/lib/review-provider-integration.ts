import {
  asOAuthProviderConfig,
  isOAuthProviderConfig,
  parseOAuthScopes,
} from "@/lib/google-oauth";

export type ReviewIntegrationKind =
  | "google_business_profile"
  | "yelp_fusion"
  | "generic_http_reviews";

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
}): ReviewIntegrationKind | null {
  const config = asRecord(provider.config);
  const integration = parseIntegration(config);
  const name = provider.name.toLowerCase();

  if (
    integration === "google_business_profile" ||
    integration === "google" ||
    integration === "gbp"
  ) {
    return "google_business_profile";
  }

  if (integration === "yelp_fusion" || integration === "yelp") {
    return "yelp_fusion";
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

  if (name.includes("google") && isOAuthProviderConfig(config)) {
    return "google_business_profile";
  }

  if (name.includes("yelp")) {
    return "yelp_fusion";
  }

  if (readString(config.reviews_url) || readString(provider.apiUrl)) {
    return "generic_http_reviews";
  }

  return null;
}

export function reviewConnectLabel(integration: ReviewIntegrationKind | null): string {
  if (integration === "google_business_profile") return "Connect with Google";
  if (integration === "yelp_fusion") return "Connect Yelp";
  return "Connect Service";
}

export function reviewReconnectLabel(integration: ReviewIntegrationKind | null): string {
  if (integration === "google_business_profile") return "Reconnect with Google";
  if (integration === "yelp_fusion") return "Reconnect Yelp";
  return "Manage Connection";
}

export function repliedPlatformLabel(providerName: string): string {
  const name = providerName.toLowerCase();
  if (name.includes("google")) return "Google";
  if (name.includes("yelp")) return "Yelp";
  return providerName;
}
