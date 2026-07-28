"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listOrgCalendarRoutes } from "@/lib/booking-org-gate";
import { retryAppointmentCrmWebhookDelivery } from "@/lib/booking-crm-webhook";
import { crmIntegrationIsDispatchReady, resolveCrmIntegrationConfig } from "@/lib/crm-integration";
import {
  markAppointmentCalendarSyncFailed,
  syncAppointmentToExternalCalendar,
} from "@/lib/sync-appointment-calendar-event";
import { requireOrgFeature } from "@/lib/entitlements";

const OVERVIEW_ROUTE = "/appointments/overview";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireActiveOrganizationId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { activeOrganizationId: true },
  });

  if (!session) redirect("/login");
  if (!session.activeOrganizationId) {
    redirect("/appointments/organization");
  }
  await requireOrgFeature(session.activeOrganizationId, "calendar_booking");
  return session.activeOrganizationId;
}

export async function retryAppointmentCalendarSync(formData: FormData) {
  const organizationId = await requireActiveOrganizationId();

  const appointmentId = String(formData.get("appointment_id") || "").trim();
  const routeKey = String(formData.get("route_key") || "").trim();

  if (!UUID_RE.test(appointmentId)) {
    redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_invalid`);
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    select: {
      id: true,
      externalCalendarEventId: true,
      providerSyncStatus: true,
    },
  });

  if (!appointment) {
    redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_not_found`);
  }

  if (appointment.externalCalendarEventId && appointment.providerSyncStatus === "synced") {
    redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_already_done`);
  }

  const allowedRoutes = await listOrgCalendarRoutes(organizationId);
  if (allowedRoutes.length === 0) {
    redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_no_connection`);
  }

  let providerId: string;
  let connectionUserId: string;

  if (routeKey) {
    const parts = routeKey.split("::");
    if (parts.length !== 2 || !UUID_RE.test(parts[0]) || !UUID_RE.test(parts[1])) {
      redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_invalid_route`);
    }
    providerId = parts[0];
    connectionUserId = parts[1];
    const allowed = allowedRoutes.some(
      (r) => r.providerId === providerId && r.connectionUserId === connectionUserId,
    );
    if (!allowed) {
      redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_invalid_route`);
    }
  } else {
    providerId = allowedRoutes[0].providerId;
    connectionUserId = allowedRoutes[0].connectionUserId;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!org) redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_not_found`);

  const result = await syncAppointmentToExternalCalendar({
    appointmentId,
    organizationId,
    organizationName: org.name,
    providerId,
    connectionUserId,
  });

  if (!result.ok) {
    await markAppointmentCalendarSyncFailed(appointmentId, organizationId, result.error);
    const q = encodeURIComponent(result.error.slice(0, 240));
    redirect(`${OVERVIEW_ROUTE}?error=calendar_sync_failed&detail=${q}`);
  }

  redirect(`${OVERVIEW_ROUTE}?success=calendar_synced`);
}

export async function retryAppointmentCrmSync(formData: FormData) {
  const organizationId = await requireActiveOrganizationId();

  const appointmentId = String(formData.get("appointment_id") || "").trim();
  if (!UUID_RE.test(appointmentId)) {
    redirect(`${OVERVIEW_ROUTE}?error=crm_sync_invalid`);
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId },
    select: { id: true, crmSyncStatus: true, source: true },
  });

  if (!appointment) {
    redirect(`${OVERVIEW_ROUTE}?error=crm_sync_not_found`);
  }

  if (appointment.crmSyncStatus === "synced") {
    redirect(`${OVERVIEW_ROUTE}?error=crm_sync_already_done`);
  }

  const settings = await prisma.organizationChatbotSettings.findUnique({
    where: { organizationId },
    select: { crmIntegration: true },
  });

  if (!crmIntegrationIsDispatchReady(resolveCrmIntegrationConfig(settings?.crmIntegration))) {
    redirect(`${OVERVIEW_ROUTE}?error=crm_sync_not_configured`);
  }

  const result = await retryAppointmentCrmWebhookDelivery(appointmentId, organizationId);

  if (!result.dispatched) {
    redirect(`${OVERVIEW_ROUTE}?error=crm_sync_not_configured`);
  }

  if (!result.ok) {
    const q = encodeURIComponent((result.error ?? "CRM webhook failed").slice(0, 240));
    redirect(`${OVERVIEW_ROUTE}?error=crm_sync_failed&detail=${q}`);
  }

  redirect(`${OVERVIEW_ROUTE}?success=crm_synced`);
}
