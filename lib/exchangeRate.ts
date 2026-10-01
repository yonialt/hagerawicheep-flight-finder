/**
 * USD -> ETB conversion. Roadmap: daily job populates exchange_rates table.
 * For MVP we cache the rate in-process for 24h and fall back to a sane
 * static rate if the FX API is unreachable.
 */

const FALLBACK_RATE = 157.0; // ~2026 USD/ETB ballpark; used only if fetch fails

let cachedRate: { rate: number; capturedAt: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;

export async function getUsdToEtbRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.capturedAt < TTL_MS) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD?fields=ETB",
      { signal: AbortSignal.timeout(4000), cache: "no-store" }
    );
    if (res.ok) {
      const data = (await res.json()) as { rates?: { ETB?: number } };
      const rate = data.rates?.ETB;
      if (typeof rate === "number" && rate > 20 && rate < 500) {
        cachedRate = { rate, capturedAt: Date.now() };
        return rate;
      }
    }
  } catch {
    // fall through to fallback
  }

  return FALLBACK_RATE;
}

export async function usdToEtb(usd: number): Promise<number> {
  const rate = await getUsdToEtbRate();
  return Math.round(usd * rate * 100) / 100;
}

export function isEtbPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
