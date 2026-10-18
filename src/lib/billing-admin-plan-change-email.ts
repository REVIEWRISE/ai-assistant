import "server-only";

import { PRODUCT_NAME } from "@/lib/brand";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { PLAN_SLUGS, getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";
import { getAppUrl } from "@/lib/stripe";
import { isSmtpConfigured, sendSmtpHtmlEmail } from "@/lib/smtp-mail";

const log = createLogger("billing-admin-plan-change-email");

export type OrganizationPlanChangeSnapshot = {
  planSlug: string | null;
  billingInterval: string | null;
  billingStatus: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function planDisplay(slug: string | null | undefined): string {
  if (!slug) return "No plan";
  if ((PLAN_SLUGS as readonly string[]).includes(slug)) {
    return getPlanBySlug(slug as PlanSlug).name;
  }
  return slug.replace(/_/g, " ");
}

function intervalDisplay(value: string | null | undefined): string {
  if (!value) return "—";
  if (value === "monthly") return "Monthly";
  if (value === "yearly") return "Yearly";
  return value;
}

function statusDisplay(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatWhen(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function detailRow(label: string, value: string, changed = false): string {
  const valueStyle = changed
    ? "color:#18181b;font-weight:700;"
    : "color:#18181b;font-weight:600;";
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:12px;color:#71717a;width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;${valueStyle}">${escapeHtml(value)}</td>
  </tr>`;
}

function sectionLabel(label: string): string {
  return `<p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#a1a1aa;">${escapeHtml(label)}</p>`;
}

function buildPlanChangeEmailHtml(params: {
  organizationName: string;
  organizationId: string;
  actorName: string;
  actorEmail: string;
  from: OrganizationPlanChangeSnapshot;
  to: OrganizationPlanChangeSnapshot;
  billingSynced: boolean;
  changedAt: Date;
  reviewUrl: string;
}): string {
  const planChanged = (params.from.planSlug ?? "") !== (params.to.planSlug ?? "");
  const intervalChanged =
    (params.from.billingInterval ?? "") !== (params.to.billingInterval ?? "");
  const statusChanged =
    (params.from.billingStatus ?? "") !== (params.to.billingStatus ?? "");
  const url = escapeHtml(params.reviewUrl);

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:#0c0c0c;">
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#a1a1aa;">${escapeHtml(PRODUCT_NAME)}</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">Workspace plan changed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#18181b;line-height:1.6;">Admin alert</p>
              <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.65;">
                <strong style="color:#18181b;">${escapeHtml(params.actorName)}</strong>
                (${escapeHtml(params.actorEmail)}) updated billing for
                <strong style="color:#18181b;">${escapeHtml(params.organizationName)}</strong>.
              </p>

              ${sectionLabel("Before")}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                ${detailRow("Plan", planDisplay(params.from.planSlug))}
                ${detailRow("Interval", intervalDisplay(params.from.billingInterval))}
                ${detailRow("Status", statusDisplay(params.from.billingStatus))}
              </table>

              ${sectionLabel("After")}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                ${detailRow("Plan", planDisplay(params.to.planSlug), planChanged)}
                ${detailRow("Interval", intervalDisplay(params.to.billingInterval), intervalChanged)}
                ${detailRow("Status", statusDisplay(params.to.billingStatus), statusChanged)}
              </table>

              ${sectionLabel("Details")}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                ${detailRow("Workspace", params.organizationName)}
                ${detailRow(
                  "Billing sync",
                  params.billingSynced
                    ? "Synced to Billing service"
                    : "Local app grant only (Billing not updated)",
                )}
                ${detailRow("Changed at", formatWhen(params.changedAt))}
                ${detailRow("Changed by", `${params.actorName} <${params.actorEmail}>`)}
              </table>

              <p style="margin:0 0 24px;">
                <a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  Review workspaces
                </a>
              </p>
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                If the button does not work, paste this link into your browser:<br />
                <a href="${url}" style="color:#18181b;word-break:break-all;">${url}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function configuredNotifyEmails(): string[] {
  const raw =
    process.env.BILLING_ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.BOOKING_NOTIFY_EMAIL?.trim() ||
    "";
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;]+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

async function listPlanChangeRecipients(excludeUserId: string): Promise<
  Array<{ id: string | null; email: string; fullName: string }>
> {
  const admins = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      accountStatus: "active",
      userRoles: { some: { role: { name: "Admin" } } },
    },
    select: { id: true, email: true, fullName: true },
    orderBy: { email: "asc" },
  });

  const byEmail = new Map<string, { id: string | null; email: string; fullName: string }>();
  for (const admin of admins) {
    const email = admin.email.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, {
      id: admin.id,
      email: admin.email.trim(),
      fullName: admin.fullName.trim() || admin.email.trim(),
    });
  }

  // Ops / shared inbox — always included so a solo-admin setup still gets mail.
  for (const email of configuredNotifyEmails()) {
    if (byEmail.has(email)) continue;
    byEmail.set(email, {
      id: null,
      email,
      fullName: email,
    });
  }

  return [...byEmail.values()];
}

/**
 * Emails every other system admin when a workspace plan/status is overridden.
 * Fire-and-forget safe: never throws to the caller.
 */
export async function notifyAdminsOfOrganizationPlanChange(input: {
  actorUserId: string;
  organizationId: string;
  organizationName: string;
  from: OrganizationPlanChangeSnapshot;
  to: OrganizationPlanChangeSnapshot;
  billingSynced: boolean;
}): Promise<void> {
  try {
    const changed =
      (input.from.planSlug ?? "") !== (input.to.planSlug ?? "") ||
      (input.from.billingInterval ?? "") !== (input.to.billingInterval ?? "") ||
      (input.from.billingStatus ?? "") !== (input.to.billingStatus ?? "");
    if (!changed) return;

    if (!isSmtpConfigured()) {
      log.warn("SMTP not configured — admin plan-change emails skipped", {
        organizationId: input.organizationId,
      });
      return;
    }

    const [actor, recipients] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.actorUserId },
        select: { fullName: true, email: true },
      }),
      listPlanChangeRecipients(input.actorUserId),
    ]);

    if (!actor?.email) {
      log.warn("actor missing for plan-change notification", {
        actorUserId: input.actorUserId,
      });
      return;
    }
    if (recipients.length === 0) {
      log.info("no plan-change email recipients", {
        organizationId: input.organizationId,
        hint: "Add another Admin user, or set BILLING_ADMIN_NOTIFY_EMAIL / BOOKING_NOTIFY_EMAIL",
      });
      return;
    }

    const changedAt = new Date();
    const reviewUrl = `${getAppUrl()}/billing-admin/organizations`;
    const html = buildPlanChangeEmailHtml({
      organizationName: input.organizationName,
      organizationId: input.organizationId,
      actorName: actor.fullName.trim() || actor.email,
      actorEmail: actor.email,
      from: input.from,
      to: input.to,
      billingSynced: input.billingSynced,
      changedAt,
      reviewUrl,
    });

    const subject = `${PRODUCT_NAME}: ${input.organizationName} plan changed by ${actor.fullName.trim() || actor.email}`;

    const results = await Promise.all(
      recipients.map((recipient) =>
        sendSmtpHtmlEmail({
          to: recipient.email,
          subject,
          html,
        }).then((result) => ({ recipientId: recipient.id, email: recipient.email, result })),
      ),
    );

    const failed = results.filter((row) => !row.result.ok);
    if (failed.length > 0) {
      log.error("some admin plan-change emails failed", {
        organizationId: input.organizationId,
        failed: failed.map((row) => ({
          email: row.email,
          error: row.result.ok ? undefined : row.result.error,
          skipped: row.result.ok ? undefined : row.result.skipped,
        })),
      });
    } else {
      log.info("admin plan-change emails sent", {
        organizationId: input.organizationId,
        recipientCount: recipients.length,
      });
    }
  } catch (error) {
    log.error("notifyAdminsOfOrganizationPlanChange failed", {
      organizationId: input.organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
