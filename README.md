# ሃገራዊ — Cheap Flights Finder

Fare comparison for Ethiopian travelers: domestic pricing intelligence + international airline comparison.

## Stack

- **Next.js 15 + React 19 + TypeScript** (frontend + backend in one app)
- **Node.js backend** via Next.js route handlers (`app/api/*`)
- **PostgreSQL** (`pg`) with automatic in-memory fallback when `DATABASE_URL` is unset
- **Providers:** Duffel, Amadeus Self-Service, Kiwi Tequila + a deterministic demo provider (zero keys needed)

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Works out of the box: no API keys or database required — a demo provider
serves deterministic fares and data is kept in memory.

## Connect real providers

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `DUFFEL_API_KEY` | International offers (`test_*` keys = sandbox) |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | International + domestic ET fares |
| `AMADEUS_HOSTNAME=test` | While using Amadeus test credentials |
| `KIWI_API_KEY` | Backup international + flexible dates |
| `DATABASE_URL` | Postgres (otherwise in-memory fallback) |

Providers are picked up without code changes: keys set → provider goes live; unset → skipped.

## Database

```bash
psql "$DATABASE_URL" -f db/migrations/001_init.sql   # tables + indexes
node scripts/seed.js                                  # 30 days of demo fares (optional)
```

Schema: `routes`, `fare_snapshots`, `searches`, `users`, `fare_alerts`, `exchange_rates`.

## API

### `POST /api/search`

```json
{
  "origin": "ADD",
  "destination": "DXB",
  "departureDate": "2026-11-20",
  "returnDate": "2026-11-27",
  "passengers": 1,
  "sortBy": "price"
}
```

Response:

```json
{
  "results": [
    {
      "id": "duffel-offer_123",
      "airline": "Turkish Airlines",
      "price": { "usd": 250, "etb": 39250, "currency": "USD" },
      "departure": "2026-11-20T14:30:00.000Z",
      "arrival": "2026-11-20T22:45:00.000Z",
      "durationMinutes": 495,
      "stops": 1,
      "cabin": "economy",
      "baggageKg": 23,
      "bookingUrl": "https://www.duffel.com/book/offer_123",
      "provider": "duffel"
    }
  ],
  "meta": {
    "searchId": "<uuid>",
    "totalResults": 12,
    "routeType": "international",
    "cached": false,
    "cachedUntil": "2026-11-15T14:30:00Z",
    "providersQueried": ["duffel", "amadeus"],
    "providersFailed": []
  }
}
```

Pipeline: validate → 20-min cache check → parallel provider calls (10s timeout each, graceful failure) →
normalize → USD→ETB conversion → rank → cache → log to `searches`.

### Other endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/results?id=<searchId>` | Re-fetch a cached search (powers `/results`) |
| `GET /api/popular-routes` | Cheapest ETB fare per route (24h snapshots, demo fallback) |
| `GET /api/health` | Provider config, DB status, FX rate — for smoke tests |

## Architecture

```
app/api/           route handlers (search, results, popular-routes, health)
lib/
  types.ts         shared Flight/Search/Route types
  airports.ts      IATA table + domestic-route rule
  validate.ts      input validation (origin≠dest, dates, passengers 1–9)
  cache.ts         20-min TTL search cache (Redis-drop-in interface)
  exchangeRate.ts  USD→ETB (24h cache, static fallback)
  normalize.ts     Duffel/Amadeus/Kiwi → unified Flight shape
  rank.ts          price/duration/stops ranking
  search.ts        orchestrator: cache → parallel providers → normalize → rank
  store.ts         Postgres | memory fallback (searches, snapshots, popular routes)
  providers/       duffel.ts, amadeus.ts, kiwi.ts, demo.ts
db/migrations/     SQL schema
scripts/seed.js    demo data seeder
```

## Roadmap status

- [x] **Phase 1 — MVP core:** `/api/search` with Duffel/Amadeus/Kiwi + demo fallback, caching, search logging, results page, live popular routes
- [ ] Phase 2 — flexible-date calendar (Amadeus `/shopping/flight-dates`)
- [ ] Phase 3 — auth + fare alerts + dashboard
- [ ] Phase 4 — affiliate tracking on booking URLs
- [ ] Phase 6 — rate limiting, Sentry, structured logging, Playwright E2E

## Next steps (per roadmap "What to Code First")

1. Get Duffel + Amadeus sandbox keys (2h)
2. Drop them in `.env.local` — providers go live automatically
3. Set `DATABASE_URL` (Railway Postgres free tier) and run the migration + seed
4. Deploy: Vercel (frontend) + Railway (Postgres)
