import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  formatBookingSummary,
  normalizeCustomerEmail,
  type ParsedBookingUtterance,
} from "@/lib/parse-booking-utterance";

type SendBookingEmailsParams = {
  appointmentId: string;
  organizationId: string;
  organizationName: string;
  customerName: string;
  customerEmail: string | null;
  parsed: ParsedBookingUtterance;
  calendarSynced: boolean;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWhen(parsed: ParsedBookingUtterance): string {
  if (!parsed.startTime) return "To be confirmed";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed.startTime);
}

function buildGuestConfirmationHtml(params: SendBookingEmailsParams): string {
  const summary = formatBookingSummary(params.parsed);
  const org = escapeHtml(params.organizationName);
  const name = escapeHtml(params.customerName);
  const when = escapeHtml(formatWhen(params.parsed));
  const service = params.parsed.serviceDescription
    ? escapeHtml(params.parsed.serviceDescription)
    : null;
  const party =
    params.parsed.partySize != null ? escapeHtml(String(params.parsed.partySize)) : null;
  const calendarNote = params.calendarSynced
    ? "<p>Your time is on our calendar. If anything changes, we will reach out.</p>"
    : "<p>Our team will confirm availability shortly.</p>";

  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:520px">
      <p>Hi ${name},</p>
      <p>Thanks for booking with <strong>${org}</strong>. Here is what we received:</p>
      <ul>
        ${service ? `<li><strong>Service:</strong> ${service}</li>` : ""}
        ${party ? `<li><strong>Party size:</strong> ${party}</li>` : ""}
        <li><strong>When:</strong> ${when}</li>
        ${summary ? `<li><strong>Summary:</strong> ${escapeHtml(summary)}</li>` : ""}
      </ul>
      ${calendarNote}
      <p style="color:#64748b;font-size:13px">Reference: ${escapeHtml(params.appointmentId.slice(0, 8))}</p>
    </div>
  `.trim();
}

function buildTeamNotificationHtml(params: SendBookingEmailsParams): string {
  const summary = formatBookingSummary(params.parsed);
  const org = escapeHtml(params.organizationName);
  const name = escapeHtml(params.customerName);
  const email = params.customerEmail ? escapeHtml(params.customerEmail) : "—";
  const when = escapeHtml(formatWhen(params.parsed));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const overviewUrl = `${appUrl.replace(/\/$/, "")}/appointments/overview`;

  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:520px">
      <p><strong>New booking</strong> for ${org}</p>
      <ul>
        <li><strong>Guest:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>When:</strong> ${when}</li>
        ${summary ? `<li><strong>Details:</strong> ${escapeHtml(summary)}</li>` : ""}
      </ul>
      <p><a href="${escapeHtml(overviewUrl)}">View in Appointments overview</a></p>
    </div>
  `.trim();
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

  if (params.customerEmail) {
    results.guest = await sendSmtpMessage({
      to: [params.customerEmail],
      subject: `Booking received — ${params.organizationName}`,
      html: buildGuestConfirmationHtml(params),
    });
  }

  const notifyTo = await loadOrganizationNotifyEmails(params.organizationId);
  if (notifyTo.length > 0) {
    results.team = await sendSmtpMessage({
      to: notifyTo,
      subject: `New booking — ${params.customerName} (${params.organizationName})`,
      html: buildTeamNotificationHtml(params),
    });
  }

  return results;
}
