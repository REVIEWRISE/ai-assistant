import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function smtpConfigFromEnv(fromOverride?: string): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim() || process.env.SMTP_EMAIL?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;

  const fromName = process.env.AUTH_EMAIL_FROM_NAME?.trim() || "VyntRise Agent";
  const from =
    fromOverride?.trim() ||
    process.env.AUTH_EMAIL_FROM?.trim() ||
    process.env.BOOKING_EMAIL_FROM?.trim() ||
    `${fromName} <${user}>`;

  return { host, port: Number.isFinite(port) ? port : 587, secure, user, pass, from };
}

export function isSmtpConfigured(): boolean {
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

export type SendMailResult = { ok: true } | { ok: false; skipped?: boolean; error?: string };

export async function sendSmtpHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<SendMailResult> {
  const config = smtpConfigFromEnv(params.from);
  const transporter = getSmtpTransporter();
  if (!config || !transporter) {
    return { ok: false, skipped: true };
  }

  try {
    await transporter.sendMail({
      from: config.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
