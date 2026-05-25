import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  buildGuestConfirmationHtml,
  buildTeamNotificationHtml,
  displayGuestName,
  type BookingEmailContentParams,
} from "@/lib/booking-email-template";
import { loadOrganizationEmailBranding } from "@/lib/organization-email-branding";
import { normalizeCustomerEmail } from "@/lib/parse-booking-utterance";

export type SendBookingEmailsParams = BookingEmailContentParams & {
  routedProviderId?: string | null;
};

type SendResult = { ok: true } | { ok: false; skipped?: boolean; error?: string };

function smtpConfigFromEnv(): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
} | null {
  const user = process.env.SMTP_USER?.trim() || process.env.SMTP_EMAIL?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;

  const fromName = process.env.BOOKING_EMAIL_FROM_NAME?.trim() || "VyntRise Bookings";
  const from =
    process.env.BOOKING_EMAIL_FROM?.trim() || `${fromName} <${user}>`;

  return { host, port: Number.isFinite(port) ? port : 587, secure, user, pass, from };
}

/** True when runtime env has enough SMTP settings to send booking emails. */
export function isBookingSmtpConfigured(): boolean {
  return smtpConfigFromEnv() !== null;
}

let cachedTransporter: Transporter | null = null;
let transporterResolved = false;

function getSmtpTransporter(): Transporter | null {
  if (transporterResolved) return cachedTransporter;
  transporterResolved = true;

  const config = smtpConfigFromEnv();
  if (!config) return null;

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

async function sendSmtpMessage(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<SendResult> {
  const config = smtpConfigFromEnv();
  const transporter = getSmtpTransporter();
  if (!config || !transporter) {
    return { ok: false, skipped: true };
  }

  try {
    await transporter.sendMail({
      from: config.from,
      to: params.to.join(", "),
      subject: params.subject,
      html: params.html,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

async function loadOrganizationNotifyEmails(organizationId: string): Promise<string[]> {
  const extra = normalizeCustomerEmail(process.env.BOOKING_NOTIFY_EMAIL);
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { user: { select: { email: true } } },
    take: 20,
  });

  const emails = new Set<string>();
  for (const member of members) {
    const normalized = normalizeCustomerEmail(member.user.email);
    if (normalized) emails.add(normalized);
  }
  if (extra) emails.add(extra);

  return [...emails];
}

/**
 * Sends guest confirmation (when email present) and optional team notification.
 * No-op when SMTP_USER / SMTP_PASSWORD are unset.
 */
export async function sendBookingConfirmationEmails(
  params: SendBookingEmailsParams,
): Promise<{ guest?: SendResult; team?: SendResult }> {
  const results: { guest?: SendResult; team?: SendResult } = {};

  const branding = await loadOrganizationEmailBranding(
    params.organizationId,
    params.routedProviderId,
  );
  const emailParams: BookingEmailContentParams = {
    ...params,
    organizationName: branding.organizationName,
    organizationLogoUrl: branding.logoUrl,
  };

  if (params.customerEmail) {
    results.guest = await sendSmtpMessage({
      to: [params.customerEmail],
      subject: `Booking received — ${branding.organizationName}`,
      html: buildGuestConfirmationHtml(emailParams),
    });
  }

  const notifyTo = await loadOrganizationNotifyEmails(params.organizationId);
  if (notifyTo.length > 0) {
    const guestLabel = displayGuestName(params.customerName);
    const teamSubject = guestLabel
      ? `New booking — ${guestLabel} (${branding.organizationName})`
      : `New booking — ${branding.organizationName}`;
    results.team = await sendSmtpMessage({
      to: notifyTo,
      subject: teamSubject,
      html: buildTeamNotificationHtml(emailParams),
    });
  }

  return results;
}
