import { prisma } from "@/lib/prisma";
import { publishGbpReviewReply } from "@/lib/google-business-profile";
import {
  asOAuthProviderConfig,
  getValidOAuthAccessToken,
  isOAuthProviderConfig,
} from "@/lib/google-oauth";
import {
  classifyPendingReviewRating,
  resolveReviewRoutingRules,
} from "@/lib/review-routing";
import { detectReviewIntegration, repliedPlatformLabel } from "@/lib/review-provider-integration";
import { publishYelpReviewReply, yelpPartnerRepliesEnabled } from "@/lib/yelp-fusion";
import { encryptTokenData, decryptTokenData } from "@/lib/token-encryption";

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export type ReviewReplyActionResult = { ok: true } | { ok: false; error: string };

async function findConnectedReviewProvider(args: {
  organizationId: string;
  providerName: string;
  preferredUserId?: string;
}) {
  const provider = await prisma.provider.findFirst({
    where: { name: args.providerName, type: "review", status: "enabled" },
    select: { id: true, name: true, apiUrl: true, config: true },
  });
  if (!provider) return null;

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: args.organizationId },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return null;

  const userOrder = [
    ...(args.preferredUserId ? [args.preferredUserId] : []),
    ...memberIds.filter((id) => id !== args.preferredUserId),
  ];

  for (const userId of userOrder) {
    const connection = await prisma.providerConnection.findUnique({
      where: { userId_providerId: { userId, providerId: provider.id } },
      select: { connected: true, tokenData: true },
    });
    if (connection?.connected) {
      return { provider, userId, tokenData: decryptTokenData(connection.tokenData) };
    }
  }

  return null;
}

export async function saveReviewResponseDraft(args: {
  organizationId: string;
  reviewId: string;
  responseText: string;
}): Promise<ReviewReplyActionResult> {
  const responseText = args.responseText.trim();
  if (!responseText) {
    return { ok: false, error: "Response text is required." };
  }

  const review = await prisma.review.findFirst({
    where: { id: args.reviewId, organizationId: args.organizationId },
    select: { id: true, status: true, provider: true },
  });
  if (!review) {
    return { ok: false, error: "Review not found." };
  }
  if (review.status.toLowerCase() === "responded") {
    return {
      ok: false,
      error: `This review was already replied to on ${repliedPlatformLabel(review.provider)}.`,
    };
  }

  await prisma.review.update({
    where: { id: review.id },
    data: { responseText: responseText.slice(0, 8000) },
  });

  return { ok: true };
}

