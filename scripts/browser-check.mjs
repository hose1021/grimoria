// Optional browser verification. Set PLAYWRIGHT_MODULE to an installed Playwright ESM entry.
// No browser package is required to run or deploy the application.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, extname, join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (!path.startsWith("/pocket/")) { res.writeHead(404).end(); return; }
    const relative = path.slice("/pocket/".length) || "index.html";
    const file = resolve(root, relative);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".css": "text/css", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".webp": "image/webp" };
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/pocket/`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
context.on("page", (tab) => tab.on("pageerror", (error) => errors.push(error.message)));
page.on("pageerror", (error) => errors.push(error.message));
const screenshots = join(tmpdir(), "pocket-grimoire-check");
await mkdir(screenshots, { recursive: true });

async function route(path) {
  await page.evaluate((path) => { location.hash = "#" + path; }, path);
  await page.waitForFunction((path) => document.body.dataset.route === path.slice(1), path);
  await page.waitForTimeout(60);
}
async function overflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "horizontal overflow");
}
async function seed(count, phase = "night") {
  const result = await page.evaluate(async ({ count, phase }) => {
    const model = await import("./js/model.js");
    const engine = await import("./js/engine.js");
    const { RECOMMENDED } = await import("./js/rules.js");
    const store = await import("./js/store.js");
    const game = model.createGame(count);
    Object.assign(game.setup, structuredClone(RECOMMENDED[count]));
    const assignment = Object.fromEntries(game.order.map((id, index) => [id, game.setup.roles[index]]));
    const result = engine.dealGame(game, { assignment });
    if (!result.ok) return result;
    game.order.forEach((id) => { game.players[id].name = id === "1" ? "Alice" : "Player " + id; game.players[id].claimed = phase !== "deal"; });
    engine.autoSecrets(game);
    if (count === 12) game.setup.info.washerwoman = { forDrunk: true, roleId: "chef", pair: ["1", "2"] };
    if (phase !== "deal") {
      game.phase = "seat";
      const start = engine.startNight(game);
      if (!start.ok) return start;
    }
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return { ok: true };
  }, { count, phase });
  assert.equal(result.ok, true, JSON.stringify(result));
  await page.waitForTimeout(100);
}
async function finishNight() {
  for (let i = 0; i < 30; i++) {
    if (await page.locator('[data-act="end-night"]').count()) {
      await page.locator('[data-act="end-night"]').click();
      return;
    }
    const targets = page.locator('[data-target]:not(:disabled)');
    if (await targets.count()) {
      const mode = await page.evaluate(async () => {
        const { state } = await import("./js/store.js");
        const { currentStep } = await import("./js/engine.js");
        return currentStep(state).targetMode;
      });
      await targets.nth(0).click();
      if (mode === "two") await page.locator('[data-target]:not(:disabled)').nth(1).click();
    }
    const given = page.locator("select[data-given]");
    if (await given.count()) {
      const value = await given.locator('option').evaluateAll((options) => options.find((option) => option.value)?.value);
      if (value) await given.selectOption(value);
    }
    const complete = page.locator('[data-act="complete"]');
    assert.equal(await complete.isEnabled(), true, "night step should be completable");
    await complete.click();
  }
  throw new Error("Night did not end");
}

try {
  await page.goto(url);
  await page.waitForSelector(".host");
  await page.locator(".lang-switch").selectOption("en");
  await page.waitForTimeout(100);
  await seed(7);
  await overflow();
  assert.equal(await page.locator(".host-main").isVisible(), true);
  assert.equal(await page.locator(".host-seats").isVisible(), false);
  await page.screenshot({ path: join(screenshots, "phone-night.png"), fullPage: true });

  // Regression: a stale table Escape listener must never reveal the host.
  await page.locator('[data-act="hide"]').click();
  await route("/player");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".host").count(), 0);
  assert.equal(await page.locator(".player-view").count(), 1);
  await route("/table");
  await finishNight();
  assert.equal(await page.locator('[data-virgin-form]').count(), 1);
  await page.locator('[data-virgin-form] select').selectOption("1");
  await page.locator('[data-virgin-form] button').click();
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.day.execution.cause), "virgin");
  await page.reload();
  await page.waitForSelector(".host");
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.players["1"].name), "Alice");

  // A second host is blocked; a public tab is read-only and updates live.
  const second = await context.newPage();
  await second.goto(url);
  await second.waitForSelector("#retry-writer");
  await second.close();
  const publicPage = await context.newPage();
  await publicPage.goto(url + "#/public");
  await publicPage.waitForSelector(".public");
  await page.evaluate(async () => {
    const store = await import("./js/store.js");
    store.run((game) => { game.players["2"].alive = false; return { ok: true }; });
  });
  await publicPage.waitForFunction(() => document.querySelector(".public-count b").textContent === "5");
  assert.equal(await publicPage.locator(".host-role, .host-bluffs, .host-notes").count(), 0);
  await publicPage.close();

  // Privacy projection and interrupted role timer cannot overwrite another route.
  await seed(7, "deal");
  await route("/player");
  assert.equal(await page.locator(".player-card").count(), 0);
  await page.locator('[data-seat="0"]').click();
  assert.equal(await page.locator(".player-card").count(), 0);
  await page.locator('[data-act="reveal"]').click();
  await page.waitForSelector(".player-card");
  assert.equal(await page.locator(".player-role-name").count(), 1);
  await page.locator("#player-name").fill("Alice");
  await page.locator('[data-act="back"]').click();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('[aria-modal="true"]')), true);
  await page.locator('[data-act="back-cancel"]').click();
  await route("/help");
  await page.clock.install();
  await page.clock.fastForward(46000);
  assert.equal(await page.locator(".player-card, .host").count(), 0);
  await page.clock.resume();

  // Full night/day transition at tablet size using a 12-player game.
  await page.setViewportSize({ width: 1024, height: 900 });
  await route("/table");
  await seed(12);
  await finishNight();
  await overflow();
  await page.locator('[data-act="end-day"]').click();
  await page.screenshot({ path: join(screenshots, "tablet-night.png"), fullPage: true });
  for (const lang of ["ru", "en", "az"]) {
    await page.locator(".lang-switch").selectOption(lang);
    await page.waitForTimeout(100);
    await overflow();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await overflow();
  await page.screenshot({ path: join(screenshots, "phone-az.png"), fullPage: true });

  // Project-subpath offline bootstrap, including dynamically imported engine modules.
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, { timeout: 30000 });
  await page.reload();
  await page.waitForSelector(".host");
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector(".host");
  await page.locator(".lang-switch").selectOption("en");
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".host-main").count(), 1);
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, offline project-subpath reload.");
  console.log("Screenshots: " + screenshots);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}

