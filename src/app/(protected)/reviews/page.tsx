import { ReviewsTabs } from "@/components/reviews-tabs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectReviewProvider, syncReviewProvider } from "./actions";

function toStars(rating: number): string {
  const clamped = Math.max(1, Math.min(5, Math.floor(rating)));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

function toInboxStatus(status: string, rating: number): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") {
    if (rating >= 4) return "Safe to auto-publish";
    if (rating <= 2) return "Needs human review";
    return "Manual approval";
  }
  if (normalized === "approved" || normalized === "published" || normalized === "sent") {
    return "Safe to auto-publish";
  }
  if (normalized === "rejected" || normalized === "failed") {
    return "Needs human review";
  }
  return "Manual approval";
}

function toInboxTone(status: string): string {
  if (status === "Safe to auto-publish") return "border-emerald-200 bg-emerald-50";
  if (status === "Needs human review") return "border-rose-200 bg-rose-50";
  return "border-amber-200 bg-amber-50";
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

function normalizeRequiredFields(raw: unknown): ProviderRequiredField[] {
  const fieldsRaw =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).connection_required_fields
      : null;
  if (!Array.isArray(fieldsRaw)) return [];
  return fieldsRaw
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

  const providerRows = await prisma.provider.findMany({
    where: { type: "review", status: "enabled" },
    orderBy: { createdAt: "asc" },
    include: { connections: { where: { userId: session.userId }, take: 1 } },
  });

  const reviewServices = providerRows.map((provider) => {
    const connected = Boolean(provider.connections[0]?.connected);
    return {
      id: provider.id,
      name: provider.name,
      logoUrl: provider.logoUrl?.trim() || "",
      type: classifyProviderType(provider.name),
      status: connected ? "Connected" : "Not connected",
      left: connected ? "Ready to sync" : "0 synced",
      lastSync: connected ? "Connected" : "No sync yet",
      autoReply: connected ? "Auto-send can be configured" : "Disabled until connected",
      syncable: connected,
      requiredFields: normalizeRequiredFields(provider.config),
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
      tone: connected
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-100 text-slate-700",
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
    const isAutoReady = isPending && row.rating >= 4;
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
    where: { organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      provider: true,
      rating: true,
      reviewText: true,
      responseText: true,
      status: true,
    },
  });
  const inbox = inboxRows.map((row) => {
    const displayStatus = toInboxStatus(row.status, row.rating);
    return {
      rating: toStars(row.rating),
      quote: row.reviewText,
      response: row.responseText?.trim() || "No drafted response yet.",
      source: row.provider,
      tone: toInboxTone(displayStatus),
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
    autoReady: reviewRows.filter((r) => r.status.toLowerCase() === "pending" && r.rating >= 4).length,
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
    const isAutoReady = isPending && row.rating >= 4;
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
              Review Response System
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
              Protect brand trust with fast and consistent review handling.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              AI drafts contextual replies, escalates risky sentiment, and
              applies approval rules so your team can respond quickly without
              sacrificing quality.
            </p>
          </div>
          <div className="basis-full w-full rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-slate-300">Awaiting</p>
                <p className="font-semibold text-white">{totals.pending}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-slate-300">Auto-ready</p>
                <p className="font-semibold text-white">{totals.autoReady}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReviewsTabs
        reviewServices={reviewServices}
        pendingBySource={pendingBySource}
        inbox={inbox}
        performance={performance}
        autoPublishedTrend={autoPublishedTrend}
        serviceReviewVolume={serviceReviewVolume}
        onConnectProvider={connectReviewProvider}
        onSyncProvider={syncReviewProvider}
      />
    </div>
  );
}
