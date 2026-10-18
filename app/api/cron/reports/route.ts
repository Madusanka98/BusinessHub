import { NextRequest, NextResponse } from "next/server";
import { processAllDueReports } from "@/modules/reports/services/scheduler.service";

/**
 * Trigger scheduled report execution externally via cron services (e.g. Hostinger Cron, Cloudflare Cron Triggers).
 * Requires authorization header or 'x-cron-secret' header matching CRON_SECRET environment variable.
 */
async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecretHeader = req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 503 }
    );
  }

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : cronSecretHeader;

  if (!token || token !== secret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing cron secret." },
      { status: 401 }
    );
  }

  try {
    const summary = await processAllDueReports();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error processing cron reports";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
