import type { Flight, SearchRequest } from "../types";
import { normalizeAmadeus, type AmadeusOffer } from "../normalize";

/**
 * Amadeus Self-Service provider — international + domestic ET fares.
 * API docs: https://developers.amadeus.com/self-service/category/flights
 * Env: AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET
 *
 * Handles OAuth2 token fetch + caching (tokens last ~30 min).
 * Free tier: 2 calls/sec — fine for MVP.
 */

const AMADEUS_BASE =
  process.env.AMADEUS_HOSTNAME === "test"
    ? "https://test.api.amadeus.com"
    : "https://api.amadeus.com";

let tokenCache: { token: string; expiresAt: number } | null = null;

export function amadeusEnabled(): boolean {
  return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.AMADEUS_CLIENT_ID as string;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET as string;

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Amadeus auth error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    // Refresh 5 min before actual expiry to be safe.
    expiresAt: Date.now() + (json.expires_in - 300) * 1000,
  };
  return tokenCache.token;
}

export async function fetchAmadeusFlights(
  req: SearchRequest
): Promise<Flight[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    originLocationCode: req.origin,
    destinationLocationCode: req.destination,
    departureDate: req.departureDate,
    adults: String(req.passengers),
    currencyCode: "USD",
    max: "20",
  });
  if (req.returnDate) params.set("returnDate", req.returnDate);
  if (req.cabin && req.cabin !== "economy") {
    params.set("travelClass", req.cabin === "premium_economy" ? "PREMIUM_ECONOMY" : req.cabin.toUpperCase());
  }
  params.set("nonStop", "false");

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Amadeus API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: AmadeusOffer[] };
  const rate = await import("../exchangeRate").then((m) => m.getUsdToEtbRate());
  return normalizeAmadeus(json.data ?? [], rate);
}
