import type { Flight, SearchRequest } from "./types";

/**
 * Rank flights according to the requested sort order.
 * Default and tie-break: price ascending (cheapest first).
 */
export function rankFlights(
  flights: Flight[],
  sortBy: SearchRequest["sortBy"] = "price"
): Flight[] {
  const sorted = [...flights];

  if (sortBy === "duration") {
    sorted.sort(
      (a, b) => a.durationMinutes - b.durationMinutes || a.price.usd - b.price.usd
    );
  } else if (sortBy === "stops") {
    sorted.sort(
      (a, b) => a.stops - b.stops || a.price.usd - b.price.usd
    );
  } else {
    sorted.sort(
      (a, b) => a.price.usd - b.price.usd || a.durationMinutes - b.durationMinutes
    );
  }

  return sorted;
}

export function cheapestFlight(flights: Flight[]): Flight | null {
  if (flights.length === 0) return null;
  return rankFlights(flights, "price")[0];
}
