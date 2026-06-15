import {
  REVIEW_SYNC_SCHEDULER_TICK_MS,
  shouldStartReviewSyncScheduler,
} from "@/lib/review-sync-cron";
import { syncScheduledReviewProviders } from "@/lib/review-sync";

type SchedulerGlobal = typeof globalThis & {
  __reviewSyncSchedulerStarted?: boolean;
  __reviewSyncSchedulerRunning?: boolean;
  __reviewSyncSchedulerTimer?: ReturnType<typeof setInterval>;
  __reviewSyncSchedulerBootTimer?: ReturnType<typeof setTimeout>;
};

const globalState = globalThis as SchedulerGlobal;

const BOOT_DELAY_MS = 15_000;

async function runReviewSyncSchedulerTick(): Promise<void> {
  if (globalState.__reviewSyncSchedulerRunning) return;
  globalState.__reviewSyncSchedulerRunning = true;
  try {
    const result = await syncScheduledReviewProviders();
    if (result.attempted > 0 || result.failed > 0 || result.totalInserted > 0) {
      console.info(
        "[review-sync-scheduler] tick",
        JSON.stringify({
          attempted: result.attempted,
          synced: result.synced,
          empty: result.empty,
          failed: result.failed,
          inserted: result.totalInserted,
        }),
      );
    }
  } catch (error) {
    console.error(
      "[review-sync-scheduler] tick failed",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    globalState.__reviewSyncSchedulerRunning = false;
  }
}

export function startReviewSyncCronScheduler(): void {
  if (globalState.__reviewSyncSchedulerStarted) return;
  if (!shouldStartReviewSyncScheduler()) return;

  globalState.__reviewSyncSchedulerStarted = true;
  console.info(
    `[review-sync-scheduler] enabled (first tick in ${BOOT_DELAY_MS / 1000}s, then every ${REVIEW_SYNC_SCHEDULER_TICK_MS / 1000}s)`,
  );

  globalState.__reviewSyncSchedulerBootTimer = setTimeout(() => {
    void runReviewSyncSchedulerTick();
  }, BOOT_DELAY_MS);

  globalState.__reviewSyncSchedulerTimer = setInterval(() => {
    void runReviewSyncSchedulerTick();
  }, REVIEW_SYNC_SCHEDULER_TICK_MS);
}
