export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { assertTokenEncryptionConfigured } = await import("@/lib/token-encryption");
  assertTokenEncryptionConfigured();

  const { startReviewSyncCronScheduler } = await import("@/lib/review-sync-scheduler");
  startReviewSyncCronScheduler();
}
