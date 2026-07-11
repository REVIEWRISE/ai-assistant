import { Suspense } from "react";
import { ReviewsTabs } from "@/components/reviews-tabs";
import { ReviewsPageAlerts } from "@/components/reviews-page-alerts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { prisma } from "@/lib/prisma";
import { isOAuthProviderConfig } from "@/lib/google-oauth";
import {
  detectReviewIntegration,
  reviewConnectLabel,
  reviewReconnectLabel,
  type ReviewIntegrationKind,
} from "@/lib/review-provider-integration";
import { yelpPartnerRepliesEnabled } from "@/lib/yelp-fusion";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectReviewProvider, publishReviewReply, saveReviewDraft, saveReviewRoutingRules, saveReviewSyncCron, syncReviewProvider } from "./actions";
import {
  inboxToneForStatus,
  isAutoReadyPendingReview,
  resolveReviewRoutingRules,
  toInboxStatusFromRouting,
} from "@/lib/review-routing";
import {
  resolveReviewSyncCronConfig,
} from "@/lib/review-sync-cron";
import { resolveReviewReplyAutomationConfig } from "@/lib/review-reply-automation";

function toStars(rating: number): string {
  const clamped = Math.max(1, Math.min(5, Math.floor(rating)));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

function isAutoPublishedStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "approved" || normalized === "published" || normalized === "sent";
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function classifyProviderType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("google") || n.includes("yelp") || n.includes("tripadvisor")) return "Local";
  if (n.includes("facebook")) return "Social";
  if (n.includes("trustpilot")) return "Reputation";
  if (n.includes("g2") || n.includes("capterra")) return "B2B SaaS";
  if (n.includes("app store") || n.includes("play store")) return "Mobile Apps";
  return "Review";
}

type ProviderRequiredField = {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  secret: boolean;
};

function normalizeRequiredFields(
  raw: unknown,
  provider: { name: string; apiUrl: string | null; config: unknown },
): ProviderRequiredField[] {
  const fieldsRaw =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).connection_required_fields
      : null;
  if (Array.isArray(fieldsRaw)) {
    const parsed = fieldsRaw
      .map((entry): ProviderRequiredField | null => {
        if (typeof entry === "string") {
          const key = entry.trim();
          if (!key) return null;
          return {
            key,
            label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            placeholder: `Enter ${key.replace(/_/g, " ")}`,
            required: true,
            secret: false,
          };
        }
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const rec = entry as Record<string, unknown>;
        const key = String(rec.key ?? "").trim();
        if (!key) return null;
        return {
          key,
          label:
            String(rec.label ?? "").trim() ||
            key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          placeholder: String(rec.placeholder ?? "").trim() || `Enter ${key.replace(/_/g, " ")}`,
          required: rec.required !== false,
          secret: rec.secret === true,
        };
      })
      .filter((x): x is ProviderRequiredField => x != null)
      .slice(0, 12);
    if (parsed.length > 0) return parsed;
  }

  if (detectReviewIntegration(provider) === "yelp_fusion") {
    const fields: ProviderRequiredField[] = [
      {
        key: "api_key",
        label: "Yelp Fusion API Key",
        placeholder: "128-character key from yelp.com/developers",
        required: true,
        secret: true,
      },
      {
        key: "business_id",
        label: "Yelp Business ID or alias",
        placeholder: "e.g. north-india-restaurant-san-francisco",
        required: true,
        secret: false,
      },
    ];
    if (yelpPartnerRepliesEnabled(provider.config)) {
      fields.push({
        key: "partner_access_token",
        label: "Yelp Partner access token",
        placeholder: "Required to publish replies via Yelp Partner API",
        required: false,
        secret: true,
      });
    }
    return fields;
  }

  return [];
}

