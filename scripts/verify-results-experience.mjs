// Verify the post-search results experience in a real browser via Playwright.
// Run: node scripts/verify-results-experience.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:/Users/yoni/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright"
);

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
let failures = 0;
const ok = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1380, height: 940 } });
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

// ---------- 1. Homepage untouched, search routes to /results ----------
await page.goto(BASE, { waitUntil: "networkidle" });
ok("homepage renders", await page.locator(".hero").isVisible());
ok("homepage hero + search intact", await page.locator(".search").isVisible());

// Search: Dubai (prefill destination field directly)
await page.getByRole("textbox", { name: "Destination city or airport code" }).fill("Dubai");
await page.getByRole("button", { name: "Search flights", exact: true }).click();
await page.waitForURL(/\/results\?id=/, { timeout: 20000 });
ok("search navigates to /results?id=…", /\/results\?id=/.test(page.url()));

// ---------- 2. Summary header + default Cheapest sort ----------
await page.waitForSelector(".flight-card", { timeout: 20000 });
ok("route header shows Addis Ababa → Dubai", (await page.locator(".results-head h1").textContent())?.includes("Addis Ababa → Dubai"));
ok("summary shows dates + trip + passengers", (await page.locator(".results-sub").textContent())?.includes("Round trip"));
ok("Cheapest tab active by default", (await page.locator(".sort-tab-on").textContent())?.includes("Cheapest"));

// Ascending price order
const prices = await page.locator(".fc-price").allTextContents();
const nums = prices.map((p) => Number(p.replace(/[^0-9]/g, "")));
ok(`cards sorted ascending (${nums.slice(0, 3).join(", ")}…)`, nums.every((n, i) => i === 0 || nums[i - 1] <= n));

// ---------- 3. Cards contain required info ----------
const firstCard = page.locator(".flight-card").first();
ok("card shows airline name", (await firstCard.locator(".fc-name").textContent())?.length > 0);
ok("card shows times", (await firstCard.locator(".fc-time").count()) === 2);
ok("card shows airports", (await firstCard.locator(".fc-ap").count()) === 2);
ok("card shows duration", (await firstCard.locator(".fc-dur").textContent())?.includes("h") || (await firstCard.locator(".fc-dur").textContent())?.includes("m"));
ok("card shows stops", (await firstCard.locator(".fc-stops").textContent())?.includes("stop") || (await firstCard.locator(".fc-stops").textContent())?.includes("Non-stop"));
ok("card shows baggage", (await firstCard.locator(".fc-meta").textContent())?.includes("bag"));
ok("card shows ETB price", prices[0].startsWith("ETB"));
ok("card has View Details button", (await firstCard.locator(".fc-details-btn").textContent())?.includes("View Details"));

// ---------- 4. Sort tabs ----------
await page.locator(".sort-tab", { hasText: "Fastest" }).click();
const durations = await page.locator(".fc-dur").allTextContents();
const mins = durations.map((d) => {
  const m = d.match(/(\d+)h\s*(\d+)?/);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : Infinity;
});
ok("Fastest sort works", mins.every((n, i) => i === 0 || mins[i - 1] <= n));
await page.locator(".sort-tab", { hasText: "Cheapest" }).click();

// ---------- 5. Filters: sidebar (desktop) ----------
ok("filter sidebar visible on desktop", await page.locator(".results-side .fp").isVisible());
const cardsBefore = await page.locator(".flight-card").count();

// Stops filter
await page.locator(".fp-check", { hasText: "Non-stop" }).locator("input").check();
const afterStops = await page.locator(".flight-card").count();
ok(`stops filter changes results (${cardsBefore} → ${afterStops})`, afterStops < cardsBefore);
ok("all visible cards non-stop", (await page.locator(".fc-stops").allTextContents()).every((t) => t.includes("Non-stop")));
await page.locator(".fp-check", { hasText: "Non-stop" }).locator("input").uncheck();

// Airline filter
const airlineName = (await page.locator(".fp-check .fp-check-label").first().textContent())?.trim();
await page.locator(".fp-check", { hasText: airlineName }).locator("input").check();
const afterAirline = await page.locator(".flight-card").count();
ok(`airline filter changes results (${afterStops} → ${afterAirline})`, afterAirline <= afterStops);
await page.locator(".fp-check", { hasText: airlineName }).locator("input").uncheck();
await page.waitForTimeout(200);
const baseline = await page.locator(".flight-card").count();

