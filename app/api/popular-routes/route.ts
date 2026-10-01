import { NextResponse } from "next/server";
import { getPopularRoutes } from "@/lib/store";

/**
 * GET /api/popular-routes — cheapest ETB fare per popular route from the
 * last 24h of fare snapshots (roadmap 1.6). Powers the homepage cards.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const routes = await getPopularRoutes();
    return NextResponse.json({ routes });
  } catch (err) {
    console.error("[api/popular-routes] failed:", err);
    return NextResponse.json({ routes: [], error: "Unable to load popular routes" }, { status: 500 });
  }
}
