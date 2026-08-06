import { NextRequest, NextResponse } from "next/server";
import { isBookingSmtpConfigured } from "@/lib/booking-email";
import { checkDbSchema } from "@/lib/db-schema-check";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const log = createLogger("health");

/**
 * Health check endpoint used by Docker / load balancers.
 *
 * - Internal callers (same-host Docker healthcheck) receive full schema details.
 * - External callers get only a minimal status response to avoid leaking
 *   internal structure (SOC 2 CC6.6).
 *
 * "Internal" requires the X-Health-Token header to match HEALTH_CHECK_TOKEN.
 * In production, a missing/unset token means NO request is treated as internal —
 * fail closed rather than leaking schema details if the token isn't configured
 * or the app port is ever reachable directly (bypassing the reverse proxy).
 * The no-header/localhost fallback only applies outside production, for local dev.
 */
function isInternalRequest(req: NextRequest): boolean {
  const token = process.env.HEALTH_CHECK_TOKEN?.trim();
  if (token) {
    return req.headers.get("x-health-token") === token;
  }
  if (process.env.NODE_ENV === "production") return false;

  // Dev-only fallback: allow if no token is configured and the request looks local.
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() ?? realIp ?? "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "";
}

export async function GET(req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const schema = await checkDbSchema();

    const healthy = schema.schemaInSync;
    const status = healthy ? 200 : 503;

    if (isInternalRequest(req)) {
      // Full details for Docker healthcheck / internal monitoring
      return NextResponse.json(
        {
          status: healthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
          database: "connected",
          schema,
          bookingEmail: {
            smtpConfigured: isBookingSmtpConfigured(),
            customerEmailColumn: schema.customerEmailColumn,
          },
        },
        { status },
      );
    }

    // Minimal response for external callers — no internal details
    return NextResponse.json(
      { status: healthy ? "healthy" : "unhealthy" },
      { status },
    );
  } catch (error) {
    log.error("check failed", { error: error instanceof Error ? error.message : String(error) });

    // Never expose error messages externally
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
