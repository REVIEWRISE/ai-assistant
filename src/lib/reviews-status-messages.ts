export type ReviewStatusVariant = "success" | "error" | "warning";

export type ReviewStatusMessage = {
  title: string;
  body: string;
  hints?: string[];
  variant: ReviewStatusVariant;
};

export const reviewSuccessMessages: Record<string, ReviewStatusMessage> = {
  provider_connected: {
    title: "Review provider connected",
    body: "Your integration is linked. Use Sync now to pull in reviews.",
    variant: "success",
  },
  review_sync_done: {
    title: "Reviews synced",
    body: "New reviews were imported successfully.",
    variant: "success",
  },
  review_sync_empty: {
    title: "No reviews returned",
    body: "The connected provider did not return any reviews. Confirm the business has public reviews, then try again.",
    variant: "warning",
  },
  review_sync_up_to_date: {
    title: "Already up to date",
    body: "Reviews were fetched but everything is already in your inbox.",
    variant: "success",
  },
  review_routing_saved: {
    title: "Routing rules saved",
    body: "Pending reviews will use your updated star-rating workflow buckets.",
    variant: "success",
  },
  review_sync_cron_saved: {
    title: "Sync schedule saved",
    body: "Automatic review sync will run on your chosen interval while the app is deployed.",
    variant: "success",
  },
};

export const reviewErrorMessages: Record<string, ReviewStatusMessage> = {
  review_read_only: {
    title: "View-only access",
    body: "Admins can review reputation activity, but only users can change integrations, automation, drafts, or published replies.",
    variant: "warning",
  },
  provider_missing: {
    title: "Provider not selected",
    body: "Choose a review provider before continuing.",
    variant: "error",
  },
  provider_not_found: {
    title: "Provider not found",
    body: "That review provider is unavailable or has been disabled.",
    variant: "error",
  },
  provider_not_connected: {
    title: "Not connected yet",
    body: "Connect your review provider before running a sync.",
    variant: "error",
  },
  provider_config: {
    title: "Provider setup incomplete",
    body: "The review provider is missing required Google OAuth settings.",
    variant: "error",
  },
  organization_required: {
    title: "Organization required",
    body: "Select an organization before connecting a review provider.",
    variant: "error",
  },
  missing_required_connection_fields: {
    title: "Missing connection details",
    body: "Fill in all required fields to complete the connection.",
    variant: "error",
  },
  token_exchange: {
    title: "Google connection failed",
    body: "We couldn't finish signing in with Google. Please try again.",
    variant: "error",
  },
  token_refresh: {
    title: "Google access expired",
    body: "Your Google connection needs to be refreshed. Connect with Google again.",
    variant: "error",
  },
  oauth_missing: {
    title: "Google sign-in incomplete",
    body: "Google did not return everything needed to finish connecting. Try again.",
    variant: "error",
  },
  oauth_state: {
    title: "Sign-in session expired",
    body: "Your Google sign-in session timed out. Start the connection again.",
    variant: "error",
  },
  gbp_no_accounts: {
    title: "No Business Profile found for this Google account",
    body: "Google sign-in worked, but this account doesn't appear to manage any Google Business Profile.",
    hints: [
      "Use the same Google account you sign in with at business.google.com",
      "Confirm you can see your business when signed in to Google Maps",
      "If someone else owns the listing, they need to connect it or grant you access",
    ],
    variant: "warning",
  },
  gbp_no_locations: {
    title: "No business location found",
    body: "Google sign-in worked, but we couldn't find a business location to sync reviews from.",
    hints: [
      "Open business.google.com with this Google account and confirm your listing is listed",
      "Make sure the business is verified in Google Maps",
      "If you manage multiple brands, try the account tied to the specific location you want",
    ],
    variant: "warning",
  },
  gbp_locations_api_failed: {
    title: "Couldn't load your business locations",
    body: "Google blocked the location lookup after sign-in.",
    hints: [
      "Ask your developer to enable My Business Account Management API and My Business Business Information API",
      "Confirm your Google Cloud project has Business Profile API access approved",
      "Try connecting again after those APIs are enabled",
    ],
    variant: "error",
  },
  gbp_rate_limited: {
    title: "Google rate limit reached",
    body: "Google temporarily blocked further Business Profile requests for your project. This usually clears within a minute.",
    hints: [
      "Wait 60 seconds, then click Connect with Google once (avoid clicking repeatedly)",
      "If this keeps happening, request a higher quota in Google Cloud → APIs → My Business Account Management API → Quotas",
      "Your Google account and APIs are likely configured correctly — this is a throttling limit, not a missing profile",
    ],
    variant: "warning",
  },
  review_sync_missing_location: {
    title: "Business location not linked",
    body: "Reconnect the provider and choose which business or location to sync reviews from.",
    variant: "error",
  },
  yelp_connection_failed: {
    title: "Yelp connection failed",
    body: "We could not verify your Yelp API key and business ID.",
    hints: [
      "Create a Yelp Fusion API key at yelp.com/developers",
      "Use the business alias from the Yelp URL (the part after /biz/)",
      "Fusion Reviews requires Enhanced or Premium plan access on your Yelp app",
    ],
    variant: "error",
  },
  review_sync_api_failed: {
    title: "Could not fetch reviews",
    body: "The review provider rejected the sync request.",
    variant: "error",
  },
  gbp_accounts_api_failed: {
    title: "Couldn't access your Business Profile account",
    body: "Google sign-in worked, but the Business Profile account API rejected our request.",
    hints: [
      "This is usually a Google Cloud setup issue, not a missing Business Profile on your Google account",
      "Enable My Business Account Management API in the same project as your OAuth client_id",
      "Request Business Profile API access from Google if you have not been approved yet",
    ],
    variant: "error",
  },
};

