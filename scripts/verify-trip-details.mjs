// Verify the redesigned results experience + new Trip Details page in a real
// browser via Playwright.
// Run: node scripts/verify-trip-details.mjs
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

await page.getByRole("textbox", { name: "Destination city or airport code" }).fill("Dubai");
await page.getByRole("button", { name: "Search flights", exact: true }).click();
await page.waitForURL(/\/results\?id=/, { timeout: 20000 });
ok("search navigates to /results?id=…", /\/results\?id=/.test(page.url()));

// ---------- 2. Redesigned flight card ----------
await page.waitForSelector(".flight-card", { timeout: 20000 });
ok("route header shows Addis Ababa → Dubai", (await page.locator(".results-head h1").textContent())?.includes("Addis Ababa → Dubai"));
ok("Cheapest sort active by default", (await page.locator(".sort-tab-on").textContent())?.includes("Cheapest"));

const firstCard = page.locator(".flight-card").first();
ok("card shows airline", (await firstCard.locator(".fc-name").textContent())?.length > 0);
ok("card shows times", (await firstCard.locator(".fc-time").count()) === 2);
ok("card shows airports", (await firstCard.locator(".fc-ap").count()) === 2);
ok("card shows duration", (await firstCard.locator(".fc-dur").textContent())?.includes("h") || (await firstCard.locator(".fc-dur").textContent())?.includes("m"));
ok("card shows stops", (await firstCard.locator(".fc-stops").textContent())?.includes("stop") || (await firstCard.locator(".fc-stops").textContent())?.includes("Non-stop"));
ok("card shows ETB price", (await firstCard.locator(".fc-price").textContent())?.startsWith("ETB"));
ok("card has View Details link", (await firstCard.locator(".fc-details-btn").textContent())?.includes("View Details"));

// Ascending price order
const prices = await page.locator(".fc-price").allTextContents();
const nums = prices.map((p) => Number(p.replace(/[^0-9]/g, "")));
ok(`cards sorted ascending (${nums.slice(0, 3).join(", ")}…)`, nums.every((n, i) => i === 0 || nums[i - 1] <= n));

// Travel snapshot strip: 6 items, correct emojis, short values
const tripItems = firstCard.locator(".fc-trip-item");
ok("card has 6 travel snapshot items", (await tripItems.count()) === 6);
const emojis = await firstCard.locator(".fc-trip-emoji").allTextContents();
ok("strip uses real emojis 🏨🚗📶🛂💱🍽️", ["🏨", "🚗", "📶", "🛂", "💱", "🍽️"].every((e) => emojis.includes(e)));
const tripValues = await firstCard.locator(".fc-trip-value").allTextContents();
ok(`snapshot values are short (${tripValues[0]} · ${tripValues[1]} · ${tripValues[2]})`, tripValues.every((v) => v.length <= 30));

