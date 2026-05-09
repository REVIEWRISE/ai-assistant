import { NextResponse } from "next/server";
import { syncAllConnectedReviewProviders } from "@/lib/review-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  void request;

  const result = await syncAllConnectedReviewProviders();
  return NextResponse.json({ ok: true, result });
}
