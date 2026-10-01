import type { Flight, SearchMeta, SearchResponse, RouteType, ProviderId } from "./types";
import { routeTypeFor } from "./airports";
import { cacheGet, cacheSet, cacheKeyFor, cacheTtlSeconds } from "./cache";
import { getUsdToEtbRate } from "./exchangeRate";
import { rankFlights } from "./rank";
import { fetchDemoFlights } from "./providers/demo";
import { duffelEnabled, fetchDuffelFlights } from "./providers/duffel";
import { amadeusEnabled, fetchAmadeusFlights } from "./providers/amadeus";
import { kiwiEnabled, fetchKiwiFlights } from "./providers/kiwi";
import { logSearch, saveSearchResponse, saveFareSnapshots, pruneSearchResponses } from "./store";

/**
 * Search orchestrator — the heart of the roadmap's /api/search logic:
 *  1. cache lookup (20 min TTL)
 *  2. parallel provider calls with per-provider timeout, graceful failure
 *  3. normalize + convert to ETB + rank
 *  4. cache + log + return
 */

interface ProviderCall {
  id: ProviderId;
  enabled: boolean;
  run: () => Promise<Flight[]>;
}

const PROVIDER_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("provider timeout")), ms)),
  ]);
}

export async function runSearch(opts: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  sortBy?: "price" | "duration" | "stops";
  cabin?: "economy" | "premium_economy" | "business" | "first";
  userId?: string | null;
}): Promise<SearchResponse> {
  const { origin, destination, departureDate, returnDate, passengers, sortBy = "price" } = opts;
  const routeType: RouteType = routeTypeFor(origin, destination);
  const key = cacheKeyFor(["search", origin, destination, departureDate, returnDate, passengers]);

  // 1. Cache hit → return early
  const cached = await cacheGet<SearchResponse>(key);
  if (cached) {
    // Re-rank cached results per current sort preference without refetching.
    return { ...cached, results: rankFlights(cached.results, sortBy), meta: { ...cached.meta, cached: true } };
  }

  // 2. Build provider call list. Domestic: only Amadeus (per roadmap).
  //    International: Duffel + Amadeus + Kiwi in parallel.
  //    Demo fallback always runs so the app never returns empty.
  const calls: ProviderCall[] = [];

  if (duffelEnabled() && routeType === "international") {
    calls.push({ id: "duffel", enabled: true, run: () => fetchDuffelFlights({ origin, destination, departureDate, returnDate, passengers, sortBy, cabin: opts.cabin }) });
  }
  if (amadeusEnabled()) {
    calls.push({ id: "amadeus", enabled: true, run: () => fetchAmadeusFlights({ origin, destination, departureDate, returnDate, passengers, sortBy, cabin: opts.cabin }) });
  }
  if (kiwiEnabled() && routeType === "international") {
    calls.push({ id: "kiwi", enabled: true, run: () => fetchKiwiFlights({ origin, destination, departureDate, returnDate, passengers, sortBy, cabin: opts.cabin }) });
  }
  if (calls.length === 0) {
    calls.push({ id: "demo", enabled: true, run: () => fetchDemoFlights({ origin, destination, departureDate, returnDate, passengers, sortBy, cabin: opts.cabin }) });
  }

  // 3. Parallel calls with graceful degradation.
  const settled = await Promise.allSettled(calls.map((c) => withTimeout(c.run(), PROVIDER_TIMEOUT_MS)));

  const providersQueried: ProviderId[] = [];
  const providersFailed: ProviderId[] = [];
  let flights: Flight[] = [];

  settled.forEach((result, i) => {
    const id = calls[i].id;
    if (result.status === "fulfilled" && result.value.length > 0) {
      providersQueried.push(id);
      flights = flights.concat(result.value);
    } else if (result.status === "rejected") {
      providersFailed.push(id);
      console.error(`[search] provider ${id} failed:`, result.reason instanceof Error ? result.reason.message : result.reason);
    } else {
      providersQueried.push(id); // succeeded but 0 results
    }
  });

  // 4. Convert USD → ETB uniformly (demo prices arrive in USD).
  const rate = await getUsdToEtbRate();
  flights = flights.map((f) => ({
    ...f,
    price: { ...f.price, etb: f.price.etb || Math.round(f.price.usd * rate * 100) / 100 },
  }));

  // 5. Rank + cache + log.
  const results = rankFlights(flights, sortBy);
  const meta: SearchMeta = {
    searchId: crypto.randomUUID(),
    totalResults: results.length,
    routeType,
    cached: false,
    cachedUntil: new Date(Date.now() + cacheTtlSeconds() * 1000).toISOString(),
    providersQueried,
    providersFailed,
    // Echo the query so /results can show the searched route + dates.
    origin,
    destination,
    departureDate,
    returnDate: returnDate ?? null,
    passengers,
    cabin: opts.cabin ?? "economy",
  };

  const response: SearchResponse = { results, meta };

  if (results.length > 0) {
    await cacheSet(key, response);
  }

  // Fire-and-forget: never block the response on persistence or analytics.
  // 1. Durable copy of the full response so /api/results survives restarts.
  if (results.length > 0) {
    void saveSearchResponse({
      searchId: meta.searchId,
      origin,
      destination,
      departureDate,
      passengers,
      response,
    }).catch((e) => console.error("[search] persist failed:", e));
  }

  // 2. Fare snapshots power the homepage popular-routes cards.
  void saveFareSnapshots(
    results.map((f) => ({
      origin,
      destination,
      provider: f.provider,
      departureDate: f.departure.slice(0, 10),
      priceUsd: f.price.usd,
      priceEtb: f.price.etb,
      airlineCode: f.airlineCode,
      airlineName: f.airline,
      durationMinutes: f.durationMinutes,
      stops: f.stops,
      cabinClass: f.cabin,
      baggageKg: f.baggageKg,
      bookingUrl: f.bookingUrl,
      capturedAt: new Date(),
    }))
  ).catch((e) => console.error("[search] snapshot persist failed:", e));

  // 3. Opportunistic TTL cleanup of old search responses.
  void pruneSearchResponses().catch((e) =>
    console.error("[search] prune failed:", e)
  );

  void logSearch({
    searchId: meta.searchId,
    origin,
    destination,
    departureDate,
    returnDate: returnDate ?? null,
    passengers,
    routeType,
    providerCount: providersQueried.length,
  }).catch((e) => console.error("[search] log failed:", e));

  return response;
}
