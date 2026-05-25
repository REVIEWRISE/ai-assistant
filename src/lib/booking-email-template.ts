import type { BookingFlowQaItem } from "@/lib/booking-flow-qa";
import {
  BRAND_LOGO_PATH,
  BRAND_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  MAIN_SITE_URL,
  PRODUCT_NAME,
} from "@/lib/brand";
import {
  formatBookingSummary,
  resolveBookingServiceDescription,
  type ParsedBookingUtterance,
} from "@/lib/parse-booking-utterance";

const EMAIL_COLORS = {
  bg: "#f1f5f9",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  border: "#e2e8f0",
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  primarySoft: "#eef2ff",
  success: "#10b981",
  successSoft: "#ecfdf5",
  warning: "#f59e0b",
  warningSoft: "#fffbeb",
  headerGradStart: "#41a5ff",
  headerGradEnd: "#2a52be",
  footerBg: "#f8fafc",
} as const;

export type BookingEmailContentParams = {
  appointmentId: string;
  organizationId: string;
  organizationName: string;
  /** Absolute URL to the organization (or provider) logo for the email header. */
  organizationLogoUrl?: string | null;
  customerName: string;
  customerEmail: string | null;
  parsed: ParsedBookingUtterance;
  bookingFlowQa?: BookingFlowQaItem[] | null;
  calendarSynced: boolean;
};

const PLACEHOLDER_GUEST_NAMES = new Set(["website guest", "guest", "anonymous", "unknown"]);

/** Returns a displayable guest name, or null when none was provided. */
export function displayGuestName(name: string | null | undefined): string | null {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_GUEST_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appPublicUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

function platformLogoUrl(): string | null {
  const base = appPublicUrl();
  if (!base || base.includes("localhost")) return null;
  const path = BRAND_LOGO_PATH.startsWith("/") ? BRAND_LOGO_PATH : `/${BRAND_LOGO_PATH}`;
  return `${base}${path}`;
}

type EmailBrandingMode = "organization" | "platform";

function emailFooterHtml(
  branding: EmailBrandingMode,
  opts: { organizationName: string; footerExtra?: string },
): string {
  const year = new Date().getFullYear();
  const org = escapeHtml(opts.organizationName);

  if (branding === "organization") {
    return `
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${EMAIL_COLORS.text};">${org}</p>
      <p style="margin:0 0 12px;font-size:12px;color:${EMAIL_COLORS.muted};line-height:1.6;">
        If you have questions about this booking, please contact <strong style="color:${EMAIL_COLORS.text};">${org}</strong> directly.
      </p>
      ${opts.footerExtra ? `<p style="margin:0;font-size:11px;color:${EMAIL_COLORS.subtle};line-height:1.5;">${opts.footerExtra}</p>` : ""}
    `.trim();
  }

  return `
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.text};">
      ${escapeHtml(BRAND_NAME)} · ${escapeHtml(PRODUCT_NAME)}
    </p>
    <p style="margin:0 0 12px;font-size:12px;color:${EMAIL_COLORS.muted};line-height:1.6;">
      <a href="${escapeHtml(MAIN_SITE_URL)}" style="color:${EMAIL_COLORS.primary};text-decoration:none;">${escapeHtml(MAIN_SITE_URL.replace(/^https?:\/\//, ""))}</a>
      · <a href="mailto:${escapeHtml(CONTACT_EMAIL)}" style="color:${EMAIL_COLORS.primary};text-decoration:none;">${escapeHtml(CONTACT_EMAIL)}</a>
      · ${escapeHtml(CONTACT_PHONE)}
    </p>
    ${opts.footerExtra ? `<p style="margin:0;font-size:11px;color:${EMAIL_COLORS.subtle};line-height:1.5;">${opts.footerExtra}</p>` : ""}
    <p style="margin:12px 0 0;font-size:11px;color:${EMAIL_COLORS.subtle};">
      © ${year} ${escapeHtml(BRAND_NAME)}. All rights reserved.
    </p>
  `.trim();
}

function headerLogoBlock(organizationName: string, organizationLogoUrl: string | null | undefined): string {
  if (organizationLogoUrl) {
    return `
      <div style="width:48px;height:48px;border-radius:12px;background:#ffffff;padding:4px;box-shadow:0 2px 8px rgba(15,23,42,0.12);">
        <img
          src="${escapeHtml(organizationLogoUrl)}"
          alt="${escapeHtml(organizationName)} logo"
          width="40"
          height="40"
          style="display:block;width:40px;height:40px;border:0;border-radius:8px;object-fit:contain;"
        />
      </div>
    `.trim();
  }

  const initial = organizationName.trim().charAt(0).toUpperCase() || "O";
  return `
    <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);text-align:center;line-height:48px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
      ${escapeHtml(initial)}
    </div>
  `.trim();
}

function formatWhenRange(parsed: ParsedBookingUtterance): string {
  if (!parsed.startTime) return "To be confirmed";
  const startFmt = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed.startTime);

  if (!parsed.endTime || parsed.endTime.getTime() <= parsed.startTime.getTime()) {
    return startFmt;
  }

  const endFmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed.endTime);

  return `${startFmt} – ${endFmt}`;
}