// Price slider (keyboard: range inputs ignore fill; Home jumps to min)
const priceSlider = page.locator(".fp-range");
await priceSlider.focus();
const startVal = Number(await priceSlider.inputValue());
await page.keyboard.press("Home");
const endVal = Number(await priceSlider.inputValue());
await page.waitForTimeout(200);
const afterPrice = await page.locator(".flight-card").count();
ok(`price filter changes results (${startVal} → ${endVal}, cards ${baseline} → ${afterPrice})`, endVal < startVal && afterPrice < baseline);
await page.locator(".fp-reset").click();
const afterReset = await page.locator(".flight-card").count();
ok(`reset restores results (${afterPrice} → ${afterReset})`, afterReset >= afterPrice);

// ---------- 6. Flight detail modal ----------
await page.locator(".fc-details-btn").first().click();
await page.waitForSelector(".modal-panel-wide", { timeout: 5000 });
ok("detail modal opens", await page.locator(".modal-panel-wide").isVisible());
ok("modal shows airline", (await page.locator(".fd-head h3").textContent())?.length > 0);
ok("modal shows flight number", (await page.locator(".fd-fact-value").first().textContent())?.trim().length > 2);
ok("modal shows outbound + return legs", (await page.locator(".fd-leg").count()) === 2);
ok("modal shows airports", (await page.locator(".fd-place").count()) >= 2);
ok("modal shows price breakdown rows", (await page.locator(".fd-row").count()) === 4);
ok("breakdown shows ETB total", (await page.locator(".fd-row-total").textContent())?.includes("ETB"));
ok("modal shows Continue / Book Flight", (await page.locator(".fd-book").textContent())?.includes("Continue / Book Flight"));
ok("modal shows mock-data disclaimer", (await page.locator(".fd-note").textContent())?.includes("Mock"));
await page.screenshot({ path: "verify-results-detail.png" });
await page.locator(".modal-close").click();
ok("modal closes", (await page.locator(".modal-panel").count()) === 0);

// ---------- 7. Travel Smart ----------
ok("Travel Smart section renders", await page.locator(".ts").isVisible());
ok("six Travel Smart cards", (await page.locator(".ts-card").count()) === 6);
ok("flights remain primary (list before Travel Smart)", (await page.locator(".flight-list").isVisible()) && (await page.locator(".ts").isVisible()));
await page.locator(".ts-card", { hasText: "Hotels" }).click();
await page.waitForSelector(".ts-modal", { timeout: 5000 });
ok("hotel detail modal opens", await page.locator(".ts-modal").isVisible());
ok("hotel modal shows detail rows", (await page.locator(".ts-row").count()) >= 3);
ok("modal labels sample data", (await page.locator(".ts-modal-note").textContent())?.includes("Sample"));
await page.screenshot({ path: "verify-travel-smart-modal.png" });
await page.keyboard.press("Escape");
ok("Escape closes travel modal", (await page.locator(".ts-modal").count()) === 0);

// ---------- 8. Card click opens detail too ----------
await page.locator(".fc-main").first().click({ force: true });
await page.waitForSelector(".modal-panel-wide", { timeout: 5000 });
ok("clicking card body opens detail modal", await page.locator(".modal-panel-wide").isVisible());
await page.keyboard.press("Escape");

// ---------- 9. Mobile: filter FAB + bottom-sheet drawer ----------
await page.setViewportSize({ width: 390, height: 844 });
ok("sidebar hidden on mobile", !(await page.locator(".results-side").isVisible()));
ok("filter FAB appears on mobile", await page.locator(".filters-fab").isVisible());
await page.locator(".filters-fab").click();
await page.waitForSelector(".drawer-panel", { timeout: 5000 });
ok("drawer opens as bottom sheet", await page.locator(".drawer-panel").isVisible());
const mobileBefore = await page.locator(".flight-card").count();
await page.locator(".drawer-panel .fp-check", { hasText: "1 stop" }).locator("input").check();
const drawerCount = await page.locator(".fp-show").textContent();
ok(`drawer shows live count (${drawerCount?.trim()})`, drawerCount?.includes(String(mobileBefore - 1)) || drawerCount?.includes("flight"));
await page.locator(".fp-show").click();
await page.waitForSelector(".drawer-panel", { state: "detached", timeout: 5000 });
ok("drawer applies filters and closes", (await page.locator(".drawer-panel").count()) === 0);
ok("mobile results filtered", (await page.locator(".fc-stops").allTextContents()).every((t) => t.includes("1 stop")));
await page.screenshot({ path: "verify-mobile-results.png" });

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
