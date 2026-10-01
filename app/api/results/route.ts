import { NextResponse } from "next/server";
import { findCachedSearchById } from "@/lib/cache";

/**
 * GET /api/results?id=<searchId> — fetch a previous search's results by ID.
 * The search orchestrator caches every response, so the results page can
 * re-read it (and re-sort server-side later) without hitting providers again.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id query parameter", status: 400 }, { status: 400 });
  }

  const cached = await findCachedSearchById(id);
  if (cached) {
    return NextResponse.json(cached);
  }

  return NextResponse.json(
    { error: "Search results expired or not found. Run a new search.", status: 404 },
    { status: 404 }
  );
}
