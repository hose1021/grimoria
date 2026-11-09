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
// A mutable release lets the update-flow check deploy a second worker version.
// The legacy map serves a captured pre-#11 client before its first upgrade.
let releaseOverride = null;
let legacyUpgrade = null;
const legacyRoot = join(root, "scripts/fixtures/legacy-client");
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (!path.startsWith("/pocket/")) { res.writeHead(404).end(); return; }
    let relative = path.slice("/pocket/".length) || "index.html";
    let file = resolve(root, relative);
    const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".css": "text/css", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".webp": "image/webp" };
    if (relative === "sw.js" && releaseOverride !== null) {
      res.setHeader("Content-Type", "text/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(releaseOverride);
      return;
    }
    if (relative.startsWith("legacy/")) {
      const legacyRelative = relative.slice("legacy/".length) || "index.html";
      if (legacyRelative === "sw.js" && legacyUpgrade) {
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Cache-Control", "no-store");
        res.end(legacyUpgrade);
        return;
      }
      if (!legacyUpgrade && ["index.html", "js/offline.js", "sw.js"].includes(legacyRelative)) {
        file = resolve(legacyRoot, legacyRelative);
      } else {
        file = resolve(root, legacyRelative);
      }
      relative = legacyRelative;
    }
    if (!file.startsWith(root) && !file.startsWith(legacyRoot)) { res.writeHead(403).end(); return; }
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch {
    try {
      res.setHeader("Content-Type", "text/html");
      const requested = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const fallback = requested.startsWith("/pocket/legacy/") && !legacyUpgrade
        ? resolve(legacyRoot, "index.html")
        : resolve(root, "index.html");
      res.end(await readFile(fallback));
    } catch { res.writeHead(404).end(); }
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/pocket/`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("pg-test-loads", String(Number(sessionStorage.getItem("pg-test-loads") || "0") + 1));
  } catch { /* storage can be unavailable during teardown */ }
});
const page = await context.newPage();
const errors = [];
context.on("page", (tab) => tab.on("pageerror", (error) => errors.push(error.message)));
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
const screenshots = join(tmpdir(), "pocket-grimoire-check");
await mkdir(screenshots, { recursive: true });

async function route(path) {
  // Mirror real navigation: stay inside the app's project subpath so that a
  // reload still resolves to a served document.
  await page.evaluate((href) => { history.pushState(null, "", href); dispatchEvent(new PopStateEvent("popstate")); }, "/pocket" + path);
  await page.waitForFunction((path) => document.body.dataset.route === path.slice(1), path);
  await page.waitForTimeout(60);
}
async function overflow() {
  const detail = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    route: location.pathname, width: innerWidth,
    elements: [...document.querySelectorAll("#screen *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map((el) => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right }))
  }));
  assert.equal(detail.overflow, false, JSON.stringify(detail));
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
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  }, { count, phase });
  assert.equal(result.ok, true, JSON.stringify(result));
  await page.waitForTimeout(100);
}

// Night 2 of a 5-player Mayor game, with the Poisoner's step waiting. Night 1
// is completed with the Chef poisoned so the Mayor starts healthy.
async function seedMayorNight2() {
  const result = await page.evaluate(async () => {
    const model = await import("./js/model.js");
    const engine = await import("./js/engine.js");
    const store = await import("./js/store.js");
    const assignment = { 1: "mayor", 2: "chef", 3: "empath", 4: "poisoner", 5: "imp" };
    const game = model.createGame(5);
    Object.entries(assignment).forEach(([id, roleId]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 5;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = [];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "poisoner").key, { targetIds: ["2"] });
    while (engine.currentStep(game)) engine.skipStep(game, engine.currentStep(game).key, "browser check");
    engine.endNight(game);
    engine.endDay(game);
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await page.waitForTimeout(100);
}
// Night 2 of a 7-player Mayor game. P2 died to the Imp on night 1, the Monk
// protects P3 tonight, and P5 is a healthy Soldier. All three are valid Mayor
// replacements, but a dead or protected replacement must not die.
async function seedMayorRedirectTargets() {
  const result = await page.evaluate(async () => {
    const model = await import("./js/model.js");
    const engine = await import("./js/engine.js");
    const store = await import("./js/store.js");
    const assignment = {
      1: "mayor", 2: "chef", 3: "empath", 4: "monk",
      5: "soldier", 6: "poisoner", 7: "imp"
    };
    const game = model.createGame(7);
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 7;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = ["washerwoman", "librarian", "investigator"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.phase = "seat";
    let start = engine.startNight(game);
    if (!start.ok) return start;
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "poisoner").key, { targetIds: ["5"] });
    while (engine.currentStep(game)) {
      const step = engine.currentStep(game);
      if (step.roleId === "imp") engine.completeStep(game, step.key, { targetIds: ["2"] });
      else engine.skipStep(game, step.key, "browser check");
    }
    engine.endNight(game);
    // P2 died away from a night wake: the Imp does not wake on night 1, so the
    // host records the death before night 2 begins.
    engine.kill(game, "2", "test");
    engine.endDay(game);
    start = engine.startNight(game);
    if (!start.ok) return start;
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "poisoner").key, { targetIds: ["2"] });
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "monk").key, { targetIds: ["3"] });
    const current = engine.currentStep(game);
    if (!current || current.roleId !== "imp") return { ok: false, errors: [{ code: "step", message: String(current && current.roleId) }] };
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await page.waitForTimeout(100);
}

// Night 1 of a 7-player Fortune Teller game, stopped on the Fortune Teller step
// with a known red herring so the self-target read is deterministic.
async function seedFortuneTellerNight() {
  const result = await page.evaluate(async () => {
    const model = await import("./js/model.js");
    const engine = await import("./js/engine.js");
    const store = await import("./js/store.js");
    const assignment = {
      1: "fortuneteller", 2: "chef", 3: "empath", 4: "monk",
      5: "soldier", 6: "poisoner", 7: "imp"
    };
    const game = model.createGame(7);
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 7;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = ["washerwoman", "librarian", "investigator"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.setup.herringId = "3";
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game) && engine.currentStep(game).roleId !== "fortuneteller") {
      engine.skipStep(game, engine.currentStep(game).key, "browser check");
    }
    const current = engine.currentStep(game);
    if (!current || current.roleId !== "fortuneteller") return { ok: false, errors: [{ code: "step", message: String(current && current.roleId) }] };
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
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
  assert.equal(await page.locator("#update-banner").isVisible(), false, "first install must not show an update prompt");
  await page.locator(".lang-switch").selectOption("en");
  await page.waitForTimeout(100);
  await seed(7);
  await overflow();
  assert.equal(await page.locator(".host-main").isVisible(), true);
  assert.equal(await page.locator(".host-seats").isVisible(), false);
  await page.screenshot({ path: join(screenshots, "phone-night.png"), fullPage: true });

  // Regression: switching scripts without a reload must replace the bag's
  // role pool. The old mount-time role list kept showing roles from the
  // previous script.
  await page.evaluate(async () => {
    const store = await import("./js/store.js");
    store.reset(7);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/bag");
  await page.waitForSelector(".setup");
  assert.equal(await page.locator(".bag-role").count(), 22, "Trouble Brewing exposes its full roster");
  const customRoles = [
    "chef", "empath", "undertaker", "monk", "slayer", "soldier",
    "ravenkeeper", "fortuneteller", "butler", "poisoner", "imp"
  ];
  const customJson = JSON.stringify([
    { id: "_meta", name: "Browser Script" },
    ...customRoles.map((id) => ({ id }))
  ]);
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator("details[data-script-section='clipboard'] summary").click();
  await page.locator("[data-script-text]").fill(customJson);
  await page.locator('[data-act="script-text"]').click();
  await page.waitForSelector(".script-preview");
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.match(await page.locator(".setup-brand small").innerText(), /Browser Script/);
  assert.equal(await page.locator(".bag-role").count(), customRoles.length,
    "the bag shows only the new script's roles");
  assert.equal(await page.locator('[data-role="mayor"]').count(), 0,
    "roles removed by the switch disappear");
  assert.equal(await page.locator('[data-role="virgin"]').count(), 0,
    "roles removed by the switch disappear");
  const shownRoles = await page.locator(".bag-role").evaluateAll((nodes) => nodes.map((node) => node.dataset.role));
  assert.deepEqual(shownRoles.slice().sort(), customRoles.slice().sort(),
    "the bag role set matches the imported script");
  const selectedRoles = await page.locator(".bag-role.is-on").evaluateAll((nodes) => nodes.map((node) => node.dataset.role));
  assert.ok(selectedRoles.every((id) => customRoles.includes(id)),
    "the auto-filled bag uses only the new script's roles");

  // Switching back to the official script restores the full roster.
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="tb"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.equal(await page.locator(".bag-role").count(), 22,
    "Trouble Brewing roles return after the switch");
  assert.equal(await page.locator('[data-role="mayor"]').count(), 1);

  // Bad Moon Rising is a real picker choice with its own 25-role pool and
  // script name; switching to it must replace the Trouble Brewing roster.
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="bmr"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.match(await page.locator(".setup-brand small").innerText(), /Bad Moon Rising/);
  assert.equal(await page.locator(".bag-role").count(), 25,
    "Bad Moon Rising exposes its full roster");
  assert.equal(await page.locator('[data-role="chambermaid"]').count(), 1);
  assert.equal(await page.locator('[data-role="mayor"]').count(), 0,
    "Trouble Brewing roles are not in the Bad Moon Rising pool");
  const bmrRoles = await page.locator(".bag-role").evaluateAll((nodes) => nodes.map((node) => node.dataset.role));
  assert.ok(bmrRoles.every((id) => ["chambermaid","courtier","exorcist","fool","gambler","gossip","grandmother","innkeeper","minstrel","pacifist","professor","sailor","tealady","goon","lunatic","moonchild","tinker","assassin","devilsadvocate","godfather","mastermind","po","pukka","shabaloth","zombuul"].includes(id)),
    "the Bad Moon Rising pool contains only Bad Moon Rising roles");
  assert.equal(await page.locator(".bag-note.bmr-warning").count(), 1,
    "the Bad Moon Rising host-mode warning is visible");

  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="tb"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });

  await seed(7);
  await route("/table");

  // Regression (issue #1): the Poisoner's step must never ask for a Mayor
  // redirection. Selecting the Mayor as a poison target shows no redirect
  // control and leaves "Complete step" enabled.
  await seedMayorNight2();
  await route("/table");
  const stepRole = () => page.evaluate(async () => {
    const { currentStep } = await import("./js/engine.js");
    const { state } = await import("./js/store.js");
    const step = currentStep(state);
    return step && (step.roleId || step.system);
  });
  assert.equal(await stepRole(), "poisoner", "Mayor scenario should start on the Poisoner");
  await page.locator('[data-target][data-id="1"]').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("select[data-redirect]").count(), 0,
    "the Poisoner's step must not offer a Mayor redirection");
  assert.equal(await page.locator('[data-act="complete"]').isEnabled(), true,
    "the step-complete button stays enabled when the Mayor is only poisoned");
  await page.screenshot({ path: join(screenshots, "mayor-poison-poisoner-step.png"), fullPage: true });
  await page.locator('[data-act="complete"]').click();
  await page.waitForTimeout(200);
  // The poisoned Mayor loses the ability, so the Imp's step also asks nothing.
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("select[data-redirect]").count(), 0,
    "a poisoned Mayor attacked by the Imp must not offer a redirection");
  await page.locator('[data-act="complete"]').click();
  await page.waitForTimeout(200);
  const mayorDead = await page.evaluate(async () => (await import("./js/store.js")).state.players["1"].alive);
  assert.equal(mayorDead, false, "the poisoned Mayor dies to the Demon");

  // A stored redirection belongs to one victim: changing the Demon's target
  // must clear it instead of silently reusing the old replacement.
  await seedMayorNight2();
  await route("/table");
  await page.locator('[data-target][data-id="2"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-act="complete"]').click();
  await page.waitForTimeout(200);
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("select[data-redirect]").count(), 1, "a healthy Mayor still offers a redirection");
  await page.locator("select[data-redirect]").selectOption("2");
  await page.waitForTimeout(150);
  await page.locator('[data-target][data-id="3"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-target][data-id="1"]').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("select[data-redirect]").inputValue(), "none",
    "retargeting the Imp must reset the stored Mayor redirection");

  // A dead or protected player can be named as the Mayor's replacement, but
  // the attack then kills nobody and the Mayor survives.
  await seedMayorRedirectTargets();
  await route("/table");
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await page.waitForTimeout(150);
  const redirectSelect = page.locator("select[data-redirect]");
  assert.equal(await redirectSelect.count(), 1, "a healthy Mayor offers a redirection");
  const redirectOptions = await redirectSelect.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent.trim() })));
  assert.ok(redirectOptions.some((option) => option.value === "2" && /already dead|уже мёртв|artıq ölü/.test(option.text)),
    "a dead player is offered as a replacement and labelled as no death: " + JSON.stringify(redirectOptions));
  assert.ok(redirectOptions.some((option) => option.value === "3" && /protected|под защитой|qorunur/.test(option.text)),
    "a Monk-protected player is offered and labelled as no death");
  await redirectSelect.selectOption("2");
  await page.waitForTimeout(150);
  await page.locator('[data-act="complete"]').click();
  await page.waitForTimeout(200);
  let mayorState = await page.evaluate(async () => {
    const { state } = await import("./js/store.js");
    return {
      mayorAlive: state.players["1"].alive,
      nightDeaths: state.deaths.filter((death) => death.phase === "night" && death.number === 2).length
    };
  });
  assert.equal(mayorState.mayorAlive, true, "the Mayor survives a redirect to a dead player");
  assert.equal(mayorState.nightDeaths, 0, "a dead replacement produces no extra death");

  await seedMayorRedirectTargets();
  await route("/table");
  await page.locator('[data-target][data-id="1"]').click();
  await page.waitForTimeout(150);
  await page.locator("select[data-redirect]").selectOption("3");
  await page.waitForTimeout(150);
  await page.locator('[data-act="complete"]').click();
  await page.waitForTimeout(200);
  mayorState = await page.evaluate(async () => {
    const { state } = await import("./js/store.js");
    return {
      mayorAlive: state.players["1"].alive,
      protectedAlive: state.players["3"].alive,
      nightDeaths: state.deaths.filter((death) => death.phase === "night" && death.number === 2).length
    };
  });
  assert.equal(mayorState.mayorAlive, true, "the Mayor survives a redirect to a protected player");
  assert.equal(mayorState.protectedAlive, true, "the Monk-protected replacement survives");
  assert.equal(mayorState.nightDeaths, 0, "a protected replacement produces no extra death");

  // The Fortune Teller may pick themself as one of the two targets.
  await seedFortuneTellerNight();
  await route("/table");
  assert.equal(await stepRole(), "fortuneteller");
  const selfButton = page.locator('[data-target][data-id="1"]');
  assert.equal(await selfButton.isDisabled(), false, "the Fortune Teller can select themself");
  await selfButton.click();
  await page.locator('[data-target][data-id="2"]').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('[data-act="complete"]').isEnabled(), true,
    "self plus another player is a complete Fortune Teller choice");
  await page.locator('[data-act="complete"]').click();
  await page.waitForTimeout(200);
  const fortuneGiven = await page.evaluate(async () => {
    const { state } = await import("./js/store.js");
    const step = state.night.queue.find((candidate) => candidate.roleId === "fortuneteller");
    return { targets: step.targetIds, given: step.given && step.given.value };
  });
  assert.deepEqual(fortuneGiven.targets, ["1", "2"], "self-selection is recorded as a target");
  assert.equal(fortuneGiven.given, false, "no Demon and no red herring in the pair");

  // The /secrets picker must offer the Fortune Teller as their own red herring.
  await seedFortuneTellerNight();
  await route("/secrets");
  const herringOptions = await page.locator("select[data-herring] option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, text: node.textContent.trim() })));
  assert.ok(herringOptions.some((option) => option.value === "1" && /Fortune Teller/.test(option.text)),
    "the Fortune Teller can be their own red herring: " + JSON.stringify(herringOptions));

  // Restore the seven-player game the rest of the script expects.
  await seed(7);
  await route("/table");

  // Regression: a stale table Escape listener must never reveal the host.
  await page.locator('[data-act="hide"]').click();
  await route("/player");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".host").count(), 0);
  assert.equal(await page.locator(".player-view").count(), 1);
  await route("/table");

  assert.equal(await page.locator(".host").count(), 0);
  await page.locator('[data-act="reveal"]').click();
  // Exercise extracted correction and export dialogs with real DOM interaction.
  await page.locator('button[data-panel="roster"]').first().click();
  await page.locator('[data-seat-open="1"]').click();
  await page.locator('[data-correct="kind"]').selectOption("role");
  await page.locator('[data-correct="role-value"]').selectOption("chef");
  await page.locator('[data-correct="reason"]').fill("Browser verification");
  await page.locator('[data-act="apply-correction"]').click();
  assert.equal(await page.locator('[aria-modal="true"]').count(), 0);
  await page.locator('button[data-panel="tools"]').click();
  await page.locator('[data-act="export"]:visible').first().click();
  assert.match(await page.locator("textarea[readonly]").inputValue(), /pocket-grimoire/);
  await page.locator('[data-act="close"]').click();
  await page.locator('button[data-panel="play"]').click();
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

  // Finish the seven-player game, including the review gate.
  await page.locator('[data-act="end-day"]').click();
  await finishNight();
  await page.locator('[data-exec-target]').selectOption("7");
  await page.locator('[data-act="execute-direct"]').click();
  assert.equal(await page.locator(".host-review").count(), 0);
  await page.locator('[data-act="review"]').click();
  assert.equal(await page.locator(".host-review").count(), 1);

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
  await route("/player");
  await route("/bag");
  assert.equal(await page.locator(".bag-role, .setup").count(), 0);
  await page.locator("#return-host").click();
  await page.waitForSelector(".setup");

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

  // All production routes and locale sheets remain usable at narrow and wide sizes.
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/bag", "/seat", "/secrets", "/help", "/sheet/en", "/sheet/ru", "/sheet/az", "/demo", "/table"]) {
      await page.evaluate((path) => { history.pushState(null, "", path); dispatchEvent(new PopStateEvent("popstate")); }, "/pocket" + path);
      await page.waitForTimeout(80);
      await overflow();
    }
  }
  const saved = await page.evaluate(async () => {
    const { KEY } = await import("./js/store.js");
    return localStorage.getItem(KEY);
  });
  await route("/demo");
  for (let i = 0; i < 20 && await page.locator('[data-act="next"]:not(:disabled)').count(); i++) {
    await page.locator('[data-act="next"]').click();
  }
  assert.equal(await page.evaluate(async () => {
    const { KEY } = await import("./js/store.js");
    return localStorage.getItem(KEY);
  }), saved, "demo must not change the saved game");
  await route("/table");

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
  await finishNight();
  await page.locator('[data-exec-target]').selectOption("12");
  await page.locator('[data-act="execute-direct"]').click();
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.players["11"].roleId), "imp");
  await page.locator('[data-act="end-day"]').click();
  await finishNight();
  await page.locator('[data-exec-target]').selectOption("11");
  await page.locator('[data-act="execute-direct"]').click();
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.winner?.team), "good");
  await context.setOffline(false);

  // Safe update flow (issue #9): a deployed worker waits until every open
  // window confirms its saved game, then all windows reload once.
  const swSource = await readFile(join(root, "sw.js"), "utf8");
  const baseCache = /const CACHE = "([^"]+)";/.exec(swSource)[1];
  const versionSource = (cache) => swSource.replace(baseCache, cache);
  const nextCache = "pg-static-browsercheck-v2";
  const thirdCache = "pg-static-browsercheck-v3";
  const workerVersion = (target = page) => target.evaluate(() => new Promise((done) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) { done(null); return; }
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => done(event.data && event.data.version);
    controller.postMessage({ type: "GET_VERSION" }, [channel.port2]);
    setTimeout(() => done(null), 2000);
  }));
  const loadCount = (target = page) => target.evaluate(() =>
    Number(sessionStorage.getItem("pg-test-loads") || "0"));
  const deploy = async (cache) => {
    releaseOverride = versionSource(cache);
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, { timeout: 20000 });
    await page.waitForSelector("#update-banner:not([hidden])");
  };
  const waitForReload = (target, before) => target.waitForFunction(
    (count) => Number(sessionStorage.getItem("pg-test-loads") || "0") > count, before, { timeout: 20000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  await seed(7);
  await page.locator(".lang-switch").selectOption("en");
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#update-banner").isVisible(), false, "no prompt without a waiting worker");
  assert.equal(await workerVersion(), baseCache);

  // Offline clients keep running the cached app; returning online checks again.
  await context.setOffline(true);
  await page.waitForFunction(() => navigator.onLine === false);
  releaseOverride = versionSource(nextCache);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), false,
    "an offline client cannot install a new worker");
  await context.setOffline(false);
  await page.waitForFunction(() => navigator.onLine === true);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, { timeout: 15000 });
  await page.waitForSelector("#update-banner:not([hidden])");
  assert.match(await page.locator("#update-message").textContent(), /update is ready/i);
  assert.equal(await workerVersion(), baseCache, "an installed update does not replace the running code");
  const cachesDuringInstall = await page.evaluate(() => caches.keys());
  assert.ok(cachesDuringInstall.includes(baseCache), "the old cache remains active before confirmation");
  assert.ok(cachesDuringInstall.includes(nextCache), "the new version is precached independently");
  await page.screenshot({ path: join(screenshots, "update-available-phone.png"), fullPage: true });

  // Later keeps the current version and the waiting update.
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.locator("#update-later").click();
  assert.equal(await page.locator("#update-banner").isVisible(), false);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin, "Later must not reload");
  assert.equal(await workerVersion(), baseCache);
  assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), true);
  await page.reload();
  await page.waitForSelector(".host");
  await page.waitForSelector("#update-banner:not([hidden])");

  // A save failure in the confirming window blocks activation.
  const loadsBeforeFailure = await loadCount();
  await page.evaluate(async () => {
    const { KEY, state } = await import("./js/store.js");
    state.notes = "Saved from the controlling window";
    window.__pgSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === KEY) throw new Error("Quota exceeded");
      return window.__pgSetItem.call(this, key, value);
    };
  });
  await page.locator("#update-now").click();
  await page.waitForFunction(() => /export/i.test(document.getElementById("update-message").textContent));
  assert.equal(await page.locator("#update-banner").isVisible(), true);
  assert.equal(await page.locator("#update-banner").getAttribute("data-state"), "failed");
  assert.equal(await page.locator("#storage-status").isVisible(), true);
  assert.equal(await loadCount(), loadsBeforeFailure, "a failed save must not reload");
  assert.equal(await workerVersion(), baseCache, "a failed save must not activate the waiting worker");
  await page.screenshot({ path: join(screenshots, "update-save-failed-phone.png"), fullPage: true });
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__pgSetItem;
    delete window.__pgSetItem;
  });
  // Persist the controlling window's note before the coordination check, so the
  // only dirty window is the one whose storage is about to fail.
  await page.evaluate(async () => { (await import("./js/store.js")).save(); });

  // Preflight (issue #11 review): a second window with unsaved changes whose
  // save fails must block activation before SKIP_WAITING is sent.
  const publicTab = await context.newPage();
  await publicTab.goto(url + "#/public");
  await publicTab.waitForSelector(".public");
  await publicTab.waitForSelector("#update-banner:not([hidden])");
  const hostBlockedLoads = await loadCount();
  const publicBlockedLoads = await loadCount(publicTab);
  await publicTab.evaluate(async () => {
    const { KEY, state } = await import("./js/store.js");
    state.notes = "Unsaved in the other window";
    window.__pgSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === KEY) throw new Error("Quota exceeded");
      return window.__pgSetItem.call(this, key, value);
    };
  });
  await page.locator("#update-now").click();
  await page.waitForFunction(() => document.getElementById("update-banner").dataset.state === "peerFailed", { timeout: 15000 });
  assert.match(await page.locator("#update-message").textContent(), /another open window/i);
  assert.equal(await workerVersion(), baseCache, "an unsaved window blocks activation");
  assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), true);
  assert.equal(await loadCount(), hostBlockedLoads, "the confirming window must not reload");
  assert.equal(await loadCount(publicTab), publicBlockedLoads, "the unsaved window must not reload");
  assert.equal(await publicTab.evaluate(async () => (await import("./js/store.js")).state.notes),
    "Unsaved in the other window", "the other window keeps its unsaved state");
  await page.screenshot({ path: join(screenshots, "update-other-window-blocked-phone.png"), fullPage: true });

  // Fix the other window and retry; both windows save and reload exactly once.
  await publicTab.evaluate(() => {
    Storage.prototype.setItem = window.__pgSetItem;
    delete window.__pgSetItem;
  });
  await publicTab.reload();
  await publicTab.waitForSelector(".public");
  await publicTab.waitForSelector("#update-banner:not([hidden])");
  const hostLoads = await loadCount();
  const publicLoads = await loadCount(publicTab);
  await page.locator("#update-now").click();
  await waitForReload(page, hostLoads);
  await page.waitForSelector(".host");
  await waitForReload(publicTab, publicLoads);
  await publicTab.waitForSelector(".public");
  await page.waitForTimeout(1200);
  assert.equal(await loadCount(), hostLoads + 1, "the confirming window reloads exactly once");
  assert.equal(await loadCount(publicTab), publicLoads + 1, "the other window reloads exactly once");
  assert.equal(await workerVersion(), nextCache, "the new worker controls the reloaded app");
  assert.equal(await workerVersion(publicTab), nextCache, "every window runs the new worker");
  const cachesAfterUpdate = await page.evaluate(() => caches.keys());
  assert.ok(cachesAfterUpdate.includes(nextCache));
  assert.ok(!cachesAfterUpdate.includes(baseCache), "activation prunes the previous cache");
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.notes),
    "Saved from the controlling window", "pending game state is saved before activation");
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.players["1"].name), "Alice");
  assert.equal(await page.locator("#update-banner").isVisible(), false);
  await publicTab.close();

  // A window that gains unsaved changes after preflight but before
  // controllerchange must defer its own reload instead of losing them.
  await deploy(thirdCache);
  const loadsBeforeDeferred = await loadCount();
  await page.evaluate(async () => {
    const { KEY, state } = await import("./js/store.js");
    state.notes = "Deferred update note";
    window.__pgSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === KEY) throw new Error("Quota exceeded");
      return window.__pgSetItem.call(this, key, value);
    };
    const reg = await navigator.serviceWorker.getRegistration();
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
  });
  await page.waitForFunction(() => document.getElementById("update-banner").dataset.state === "reloadBlocked", { timeout: 15000 });
  assert.match(await page.locator("#update-message").textContent(), /could not save/i);
  assert.equal(await page.locator("#update-now").textContent(), "Reload");
  assert.equal(await loadCount(), loadsBeforeDeferred, "a window that cannot save defers its reload");
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.notes), "Deferred update note");
  assert.equal(await workerVersion(), thirdCache, "the new worker is active even before this window reloads");
  await page.screenshot({ path: join(screenshots, "update-reload-deferred-phone.png"), fullPage: true });
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__pgSetItem;
    delete window.__pgSetItem;
  });
  await page.locator("#update-now").click();
  await waitForReload(page, loadsBeforeDeferred);
  await page.waitForSelector(".host");
  assert.equal(await page.evaluate(async () => (await import("./js/store.js")).state.notes), "Deferred update note",
    "the deferred reload saves the recovered game");
  assert.equal(await page.locator("#update-banner").isVisible(), false);

  // First upgrade from a pre-#11 installation: the old shell has no prompt, so
  // the waiting worker takes over only after every old window closes.
  const legacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const legacyErrors = [];
  legacyContext.on("page", (tab) => tab.on("pageerror", (error) => legacyErrors.push(error.message)));
  const legacy = await legacyContext.newPage();
  try {
    await legacy.goto(url + "legacy/");
    await legacy.waitForSelector(".host");
    assert.equal(await legacy.locator("#update-banner").count(), 0, "a pre-#11 shell has no update UI");
    await legacy.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, { timeout: 30000 });
    await legacy.reload();
    await legacy.waitForSelector(".host");
    const legacySeeded = await legacy.evaluate(async () => {
      const model = await import("./js/model.js");
      const engine = await import("./js/engine.js");
      const { RECOMMENDED } = await import("./js/rules.js");
      const store = await import("./js/store.js");
      const game = model.createGame(7);
      Object.assign(game.setup, structuredClone(RECOMMENDED[7]));
      const assignment = Object.fromEntries(game.order.map((id, index) => [id, game.setup.roles[index]]));
      const result = engine.dealGame(game, { assignment });
      if (!result.ok) return result;
      game.order.forEach((id) => { game.players[id].name = id === "1" ? "Alice" : "Player " + id; game.players[id].claimed = true; });
      engine.autoSecrets(game);
      game.phase = "seat";
      const start = engine.startNight(game);
      if (!start.ok) return start;
      store.replaceState(game);
      dispatchEvent(new PopStateEvent("popstate"));
      return { ok: true };
    });
    assert.equal(legacySeeded.ok, true, JSON.stringify(legacySeeded));

    // Deploy this release while the old app stays open. Its old code can only
    // cache the new worker; it cannot show the prompt or request activation.
    legacyUpgrade = versionSource("pg-static-browsercheck-upgrade");
    await legacy.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await legacy.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, { timeout: 20000 });
    assert.equal(await legacy.locator("#update-banner").count(), 0, "the old page cannot show the new prompt");
    assert.equal(await legacy.evaluate(async () => (await import("./js/store.js")).state.players["1"].name), "Alice",
      "the old app keeps playing while the update waits");
    await legacy.close();

    // Reopening after closing every old window loads the new code. The waiting
    // worker activates when the last old client closes, so retry briefly.
    let upgraded = null;
    for (let attempt = 0; attempt < 4 && !upgraded; attempt++) {
      await new Promise((done) => setTimeout(done, 1200));
      const tab = await legacyContext.newPage();
      await tab.goto(url + "legacy/");
      await tab.waitForSelector(".host");
      if (await tab.locator("#update-banner").count()) upgraded = tab;
      else await tab.close();
    }
    assert.ok(upgraded, "the new shell loads after the first upgrade");
    assert.equal(await workerVersion(upgraded), "pg-static-browsercheck-upgrade", "the waiting worker took over");
    assert.equal(await upgraded.evaluate(async () => (await import("./js/store.js")).state.players["1"].name), "Alice",
      "the saved game survives the first upgrade");
    const legacyCaches = await upgraded.evaluate(() => caches.keys());
    assert.ok(!legacyCaches.includes("pg-static-a5c98af2811d0d9b"), "the pre-#11 cache is pruned after activation");

    // Subsequent releases use the new prompt and activation path.
    legacyUpgrade = versionSource("pg-static-browsercheck-upgrade2");
    await upgraded.locator(".lang-switch").selectOption("en");
    await upgraded.waitForTimeout(100);
    await upgraded.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await upgraded.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, { timeout: 20000 });
    await upgraded.waitForSelector("#update-banner:not([hidden])");
    assert.match(await upgraded.locator("#update-message").textContent(), /update is ready/i);
    await upgraded.close();
  } finally {
    legacyUpgrade = null;
    await legacyContext.close();
  }
  assert.deepEqual(legacyErrors, []);
  releaseOverride = null;

  assert.deepEqual(errors, []);
  console.log("Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, offline project-subpath reload, safe PWA update.");
  console.log("Screenshots: " + screenshots);
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}


