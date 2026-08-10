import { prisma } from "@/lib/prisma";
import { getAppointmentAnalytics } from "@/lib/appointment-analytics";
import { getVoiceAnalytics } from "@/lib/voice-analytics";
import { getOrgRetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import { displayRoleFromUserRoles, getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { isHrefAllowedForNav } from "@/lib/nav-access";
import { calendarConnectionIsUsable } from "@/lib/calendar-oauth-connection";
import { resolveBookingFlowConfig } from "@/lib/chatbot-config";
import {
  formatReviewRoutingSummary,
  isAutoReadyPendingReview,
  isNeedsReviewPendingReview,
  resolveReviewRoutingRules,
} from "@/lib/review-routing";

export type DashboardStat = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
};

export type DashboardLineChart = {
  kind: "line";
  id: string;
  title: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  labelKey: string;
  series: Array<{ key: string; name: string; color: string }>;
  emptyMessage?: string;
  featured?: boolean;
};

export type DashboardBarChart = {
  kind: "bar";
  id: string;
  title: string;
  subtitle?: string;
  data: Array<{ label: string; value: number; color?: string }>;
  color?: string;
  emptyMessage?: string;
  featured?: boolean;
};

export type DashboardChart = DashboardLineChart | DashboardBarChart;

export type DashboardOverviewStat = {
  id: "bookings" | "reviews" | "voice" | "users";
  title: string;
  value: string | number;
  hint: string;
  href: string;
  accent: string;
};

export type DashboardSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  stats: DashboardStat[];
  charts: DashboardChart[];
};

export type DashboardQuickLink = {
  href: string;
  label: string;
  description: string;
};

export type DashboardSetupStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  complete: boolean;
};

export type DashboardData = {
  roleName: string;
  organizationId: string | null;
  organizationName: string | null;
  heroEyebrow: string;
  heroTitle: string;
  heroTitleAccent?: string;
  heroDescription: string;
  headlineStats: DashboardStat[];
  overviewStats: DashboardOverviewStat[];
  sections: DashboardSection[];
  quickLinks: DashboardQuickLink[];
  setupSteps: DashboardSetupStep[];
  emptyMessage: string | null;
};

function canAccess(allowed: Set<string>, href: string): boolean {
  return isHrefAllowedForNav(href, allowed);
}

function heroCopyForRole(
  roleName: string,
  sectionCount: number,
): Pick<DashboardData, "heroEyebrow" | "heroTitle" | "heroTitleAccent" | "heroDescription"> {
  if (roleName === "Admin") {
    return {
      heroEyebrow: "Admin overview",
      heroTitle: "Your workspace",
      heroTitleAccent: "operations at a glance",
      heroDescription:
        "Full cross-module stats for appointments, reviews, voice, users, and platform health — independent of sidebar menu grants.",
    };
  }
  if (sectionCount === 0) {
    return {
      heroEyebrow: "Welcome",
      heroTitle: "Your dashboard will appear here soon",
      heroDescription:
        "Your role does not include any workspace modules yet. Contact an administrator if you need access.",
    };
  }
  if (sectionCount === 1) {
    return {
      heroEyebrow: `${roleName} dashboard`,
      heroTitle: "Focus on what matters for",
      heroTitleAccent: "your role",
      heroDescription: "Key numbers and shortcuts for the modules assigned to you.",
    };
  }
  return {
    heroEyebrow: `${roleName} dashboard`,
    heroTitle: "Your assigned modules",
    heroTitleAccent: "at a glance",
    heroDescription: "Live stats from the areas you can access — open any card to dive deeper.",
  };
}

function formatPhoneLineLabel(line: {
  nickname: string | null;
  phoneNumberPretty: string | null;
  phoneNumber: string;
  isPrimary: boolean;
}): string {
  const base = line.nickname?.trim() || line.phoneNumberPretty?.trim() || line.phoneNumber;
  return line.isPrimary ? `${base} (primary)` : base;
}