function formatDuration(parsed: ParsedBookingUtterance): string | null {
  if (!parsed.startTime || !parsed.endTime) return null;
  const mins = Math.round((parsed.endTime.getTime() - parsed.startTime.getTime()) / 60_000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hour${h > 1 ? "s" : ""}`;
}

function parsedForDisplay(params: BookingEmailContentParams): ParsedBookingUtterance {
  return {
    ...params.parsed,
    serviceDescription: resolveBookingServiceDescription({
      parsed: params.parsed,
      bookingFlowQa: params.bookingFlowQa,
    }),
  };
}

function detailRow(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid ${EMAIL_COLORS.border};width:38%;vertical-align:top;font-size:13px;font-weight:600;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid ${EMAIL_COLORS.border};vertical-align:top;font-size:15px;font-weight:500;color:${EMAIL_COLORS.text};">
        ${escapeHtml(value.trim())}
      </td>
    </tr>
  `.trim();
}

function statusBadgeHtml(calendarSynced: boolean): string {
  if (calendarSynced) {
    return `
      <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${EMAIL_COLORS.successSoft};color:${EMAIL_COLORS.success};font-size:12px;font-weight:700;letter-spacing:0.03em;">
        ✓ Confirmed on calendar
      </span>
    `.trim();
  }
  return `
    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${EMAIL_COLORS.warningSoft};color:${EMAIL_COLORS.warning};font-size:12px;font-weight:700;letter-spacing:0.03em;">
      Request received — team will confirm
    </span>
  `.trim();
}

function bookingDetailsTable(
  parsed: ParsedBookingUtterance,
  extras: {
    organizationName: string;
    guestName: string;
    guestEmail: string | null;
    referenceId: string;
  },
): string {
  const rows = [
    detailRow("Organization", extras.organizationName),
    detailRow("Guest name", displayGuestName(extras.guestName)),
    detailRow("Email", extras.guestEmail),
    detailRow("Service", parsed.serviceDescription),
    detailRow("Party size", parsed.partySize != null ? String(parsed.partySize) : null),
    detailRow("Date & time", formatWhenRange(parsed)),
    detailRow("Duration", formatDuration(parsed)),
    detailRow("Reference", extras.referenceId.slice(0, 8).toUpperCase()),
  ].filter(Boolean);

  if (rows.length === 0) return "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${EMAIL_COLORS.border};border-radius:12px;overflow:hidden;background:${EMAIL_COLORS.card};">
      ${rows.join("")}
    </table>
  `.trim();
}

function qaSectionHtml(qa: BookingFlowQaItem[] | null | undefined): string {
  if (!qa?.length) return "";

  const items = qa
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid ${EMAIL_COLORS.border};vertical-align:top;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">
            ${escapeHtml(item.question)}
          </p>
          <p style="margin:0;font-size:15px;color:${EMAIL_COLORS.text};line-height:1.5;">
            ${escapeHtml(item.answer)}
          </p>
        </td>
      </tr>
    `,
    )
    .join("");

  return `
    <h2 style="margin:28px 0 12px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;">
      Booking details you provided
    </h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${EMAIL_COLORS.border};border-radius:12px;overflow:hidden;">
      ${items}
    </table>
  `.trim();
}

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,${EMAIL_COLORS.headerGradStart},${EMAIL_COLORS.headerGradEnd});">
          <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

type LayoutOptions = {
  branding: EmailBrandingMode;
  organizationName: string;
  organizationLogoUrl?: string | null;
  preheader: string;
  headerEyebrow: string;
  headerTitle: string;
  headerSubtitle: string;
  bodyHtml: string;
  footerExtra?: string;
};

