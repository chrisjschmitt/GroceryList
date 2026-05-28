/**
 * Food Basics Price Scraper
 *
 * Extracts current pricing for a grocery item from foodbasics.ca,
 * localizing to the nearest store via postal code.
 *
 * Usage:
 *   node scripts/scrape-prices.mjs
 *
 * In a future release, target parameters will come from a lookup table.
 */

import { chromium } from "playwright";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ── Target Parameters (future: from lookup table) ──────────────────

const TARGET_UPC = "068200148434";
const TARGET_POSTAL_CODE = "K7H3C6";
const TARGET_STORE_ID = "7923194";
const TARGET_URL =
  "https://www.foodbasics.ca/aisles/dairy-eggs/milk-cream-butter/lactose-free-non-dairy-milk/2-lactose-free-milk/p/068200148434";
const STORE_LOCATOR_URL = "https://www.foodbasics.ca/store-locator";

const OUTPUT_FILE = path.join(process.cwd(), "grocery_prices.json");
const NAVIGATION_TIMEOUT = 30_000;
const SELECTOR_TIMEOUT = 10_000;

// ── Browser Setup ──────────────────────────────────────────────────

async function createBrowser() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-CA",
    timezoneId: "America/Toronto",
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  return { browser, context, page };
}

// ── Step 1: Session Initialization & Store Localization ────────────

async function localizeStore(page, context) {
  console.log(`[1/3] Localizing to store ${TARGET_STORE_ID} near ${TARGET_POSTAL_CODE}...`);

  // Inject store cookies directly — more reliable than navigating the store locator
  await injectStoreCookies(context);

  // Warm up the session by loading any page (clears Cloudflare challenge)
  await page.goto("https://www.foodbasics.ca/", {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT,
  });
  await waitForChallenge(page);
  console.log("   Session initialized.");
}

async function injectStoreCookies(context) {
  await context.addCookies([
    {
      name: "storeId",
      value: TARGET_STORE_ID,
      domain: ".foodbasics.ca",
      path: "/",
    },
    {
      name: "selectedStoreId",
      value: TARGET_STORE_ID,
      domain: ".foodbasics.ca",
      path: "/",
    },
  ]);
  console.log("   Store cookies injected.");
}

// ── Step 2: Price Extraction ───────────────────────────────────────

async function extractPrices(page) {
  console.log(`[2/3] Extracting prices from product page...`);

  await page.goto(TARGET_URL, {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT,
  });

  await waitForChallenge(page);

  // Wait for challenge to clear on product page
  await waitForChallenge(page);
  await page.waitForTimeout(3000);

  // Debug: dump page state
  const currentUrl = page.url();
  const bodyLen = (await page.locator("body").textContent().catch(() => ""))?.length || 0;
  console.log(`   Page URL: ${currentUrl}`);
  console.log(`   Body text length: ${bodyLen}`);

  // Wait for the price section to render
  try {
    await page.locator(".pi--prices").first().waitFor({
      state: "visible",
      timeout: SELECTOR_TIMEOUT,
    });
  } catch {
    // Save screenshot for debugging
    await page.screenshot({ path: "/tmp/scraper-error.png" }).catch(() => {});
    const snippet = (await page.locator("body").textContent().catch(() => ""))?.substring(0, 500);
    throw new Error(
      `Price section (.pi--prices) not found. Body: ${snippet}`
    );
  }

  // Extract product name
  const itemName = await safeText(page, "h1");
  if (!itemName) {
    throw new Error("Could not extract product name from <h1>.");
  }

  // Extract regular price from .pricing__before-price
  // The structure is: <span class="invisible-text">Regular price</span><span>$6.69</span>
  const regularPriceText = await page.locator(".pricing__before-price span:not(.invisible-text)").first().textContent().catch(() => null);
  const regularPrice = parsePrice(regularPriceText);

  // Check if item is on sale (presence of sale price or sale icon)
  const hasSalePrice = (await page.locator(".pricing__sale-price.promo-price").count()) > 0;
  const hasSaleIcon = (await page.locator(".icon--sale").count()) > 0;
  const isOnSale = hasSalePrice || hasSaleIcon;

  // Extract sale price from data attribute or DOM
  let salePrice = null;
  if (isOnSale) {
    // Try data attribute first (most reliable)
    const mainPriceAttr = await page.locator("[data-main-price]").first().getAttribute("data-main-price").catch(() => null);
    if (mainPriceAttr) {
      salePrice = parseFloat(mainPriceAttr);
    }

    // Fallback to DOM text
    if (!salePrice) {
      const salePriceText = await safeText(page, ".pricing__sale-price .price-update");
      salePrice = parsePrice(salePriceText);
    }
  }

  // If not on sale, the "regular" price is the active price
  const activePrice = isOnSale ? salePrice : regularPrice;

  console.log(`   Product: ${itemName}`);
  console.log(`   Regular: $${regularPrice?.toFixed(2) ?? "N/A"}`);
  console.log(`   Sale:    $${salePrice?.toFixed(2) ?? "N/A"}`);
  console.log(`   On sale: ${isOnSale ? "Yes" : "No"}`);
  console.log(`   Active:  $${activePrice?.toFixed(2) ?? "N/A"}`);

  return {
    item_name: itemName,
    store_name: "Food Basics",
    postal_code: TARGET_POSTAL_CODE,
    store_id: TARGET_STORE_ID,
    regular_price: regularPrice,
    sale_price: isOnSale ? salePrice : null,
    is_on_sale: isOnSale ? 1 : 0,
    last_updated: new Date().toISOString(),
  };
}

