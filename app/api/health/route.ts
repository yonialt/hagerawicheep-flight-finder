import { NextResponse } from "next/server";
import { getUsdToEtbRate } from "@/lib/exchangeRate";
import { duffelEnabled } from "@/lib/providers/duffel";
import { amadeusEnabled } from "@/lib/providers/amadeus";
import { kiwiEnabled } from "@/lib/providers/kiwi";

/**
 * GET /api/health — smoke-test endpoint for uptime checks and deploys.
 * Verifies process liveness, DB reachability (if configured), and provider config.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
    providers: {
      duffel: duffelEnabled() ? "configured" : "not-configured",
      amadeus: amadeusEnabled() ? "configured" : "not-configured",
      kiwi: kiwiEnabled() ? "configured" : "not-configured",
      demo: "always-on",
    },
    database: process.env.DATABASE_URL ? "postgres" : "memory-fallback",
  };

  if (process.env.DATABASE_URL) {
    try {
      const { pingDb } = await import("@/lib/store");
      await pingDb();
      checks.database = "postgres-connected";
    } catch (e) {
      checks.database = "postgres-error";
      checks.dbError = e instanceof Error ? e.message : String(e);
    }
  }

  try {
    checks.usdEtbRate = await getUsdToEtbRate();
  } catch {
    checks.usdEtbRate = null;
  }

  return NextResponse.json(checks);
}