function wrapEmailLayout(opts: LayoutOptions): string {
  const logoBlock =
    opts.branding === "platform"
      ? headerLogoBlock(BRAND_NAME, platformLogoUrl())
      : headerLogoBlock(opts.organizationName, opts.organizationLogoUrl);

  const preheader = escapeHtml(opts.preheader);
  const footerContent = emailFooterHtml(opts.branding, {
    organizationName: opts.organizationName,
    footerExtra: opts.footerExtra,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(opts.headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL_COLORS.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="border-radius:16px 16px 0 0;background:linear-gradient(135deg,${EMAIL_COLORS.headerGradStart} 0%,${EMAIL_COLORS.primary} 45%,${EMAIL_COLORS.headerGradEnd} 100%);padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="48" valign="middle">${logoBlock}</td>
                  <td valign="middle" style="padding-left:14px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.12em;">
                      ${escapeHtml(opts.headerEyebrow)}
                    </p>
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.25;letter-spacing:-0.02em;">
                      ${escapeHtml(opts.headerTitle)}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:14px;">
                    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.92);line-height:1.5;">
                      ${escapeHtml(opts.headerSubtitle)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:${EMAIL_COLORS.card};padding:32px;border-left:1px solid ${EMAIL_COLORS.border};border-right:1px solid ${EMAIL_COLORS.border};">
              ${opts.bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-radius:0 0 16px 16px;background:${EMAIL_COLORS.footerBg};padding:24px 32px;border:1px solid ${EMAIL_COLORS.border};border-top:none;text-align:center;">
              ${footerContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildGuestConfirmationHtml(params: BookingEmailContentParams): string {
  const parsed = parsedForDisplay(params);
  const summary = formatBookingSummary(parsed);
  const org = params.organizationName;
  const name = displayGuestName(params.customerName);
  const when = formatWhenRange(params.parsed);

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:16px;color:${EMAIL_COLORS.text};line-height:1.6;">
      ${name ? `Hi <strong>${escapeHtml(name)}</strong>,` : "Hi there,"}
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:${EMAIL_COLORS.muted};line-height:1.65;">
      Thank you for booking with <strong style="color:${EMAIL_COLORS.text};">${escapeHtml(org)}</strong>.
      We have received your request and saved the details below.
    </p>
    <p style="margin:0 0 24px;">${statusBadgeHtml(params.calendarSynced)}</p>

    <h2 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;">
      Your appointment
    </h2>
    ${bookingDetailsTable(parsed, {
      organizationName: org,
      guestName: params.customerName,
      guestEmail: params.customerEmail,
      referenceId: params.appointmentId,
    })}

    ${qaSectionHtml(params.bookingFlowQa)}

    ${
      summary
        ? `<p style="margin:24px 0 0;padding:16px;border-radius:10px;background:${EMAIL_COLORS.primarySoft};font-size:14px;color:${EMAIL_COLORS.text};line-height:1.55;">
            <strong style="color:${EMAIL_COLORS.primaryDark};">Quick summary:</strong> ${escapeHtml(summary)}
          </p>`
        : ""
    }

    <h2 style="margin:28px 0 12px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;">
      What happens next
    </h2>
    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:${EMAIL_COLORS.muted};line-height:1.7;">
      ${
        params.calendarSynced
          ? `<li style="margin-bottom:8px;">Your selected time is on our calendar.</li>
             <li style="margin-bottom:8px;">If we need to adjust anything, we will contact you at this email.</li>`
          : `<li style="margin-bottom:8px;">Our team will review availability for <strong style="color:${EMAIL_COLORS.text};">${escapeHtml(when)}</strong>.</li>
             <li style="margin-bottom:8px;">You will receive a follow-up once your booking is confirmed.</li>`
      }
      <li>Keep this email for your records — reference <strong style="color:${EMAIL_COLORS.text};">${escapeHtml(params.appointmentId.slice(0, 8).toUpperCase())}</strong>.</li>
    </ul>
  `.trim();

  return wrapEmailLayout({
    branding: "organization",
    organizationName: org,
    organizationLogoUrl: params.organizationLogoUrl,
    preheader: `Booking received for ${org} — ${when}`,
    headerEyebrow: "Booking confirmation",
    headerTitle: org,
    headerSubtitle: "Your request has been received",
    bodyHtml,
    footerExtra: "Please keep this email for your records.",
  });
}

export function buildTeamNotificationHtml(params: BookingEmailContentParams): string {
  const parsed = parsedForDisplay(params);
  const summary = formatBookingSummary(parsed);
  const org = params.organizationName;
  const guestName = displayGuestName(params.customerName);
  const overviewUrl = `${appPublicUrl()}/appointments/overview`;

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:16px;color:${EMAIL_COLORS.text};line-height:1.6;">
      <strong>New booking</strong> just came in for <strong>${escapeHtml(org)}</strong>.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:${EMAIL_COLORS.muted};line-height:1.65;">
      Review the guest details below and follow up from Appointments overview.
    </p>
    <p style="margin:0 0 24px;">${statusBadgeHtml(params.calendarSynced)}</p>

    <h2 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.muted};text-transform:uppercase;letter-spacing:0.08em;">
      Guest &amp; booking
    </h2>
    ${bookingDetailsTable(parsed, {
      organizationName: org,
      guestName: params.customerName,
      guestEmail: params.customerEmail ?? "Not provided",
      referenceId: params.appointmentId,
    })}

    ${qaSectionHtml(params.bookingFlowQa)}

    ${
      summary
        ? `<p style="margin:24px 0 0;padding:16px;border-radius:10px;background:${EMAIL_COLORS.primarySoft};font-size:14px;color:${EMAIL_COLORS.text};line-height:1.55;">
            <strong style="color:${EMAIL_COLORS.primaryDark};">Parser summary:</strong> ${escapeHtml(summary)}
          </p>`
        : ""
    }

    ${ctaButton(overviewUrl, "Open Appointments overview")}
  `.trim();

  return wrapEmailLayout({
    branding: "platform",
    organizationName: org,
    organizationLogoUrl: params.organizationLogoUrl,
    preheader: guestName ? `New booking: ${guestName} — ${org}` : `New booking — ${org}`,
    headerEyebrow: PRODUCT_NAME,
    headerTitle: "New booking",
    headerSubtitle: guestName ? `${guestName} · ${org}` : org,
    bodyHtml,
    footerExtra:
      "You are receiving this because you are a member of this workspace or a notify address is configured.",
  });
}