export async function publishReviewReply(args: {
  organizationId: string;
  reviewId: string;
  responseText: string;
  userId: string;
}): Promise<ReviewReplyActionResult> {
  const responseText = args.responseText.trim();
  if (!responseText) {
    return { ok: false, error: "Draft a response before sending." };
  }

  const review = await prisma.review.findFirst({
    where: { id: args.reviewId, organizationId: args.organizationId },
    select: {
      id: true,
      provider: true,
      externalReviewId: true,
      status: true,
    },
  });
  if (!review) {
    return { ok: false, error: "Review not found." };
  }
  if (review.status.toLowerCase() === "responded") {
    return {
      ok: false,
      error: `This review was already replied to on ${repliedPlatformLabel(review.provider)}.`,
    };
  }
  if (!review.externalReviewId) {
    return {
      ok: false,
      error: `This review is missing an external review id. Re-sync reviews from Integrations, then try again.`,
    };
  }

  const connectionInfo = await findConnectedReviewProvider({
    organizationId: args.organizationId,
    providerName: review.provider,
    preferredUserId: args.userId,
  });
  if (!connectionInfo) {
    return {
      ok: false,
      error: `${review.provider} is not connected. Connect it under Integrations first.`,
    };
  }

  const integration = detectReviewIntegration(connectionInfo.provider);
  if (integration === "google_business_profile") {
    const config = asRecord(connectionInfo.provider.config);
    if (!isOAuthProviderConfig(config)) {
      return { ok: false, error: "Google OAuth is not configured for this provider." };
    }

    let tokenData = { ...connectionInfo.tokenData };
    const tokenResult = await getValidOAuthAccessToken({
      config: asOAuthProviderConfig(config),
      tokenData,
      persist: async (next) => {
        tokenData = next;
        await prisma.providerConnection.update({
          where: {
            userId_providerId: {
              userId: connectionInfo.userId,
              providerId: connectionInfo.provider.id,
            },
          },
          data: { tokenData: encryptTokenData(next) as object, updatedAt: new Date() },
        });
      },
    });
    if ("error" in tokenResult) {
      return { ok: false, error: `Google token refresh failed: ${tokenResult.error}` };
    }

    const accountId =
      readString(tokenData.account_id) || readString(asRecord(config).account_id);
    const locationId =
      readString(tokenData.location_id) || readString(asRecord(config).location_id);
    if (!accountId || !locationId) {
      return {
        ok: false,
        error: "Google Business Profile location is not set. Reconnect the provider and select a location.",
      };
    }

    const publishResult = await publishGbpReviewReply(
      tokenResult.accessToken,
      accountId,
      locationId,
      review.externalReviewId,
      responseText,
    );
    if (!publishResult.ok) {
      return {
        ok: false,
        error: `Google rejected the reply (${publishResult.status}): ${publishResult.error}`,
      };
    }
  } else if (integration === "yelp_fusion") {
    if (!yelpPartnerRepliesEnabled(connectionInfo.provider.config)) {
      return {
        ok: false,
        error:
          "Yelp reply publishing requires partner access. Enable partner_replies_enabled on the Yelp provider and add a partner_access_token when connecting.",
      };
    }

    const partnerAccessToken =
      readString(connectionInfo.tokenData.partner_access_token) ||
      readString(asRecord(connectionInfo.provider.config).partner_access_token);
    const publishResult = await publishYelpReviewReply({
      partnerAccessToken,
      reviewId: review.externalReviewId,
      responseText,
      partnerApiUrl: readString(asRecord(connectionInfo.provider.config).partner_api_url),
    });
    if (!publishResult.ok) {
      return {
        ok: false,
        error: `Yelp rejected the reply (${publishResult.status}): ${publishResult.error}`,
      };
    }
  } else {
    return {
      ok: false,
      error: `Publishing replies is not supported for ${review.provider} yet.`,
    };
  }

  await prisma.review.update({
    where: { id: review.id },
    data: {
      responseText: responseText.slice(0, 8000),
      status: "responded",
    },
  });

  return { ok: true };
}

/** @deprecated Use publishReviewReply */
export async function publishReviewReplyToGoogle(args: {
  organizationId: string;
  reviewId: string;
  responseText: string;
  userId: string;
}): Promise<ReviewReplyActionResult> {
  return publishReviewReply(args);
}

export async function autoPublishSyncedReviews(args: {
  organizationId: string;
  providerName: string;
  userId: string;
  since: Date;
}): Promise<{ published: number; skipped: number; failed: number }> {
  const settingsRow = await prisma.organizationReviewSettings.findUnique({
    where: { organizationId: args.organizationId },
    select: { routingRules: true },
  });
  const routingRules = resolveReviewRoutingRules(settingsRow?.routingRules);

  const rows = await prisma.review.findMany({
    where: {
      organizationId: args.organizationId,
      provider: args.providerName,
      status: "pending",
      responseText: { not: null },
      externalReviewId: { not: null },
      createdAt: { gte: args.since },
    },
    select: { id: true, rating: true, responseText: true },
    take: 25,
  });

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const bucket = classifyPendingReviewRating(row.rating, routingRules);
    if (bucket !== "auto_publish") {
      skipped += 1;
      continue;
    }

    const responseText = readString(row.responseText);
    if (!responseText) {
      skipped += 1;
      continue;
    }

    const result = await publishReviewReply({
      organizationId: args.organizationId,
      reviewId: row.id,
      responseText,
      userId: args.userId,
    });

    if (result.ok) {
      published += 1;
    } else {
      failed += 1;
      console.error(
        `[review-sync] auto-publish failed for review ${row.id.slice(0, 8)}: ${result.error}`,
      );
    }
  }

  return { published, skipped, failed };
}
