import type { Flight, SearchRequest } from "../types";
import { normalizeKiwi, type KiwiOffer } from "../normalize";

/**
 * Kiwi.com Tequila provider — backup international coverage + flexible dates.
 * Env: KIWI_API_KEY
 * Docs: https://tequila.kiwi.com/portal/docs/tequila_api
 */

const KIWI_BASE = "https://api.tequila.kiwi.com";

export function kiwiEnabled(): boolean {
  return Boolean(process.env.KIWI_API_KEY);
}

export async function fetchKiwiFlights(req: SearchRequest): Promise<Flight[]> {
  const apiKey = process.env.KIWI_API_KEY;
  if (!apiKey) throw new Error("KIWI_API_KEY not set");

  const params = new URLSearchParams({
    fly_from: req.origin,
    fly_to: req.destination,
    date_from: req.departureDate.split("-").reverse().join("/"), // DD/MM/YYYY
    date_to: req.departureDate.split("-").reverse().join("/"),
    adults: String(req.passengers),
    curr: "USD",
    limit: "15",
    sort: "price",
    asc: "1",
  });
  if (req.returnDate) {
    params.set("return_from", req.returnDate.split("-").reverse().join("/"));
    params.set("return_to", req.returnDate.split("-").reverse().join("/"));
  }

  const res = await fetch(`${KIWI_BASE}/v2/search?${params}`, {
    headers: { apikey: apiKey },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kiwi API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: KiwiOffer[] };
  const rate = await import("../exchangeRate").then((m) => m.getUsdToEtbRate());
  return normalizeKiwi(json.data ?? [], rate);
}
