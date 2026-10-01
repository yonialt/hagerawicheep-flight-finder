import type { Flight, SearchRequest } from "../types";
import { normalizeDuffel, type DuffelOffer } from "../normalize";

/**
 * Duffel provider — international flights.
 * API docs: https://duffel.com/docs/api/offer-requests
 * Env: DUFFEL_API_KEY (test_* keys work against the sandbox automatically).
 */

const DUFFEL_BASE = "https://api.duffel.com";

export interface ProviderFailure {
  provider: "duffel";
  error: string;
}

export function duffelEnabled(): boolean {
  return Boolean(process.env.DUFFEL_API_KEY);
}

export async function fetchDuffelFlights(
  req: SearchRequest
): Promise<Flight[]> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) throw new Error("DUFFEL_API_KEY not set");

  const passengers = Array.from({ length: req.passengers }, () => ({ type: "adult" }));

  const res = await fetch(`${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [
          { origin: req.origin, destination: req.destination, departure_date: req.departureDate },
          ...(req.returnDate
            ? [{ origin: req.destination, destination: req.origin, departure_date: req.returnDate }]
            : []),
        ],
        passengers,
        cabin_class: req.cabin === "premium_economy" ? "premium_economy" : req.cabin,
      },
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Duffel API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: { offers?: DuffelOffer[] } };
  const rate = await import("../exchangeRate").then((m) => m.getUsdToEtbRate());
  return normalizeDuffel(json.data?.offers ?? [], rate);
}