export async function getDashboardData(userId: string, activeOrganizationId: string | null): Promise<DashboardData> {
  const [user, allowedPaths, activeOrganization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    }),
    getAllowedMenuPathsForUser(userId, activeOrganizationId),
    activeOrganizationId
      ? prisma.organization.findUnique({
          where: { id: activeOrganizationId },
          select: {
            id: true,
            name: true,
            logoUrl: true,
            timezone: true,
            knowledgeBase: { select: { status: true, rawText: true } },
            chatbotSettings: {
              select: { id: true, welcomeMessage: true, bookingFlow: true },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const roleName = displayRoleFromUserRoles(user?.userRoles.map((ur) => ur.role) ?? []);
  const allowed = allowedPaths;
  const isAdmin = roleName === "Admin";
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Admin dashboard is a full ops overview. Menu permissions only control nav, not these cards.
  const showAppointments = isAdmin || canAccess(allowed, "/appointments");
  const showReviews = isAdmin || canAccess(allowed, "/reviews");
  const showVoice = isAdmin || canAccess(allowed, "/voice-agent");
  const showUsers = isAdmin || canAccess(allowed, "/users");
  const showPlatform = isAdmin || canAccess(allowed, "/platform");

  const sections: DashboardSection[] = [];
  const headlineStats: DashboardStat[] = [];
  const overviewStats: DashboardOverviewStat[] = [];

  const orgId = activeOrganization?.id ?? null;
  const orgName = activeOrganization?.name ?? null;

  const fetches: Promise<void>[] = [];

  if (showAppointments && orgId) {
    fetches.push(
      (async () => {
        const [upcoming24h, upcoming7d, analytics] = await Promise.all([
          prisma.appointment.count({
            where: { organizationId: orgId, startTime: { gte: now, lte: in24h } },
          }),
          prisma.appointment.count({
            where: { organizationId: orgId, startTime: { gte: now, lte: in7d } },
          }),
          getAppointmentAnalytics(orgId, now),
        ]);

        sections.push({
          id: "appointments",
          title: "Appointment Agent",
          description: orgName ? `Bookings and chatbot for ${orgName}` : "Bookings and chatbot automation",
          href: "/appointments/overview",
          accent: "#38bdf8",
          stats: [
            { label: "Upcoming (24h)", value: upcoming24h },
            { label: "Upcoming (7d)", value: upcoming7d },
            { label: "Bookings (30d)", value: analytics.totalLast30Days, hint: "Recorded in last 30 days" },
            {
              label: "On calendar (30d)",
              value: analytics.postedToCalendarLast30Days,
              hint: `${analytics.awaitingCalendarLast30Days} awaiting sync`,
            },
          ],
          charts: [
            {
              kind: "line",
              id: "bookings-trend",
              featured: true,
              title: "Bookings trend",
              subtitle: "Last 7 days: recorded vs posted to calendar",
              labelKey: "dayLabel",
              data: analytics.trend.map((point) => ({
                dayLabel: point.dayLabel,
                recorded: point.recorded,
                synced: point.synced,
              })),
              series: [
                { key: "recorded", name: "Recorded", color: "#38bdf8" },
                { key: "synced", name: "On calendar", color: "#34d399" },
              ],
              emptyMessage:
                "No bookings yet. Daily counts will appear here once guests start booking.",
            },
            {
              kind: "bar",
              id: "scheduling-pipeline",
              featured: true,
              title: "Scheduling pipeline",
              subtitle: "Upcoming load and 30-day booking volume",
              data: [
                { label: "24h", value: upcoming24h },
                { label: "7d", value: upcoming7d },
                { label: "30d bookings", value: analytics.totalLast30Days },
                { label: "On calendar", value: analytics.postedToCalendarLast30Days },
              ],
              color: "#38bdf8",
            },
          ],
        });

        headlineStats.push(
          { label: "Upcoming bookings", value: upcoming7d },
          { label: "Bookings (30d)", value: analytics.totalLast30Days },
        );

        overviewStats.push({
          id: "bookings",
          title: "Bookings",
          value: analytics.totalLast30Days,
          hint: `${upcoming7d} upcoming this week · ${analytics.postedToCalendarLast30Days} on calendar`,
          href: "/appointments/overview",
          accent: "#38bdf8",
        });
      })(),
    );
  } else if (showAppointments) {
    sections.push({
      id: "appointments",
      title: "Appointment Agent",
      description: "Select a workspace organization to see booking stats.",
      href: "/appointments/organization",
      accent: "#38bdf8",
      stats: [{ label: "Active organization", value: "Not set" }],
      charts: [],
    });
  }

  if (showReviews && orgId) {
    fetches.push(
      (async () => {
        const [reviews, connectedReviewProviders, reviewSettingsRow] = await Promise.all([
          prisma.review.findMany({
            where: { organizationId: orgId },
            select: { status: true, rating: true },
          }),
          prisma.provider.count({
            where: {
              type: "review",
              status: "enabled",
              connections: { some: { connected: true, userId } },
            },
          }),
          prisma.organizationReviewSettings.findUnique({
            where: { organizationId: orgId },
            select: { routingRules: true },
          }),
        ]);

        const routingRules = resolveReviewRoutingRules(reviewSettingsRow?.routingRules);
        const routingSummary = formatReviewRoutingSummary(routingRules);

        const pending = reviews.filter((r) => r.status.toLowerCase() === "pending").length;
        const autoReady = reviews.filter(
          (r) => r.status.toLowerCase() === "pending" && isAutoReadyPendingReview(r.rating, routingRules),
        ).length;
        const needsReview = reviews.filter(
          (r) => r.status.toLowerCase() === "pending" && isNeedsReviewPendingReview(r.rating, routingRules),
        ).length;

        sections.push({
          id: "reviews",
          title: "Review Response",
          description: "Inbox and provider sync for your active organization",
          href: "/reviews",
          accent: "#a78bfa",
          stats: [
            { label: "Total reviews", value: reviews.length },
            { label: "Pending inbox", value: pending },
            { label: "Auto-send ready", value: autoReady, hint: routingSummary },
            { label: "Needs human review", value: needsReview, hint: routingSummary },
            { label: "Connected providers", value: connectedReviewProviders },
          ],
          charts: [
            {
              kind: "bar",
              id: "review-inbox",
              title: "Review inbox",
              subtitle: routingSummary,
              data: [
                { label: "Total", value: reviews.length, color: "#a78bfa" },
                { label: "Pending", value: pending, color: "#fbbf24" },
                { label: "Auto-ready", value: autoReady, color: "#34d399" },
                { label: "Needs review", value: needsReview, color: "#f87171" },
              ],
              color: "#a78bfa",
            },
            {
              kind: "bar",
              id: "review-ratings",
              title: "Reviews by rating",
              subtitle: "Distribution across star ratings",
              data: [5, 4, 3, 2, 1].map((rating) => ({
                label: `${rating}★`,
                value: reviews.filter((review) => review.rating === rating).length,
                color:
                  rating >= 4 ? "#34d399" : rating === 3 ? "#fbbf24" : "#f87171",
              })),
              color: "#a78bfa",
              emptyMessage: "No reviews yet.",
            },
          ],
        });

        headlineStats.push({ label: "Pending reviews", value: pending });

        overviewStats.push({
          id: "reviews",
          title: "Review Response",
          value: pending,
          hint: `${reviews.length} total · ${autoReady} auto-ready · ${needsReview} need review`,
          href: "/reviews",
          accent: "#a78bfa",
        });
      })(),
    );
  } else if (showReviews) {
    sections.push({
      id: "reviews",
      title: "Review Response",
      description: "Select a workspace organization to see review stats.",
      href: "/appointments/organization",
      accent: "#a78bfa",
      stats: [{ label: "Active organization", value: "Not set" }],
      charts: [],
    });
  }

  if (showVoice && orgId) {
    fetches.push(
      (async () => {
        const [analytics, phoneStats] = await Promise.all([
          getVoiceAnalytics(orgId, now),
          getOrgRetellPhoneNumberStats(orgId).catch(() => []),
        ]);

        const phoneLineCount = phoneStats.length;
        const callsProcessedOnLines = phoneStats.reduce((sum, line) => sum + line.callsProcessed, 0);
        const bookingsOnLines = phoneStats.reduce((sum, line) => sum + line.bookingsCount, 0);
        const phoneLineColors = ["#2dd4bf", "#38bdf8", "#a78bfa", "#fbbf24", "#f472b6"];

        const phoneLineCharts: DashboardChart[] =
          phoneLineCount > 0
            ? [
                {
                  kind: "bar",
                  id: "phone-lines-calls",
                  featured: true,
                  title: "Calls by phone line",
                  subtitle: "Inbound calls received per support number (last 30 days)",
                  data: phoneStats.map((line, index) => ({
                    label: formatPhoneLineLabel(line),
                    value: line.callsReceived,
                    color: phoneLineColors[index % phoneLineColors.length],
                  })),
                  color: "#2dd4bf",
                  emptyMessage: "No calls on your phone lines yet.",
                },
                {
                  kind: "bar",
                  id: "phone-lines-bookings",
                  title: "Bookings by phone line",
                  subtitle: "Appointments booked during live calls on each line",
                  data: phoneStats.map((line, index) => ({
                    label: formatPhoneLineLabel(line),
                    value: line.bookingsCount,
                    color: phoneLineColors[(index + 1) % phoneLineColors.length],
                  })),
                  color: "#38bdf8",
                  emptyMessage: "Bookings linked to calls will appear here.",
                },
              ]
            : [];

        sections.push({
          id: "voice",
          title: "Voice Support",
          description: orgName
            ? `Phone agent calls and voice bookings for ${orgName}`
            : "Phone agent calls and voice bookings",
          href: "/voice-agent",
          accent: "#2dd4bf",
          stats: [
            { label: "Phone lines", value: phoneLineCount },
            { label: "Calls (30d)", value: analytics.totalCallsLast30Days },
            { label: "Processed (30d)", value: callsProcessedOnLines },
            { label: "Booked on calls (30d)", value: bookingsOnLines },
            { label: "Phone bookings (30d)", value: analytics.voiceBookingsLast30Days },
            {
              label: "Avg call duration",
              value:
                analytics.avgDurationSeconds > 0
                  ? `${Math.floor(analytics.avgDurationSeconds / 60)}:${String(
                      analytics.avgDurationSeconds % 60,
                    ).padStart(2, "0")}`
                  : "0:00",
            },
            { label: "Inbound (30d)", value: analytics.inboundCallsLast30Days },
          ],
          charts: [
            ...phoneLineCharts,
            {
              kind: "line",
              id: "voice-activity-trend",
              title: "Voice activity trend",
              subtitle: "Last 7 days: support calls vs phone bookings created",
              labelKey: "dayLabel",
              data: analytics.trend.map((point) => ({
                dayLabel: point.dayLabel,
                calls: point.calls,
                bookings: point.bookings,
              })),
              series: [
                { key: "calls", name: "Calls", color: "#2dd4bf" },
                { key: "bookings", name: "Phone bookings", color: "#38bdf8" },
              ],
              emptyMessage: "No voice calls or phone bookings yet.",
            },
            {
              kind: "bar",
              id: "voice-pipeline",
              featured: true,
              title: "Voice pipeline (30d)",
              subtitle: "Call volume, processing, and bookings captured by the phone agent",
              data: [
                { label: "Total calls", value: analytics.totalCallsLast30Days, color: "#2dd4bf" },
                { label: "Inbound", value: analytics.inboundCallsLast30Days, color: "#38bdf8" },
                { label: "Processed", value: callsProcessedOnLines, color: "#a78bfa" },
                { label: "Booked on calls", value: bookingsOnLines, color: "#34d399" },
                { label: "Phone bookings", value: analytics.voiceBookingsLast30Days, color: "#fbbf24" },
              ],
              color: "#2dd4bf",
            },
            {
              kind: "bar",
              id: "voice-sentiment",
              featured: true,
              title: "Call sentiment",
              subtitle: "Distribution across completed calls in the last 30 days",
              data: analytics.sentimentCounts,
              color: "#2dd4bf",
              emptyMessage: "Sentiment data appears after calls are analyzed.",
            },
          ],
        });

        headlineStats.push({ label: "Voice calls (30d)", value: analytics.totalCallsLast30Days });

        const avgMinutes = Math.floor(analytics.avgDurationSeconds / 60);
        const avgSeconds = String(analytics.avgDurationSeconds % 60).padStart(2, "0");
        const phoneHint =
          phoneLineCount > 0
            ? `${phoneLineCount} phone line${phoneLineCount === 1 ? "" : "s"} · ${bookingsOnLines} booked on calls`
            : `${analytics.voiceBookingsLast30Days} phone bookings`;
        overviewStats.push({
          id: "voice",
          title: "Voice Support",
          value: analytics.totalCallsLast30Days,
          hint: `${phoneHint} · ${avgMinutes}:${avgSeconds} avg call`,
          href: "/voice-agent",
          accent: "#2dd4bf",
        });
      })(),
    );
  } else if (showVoice) {
    sections.push({
      id: "voice",
      title: "Voice Support",
      description: "Select a workspace organization to see voice agent stats.",
      href: "/voice-agent",
      accent: "#2dd4bf",
      stats: [{ label: "Active organization", value: "Not set" }],
      charts: [],
    });
  }

  if (showUsers) {
    fetches.push(
      (async () => {
        const [totalUsers, activeUsers] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { accountStatus: "active" } }),
        ]);

        overviewStats.push({
          id: "users",
          title: "Users",
          value: totalUsers,
          hint: `${activeUsers} active · ${Math.max(0, totalUsers - activeUsers)} inactive`,
          href: "/users",
          accent: "#fbbf24",
        });

        if (roleName === "Admin") {
          headlineStats.push({ label: "Workspace users", value: totalUsers });
        }
      })(),
    );
  }

  if (showPlatform) {
    fetches.push(
      (async () => {
        const [enabledProviders, calendarProviders, reviewProviders] = await Promise.all([
          prisma.provider.count({ where: { status: "enabled" } }),
          prisma.provider.count({ where: { status: "enabled", type: "calendar" } }),
          prisma.provider.count({ where: { status: "enabled", type: "review" } }),
        ]);

        sections.push({
          id: "platform",
          title: "Platform Settings",
          description: "Enabled integrations and provider catalog",
          href: "/platform/providers",
          accent: "#38bdf8",
          stats: [
            { label: "Enabled providers", value: enabledProviders, accent: "#38bdf8" },
            { label: "Calendar providers", value: calendarProviders, accent: "#34d399" },
            { label: "Review providers", value: reviewProviders, accent: "#a78bfa" },
          ],
          charts: [
            {
              kind: "bar",
              id: "providers",
              featured: true,
              title: "Provider catalog",
              data: [
                { label: "Enabled", value: enabledProviders, color: "#38bdf8" },
                { label: "Calendar", value: calendarProviders, color: "#34d399" },
                { label: "Review", value: reviewProviders, color: "#a78bfa" },
              ],
              color: "#38bdf8",
            },
          ],
        });
      })(),
    );
  }

  await Promise.all(fetches);

  const sectionOrder = ["appointments", "reviews", "voice", "platform"];
  sections.sort((a, b) => sectionOrder.indexOf(a.id) - sectionOrder.indexOf(b.id));

  const hero = heroCopyForRole(roleName, sections.length);

  const quickLinks: DashboardQuickLink[] = [];
  if (canAccess(allowed, "/appointments/overview")) {
    quickLinks.push({
      href: "/appointments/overview",
      label: "Appointment overview",
      description: "Upcoming bookings and calendar sync",
    });
  }
  if (canAccess(allowed, "/appointments/chatbot")) {
    quickLinks.push({
      href: "/appointments/chatbot",
      label: "Configure chatbot",
      description: "Booking flow, voice, and CRM",
    });
  }
  if (canAccess(allowed, "/appointments/knowledge-base")) {
    quickLinks.push({
      href: "/appointments/knowledge-base",
      label: "Knowledge base",
      description: "Import and approve business context",
    });
  }
  if (canAccess(allowed, "/reviews")) {
    quickLinks.push({
      href: "/reviews",
      label: "Review inbox",
      description: "Pending reviews and auto-reply queue",
    });
  }
  if (canAccess(allowed, "/voice-agent")) {
    quickLinks.push({
      href: "/voice-agent?tab=phone",
      label: "Phone lines",
      description: "Buy numbers, assign agents, and view per-line stats",
    });
  }
  if (canAccess(allowed, "/users")) {
    quickLinks.push({
      href: "/users",
      label: "Manage users",
      description: "Accounts, roles, and status",
    });
  }
  if (canAccess(allowed, "/settings/access/permissions")) {
    quickLinks.push({
      href: "/settings/access/permissions",
      label: "Menu permissions",
      description: "Role-based navigation access",
    });
  }
  if (canAccess(allowed, "/platform/providers")) {
    quickLinks.push({
      href: "/platform/providers",
      label: "Providers",
      description: "Calendar and review integrations",
    });
  }

  const uniqueHeadline = headlineStats.slice(0, 4);

  const setupSteps: DashboardSetupStep[] = [];
  if (!orgId || !activeOrganization) {
    // Without an active workspace the modal still needs at least one step, or it never opens.
    setupSteps.push({
      id: "organization",
      label: "Choose or create a workspace",
      description: "Your dashboard and modules need an active organization before setup can continue.",
      href: canAccess(allowed, "/appointments/organization")
        ? "/appointments/organization"
        : "/profile",
      complete: false,
    });
  } else {
    const nowMs = Date.now();
    const [calendarConnection, reviewConnection] = await Promise.all([
      canAccess(allowed, "/appointments")
        ? prisma.providerConnection.findFirst({
            where: {
              userId,
              connected: true,
              provider: { type: "calendar", status: "enabled" },
            },
            select: { connected: true, tokenData: true },
          })
        : Promise.resolve(null),
      // Match /reviews: connected = ProviderConnection on a review provider (not review_services rows).
      canAccess(allowed, "/reviews")
        ? prisma.providerConnection.findFirst({
            where: {
              userId,
              connected: true,
              provider: { type: "review", status: "enabled" },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    const calendarConnected = Boolean(
      calendarConnection && calendarConnectionIsUsable(calendarConnection.tokenData, nowMs),
    );
    const reviewConnected = Boolean(reviewConnection);
    const chatbot = activeOrganization.chatbotSettings;
    const bookingFlowSteps = chatbot
      ? resolveBookingFlowConfig(chatbot.bookingFlow).steps.length
      : 0;
    const chatbotConfigured = Boolean(
      chatbot &&
        (chatbot.welcomeMessage.trim().length > 0 || bookingFlowSteps > 0),
    );
    const knowledgeApproved =
      activeOrganization.knowledgeBase?.status === "approved" &&
      Boolean(activeOrganization.knowledgeBase.rawText?.trim());

    // Active named workspace counts as set up (logo is optional polish, not a gate).
    if (canAccess(allowed, "/appointments/organization")) {
      setupSteps.push({
        id: "organization",
        label: "Set up your organization",
        description: "Create or select the workspace this agent should run for.",
        href: "/appointments/organization",
        complete: Boolean(activeOrganization.name?.trim()),
      });
    }
    if (canAccess(allowed, "/appointments/knowledge-base")) {
      setupSteps.push({
        id: "knowledge",
        label: "Add business knowledge",
        description: "Import and approve context so the assistant answers accurately.",
        href: "/appointments/knowledge-base",
        complete: knowledgeApproved,
      });
    }
    if (canAccess(allowed, "/appointments/overview")) {
      setupSteps.push({
        id: "calendar",
        label: "Connect a calendar",
        description: "Link Google or Outlook so availability and bookings stay in sync.",
        href: "/appointments/overview",
        complete: calendarConnected,
      });
    }
    if (canAccess(allowed, "/appointments/chatbot")) {
      setupSteps.push({
        id: "chatbot",
        label: "Configure the booking chatbot",
        description: "Set a welcome message or guided booking questions.",
        href: "/appointments/chatbot",
        complete: chatbotConfigured,
      });
    }
    if (canAccess(allowed, "/reviews")) {
      setupSteps.push({
        id: "reviews",
        label: "Connect review inboxes",
        description: "Pull Google reviews and start drafting replies.",
        href: "/reviews",
        complete: reviewConnected,
      });
    }
  }

  return {
    roleName,
    organizationId: orgId,
    organizationName: orgName,
    ...hero,
    headlineStats: uniqueHeadline,
    overviewStats,
    sections,
    quickLinks: quickLinks.slice(0, 6),
    setupSteps,
    emptyMessage: sections.length === 0 ? "No modules are assigned to your role yet." : null,
  };
}
