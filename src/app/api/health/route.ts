import { NextResponse } from "next/server";
import { isBookingSmtpConfigured } from "@/lib/booking-email";
import { checkDbSchema } from "@/lib/db-schema-check";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const schema = await checkDbSchema();

    if (!schema.schemaInSync) {
      return NextResponse.json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        schema,
        bookingEmail: {
          smtpConfigured: isBookingSmtpConfigured(),
          customerEmailColumn: schema.customerEmailColumn,
        },
      }, { status: 503 });
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      schema: {
        schemaInSync: true,
        missingTables: [],
        customerEmailColumn: true,
      },
      bookingEmail: {
        smtpConfigured: isBookingSmtpConfigured(),
        customerEmailColumn: true,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Healthcheck failed:", error);
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 503 });
  }
}
