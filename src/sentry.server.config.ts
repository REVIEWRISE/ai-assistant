import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN is safe to read server-side too — Sentry DSNs aren't
// secret, the NEXT_PUBLIC_ prefix is only there so Next.js also inlines it
// into the client bundle (see instrumentation-client.ts). Unset = SDK no-ops.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