function resolveConnectionSummary(
  integration: ReviewIntegrationKind | null,
  tokenData: Record<string, unknown> | null,
): string {
  if (!tokenData) return "0 synced";
  const locationTitle = readString(tokenData.location_title);
  const businessName = readString(tokenData.business_name);
  if (integration === "yelp_fusion") {
    const businessId = readString(tokenData.business_id);
    if (businessName) return `Business: ${businessName}`;
    if (businessId) return `Business ID: ${businessId}`;
  }
  if (locationTitle) return `Location: ${locationTitle}`;
  return "Ready to sync";
}

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export default async function ReviewsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    select: {
      userId: true,
      activeOrganizationId: true,
      user: {
        select: {
          organizationMembers: {
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!session) redirect("/login");
  const organizationId =
    session.activeOrganizationId ?? session.user.organizationMembers[0]?.organizationId ?? null;
  if (!organizationId) redirect("/appointments/organization");

  const reviewSettingsRow = await prisma.organizationReviewSettings.findUnique({
    where: { organizationId },
    select: { routingRules: true, syncCron: true, replyAutomation: true },
  });
  const routingRules = resolveReviewRoutingRules(reviewSettingsRow?.routingRules);
  const syncCronConfig = resolveReviewSyncCronConfig(reviewSettingsRow?.syncCron);
  const replyAutomation = resolveReviewReplyAutomationConfig(reviewSettingsRow?.replyAutomation);

  const providerRows = await prisma.provider.findMany({
    where: { type: "review", status: "enabled" },
    orderBy: { createdAt: "asc" },
    include: { connections: { where: { userId: session.userId }, take: 1 } },
  });

  const reviewServices = providerRows.map((provider) => {
    const connected = Boolean(provider.connections[0]?.connected);
    const integration = detectReviewIntegration(provider);
    const oauthConnectHref =
      integration === "google_business_profile" && isOAuthProviderConfig(provider.config)
        ? `/reviews/providers/connect/${provider.id}`
        : undefined;
    const tokenData =
      provider.connections[0]?.tokenData &&
      typeof provider.connections[0].tokenData === "object" &&
      !Array.isArray(provider.connections[0].tokenData)
        ? (provider.connections[0].tokenData as Record<string, unknown>)
        : null;
    const connectionSummary = resolveConnectionSummary(integration, tokenData);
    return {
      id: provider.id,
      name: provider.name,
      logoUrl: provider.logoUrl?.trim() || "",
      type: classifyProviderType(provider.name),
      status: connected ? "Connected" : "Not connected",
      left: connected ? connectionSummary : "0 synced",
      lastSync: connected ? "Connected" : "No sync yet",
      autoReply: connected ? "Auto-send can be configured" : "Disabled until connected",
      syncable: connected,
      oauthConnectHref,
      integration,
      connectLabel: connected
        ? reviewReconnectLabel(integration)
        : reviewConnectLabel(integration),
      requiredFields: normalizeRequiredFields(provider.config, provider),
      existingConnectionDetails:
        provider.connections[0]?.tokenData &&
        typeof provider.connections[0].tokenData === "object" &&
        !Array.isArray(provider.connections[0].tokenData)
          ? Object.fromEntries(
              Object.entries(provider.connections[0].tokenData as Record<string, unknown>).map(
                ([k, v]) => [k, String(v ?? "")],
              ),
            )
          : {},
      tone: connected ? "vr-app-status-success" : "vr-app-status-muted",
    };
  });

  const reviewRows = await prisma.review.findMany({
    where: { organizationId },
    select: { provider: true, status: true, rating: true, createdAt: true },
  });
  const statsByProvider = new Map<string, { pending: number; autoReady: number }>();
  for (const row of reviewRows) {
    const key = row.provider.trim();
    if (!key) continue;
    const prev = statsByProvider.get(key) ?? { pending: 0, autoReady: 0 };
    const isPending = row.status.toLowerCase() === "pending";
    const isAutoReady = isPending && isAutoReadyPendingReview(row.rating, routingRules);
    statsByProvider.set(key, {
      pending: prev.pending + (isPending ? 1 : 0),
      autoReady: prev.autoReady + (isAutoReady ? 1 : 0),
    });
  }
  const pendingBySource = providerRows.map((provider) => {
    const connected = Boolean(provider.connections[0]?.connected);
    const stats = statsByProvider.get(provider.name) ?? { pending: 0, autoReady: 0 };
    return {
      source: provider.name,
      pending: String(stats.pending),
      autoReady: connected
        ? `${stats.autoReady} ready for auto-send`
        : "Connect to start sync",
    };
  });

  const inboxRows = await prisma.review.findMany({
    where: { organizationId, status: { in: ["pending", "responded"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      provider: true,
      rating: true,
      reviewText: true,
      responseText: true,
      status: true,
    },
  });
  const inbox = inboxRows.map((row) => {
    const displayStatus = toInboxStatusFromRouting(row.status, row.rating, routingRules, row.provider);
    return {
      id: row.id,
      rating: toStars(row.rating),
      quote: row.reviewText,
      response: row.responseText?.trim() || "No drafted response yet.",
      source: row.provider,
      tone: inboxToneForStatus(displayStatus),
      status: displayStatus,
    };
  });

  const now = new Date();
  const currentWeekStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const previousWeekStart = startOfDay(new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
  const previousWeekEnd = currentWeekStart;

  const totals = {
    total: reviewRows.length,
    pending: reviewRows.filter((r) => r.status.toLowerCase() === "pending").length,
    autoReady: reviewRows.filter(
      (r) => r.status.toLowerCase() === "pending" && isAutoReadyPendingReview(r.rating, routingRules),
    ).length,
  };

  const currentWeek = {
    total: 0,
    pending: 0,
    autoReady: 0,
  };
  const previousWeek = {
    total: 0,
    pending: 0,
    autoReady: 0,
  };
  for (const row of reviewRows) {
    const createdAt = row.createdAt;
    const isPending = row.status.toLowerCase() === "pending";
    const isAutoReady = isPending && isAutoReadyPendingReview(row.rating, routingRules);
    if (createdAt >= currentWeekStart) {
      currentWeek.total += 1;
      if (isPending) currentWeek.pending += 1;
      if (isAutoReady) currentWeek.autoReady += 1;
      continue;
    }
    if (createdAt >= previousWeekStart && createdAt < previousWeekEnd) {
      previousWeek.total += 1;
      if (isPending) previousWeek.pending += 1;
      if (isAutoReady) previousWeek.autoReady += 1;
    }
  }
  const formatDelta = (current: number, prev: number): string => {
    if (prev === 0) return current === 0 ? "0%" : "+100%";
    const diff = Math.round(((current - prev) / prev) * 100);
    return `${diff >= 0 ? "+" : ""}${diff}%`;
  };
  const performance = [
    {
      label: "Total Reviews",
      value: String(totals.total),
      delta: formatDelta(currentWeek.total, previousWeek.total),
    },
    {
      label: "Pending Reviews",
      value: String(totals.pending),
      delta: formatDelta(currentWeek.pending, previousWeek.pending),
    },
    {
      label: "Auto-Ready",
      value: String(totals.autoReady),
      delta: formatDelta(currentWeek.autoReady, previousWeek.autoReady),
    },
  ];

  const autoPublishedTrend = Array.from({ length: 7 }, (_, index) => {
    const dayDate = startOfDay(new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000));
    const nextDate = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
    const count = reviewRows.filter(
      (row) =>
        row.createdAt >= dayDate &&
        row.createdAt < nextDate &&
        isAutoPublishedStatus(row.status),
    ).length;
    return {
      day: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    };
  });

  const byService = new Map<string, { total: number; autoPublished: number }>();
  for (const row of reviewRows) {
    const key = row.provider.trim() || "Unknown";
    const prev = byService.get(key) ?? { total: 0, autoPublished: 0 };
    byService.set(key, {
      total: prev.total + 1,
      autoPublished: prev.autoPublished + (isAutoPublishedStatus(row.status) ? 1 : 0),
    });
  }
  const serviceReviewVolume = Array.from(byService.entries())
    .map(([service, values]) => ({ service, ...values }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <Suspense fallback={null}>
        <ReviewsPageAlerts />
      </Suspense>
      <AppPageHero
        eyebrow="Review Response System"
        title={
          <>
            Protect brand trust with fast and{" "}
            <span className="vr-brand-gradient-text">consistent review handling</span>
          </>
        }
        description="AI drafts contextual replies, escalates risky sentiment, and applies approval rules so your team can respond quickly without sacrificing quality."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="2">
            <AppPageHeroStat label="Awaiting" value={totals.pending} />
            <AppPageHeroStat label="Auto-ready" value={totals.autoReady} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <ReviewsTabs
        organizationId={organizationId}
        routingRules={routingRules}
        syncCronConfig={syncCronConfig}
        replyAutomation={replyAutomation}
        reviewServices={reviewServices}
        pendingBySource={pendingBySource}
        inbox={inbox}
        performance={performance}
        autoPublishedTrend={autoPublishedTrend}
        serviceReviewVolume={serviceReviewVolume}
        onConnectProvider={connectReviewProvider}
        onSyncProvider={syncReviewProvider}
        onSaveRoutingRules={saveReviewRoutingRules}
        onSaveSyncCron={saveReviewSyncCron}
        onSaveReviewDraft={saveReviewDraft}
        onPublishReviewReply={publishReviewReply}
      />
    </div>
  );
}
