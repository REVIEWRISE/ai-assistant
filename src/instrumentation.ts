export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { startReviewSyncCronScheduler } = await import("@/lib/review-sync-scheduler");
  startReviewSyncCronScheduler();
}