function isYelpSyncDetail(detail: string): boolean {
  return (
    /yelp/i.test(detail) ||
    /api\.yelp\.com/i.test(detail) ||
    /Fusion API/i.test(detail) ||
    /Bearer \[A-Za-z0-9\\\-\\\_\]\{128\}/.test(detail) ||
    /does not match.*Bearer/i.test(detail) ||
    /128 characters/i.test(detail)
  );
}

function isGoogleSyncDetail(detail: string): boolean {
  return (
    /google/i.test(detail) ||
    /mybusiness/i.test(detail) ||
    /business profile/i.test(detail)
  );
}

function yelpSyncFailureMessage(detail: string): ReviewStatusMessage {
  const invalidKey =
    /does not match|128/.test(detail) || /invalid.*api key/i.test(detail);

  return {
    title: "Yelp sync failed",
    body: invalidKey
      ? "Your Yelp API key format is invalid. Yelp Fusion keys are exactly 128 characters copied from your Yelp developer app."
      : `Yelp rejected the sync request. ${detail}`,
    hints: [
      "Open yelp.com/developers → your app → copy the full API Key",
      "Reconnect Yelp under Integrations with the correct key and business alias",
      "Fusion Reviews requires Enhanced or Premium plan access on your Yelp developer app",
    ],
    variant: "error",
  };
}

export function getReviewStatusMessage(args: {
  success?: string | null;
  error?: string | null;
  detail?: string | null;
}): ReviewStatusMessage | null {
  if (args.success && reviewSuccessMessages[args.success]) {
    return reviewSuccessMessages[args.success];
  }
  if (args.error && reviewErrorMessages[args.error]) {
    const base = reviewErrorMessages[args.error];
    const detail = args.detail?.trim();
    if (!detail || args.error === "gbp_rate_limited") return base;

    if (args.error === "yelp_connection_failed") {
      const invalidKey = /128|does not match/i.test(detail);
      return {
        ...base,
        body: invalidKey
          ? "Your Yelp API key format is invalid. Yelp Fusion keys are exactly 128 characters."
          : `${base.body} ${detail}`,
      };
    }

    if (args.error === "review_sync_api_failed") {
      if (isYelpSyncDetail(detail) && !isGoogleSyncDetail(detail)) {
        return yelpSyncFailureMessage(detail);
      }

      const myBusinessApiDisabled =
        /mybusiness\.googleapis\.com/i.test(detail) ||
        /google my business api has not been used/i.test(detail);
      if (myBusinessApiDisabled) {
        return {
          title: "Could not fetch reviews",
          body: "Google rejected the reviews request because Google My Business API is disabled for your OAuth project.",
          hints: [
            "Open Google Cloud Console → APIs & Services → Library → search “Google My Business API” → Enable",
            "Use the same project as your OAuth client_id on the review provider",
            "Wait a few minutes after enabling, then click Sync now again",
          ],
          variant: "error",
        };
      }

      if (isGoogleSyncDetail(detail)) {
        return {
          title: "Could not fetch reviews",
          body: `Google rejected the sync request. ${detail}`,
          hints: [
            "Confirm Google My Business API is enabled in the same Google Cloud project as your OAuth client",
            "Account Management and Business Information APIs are not enough — reviews require My Business API (mybusiness.googleapis.com)",
          ],
          variant: "error",
        };
      }

      return {
        ...base,
        body: `${base.body} ${detail}`,
      };
    }

    return {
      ...base,
      body: `${base.body} ${detail}`,
    };
  }
  if (args.error?.startsWith("oauth_")) {
    return {
      title: "Google sign-in failed",
      body: `Google returned an error (${args.error.replace("oauth_", "")}). Please try connecting again.`,
      variant: "error",
    };
  }
  if (args.error?.startsWith("gbp_")) {
    return {
      title: "Business Profile connection incomplete",
      body: "Google sign-in worked, but we couldn't finish linking your business location.",
      hints: [
        "Use the Google account that owns your listing on Google Maps",
        "Confirm your business appears at business.google.com",
      ],
      variant: "warning",
    };
  }
  return null;
}
