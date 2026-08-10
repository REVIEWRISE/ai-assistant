import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  }

  await import("./sentry.server.config");

  const { assertTokenEncryptionConfigured } = await import("@/lib/token-encryption");
  assertTokenEncryptionConfigured();

  const { startReviewSyncCronScheduler } = await import("@/lib/review-sync-scheduler");
  startReviewSyncCronScheduler();
}

export const onRequestError = Sentry.captureRequestError;
