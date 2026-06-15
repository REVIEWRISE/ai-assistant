import { NextResponse } from "next/server";
import { syncScheduledReviewProviders } from "@/lib/review-sync";
import { verifyReviewSyncCronRequest } from "@/lib/review-sync-cron";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!verifyReviewSyncCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncScheduledReviewProviders();
  return NextResponse.json({ ok: true, result });
}
