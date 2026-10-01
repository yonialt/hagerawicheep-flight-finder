// Verify the search-bar dropdowns in a real browser via Playwright.
// Run: node scripts/verify-dropdowns.mjs
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
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console.error]", m.text());
});
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.screenshot({ path: "verify-home.png", fullPage: true });

// 1) Autocomplete dropdown (AirportInput)
const dest = page.getByRole("textbox", { name: /destination city or airport/i });
await dest.click();
await dest.fill("dub");
const acMenu = page.locator(".ac-menu");
await acMenu.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
ok("autocomplete menu opens on typing", await acMenu.isVisible());
const acCount = await acMenu.locator(".ac-item").count();
ok(`autocomplete shows matches (${acCount})`, acCount > 0);
await page.screenshot({ path: "verify-1-autocomplete.png" });
if (acCount > 0) {
  await acMenu.locator(".ac-item").first().click();
  ok("picking a suggestion fills the field", (await dest.inputValue()).length > 0);
}

// 2) Dates popover (DatePicker)
await page.getByRole("button", { name: /^Dates/i }).click();
const datePop = page.locator(".date-pop");
await datePop.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
ok("dates popover opens", await datePop.isVisible());
await page.screenshot({ path: "verify-2-dates.png" });
// one-way flow to keep it deterministic
await datePop.getByRole("button", { name: "One way" }).click();
const dayButtons = datePop.locator(".dp-cell:not([disabled])");
await dayButtons.nth(9).click(); // pick a departure day
const applyBtn = datePop.getByRole("button", { name: "Apply" });
ok("Apply enabled after picking one-way date", await applyBtn.isEnabled());
await applyBtn.click();
ok("dates popover closes on Apply", !(await datePop.isVisible().catch(() => false)));

// 3) Passengers popover
await page.getByRole("button", { name: /^Passengers/i }).click();
const paxPop = page.locator(".psg-pop");
await paxPop.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
ok("passengers popover opens", await paxPop.isVisible());
// bump adults 1 -> 2 via "+" stepper
await paxPop.getByRole("button", { name: "Add one adult" }).click();
ok(
  "adult stepper increments",
  (await paxPop.locator('[aria-label="Number of adults"] .psg-count').textContent()) === "2"
);
await page.screenshot({ path: "verify-3-passengers.png" });
await paxPop.getByRole("button", { name: "Apply" }).click();
ok("passengers popover closes on Apply", !(await paxPop.isVisible().catch(() => false)));

// 4) Full search flow -> results page
await page.getByRole("button", { name: "Search flights", exact: true }).click();
await page.waitForURL(/\/results\?id=/, { timeout: 20000 }).catch(() => {});
ok("search navigates to /results?id=…", /\/results\?id=/.test(page.url()));
await page.screenshot({ path: "verify-4-results.png", fullPage: true });

// 5) Popular Flight List accordion seeds origin + destination
await page.goto(BASE, { waitUntil: "networkidle" });
const pflLink = page.locator("#pfl-panel-hawassa .pfl-link").first();
await pflLink.scrollIntoViewIfNeeded();
await pflLink.click();
const originVal = await page
  .getByRole("textbox", { name: "Origin city or airport code" })
  .inputValue();
const destVal = await dest.inputValue();
ok(
  `flight-list link prefills search ("${originVal}" → "${destVal}")`,
  originVal.length > 0 && destVal.length > 0
);
await page.screenshot({ path: "verify-5-route-seed.png" });

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
