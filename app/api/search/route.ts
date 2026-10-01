import { NextResponse } from "next/server";
import { validateSearch } from "@/lib/validate";
import { runSearch } from "@/lib/search";

/**
 * POST /api/search — the main search endpoint (roadmap 1.4).
 *
 * Body: { origin, destination, departureDate, returnDate?, passengers?, sortBy?, cabin? }
 * Returns: { results: Flight[], meta: { searchId, totalResults, routeType, cached, ... } }
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON", status: 400 }, { status: 400 });
  }

  const v = validateSearch(body);
  if (!v.ok) {
    return NextResponse.json({ error: v.error, status: v.status }, { status: v.status });
  }

  try {
    const response = await runSearch(v.value);
    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/search] unexpected failure:", err);
    return NextResponse.json(
      { error: "Temporary service issue, try again in 60 seconds", cached: true, status: 503 },
      { status: 503 }
    );
  }
}
