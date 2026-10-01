// Verify the hero-style photo background on /results and /flight-details.
// Runs the flow twice: DXB (has its own photo) and IST (no photo — must get
// a deterministic fallback photo). Run: node scripts/verify-hero-bg.mjs
// Uses the same Playwright install as scripts/verify-dropdowns.mjs.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/yoni/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright"
);

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;
const ok = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

async function checkBgLayer(prefix) {
  // 1. Background layer exists, is fixed, and sits behind content
  const layer = page.locator(`.${prefix}-bg`);
  ok(`[${prefix}] background layer exists`, (await layer.count()) > 0);
  if ((await layer.count()) === 0) return;
  const position = await layer.evaluate((el) => getComputedStyle(el).position);
  ok(`[${prefix}] layer is position:fixed`, position === "fixed");
  const zIndex = await layer.evaluate((el) => getComputedStyle(el).zIndex);
  ok(`[${prefix}] layer sits behind content (z-index -1)`, zIndex === "-1");

  // 2. A real photo is painting
  const img = layer.locator("img");
  ok(`[${prefix}] photo <img> present`, (await img.count()) > 0);
  if ((await img.count()) === 0) return;
  await img.evaluate((el) => el.decode().catch(() => {})).catch(() => {});
  const natural = await img.evaluate((el) => el.naturalWidth);
  ok(`[${prefix}] photo loaded (naturalWidth > 0)`, natural > 0);

  // 3. Hero-style dark shade gradient over the photo, with a readability blur
  const after = await layer.evaluate(
    (el) => getComputedStyle(el, "::after").backgroundImage
  );
  ok(`[${prefix}] dark shade gradient applied`, (after ?? "").includes("linear-gradient"));
  const blur = await img.evaluate((el) => getComputedStyle(el).filter);
  ok(`[${prefix}] photo is blurred for readability`, blur.includes("blur"));

  // 4. Page text is light-on-photo (hero style) — page level only; the trip
  // page intentionally keeps dark text inside its cream cards.
  const headingSel = prefix === "results" ? ".results-head h1" : ".trip-head h1";
  const h1 = page.locator(headingSel).first();
  if ((await h1.count()) > 0) {
    const h1Color = await h1.evaluate((el) => getComputedStyle(el).color);
    ok(`[${prefix}] heading text is light`, h1Color === "rgb(255, 255, 255)");
  }

  await page.screenshot({ path: `verify-${prefix}-hero-bg.png` });
}

// ---------- Full flow per destination ----------
for (const dest of ["DXB", "IST"]) {
  console.log(`\n=== Search ADD → ${dest} ===`);

  // ---------- Page 1: Results (via a real search) ----------
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Origin city or airport code" }).fill("ADD");
  await page.getByRole("textbox", { name: "Destination city or airport code" }).fill(dest);
  await page.getByRole("button", { name: "Search flights", exact: true }).click();
  await page.waitForURL(/\/results\?id=/, { timeout: 30000 }).catch(() => {});
  ok(`[${dest}] search navigates to /results?id=…`, /\/results\?id=/.test(page.url()));
  await page.waitForTimeout(1200);

  await checkBgLayer("results");
  const resultsBg = await page
    .locator(".results-page")
    .evaluate((el) => getComputedStyle(el).backgroundColor)
    .catch(() => "");
  ok(
    `[${dest}] dark fallback background (#14181f)`,
    resultsBg === "rgb(20, 24, 31)"
  );

  // ---------- Page 2: Flight details (reuse the same search) ----------
  const searchId = new URL(page.url()).searchParams.get("id");
  ok(`[${dest}] got searchId from URL`, Boolean(searchId));

  if (searchId) {
    const flightId = await page
      .evaluate(async (id) => {
        const res = await fetch(`/api/results?id=${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.results?.[0]?.id ?? null;
      }, searchId)
      .catch(() => null);

    ok(`[${dest}] fetched a flight id from the search`, Boolean(flightId));

    if (flightId) {
      await page.goto(
        `${BASE}/flight-details/${encodeURIComponent(flightId)}?search=${encodeURIComponent(searchId)}`,
        { waitUntil: "networkidle" }
      );
      await page.waitForTimeout(1200);

      await checkBgLayer("trip");
      const tripBg = await page
        .locator(".trip-page")
        .evaluate((el) => getComputedStyle(el).backgroundColor)
        .catch(() => "");
      ok(
        `[${dest}] dark fallback background (#17281f)`,
        tripBg === "rgb(23, 40, 31)"
      );
    }
  }
}

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
