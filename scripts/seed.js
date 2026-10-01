/**
 * Seed script: populates routes + 30 days of demo fare snapshots so the
 * homepage shows realistic prices when running against Postgres.
 *
 * Usage:
 *   node scripts/seed.js            (reads .env automatically)
 */
require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (e.g. postgres://user:pass@host:5432/hagerawi)");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ROUTES = [
  ["ADD", "HBD", "domestic", 45],
  ["ADD", "BJR", "domestic", 60],
  ["ADD", "MQX", "domestic", 70],
  ["ADD", "DIR", "domestic", 55],
  ["ADD", "DXB", "international", 250],
  ["ADD", "NBO", "international", 180],
  ["ADD", "IST", "international", 320],
  ["ADD", "JFK", "international", 780],
  ["ADD", "JKA", "international", 260],
].map(([origin, destination, routeType, baseUsd]) => ({
  origin, destination, routeType, baseUsd,
}));

// Deterministic PRNG so seeds are reproducible.
function makeRng(seed) {
  let state = 0x811c9dc5;
  for (const ch of seed) {
    state ^= ch.charCodeAt(0);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const AIRLINES = [
  ["ET", "Ethiopian Airlines"],
  ["TK", "Turkish Airlines"],
  ["QR", "Qatar Airways"],
  ["KQ", "Kenya Airways"],
];

async function main() {
  const rate = 157; // approximate USD→ETB used at seed time
  const today = new Date();

  for (const r of ROUTES) {
    const routeRes = await pool.query(
      `INSERT INTO routes (origin_code, destination_code, route_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (origin_code, destination_code) DO UPDATE SET is_active = true
       RETURNING id`,
      [r.origin, r.destination, r.routeType]
    );
    const routeId = routeRes.rows[0].id;

    // One snapshot per day for the next 30 days, plus a fresh one for "now"
    // so the homepage 24h-window query always has data.
    const rng = makeRng(`${r.origin}${r.destination}`);
    const inserts = [];
    for (let d = 0; d < 30; d++) {
      const depDate = new Date(today.getTime() + d * 86400000);
      const depIso = depDate.toISOString().slice(0, 10);
      // Weekend dates cost more; random wobble for realism.
      const dow = depDate.getUTCDay();
      const weekendPremium = dow === 5 || dow === 6 || dow === 0 ? 1.12 : 1.0;
      const priceUsd = Math.round(r.baseUsd * weekendPremium * (0.85 + rng() * 0.3) * 100) / 100;
      inserts.push(
        [routeId, r.origin, r.destination, r.routeType === "domestic" ? "demo" : "demo", depIso,
         priceUsd, Math.round(priceUsd * rate * 100) / 100, rng() < 0.7 ? "ET" : "TK",
         d === 0 ? new Date() : depDate]
      );
    }

    for (const [routeId_, origin, destination, provider, depDate, usd, etb, airline, capturedAt] of inserts) {
      await pool.query(
        `INSERT INTO fare_snapshots
           (route_id, origin_code, destination_code, provider, departure_date, price_usd, price_etb,
            airline_code, airline_name, duration_minutes, stops, cabin_class, baggage_kg, booking_url, captured_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [routeId_, origin, destination, provider, depDate, usd, etb, airline,
         airline === "ET" ? "Ethiopian Airlines" : "Turkish Airlines",
         120 + Math.floor(rng() * 240), rng() < 0.6 ? 0 : 1, "economy", 23,
         `https://www.ethiopianairlines.com?from=${origin}&to=${destination}&date=${depDate}`,
         capturedAt]
      );
    }
    console.log(`Seeded ${inserts.length} snapshots for ${r.origin}→${r.destination}`);
  }

  await pool.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