// ── Step 3: Data Storage ───────────────────────────────────────────

async function savePriceData(upc, data) {
  console.log(`[3/3] Saving to ${OUTPUT_FILE}...`);

  let existing = {};

  if (existsSync(OUTPUT_FILE)) {
    try {
      const raw = await readFile(OUTPUT_FILE, "utf-8");
      existing = JSON.parse(raw);
    } catch (e) {
      console.warn(`   Warning: Could not parse existing file, overwriting. (${e.message})`);
    }
  }

  existing[upc] = data;

  await writeFile(OUTPUT_FILE, JSON.stringify(existing, null, 2), "utf-8");
  console.log(`   Saved ${upc} → ${OUTPUT_FILE}`);
}

// ── Utilities ──────────────────────────────────────────────────────

async function waitForChallenge(page) {
  const maxWait = 45_000;
  const start = Date.now();
  let lastLog = 0;

  while (Date.now() - start < maxWait) {
    const bodyText = await page.locator("body").textContent().catch(() => "");

    const isChallenge =
      bodyText?.includes("security verification") ||
      bodyText?.includes("Performing security") ||
      bodyText?.includes("Checking if the site connection is secure") ||
      bodyText?.includes("Enable JavaScript and cookies to continue") ||
      bodyText?.includes("cf-chl-widget");

    // Real content: not a challenge page AND has substantial unique site content
    const hasRealContent =
      !isChallenge &&
      bodyText &&
      (bodyText.includes("Food Basics") || bodyText.includes("METRO") || bodyText.includes("Add to cart"));

    if (hasRealContent) {
      return;
    }

    const elapsed = Date.now() - start;
    if (elapsed - lastLog > 5000) {
      console.log(`   Waiting for Cloudflare challenge... (${Math.round(elapsed / 1000)}s)`);
      lastLog = elapsed;
    }

    await page.waitForTimeout(1000);
  }

  console.warn("   Cloudflare challenge may not have resolved after 45s — continuing.");
}

async function safeText(page, selector) {
  try {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) return null;
    const text = await el.textContent();
    return text?.trim() || null;
  } catch {
    return null;
  }
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/\$?([\d]+\.[\d]{2})/);
  return match ? parseFloat(match[1]) : null;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Food Basics Price Scraper");
  console.log(`  UPC: ${TARGET_UPC} | Postal: ${TARGET_POSTAL_CODE}`);
  console.log("═══════════════════════════════════════════════════\n");

  const { browser, context, page } = await createBrowser();

  try {
    await localizeStore(page, context);
    const priceData = await extractPrices(page);
    await savePriceData(TARGET_UPC, priceData);

    console.log("\n✓ Done.\n");
    console.log(JSON.stringify({ [TARGET_UPC]: priceData }, null, 2));
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
