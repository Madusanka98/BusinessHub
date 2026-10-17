import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unreachable";

  try {
    // Light query to verify active MySQL connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "disconnected";
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: dbStatus,
        error: "Database connectivity check failed.",
      },
      { status: 503 }
    );
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      latencyMs: responseTimeMs,
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
