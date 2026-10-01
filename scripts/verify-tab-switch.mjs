// Verify navbar tab switching: Flights → Popular flight list, Stays → Hotel
// listings (mockup: HotelListings.png). Run: node scripts/verify-tab-switch.mjs
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
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

await page.goto(BASE, { waitUntil: "networkidle" });

const flights = page.locator(".pfl");
const hotels = page.locator(".hl");

// 1) Default tab is Flights → flight list visible, hotel list absent
await flights.scrollIntoViewIfNeeded();
ok("flight list visible by default (Flights tab)", await flights.isVisible());
ok("hotel list not rendered initially", (await hotels.count()) === 0);

// 2) Click Stays in the top navbar → hotel list swaps in
await page.locator("header .tab", { hasText: "Stays" }).click();
ok("hotel list visible after clicking Stays", await hotels.isVisible());
ok("flight list removed after clicking Stays", (await flights.count()) === 0);

// 3) Structure mirrors the mockup: 19 city accordions, "Popular hotel list"
ok(
  "heading is 'Popular hotel list'",
  (await hotels.locator(".pfl-heading").textContent())?.trim() === "Popular hotel list"
);
const nAcc = await hotels.locator(".pfl-item").count();
ok(`19 city accordions rendered (${nAcc})`, nAcc === 19);

// 4) First panel (Las Vegas) open by default with mockup rows + $ prices
const vegasPanel = hotels.locator("#hl-panel-las-vegas");
ok("Las Vegas panel open by default", await vegasPanel.isVisible());
const vegasRows = await vegasPanel.locator(".pfl-row").count();
ok(`Las Vegas panel shows 10 hotels (${vegasRows})`, vegasRows === 10);
ok(
  "first row matches mockup",
  (await vegasPanel.locator(".pfl-link").first().textContent())?.trim() ===
    "OYO Hotel And Casino Las Vegas"
);
ok(
  "price shown in $ like mockup",
  (await vegasPanel.locator(".pfl-price").first().textContent())?.trim() === "$10+"
);

// 5) Accordion toggle works
await hotels.locator(".pfl-head", { hasText: "Tokyo Hotels" }).click();
ok("clicking Tokyo opens its panel", await hotels.locator("#hl-panel-tokyo").isVisible());
ok("Las Vegas panel closed after switching", !(await vegasPanel.isVisible()));

// 6) Clicking a hotel prefills the destination field
await hotels.locator("#hl-panel-tokyo .pfl-link", { hasText: "Hotel Gracery Shinjuku" }).click();
const destVal = await page
  .getByRole("textbox", { name: "Destination city or airport code" })
  .inputValue();
ok(`destination prefilled with city ("${destVal}")`, destVal === "Tokyo");

// 7) Switching back to Flights restores the flight list
await page.locator("header .tab", { hasText: "Flights" }).click();
ok("flight list back after clicking Flights", await flights.isVisible());
ok("hotel list removed after clicking Flights", (await hotels.count()) === 0);

await page.screenshot({ path: "verify-tab-switch.png" });
await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
