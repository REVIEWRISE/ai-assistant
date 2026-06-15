import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { syncScheduledReviewProviders } = await import("../src/lib/review-sync");

  const startedAt = new Date();
  console.log(`[review-sync-cron] started ${startedAt.toISOString()}`);

  const result = await syncScheduledReviewProviders();
  console.log(
    `[review-sync-cron] finished attempted=${result.attempted} synced=${result.synced} empty=${result.empty} failed=${result.failed} inserted=${result.totalInserted}`,
  );

  if (result.failed > 0) {
    console.error("[review-sync-cron] failing details:", JSON.stringify(result.details, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[review-sync-cron] fatal error:", error);
    process.exit(1);
  });
