// Verify the Popular Flight List section in a real browser via Playwright.
// Run: node scripts/verify-flight-list.mjs
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

const section = page.locator(".pfl");
await section.scrollIntoViewIfNeeded();

// 1) Structure
ok("section renders", await section.isVisible());
const accordions = section.locator(".pfl-item");
const nAcc = await accordions.count();
ok(`16 destination accordions rendered (${nAcc})`, nAcc === 16);

// 2) First panel open by default, like the mockup
const firstPanel = section.locator("#pfl-panel-hawassa");
ok("first panel (Hawassa) open by default", await firstPanel.isVisible());
const firstRows = await firstPanel.locator(".pfl-row").count();
ok(`open panel shows route rows (${firstRows})`, firstRows === 6);
ok(
  "row label matches mockup format",
  (await firstPanel.locator(".pfl-link").first().textContent())?.trim() ===
    "Flight Addis Ababa - Hawassa"
);
ok(
  "price shown in ETB",
  (await firstPanel.locator(".pfl-price").first().textContent())?.includes("ETB")
);

// 3) Accordion toggle: open second, close first
await section.locator(".pfl-head", { hasText: "Dubai Flights" }).click();
ok("clicking Dubai opens its panel", await section.locator("#pfl-panel-dubai").isVisible());
ok("Hawassa panel closed after switching", !(await firstPanel.isVisible()));

// 4) Clicking a route link prefills the search bar (origin + destination)
await section.locator("#pfl-panel-dubai .pfl-link", { hasText: "Flight Addis Ababa - Dubai" }).click();
const originVal = await page.getByRole("textbox", { name: "Origin city or airport code" }).inputValue();
const destVal = await page.getByRole("textbox", { name: "Destination city or airport code" }).inputValue();
ok(`origin prefilled ("${originVal}")`, originVal === "Addis Ababa");
ok(`destination prefilled ("${destVal}")`, destVal === "Dubai");

// 5) Search still works end-to-end from the prefilled state
await page.getByRole("button", { name: "Search flights", exact: true }).click();
await page.waitForURL(/\/results\?id=/, { timeout: 20000 }).catch(() => {});
ok("search navigates to /results?id=…", /\/results\?id=/.test(page.url()));

await page.goBack({ waitUntil: "networkidle" });
await section.scrollIntoViewIfNeeded();

// 6) Chevron rotates for the open item
await section.locator(".pfl-head", { hasText: "London Flights" }).click();
ok(
  "open accordion chevron rotates",
  await section
    .locator(".pfl-head", { hasText: "London Flights" })
    .locator(".pfl-chevron-up")
    .isVisible()
);

await page.screenshot({ path: "verify-flight-list.png" });
await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
