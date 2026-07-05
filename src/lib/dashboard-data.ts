import { prisma } from "@/lib/prisma";
import { getAppointmentAnalytics } from "@/lib/appointment-analytics";
import { displayRoleFromUserRoles, getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { isHrefAllowedForNav } from "@/lib/nav-access";
import { resolveChatbotConfigData } from "@/lib/chatbot-config";
import { voiceBookingIsReady } from "@/lib/voice-booking";
import { organizationChatbotSettingsSelect } from "@/lib/chatbot-settings-select";
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
};

export type DashboardSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  stats: DashboardStat[];
};

export type DashboardQuickLink = {
  href: string;
  label: string;
  description: string;
};

export type DashboardData = {
  roleName: string;
  organizationName: string | null;
  heroEyebrow: string;
  heroTitle: string;
  heroTitleAccent?: string;
  heroDescription: string;
  headlineStats: DashboardStat[];
  sections: DashboardSection[];
  quickLinks: DashboardQuickLink[];
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
        "Cross-module stats for appointments, reviews, users, and platform health — scoped to menus your team can access.",
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
            knowledgeBase: { select: { status: true } },
            chatbotSettings: { select: organizationChatbotSettingsSelect },
          },
        })
      : Promise.resolve(null),
  ]);

  const roleName = displayRoleFromUserRoles(user?.userRoles.map((ur) => ur.role) ?? []);
  const allowed = allowedPaths;
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const showAppointments = canAccess(allowed, "/appointments");
  const showReviews = canAccess(allowed, "/reviews");
  const showUsers = canAccess(allowed, "/users");
  const showAccess = canAccess(allowed, "/settings/access");
  const showPlatform = canAccess(allowed, "/platform");

  const sections: DashboardSection[] = [];
  const headlineStats: DashboardStat[] = [];

  const orgId = activeOrganization?.id ?? null;
  const orgName = activeOrganization?.name ?? null;

  const fetches: Promise<void>[] = [];

  if (showAppointments && orgId) {
    fetches.push(
      (async () => {
        const [upcoming24h, upcoming7d, analytics, chatbotConfig] = await Promise.all([
          prisma.appointment.count({
            where: { organizationId: orgId, startTime: { gte: now, lte: in24h } },
          }),
          prisma.appointment.count({
            where: { organizationId: orgId, startTime: { gte: now, lte: in7d } },
          }),
          getAppointmentAnalytics(orgId, now),
          activeOrganization?.chatbotSettings
            ? resolveChatbotConfigData(activeOrganization.chatbotSettings, null)
            : null,
        ]);

        const kbStatus = activeOrganization?.knowledgeBase?.status ?? "empty";
        const voiceReady = chatbotConfig ? voiceBookingIsReady(chatbotConfig.voiceBooking) : false;
        const flowSteps = chatbotConfig?.bookingFlow.steps.length ?? 0;

        sections.push({
          id: "appointments",
          title: "Appointment Agent",
          description: orgName ? `Bookings and chatbot for ${orgName}` : "Bookings and chatbot automation",
          href: "/appointments/overview",
          stats: [
            { label: "Upcoming (24h)", value: upcoming24h },
            { label: "Upcoming (7d)", value: upcoming7d },
            { label: "Bookings (30d)", value: analytics.totalLast30Days, hint: "Recorded in last 30 days" },
            {
              label: "On calendar (30d)",
              value: analytics.postedToCalendarLast30Days,
              hint: `${analytics.awaitingCalendarLast30Days} awaiting sync`,
            },
            {
              label: "Knowledge base",
              value: kbStatus === "approved" ? "Approved" : kbStatus === "draft" ? "Draft" : "Not set",
            },
            { label: "Booking flow steps", value: flowSteps },
            { label: "Voice booking", value: voiceReady ? "On" : "Off" },
          ],
        });

        headlineStats.push(
          { label: "Upcoming bookings", value: upcoming7d },
          { label: "Bookings (30d)", value: analytics.totalLast30Days },
        );
      })(),
    );
  } else if (showAppointments) {
    sections.push({
      id: "appointments",
      title: "Appointment Agent",
      description: "Select a workspace organization to see booking stats.",
      href: "/appointments/organization",
      stats: [{ label: "Active organization", value: "Not set" }],
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
          stats: [
            { label: "Total reviews", value: reviews.length },
            { label: "Pending inbox", value: pending },
            { label: "Auto-send ready", value: autoReady, hint: routingSummary },
            { label: "Needs human review", value: needsReview, hint: routingSummary },
            { label: "Connected providers", value: connectedReviewProviders },
          ],
        });

        headlineStats.push({ label: "Pending reviews", value: pending });
      })(),
    );
  } else if (showReviews) {
    sections.push({
      id: "reviews",
      title: "Review Response",
      description: "Select a workspace organization to see review stats.",
      href: "/appointments/organization",
      stats: [{ label: "Active organization", value: "Not set" }],
    });
  }

  if (showUsers) {
    fetches.push(
      (async () => {
        const [totalUsers, activeUsers] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { accountStatus: "active" } }),
        ]);

        sections.push({
          id: "users",
          title: "User Management",
          description: "Workspace accounts and role assignments",
          href: "/users",
          stats: [
            { label: "Total users", value: totalUsers },
            { label: "Active accounts", value: activeUsers },
            { label: "Inactive", value: Math.max(0, totalUsers - activeUsers) },
          ],
        });

        if (roleName === "Admin") {
          headlineStats.push({ label: "Workspace users", value: totalUsers });
        }
      })(),
    );
  }

  if (showAccess) {
    fetches.push(
      (async () => {
        const [roles, permissions, menus] = await Promise.all([
          prisma.role.count(),
          prisma.menuAccess.count(),
          prisma.menuItem.count(),
        ]);

        sections.push({
          id: "access",
          title: "Access Control",
          description: "Roles, menus, and permission mappings",
          href: "/settings/access/permissions",
          stats: [
            { label: "Roles", value: roles },
            { label: "Menu permissions", value: permissions },
            { label: "Menu items", value: menus },
          ],
        });
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
          stats: [
            { label: "Enabled providers", value: enabledProviders },
            { label: "Calendar providers", value: calendarProviders },
            { label: "Review providers", value: reviewProviders },
          ],
        });
      })(),
    );
  }

  await Promise.all(fetches);

  const sectionOrder = ["appointments", "reviews", "users", "access", "platform"];
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

  return {
    roleName,
    organizationName: orgName,
    ...hero,
    headlineStats: uniqueHeadline,
    sections,
    quickLinks: quickLinks.slice(0, 6),
    emptyMessage: sections.length === 0 ? "No modules are assigned to your role yet." : null,
  };
}
