import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Baseline CSP shipped in report-only mode first (SOC 2 CC6.6) — 'unsafe-inline' for
// script/style is required today by the inline theme-initializer script (src/app/layout.tsx)
// and Next.js/Tailwind runtime styles. Tighten to nonce-based script-src once verified
// clean in the browser across the main flows (see DEPLOYMENT.md "Content-Security-Policy").
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
].join("; ");

const CSP_REPORT_ONLY_EMBED = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // /embed/* is designed to be iframed on customer sites — no frame-ancestors restriction.
  "frame-ancestors *",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["nodemailer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
      {
        // /embed/* is meant to be iframed on third-party sites — do not block framing.
        source: "/embed/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY_EMBED },
        ],
      },
    ];
  },
};

// SENTRY_AUTH_TOKEN is optional — without it, source-map upload is skipped
// gracefully (no build failure). SENTRY_DSN itself lives in the SDK init
// calls (src/instrumentation.ts, src/instrumentation-client.ts), not here.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
});
