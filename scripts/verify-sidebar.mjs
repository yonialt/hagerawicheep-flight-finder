// Verify the hamburger sidebar in a real browser via Playwright.
// Run: node scripts/verify-sidebar.mjs
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

const panel = page.locator(".sb-panel");
const overlay = page.locator(".sb-overlay");

// 1) Closed initially
ok("sidebar hidden on load", !(await panel.evaluate((el) => el.classList.contains("sb-panel-on"))));

// 2) Hamburger opens it
await page.getByRole("button", { name: "Open menu" }).click();
await page.waitForTimeout(400); // slide-in transition
ok("hamburger opens sidebar", await panel.evaluate((el) => el.classList.contains("sb-panel-on")));
ok("sidebar is visible", await panel.isVisible());

// 3) Items from the mockup exist
for (const label of [
  "Flights", "Stays", "Cars", "Packages", "Cruises", "Plan with AI",
  "Plan your trip", "Airfare Trends", "Monthly Flight Deals", "Explore",
  "Flight Tracker", "Travel tips", "Hagerawi for Business", "Trips",
  "English", "ETB — Ethiopian birr", "Feedback",
]) {
  ok(`item "${label}" present`, await panel.locator(".sb-label", { hasText: label }).first().isVisible());
}
ok("NEW badge present", await panel.locator(".sb-badge", { hasText: "NEW" }).isVisible());

await page.screenshot({ path: "verify-sidebar-open.png" });

// 4) Escape closes
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
ok("Escape closes sidebar", !(await panel.evaluate((el) => el.classList.contains("sb-panel-on"))));

// 5) Re-open, overlay click closes
await page.getByRole("button", { name: "Open menu" }).click();
await page.waitForTimeout(400);
await overlay.click({ position: { x: 600, y: 300 } });
await page.waitForTimeout(400);
ok("overlay click closes sidebar", !(await panel.evaluate((el) => el.classList.contains("sb-panel-on"))));

// 6) Re-open, X button closes
await page.getByRole("button", { name: "Open menu" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Close menu" }).click();
await page.waitForTimeout(400);
ok("X button closes sidebar", !(await panel.evaluate((el) => el.classList.contains("sb-panel-on"))));

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