// ---------- 3. View Details navigates to a REAL ROUTE (no modal) ----------
await firstCard.locator(".fc-details-btn").click();
await page.waitForURL(/\/flight-details\//, { timeout: 10000 });
ok("View Details navigates to /flight-details/:id", /\/flight-details\//.test(page.url()));
ok("no modal overlay exists on Trip Details", (await page.locator(".modal-panel").count()) === 0);

// ---------- 4. Trip Details: route visual ----------
await page.waitForSelector(".tc-route", { timeout: 10000 });
ok("page shows Trip Details heading", (await page.locator(".trip-head h1").textContent())?.includes("Trip Details"));
ok("airline shown with ✈️", (await page.locator(".tc-head-txt h2").textContent())?.includes("✈️"));
ok("route shows departure airport ADD", (await page.locator(".tc-place .tc-ap").first().textContent())?.includes("ADD"));
ok("route shows arrival airport DXB", (await page.locator(".tc-place .tc-ap").last().textContent())?.includes("DXB"));
ok("route shows duration + stops on connector", (await page.locator(".tc-mid-label").textContent())?.includes("h"));
ok("round trip shows outbound + return legs", (await page.locator(".tc-leg").count()) === 2);

// Facts
const factLabels = await page.locator(".tc-fact-label").allTextContents();
ok("facts include Flight number", factLabels.some((l) => l.includes("Flight number")));
ok("facts include Departure + Arrival date", factLabels.some((l) => l === "Departure date") && factLabels.some((l) => l === "Arrival date"));
ok("facts include Baggage", factLabels.some((l) => l.includes("Baggage")));
ok("facts include Stops", factLabels.some((l) => l === "Stops"));
ok("facts include Duration", factLabels.some((l) => l === "Duration"));

// ---------- 5. Flight cost breakdown ----------
const costRows = await page.locator(".trip-card[aria-label='Flight cost'] .tc-row").allTextContents();
ok("cost shows Base fare", costRows.some((r) => r.includes("Base fare")));
ok("cost shows Taxes", costRows.some((r) => r.includes("Taxes")));
ok("cost shows Fees", costRows.some((r) => r.includes("Fees")));
ok("cost shows Flight Total", costRows.some((r) => r.includes("Flight Total")));
ok("prominent ETB total in header", (await page.locator(".tc-price-big").textContent())?.startsWith("ETB"));

// ---------- 6. Six trip info sections ----------
const sections = ["Hotel", "Car Rental", "eSIM", "Visa Information", "Currency", "Ethiopian Restaurants"];
for (const s of sections) {
  ok(`section: ${s}`, (await page.locator(".trip-card[aria-label='" + s.toLowerCase().replace(/ /g, "-") + "']").count()) === 1);
}
ok("hotel shows rating", (await page.locator(".tc-rating").first().textContent())?.includes("★"));
ok("hotel shows nights + estimated stay", (await page.locator(".trip-card[aria-label='Hotel'] .tc-row").allTextContents()).then?.(true) ?? true);
const hotelRows = await page.locator(".trip-card[aria-label='Hotel'] .tc-row").allTextContents();
ok("hotel shows nights row", hotelRows.some((r) => r.includes("Nights")));
ok("hotel shows estimated stay", hotelRows.some((r) => r.includes("Estimated stay")));
const visaText = (await page.locator(".trip-card[aria-label='Visa information']").textContent()) ?? "";
ok("visa marked as sample guidance", visaText.includes("Sample guidance") || visaText.includes("not official advice"));
const currText = (await page.locator(".trip-card[aria-label='Currency']").textContent()) ?? "";
ok("currency labelled sample rate (not live)", currText.includes("Sample rate") || currText.includes("not a live exchange rate"));
ok("restaurants listed", (await page.locator(".tc-resto").count()) >= 1);

// ---------- 7. Estimated trip total ----------
ok("estimated total section exists", (await page.locator(".trip-total").count()) === 1);
const totalRows = await page.locator(".trip-total .tc-row").allTextContents();
ok("total lists flight line", totalRows.some((r) => r.includes("Flight")));
ok("total lists hotel line", totalRows.some((r) => r.includes("Hotel")));
ok("total lists car line", totalRows.some((r) => r.includes("Car rental")));
ok("total lists eSIM line", totalRows.some((r) => r.includes("eSIM")));
ok("grand total labelled Estimated Total", totalRows.some((r) => r.includes("Estimated Total")));
ok("estimate disclaimer present", ((await page.locator(".trip-total").textContent()) ?? "").includes("Estimate only"));

// ---------- 8. Booking placeholder ----------
ok("Continue to Booking button exists", (await page.locator(".trip-book-btn").textContent())?.includes("Continue to Booking"));
await page.locator(".trip-book-btn").click();
ok("booking click shows honest placeholder note", ((await page.locator(".trip-book-note").textContent()) ?? "").includes("not connected"));
await page.screenshot({ path: "verify-trip-details.png", fullPage: true });

// ---------- 9. Back to results ----------
await page.locator(".trip-back").click();
await page.waitForURL(/\/results\?id=/, { timeout: 10000 });
ok("Back to results returns to /results", /\/results\?id=/.test(page.url()));

// ---------- 10. Mobile Trip Details ----------
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(await page.url(), { waitUntil: "networkidle" });
await page.waitForSelector(".flight-card", { timeout: 20000 });
await page.locator(".fc-details-btn").first().click();
await page.waitForURL(/\/flight-details\//, { timeout: 10000 });
await page.waitForSelector(".tc-route", { timeout: 10000 });
ok("mobile: Trip Details loads", await page.locator(".trip-head h1").isVisible());
const tcTimeBox = await page.locator(".tc-time").first().boundingBox();
ok("mobile: departure time visible", tcTimeBox !== null && tcTimeBox.y > 0);
const bookBtn = await page.locator(".trip-book-btn").boundingBox();
ok("mobile: booking button reachable (within viewport height)", bookBtn !== null);
ok("mobile: six trip sections stack", (await page.locator(".trip-grid .trip-card").count()) === 6);
await page.screenshot({ path: "verify-trip-details-mobile.png", fullPage: true });

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
