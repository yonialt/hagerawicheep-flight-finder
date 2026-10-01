import pg from "pg";
import { lookupAirport } from "./airports";
import type { SearchResponse } from "./types";

/**
 * Persistence layer: PostgreSQL when DATABASE_URL is set, in-memory fallback
 * otherwise (dev/demo). Same interface either way, so Railway/Vercel Postgres
 * is a drop-in via env var. Migrations live in db/migrations/001_init.sql.
 */

const pool: pg.Pool | null = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  : null;

const memory = {
  searches: [] as SearchRow[],
  fareSnapshots: [] as FareSnapshotRow[],
  popular: new Map<string, PopularRow>(),
  searchResponses: [] as { id: string; response: SearchResponse; createdAt: Date }[],
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Types ----------

export interface SearchRow {
  searchId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  passengers: number;
  routeType: string;
  providerCount: number;
  userId?: string | null;
  createdAt: Date;
}

export interface FareSnapshotRow {
  routeId?: string;
  origin: string;
  destination: string;
  provider: string;
  departureDate: string;
  priceUsd: number;
  priceEtb: number;
  airlineCode: string;
  airlineName: string;
  durationMinutes: number;
  stops: number;
  cabinClass: string;
  baggageKg: number;
  bookingUrl: string;
  capturedAt: Date;
}

export interface PopularRow {
  destinationCode: string;
  city: string;
  country: string;
  image: string | null;
  routeType: string;
  priceEtb: number;
  priceUsd: number;
  airlineCode: string;
  capturedAt: Date;
}

// ---------- Search logging ----------

export async function logSearch(s: Omit<SearchRow, "createdAt">): Promise<void> {
  if (pool) {
    await pool.query(
      `INSERT INTO searches (id, origin_code, destination_code, departure_date, return_date, passengers, route_type, provider_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [s.searchId, s.origin, s.destination, s.departureDate, s.returnDate, s.passengers, s.routeType, s.providerCount]
    );
    return;
  }
  memory.searches.push({ ...s, createdAt: new Date() });
}

export async function getRecentSearches(limit = 20): Promise<SearchRow[]> {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT id AS "searchId", origin_code AS origin, destination_code AS destination,
              departure_date AS "departureDate", return_date AS "returnDate",
              passengers, route_type AS "routeType", provider_count AS "providerCount", created_at AS "createdAt"
       FROM searches ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows as SearchRow[];
  }
  return [...memory.searches].reverse().slice(0, limit);
}

// ---------- Durable search responses (results page survives restarts) ----------

export async function saveSearchResponse(s: {
  searchId: string;
  origin: string;
  destination: string;
  departureDate: string;
  passengers: number;
  response: SearchResponse;
}): Promise<void> {
  if (pool) {
    await pool.query(
      `INSERT INTO search_responses (id, origin_code, destination_code, departure_date, passengers, response)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [s.searchId, s.origin, s.destination, s.departureDate, s.passengers, JSON.stringify(s.response)]
    );
    return;
  }
  memory.searchResponses.push({ id: s.searchId, response: s.response, createdAt: new Date() });
}

export async function getSearchResponseById(searchId: string): Promise<SearchResponse | null> {
  // Guard: the column is UUID, and a malformed id would throw in Postgres.
  if (!UUID_RE.test(searchId)) return null;

  if (pool) {
    const { rows } = await pool.query(
      `SELECT response FROM search_responses WHERE id = $1 LIMIT 1`,
      [searchId]
    );
    if (rows.length === 0) return null;
    return rows[0].response as SearchResponse;
  }
  return memory.searchResponses.find((r) => r.id === searchId)?.response ?? null;
}

/**
 * Prune search responses past their useful life (cache TTL is 20 minutes,
 * but we keep 24h of history for the results page). Called opportunistically
 * after searches so no cron is needed.
 */
export async function pruneSearchResponses(maxAgeSeconds = 24 * 3600): Promise<void> {
  if (pool) {
    await pool.query(
      `DELETE FROM search_responses WHERE created_at < now() - ($1 * interval '1 second')`,
      [maxAgeSeconds]
    );
    return;
  }
  const cutoff = Date.now() - maxAgeSeconds * 1000;
  memory.searchResponses = memory.searchResponses.filter((r) => r.createdAt.getTime() >= cutoff);
}

// ---------- Fare snapshots (homepage popular routes) ----------

export async function saveFareSnapshots(snaps: FareSnapshotRow[]): Promise<void> {
  if (snaps.length === 0) return;
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const s of snaps) {
        await client.query(
          `INSERT INTO fare_snapshots
             (origin_code, destination_code, provider, departure_date, price_usd, price_etb,
              airline_code, airline_name, duration_minutes, stops, cabin_class, baggage_kg, booking_url, captured_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [s.origin, s.destination, s.provider, s.departureDate, s.priceUsd, s.priceEtb,
           s.airlineCode, s.airlineName, s.durationMinutes, s.stops, s.cabinClass, s.baggageKg, s.bookingUrl, s.capturedAt]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return;
  }
  memory.fareSnapshots.push(...snaps);
}

const POPULAR_DESTS: Array<{ code: string; tag: "Local" | "International" }> = [
  { code: "HBD", tag: "Local" }, { code: "BJR", tag: "Local" }, { code: "MQX", tag: "Local" },
  { code: "DXB", tag: "International" }, { code: "NBO", tag: "International" },
  { code: "IST", tag: "International" }, { code: "JFK", tag: "International" },
  { code: "JKA", tag: "International" },
];

/**
 * Cheapest known ETB fare per popular route, from the last 24h of snapshots.
 * Falls back to a live demo-provider search when no snapshots exist yet
 * (e.g. fresh install) so the homepage never shows dead placeholders.
 */
export async function getPopularRoutes(): Promise<import("./types").PopularRoute[]> {
  const out: import("./types").PopularRoute[] = [];

  if (pool) {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (destination_code)
              destination_code AS "destinationCode", price_etb AS "priceEtb", price_usd AS "priceUsd",
              airline_code AS "airlineCode", captured_at AS "capturedAt"
       FROM fare_snapshots
       WHERE origin_code = 'ADD' AND captured_at > now() - interval '24 hours'
       ORDER BY destination_code, price_etb ASC`
    );
    for (const r of rows) {
      const ap = lookupAirport(r.destinationCode);
      if (!ap) continue;
      out.push({
        destinationCode: r.destinationCode,
        city: ap.city,
        country: ap.country,
        image: ap.image ?? null,
        routeType: r.destinationCode && ap.country === "Ethiopia" ? "domestic" : "international",
        priceEtb: Number(r.priceEtb),
        priceUsd: Number(r.priceUsd),
        airlineCode: r.airlineCode,
        capturedAt: new Date(r.capturedAt).toISOString(),
      });
    }
    if (out.length > 0) return out;
  } else if (memory.fareSnapshots.length > 0) {
    const byDest = new Map<string, FareSnapshotRow>();
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const s of memory.fareSnapshots) {
      if (s.origin !== "ADD" || s.capturedAt.getTime() < cutoff) continue;
      const cur = byDest.get(s.destination);
      if (!cur || s.priceEtb < cur.priceEtb) byDest.set(s.destination, s);
    }
    for (const [, s] of byDest) {
      const ap = lookupAirport(s.destination);
      if (!ap) continue;
      out.push({
        destinationCode: s.destination,
        city: ap.city,
        country: ap.country,
        image: ap.image ?? null,
        routeType: ap.country === "Ethiopia" ? "domestic" : "international",
        priceEtb: s.priceEtb,
        priceUsd: s.priceUsd,
        airlineCode: s.airlineCode,
        capturedAt: s.capturedAt.toISOString(),
      });
    }
    if (out.length > 0) return out;
  }

  // Cold start: synthesize one-way demo fares for the curated popular list.
  const { fetchDemoFlights } = await import("./providers/demo");
  const { getUsdToEtbRate } = await import("./exchangeRate");
  const rate = await getUsdToEtbRate();
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

  for (const { code } of POPULAR_DESTS) {
    const flights = await fetchDemoFlights({ origin: "ADD", destination: code, departureDate: soon, returnDate: null, passengers: 1 });
    const cheapest = flights.reduce((a, b) => (b.price.usd < a.price.usd ? b : a));
    const ap = lookupAirport(code);
    if (!ap) continue;
    out.push({
      destinationCode: code,
      city: ap.city,
      country: ap.country,
      image: ap.image ?? null,
      routeType: ap.country === "Ethiopia" ? "domestic" : "international",
      priceEtb: Math.round(cheapest.price.usd * rate),
      priceUsd: cheapest.price.usd,
      airlineCode: cheapest.airlineCode,
      capturedAt: new Date().toISOString(),
    });
  }
  return out;
}

export async function pingDb(): Promise<void> {
  if (!pool) throw new Error("DATABASE_URL not configured");
  await pool.query("SELECT 1");
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
}
