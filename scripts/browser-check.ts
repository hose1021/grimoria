// Optional browser verification. Set PLAYWRIGHT_MODULE to an installed Playwright ESM entry.
// No browser package is required to run or deploy the application.
import { execFile } from "node:child_process";
import { rmSync } from "node:fs";
import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import type { Page, PageDialog, Playwright } from "./playwright.ts";
import type { AddressInfo } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createDistServer } from "./serve-dist.ts";
import { timed } from "./harness.ts";

const { chromium } = (await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright"
)) as Playwright;
const root = fileURLToPath(new URL("../", import.meta.url));
const BASE = "/pocket/";
// Build and serve a private artifact. A shared dist/ is rewritten by every
// build, so a concurrent build can swap assets under a running check.
const artifacts = process.env.PG_SKIP_BUILD
  ? null
  : await mkdtemp(join(tmpdir(), "pg-browsercheck-"));
if (artifacts) {
  process.on("exit", () => {
    try {
      rmSync(artifacts, { recursive: true, force: true });
    } catch {
      /* the OS temp directory is cleaned eventually */
    }
  });
}
const dist = artifacts ? join(artifacts, "dist") : join(root, "dist");
const distRoot = artifacts ? join(artifacts, "dist-root") : join(root, "dist-root");
const run = promisify(execFile);

const focusedName = process.env.PG_BROWSER_CHECK;
const focusedChecks: Record<string, () => Promise<void>> = {
  "saved-custom-bag": savedCustomBagRestoresPool,
  "role-corrections": currentScriptRoleCorrections,
  "madness-execution": madnessExecutionFromTable,
  "player-voting": playerBubbleVoting,
  "player-card": playerCardHasNoCountdown,
  "drunk-slayer": drunkSlayerFromTable,
  "lunatic-setup": lunaticSetupControls,
  "verification-contracts": verificationContracts,
  "setup-zero": setupZeroIsTheLibrariansAlone,
  "demon-wake": newDemonWakesOnce,
  "pukka-goon": pukkaChoosesGoonWhileSelfPoisoned,
  "mayor-redirect": mayorRedirectIsAsked,
  "heir-question": heirQuestionLeadsTheNight,
  "heir-sheet": heirQuestionLeadsAnOpenSheet,
  "chef-label": chefRegistrationIsLabelled,
  "tinker-night": tinkerNightDeathNeedsTheAbility,
  "night-resurrection": nightResurrectionNeedsTheAbility,
  "notes-4000": notesInputStaysCompact,
  "step-action": stepActionOpensReadyStep,
  "mandatory-skip": mandatoryStepHasNoSkip,
  "execute-stale": executionConfirmRejectsStaleSelection,
};
if (focusedName && !focusedChecks[focusedName]) {
  throw new Error("Unknown browser check: " + focusedName);
}

// The harness drives the built artifact, not the source tree. Build once with
// the subpath base (and again at the root base for the fallback matrix), then
// generate the fallback document and the worker from each build.
if (!process.env.PG_SKIP_BUILD) {
  const build = (base: string, outDir?: string) =>
    run(
      process.execPath,
      [
        join(root, "node_modules/vite/bin/vite.js"),
        "build",
        "--mode",
        "test",
        ...(outDir ? ["--outDir", outDir] : []),
      ],
      { cwd: root, env: { ...process.env, BASE_PATH: base } },
    );
  const post = (base: string, target: string) =>
    Promise.all([
      run(process.execPath, [join(root, "scripts/build-fallback.ts"), "--root", target], {
        cwd: root,
        env: { ...process.env, BASE_PATH: base },
      }),
      run(
        process.execPath,
        [join(root, "scripts/build-offline.ts"), "--root", target, "--out", join(target, "sw.js")],
        { cwd: root, env: { ...process.env, BASE_PATH: base } },
      ),
    ]);
  await build(BASE, dist);
  await post(BASE, dist);
  if (!focusedName) {
    await build("/", distRoot);
    await post("/", distRoot);
  }
}
if (focusedName) {
  console.log(`Focused check: ${focusedName}; project-base artifact only.`);
}

// A mutable release lets the update-flow check deploy a second worker version.
let releaseOverride: string | null = null;

async function before(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (!pathname.startsWith(BASE)) return false;
  const relative = pathname.slice(BASE.length);
  if (relative === "sw.js" && releaseOverride !== null) {
    response.writeHead(200, {
      "content-type": "text/javascript",
      "cache-control": "no-store",
    });
    response.end(releaseOverride);
    return true;
  }
  return false;
}

const server = createDistServer({ root: dist, prefix: BASE, before });
await new Promise<void>((done) =>
  server.listen(0, "127.0.0.1", () => {
    done();
  }),
);
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${BASE}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(() => {
  try {
    sessionStorage.setItem(
      "pg-test-loads",
      String(Number(sessionStorage.getItem("pg-test-loads") || "0") + 1),
    );
  } catch {
    /* storage can be unavailable during teardown */
  }
  // Test-mode entry: the page resolves this specifier at runtime, so the
  // harness never bundles it.
  window.PG_MODULES = () => import(String("/pocket/test-entry.js"));
  // Fixtures advance the night without playing an ability. A permitted skip is
  // the engine's; a mandatory living step is marked directly, because the host
  // rule is not what the fixture exercises.
  window.fixtureSkip = (engine, game, key, reason = "browser check") => {
    const step = game.night.queue.find((entry) => entry.key === key);
    if (!step || step.done || step.skipped) return false;
    if (engine.skipStep(game, key, reason).ok) return true;
    step.done = true;
    step.skipped = true;
    return true;
  };
});
const page = await context.newPage();
const errors: string[] = [];
context.on("page", (tab) => tab.on("pageerror", (error) => errors.push(error.message)));
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const screenshots = join(tmpdir(), "pocket-grimoire-check");
await mkdir(screenshots, { recursive: true });

let phaseStarted = Date.now();
function phase(name: string) {
  const now = Date.now();
  console.log(`PHASE ${name} (${now - phaseStarted} ms)`);
  phaseStarted = now;
}

async function settled(target: Page = page) {
  await target.evaluate(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
}

/** One icon of the web app manifest the identity check reads. */
interface ManifestIcon {
  sizes?: string;
  src: string;
  type?: string;
}

/** The web app manifest fields the identity check reads. */
interface ManifestBody {
  icons?: ManifestIcon[];
  name?: string;
  short_name?: string;
}

async function route(path: string) {
  // Mirror real navigation: stay inside the app's project subpath so that a
  // reload still resolves to a served document.
  await page.evaluate((href) => {
    history.pushState(null, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
  }, "/pocket" + path);
  await page.waitForFunction((path) => document.body.dataset.route === path.slice(1), path);
  await settled();
}
async function sheetRoute(path: string) {
  await page.evaluate((href) => {
    history.pushState(null, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
  }, "/pocket" + path);
  await page.waitForFunction(() => document.body.dataset.route === "sheet");
  await settled();
}
async function overflow() {
  const detail = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    route: location.pathname,
    width: innerWidth,
    elements: [...document.querySelectorAll("#screen *")]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 6)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        right: el.getBoundingClientRect().right,
      })),
  }));
  assert.equal(detail.overflow, false, JSON.stringify(detail));
}
// Issue #143: a role card must show its complete role. The ability text comes
// from the loaded catalog, no clamp applies, and the card grows instead of
// clipping the text.
async function sheetLegibility(widths: number[], expected = 77) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await settled();
    assert.equal(
      await page.locator(".sheet-role").count(),
      expected,
      `${width}px: every standard role and Traveller is present`,
    );
    const problems = await page.evaluate(() => {
      const abilityById = new Map(
        (window.PG?.roles ?? []).map((role) => [role.id, role.ability ?? ""]),
      );
      const problems = [];
      for (const card of document.querySelectorAll<HTMLElement>(".sheet-role")) {
        const id = card.dataset.roleId ?? "";
        const article = card.querySelector("article");
        const name = card.querySelector("h3");
        const text = card.querySelector("p");
        if (!article || !name || !text) {
          problems.push(`${id}: incomplete card markup`);
          continue;
        }
        if (text.textContent !== abilityById.get(id))
          problems.push(`${id}: ability text differs from the catalog`);
        const clamp = getComputedStyle(text).webkitLineClamp;
        if (clamp !== "none") problems.push(`${id}: -webkit-line-clamp is ${clamp}`);
        if (text.scrollHeight > text.clientHeight + 1)
          problems.push(`${id}: ability clips ${text.scrollHeight}>${text.clientHeight}`);
        if (article.scrollHeight > article.clientHeight + 1)
          problems.push(`${id}: card clips ${article.scrollHeight}>${article.clientHeight}`);
        const abilitySize = parseFloat(getComputedStyle(text).fontSize);
        if (abilitySize < 12) problems.push(`${id}: ability font size ${abilitySize}px`);
        const nameSize = parseFloat(getComputedStyle(name).fontSize);
        if (nameSize < 16) problems.push(`${id}: name font size ${nameSize}px`);
      }
      return problems.slice(0, 8);
    });
    assert.deepEqual(problems, [], `${width}px: ${problems.join("; ")}`);
    await overflow();
  }
}
async function chooseLanguage(lang: string) {
  // The bar keeps its list in the burger below 1440 px, so the control is
  // inside the closed panel until the toggle opens it.
  const mobile = ((await page.viewportSize())?.width ?? 0) < 1440;
  if (mobile) {
    await page.locator("[data-app-bar-toggle]").click();
    await page.locator("[data-app-bar-menu]").waitFor({ state: "visible" });
  }
  await page.locator(`.lang-switch [data-lang="${lang}"]`).click();
  if (mobile) await page.keyboard.press("Escape");
  await settled();
}
// The host tools live in the table menu; open it only when it is closed.
async function openTableMenu(target: Page = page) {
  if (await target.locator("[data-menu]").count()) return;
  await target.locator('[data-act="menu"]:visible').click();
  await target.waitForSelector("[data-menu]");
}
// Execution is a two-step control: arm from the dock, confirm in the sheet.
async function executeNow(target: Page = page) {
  await target.locator('[data-act="execute"]').click();
  await target.waitForSelector('[data-act="execute-confirm"]');
  await target.locator('[data-act="execute-confirm"]').click();
}

// The dock action opens the sheet only when the step holds every required
// input, and that sheet can confirm.
async function stepActionOpensReadyStep() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedMayorNight2();
  await route("/table");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  const action = page.locator('[data-act="complete"]');
  assert.equal(await action.isEnabled(), true, "a ready step enables the dock action");
  await action.click();
  const confirm = page.locator('[data-act="step-confirm"]');
  await confirm.waitFor();
  assert.equal(await confirm.isEnabled(), true, "a ready step opens a confirmable sheet");
  await confirm.click();
  await settled();
  assert.equal(
    await page.locator('[data-act="step-confirm"]').count(),
    0,
    "a confirmed step closes the sheet",
  );
  assert.equal(
    await page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      return engine.currentStep(store.state)?.roleId ?? null;
    }),
    "imp",
    "the confirmed step advances the wake",
  );
}

// A living actor's mandatory step offers no Skip control, the command is
// refused, and the Po records "no one" through the ordinary confirmation.
async function mandatoryStepHasNoSkip() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedImpAttackNight2();
  await route("/table");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  assert.equal(
    await page.locator('[data-table-dock] [data-act="skip"]').count(),
    0,
    "the dock offers no skip on the Imp's mandatory step",
  );
  await page.locator('[data-act="complete"]').click();
  const confirm = page.locator('[data-act="step-confirm"]');
  await confirm.waitFor();
  assert.equal(
    await page.locator('[data-act="step-skip"]').count(),
    0,
    "the step sheet offers no skip",
  );
  const refused = await page.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    return store.dispatch({
      id: "mandatory-skip-" + crypto.randomUUID(),
      type: "skipStep",
      payload: { key: engine.currentStep(store.state)!.key },
    });
  });
  assert.equal(refused.status, "rejected", "the command is refused");
  assert.equal(refused.errorCode, "error.80");
  await page.keyboard.press("Escape");
  await settled();

  await seedPoNight2();
  await route("/table");
  assert.equal(
    await page.locator('[data-act="no-one"]').count(),
    1,
    "the dock names the Po's no-one choice",
  );
  assert.equal(
    await page.locator('[data-table-dock] [data-act="skip"]').count(),
    0,
    "the dock offers no skip on the Po's step",
  );
  await page.locator('[data-act="complete"]').click();
  const poConfirm = page.locator('[data-act="step-confirm"]');
  await poConfirm.waitFor();
  assert.equal(await page.locator('[data-act="step-skip"]').count(), 0, "the Po offers no skip");
  assert.equal(
    await page.locator('[data-act="step-no-one"]').count(),
    1,
    "the sheet names the Po's no-one choice",
  );
  assert.equal(
    await page.locator("[data-step-no-one-hint]").count(),
    1,
    "the sheet explains what the choice does",
  );
  await page.locator('[data-act="step-no-one"]').click();
  await settled();
  const recorded = await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    return store.state.players["6"].used.poNoOne === true;
  });
  assert.equal(recorded, true, "the no-one choice is recorded");
  const next = await page.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    const game = structuredClone(store.state);
    while (engine.currentStep(game)) {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    for (const type of ["endNight", "endDay", "startNight"]) {
      const result = engine.applyCommand(game, { id: "po-next-" + type, type, payload: {} });
      if (result.status !== "allowed") throw new Error(type + ": " + JSON.stringify(result));
    }
    while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "po") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const step = engine.currentStep(game);
    return {
      role: step?.roleId ?? null,
      min: step?.minTargets ?? null,
      max: step?.maxTargets ?? null,
    };
  });
  assert.deepEqual(next, { role: "po", min: 3, max: 3 }, "the next Po step takes three targets");
}

// Fixture setup, not a host action: advance the current night step even when the
// console rightly offers no Skip control for a mandatory wake.
async function advanceFixtureStep(target: Page = page) {
  await target.evaluate(async () => {
    const { store, engine } = await window.PG_MODULES();
    const step = engine.currentStep(store.state);
    if (!step) return;
    const applied = store.dispatch({ type: "skipStep", payload: { key: step.key } });
    if (applied.status === "allowed") return;
    const next = structuredClone(store.state);
    const entry = next.night.queue.find((candidate) => candidate.key === step.key);
    if (!entry) return;
    entry.done = true;
    entry.skipped = true;
    store.replaceState(next);
  });
  await settled(target);
}

// A confirmation opened for one player must not execute that player when the
// day already recorded another execution behind the sheet.
async function executionConfirmRejectsStaleSelection() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(7);
  await route("/table");
  await finishNight();
  await page.locator('[data-act="dawn-dismiss"]').click();
  await page.locator('[data-seat-open="2"]').click();
  await page.waitForSelector("[data-player-sheet]");
  await page.locator('[data-act="player-execute"]').click();
  const execute = page.locator('[data-table-dock] [data-act="execute"]');
  assert.equal(await execute.isEnabled(), true, "the selected player arms execution");
  await execute.click();
  await page.waitForSelector('[data-act="execute-confirm"]');
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const result = store.dispatch({
      id: "browser-stale-" + crypto.randomUUID(),
      type: "executeByDecision",
      payload: { playerId: "3" },
    });
    if (result.status !== "allowed") throw new Error(JSON.stringify(result));
  });
  await page.locator('[data-act="execute-confirm"]').click();
  await settled();
  const outcome = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    return {
      executed: state.day.execution?.playerId ?? null,
      selectedAlive: state.players["2"].alive,
    };
  });
  assert.deepEqual(
    outcome,
    { executed: "3", selectedAlive: true },
    "the stale selection is rejected and the recorded execution stays",
  );
}
async function seed(count: number, phase = "night") {
  const result = await page.evaluate(
    async ({ count, phase }) => {
      const model = (await window.PG_MODULES()).model;
      const engine = (await window.PG_MODULES()).engine;
      const store = (await window.PG_MODULES()).store;
      const seedBags: Record<
        number,
        { bluffs: string[]; drunkShownId: string | null; roles: string[] }
      > = {
        7: {
          roles: ["chef", "empath", "fortuneteller", "undertaker", "virgin", "poisoner", "imp"],
          bluffs: ["washerwoman", "librarian", "monk"],
          drunkShownId: null,
        },
        8: {
          roles: [
            "chef",
            "empath",
            "fortuneteller",
            "undertaker",
            "virgin",
            "butler",
            "poisoner",
            "imp",
          ],
          bluffs: ["washerwoman", "librarian", "monk"],
          drunkShownId: null,
        },
        12: {
          roles: [
            "chef",
            "empath",
            "fortuneteller",
            "undertaker",
            "monk",
            "slayer",
            "mayor",
            "drunk",
            "saint",
            "poisoner",
            "scarletwoman",
            "imp",
          ],
          bluffs: ["soldier", "virgin", "ravenkeeper"],
          drunkShownId: "washerwoman",
        },
        // The fifteen-player pool from the console's demo deal: nine
        // Townsfolk, two Outsiders, three Minions and the Imp.
        15: {
          roles: [
            "washerwoman",
            "librarian",
            "investigator",
            "chef",
            "empath",
            "fortuneteller",
            "undertaker",
            "monk",
            "ravenkeeper",
            "butler",
            "saint",
            "poisoner",
            "spy",
            "scarletwoman",
            "imp",
          ],
          bluffs: ["virgin", "slayer", "soldier"],
          drunkShownId: null,
        },
      };
      const game = model.createGame(count);
      Object.assign(game.setup, structuredClone(seedBags[count]));
      const assignment = Object.fromEntries(
        game.order.map((id, index) => [id, game.setup.roles[index]]),
      );
      const result = engine.dealGame(game, { assignment });
      if (!result.ok) return result;
      game.order.forEach((id) => {
        game.players[id].name = id === "1" ? "Alice" : "Player " + id;
        game.players[id].claimed = phase !== "deal";
      });
      engine.autoSecrets(game);
      if (count === 12)
        game.setup.info.washerwoman = { forDrunk: true, roleId: "chef", pair: ["1", "2"] };
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
    },
    { count, phase },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

// Night 2 of a 5-player Mayor game, with the Poisoner's step waiting. Night 1
// is completed with the Chef poisoned so the Mayor starts healthy.
async function seedMayorNight2() {
  const result = await page.evaluate(async () => {
    const model = (await window.PG_MODULES()).model;
    const engine = (await window.PG_MODULES()).engine;
    const store = (await window.PG_MODULES()).store;
    const assignment = { 1: "mayor", 2: "chef", 3: "empath", 4: "poisoner", 5: "imp" };
    const game = model.createGame(5);
    Object.entries(assignment).forEach(([id]) => {
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
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "poisoner")!.key, {
      targetIds: ["2"],
    });
    while (engine.currentStep(game))
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    engine.endNight(game);
    engine.endDay(game);
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}
// Night 2 of a 5-player game with the Imp's mandatory attack waiting.
async function seedImpAttackNight2() {
  const result = await page.evaluate(async () => {
    const { model, engine, store } = await window.PG_MODULES();
    const assignment = { 1: "soldier", 2: "chef", 3: "empath", 4: "poisoner", 5: "imp" };
    const game = model.createGame(5);
    Object.entries(assignment).forEach(([id]) => {
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
    while (engine.currentStep(game)) {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const night = engine.endNight(game);
    if (!night.ok) return night;
    const day = engine.endDay(game);
    if (!day.ok) return day;
    const second = engine.startNight(game);
    if (!second.ok) return second;
    while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "imp") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(
    await page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      return engine.currentStep(store.state)?.roleId ?? null;
    }),
    "imp",
    "the Imp's attack waits",
  );
  await settled();
}

// Night 2 of an 8-player Bad Moon Rising game with the Po's step waiting.
async function seedPoNight2() {
  const result = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment = {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "tinker",
      8: "exorcist",
    };
    const game = model.createGame(8);
    game.script = {
      id: "bmr",
      name: "Bad Moon Rising",
      edition: "bmr",
      roles: [...rules.BMR_ALL],
    };
    game.scriptId = "bmr";
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 8;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = ["fool", "moonchild", "grandmother"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game)) {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const night = engine.endNight(game);
    if (!night.ok) return night;
    const day = engine.endDay(game);
    if (!day.ok) return day;
    const second = engine.startNight(game);
    if (!second.ok) return second;
    while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "po") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(
    await page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      return engine.currentStep(store.state)?.roleId ?? null;
    }),
    "po",
    "the Po's step waits",
  );
  await settled();
}

// Night 2 of a 5-player game where the healthy Soldier is the Imp's target:
// the attack is blocked and the preview must show a prevented death.
async function seedSoldierNight() {
  const result = await page.evaluate(async () => {
    const model = (await window.PG_MODULES()).model;
    const engine = (await window.PG_MODULES()).engine;
    const store = (await window.PG_MODULES()).store;
    const assignment = { 1: "soldier", 2: "chef", 3: "empath", 4: "poisoner", 5: "imp" };
    const game = model.createGame(5);
    Object.entries(assignment).forEach(([id]) => {
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
    while (engine.currentStep(game)) {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    engine.endNight(game);
    engine.endDay(game);
    while (engine.currentStep(game)!.roleId !== "imp") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

// Night 2 of a 7-player Mayor game. P2 died to the Imp on night 1, the Monk
// protects P3 tonight, and P5 is a healthy Soldier. All three are valid Mayor
// replacements, but a dead or protected replacement must not die.
async function seedMayorRedirectTargets() {
  const result = await page.evaluate(async () => {
    const model = (await window.PG_MODULES()).model;
    const engine = (await window.PG_MODULES()).engine;
    const store = (await window.PG_MODULES()).store;
    const assignment = {
      1: "mayor",
      2: "chef",
      3: "empath",
      4: "monk",
      5: "soldier",
      6: "poisoner",
      7: "imp",
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
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "poisoner")!.key, {
      targetIds: ["5"],
    });
    while (engine.currentStep(game)) {
      const step = engine.currentStep(game)!;
      if (step.roleId === "imp") engine.completeStep(game, step.key, { targetIds: ["2"] });
      else window.fixtureSkip(engine, game, step.key, "browser check");
    }
    engine.endNight(game);
    // P2 died away from a night wake: the Imp does not wake on night 1, so the
    // host records the death before night 2 begins.
    engine.kill(game, "2", "test");
    engine.endDay(game);
    start = engine.startNight(game);
    if (!start.ok) return start;
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "poisoner")!.key, {
      targetIds: ["2"],
    });
    engine.completeStep(game, game.night.queue.find((step) => step.roleId === "monk")!.key, {
      targetIds: ["3"],
    });
    const current = engine.currentStep(game);
    if (!current || current.roleId !== "imp")
      return { ok: false, errors: [{ code: "step", message: String(current && current.roleId) }] };
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

// Night 1 of a 7-player Fortune Teller game, stopped on the Fortune Teller step
// with a known red herring so the self-target read is deterministic.
async function seedFortuneTellerNight() {
  const result = await page.evaluate(async () => {
    const model = (await window.PG_MODULES()).model;
    const engine = (await window.PG_MODULES()).engine;
    const store = (await window.PG_MODULES()).store;
    const assignment = {
      1: "fortuneteller",
      2: "chef",
      3: "empath",
      4: "monk",
      5: "soldier",
      6: "poisoner",
      7: "imp",
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
    while (engine.currentStep(game)!.roleId !== "fortuneteller") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const current = engine.currentStep(game);
    if (!current || current.roleId !== "fortuneteller")
      return { ok: false, errors: [{ code: "step", message: String(current && current.roleId) }] };
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

// Night 1 of an 8-player Bad Moon Rising game, stopped on the Lunatic step.
// The Lunatic is shown the Po, the same Demon as the real Demon.
async function seedLunaticNight(independentBluffs = true) {
  const result = await page.evaluate(async (independentBluffs) => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment = {
      1: "lunatic",
      2: "exorcist",
      3: "courtier",
      4: "gambler",
      5: "gossip",
      6: "grandmother",
      7: "assassin",
      8: "po",
    };
    const game = model.createGame(8);
    game.scriptId = "bmr";
    game.script = {
      ...game.script,
      id: "bmr",
      name: "Bad Moon Rising",
      edition: "bmr",
      roles: [...rules.BMR_ALL],
    };
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
    });
    game.setup.count = 8;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = [...rules.BMR_ALL]
      .filter(
        (id) =>
          !game.setup.roles.includes(id) &&
          ["townsfolk", "outsider"].includes(rules.roleTeam(id) ?? ""),
      )
      .slice(0, 3);
    game.setup.lunaticShownId = "po";
    if (independentBluffs) game.setup.lunaticBluffs = ["exorcist", "courtier", "gambler"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game)!.roleId !== "lunatic") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const current = engine.currentStep(game);
    if (!current || current.roleId !== "lunatic")
      return { ok: false, errors: [{ code: "step", message: String(current && current.roleId) }] };
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  }, independentBluffs);
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

// with seat 1 already dead, so the picker must not offer that seat.
async function seedSnakeCharmerNight() {
  const result = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment = {
      1: "clockmaker",
      2: "dreamer",
      3: "snakecharmer",
      4: "artist",
      5: "mutant",
      6: "witch",
      7: "fanggu",
    };
    const game = model.createGame(7);
    game.scriptId = "snv";
    // The script catalog is not exposed to the harness; the edition flag is
    // what routes the night into the Sects & Violets queue.
    game.script = {
      ...game.script,
      id: "snv",
      name: "Sects and Violets",
      edition: "snv",
      roles: [...rules.SNV_ALL],
    };
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 7;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = [...rules.SNV_ALL]
      .filter((id) => !game.setup.roles.includes(id))
      .slice(0, 3);
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.players["1"].alive = false;
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game)!.roleId !== "snakecharmer") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const current = engine.currentStep(game);
    if (!current || current.roleId !== "snakecharmer")
      return { ok: false, errors: [{ code: "step", message: String(current && current.roleId) }] };
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

// The Evil Twin holder is dead but keeps the ability through the living
// Vigormortis, and the Storyteller has not chosen the other Twin yet. The night
// gate must offer the choice in the dock, not only in the manual-correction
// menu (Evil Twin r3101, Vigormortis r3015).
async function seedRetainedTwinNight() {
  const result = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment = {
      1: "clockmaker",
      2: "dreamer",
      3: "snakecharmer",
      4: "mathematician",
      5: "artist",
      6: "eviltwin",
      7: "vigormortis",
      8: "oracle",
    };
    const game = model.createGame(8);
    game.scriptId = "snv";
    game.script = {
      ...game.script,
      id: "snv",
      name: "Sects and Violets",
      edition: "snv",
      roles: [...rules.SNV_ALL],
    };
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 8;
    game.setup.roles = [...new Set(Object.values(assignment))];
    game.setup.bluffs = [...rules.SNV_ALL]
      .filter((id) => !game.setup.roles.includes(id))
      .slice(0, 3);
    game.setup.evilTwinGoodId = "artist";
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    // The Vigormortis killed the Evil Twin. The death record is the shape the
    // engine writes, so the retention predicate accepts it.
    game.players["6"].alive = false;
    game.deaths.push({
      id: "browser-evil-twin-death",
      playerId: "6",
      roleId: "eviltwin",
      cause: "demon",
      phase: "night",
      number: 1,
      at: new Date().toISOString(),
      impaired: false,
      livingBefore: 8,
      demon: true,
      ability: "vigormortis",
    });
    // The other Twin is the Storyteller's pending choice, and every step is
    // resolved so the partner gate is the only reason the night cannot end.
    game.players["5"].alive = false;
    game.setup.evilTwinPlayerId = null;
    game.setup.evilTwinGoodPlayerId = null;
    for (const step of game.night.queue) {
      step.done = true;
      step.skipped = true;
    }
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
}

async function finishNight() {
  for (let i = 0; i < 30; i++) {
    if (await page.locator('[data-act="end-night"]').count()) {
      await page.locator('[data-act="end-night"]').click();
      return;
    }
    const targets = page.locator("[data-target]:not(:disabled)");
    if (await targets.count()) {
      const mode = await page.evaluate(async () => {
        const { state } = (await window.PG_MODULES()).store;
        const { currentStep } = (await window.PG_MODULES()).engine;
        return currentStep(state)!.targetMode;
      });
      await targets.nth(0).click();
      if (mode === "two") await page.locator("[data-target]:not(:disabled)").nth(1).click();
    }
    const complete = page.locator('[data-act="complete"]');
    assert.equal(await complete.isEnabled(), true, "night step should be completable");
    await complete.click();
    const given = page.locator("select[data-given]:visible");
    if (await given.count()) {
      const value = await given
        .locator("option")
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value).find(Boolean),
        );
      if (value) await given.selectOption(value);
    }
    const confirm = page.locator('[data-act="step-confirm"]');
    assert.equal(await confirm.isEnabled(), true, "the step sheet should be confirmable");
    await confirm.click();
  }
  throw new Error("Night did not end");
}

/** Opens the step sheet from the dock and confirms the prepared step. */
async function completeStep() {
  const complete = page.locator('[data-act="complete"]');
  await complete.click();
  const confirm = page.locator('[data-act="step-confirm"]');
  if (await confirm.count()) await confirm.click();
}

async function notesInputStaysCompact() {
  if (!(await page.locator("[data-notes]").count())) {
    await route("/table");
    await seed(7, "night");
    await openTableMenu();
  }
  const intermediate = "n2000:" + "x".repeat(1994);
  const final = "n4000:" + "x".repeat(3994);
  await page.locator("[data-notes]").fill(intermediate);
  await page.waitForFunction(
    async (expected) => (await window.PG_MODULES()).store.state.notes === expected,
    intermediate,
  );
  await page.locator("[data-notes]").fill(final);
  await page.waitForFunction(
    async (expected) => (await window.PG_MODULES()).store.state.notes === expected,
    final,
  );
  const measured = await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const applied = Object.values(store.state.applied);
    return {
      bytes: (localStorage.getItem("pg.game.v4") ?? "").length,
      compact: applied.every((entry) => typeof entry.identity === "string"),
      intermediate: JSON.stringify(store.state.applied).includes("n2000:"),
    };
  });
  assert.ok(measured.bytes < 2_000_000, "4000 notes stay compact: " + measured.bytes);
  assert.equal(measured.compact, true, "applied entries use compact identities");
  assert.equal(measured.intermediate, false, "applied entries keep no intermediate text");
  await page.locator("[data-notes]").fill("Browser verification");
  await page.waitForFunction(
    async () => (await window.PG_MODULES()).store.state.notes === "Browser verification",
  );
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem("pg.game.v4");
    return raw ? JSON.parse(raw).notes : null;
  });
  assert.equal(persisted, "Browser verification", "the 4000 character edit is saved");
}

async function savedCustomBagRestoresPool() {
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  const configured = await page.evaluate(async () => {
    const { store, rules } = await window.PG_MODULES();
    return store.dispatch({
      type: "bagUpdate",
      payload: {
        patch: {
          script: {
            id: "custom-draft",
            name: "Saved custom pool",
            edition: "custom",
            source: "manual",
            author: "Browser regression",
            roles: rules.ALL_ROLES.slice(),
            manualOnly: false,
          },
          count: 5,
          resetRoster: true,
          phase: "setup",
          roles: ["chef", "empath", "soldier", "poisoner", "imp"],
          bluffs: [],
          drunkShownId: null,
          lunaticShownId: null,
          evilTwinGoodId: null,
        },
      },
    });
  });
  assert.equal(configured.status, "allowed", JSON.stringify(configured));
  await route("/bag");
  await page.locator('[data-tab="manual"]').click();
  const saved = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    return { script: structuredClone(state.script), roles: state.setup.roles.slice() };
  });
  await page.locator('[data-act="library"]').click();
  await page.locator("[data-library-name]").fill("Same-ID custom bag regression");
  await page.locator('[data-act="save-bag"]').click();
  const savedBagId = await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem("pg.library.v1") || "{}");
    return library.bags.find(
      (bag: { name: string }) => bag.name === "Same-ID custom bag regression",
    ).id as string;
  });
  await page.locator('[data-act="close-library"]').last().click();
  await page.locator('[data-act="edit-pool"]').click();
  await page.locator('.bag-role[data-role="chef"]').click();
  assert.equal(
    await page.evaluate(async () =>
      (await window.PG_MODULES()).store.state.script.roles.includes("chef"),
    ),
    false,
    "editing the pool removes a role from the saved bag without changing the script ID",
  );
  await page.locator('[data-act="library"]').click();
  await page.locator(`[data-load-bag="${savedBagId}"]`).click();
  const restored = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    return { script: structuredClone(state.script), roles: state.setup.roles.slice() };
  });
  assert.deepEqual(
    restored,
    saved,
    "loading a same-ID custom bag restores its pool and selected roles",
  );
  await page.waitForSelector("[data-library-name]", { state: "detached" });
  await page.reload();
  await page.waitForSelector(".setup");
  assert.deepEqual(
    await page.evaluate(async () => {
      const { state } = (await window.PG_MODULES()).store;
      return { script: structuredClone(state.script), roles: state.setup.roles.slice() };
    }),
    saved,
    "the restored custom pool and bag survive a reload",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "restored-custom-bag-390.png") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await overflow();
  await page.screenshot({ path: join(screenshots, "restored-custom-bag-1280.png") });
}

async function playerBubbleVoting() {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await seed(7);
    await page.evaluate(async () => {
      const { store, engine } = await window.PG_MODULES();
      const game = structuredClone(store.state);
      while (engine.currentStep(game)) {
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser vote controls");
      }
      engine.endNight(game);
      game.players["3"].alive = false;
      store.replaceState(game);
    });
    await route("/table");
    await page.locator('[data-seat-open="2"]').click();
    assert.equal(
      await page.locator("[data-vote-count]").count(),
      1,
      "a player bubble offers a vote count",
    );
    await page.locator("[data-vote-count]").fill("8");
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator('[data-seat-open="2"] [data-seat-vote-count]').count(),
      0,
      "an out-of-range count is not recorded",
    );
    await page.locator("[data-vote-count]").fill("4");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator('[data-seat-open="2"] [data-seat-vote-count]')
        .getAttribute("data-seat-vote-count"),
      "4",
    );
    await page.locator('[data-seat-open="3"]').click();
    await page.locator('[data-act="toggle-dead-vote"]').click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator('[data-seat-open="3"] [data-seat-badge="no-ghost-vote"]').count(),
      1,
    );
    await page.reload();
    await page.waitForSelector("[data-game-table]");
    const persisted = await page.evaluate(async () => {
      const { state } = (await window.PG_MODULES()).store;
      return {
        count: state.day.voteCounts?.["2"],
        token: state.players["3"].voteToken,
        nominations: state.day.nominations.length,
        execution: state.day.execution,
        phase: state.phase,
        alive: state.players["2"].alive,
      };
    });
    assert.deepEqual(
      persisted,
      { count: 4, token: false, nominations: 0, execution: null, phase: "day", alive: true },
      "vote totals and spent token persist without inventing a nomination or execution",
    );
    await page.locator('[data-seat-open="2"]').click();
    assert.equal(await page.locator("[data-vote-count]").inputValue(), "4");
    assert.equal(
      await page.locator('[data-act="toggle-dead-vote"]').count(),
      0,
      "living players have no dead-vote control",
    );
    await page.locator("[data-vote-count]").fill("0");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.locator('[data-seat-open="3"]').click();
    await page.locator('[data-act="toggle-dead-vote"]').click();
    await overflow();
    await page.screenshot({ path: join(screenshots, `player-voting-${width}.png`) });
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(
        async () => (await window.PG_MODULES()).store.state.players["3"].voteToken,
      ),
      true,
      "the host can correct a mistaken spent-vote marker",
    );
  }
  const registeredDead = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const game = model.createGame(5);
    game.script = { id: "bmr", name: "Bad Moon Rising", edition: "bmr", roles: [...rules.BMR_ALL] };
    game.scriptId = "bmr";
    const assignment = { 1: "exorcist", 2: "courtier", 3: "gambler", 4: "assassin", 5: "zombuul" };
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = [];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    game.phase = "seat";
    engine.startNight(game);
    while (engine.currentStep(game))
      window.fixtureSkip(
        engine,
        game,
        engine.currentStep(game)!.key,
        "registered dead browser check",
      );
    engine.kill(game, "5", "demon");
    engine.endNight(game);
    store.replaceState(game);
    return {
      ok: true,
      alive: game.players["5"].alive,
      registeredDead: game.players["5"].registeredDead,
    };
  });
  assert.deepEqual(registeredDead, { ok: true, alive: true, registeredDead: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  await page.locator('[data-seat-open="5"]').click();
  await page.locator('[data-act="toggle-dead-vote"]').click();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator('[data-seat-open="5"] [data-seat-badge="no-ghost-vote"]').count(),
    1,
    "a registered-dead Zombuul shows its spent vote on the bubble",
  );
  await page.reload();
  await page.waitForSelector("[data-game-table]");
  assert.equal(
    await page.locator('[data-seat-open="5"] [data-seat-badge="no-ghost-vote"]').count(),
    1,
  );
}

async function verificationContracts() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedLunaticNight(false);
  const names = await page.evaluate(() =>
    (window.PG?.roles ?? [])
      .filter((role) => ["po", "lunatic", "imp"].includes(role.id))
      .map((role) => role.name),
  );
  await route("/public");
  const publicText = await page.locator(".public").innerText();
  for (const name of names) {
    assert.equal(publicText.includes(name), false, `the public screen leaks ${name}`);
  }
  await route("/player");
  await page.locator("[data-seat]:not([disabled])").first().click();
  const card = page.locator(".player-card");
  await card.waitFor();
  const cardText = await card.innerText();
  assert.ok(cardText.length > 0, "the handoff card is visible");
  assert.equal(
    cardText.includes(names[1] ?? ""),
    false,
    "the handoff card never names the real Lunatic role",
  );
  await page.keyboard.press("Escape");
  await route("/table");
  await page.waitForSelector("[data-hub-step]", { timeout: 5000 });
  assert.ok(
    (await page.locator("[data-hub-step]").innerText()).length > 0,
    "the table keeps the current step",
  );
}

async function lunaticSetupControls() {
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/bag");
  const configured = await page.evaluate(async () => {
    const { store, rules } = await window.PG_MODULES();
    return store.dispatch({
      type: "bagUpdate",
      payload: {
        patch: {
          script: {
            id: "bmr",
            name: "Bad Moon Rising",
            edition: "bmr",
            source: "official",
            roles: [...rules.BMR_ALL],
          },
          count: 8,
          resetRoster: true,
          phase: "setup",
          roles: [
            "lunatic",
            "exorcist",
            "courtier",
            "gambler",
            "gossip",
            "grandmother",
            "assassin",
            "po",
          ],
          bluffs: ["sailor", "chambermaid", "innkeeper"],
          lunaticShownExplicit: false,
          lunaticBluffs: [],
          drunkShownId: null,
          evilTwinGoodId: null,
        },
      },
    });
  });
  assert.equal(configured.status, "allowed", JSON.stringify(configured));
  await route("/bag");
  await page.locator('[data-tab="manual"]').click();
  const lunaticBluffNames = () => page.locator("[data-lunatic-bluff-slot] b").allTextContents();
  const demonBluffNames = () =>
    page.evaluate(async () => {
      const { setup } = (await window.PG_MODULES()).store.state;
      return setup.bluffs.map((id) => window.PG?.roles?.find((role) => role.id === id)?.name ?? id);
    });
  assert.deepEqual(
    await lunaticBluffNames(),
    await demonBluffNames(),
    "an unchosen Lunatic bluff list displays the real Demon's three bluffs",
  );
  assert.equal(
    (await page.locator('[aria-labelledby="bag-lunatic-bluffs"] > div > b').textContent())?.trim(),
    "3/3",
    "the default Lunatic bluff count matches the real Demon's list",
  );
  await page.reload();
  await page.waitForSelector(".setup");
  await page.locator('[data-tab="manual"]').click();
  assert.deepEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.lunaticBluffs),
    [],
    "reload preserves the unchosen Lunatic list without copying a default into state",
  );
  assert.deepEqual(
    await lunaticBluffNames(),
    await demonBluffNames(),
    "the inherited Lunatic bluffs survive reload",
  );
  await page.locator('[data-act="library"]').click();
  await page.locator("[data-library-name]").fill("Legacy Lunatic defaults");
  await page.locator('[data-act="save-bag"]').click();
  const legacyBagId = await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem("pg.library.v1") || "{}") as {
      bags: { id: string; name: string; lunaticBluffs?: string[] }[];
    };
    const bag = library.bags.find((entry) => entry.name === "Legacy Lunatic defaults")!;
    delete bag.lunaticBluffs;
    localStorage.setItem("pg.library.v1", JSON.stringify(library));
    return bag.id;
  });
  await page.reload();
  await page.waitForSelector(".setup");
  await page.locator('[data-act="library"]').click();
  await page.locator(`[data-load-bag="${legacyBagId}"]`).click();
  assert.deepEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.lunaticBluffs),
    [],
    "loading a legacy saved bag keeps the Lunatic list following the Demon",
  );
  await page.locator('[data-shuffle-bluffs="demon"]').click();
  assert.deepEqual(
    await lunaticBluffNames(),
    await demonBluffNames(),
    "the Lunatic inherits a later Demon shuffle after a legacy saved bag loads",
  );
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const legacy = structuredClone(store.state);
    delete legacy.setup.lunaticBluffs;
    store.replaceState(legacy);
  });
  await route("/bag");
  await page.locator('[data-tab="manual"]').click();
  await page.locator('[data-shuffle-bluffs="demon"]').click();
  await page.locator('[data-act="undo"]').click();
  assert.deepEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.lunaticBluffs),
    [],
    "setup undo keeps an absent legacy Lunatic list following the Demon",
  );
  await page.locator('[data-shuffle-bluffs="demon"]').click();
  assert.deepEqual(
    await lunaticBluffNames(),
    await demonBluffNames(),
    "the Lunatic bluffs still follow a Demon shuffle after legacy setup undo",
  );
  assert.equal(
    await page.locator('[data-act="lunatic-follow-demon"]').count(),
    1,
    "Lunatic setup offers an explicit follow-Demon default",
  );
  const mask = () =>
    page.evaluate(async () => {
      const { setup } = (await window.PG_MODULES()).store.state;
      return { role: setup.lunaticShownId, explicit: setup.lunaticShownExplicit };
    });
  assert.deepEqual(await mask(), { role: "po", explicit: false });
  await page.locator('.bag-role[data-role="po"]').click();
  await page.locator('.bag-role[data-role="shabaloth"]').click();
  assert.deepEqual(await mask(), { role: "shabaloth", explicit: false });
  await page.locator('[data-lunatic-role="zombuul"]').click();
  await page.locator('.bag-role[data-role="shabaloth"]').click();
  await page.locator('.bag-role[data-role="pukka"]').click();
  assert.deepEqual(
    await mask(),
    { role: "zombuul", explicit: true },
    "an explicit shown Demon survives a real Demon change",
  );
  await page.locator('[data-act="lunatic-follow-demon"]').click();
  assert.deepEqual(await mask(), { role: "pukka", explicit: false });
  await page.locator('[data-shuffle-bluffs="demon"]').click();
  const demonBluffs = await page.evaluate(async () => {
    const { store, rules } = await window.PG_MODULES();
    const { setup } = store.state;
    return {
      ids: setup.bluffs,
      legal: setup.bluffs.every(
        (id) =>
          !setup.roles.includes(id) && ["townsfolk", "outsider"].includes(rules.roleTeam(id) ?? ""),
      ),
    };
  });
  assert.equal(demonBluffs.ids.length, 3);
  assert.equal(new Set(demonBluffs.ids).size, 3);
  assert.equal(demonBluffs.legal, true);
  assert.deepEqual(
    await lunaticBluffNames(),
    await demonBluffNames(),
    "the unchosen Lunatic bluffs follow a real Demon bluff shuffle",
  );
  await page.locator('[data-act="edit-bluffs"]').click();
  assert.equal(
    await page.locator('[data-bluff-role="exorcist"]').count(),
    0,
    "the real Demon picker excludes an occupied good character",
  );
  await page.locator('[data-shuffle-bluffs="lunatic"]').click();
  assert.deepEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.bluffs),
    demonBluffs.ids,
    "Lunatic shuffle leaves the real Demon's bluffs alone",
  );
  for (let index = 0; index < 2; index++)
    await page.locator('[data-lunatic-bluff-slot="0"]').click();
  const remainingBluff = await page.evaluate(
    async () => (await window.PG_MODULES()).store.state.setup.lunaticBluffs?.[0],
  );
  if (remainingBluff !== "exorcist") {
    await page.locator('[data-lunatic-bluff-role="exorcist"]').click();
    await page.locator('[data-lunatic-bluff-slot="0"]').click();
  }
  for (const id of ["courtier", "gambler"])
    await page.locator(`[data-lunatic-bluff-role="${id}"]`).click();
  const independentNames = await lunaticBluffNames();
  await page.locator('[data-lunatic-bluff-slot="2"]').click();
  assert.deepEqual(
    await lunaticBluffNames(),
    independentNames.slice(0, 2),
    "a partial explicit Lunatic list keeps its choices without adding Demon bluffs",
  );
  await page.locator('[data-lunatic-bluff-role="gambler"]').click();
  assert.deepEqual(await lunaticBluffNames(), independentNames);
  assert.equal(
    await page.locator('[data-bluff-role="exorcist"]').count(),
    0,
    "an occupied good role is not offered to the real Demon",
  );
  await page.locator('[data-act="library"]').click();
  await page.locator("[data-library-name]").fill("Independent Lunatic setup");
  await page.locator('[data-act="save-bag"]').click();
  const savedBagId = await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem("pg.library.v1") || "{}");
    return library.bags.find((bag: { name: string }) => bag.name === "Independent Lunatic setup")
      .id as string;
  });
  await page.locator('[data-act="close-library"]').last().click();
  await page.locator('[data-lunatic-role="po"]').click();
  await page.locator('[data-shuffle-bluffs="lunatic"]').click();
  await page.locator('[data-act="library"]').click();
  await page.locator(`[data-load-bag="${savedBagId}"]`).click();
  await page.reload();
  await page.waitForSelector(".setup");
  assert.deepEqual(await mask(), { role: "pukka", explicit: false });
  assert.deepEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.lunaticBluffs),
    ["exorcist", "courtier", "gambler"],
    "independent occupied Lunatic bluffs survive reload",
  );
  await overflow();
  await page.locator('[data-act="lunatic-follow-demon"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(screenshots, "lunatic-setup-390.png") });
  await page.locator('[aria-labelledby="bag-lunatic-bluffs"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(screenshots, "lunatic-bluffs-390.png") });
  await page.setViewportSize({ width: 1280, height: 900 });
  await overflow();
  await page.screenshot({ path: join(screenshots, "lunatic-setup-1280.png") });
  for (let index = 0; index < 3; index++)
    await page.locator('[data-lunatic-bluff-slot="0"]').click();
  assert.deepEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.lunaticBluffs),
    [],
    "removing the final explicit bluff clears the Lunatic override",
  );
  assert.deepEqual(
    await lunaticBluffNames(),
    await demonBluffNames(),
    "clearing the Lunatic override resumes the real Demon's bluffs",
  );

  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const legacy = structuredClone(store.state);
    delete legacy.setup.lunaticShownExplicit;
    delete legacy.setup.lunaticBluffs;
    legacy.setup.lunaticShownId = null;
    legacy.setup.roles = legacy.setup.roles.filter((id) => id !== "lunatic" && id !== "pukka");
    store.replaceState(legacy);
  });
  await route("/bag");
  await page.locator('[data-tab="manual"]').click();
  await page.locator('.bag-role[data-role="lunatic"]').click();
  await page.locator('.bag-role[data-role="shabaloth"]').click();
  assert.deepEqual(
    await mask(),
    { role: "shabaloth", explicit: false },
    "editing an old setup with no mask adopts the follow-Demon default",
  );
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const legacy = structuredClone(store.state);
    delete legacy.setup.lunaticShownExplicit;
    legacy.setup.lunaticShownId = "po";
    store.replaceState(legacy);
  });
  await route("/bag");
  await page.locator('[data-tab="manual"]').click();
  await page.locator('.bag-role[data-role="shabaloth"]').click();
  await page.locator('.bag-role[data-role="pukka"]').click();
  assert.deepEqual(
    await mask(),
    { role: "po", explicit: true },
    "editing an old setup preserves a previously chosen mask",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await seedLunaticNight(false);
  await route("/table");
  await page.locator('[data-target][data-id="3"]').click();
  await page.locator('[data-act="complete"]').click();
  await page.locator('[data-act="show-info"]').click();
  await page.waitForSelector("[data-lunatic-card]");
  const defaultCardBluffs = await page
    .locator("[data-lunatic-card] [data-info-bluffs] > *")
    .allTextContents();
  assert.deepEqual(
    defaultCardBluffs.map((name) => name.trim()),
    await demonBluffNames(),
    "the Lunatic's first-night card shows all three inherited Demon bluffs",
  );
  const defaultCard = await page.locator("[data-lunatic-card]").innerText();
  assert.ok(!defaultCard.includes("Player 7"), "inheriting bluffs keeps the real Minion private");
  assert.ok(!defaultCard.includes("Player 8"), "inheriting bluffs keeps the real Demon private");
  await overflow();
  await page.screenshot({ path: join(screenshots, "lunatic-default-bluffs-390.png") });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

// Issue #200: "Or that zero are in play" is the Librarian's answer alone
// (Librarian r1721). A zero held for the Washerwoman is no prepared answer: the
// step asks for setup instead of telling her about Outsiders, and the secrets
// screen keeps the fields the host repairs it with.
async function setupZeroIsTheLibrariansAlone() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(15);
  await route("/table");
  const stepRole = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      return engine.currentStep(store.state)?.roleId ?? null;
    });
  for (let guard = 0; guard < 12 && (await stepRole()) !== "washerwoman"; guard += 1) {
    await advanceFixtureStep();
  }
  assert.equal(await stepRole(), "washerwoman", "the Washerwoman's step is open");

  // The table offers the zero for the Librarian only, so this record needs a
  // command sent after the night began, an import or an older save.
  const stored = await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    return (["washerwoman", "librarian"] as const).map(
      (roleId) => store.dispatch({ type: "setSetupInfoZero", payload: { roleId } }).status,
    );
  });
  assert.deepEqual(stored, ["allowed", "allowed"]);
  await settled();

  assert.equal(
    await page.locator('[data-act="open-secrets"]').count(),
    1,
    "a Washerwoman step that holds a zero offers the secret setup route",
  );
  assert.equal(
    await page.locator('[data-act="step-confirm"]').count(),
    0,
    "a step blocked by missing setup opens no sheet",
  );
  // What the table reads for the step: no answer is prepared, in any language.
  assert.deepEqual(
    await page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const step = engine.currentStep(store.state);
      return step ? engine.infoForStep(store.state, step, {}) : null;
    }),
    { kind: "one-of-two", missing: true, needsChoice: true },
    "the Washerwoman is not told that no Outsiders are in play",
  );
  assert.ok(
    (await page.locator('[data-blocker-reason="secrets"]').count()) > 0,
    "the step names the missing setup as what blocks it",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "setup-zero-washerwoman-step-390.png") });

  await page.locator('[data-act="open-secrets"]').click();
  await page.waitForFunction(() => document.body.dataset.route === "secrets");
  await settled();
  // The checksheet opens one obligation at a time, so each editor is read
  // through its index item.
  await page.locator('[data-obligation="washerwoman"]').click();
  await settled();
  assert.equal(
    await page.locator('[data-info-role="washerwoman"]').isVisible(),
    true,
    "the Washerwoman's editor keeps the character select",
  );
  assert.equal(await page.locator('[data-player="pair-a-washerwoman"]').isVisible(), true);
  assert.equal(await page.locator('[data-player="pair-b-washerwoman"]').isVisible(), true);
  assert.equal(
    await page.locator('[data-info-zero="washerwoman"]').count(),
    0,
    "the zero is not a choice of the Washerwoman's editor",
  );
  // The Librarian's stored zero is shown as the zero and stays editable.
  await page.locator('[data-obligation="librarian"]').click();
  await settled();
  assert.equal(await page.locator('[data-info-zero="librarian"]').isChecked(), true);
  assert.equal(await page.locator('[data-info-role="librarian"]').count(), 0);
  await overflow();
  await page.screenshot({ path: join(screenshots, "setup-zero-secrets-390.png"), fullPage: true });

  await page.locator('[data-obligation="washerwoman"]').click();
  await settled();
  await page.locator('[data-info-role="washerwoman"]').selectOption("chef");
  await page.locator('[data-player="pair-a-washerwoman"]').selectOption("4");
  await page.locator('[data-player="pair-b-washerwoman"]').selectOption("5");
  await route("/table");
  await page.locator('[data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');
  assert.equal(
    await page.locator('[data-act="step-confirm"]').isEnabled(),
    true,
    "the step completes once a character and two players are prepared",
  );
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.deepEqual(
    await page.evaluate(async () => {
      const { state } = (await window.PG_MODULES()).store;
      const step = state.night.queue.find((entry) => entry.roleId === "washerwoman");
      const given = step?.given as { pair?: string[]; roleId?: string; zero?: boolean } | null;
      return {
        done: step?.done,
        roleId: given?.roleId,
        pair: [...(given?.pair ?? [])].sort(),
        zero: given?.zero ?? false,
      };
    }),
    { done: true, roleId: "chef", pair: ["4", "5"], zero: false },
    "the Washerwoman learns the prepared character and players",
  );
}

async function drunkSlayerFromTable() {
  await page.setViewportSize({ width: 390, height: 844 });
  const result = await page.evaluate(async () => {
    const { model, engine, store } = await window.PG_MODULES();
    const assignment = {
      1: "drunk",
      2: "chef",
      3: "empath",
      4: "soldier",
      5: "poisoner",
      6: "imp",
    };
    const game = model.createGame(6);
    game.setup.roles = Object.values(assignment);
    game.setup.drunkShownId = "slayer";
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    for (const player of Object.values(game.players)) player.claimed = true;
    engine.autoSecrets(game);
    game.phase = "seat";
    const started = engine.startNight(game);
    if (!started.ok) return started;
    while (engine.currentStep(game)) {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    const ended = engine.endNight(game);
    if (!ended.ok) return ended;
    return store.replaceState(game);
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
  await route("/table");
  await page.locator('[data-seat-open="1"]').click();
  const sheet = page.locator("[data-player-sheet]");
  await sheet.locator("[data-slayer-target]").selectOption("6");
  await sheet.locator('[data-act="slayer"]').click();
  await page.waitForFunction(
    async () => (await window.PG_MODULES()).store.state.players["1"].used.slayer === true,
  );
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.players["6"].alive),
    true,
  );
  assert.equal(await sheet.locator('[data-act="slayer"]').count(), 0);
}

// Night 2 of a ten-player game with a Poisoner, a Scarlet Woman and the Imp.
// Two Minions, so the host names the heir; only seat 3 (the Empath, or the
// Fortune Teller, who takes targets) wakes after the Imp.
async function seedImpHeirNight2(third: "empath" | "fortuneteller" = "empath") {
  const result = await page.evaluate(async (third) => {
    const { model, engine, store } = await window.PG_MODULES();
    const assignment: Record<string, string> = {
      1: "soldier",
      2: "mayor",
      3: third,
      4: "chef",
      5: "virgin",
      6: "slayer",
      7: "washerwoman",
      8: "poisoner",
      9: "scarletwoman",
      10: "imp",
    };
    const game = model.createGame(10);
    Object.keys(assignment).forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 10;
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = ["monk", "ravenkeeper", "undertaker"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game))
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    const night = engine.endNight(game);
    if (!night.ok) return night;
    const day = engine.endDay(game);
    if (!day.ok) return day;
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  }, third);
  assert.equal(result.ok, true, JSON.stringify(result));
}

// Issue #200, Imp r3116: after a night self-kill the host names the new Imp,
// who is woken once that night ("Wake the new Imp, show them the YOU ARE info
// token") and not again the next night, when it wakes only for its own step.
async function newDemonWakesOnce() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedImpHeirNight2();
  await settled();
  await route("/table");
  const current = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const step = engine.currentStep(store.state);
      if (!step) return null;
      return step.system ? step.system : step.roleId + ":" + step.actorId;
    });
  const wakes = () =>
    page.evaluate(async () => {
      const { store } = await window.PG_MODULES();
      return store.state.night.queue.filter((step) => step.system === "demonchange").length;
    });
  const confirmWith = async (targetId: string) => {
    await page.locator(`[data-target][data-id="${targetId}"]`).click();
    await completeStep();
    await settled();
  };

  // The Poisoner poisons the Scarlet Woman, so she does not take the role, and
  // the Imp kills itself.
  assert.equal(await current(), "poisoner:8", "night 2 opens on the Poisoner");
  await confirmWith("9");
  assert.equal(await current(), "imp:10");
  await confirmWith("10");

  // The host names the Poisoner as the new Imp, from the dock.
  await page.waitForSelector("[data-dock-heir] [data-heir]");
  await overflow();
  await page.screenshot({ path: join(screenshots, "demon-wake-heir-390.png") });
  await page.locator('[data-dock-heir] [data-heir][data-id="8"]').click();
  await settled();
  assert.equal(await current(), "demonchange", "the new Imp is woken next, before the Empath");
  assert.equal(await wakes(), 1);
  await overflow();
  await page.screenshot({ path: join(screenshots, "demon-wake-step-390.png") });
  const confirm = page.locator('[data-act="step-confirm"]');
  if (!(await confirm.count())) await page.locator('[data-act="complete"]').click();
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.equal(await current(), "empath:3");
  await finishNight();
  await page.waitForFunction(
    async () => (await window.PG_MODULES()).store.state.phase === "day",
    null,
    { timeout: 3000 },
  );

  // Day 2 ends with no execution. On night 3 the new Imp wakes for its own
  // step only.
  await page.locator('[data-act="end-day"]').click();
  await page.waitForFunction(
    async () => (await window.PG_MODULES()).store.state.phase === "night",
    null,
    { timeout: 3000 },
  );
  assert.equal(await wakes(), 0, "the new Imp is not shown the YOU ARE token again");
  assert.equal(await current(), "imp:8", "night 3 opens on the new Imp's own step");
  await overflow();
  await page.screenshot({ path: join(screenshots, "demon-wake-night-3-390.png") });
}

// Issue #200, Goon r2977: "The Goon still changes alignment, and makes the
// player drunk, if the player choosing the Goon was already drunk or poisoned."
// A Pukka poisoned by its own poison chooses the sober Goon on night 3.
async function pukkaChoosesGoonWhileSelfPoisoned() {
  await page.setViewportSize({ width: 390, height: 844 });
  const result = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment: Record<string, string> = {
      1: "pukka",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    };
    const game = model.createGame(8);
    game.scriptId = "bmr";
    game.script = {
      ...game.script,
      id: "bmr",
      name: "Bad Moon Rising",
      edition: "bmr",
      roles: [...rules.BMR_ALL],
    };
    Object.keys(assignment).forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 8;
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = ["exorcist", "innkeeper", "grandmother"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    const toPukka = () => {
      while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "pukka")
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      return engine.currentStep(game)!;
    };
    // Night 1 the Pukka poisons the Chambermaid, night 2 itself.
    for (const targetId of ["3", "1"]) {
      const done = engine.completeStep(game, toPukka().key, { targetIds: [targetId] });
      if (!done.ok) return done;
      while (engine.currentStep(game))
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      const night = engine.endNight(game);
      if (!night.ok) return night;
      const day = engine.endDay(game);
      if (!day.ok) return day;
    }
    toPukka();
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
  await route("/table");
  const read = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const { state } = store;
      const step = state.night.queue.find((entry) => entry.roleId === "pukka");
      return {
        night: state.night.number,
        current: engine.currentStep(state)?.roleId ?? null,
        pukkaImpaired: engine.isImpaired(state, "1"),
        done: step?.done ?? false,
        goonTeam: state.players["2"].team,
        goonDrunk: state.effects.filter((effect) => effect.bmr === "goon").length,
      };
    });
  assert.deepEqual(
    await read(),
    {
      night: 3,
      current: "pukka",
      pukkaImpaired: true,
      done: false,
      goonTeam: "good",
      goonDrunk: 0,
    },
    "night 3 opens on the Pukka's step, the Pukka poisoned by its own poison",
  );

  await page.locator('[data-target][data-id="2"]').click();
  await settled();
  assert.equal(
    await page.locator("[data-preview-reason]").count(),
    0,
    "the preview of the choice names no rejection",
  );
  await page.locator('[data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');
  await overflow();
  await page.screenshot({ path: join(screenshots, "pukka-goon-step-390.png") });
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.equal(await page.locator("[data-rejection]").count(), 0, "the step is not refused");
  assert.deepEqual(
    await read(),
    {
      night: 3,
      current: "professor",
      pukkaImpaired: true,
      done: true,
      goonTeam: "evil",
      goonDrunk: 1,
    },
    "the Pukka is drunk, the Goon turns evil and the night moves on",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "pukka-goon-done-390.png") });
}

// Mayor r2995: "If you die at night, another player might die instead." The
// Storyteller decides, so the table asks and never answers (AGENTS.md): a seat
// tap on the Mayor leaves the redirect unanswered and the step blocked.
async function mayorRedirectIsAsked() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedMayorNight2();
  await route("/table");
  const stepRole = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const step = engine.currentStep(store.state);
      return step && (step.roleId || step.system);
    });
  assert.equal(await stepRole(), "poisoner");
  await page.locator('[data-target][data-id="2"]').click();
  await settled();
  await completeStep();
  await settled();
  assert.equal(await stepRole(), "imp");

  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  assert.equal(
    await page.locator('[data-table-dock] [data-blocker-reason="redirect"]').count(),
    1,
    "the dock asks for the Mayor's fate",
  );
  await page.locator('[data-act="complete"]').click();
  const select = page.locator("select[data-redirect]");
  assert.equal(await select.count(), 1, "a healthy Mayor offers a redirection");
  assert.equal(await select.inputValue(), "", "the seat tap leaves the Mayor's fate unanswered");
  assert.equal(
    await page.locator('[data-act="step-confirm"]').isDisabled(),
    true,
    "the step waits for the host's answer",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "mayor-redirect-asked-390.png") });

  await select.selectOption("none");
  await settled();
  assert.equal(await page.locator('[data-act="step-confirm"]').isDisabled(), false);
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  const after = await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    return { mayorAlive: store.state.players["1"].alive, deaths: store.state.deaths.length };
  });
  assert.deepEqual(after, { mayorAlive: false, deaths: 1 }, "the host let the Mayor die");
}

// Imp r3116: "If the Imp killed themself at night, choose an alive Minion [...]
// Wake the new Imp". The heir is the night's question until the host answers:
// the dock and the table show it at once and offer no control of the step
// that waits behind it.
async function heirQuestionLeadsTheNight() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedImpHeirNight2("fortuneteller");
  await settled();
  await route("/table");
  const current = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const step = engine.currentStep(store.state);
      if (!step) return null;
      return step.system ? step.system : step.roleId + ":" + step.actorId;
    });
  for (const targetId of ["9", "10"]) {
    await page.locator(`[data-target][data-id="${targetId}"]`).click();
    await completeStep();
    await settled();
  }
  assert.equal(
    await current(),
    "fortuneteller:3",
    "the engine's next step is the Fortune Teller's",
  );

  const heirLabel = /Choose the Demon heir|Выберите наследника Демона|Demonun varisini seç/;
  assert.match(await page.locator("[data-dock-step]").innerText(), heirLabel);
  assert.match(await page.locator("[data-hub-step]").innerText(), heirLabel);
  assert.deepEqual(
    await page
      .locator("[data-dock-heir] [data-heir]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id"))),
    ["8", "9"],
    "the dock offers both Minions",
  );
  for (const act of ["complete", "skip", "reset-step", "end-night"]) {
    assert.equal(
      await page.locator(`[data-table-dock] [data-act="${act}"]`).count(),
      0,
      `the dock offers no ${act} while the heir is unnamed`,
    );
  }
  assert.equal(
    await page.locator("[data-target]").count(),
    0,
    "no seat is a target of the Fortune Teller",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "heir-question-dock-390.png") });
  // A seat tap opens the player's correction, as on a step without targets,
  // and chooses no target for the Fortune Teller.
  await page.locator('[data-seat-open="4"]').click();
  await page.waitForSelector('[data-correct="player"]');
  assert.equal(
    await page.locator('[data-correct="player"]').inputValue(),
    "4",
    "the seat tap opens that player's correction",
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-correct="player"]', { state: "detached" });

  await page.locator('[data-dock-heir] [data-heir][data-id="8"]').click();
  await settled();
  assert.equal(await current(), "demonchange", "the named heir is woken next");
  assert.equal(await page.locator("[data-dock-heir]").count(), 0);
  assert.equal(await page.locator('[data-table-dock] [data-act="complete"]').count(), 1);
  const roles = await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    return { heir: store.state.players["8"].roleId, other: store.state.players["9"].roleId };
  });
  assert.deepEqual(roles, { heir: "imp", other: "scarletwoman" });

  // The wake done, the Fortune Teller's step opens with no target chosen.
  await completeStep();
  await settled();
  assert.equal(await current(), "fortuneteller:3");
  assert.equal(
    await page.locator('[data-target][aria-pressed="true"]').count(),
    0,
    "the earlier seat tap chose no target",
  );
}

// Imp r3116: the heir comes first even in a step sheet that was open when
// another window recorded the Imp's self-kill. The sheet adopts the saved game
// and asks only for the heir; it offers no control of the step behind it.
async function heirQuestionLeadsAnOpenSheet() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedImpHeirNight2("fortuneteller");
  await settled();
  await route("/table");
  // The sheet can only open once the step has its targets (issue #311).
  await page.locator('[data-target][data-id="1"]').click();
  await page.locator('[data-target][data-id="2"]').click();
  await page.locator('[data-table-dock] [data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');

  const other = await context.newPage();
  await other.goto(url);
  await other.waitForSelector(".host");
  const recorded = await other.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    const statuses: string[] = [];
    for (const targetId of ["9", "10"]) {
      const step = engine.currentStep(store.state);
      if (!step) return { statuses, pending: false };
      statuses.push(
        store.dispatch({
          type: "completeNightStep",
          payload: { key: step.key, targetIds: [targetId] },
        }).status,
      );
    }
    return { statuses, pending: Boolean(engine.demonChangePending(store.state)) };
  });
  await other.close();
  assert.deepEqual(recorded, { statuses: ["allowed", "allowed"], pending: true });

  // The host's window adopts the other window's save with the sheet open.
  await page.waitForFunction(async () => {
    const { engine, store } = await window.PG_MODULES();
    return Boolean(engine.demonChangePending(store.state));
  });
  await page.waitForSelector('[role="dialog"] [data-heir]');
  assert.deepEqual(
    await page
      .locator('[role="dialog"] [data-heir]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id"))),
    ["8", "9"],
    "the open sheet offers both Minions",
  );
  for (const act of ["step-skip", "step-confirm"]) {
    assert.equal(
      await page.locator(`[data-act="${act}"]`).count(),
      0,
      `the open sheet offers no ${act} while the heir is unnamed`,
    );
  }
  await overflow();
  await page.screenshot({ path: join(screenshots, "heir-question-sheet-390.png") });

  await page.locator('[role="dialog"] [data-heir][data-id="8"]').click();
  await page.waitForFunction(async () => {
    const { store } = await window.PG_MODULES();
    return store.state.players["8"].roleId === "imp";
  });
  // The sheet goes on with the new Imp's wake; close it for the next check.
  await page.waitForSelector('[data-act="step-confirm"]');
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-act="step-confirm"]', { state: "detached" });
}

// Chef r2510, Example 4: beside a Spy the Chef's count is one the Storyteller
// picks among the registrations. It is a registration, not false information.
async function chefRegistrationIsLabelled() {
  await page.setViewportSize({ width: 390, height: 844 });
  const result = await page.evaluate(async () => {
    const { model, engine, store } = await window.PG_MODULES();
    const assignment: Record<string, string> = {
      1: "chef",
      2: "spy",
      3: "imp",
      4: "empath",
      5: "soldier",
    };
    const game = model.createGame(5);
    Object.keys(assignment).forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 5;
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = [];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "chef")
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true, step: engine.currentStep(game)?.roleId };
  });
  assert.deepEqual(result, { ok: true, step: "chef" });
  await settled();
  await route("/table");
  await page.locator('[data-act="complete"]').click();
  const select = page.locator("select[data-given]");
  await select.waitFor();
  // The label is upper-cased by CSS; read its text, not its rendering.
  const label = (
    (await page.locator("label:has(select[data-given]) > .label").textContent()) ?? ""
  ).trim();
  assert.match(
    label,
    /^(Registration|Регистрация|Qeydəalma)$/,
    "the Chef's count is a registration",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "chef-registration-label-390.png") });
  await page.keyboard.press("Escape");
}

async function currentScriptRoleCorrections() {
  for (const { edition, width } of [
    { edition: "bmr", width: 390 },
    { edition: "snv", width: 390 },
    { edition: "bmr", width: 1280 },
    { edition: "snv", width: 1280 },
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await route("/bag");
    const configured = await page.evaluate(async (edition) => {
      const { store, rules } = await window.PG_MODULES();
      const roles =
        edition === "bmr"
          ? ["gambler", "courtier", "fool", "pacifist", "professor", "assassin", "shabaloth"]
          : ["artist", "savant", "seamstress", "dreamer", "oracle", "witch", "vortox"];
      const pool = (edition === "bmr" ? rules.BMR_ALL : rules.SNV_ALL).slice();
      const result = store.dispatch({
        type: "bagUpdate",
        payload: {
          patch: {
            script: { id: edition, name: edition, edition, source: "official", roles: pool },
            count: 7,
            resetRoster: true,
            phase: "setup",
            roles,
            bluffs:
              edition === "bmr"
                ? ["chambermaid", "exorcist", "sailor"]
                : ["clockmaker", "mathematician", "sage"],
            drunkShownId: null,
            lunaticShownId: null,
            evilTwinGoodId: null,
          },
        },
      });
      if (result.status !== "allowed") return result;
      return store.dispatch({
        type: "dealGame",
        payload: {
          options: {
            assignment: Object.fromEntries(roles.map((role, index) => [String(index + 1), role])),
          },
        },
      });
    }, edition);
    assert.equal(configured.status, "allowed", JSON.stringify(configured));
    await route("/table");
    // A service-worker prompt can cover the dock during a long run; this check
    // is about role corrections, so dismiss it the way a host would.
    if (await page.locator("#update-banner").isVisible()) {
      await page
        .waitForFunction(
          () => {
            const banner = document.getElementById("update-banner");
            return !banner || banner.hidden || banner.dataset.state !== "applying";
          },
          { timeout: 7000 },
        )
        .catch(() => {});
      const later = page.locator("#update-later");
      if (await later.isEnabled()) await later.click();
      else
        await page.evaluate(() => {
          const banner = document.getElementById("update-banner");
          if (banner) banner.hidden = true;
        });
    }
    await page.locator('[data-act="roster"]').click();
    await page.locator('[data-roster-player="1"] [data-act="role-card"]').click();
    await page.locator('[data-act="player-correct"]').click();
    await page.locator('[data-correct="kind"]').selectOption("role");
    const expected = await page.evaluate(
      async () => (await window.PG_MODULES()).store.state.script.roles,
    );
    const options = await page
      .locator('[data-correct="role-value"] option')
      .evaluateAll((elements) => elements.map((element) => (element as HTMLOptionElement).value));
    assert.deepEqual(
      options,
      expected,
      `${edition}: correction offers the active script's characters`,
    );
    const corrected = edition === "bmr" ? "chambermaid" : "clockmaker";
    await page.locator('[data-correct="role-value"]').selectOption(corrected);
    await page.locator('[data-correct="reason"]').fill("Correct the recorded character.");
    await overflow();
    await page.screenshot({ path: join(screenshots, `role-correction-${edition}-${width}.png`) });
    await page.locator('[data-act="apply-correction"]').click();
    await page.waitForSelector('[data-correct="kind"]', { state: "detached" });
    await page.reload();
    await page.waitForSelector(".host");
    assert.deepEqual(
      await page.evaluate(async () => {
        const { state } = (await window.PG_MODULES()).store;
        const player = state.players["1"];
        return {
          roleId: player.roleId,
          shownRoleId: player.shownRoleId,
          reason: state.corrections.at(-1)?.reason,
        };
      }),
      { roleId: corrected, shownRoleId: corrected, reason: "Correct the recorded character." },
      `${edition}: the selected correction persists across reload`,
    );
  }
}

async function madnessExecutionFromTable() {
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/bag");
  const seeded = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const game = model.createGame(7);
    game.script = {
      id: "snv",
      name: "Sects & Violets",
      edition: "snv",
      source: "official",
      roles: rules.SNV_ALL.slice(),
    };
    game.scriptId = "snv";
    game.setup.roles = [
      "artist",
      "savant",
      "seamstress",
      "dreamer",
      "oracle",
      "cerenovus",
      "vortox",
    ];
    game.setup.bluffs = ["clockmaker", "mathematician", "sage"];
    const dealt = engine.dealGame(game, {
      assignment: Object.fromEntries(
        game.setup.roles.map((role, index) => [String(index + 1), role]),
      ),
    });
    if (!dealt.ok) return dealt;
    game.order.forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.phase = "seat";
    const started = engine.startNight(game);
    if (!started.ok) return started;
    for (const step of game.night.queue) {
      if (step.roleId === "cerenovus") {
        const completed = engine.completeStep(game, step.key, {
          targetIds: ["2"],
          roleId: "clockmaker",
        });
        if (!completed.ok) return completed;
      } else {
        window.fixtureSkip(engine, game, step.key, "Unrelated wake in the browser fixture");
      }
    }
    const ended = engine.endNight(game);
    if (!ended.ok) return ended;
    return store.replaceState(game);
  });
  assert.equal(seeded.ok, true, JSON.stringify(seeded));
  await route("/table");
  await openTableMenu();
  const review = page.locator('[data-madness-player="2"]');
  await review
    .locator('[data-madness-reason="2"]')
    .fill("The player did not try to convince the group.");
  await review.locator('[data-madness-action="execute"]').click();
  await page.waitForFunction(
    async () => !(await window.PG_MODULES()).store.state.players["2"].alive,
  );
  const execution = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    const command = state.journal.entries.findLast((entry) => entry.type === "madnessPenalty");
    return {
      commandAt: command?.at,
      deathAt: state.deaths.findLast((death) => death.playerId === "2")?.at,
      executionAt: state.day.execution?.at,
      executedPlayer: state.day.execution?.playerId,
    };
  });
  assert.equal(execution.executedPlayer, "2", "the host's madness decision executes its target");
  assert.ok(execution.commandAt);
  assert.equal(execution.deathAt, execution.commandAt, "madness death uses the command timestamp");
  assert.equal(
    execution.executionAt,
    execution.commandAt,
    "madness execution uses the command timestamp",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "madness-execution-390.png") });
  await page.keyboard.press("Escape");
}

// Tinker r1782: "At any time, you may decide that the Tinker dies." States
// r1039: "A drunk or poisoned player has no ability." On a drunk Tinker's step
// the table refuses the death the host marks, keeps the step open and the
// Tinker alive; the Tinker who survives completes it. A sober Tinker still
// dies there.
async function tinkerNightDeathNeedsTheAbility() {
  await page.setViewportSize({ width: 390, height: 844 });
  const seed = (drunk: boolean) =>
    page.evaluate(async (drunk) => {
      const { model, engine, store, rules } = await window.PG_MODULES();
      const assignment: Record<string, string> = {
        1: "tinker",
        2: "courtier",
        3: "chambermaid",
        4: "gossip",
        5: "sailor",
        6: "exorcist",
        7: "assassin",
        8: "po",
      };
      const game = model.createGame(8);
      game.scriptId = "bmr";
      game.script = {
        ...game.script,
        id: "bmr",
        name: "Bad Moon Rising",
        edition: "bmr",
        roles: [...rules.BMR_ALL],
      };
      Object.keys(assignment).forEach((id) => {
        game.players[id].name = "Player " + id;
        game.players[id].claimed = true;
      });
      game.setup.count = 8;
      game.setup.roles = Object.values(assignment);
      game.setup.bluffs = ["innkeeper", "grandmother", "minstrel"];
      const dealt = engine.dealGame(game, { assignment });
      if (!dealt.ok) return dealt;
      game.phase = "seat";
      const start = engine.startNight(game);
      if (!start.ok) return start;
      while (engine.currentStep(game))
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      const night = engine.endNight(game);
      if (!night.ok) return night;
      const day = engine.endDay(game);
      if (!day.ok) return day;
      // Night 2: the Courtier makes the Tinker drunk, or skips.
      while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "tinker") {
        const step = engine.currentStep(game)!;
        if (drunk && step.roleId === "courtier") {
          const done = engine.completeStep(game, step.key, { roleId: "tinker" });
          if (!done.ok) return done;
        } else window.fixtureSkip(engine, game, step.key, "browser check");
      }
      const errors = model.validateState(game);
      if (errors.length) return { ok: false, errors };
      store.replaceState(game);
      dispatchEvent(new PopStateEvent("popstate"));
      return { ok: true };
    }, drunk);
  const read = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const { state } = store;
      const step = state.night.queue.find((entry) => entry.roleId === "tinker");
      return {
        night: state.night.number,
        current: engine.currentStep(state)?.roleId ?? null,
        tinkerDrunk: engine.isImpaired(state, "1"),
        tinkerAlive: state.players["1"].alive,
        done: step?.done ?? false,
        deaths: state.deaths.map((death) => death.playerId),
      };
    });
  const previewOf = (deathIds: string[]) =>
    page.evaluate(async (deathIds) => {
      const { engine, store } = await window.PG_MODULES();
      const step = store.state.night.queue.find((entry) => entry.roleId === "tinker")!;
      const preview = engine.previewCommand(store.state, {
        id: "browser-check-tinker",
        type: "completeNightStep",
        payload: { key: step.key, deathIds },
      });
      return {
        status: preview.status,
        errorCode: "errorCode" in preview ? (preview.errorCode ?? null) : null,
      };
    }, deathIds);
  const dialog = page.locator('[role="dialog"]');

  const drunk = await seed(true);
  assert.equal(drunk.ok, true, JSON.stringify(drunk));
  await settled();
  await route("/table");
  assert.deepEqual(
    await read(),
    { night: 2, current: "tinker", tinkerDrunk: true, tinkerAlive: true, done: false, deaths: [] },
    "night 2 opens on the Tinker's step, the Tinker drunk",
  );
  await page.locator('[data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');
  await dialog.locator('[data-tinker-decision="die"]').click();
  await settled();
  assert.deepEqual(await previewOf(["1"]), { status: "rejected", errorCode: "error.59" });
  await overflow();
  await page.screenshot({ path: join(screenshots, "tinker-drunk-dies-390.png") });
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  await page.screenshot({ path: join(screenshots, "tinker-drunk-refused-390.png") });
  assert.equal(await page.locator("[data-rejection]").count(), 1, "the death is refused");
  assert.equal(await dialog.count(), 1, "the step sheet stays open");
  assert.deepEqual(
    await read(),
    { night: 2, current: "tinker", tinkerDrunk: true, tinkerAlive: true, done: false, deaths: [] },
    "the drunk Tinker lives and the step stays open",
  );
  await dialog.locator('[data-tinker-decision="live"]').click();
  await settled();
  assert.deepEqual(await previewOf([]), { status: "allowed", errorCode: null });
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.equal(await page.locator("[data-rejection]").count(), 0, "the refusal clears");
  assert.deepEqual(
    await read(),
    {
      night: 2,
      current: "chambermaid",
      tinkerDrunk: true,
      tinkerAlive: true,
      done: true,
      deaths: [],
    },
    "the Tinker who survives completes the step",
  );

  const sober = await seed(false);
  assert.equal(sober.ok, true, JSON.stringify(sober));
  await settled();
  await route("/table");
  assert.equal((await read()).tinkerDrunk, false);
  await page.locator('[data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');
  await dialog.locator('[data-tinker-decision="die"]').click();
  await settled();
  assert.deepEqual(await previewOf(["1"]), { status: "allowed", errorCode: null });
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.equal(await page.locator("[data-rejection]").count(), 0);
  assert.deepEqual(
    await read(),
    {
      night: 2,
      current: "chambermaid",
      tinkerDrunk: false,
      tinkerAlive: false,
      done: true,
      deaths: ["1"],
    },
    "a sober Tinker dies on the step",
  );
  await overflow();
  await page.screenshot({ path: join(screenshots, "tinker-sober-dies-390.png") });
}

// Professor r1775 and Shabaloth r1790 are the Bad Moon Rising abilities that
// bring a player back. On night 2 the Po kills the Gossip and the Assassin the
// Chambermaid: the Professor's step offers the resurrection and brings the
// Gossip back; the Tinker's step offers none, and the engine refuses one sent
// there.
async function nightResurrectionNeedsTheAbility() {
  await page.setViewportSize({ width: 390, height: 844 });
  const result = await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment: Record<string, string> = {
      1: "tinker",
      2: "professor",
      3: "chambermaid",
      4: "gossip",
      5: "sailor",
      6: "exorcist",
      7: "assassin",
      8: "po",
    };
    const game = model.createGame(8);
    game.scriptId = "bmr";
    game.script = {
      ...game.script,
      id: "bmr",
      name: "Bad Moon Rising",
      edition: "bmr",
      roles: [...rules.BMR_ALL],
    };
    Object.keys(assignment).forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.setup.count = 8;
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = ["innkeeper", "grandmother", "minstrel"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) return start;
    while (engine.currentStep(game))
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    const night = engine.endNight(game);
    if (!night.ok) return night;
    const day = engine.endDay(game);
    if (!day.ok) return day;
    // Night 2: the Po kills the Gossip, the Assassin the Chambermaid.
    const kills: Record<string, string> = { po: "4", assassin: "3" };
    let sent = 0;
    while (engine.currentStep(game) && engine.currentStep(game)!.roleId !== "professor") {
      const step = engine.currentStep(game)!;
      const victim = kills[String(step.roleId)];
      if (victim) {
        const done = engine.applyCommand(game, {
          id: "browser-check-kill-" + ++sent,
          type: "completeNightStep",
          payload: { key: step.key, targetIds: [victim], deathIds: [victim] },
        });
        if (done.status !== "allowed") return { ok: false, done };
      } else window.fixtureSkip(engine, game, step.key, "browser check");
    }
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  await settled();
  await route("/table");
  const read = () =>
    page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      const { state } = store;
      return {
        night: state.night.number,
        current: engine.currentStep(state)?.roleId ?? null,
        alive: state.order.filter((id) => state.players[id].alive),
      };
    });
  const previewOnTinker = (resurrectId: string) =>
    page.evaluate(async (resurrectId) => {
      const { engine, store } = await window.PG_MODULES();
      const step = store.state.night.queue.find((entry) => entry.roleId === "tinker")!;
      const preview = engine.previewCommand(store.state, {
        id: "browser-check-resurrect",
        type: "completeNightStep",
        payload: { key: step.key, resurrectId },
      });
      return {
        status: preview.status,
        errorCode: "errorCode" in preview ? (preview.errorCode ?? null) : null,
      };
    }, resurrectId);
  const dialog = page.locator('[role="dialog"]');

  assert.deepEqual(
    await read(),
    { night: 2, current: "professor", alive: ["1", "2", "5", "6", "7", "8"] },
    "night 2 reaches the Professor with the Gossip and the Chambermaid dead",
  );
  await page.locator('[data-target][data-id="4"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');
  const professorPick = dialog.locator("select[data-bmr-resurrect]");
  assert.equal(await professorPick.count(), 1, "the Professor's step offers the resurrection");
  await professorPick.selectOption("4");
  await settled();
  await overflow();
  await page.screenshot({ path: join(screenshots, "resurrection-professor-390.png") });
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.equal(await page.locator("[data-rejection]").count(), 0, "the Professor is not refused");
  assert.deepEqual(
    await read(),
    { night: 2, current: "tinker", alive: ["1", "2", "4", "5", "6", "7", "8"] },
    "the Professor brings the Gossip back and the night moves to the Tinker",
  );

  await page.locator('[data-act="complete"]').click();
  await page.waitForSelector('[data-act="step-confirm"]');
  assert.equal(
    await dialog.locator("select[data-bmr-resurrect]").count(),
    0,
    "the Tinker's step offers no resurrection while the Chambermaid is dead",
  );
  assert.deepEqual(await previewOnTinker("3"), { status: "rejected", errorCode: "error.51" });
  await overflow();
  await page.screenshot({ path: join(screenshots, "resurrection-tinker-390.png") });
  await dialog.locator('[data-tinker-decision="live"]').click();
  await settled();
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  assert.equal(await page.locator("[data-rejection]").count(), 0);
  const after = await read();
  assert.deepEqual(after.alive, ["1", "2", "4", "5", "6", "7", "8"], "the Chambermaid stays dead");
  assert.notEqual(after.current, "tinker", "the Tinker's step is done");
}

// A revealed role card carries no countdown and no cancel control: it stays
// until the name is saved, and only Escape or a hidden page dismisses it.
async function playerCardHasNoCountdown() {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(7, "deal");
  await page.clock.install();
  await route("/player");
  await page.locator('[data-seat="0"]').click();
  await page.waitForSelector(".player-card");
  await page.clock.fastForward(120000);
  assert.equal(
    await page.locator(".player-card").count(),
    1,
    "the revealed card stays open without a countdown",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".player-card").count(), 0, "Escape closes the card");
  await page.clock.resume();
}

async function fullChecks() {
  phaseStarted = Date.now();
  await page.goto(url);
  await page.waitForSelector(".host");
  assert.equal(
    await page.locator("#update-banner").isVisible(),
    false,
    "first install must not show an update prompt",
  );

  // Identity: the shell, the manifest and every header name Grimoria.
  assert.equal(await page.title(), "Grimoria", "document title");
  const identityManifestUrl = new URL("manifest.webmanifest", url).href;
  const identityManifest = await page.evaluate(async (href) => {
    const response = await fetch(href);
    return { ok: response.ok, body: (await response.json()) as ManifestBody };
  }, identityManifestUrl);
  assert.equal(identityManifest.ok, true, "manifest loads");
  assert.equal(identityManifest.body.name, "Grimoria", "manifest name");
  assert.equal(identityManifest.body.short_name, "Grimoria", "manifest short name");
  // Chrome installs the app only with a raster icon at each required size.
  for (const size of [192, 512]) {
    const icon = (identityManifest.body.icons ?? []).find((entry) =>
      String(entry.sizes ?? "")
        .split(/\s+/)
        .includes(`${size}x${size}`),
    );
    assert.ok(icon, `manifest declares a ${size}x${size} icon`);
    assert.equal(icon.type, "image/png", `${size}x${size} icon is a PNG`);
    const iconResponse = await page.evaluate(async (href) => {
      const response = await fetch(href);
      return { status: response.status, type: response.headers.get("content-type") ?? "" };
    }, new URL(icon.src, identityManifestUrl).href);
    assert.equal(iconResponse.status, 200, `${size}x${size} icon resolves`);
    assert.match(iconResponse.type, /^image\/png/, `${size}x${size} icon is served as PNG`);
  }
  assert.equal(
    (await page.locator(".setup-brand").innerText()).includes("PG"),
    false,
    "table header has no PG mark",
  );
  assert.equal(
    await page
      .locator(".setup-brand img.brand-mark")
      .evaluate(
        (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      ),
    true,
    "table header mark loads",
  );
  {
    const identity = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const tab = await identity.newPage();
    for (const [path, header, image] of [
      ["bag", ".setup-brand", ".setup-brand img.brand-mark"],
      ["sheet/ru", ".setup-brand", ".setup-brand img.brand-mark"],
      ["help", ".setup-brand", ".setup-brand img.brand-mark"],
    ]) {
      await tab.goto(url + path);
      await tab.waitForSelector(header);
      assert.equal(
        (await tab.locator(header).innerText()).includes("PG"),
        false,
        `${path} has no PG mark`,
      );
      assert.equal(
        await tab.locator(header).getAttribute("aria-label"),
        "Grimoria",
        `${path} brand name`,
      );
      assert.equal(
        await tab
          .locator(image)
          .evaluate(
            (img) =>
              (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
          ),
        true,
        `${path} brand image loads`,
      );
    }
    await identity.close();
  }

  phase("load and identity");

  // Pages-like fallback matrix: a real 404 for a nested route, exactly one
  // redirect, the route restored; the same cases at the root base.
  const matrix = async (target: string, cases: { final?: string; path: string }[]) => {
    for (const testCase of cases) {
      const cold = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const tab = await cold.newPage();
      const fallbacks = [];
      tab.on("response", (response) => {
        if (response.status() === 404 && response.request().resourceType() === "document")
          fallbacks.push(response.url());
      });
      await tab.goto(target + testCase.path);
      await tab.waitForSelector("#screen > *", { timeout: 15000 });
      assert.equal(
        fallbacks.length,
        1,
        `${testCase.path} produced ${fallbacks.length} fallback responses`,
      );
      assert.equal(tab.url().startsWith(target), true, `${testCase.path} stayed inside the base`);
      if (testCase.final) assert.equal(tab.url(), target + testCase.final, testCase.path);
      await cold.close();
    }
  };
  await matrix(url, [
    { path: "table" },
    { path: "table/", final: "table" },
    { path: "table?x=1", final: "table?x=1" },
    { path: "sheet/ru" },
    { path: "sheet/en" },
    { path: "sheet/az" },
    { path: "unknown-route" },
  ]);

  // A path outside the project base is not stored and never bounces elsewhere.
  {
    const cold = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const tab = await cold.newPage();
    await tab.goto(new URL("/outside", url).href);
    await tab.waitForSelector("#screen > *", { timeout: 15000 });
    assert.equal(tab.url(), url + "table");
    await cold.close();
  }

  const rootServer = createDistServer({ root: distRoot, prefix: "/" });
  await new Promise<void>((done) =>
    rootServer.listen(0, "127.0.0.1", () => {
      done();
    }),
  );
  const rootUrl = `http://127.0.0.1:${(rootServer.address() as AddressInfo).port}/`;
  try {
    await matrix(rootUrl, [
      { path: "table" },
      { path: "table/", final: "table" },
      { path: "table?x=1", final: "table?x=1" },
      { path: "sheet/ru" },
      { path: "unknown-route" },
    ]);
  } finally {
    await new Promise((done) => rootServer.close(done));
  }
  phase("fallback matrix");

  await chooseLanguage("en");
  await seed(7);

  // The demo keeps its own game and never reads or writes the saved one.
  const savedBeforeDemo = await page.evaluate(() => localStorage.getItem("pg.game.v4"));
  await route("/demo");
  await page.waitForSelector("#screen > *");
  await settled();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("pg.game.v4")),
    savedBeforeDemo,
    "the demo must not touch the saved game",
  );
  await route("/table");

  phase("demo isolation");

  await overflow();
  assert.equal(await page.locator("[data-table-stage]").isVisible(), true);
  assert.equal(await page.locator(".host-seats").count(), 0, "the ring replaces the seat rail");
  const ringBox = await page.locator("[data-game-table]").last().boundingBox();
  const dockBox = await page.locator("[data-table-dock]").boundingBox();
  assert.ok(
    ringBox && dockBox && ringBox.y < dockBox.y,
    "the table renders above the dock on a phone",
  );
  await page.screenshot({ path: join(screenshots, "phone-night.png"), fullPage: true });

  // ---- Velvet table window (issue #164) -----------------------------------
  // One host table: a scrollable stage, a fixed dock, fifteen visible names,
  // text state badges, the threshold, the dawn report and the player card.
  const cornerRadius = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius));
  const tableWindow = async (
    width: number,
    height: number,
    { scrolls = false }: { scrolls?: boolean } = {},
  ) => {
    await page.setViewportSize({ width, height });
    await route("/table");
    await page.waitForSelector("[data-table-dock]");
    const names = await page
      .locator("[data-seat-name]")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
    assert.equal(names.length, 15, `${width}px: fifteen seats render a name`);
    assert.equal(
      names.filter((name) => name.length > 0).length,
      15,
      `${width}px: every seat name has text`,
    );
    assert.equal(
      await page.locator("[data-seat-name]:visible").count(),
      15,
      `${width}px: all fifteen names are visible on the table`,
    );
    const dock = await page.locator("[data-table-dock]").boundingBox();
    assert.ok(dock, `${width}px: the action dock renders`);
    assert.ok(
      Math.abs(dock.y + dock.height - height) <= 2,
      `${width}px: the dock stays at the viewport bottom (${dock?.y}+${dock?.height})`,
    );
    const stage = await page.locator("[data-table-stage]").evaluate((element) => ({
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      top: element.getBoundingClientRect().top,
      bottom: element.getBoundingClientRect().bottom,
    }));
    assert.equal(stage.overflowY, "auto", `${width}px: the table stage owns the scroll`);
    assert.ok(
      stage.top >= 0 && stage.bottom <= dock.y + 1,
      `${width}px: the stage sits between the bar and the dock`,
    );
    if (scrolls) {
      assert.ok(
        stage.scrollHeight > stage.clientHeight,
        `${width}px: a short viewport scrolls the table inside the stage`,
      );
    } else {
      const underDock = await page
        .locator("[data-seat-name]")
        .evaluateAll(
          (nodes, dockTop) =>
            nodes.filter((node) => node.getBoundingClientRect().bottom > dockTop + 1).length,
          dock.y,
        );
      assert.equal(underDock, 0, `${width}px: no seat name sits under the dock`);
    }
    await overflow();
    const seats = await page.locator("[data-seat-open]").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
    assert.equal(seats.length, 15, `${width}px: every seat is a control`);
    assert.deepEqual(
      seats.filter((seat) => seat.width < 44 || seat.height < 44),
      [],
      `${width}px: every seat keeps a 44x44 target`,
    );
    assert.deepEqual(
      seats.filter((seat, index) =>
        seats.some(
          (other, otherIndex) =>
            otherIndex > index &&
            Math.abs(seat.x - other.x) < (seat.width + other.width) / 2 &&
            Math.abs(seat.y - other.y) < (seat.height + other.height) / 2,
        ),
      ),
      [],
      `${width}px: no two seat medallions overlap`,
    );
    const tableBox = await page.locator("[data-game-table]").boundingBox();
    assert.ok(tableBox, `${width}px: the table box renders`);
    const lowest = seats.reduce((low, seat) => (seat.y > low.y ? seat : low));
    assert.ok(
      Math.abs(lowest.x + lowest.width / 2 - (tableBox.x + tableBox.width / 2)) > 8,
      `${width}px: no seat owns the bottom centre`,
    );
    assert.equal(await page.locator("[data-table-rail]").count(), 1, `${width}px: one rail`);
    const felt = await page.locator("[data-table-felt]").evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return { image: style.backgroundImage, shadow: style.boxShadow };
      }),
    );
    assert.equal(felt.length, 1, `${width}px: the table renders one felt surface`);
    assert.match(felt[0]!.image, /radial-gradient/, `${width}px: the felt is one soft gradient`);
    assert.notEqual(felt[0]!.shadow, "none", `${width}px: the felt carries its centre glow`);
    assert.ok(
      (await cornerRadius('[data-act="roster"]')) <= 4,
      `${width}px: the dock icon control is squared, not a pill`,
    );
    assert.match(
      await page.locator("[data-dock-phase]").innerText(),
      /Night 1|Ночь 1|Gecə 1/i,
      `${width}px: the dock shows the phase and the night`,
    );
    assert.ok(
      (await page.locator("[data-dock-step]").innerText()).trim().length > 0,
      `${width}px: the dock names the current step or the next action`,
    );
  };

  await seed(15);
  for (const [width, height, scrolls] of [
    [1440, 900, false],
    [390, 844, false],
    [360, 640, true],
  ] as [number, number, boolean][]) {
    await tableWindow(width, height, { scrolls });
  }

  // Desktop: the table fits the viewport above the dock, without scrolling.
  await page.setViewportSize({ width: 1440, height: 900 });
  await route("/table");
  {
    const table = await page.locator("[data-game-table]").last().boundingBox();
    const dockBox = await page.locator("[data-table-dock]").boundingBox();
    assert.ok(table && dockBox, "the table and the dock render");
    assert.ok(table.y >= 0, "the table starts inside the viewport");
    assert.ok(table.y + table.height <= dockBox.y + 1, "the table fits above the dock");
  }

  // State badges are text, and the acting seat keeps its outline.
  await page.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    store.run((game) => {
      let step = engine.currentStep(game);
      while (step && !step.actorId) {
        window.fixtureSkip(engine, game, step.key, "browser check");
        step = engine.currentStep(game);
      }
      return { ok: true };
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/table");
  assert.equal(
    await page.locator('[data-seat-badge="acting"]').count(),
    1,
    "the acting seat shows one acting text badge",
  );
  assert.match(
    await page.locator('[data-seat-badge="acting"]').innerText(),
    /Acting|Действует|Fəaliyyətdə/i,
    "the acting badge is text, not colour alone",
  );
  const actorOutline = await page.locator('[data-seat-badge="acting"]').evaluate((badge) => {
    const seat = badge.closest("[data-seat-open]");
    return seat && seat.firstElementChild ? getComputedStyle(seat.firstElementChild).boxShadow : "";
  });
  assert.ok(actorOutline && actorOutline !== "none", "the acting seat also keeps an outline");
  assert.ok(
    (await cornerRadius("[data-seat-badge]")) <= 4,
    "state badges use the table radius, not a pill",
  );
  assert.equal(
    await page.evaluate(() => {
      const badge = document.querySelector('[data-seat-badge="acting"]');
      const seat = badge?.closest("[data-seat-open]");
      return seat ? getComputedStyle(seat).animationName : "";
    }),
    "none",
    "the acting highlight is static, never a looping animation",
  );

  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    store.run((game) => {
      game.players["3"].alive = false;
      game.players["3"].voteToken = true;
      game.players["4"].alive = false;
      game.players["4"].voteToken = false;
      game.effects.push({
        id: "browser-poison",
        kind: "poison",
        sourceId: "12",
        targetId: "5",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      });
      game.effects.push({
        id: "browser-protection",
        kind: "protected",
        sourceId: "8",
        targetId: "6",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      });
      return { ok: true };
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/table");
  assert.equal(await page.locator('[data-seat-badge="dead"]').count(), 2, "dead seats say so");
  assert.equal(
    await page.locator('[data-seat-badge="ghost-vote"]').count(),
    1,
    "a dead seat with an unspent ghost vote says so",
  );
  assert.equal(
    await page.locator('[data-seat-badge="no-ghost-vote"]').count(),
    1,
    "a dead seat with a spent ghost vote says so",
  );
  assert.equal(
    await page.locator('[data-seat-badge="poison"]').count(),
    1,
    "a poisoned seat says so",
  );
  assert.equal(
    await page.locator('[data-seat-badge="protection"]').count(),
    1,
    "a protected seat says so",
  );

  // Night information card: full screen, focus in, Escape out, no command.
  const seedPoisonedFortuneTeller = async () => {
    const result = await page.evaluate(async () => {
      const { model, engine, store } = await window.PG_MODULES();
      const assignment = {
        1: "fortuneteller",
        2: "chef",
        3: "empath",
        4: "poisoner",
        5: "imp",
      };
      const game = model.createGame(5);
      Object.entries(assignment).forEach(([id]) => {
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
      const poisoner = game.night.queue.find((step) => step.roleId === "poisoner");
      engine.completeStep(game, poisoner!.key, { targetIds: ["1"] });
      while (engine.currentStep(game)!.roleId !== "fortuneteller") {
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      }
      const current = engine.currentStep(game);
      if (!current || current.roleId !== "fortuneteller")
        return {
          ok: false,
          errors: [{ code: "step", message: String(current && current.roleId) }],
        };
      const errors = model.validateState(game);
      if (errors.length) return { ok: false, errors };
      store.replaceState(game);
      dispatchEvent(new PopStateEvent("popstate"));
      return { ok: true };
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    await settled();
  };

  await seedPoisonedFortuneTeller();
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  await page.locator('[data-target][data-id="1"]').click();
  await page.locator('[data-target][data-id="2"]').click();
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator('[data-act="show-info"]').count(),
    0,
    "a poisoned actor is never offered the true information card",
  );
  await page.locator("[data-info-template]").fill("1 · Yes · Player 2");
  await page.locator('[data-act="show-template"]').click();
  {
    const card = page.locator("[data-player-card]");
    await card.waitFor();
    assert.equal(await page.locator(".host").isVisible(), false, "the console is hidden");
    assert.equal(await page.locator("[data-table-dock]").isVisible(), false, "the dock is hidden");
    assert.equal(
      await page.locator("[data-table-stage]").isVisible(),
      false,
      "the table is hidden",
    );
    assert.equal(await page.locator("[data-notes]").count(), 0, "host notes are not in the card");
    assert.match(
      await page.locator("[data-player-card-text]").innerText(),
      /1 · Yes · Player 2/,
      "the template text is the only information shown",
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("[data-player-card]")?.contains(document.activeElement) ?? false,
      ),
      true,
      "focus moves into the card",
    );
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached" });
    await page.waitForFunction(() => document.activeElement?.closest("#screen") !== null, {
      timeout: 2000,
    });
    assert.equal(await page.locator(".host").isVisible(), true, "closing returns to the console");
  }
  await page.keyboard.press("Escape");

  // The role card from the player list: a Drunk shows the believed role.
  await seed(12);
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  await page.locator('[data-act="roster"]').click();
  await page.waitForSelector("[data-roster]");
  assert.equal(
    await page.locator("[data-roster-player]").count(),
    12,
    "the player list carries every seat",
  );
  assert.equal(
    await page.locator('[data-roster-player="8"] [data-seat-number]').innerText(),
    "8",
    "the player list keeps the seat number",
  );
  await page.locator('[data-roster-player="8"] [data-act="role-card"]').click();
  await page.locator('[data-act="player-card"]').click();
  {
    const believed = await page.evaluate(
      () => window.PG?.roles?.find((role) => role.id === "washerwoman")?.name ?? "Washerwoman",
    );
    const drunk = await page.evaluate(
      () => window.PG?.roles?.find((role) => role.id === "drunk")?.name ?? "Drunk",
    );
    const card = page.locator("[data-player-card]");
    await card.waitFor();
    assert.match(
      await page.locator("[data-player-card-role]").innerText(),
      new RegExp(believed),
      "the Drunk's card shows the believed role",
    );
    assert.equal(
      (await card.innerText()).includes(drunk),
      false,
      "the Drunk's card never names the Drunk role",
    );
    assert.equal(await page.locator("[data-table-dock]").isVisible(), false, "the dock is hidden");
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached" });
  }

  // The day hub: threshold, nomination, votes and the execution result.
  await seed(15);
  await page.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    store.run((game) => {
      while (engine.currentStep(game)) {
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      }
      engine.endNight(game);
      return { ok: true };
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await route("/table");
  assert.match(
    await page.locator("[data-hub-threshold]").innerText(),
    /8/,
    "the hub shows the threshold for fifteen living players",
  );
  assert.match(
    await page.locator("[data-dawn]").innerText(),
    /nobody died|никто не погиб|heç kim ölmədi/i,
    "a night without deaths reports that nobody died",
  );
  await page.locator('[data-act="dawn-dismiss"]').click();
  assert.equal(await page.locator("[data-dawn]").count(), 0, "the dawn report is dismissible");
  assert.match(
    await page.locator("[data-nomination-none]").innerText(),
    /Номинации нет|No nomination is open|Namizədlik yoxdur/,
  );
  assert.equal(
    await page.locator('[data-act="open-nomination"]').count(),
    0,
    "the console does not open nominations",
  );
  assert.equal(
    await page.locator('[data-act="open-votes"]').count(),
    0,
    "the console does not record votes",
  );
  assert.equal(await page.locator('[data-act="day-help"]').count(), 1);
  assert.equal(await page.locator('[data-act="end-day"]').count(), 1);
  for (const act of ["execute", "end-day", "day-help"]) {
    assert.ok(
      (await cornerRadius(`[data-act="${act}"]`)) <= 4,
      `the ${act} action uses the table radius, not a pill`,
    );
  }
  assert.equal(
    await page.locator('[data-act="execute"]').isDisabled(),
    true,
    "execute waits for a selected player",
  );
  await page.locator('[data-seat-open="2"]').click();
  await page.waitForSelector("[data-player-sheet]");
  await page.locator('[data-act="player-execute"]').click();
  assert.equal(
    await page.locator('[data-act="execute"]').isEnabled(),
    true,
    "the host records the execution without entering votes",
  );
  await executeNow();
  await page.waitForSelector("[data-executed]");
  assert.match(
    await page.locator("[data-executed]").innerText(),
    /Player 2/,
    "the centre shows the executed player",
  );
  assert.match(
    await page.locator("[data-executed]").innerText(),
    /Librarian|Библиотекарь|Kitabxanaçı/,
    "the centre shows the executed role",
  );
  await page.locator('[data-act="end-day"]').click();
  await finishNight();
  assert.match(
    await page.locator("[data-dawn]").innerText(),
    /nobody died|никто не погиб|heç kim ölmədi/i,
    "the next day opens a fresh dawn report",
  );

  // A night with a death names the dead player and role and counts survivors.
  await seed(15);
  await page.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    store.run((game) => {
      while (engine.currentStep(game)) {
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      }
      engine.kill(game, "5", "demon");
      engine.endNight(game);
      return { ok: true };
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/table");
  assert.equal(await page.locator("[data-dawn-death]").count(), 1, "one death is reported");
  assert.match(
    await page.locator("[data-dawn-death]").innerText(),
    /Player 5/,
    "the dawn report names the dead player",
  );
  assert.match(
    await page.locator("[data-dawn-death]").innerText(),
    /Empath|Эмпат/,
    "the dawn report names the dead role",
  );
  assert.match(
    await page.locator("[data-dawn-survivors]").innerText(),
    /14/,
    "the dawn report counts the survivors",
  );
  await page.locator('[data-act="dawn-dismiss"]').click();
  assert.equal(
    await page.locator("[data-hub-phase]").isVisible(),
    true,
    "dismissing returns to the nomination view",
  );

  // The hub hero: a saved nomination puts the tally at the centre.
  await seed(15);
  await page.evaluate(async () => {
    const { engine, store } = await window.PG_MODULES();
    store.run((game) => {
      while (engine.currentStep(game)) {
        window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
      }
      engine.endNight(game);
      game.day.nominations.push({
        id: "browser-nomination",
        nominatorId: "1",
        nomineeId: "2",
        at: new Date(0).toISOString(),
        votes: ["1", "2", "3", "4", "5"],
        count: 5,
        threshold: 8,
        recorded: true,
      });
      game.day.activeNominationId = "browser-nomination";
      return { ok: true };
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  {
    const tally = page.locator("[data-nomination-tally]");
    assert.match(await tally.innerText(), /5\s*\/\s*8/, "the hub shows the tally as 5 / 8");
    assert.equal(
      await page.locator('[data-nomination-dot="filled"]').count(),
      5,
      "five threshold dots are filled",
    );
    assert.equal(
      await page.locator("[data-nomination-dot]").count(),
      8,
      "the threshold dot row matches the threshold",
    );
    const heroSize = await tally.evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).fontSize),
    );
    const labelSize = await page
      .locator("[data-hub-threshold]")
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    assert.ok(heroSize > labelSize * 1.5, "the tally is the hub's largest numeral");
  }

  // The setup board: the roster and the step rail replace the old single card.
  await seed(8, "deal");
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    store.run((game) => {
      for (const id of ["1", "2", "3"]) game.players[id].claimed = true;
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await route("/table");
  {
    const board = page.locator("[data-setup-board]");
    assert.equal(await board.count(), 1, "the setup phase renders the setup board");
    const seats = await page
      .locator("[data-board-seat]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-board-seat")));
    assert.deepEqual(
      seats,
      ["1", "2", "3", "4", "5", "6", "7", "8"],
      "the board lists every seat in the saved order",
    );
    assert.equal(
      await page.locator('[data-board-claim="claimed"]').count(),
      3,
      "three claimed seats render as claimed",
    );
    assert.equal(
      await page.locator('[data-board-claim="unclaimed"]').count(),
      5,
      "five seats still read as unclaimed",
    );
    assert.match(
      await page.locator("[data-board-count]").innerText(),
      /3\s*\/\s*8/,
      "the board counts three claimed names out of eight",
    );
    assert.equal(await page.locator("[data-board-step]").count(), 4, "the rail names four steps");
    assert.equal(
      await page.locator('[data-board-step][aria-current="step"]').count(),
      1,
      "exactly one step is current",
    );
    assert.equal(
      await page.locator('[data-board-step][data-state="done"]').count(),
      1,
      "the roles step is done",
    );
    assert.equal(
      await page.locator('[data-board-step][data-state="pending"]').count(),
      2,
      "the seats and secrets steps are pending",
    );
    assert.equal(
      await page.locator("[data-board-primary]").getAttribute("href"),
      "/pocket/player",
      "the names step passes the device to the player route",
    );
    assert.equal(await board.locator("img").count(), 0, "the board shows no role artwork");
    assert.equal(await board.locator("[data-role]").count(), 0, "the board shows no role hook");
    const boardText = await board.innerText();
    for (const id of ["chef", "empath", "fortuneteller", "undertaker", "virgin", "poisoner", "imp"])
      assert.doesNotMatch(boardText, new RegExp("\\b" + id + "\\b", "i"), `no ${id} role text`);

    await page.setViewportSize({ width: 390, height: 844 });
    await overflow();
    const heights = await page
      .locator("[data-board-primary], [data-board-link]")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({ text: node.textContent?.trim(), height: node.clientHeight })),
      );
    assert.deepEqual(
      heights.filter((entry) => entry.height < 44),
      [],
      "every board control is at least 44 px tall: " + JSON.stringify(heights),
    );
  }

  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    store.run((game) => {
      for (const id of game.order) game.players[id].claimed = true;
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await route("/table");
  assert.equal(
    await page.locator("[data-board-primary]").getAttribute("href"),
    "/pocket/seat",
    "claiming every name moves the primary to the seat route",
  );
  assert.equal(
    await page.locator('[data-board-step][data-state="current"]').getAttribute("data-board-step"),
    "seats",
    "the seats step is current once every name is claimed",
  );

  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    store.run((game) => {
      game.phase = "seat";
    });
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/table");
  {
    const start = page.locator('[data-board-primary][data-act="start-night"]');
    assert.equal(await start.count(), 1, "the secrets step's primary starts the first night");
    assert.equal(await start.isDisabled(), false, "a clean secrets list enables the first night");
    assert.equal(
      await page.locator('[data-board-link][href="/pocket/secrets"]').count(),
      1,
      "the secrets route stays reachable beside the primary",
    );
  }

  await seed(7);
  await route("/table");
  phase("table surface");

  // The dock action must never open a sheet that cannot confirm. A targeting
  // step with no target names the missing input and stays disabled until the
  // host picks a seat; the sheet appears only then.
  {
    await page.evaluate(async () => {
      const { engine, store } = await window.PG_MODULES();
      let step = engine.currentStep(store.state);
      while (step && step.targetMode === "none") {
        const applied = store.dispatch({ type: "skipStep", payload: { key: step.key } });
        if (applied.status !== "allowed") {
          const next = structuredClone(store.state);
          const entry = next.night.queue.find((candidate) => candidate.key === step!.key);
          if (entry) {
            entry.done = true;
            entry.skipped = true;
            store.replaceState(next);
          }
        }
        step = engine.currentStep(store.state);
      }
    });
    await page.waitForSelector("[data-target]");
    const action = page.locator('[data-act="complete"]');
    assert.equal(await action.isDisabled(), true, "a blocked step disables the dock action");
    assert.match(
      await action.innerText(),
      /выберите цель|choose a target/i,
      "the action names the missing target",
    );
    assert.equal(
      await page.locator('[data-act="step-confirm"]').count(),
      0,
      "a blocked step opens no sheet",
    );
    await page.locator("[data-target]").first().locator("[data-seat-name]").click();
    assert.equal(
      await page.locator("[data-target]").first().getAttribute("aria-pressed"),
      "true",
      "the seat name is part of the target control",
    );
    assert.equal(await action.isEnabled(), true, "a chosen target enables the dock action");
    await page.reload();
    await page.waitForSelector("[data-game-table]");
  }

  // The wake order lives in the menu instead of an orphaned panel.
  {
    await openTableMenu();
    assert.equal(
      await page.locator('[data-menu] [data-panel="queue"]').count(),
      1,
      "the menu shows the wake order",
    );
    assert.match(
      await page.locator('[data-menu] [data-panel="queue"]').innerText(),
      /далее|Next:/i,
      "the queue names the next wakes",
    );
    await page.locator('[data-menu] [data-act="show-order"]').click();
    assert.ok(
      (await page.locator('[data-menu] [data-panel="queue"] li').count()) > 0,
      "the full night order expands",
    );
    await page.keyboard.press("Escape");
  }

  // Seat numbers stay readable on the phone-first surface.
  {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForSelector("[data-seat-number]");
    const numbers = await page.locator("[data-seat-number]").evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent?.trim() ?? "",
        shown: getComputedStyle(node).display !== "none",
        size: parseFloat(getComputedStyle(node).fontSize),
      })),
    );
    assert.equal(numbers.length, 7, "every seat carries its number at 390 px");
    assert.ok(
      numbers.every((entry) => entry.shown && entry.text && entry.size >= 12),
      `seat numbers are visible at 12 px: ${JSON.stringify(numbers)}`,
    );
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await seed(7);
  await route("/table");

  // ---- end of the Velvet table window assertions --------------------------

  // Regression: switching scripts without a reload must replace the bag's
  // role pool. The old mount-time role list kept showing roles from the
  // previous script.
  await page.evaluate(async () => {
    const store = (await window.PG_MODULES()).store;
    store.reset(7);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/bag");
  await page.waitForSelector(".setup");
  await page.locator('[data-tab="manual"]').click();
  assert.equal(
    await page.locator(".bag-role").count(),
    22,
    "Trouble Brewing exposes its full roster",
  );
  // `chef` is `requires-storyteller-choice` since TB-CHEF-02 (the pinned
  // per-pair registration), so a fully verified fixture cannot include it.
  const customRoles = [
    "washerwoman",
    "mayor",
    "undertaker",
    "monk",
    "slayer",
    "soldier",
    "ravenkeeper",
    "fortuneteller",
    "butler",
    "poisoner",
    "imp",
  ];
  const customJson = JSON.stringify([
    { id: "_meta", name: "Browser Script" },
    ...customRoles.map((id) => ({ id })),
  ]);
  const supportCounts = (scope: string) =>
    page
      .locator(`${scope} [data-support-level]`)
      .evaluateAll((nodes) =>
        Object.fromEntries(
          nodes.map((node) => [node.dataset.supportLevel, Number(node.dataset.supportCount)]),
        ),
      );
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator("details[data-script-section='clipboard'] summary").click();
  await page.locator("[data-script-text]").fill(customJson);
  await page.locator('[data-act="script-text"]').click();
  await page.waitForSelector(".script-preview");
  assert.equal(
    await page.locator('.script-preview [data-script-support="verified"]').count(),
    1,
    "a fully verified custom script shows the verified level before apply",
  );
  assert.deepEqual(
    await supportCounts(".script-preview"),
    { verified: customRoles.length, "requires-storyteller-choice": 0, unsupported: 0 },
    "the import preview shows the count in each support level",
  );
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.match(await page.locator(".setup-brand small").innerText(), /browser script/i);
  assert.equal(
    await page.locator(".bag-role").count(),
    72,
    "custom mode exposes the full 72-role catalog",
  );
  const shownRoles = await page
    .locator(".bag-role")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.role));
  assert.ok(
    customRoles.every((id) => shownRoles.includes(id)),
    "the imported pool is part of the manual picker",
  );
  const selectedRoles = await page
    .locator(".bag-role.is-on")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.role));
  assert.ok(
    selectedRoles.every((id) => customRoles.includes(id ?? "")),
    "the auto-filled bag uses only the new script's roles",
  );

  // Switching back to the official script restores the full roster.
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="tb"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.equal(
    await page.locator(".bag-role").count(),
    22,
    "Trouble Brewing roles return after the switch",
  );
  assert.equal(await page.locator('.bag-role[data-role="mayor"]').count(), 1);
  assert.equal(
    await page.locator('[data-script-support="requires-storyteller-choice"]').count(),
    1,
    "the Trouble Brewing script reports its Storyteller-choice role",
  );
  assert.deepEqual(
    await supportCounts("[data-script-support]"),
    { verified: 20, "requires-storyteller-choice": 2, unsupported: 0 },
    "the setup screen shows the Trouble Brewing counts",
  );

  // Bad Moon Rising is a real picker choice with its own 25-role pool and
  // script name; switching to it must replace the Trouble Brewing roster.
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="bmr"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.match(await page.locator(".setup-brand small").innerText(), /bad moon rising/i);
  assert.equal(
    await page.locator(".bag-role").count(),
    25,
    "Bad Moon Rising exposes its full roster",
  );
  assert.equal(await page.locator('.bag-role[data-role="chambermaid"]').count(), 1);
  assert.equal(
    await page.locator('[data-script-support="unsupported"]').count(),
    0,
    "Bad Moon Rising has no unsupported character",
  );
  assert.deepEqual(
    await supportCounts("[data-script-support]"),
    { verified: 21, "requires-storyteller-choice": 4, unsupported: 0 },
    "Bad Moon Rising shows four Storyteller-choice roles and none unsupported",
  );
  assert.equal(
    await page.locator('.bag-role[data-role="mayor"]').count(),
    0,
    "Trouble Brewing roles are not in the Bad Moon Rising pool",
  );
  const bmrRoles = await page
    .locator(".bag-role")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.role));
  assert.ok(
    bmrRoles.every((id) =>
      [
        "chambermaid",
        "courtier",
        "exorcist",
        "fool",
        "gambler",
        "gossip",
        "grandmother",
        "innkeeper",
        "minstrel",
        "pacifist",
        "professor",
        "sailor",
        "tealady",
        "goon",
        "lunatic",
        "moonchild",
        "tinker",
        "assassin",
        "devilsadvocate",
        "godfather",
        "mastermind",
        "po",
        "pukka",
        "shabaloth",
        "zombuul",
      ].includes(id ?? ""),
    ),
    "the Bad Moon Rising pool contains only Bad Moon Rising roles",
  );
  assert.equal(
    await page.locator(".bag-note.bmr-warning").count(),
    1,
    "the Bad Moon Rising host-mode warning is visible",
  );

  // Sects and Violets is the third selectable scenario with its own pool.
  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="snv"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });
  assert.match(await page.locator(".setup-brand small").innerText(), /sects and violets/i);
  assert.equal(
    await page.locator(".bag-role").count(),
    25,
    "Sects and Violets exposes its full roster",
  );
  assert.equal(await page.locator('.bag-role[data-role="clockmaker"]').count(), 1);
  assert.equal(
    await page.locator('.bag-role[data-role="chambermaid"]').count(),
    0,
    "Bad Moon Rising roles are not in the Sects and Violets pool",
  );
  assert.equal(
    await page.locator(".bag-note.snv-warning").count(),
    1,
    "the Sects and Violets host-mode warning is visible",
  );

  await page.locator('[data-act="script"]').click();
  await page.waitForSelector(".script-modal");
  await page.locator('input[name="script-pick"][value="tb"]').check();
  await page.locator('[data-act="apply-script"]').click();
  await page.waitForSelector(".script-modal", { state: "detached" });

  phase("script switching");

  // Issue #17: three suggested bags, preview/apply, manual editing, undo and
  // the mixed-edition block.
  await route("/bag");
  await page.waitForSelector(".setup");
  await page.locator('[data-tab="recommended"]').click();
  assert.equal(
    await page.locator(".bag-preset-card").count(),
    3,
    "three suggested bags at seven players",
  );
  await page.locator(".bag-preset-card [data-preview]").first().click();
  await page.waitForSelector(".bag-preview");
  assert.ok((await page.locator(".bag-preview .bag-token").count()) > 0);
  await page.locator('[data-act="close-preview"]').first().click();
  await page.locator(".bag-preset-card [data-apply]").first().click();
  await page.waitForSelector(".bag-status.is-ok");
  assert.equal(
    await page.locator('[data-act="deal"]').isDisabled(),
    false,
    "a valid preset enables the deal",
  );
  await page.locator('[data-tab="manual"]').click();
  assert.equal(
    await page.locator(".bag-selected .bag-token").count(),
    7,
    "the applied bag is editable in the manual picker",
  );

  await page.locator('[data-count="1"]').click();
  assert.equal(
    await page.locator(".bag-selected .bag-token").count(),
    7,
    "growing the count keeps the chosen roles",
  );
  await page.locator('[data-count="-1"]').click();

  assert.equal(await page.locator("[data-search]").count(), 0, "the manual picker has no search");
  assert.equal(await page.locator("[data-edition]").count(), 0, "no edition filter");
  assert.equal(await page.locator("[data-team-filter]").count(), 0, "no team filter");
  assert.equal(await page.locator("[data-team-group]").count(), 4, "roles are grouped by team");
  assert.equal(await page.locator(".bag-role").count(), 22, "all script roles remain visible");
  await page.locator('.bag-role[data-role="mayor"]').click();
  assert.equal(
    await page.locator(".bag-selected .bag-token").count(),
    8,
    "manual selection adds a token",
  );
  await page.locator('[data-act="undo"]').click();
  assert.equal(
    await page.locator(".bag-selected .bag-token").count(),
    7,
    "undo restores the previous bag",
  );

  // Library: save the current bag, clear it, load it back.
  await page.locator('[data-act="library"]').click();
  await page.waitForSelector("[data-library-name]");
  await page.locator("[data-library-name]").fill("Browser bag");
  await page.locator('[data-act="save-bag"]').click();
  await page.waitForSelector("[data-load-bag]");
  await page.locator('[data-act="close-library"]').last().click();
  await page.locator('[data-tab="manual"]').click();
  await page.locator('[data-act="clear"]').click();
  assert.equal(await page.locator(".bag-selected .bag-token").count(), 0, "clear empties the bag");
  assert.equal(
    await page.locator('[data-act="deal"]').isDisabled(),
    true,
    "an empty bag cannot be dealt",
  );
  await page.locator('[data-act="library"]').click();
  await page.locator("[data-load-bag]").first().click();
  await page.waitForFunction(
    () => document.querySelectorAll(".bag-selected .bag-token").length === 7,
  );

  // A custom draft survives a reload, and a mixed pool becomes playable in
  // explicit manual-only mode.
  await page.locator('[data-scenario="custom"]').click();
  await page.waitForSelector(".bag-pool-hint");
  await page.reload();
  await page.waitForSelector(".setup");
  assert.equal(
    await page.locator(".setup-banner.is-error").count(),
    0,
    "a short custom draft is not treated as corrupt",
  );
  assert.match(await page.locator(".setup-brand small").innerText(), /custom|свой сценарий/i);
  await page.locator('[data-act="edit-pool"]').click();
  await page.waitForSelector(".bag-pool-hint");
  for (const id of ["chef", "empath", "monk", "poisoner", "imp", "chambermaid"]) {
    await page.locator(`.bag-role[data-role="${id}"]`).click();
  }
  assert.equal(
    await page.locator(".setup-banner.is-warning").count(),
    1,
    "a mixed-edition pool enters manual-only mode",
  );
  assert.equal(await page.locator("[data-manual-only]").isChecked(), true);

  // Undo restores the pool, not only the bag selection.
  await page.locator('.bag-role[data-role="mayor"]').click();
  await page.locator('[data-act="undo"]').click();
  assert.equal(
    await page.evaluate(async () => {
      const { state } = (await window.PG_MODULES()).store;
      return state.script.roles.includes("mayor");
    }),
    false,
    "undo restores the custom pool",
  );

  await page.locator('[data-act="edit-pool"]').click();
  await page.locator('[data-count="-1"]').click();
  await page.locator('[data-count="-1"]').click();
  for (const id of ["chef", "empath", "chambermaid", "poisoner", "imp"]) {
    await page.locator(`.bag-role[data-role="${id}"]`).click();
  }
  await page.waitForSelector(".bag-status.is-ok");
  assert.equal(
    await page.locator('[data-act="deal"]').isDisabled(),
    false,
    "a legal mixed bag can be dealt in manual-only mode",
  );

  // The bag picker localizes in all three languages and never overflows.
  for (const [lang, manual] of [
    ["az", "Əl ilə"],
    ["ru", "Вручную"],
    ["en", "Manual"],
  ]) {
    await page.evaluate((code) => localStorage.setItem("pg.lang", code), lang);
    await page.reload();
    await page.waitForSelector(".setup");
    await page.locator('[data-tab="manual"]').click();
    const folded = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    assert.equal(
      folded((await page.locator('[data-tab="manual"]').innerText()).trim()),
      folded(manual),
      `the manual tab is localized in ${lang}`,
    );
    assert.ok((await page.locator(".bag-role b").count()) > 20, `role names render in ${lang}`);
    await overflow();
  }
  assert.equal(
    await page.locator(".bag-selected .bag-token").count(),
    5,
    "the mixed bag survives reload",
  );
  assert.equal(
    await page.locator('[data-act="deal"]').isDisabled(),
    false,
    "the saved mixed bag is ready to deal",
  );
  assert.equal(
    await page.locator("[data-manual-only]").isChecked(),
    true,
    "manual-only mode survives reload",
  );
  await page.locator('[data-act="deal"]').click();
  await page.waitForFunction(() => document.body.dataset.route === "player");
  assert.equal(
    (await page.locator(".player-view").count()) > 0,
    true,
    "the saved mixed bag starts the deal",
  );
  await settled();

  phase("bag");

  // Mixed-edition manual gameplay: deal, empty automatic night, day and a
  // host-declared winner.
  const mixedSeeded = await page.evaluate(async () => {
    const model = (await window.PG_MODULES()).model;
    const engine = (await window.PG_MODULES()).engine;
    const store = (await window.PG_MODULES()).store;
    const game = model.createGame(5);
    game.script = {
      id: "custom-mixed",
      name: "Mixed manual",
      edition: "custom",
      source: "manual",
      roles: ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"],
      manualOnly: true,
    };
    game.scriptId = game.script.id;
    game.setup.count = 5;
    game.setup.roles = ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"];
    game.setup.bluffs = [];
    const assignment = { 1: "fortuneteller", 2: "chambermaid", 3: "monk", 4: "poisoner", 5: "imp" };
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    game.order.forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.phase = "seat";
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(mixedSeeded.ok, true, JSON.stringify(mixedSeeded));
  await route("/table");
  assert.equal(await page.locator(".manual-warning").count(), 1, "manual warning on the deal card");
  await page.locator('[data-act="start-night"]').click();
  await page.waitForSelector('[data-table-dock][data-phase="night"]');
  assert.equal(
    await page.locator(".manual-warning").count(),
    1,
    "manual warning on the night card",
  );
  await page.locator('[data-act="end-night"]').click();
  await page.waitForSelector('[data-table-dock][data-phase="day"]');
  // The table menu owns the day timer and the notes; both go through the store.
  await openTableMenu();
  await page.locator('[data-act="timer-start"]').click();
  await page.waitForFunction(
    () => (document.querySelector('[data-panel="day-result"] b')?.textContent || "—") !== "—",
    undefined,
    { timeout: 3000 },
  );
  await page.locator('[data-act="timer-stop"]').click();
  await page.locator("[data-notes]").fill("Browser verification");
  await page.waitForFunction(async () => {
    const { store } = await window.PG_MODULES();
    return store.state.notes === "Browser verification";
  });
  await notesInputStaysCompact();
  await page.locator('[data-act="close"]:visible').first().click();
  await page.locator('[data-act="menu"]').click();
  assert.equal(
    await page.locator("[data-winner-team]").count(),
    1,
    "the host can declare a winner",
  );
  await page.locator("[data-winner-team]").selectOption("evil");
  await page.locator('[data-act="declare-winner"]').click();
  await page.waitForSelector('[data-table-dock][data-phase="over"]');
  assert.match(await page.locator('[data-step="over"] h1').innerText(), /Evil|Зло/);
  await page.keyboard.press("Escape");

  // Editing a dealt custom pool requires confirmation; cancelling must leave
  // the saved game byte-for-byte intact.
  const customDealt = await page.evaluate(async () => {
    const model = (await window.PG_MODULES()).model;
    const engine = (await window.PG_MODULES()).engine;
    const store = (await window.PG_MODULES()).store;
    const { ALL_ROLES } = (await window.PG_MODULES()).rules;
    const game = model.createGame(7);
    game.script = {
      id: "custom-tb",
      name: "Custom TB",
      edition: "custom",
      source: "manual",
      roles: ALL_ROLES.slice(),
    };
    game.scriptId = game.script.id;
    game.setup.count = 7;
    game.setup.roles = [
      "chef",
      "empath",
      "fortuneteller",
      "undertaker",
      "washerwoman",
      "poisoner",
      "imp",
    ];
    game.setup.bluffs = ["librarian", "investigator", "monk"];
    const assignment = {
      1: "chef",
      2: "empath",
      3: "fortuneteller",
      4: "undertaker",
      5: "washerwoman",
      6: "poisoner",
      7: "imp",
    };
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    game.order.forEach((id) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    game.phase = "deal";
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  assert.equal(customDealt.ok, true, JSON.stringify(customDealt));
  await route("/bag");
  await page.waitForSelector(".setup");
  await page.locator('[data-tab="manual"]').click();
  await page.locator('[data-act="edit-pool"]').click();
  const savedBefore = await page.evaluate(async () => {
    const { KEY } = (await window.PG_MODULES()).store;
    return localStorage.getItem(KEY);
  });
  let cancelled = false;
  page.once("dialog", (dialog) => {
    cancelled = true;
    dialog.dismiss();
  });
  await page.locator('.bag-role[data-role="mayor"]').click();
  await settled();
  const savedAfter = await page.evaluate(async () => {
    const { KEY } = (await window.PG_MODULES()).store;
    return localStorage.getItem(KEY);
  });
  assert.equal(cancelled, true, "editing a dealt pool asks for confirmation");
  assert.equal(savedAfter, savedBefore, "cancelling leaves the saved game byte-for-byte intact");

  await seed(7);
  await route("/table");

  phase("manual play");

  // Regression (issue #1): the Poisoner's step must never ask for a Mayor
  // redirection. Selecting the Mayor as a poison target shows no redirect
  // control and leaves "Complete step" enabled.
  await seedMayorNight2();
  await route("/table");
  const stepRole = () =>
    page.evaluate(async () => {
      const { currentStep } = (await window.PG_MODULES()).engine;
      const { state } = (await window.PG_MODULES()).store;
      const step = currentStep(state);
      return step && (step.roleId || step.system);
    });
  assert.equal(await stepRole(), "poisoner", "Mayor scenario should start on the Poisoner");
  // Issue #45: an unanswered mandatory target blocks the step and explains why.
  // Issue #311: the action cannot open a sheet that cannot confirm, so the
  // dock itself states the blockage and keeps one quiet line instead of a
  // duplicate rejection preview.
  assert.equal(
    await page.locator('[data-act="complete"]').isDisabled(),
    true,
    "the Poisoner step is blocked until a target is chosen",
  );
  assert.equal(
    await page.locator('[data-act="step-confirm"]').count(),
    0,
    "a blocked step opens no sheet",
  );
  assert.equal(
    await page.locator('[data-blocker-reason="targets"]').count(),
    1,
    "the dock names the missing target",
  );
  assert.equal(
    await page.locator("[data-preview]").count(),
    0,
    "an incomplete target selection shows no duplicate preview",
  );
  assert.equal(
    await page.locator("[data-dock-quiet]").count(),
    0,
    "the blocker line replaces the quiet line",
  );
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  assert.equal(
    await page.locator('[data-blocker-reason="targets"]').count(),
    0,
    "choosing a target clears the blocking reason",
  );
  assert.match(
    await page.locator('[data-consequence="target"]').innerText(),
    /Player 1/,
    "the preview names the chosen target",
  );
  assert.equal(
    await page.locator('[data-consequence="applied"]').count(),
    1,
    "the Poisoner's poison is an applied state, not a death",
  );
  assert.equal(
    await page.locator('[data-consequence="scheduled"]').count(),
    0,
    "an expiry-only poison is not a scheduled death",
  );
  // Correcting a wrong draft clears it locally; the trigger is not applied.
  await page.locator('[data-act="reset-step"]').click();
  await settled();
  assert.equal(
    await page.locator('[data-blocker-reason="targets"]').count(),
    1,
    "clearing the step input restores the blocking reason",
  );
  assert.equal(
    await page.locator('[data-consequence="target"]').count(),
    0,
    "the cleared draft no longer previews a target",
  );
  // Desktop smoke inside the table scenario, not the PWA update flow.
  await page.setViewportSize({ width: 1440, height: 900 });
  await overflow();
  assert.equal(
    await page.locator('[data-act="complete"]').isDisabled(),
    true,
    "the desktop step stays blocked without a target",
  );
  assert.equal(
    await page.locator('[data-act="step-confirm"]').count(),
    0,
    "the desktop blocked step opens no sheet",
  );
  await page.screenshot({
    path: join(screenshots, "storyteller-step-preview-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  await page.screenshot({
    path: join(screenshots, "storyteller-step-preview-phone.png"),
    fullPage: true,
  });
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator("select[data-redirect]").count(),
    0,
    "the Poisoner's step must not offer a Mayor redirection",
  );
  assert.equal(
    await page.locator('[data-act="step-confirm"]').isEnabled(),
    true,
    "the step confirm stays enabled when the Mayor is only poisoned",
  );
  await page.screenshot({
    path: join(screenshots, "mayor-poison-poisoner-step.png"),
    fullPage: true,
  });
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  // The poisoned Mayor loses the ability, so the Imp's step also asks nothing.
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator("select[data-redirect]").count(),
    0,
    "a poisoned Mayor attacked by the Imp must not offer a redirection",
  );
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  const mayorDead = await page.evaluate(
    async () => (await window.PG_MODULES()).store.state.players["1"].alive,
  );
  assert.equal(mayorDead, false, "the poisoned Mayor dies to the Demon");

  // A stored redirection belongs to one victim: changing the Demon's target
  // must clear it instead of silently reusing the old replacement.
  await seedMayorNight2();
  await route("/table");
  await page.locator('[data-target][data-id="2"]').click();
  await settled();
  await completeStep();
  await settled();
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator("select[data-redirect]").count(),
    1,
    "a healthy Mayor still offers a redirection",
  );
  await page.locator("select[data-redirect]").selectOption("2");
  await settled();
  await page.keyboard.press("Escape");
  await page.locator('[data-target][data-id="3"]').click();
  await settled();
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator("select[data-redirect]").inputValue(),
    "",
    "retargeting the Imp must reset the stored Mayor redirection to unanswered",
  );
  assert.equal(
    await page.locator('[data-act="step-confirm"]').isDisabled(),
    true,
    "the reset redirection blocks the step until the host answers again",
  );
  await page.keyboard.press("Escape");

  // A dead or protected player can be named as the Mayor's replacement, but
  // the attack then kills nobody and the Mayor survives.
  await seedMayorRedirectTargets();
  await route("/table");
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  const redirectSelect = page.locator("select[data-redirect]");
  assert.equal(await redirectSelect.count(), 1, "a healthy Mayor offers a redirection");
  const redirectOptions = await redirectSelect.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      text: node.textContent?.trim() ?? "",
    })),
  );
  assert.ok(
    redirectOptions.some(
      (option) => option.value === "2" && /already dead|уже мёртв|artıq ölü/.test(option.text),
    ),
    "a dead player is offered as a replacement and labelled as no death: " +
      JSON.stringify(redirectOptions),
  );
  assert.ok(
    redirectOptions.some(
      (option) => option.value === "3" && /protected|под защитой|qorunur/.test(option.text),
    ),
    "a Monk-protected player is offered and labelled as no death",
  );
  await redirectSelect.selectOption("2");
  await settled();
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  let mayorState: { mayorAlive: boolean; nightDeaths: number; protectedAlive?: boolean } =
    await page.evaluate(async () => {
      const { state } = (await window.PG_MODULES()).store;
      return {
        mayorAlive: state.players["1"].alive,
        nightDeaths: state.deaths.filter((death) => death.phase === "night" && death.number === 2)
          .length,
      };
    });
  assert.equal(mayorState.mayorAlive, true, "the Mayor survives a redirect to a dead player");
  assert.equal(mayorState.nightDeaths, 0, "a dead replacement produces no extra death");

  await seedMayorRedirectTargets();
  await route("/table");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  await page.locator("select[data-redirect]").selectOption("3");
  await settled();
  await page.locator('[data-act="step-confirm"]').click();
  await settled();
  mayorState = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    return {
      mayorAlive: state.players["1"].alive,
      protectedAlive: state.players["3"].alive,
      nightDeaths: state.deaths.filter((death) => death.phase === "night" && death.number === 2)
        .length,
    };
  });
  assert.equal(mayorState.mayorAlive, true, "the Mayor survives a redirect to a protected player");
  assert.equal(mayorState.protectedAlive, true, "the Monk-protected replacement survives");
  assert.equal(mayorState.nightDeaths, 0, "a protected replacement produces no extra death");

  // The Sailor's drunk picker reads the same draft as the target list.
  await page.evaluate(async () => {
    const { model, engine, store, rules } = await window.PG_MODULES();
    const assignment = {
      1: "sailor",
      2: "innkeeper",
      3: "courtier",
      4: "tinker",
      5: "assassin",
      6: "shabaloth",
    };
    const game = model.createGame(6);
    game.scriptId = "bmr";
    // The script catalog is not exposed to the harness; the edition flag is
    // what routes the night into the Bad Moon Rising queue.
    game.script = {
      ...game.script,
      id: "bmr",
      name: "Bad Moon Rising",
      edition: "bmr",
      roles: [...rules.BMR_ALL],
    };
    game.setup.count = 6;
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = [];
    Object.entries(assignment).forEach(([id]) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
    });
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) throw new Error(JSON.stringify(dealt));
    engine.autoSecrets(game);
    game.phase = "seat";
    const start = engine.startNight(game);
    if (!start.ok) throw new Error(JSON.stringify(start));
    while (engine.currentStep(game)!.roleId !== "sailor") {
      window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
    }
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/table");
  assert.equal(await stepRole(), "sailor");
  await page.locator('[data-target][data-id="2"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator("select[data-bmr-drunk]").count(),
    1,
    "the Sailor can name the drunk target",
  );
  assert.ok(
    (await page.locator("select[data-bmr-drunk] option").allTextContents()).some((text) =>
      /Player 2/.test(text),
    ),
    "the selected target is offered as the drunk pick",
  );
  await page.keyboard.press("Escape");

  const seedBmrStep = async (roles: string[], target: string) => {
    const seeded = await page.evaluate(
      async ({ roles, target }) => {
        const { model, engine, store, rules } = await window.PG_MODULES();
        const game = model.createGame(roles.length);
        game.scriptId = "bmr";
        game.script = {
          ...game.script,
          id: "bmr",
          name: "Bad Moon Rising",
          edition: "bmr",
          roles: [...rules.BMR_ALL],
        };
        game.setup.count = roles.length;
        game.setup.roles = [...roles];
        game.setup.bluffs = [];
        game.order.forEach((id) => {
          game.players[id].name = "Player " + id;
          game.players[id].claimed = true;
        });
        const assignment = Object.fromEntries(game.order.map((id, index) => [id, roles[index]]));
        const dealt = engine.dealGame(game, { assignment });
        if (!dealt.ok) return dealt;
        engine.autoSecrets(game);
        game.phase = "seat";
        let start = engine.startNight(game);
        if (!start.ok) return start;
        for (let night = 1; night <= 2; night += 1) {
          if (game.night.queue.some((step) => step.roleId === target)) break;
          while (engine.currentStep(game)) {
            window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
          }
          if (!engine.endNight(game).ok || !engine.endDay(game).ok) break;
          start = engine.startNight(game);
          if (!start.ok) return start;
        }
        while (engine.currentStep(game)!.roleId !== target) {
          window.fixtureSkip(engine, game, engine.currentStep(game)!.key, "browser check");
        }
        store.replaceState(game);
        dispatchEvent(new PopStateEvent("popstate"));
        return { ok: true };
      },
      { roles, target },
    );
    assert.equal(seeded.ok, true, JSON.stringify(seeded));
    await settled();
  };

  await seedBmrStep(["sailor", "innkeeper", "gambler", "goon", "assassin", "shabaloth"], "gambler");
  await route("/table");
  await page.locator('[data-target][data-id="2"]').click();
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator('[data-bmr-decision="role"]').count(),
    1,
    "the Gambler guess has its own section",
  );
  assert.equal(
    await page.locator('[data-bmr-decision="marking"]').count(),
    0,
    "the engine resolves the Gambler's death, so the host records no death",
  );
  assert.equal(
    await page.locator('[data-bmr-decision="role"] [data-bmr-role]').count(),
    1,
    "the guess is inside the role decision",
  );
  await page.keyboard.press("Escape");

  await seedBmrStep(["sailor", "gambler", "courtier", "tinker", "assassin", "shabaloth"], "tinker");
  await route("/table");
  await page.locator('[data-act="complete"]').click();
  assert.equal(
    await page.locator('[data-bmr-decision="tinker"]').count(),
    1,
    "the Tinker has an explicit decision",
  );
  assert.equal(await page.locator('[data-tinker-decision="die"]').count(), 1);
  assert.equal(await page.locator('[data-tinker-decision="live"]').count(), 1);
  assert.equal(await page.locator("[data-bmr-death]").count(), 0);
  assert.equal(
    await page.locator('[role="dialog"] .bmr-warning').count(),
    0,
    "the step sheet does not repeat the tracking warning",
  );
  await page.keyboard.press("Escape");

  await page.evaluate(async () => {
    const { model, store, rules } = await window.PG_MODULES();
    const roles = ["sailor", "gambler", "tinker", "courtier", "assassin", "shabaloth"];
    const game = model.createGame(6);
    game.scriptId = "bmr";
    game.script = {
      ...game.script,
      id: "bmr",
      name: "Bad Moon Rising",
      edition: "bmr",
      roles: [...rules.BMR_ALL],
    };
    game.setup.count = 6;
    game.setup.roles = [...roles];
    game.setup.bluffs = [];
    game.order.forEach((id, index) => {
      game.players[id].name = "Player " + id;
      game.players[id].claimed = true;
      game.players[id].roleId = roles[index];
    });
    game.phase = "setup";
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await route("/table");
  assert.equal(
    await page.locator(".bmr-warning").count(),
    1,
    "the deal screen shows the tracking warning once",
  );

  // The Fortune Teller may pick themself as one of the two targets.
  await seedFortuneTellerNight();
  await route("/table");
  assert.equal(await stepRole(), "fortuneteller");
  const selfButton = page.locator('[data-target][data-id="1"]');
  assert.equal(await selfButton.isDisabled(), false, "the Fortune Teller can select themself");
  await selfButton.click();
  await page.locator('[data-target][data-id="2"]').click();
  await settled();
  assert.equal(
    await page.locator('[data-act="complete"]').isEnabled(),
    true,
    "self plus another player is a complete Fortune Teller choice",
  );
  await completeStep();
  await settled();
  const fortuneGiven = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    const step = state.night.queue.find((candidate) => candidate.roleId === "fortuneteller");
    return { targets: step!.targetIds, given: step!.given && step!.given.value };
  });
  assert.deepEqual(fortuneGiven.targets, ["1", "2"], "self-selection is recorded as a target");
  assert.equal(fortuneGiven.given, false, "no Demon and no red herring in the pair");

  // The Lunatic sees the same Demon as the real Demon on the deal card and the
  // same card layout in the night; the real Demon's player never reaches it.
  await seedLunaticNight();
  const poName = await page.evaluate(
    () => (window.PG?.roles ?? []).find((role) => role.id === "po")?.name || "",
  );
  assert.ok(poName, "the role catalog exposes the Po name");
  await route("/player");
  await page.locator('[data-seat="0"]').click();
  assert.equal(
    (await page.locator(".player-role-name").textContent()) ?? "",
    poName,
    "the Lunatic's deal card shows the same Demon as the real Demon",
  );
  await route("/table");
  // The host points at any player as the Minion tip: pick the Townsfolk at
  // seat 3, not the real Minion at seat 7.
  await page.locator('[data-target][data-id="3"]').click();
  await settled();
  await page.locator('[data-act="complete"]').click();
  await page.locator('[data-act="show-info"]').click();
  await page.waitForSelector("[data-lunatic-card]");
  assert.equal(
    (await page.locator("[data-lunatic-mask]").textContent()) ?? "",
    "Player 1 · " + poName,
    "the Lunatic card shows their own seat as the Demon they believe they are",
  );
  const minionRows = await page
    .locator("[data-lunatic-card] [data-info-minions] li")
    .evaluateAll((nodes) =>
      nodes.map((node) => [
        node.querySelector("span")?.textContent?.trim(),
        node.querySelector("b")?.textContent?.trim(),
      ]),
    );
  assert.deepEqual(
    minionRows,
    [["3", "Player 3"]],
    "the Lunatic card lists the Storyteller's picks, not the real Minions",
  );
  const lunaticCard = await page.locator("[data-lunatic-card]").innerText();
  assert.ok(!lunaticCard.includes("Player 7"), "the real Minion does not reach the Lunatic card");
  assert.ok(
    !lunaticCard.includes("Player 8"),
    "the real Demon's player does not reach the Lunatic card",
  );
  assert.equal(
    await page.locator("[data-lunatic-card] [data-info-bluffs] > *").count(),
    3,
    "the Lunatic card lists the three bluffs",
  );
  const privateBluffs = await page.evaluate(async () => {
    const { state } = (await window.PG_MODULES()).store;
    const nameOf = (id: string) => window.PG?.roles?.find((role) => role.id === id)?.name ?? id;
    return {
      lunatic: state.setup.lunaticBluffs!.map(nameOf),
      demon: state.setup.bluffs.map(nameOf),
    };
  });
  const shownBluffs = await page
    .locator("[data-lunatic-card] [data-info-bluffs] > *")
    .allTextContents();
  assert.deepEqual(
    shownBluffs.map((name) => name.trim()),
    privateBluffs.lunatic,
    "the Lunatic card shows its independently selected in-play bluffs",
  );
  for (const name of privateBluffs.demon)
    assert.ok(
      !shownBluffs.includes(name),
      "the real Demon's distinct bluff list stays out of the Lunatic card",
    );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // The /secrets picker must offer the Fortune Teller as their own red herring.
  await seedFortuneTellerNight();
  await route("/secrets");
  const herringOptions = await page.locator("select[data-herring] option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      text: node.textContent?.trim() ?? "",
    })),
  );
  assert.ok(
    herringOptions.some((option) => option.value === "1" && /Fortune Teller/.test(option.text)),
    "the Fortune Teller can be their own red herring: " + JSON.stringify(herringOptions),
  );
  await page.locator("select[data-herring]").selectOption("1");
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.setup.herringId),
    "1",
    "choosing the red herring writes the command",
  );

  // Issue #45: the Imp's blocked attack on a healthy Soldier previews a
  // prevented death, not a death.
  await seedSoldierNight();
  await route("/table");
  assert.equal(await stepRole(), "imp");
  await page.locator('[data-target][data-id="1"]').click();
  await settled();
  assert.ok(
    (await page.locator('[data-consequence="prevented"]').innerText()).trim().length > 0,
    "the blocked Soldier attack is a prevented death",
  );
  assert.equal(
    await page.locator('[data-consequence="death"]').count(),
    0,
    "a prevented death is never shown as a death",
  );

  // Issue #104: a dead seat is not selectable on the Snake Charmer step, while
  // a living seat remains selectable; the engine keeps rejecting a dead target.
  await seedSnakeCharmerNight();
  await route("/table");
  assert.equal(await stepRole(), "snakecharmer");
  assert.equal(
    await page.locator('[data-target][data-id="1"]').isDisabled(),
    true,
    "the dead seat is disabled on the Snake Charmer step",
  );
  assert.equal(
    await page.locator('[data-target][data-id="2"]').isDisabled(),
    false,
    "a living seat stays selectable on the Snake Charmer step",
  );

  // Restore the seven-player game the rest of the script expects.
  await seed(7);
  await route("/table");

  phase("role steps");

  // Issue #45: a rejected import renders its reason in the console banner.
  await openTableMenu();
  await page.locator('[data-act="import"]:visible').click();
  await page.waitForSelector("[data-import-text]");
  await page.locator("[data-import-text]").fill("not a game");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-act="apply-import"]').click();
  await page.waitForSelector("[data-rejection]");
  assert.ok(
    (await page.locator("[data-rejection]").innerText()).trim().length > 0,
    "the rejected import shows a reason",
  );
  await page.locator('[data-act="close"]').first().click();
  await page.locator('[data-act="dismiss-rejection"]').click();
  assert.equal(await page.locator("[data-rejection]").count(), 0, "the reason is dismissible");

  // Regression: a stale table Escape listener must never act on another route.
  await route("/player");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".player-view").count(), 1);
  assert.equal(await page.locator(".host").count(), 0);
  assert.equal(
    await page.evaluate(() => location.pathname),
    "/pocket/player",
    "Escape on the handoff stays on the handoff",
  );
  // Issue #150: the console opens directly after a private route. No hide
  // control, no cover and no reveal step exist any more.
  await route("/table");
  assert.equal(await page.locator(".host").count(), 1, "the console opens directly");
  assert.equal(await page.locator('[data-act="hide"]').count(), 0, "no hide control");
  assert.equal(await page.locator('[data-act="reveal"]').count(), 0, "no reveal control");
  assert.equal(await page.locator('[aria-modal="true"]').count(), 0, "no overlay on mount");
  // Exercise extracted correction and export dialogs with real DOM interaction.
  await page.locator('[data-seat-open="1"]').click();
  await page.locator('[data-correct="kind"]').selectOption("role");
  await page.locator('[data-correct="role-value"]').selectOption("chef");
  await page.locator('[data-correct="reason"]').fill("Browser verification");
  await page.locator('[data-act="apply-correction"]').click();
  assert.equal(await page.locator('[aria-modal="true"]').count(), 0);
  await openTableMenu();
  await page.locator('[data-act="export"]:visible').first().click();
  assert.match(await page.locator("textarea[readonly]").inputValue(), /pocket-grimoire/);
  const exportDownload = page.waitForEvent("download");
  await page.locator('[data-act="download"]').click();
  assert.match(
    (await exportDownload).suggestedFilename(),
    /^grimoria-tb\.json$/,
    "game export file name",
  );
  await page.locator('[data-act="close"]').click();
  await finishNight();
  await page.locator('[data-act="day-help"]').click();
  assert.equal(await page.locator("[data-virgin-form]").count(), 1);
  assert.equal(
    await page.locator('[data-act="end-day"]').isEnabled(),
    true,
    "the day transition button stays enabled",
  );
  assert.equal(
    await page.locator("[data-dock-quiet]").count(),
    1,
    "the day dock states the quiet state in one line",
  );
  await page.locator("[data-virgin-form] select").selectOption("1");
  await page.locator("[data-virgin-form] button").click();
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.day.execution?.cause),
    "virgin",
  );
  await page.reload();
  await page.waitForSelector(".host");
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.players["1"].name),
    "Alice",
  );

  // A public tab is read-only and updates live.
  const publicPage = await context.newPage();
  await publicPage.goto(url + "#/public");
  await publicPage.waitForSelector(".public");
  await page.evaluate(async () => {
    const store = (await window.PG_MODULES()).store;
    store.run((game) => {
      game.players["2"].alive = false;
      return { ok: true };
    });
  });
  await publicPage.waitForFunction(
    () => document.querySelector(".public-count b")?.textContent === "5",
  );
  assert.equal(await publicPage.locator(".host-role, .host-bluffs, .host-notes").count(), 0);
  await publicPage.close();

  // A bluff token opens the role card, and notes follow the store when another
  // game replaces this one.
  await openTableMenu();
  await page.locator(".host-bluffs [data-role-card]").first().click();
  assert.equal(
    await page.locator('[aria-modal="true"]').count(),
    1,
    "a bluff token opens the role card",
  );
  await page.locator('[data-act="close"]').click();
  await openTableMenu();
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const next = structuredClone(store.state);
    next.notes = "External note";
    store.replaceState(next);
  });
  await page.waitForFunction(
    () =>
      (document.querySelector("[data-notes]") as HTMLTextAreaElement | null)?.value ===
      "External note",
    undefined,
    { timeout: 3000 },
  );
  await page.locator('[data-act="close"]:visible').first().click();

  // Finish the seven-player game, including the review gate.
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const next = structuredClone(store.state);
    next.effects.push({
      id: "browser-cerenovus-review",
      kind: "madness",
      madness: "cerenovus",
      roleId: "clockmaker",
      sourceId: "6",
      targetId: "2",
      start: { phase: "night", number: 1 },
      expires: { phase: "night", number: 2 },
      active: true,
    });
    store.replaceState(next);
  });
  await page.locator('[data-act="menu"]').click();
  await page.waitForSelector('[data-madness-review] [data-madness-status="pending"]');
  assert.match(
    (await page.locator("[data-preview-reason]").textContent()) ?? "",
    /Review every active madness effect/,
    "the engine preview blocks a day with an unreviewed madness effect",
  );
  await page.locator('[data-madness-reason="2"]').fill("Player stayed convincingly mad.");
  await page.locator('[data-madness-action="none"]').click();
  await page.waitForSelector('[data-madness-review] [data-madness-status="reviewed"]');
  assert.equal(
    await page.evaluate(async () => {
      const { store } = await window.PG_MODULES();
      return store.state.effects.find((effect) => effect.id === "browser-cerenovus-review")
        ?.decidedPenalty;
    }),
    "none",
    "the Storyteller's review is stored on the madness effect",
  );
  await page.keyboard.press("Escape");
  await page.locator('[data-act="end-day"]').click();
  await finishNight();
  await page.locator('[data-seat-open="7"]').click();
  await page.waitForSelector("[data-player-sheet]");
  await page.locator('[data-act="player-execute"]').click();
  await executeNow();
  assert.equal(await page.locator(".host-review").count(), 0);
  await page.locator('[data-act="review"]').click();
  assert.equal(await page.locator(".host-review").count(), 1);

  phase("console dialogs");

  // Privacy projection and interrupted role timer cannot overwrite another route.
  await seed(7, "deal");
  await route("/player");
  assert.equal(await page.locator(".player-card").count(), 0);
  // A publish outside the screen refreshes the picker without navigation.
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const next = structuredClone(store.state);
    next.players["2"].claimed = true;
    store.replaceState(next);
  });
  await page.waitForFunction(() => document.querySelector('[data-seat="1"]') === null, undefined, {
    timeout: 3000,
  });
  await page.locator('[data-seat="0"]').click();
  assert.equal(
    await page.locator(".player-card").count(),
    1,
    "the number tap reveals the role card",
  );
  assert.equal(await page.locator(".player-role-name").count(), 1);
  await page.locator("#player-name").fill("Alice");
  await page.locator(".player-save").click();
  assert.equal(
    await page.locator(".player-card").count(),
    0,
    "the role card hides after saving the name",
  );
  assert.equal(
    await page.locator(".player-numbers").count(),
    1,
    "the number picker returns after saving the name",
  );
  await page.locator('[data-act="back"]').click();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => Boolean(document.activeElement?.closest('[aria-modal="true"]'))),
    true,
  );
  await page.locator('[data-act="back-cancel"]').click();
  await route("/help");
  await route("/player");
  await route("/bag");
  assert.equal(
    await page.locator("#return-host").count(),
    0,
    "a setup route opens without a hand-back cover",
  );
  await page.waitForSelector(".setup");

  // The seat ring follows the store for names, but a publish never replaces an
  // order the host is editing.
  await seed(7, "seat");
  await route("/seat");
  await page.waitForSelector('.seat-item[data-index="0"]');
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const next = structuredClone(store.state);
    next.players["1"].name = "Zed";
    store.replaceState(next);
  });
  await page.waitForFunction(
    () => document.querySelector('.seat-item[data-index="0"] .seat-name')?.textContent === "Zed",
    undefined,
    { timeout: 3000 },
  );
  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    const next = structuredClone(store.state);
    next.order = next.order.slice().reverse();
    store.replaceState(next);
  });
  await settled();
  assert.equal(
    (await page.locator('.seat-item[data-index="0"] .seat-name').textContent()) ?? "",
    "Zed",
    "a publish keeps the seat draft",
  );

  // Regression: dragging a seat onto another must swap them, and enter undo.
  await seed(7, "seat");
  await route("/seat");
  await page.waitForSelector('.seat-item[data-index="0"]');
  const seatNames = () =>
    page
      .locator(".seat-item .seat-name")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent));
  const beforeDrag = await seatNames();
  const beforeIds = await page.evaluate(async () =>
    (await window.PG_MODULES()).store.state.order.slice(),
  );
  assert.equal(
    await page.locator("aside .seat-actions").count(),
    0,
    "the left rail keeps no action block",
  );
  const seatRingBox = await page.locator("#seat-ring").boundingBox();
  const seatBarBox = await page.locator(".seat-actions").boundingBox();
  assert.ok(
    seatRingBox && seatBarBox && seatBarBox.y > seatRingBox.y,
    "the actions render under the ring",
  );
  assert.equal(
    await page.locator('.seat-actions a[href$="/player"]').count(),
    1,
    "one player control remains",
  );
  assert.equal(
    await page.locator('.seat-actions a[href$="/secrets"]').count(),
    0,
    "the seat screen keeps no secrets shortcut",
  );
  await page.locator("#seat-ring").scrollIntoViewIfNeeded();
  assert.equal(
    await page.locator("#seat-ring [data-table-rail]").count(),
    1,
    "the seat ring renders the table rail",
  );
  assert.equal(
    await page.locator("#seat-ring [data-table-felt]").count(),
    1,
    "the seat ring renders the table felt",
  );
  const seatFelt = await page.locator("#seat-ring [data-table-felt]").evaluate((node) => {
    const style = getComputedStyle(node);
    return { backgroundImage: style.backgroundImage, boxShadow: style.boxShadow };
  });
  assert.match(seatFelt.backgroundImage, /radial-gradient/, "the seat felt is one radial surface");
  assert.ok(seatFelt.boxShadow !== "none", "the seat felt keeps its inset depth");
  const medallions = await page.locator("[data-seat-medallion]").evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const value = style.borderTopLeftRadius;
      const round = value.endsWith("%")
        ? parseFloat(value) >= 50
        : parseFloat(value) >= box.height / 2 - 0.5;
      return { clip: style.clipPath, round, width: box.width, height: box.height };
    }),
  );
  assert.equal(medallions.length, beforeDrag.length, "every seat renders a medallion");
  assert.deepEqual(
    medallions.filter((medallion) => !medallion.round),
    [],
    "every medallion is round",
  );
  assert.deepEqual(
    medallions.filter((medallion) => medallion.clip !== "none"),
    [],
    "no medallion keeps the amber hexagon clip",
  );
  assert.equal(
    await page.locator("[data-seat-count]").innerText(),
    String(beforeDrag.length),
    "the centre count equals the rendered seats",
  );
  assert.equal(
    await page.locator("[data-seat-dead]").getAttribute("data-seat-dead"),
    "0",
    "the centre reports the dead count",
  );
  const dragFrom = await page.locator('.seat-item[data-index="0"]').boundingBox();
  const dragTo = await page.locator('.seat-item[data-index="2"]').boundingBox();
  assert.ok(dragFrom && dragTo, "the ring renders the dragged seat and the target");
  await page.mouse.move(dragFrom.x + dragFrom.width / 2, dragFrom.y + dragFrom.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragTo.x + dragTo.width / 2, dragTo.y + dragTo.height / 2, { steps: 12 });
  await page.mouse.up();
  await settled();
  assert.deepEqual(
    await seatNames(),
    [beforeDrag[2], beforeDrag[1], beforeDrag[0], ...beforeDrag.slice(3)],
    "a drag swaps the picked seat with the drop target",
  );
  assert.equal(
    await page.locator(".seat-item.is-selected").count(),
    0,
    "a drag leaves no seat selected",
  );
  assert.equal(
    (await page.locator(".seat-status").textContent())?.trim(),
    `${beforeDrag[0]} now sits at seat 3.`,
    "the drag announces the arriving player",
  );
  assert.equal(
    await page.locator('[data-act="undo"]').isDisabled(),
    false,
    "a drag enters the undo history",
  );
  await page.locator('[data-act="undo"]').click();
  assert.deepEqual(await seatNames(), beforeDrag, "undo restores the dragged order");

  // Click pairing swaps the same way and announces the arriving player.
  await page.locator('.seat-item[data-index="0"]').click();
  await page.locator('.seat-item[data-index="2"]').click();
  assert.deepEqual(
    await seatNames(),
    [beforeDrag[2], beforeDrag[1], beforeDrag[0], ...beforeDrag.slice(3)],
    "clicking two seats swaps them",
  );
  assert.equal(
    (await page.locator(".seat-status").textContent())?.trim(),
    `${beforeDrag[0]} now sits at seat 3.`,
    "the click swap announces the arriving player",
  );

  const clickedOrder = [beforeDrag[2], beforeDrag[1], beforeDrag[0], ...beforeDrag.slice(3)];

  // The history is a stack: two swaps, two undos return to the click swap.
  await page.locator('.seat-item[data-index="0"]').click();
  await page.locator('.seat-item[data-index="1"]').click();
  await page.locator('.seat-item[data-index="2"]').click();
  await page.locator('.seat-item[data-index="3"]').click();
  await page.locator('[data-act="undo"]').click();
  await page.locator('[data-act="undo"]').click();
  assert.deepEqual(await seatNames(), clickedOrder, "two undos restore two swaps");

  // Shuffle reorders the draft (retry once for the identity permutation) and
  // undo restores it.
  await page.locator('[data-act="shuffle"]').click();
  let shuffledOrder = await seatNames();
  if (JSON.stringify(shuffledOrder) === JSON.stringify(clickedOrder)) {
    await page.locator('[data-act="undo"]').click();
    await page.locator('[data-act="shuffle"]').click();
    shuffledOrder = await seatNames();
  }
  assert.notDeepEqual(shuffledOrder, clickedOrder, "shuffle reorders the draft");
  assert.equal((await page.locator(".seat-status").textContent())?.trim(), "Seats shuffled.");
  assert.equal(
    await page.locator('[data-act="undo"]').isDisabled(),
    false,
    "shuffle enters the history",
  );
  await page.locator('[data-act="undo"]').click();
  assert.deepEqual(await seatNames(), clickedOrder, "undo restores the shuffled order");

  // A language switch must not remount the screen and lose the draft.
  const seatLang = await page.evaluate(() => document.documentElement.lang);
  const otherLang = seatLang === "en" ? "ru" : "en";
  await chooseLanguage(otherLang);
  await page.waitForFunction((lang) => document.documentElement.lang === lang, otherLang);
  assert.equal(
    (await page.locator(".seat-title > span").first().textContent())?.trim(),
    otherLang === "ru" ? "Порядок мест" : "Seat order",
    "the language switch translates the screen",
  );
  await page.waitForFunction(
    (expected) =>
      JSON.stringify(
        [...document.querySelectorAll(".seat-item .seat-name")].map((node) => node.textContent),
      ) === JSON.stringify(expected),
    clickedOrder,
  );
  assert.equal(
    await page.locator('[data-act="undo"]').isDisabled(),
    false,
    "the draft and its history survive a language switch",
  );

  // The use action is the only commit; it routes to the table when the phase
  // is not "seat". The saved order must equal the order on the ring.
  const displayedNames = await seatNames();
  const displayedIds = await page.evaluate(async (names) => {
    const { store } = await window.PG_MODULES();
    const byName = new Map(
      Object.entries(store.state.players).map(([id, player]) => [player.name, id]),
    );
    return names.map((name) => byName.get(name));
  }, displayedNames);
  await page.locator('[data-act="use"]').click();
  await page.waitForFunction(() => document.body.dataset.route === "table");
  const savedOrder = await page.evaluate(async () =>
    (await window.PG_MODULES()).store.state.order.slice(),
  );
  assert.deepEqual(
    savedOrder,
    [beforeIds[2], beforeIds[1], beforeIds[0], ...beforeIds.slice(3)],
    "the use action commits the draft",
  );
  assert.deepEqual(savedOrder, displayedIds, "the saved order equals the displayed order");
  const savedSeats = await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    return store.state.order.map((id) => store.state.players[id]?.seat);
  });
  assert.deepEqual(
    savedSeats,
    displayedIds.map((_, index) => index + 1),
    "each player seat matches its position",
  );
  await route("/seat");
  await page.waitForSelector('.seat-item[data-index="0"]');
  assert.deepEqual(await seatNames(), displayedNames, "the ring shows the committed order");

  // The action dock wraps at a phone width without shrinking its controls.
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/seat");
  await page.waitForSelector('.seat-item[data-index="0"]');
  await overflow();
  const actionHeights = await page
    .locator(".seat-actions .btn")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert.equal(actionHeights.length, 4, "four actions render in the dock");
  assert.deepEqual(
    actionHeights.filter((height) => height < 44),
    [],
    "every action is at least 44 pixels high",
  );
  await route("/table");
  await seed(15, "seat");
  await route("/seat");
  await page.waitForSelector('.seat-item[data-index="0"]');
  assert.equal(await page.locator(".seat-item").count(), 15, "the ring renders fifteen seats");
  assert.equal(
    await page.locator(".seat-name:visible").count(),
    15,
    "all fifteen names stay visible on the seat ring",
  );
  await overflow();
  await page.setViewportSize({ width: 1440, height: 900 });

  phase("privacy and seat");

  // Full night/day transition at tablet size using a 12-player game.
  await page.setViewportSize({ width: 1024, height: 900 });
  await route("/table");
  await seed(12);
  await finishNight();
  await overflow();
  await page.locator('[data-act="end-day"]').click();
  await page.screenshot({ path: join(screenshots, "tablet-night.png"), fullPage: true });
  for (const lang of ["ru", "en", "az"]) {
    await chooseLanguage(lang);
    await overflow();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await overflow();
  await page.screenshot({ path: join(screenshots, "phone-az.png"), fullPage: true });

  // All production routes and locale sheets remain usable at narrow and wide sizes.
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/bag",
      "/seat",
      "/secrets",
      "/help",
      "/sheet/en",
      "/sheet/ru",
      "/sheet/az",
      "/demo",
      "/table",
    ]) {
      await page.evaluate((path) => {
        history.pushState(null, "", path);
        dispatchEvent(new PopStateEvent("popstate"));
      }, "/pocket" + path);
      const marker = { "/bag": ".setup", "/seat": ".seat-ring", "/secrets": ".secrets-head" }[path];
      if (marker) await page.waitForSelector(marker);
      await settled();
      await overflow();
    }
  }

  // App bar menu (issue #141): one burger below 1440 px so the grouped list
  // never wraps, the inline row at desktop, and the same panel on the
  // string-composed screens.
  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  await page.waitForSelector(".host");
  const menuToggle = page.locator("[data-app-bar-toggle]");
  const menuPanel = page.locator("[data-app-bar-menu]");
  assert.equal(await menuToggle.isVisible(), true, "the burger renders at 390 px");
  assert.equal(await menuPanel.isVisible(), false, "the menu starts closed");
  assert.equal(await menuToggle.getAttribute("aria-expanded"), "false");
  await menuToggle.click();
  assert.equal(await menuToggle.getAttribute("aria-expanded"), "true");
  assert.equal(await menuPanel.isVisible(), true);
  assert.equal(
    await menuPanel.locator(".lang-switch").isVisible(),
    true,
    "the language switch lives in the panel",
  );
  const menuHrefs = await menuPanel
    .locator("a")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));
  for (const name of ["table", "bag", "seat", "secrets", "player", "sheet", "public", "help"]) {
    assert.ok(
      menuHrefs.some((href) => href.endsWith("/" + name)),
      `the panel links /${name}: ${JSON.stringify(menuHrefs)}`,
    );
  }
  const gameBeforeMenu = await page.evaluate(() => localStorage.getItem("pg.game.v4"));
  await page.keyboard.press("Escape");
  assert.equal(await menuToggle.getAttribute("aria-expanded"), "false", "Escape closes the menu");
  assert.equal(await menuPanel.isVisible(), false);
  assert.equal(
    await page.evaluate(() => document.activeElement?.hasAttribute("data-app-bar-toggle")),
    true,
    "Escape returns focus to the toggle",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("pg.game.v4")),
    gameBeforeMenu,
    "the menu never writes the game",
  );
  await menuToggle.click();
  await page.evaluate(() =>
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })),
  );
  assert.equal(await menuPanel.isVisible(), false, "an outside press closes the menu");
  await menuToggle.click();
  await menuPanel.locator('a[href$="/bag"]').click();
  await page.waitForSelector(".setup");
  assert.equal(
    await page.locator("[data-app-bar-toggle]").getAttribute("aria-expanded"),
    "false",
    "the next screen starts closed",
  );
  assert.equal(await page.locator("[data-app-bar-menu]").isVisible(), false);

  await page.setViewportSize({ width: 360, height: 640 });
  await route("/table");
  await page.waitForSelector(".host");
  await page.locator("[data-app-bar-toggle]").click();
  await overflow();
  const menuRows = await page
    .locator("[data-app-bar-menu] a")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert.ok(
    menuRows.every((height) => height >= 44),
    "every menu row is 44 px: " + JSON.stringify(menuRows),
  );

  await page.setViewportSize({ width: 1024, height: 768 });
  await route("/table");
  await page.waitForSelector(".host");
  // The panel keeps its open state across a rotation, so close it first: the
  // height below measures the bar with its menu shut.
  await page.keyboard.press("Escape");
  await settled();
  assert.equal(
    await page.locator("[data-app-bar-toggle]").isVisible(),
    true,
    "1024 px keeps the list in the burger instead of wrapping it",
  );
  assert.equal(await page.locator("[data-app-bar-menu]").isVisible(), false);
  const barHeight = await page
    .locator("[data-app-bar-toggle]")
    .evaluate((node) => node.closest("header")?.clientHeight ?? 0);
  assert.ok(barHeight <= 64, "the bar stays one row at 1024 px: " + barHeight);

  await page.setViewportSize({ width: 1440, height: 900 });
  await route("/table");
  await page.waitForSelector(".host");
  assert.equal(
    await page.locator("[data-app-bar-toggle]").isVisible(),
    false,
    "no burger at desktop",
  );
  assert.equal(
    await page.locator("[data-app-bar-menu]").isVisible(),
    true,
    "the inline navigation stays visible",
  );
  assert.equal(await page.locator("[data-app-bar-menu] .lang-switch").isVisible(), true);
  assert.ok((await page.locator("[data-app-bar-menu] a").count()) >= 8);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/help", "/demo"]) {
    await route(path);
    await page.waitForSelector("#screen > *");
    assert.equal(
      await page.locator("[data-app-bar-toggle]").isVisible(),
      true,
      `${path} renders the burger`,
    );
    await page.locator("[data-app-bar-toggle]").click();
    assert.equal(
      await page.locator("[data-app-bar-menu]").isVisible(),
      true,
      `${path} opens the panel`,
    );
    assert.equal(
      await page.locator("[data-app-bar-menu] .lang-switch").isVisible(),
      true,
      `${path} keeps the language control in the panel`,
    );
    await page.keyboard.press("Escape");
    if (path === "/demo") {
      await page.locator('[data-act="next"]').click();
      await page.locator("[data-app-bar-toggle]").click();
      assert.equal(
        await page.locator("[data-app-bar-menu]").isVisible(),
        true,
        "the demo re-render keeps the menu usable",
      );
      await page.keyboard.press("Escape");
    }
  }
  await route("/help");
  await page.waitForSelector("#screen > *");
  await page.locator("[data-app-bar-toggle]").click();
  await page.locator("[data-app-bar-menu] .lang-switch").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  assert.equal(
    new URL(page.url()).pathname.endsWith("/help"),
    true,
    "the panel language change keeps the route",
  );
  await page.keyboard.press("Escape");

  await route("/public");
  await page.waitForSelector(".public");
  assert.equal(
    await page.locator("[data-app-bar-toggle]").count(),
    0,
    "the public screen has no burger",
  );
  assert.equal(await page.locator("[data-app-bar-menu]").count(), 0);
  assert.equal(await page.locator(".lang-switch").isVisible(), true);

  // Role sheet scenario selector (issue #14): edition filtering, a separate
  // Travellers toggle, language/reload persistence and game-state isolation.
  await page.setViewportSize({ width: 390, height: 844 });
  const sheetGame = await page.evaluate(async () => {
    const { KEY } = (await window.PG_MODULES()).store;
    return localStorage.getItem(KEY);
  });
  const sheetTeamCounts = () =>
    page
      .locator(".sheet-team")
      .evaluateAll((nodes) =>
        Object.fromEntries(
          nodes.map((node) => [
            node.dataset.team,
            Number(node.querySelector(".sheet-team-count")?.textContent ?? ""),
          ]),
        ),
      );
  await sheetRoute("/sheet/en");
  await page.waitForSelector(".sheet-page");
  assert.equal(
    await page.locator('[data-scenario="tb"]').getAttribute("aria-pressed"),
    "true",
    "the sheet defaults to the active Trouble Brewing game",
  );
  assert.equal(await page.locator(".sheet-role").count(), 22, "Trouble Brewing shows its 22 roles");
  assert.deepEqual(await sheetTeamCounts(), { townsfolk: 13, outsider: 4, minion: 4, demon: 1 });
  assert.equal(
    await page.locator(".sheet-team[data-team='traveller']").count(),
    0,
    "Travellers stay out of the scenario count",
  );
  assert.match(
    (await page.locator("[data-sheet-summary]").textContent()) ?? "",
    /Trouble Brewing · 22 roles/,
  );
  const composition = () =>
    page
      .locator("[data-sheet-composition] tbody tr")
      .evaluateAll((rows) =>
        Object.fromEntries(
          rows.map((row) => [
            row.dataset.team,
            [...row.querySelectorAll("td")].map((cell) => Number(cell.textContent)),
          ]),
        ),
      );
  assert.deepEqual(
    await composition(),
    {
      townsfolk: [3, 3, 5, 5, 5, 7, 7, 7, 9, 9, 9],
      outsider: [0, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2],
      minion: [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
      demon: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    "the sheet shows the official 5 to 15 player composition",
  );
  await overflow();

  await page.locator('[data-scenario="bmr"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".sheet-role").length === 25);
  assert.deepEqual(await sheetTeamCounts(), { townsfolk: 13, outsider: 4, minion: 4, demon: 4 });
  assert.equal(
    await page.locator('[data-role-id="mayor"]').count(),
    0,
    "Trouble Brewing roles leave the Bad Moon Rising sheet",
  );
  assert.equal(await page.locator('[data-role-id="chambermaid"]').count(), 1);
  assert.match(
    (await page.locator("[data-sheet-summary]").textContent()) ?? "",
    /Bad Moon Rising · 25 roles/,
  );
  await overflow();

  await page.locator('[data-scenario="snv"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".sheet-role").length === 25);
  assert.deepEqual(await sheetTeamCounts(), { townsfolk: 13, outsider: 4, minion: 4, demon: 4 });
  assert.equal(await page.locator('[data-role-id="clockmaker"]').count(), 1);
  assert.equal(await page.locator('[data-role-id="chambermaid"]').count(), 0);
  assert.match(
    (await page.locator("[data-sheet-summary]").textContent()) ?? "",
    /Sects and Violets · 25 roles/,
  );

  await page.locator('[data-scenario="all"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".sheet-role").length === 72);
  assert.deepEqual(await sheetTeamCounts(), { townsfolk: 39, outsider: 12, minion: 12, demon: 9 });
  assert.equal(await page.locator('[data-role-id="mayor"]').count(), 1);
  assert.equal(await page.locator("[data-travellers]").getAttribute("aria-pressed"), "false");

  // Native buttons keep the filter keyboard-operable.
  await page.locator('[data-scenario="tb"]').focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.querySelectorAll(".sheet-role").length === 22);
  assert.equal(await page.locator('[data-scenario="tb"]').getAttribute("aria-pressed"), "true");

  // Travellers are a separate, explicitly labelled section, not a fifth team.
  await page.locator("[data-travellers]").click();
  await page.waitForSelector(".sheet-travellers");
  assert.equal(
    await page.locator(".sheet-sections > .sheet-team").count(),
    4,
    "Travellers are not mixed into the scenario teams",
  );
  assert.equal(
    (await page.locator(".sheet-travellers .sheet-team-count").textContent()) ?? "",
    "5",
  );
  assert.equal(await page.locator(".sheet-travellers .sheet-role").count(), 5);
  assert.match(
    (await page.locator(".sheet-travellers-note").textContent()) ?? "",
    /Outside the selected scenario/,
  );
  assert.equal(await page.locator("[data-travellers]").getAttribute("aria-pressed"), "true");
  await overflow();

  // The app bar menu is the only navigation surface: the sheet header carries
  // no route link and no language control of its own (issue #151).
  assert.equal(
    await page.locator(".sheet-head a").count(),
    0,
    "the sheet header repeats no navigation",
  );
  await page.locator("[data-app-bar-toggle]").click();
  await page.locator("[data-app-bar-menu]").waitFor({ state: "visible" });
  assert.equal(
    await page.locator('[data-app-bar-menu] a[href$="/table"]').count(),
    1,
    "the panel carries the table link",
  );
  assert.equal(
    await page.locator('[data-app-bar-menu] a[href$="/help"]').count(),
    1,
    "the panel carries the Help link",
  );
  assert.equal(
    await page.locator("[data-app-bar-menu] .lang-switch").isVisible(),
    true,
    "the panel carries the language control",
  );
  await page.keyboard.press("Escape");

  // Language switching and reload keep both preferences.
  await page.locator('[data-scenario="bmr"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll(".sheet-sections > .sheet-team").length === 4,
  );
  for (const [lang, allLabel, travellersLabel] of [
    ["ru", "Все сценарии", "Странники"],
    ["az", "Bütün ssenarilər", "Səyahətçilər"],
  ]) {
    await chooseLanguage(lang);
    await page.waitForFunction(
      (code) =>
        document.documentElement.lang === code && location.pathname.endsWith("/sheet/" + code),
      lang,
    );
    assert.equal(
      await page.locator('[data-scenario="bmr"]').getAttribute("aria-pressed"),
      "true",
      `the scenario survives ${lang}`,
    );
    assert.equal(
      await page.locator("[data-travellers]").getAttribute("aria-pressed"),
      "true",
      `the Travellers toggle survives ${lang}`,
    );
    assert.match(
      (await page.locator('[data-scenario="all"]').textContent()) ?? "",
      new RegExp(allLabel),
    );
    assert.match(
      (await page.locator("[data-travellers]").textContent()) ?? "",
      new RegExp(travellersLabel),
    );
    assert.equal(await page.locator(".sheet-role").count(), 30, "25 BMR + 5 Travellers");
    await overflow();
  }
  await page.reload();
  await page.waitForSelector(".sheet-page");
  await page.waitForFunction(() => document.body.dataset.route === "sheet");
  assert.equal(
    await page.locator('[data-scenario="bmr"]').getAttribute("aria-pressed"),
    "true",
    "the scenario survives a reload",
  );
  assert.equal(
    await page.locator("[data-travellers]").getAttribute("aria-pressed"),
    "true",
    "the Travellers toggle survives a reload",
  );
  assert.equal(await page.locator(".sheet-role").count(), 30);
  await overflow();

  // The filter is a UI preference: the saved game stays byte-for-byte intact.
  assert.equal(
    await page.evaluate(async () => {
      const { KEY } = (await window.PG_MODULES()).store;
      return localStorage.getItem(KEY);
    }),
    sheetGame,
    "the sheet filter must not write the saved game",
  );
  assert.equal(await page.evaluate(() => localStorage.getItem("pg.sheetScenario")), "bmr");

  // Native sheet: role counts per language, the Travellers section, route
  // disposal in both directions and no write to the saved game.
  for (const code of ["ru", "en", "az"]) {
    // The sheet reads the scenario preference at mount; leave the route so it
    // remounts with the preference set below.
    await route("/table");
    await page.evaluate(() => {
      localStorage.setItem("pg.sheetScenario", "all");
      localStorage.setItem("pg.sheetTravellers", "false");
    });
    await sheetRoute(`/sheet/${code}`);
    await page.waitForSelector(".sheet-page");
    await page.waitForFunction((lang) => document.documentElement.lang === lang, code);
    await page.waitForFunction(() => document.querySelectorAll(".sheet-role").length === 72);
    assert.equal(
      await page.locator(".sheet-sections > .sheet-team").count(),
      4,
      `${code}: four standard teams`,
    );
    assert.equal(
      await page.locator(".sheet-travellers").count(),
      0,
      `${code}: Travellers start hidden`,
    );
    assert.equal(await page.locator("[data-travellers]").getAttribute("aria-pressed"), "false");
    await page.locator("[data-travellers]").click();
    await page.waitForSelector(".sheet-travellers");
    assert.equal(
      await page.locator(".sheet-travellers .sheet-role").count(),
      15,
      `${code}: every scenario's five Travellers`,
    );
    assert.equal(
      await page.locator(".sheet-role").count(),
      87,
      `${code}: 72 standard roles and 15 Travellers`,
    );
    assert.equal(
      await page.locator(".sheet-sections > .sheet-team").count(),
      4,
      `${code}: Travellers stay separate`,
    );
    await sheetLegibility([320, 360, 390, 768, 1280, 1440], 87);
    await page.setViewportSize({ width: 390, height: 844 });
    await settled();
    await overflow();
  }
  assert.equal(
    await page.evaluate(async () => {
      const { KEY } = (await window.PG_MODULES()).store;
      return localStorage.getItem(KEY);
    }),
    sheetGame,
    "the native sheet never writes the saved game",
  );

  await sheetRoute("/sheet/en");
  await page.waitForSelector(".sheet-page");
  await route("/table");
  await page.waitForSelector(".host");
  assert.equal(await page.locator(".sheet-page").count(), 0, "leaving the sheet unmounts it");
  await sheetRoute("/sheet/en");
  await page.waitForSelector(".sheet-page");
  assert.equal(await page.locator(".host").count(), 0, "the sheet disposes the previous screen");

  // One stylesheet ships from the origin, and the document surface still
  // carries the pre-migration typography. The per-element comparison against
  // the recorded baseline lives in scripts/style-parity.ts.
  await route("/table");
  await page.waitForSelector(".host");
  assert.equal(
    await page.evaluate(() => document.querySelectorAll("link[rel='stylesheet']").length),
    1,
    "the document loads one stylesheet",
  );
  const surface = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return {
      fontSize: body.fontSize,
      lineHeight: body.lineHeight,
      fontFamily: body.fontFamily,
      margin: body.margin,
    };
  });
  assert.equal(surface.fontSize, "14px", "the body font size is unchanged");
  assert.equal(surface.lineHeight, "20.3px", "the body line height is unchanged");
  assert.match(surface.fontFamily, /Inter/, "the body font family is unchanged");
  assert.equal(surface.margin, "0px", "the base layer keeps the margin reset");

  // Shared dialog contract: focus in, Escape, overlay and close control,
  // focus restore, accessible name, aria-modal and a 390 px viewport.
  await page.evaluate(async () => {
    const container = document.createElement("div");
    container.id = "dialog-probe";
    container.style.cssText = "position:fixed;left:4px;top:4px;z-index:900";
    document.body.append(container);
    window.__dialogProbe = (await window.PG_MODULES()).probe.mountDialogProbe(container);
  });
  const dialog = page.locator("[role='dialog']");
  await page.locator("#probe-open").click();
  await dialog.waitFor();
  assert.equal(
    await dialog.getAttribute("aria-modal"),
    "true",
    "the dialog is modal for assistive technology",
  );
  assert.equal(
    await page.evaluate(() => {
      const element = document.querySelector("[role='dialog']");
      const labelledBy = element?.getAttribute("aria-labelledby");
      return labelledBy ? (document.getElementById(labelledBy)?.textContent ?? null) : null;
    }),
    "Probe dialog",
    "the dialog has an accessible name",
  );
  assert.equal(
    await page.evaluate(
      () => document.querySelector("[role='dialog']")?.contains(document.activeElement) ?? false,
    ),
    true,
    "focus moves inside the dialog",
  );
  const dialogBox = await dialog.boundingBox();
  assert.ok(
    dialogBox && dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= 390,
    "the dialog fits a 390 px viewport: " + JSON.stringify(dialogBox),
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.id === "probe-open", undefined, {
    timeout: 2000,
  });
  await page.locator("#probe-open").click();
  await dialog.waitFor();
  await page.locator("[data-shell-overlay]").click({ position: { x: 380, y: 4 } });
  await dialog.waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.id === "probe-open", undefined, {
    timeout: 2000,
  });
  await page.locator("#probe-open").click();
  await dialog.waitFor();
  await page.getByRole("button", { name: "Close probe" }).click();
  await dialog.waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.id === "probe-open", undefined, {
    timeout: 2000,
  });
  await page.evaluate(() => {
    window.__dialogProbe?.();
    document.getElementById("dialog-probe")?.remove();
    delete window.__dialogProbe;
  });

  const saved = await page.evaluate(async () => {
    const { KEY } = (await window.PG_MODULES()).store;
    return localStorage.getItem(KEY);
  });
  await route("/demo");
  for (let i = 0; i < 20 && (await page.locator('[data-act="next"]:not(:disabled)').count()); i++) {
    await page.locator('[data-act="next"]').click();
  }
  assert.equal(
    await page.evaluate(async () => {
      const { KEY } = (await window.PG_MODULES()).store;
      return localStorage.getItem(KEY);
    }),
    saved,
    "demo must not change the saved game",
  );
  await route("/table");

  phase("routes and sheet");

  // Project-subpath offline bootstrap, including dynamically imported engine modules.
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.active,
    { timeout: 30000 },
  );
  await page.reload();
  await page.waitForSelector(".host");
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector(".host");
  await chooseLanguage("en");
  assert.equal(await page.locator("[data-table-stage]").count(), 1);
  await finishNight();
  await page.locator('[data-seat-open="12"]').click();
  await page.waitForSelector("[data-player-sheet]");
  await page.locator('[data-act="player-execute"]').click();
  await executeNow();
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.players["11"].roleId),
    "imp",
  );
  await page.locator('[data-act="end-day"]').click();
  await finishNight();
  await page.locator('[data-seat-open="11"]').click();
  await page.waitForSelector("[data-player-sheet]");
  await page.locator('[data-act="player-execute"]').click();
  await executeNow();
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.winner?.team),
    "good",
  );
  await context.setOffline(false);

  // Fast update (issue #156): the app checks for a deploy as soon as it opens,
  // applies what that check installs without a prompt, and never lets a failed
  // save hold the update back. A deploy found while the page stays open keeps
  // the prompt.
  const swSource = await readFile(join(dist, "sw.js"), "utf8");
  const baseCache = /const CACHE = "([^"]+)";/.exec(swSource)![1];
  const versionSource = (cache: string) => swSource.replace(baseCache, cache);
  const nextCache = "pg-static-browsercheck-v2";
  const thirdCache = "pg-static-browsercheck-v3";
  const fourthCache = "pg-static-browsercheck-v4";
  const fifthCache = "pg-static-browsercheck-v5";
  // An automatic reload can destroy the document mid-read, so both readers retry
  // until the page settles.
  const readPage = async <T>(target: Page, read: () => Promise<T> | T): Promise<T> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        return await target.evaluate(read);
      } catch {
        // Deliberate: retry after a reload that destroyed the reading document.
        await target.waitForTimeout(200);
      }
    }
    throw new Error("the page kept navigating");
  };
  const workerVersion = (target: Page = page): Promise<string | null> =>
    readPage(
      target,
      () =>
        new Promise<string | null>((done) => {
          const controller = navigator.serviceWorker.controller;
          if (!controller) {
            done(null);
            return;
          }
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => done(event.data && event.data.version);
          controller.postMessage({ type: "GET_VERSION" }, [channel.port2]);
          setTimeout(() => done(null), 2000);
        }),
    );
  const loadCount = (target = page) =>
    readPage(target, () => Number(sessionStorage.getItem("pg-test-loads") || "0"));
  // Publish a worker without asking the page to look for it: only the opening
  // check can find this one.
  const publish = (cache: string) => {
    releaseOverride = versionSource(cache);
  };
  const deploy = async (cache: string) => {
    publish(cache);
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg!.update();
    });
    await page.waitForFunction(
      async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
      { timeout: 20000 },
    );
    await page.waitForSelector("#update-banner:not([hidden])");
  };
  const waitForLoads = (target: Page, expected: number) =>
    target.waitForFunction(
      (count) => Number(sessionStorage.getItem("pg-test-loads") || "0") >= count,
      expected,
      { timeout: 30000 },
    );
  // Waits until the page runs `cache` and stops reloading. The controller can
  // report the new version on the document that activated it, before the reload
  // that follows lands, so the load count must hold still as well.
  const settle = async (target: Page, cache: string) => {
    let stable = 0;
    let previous = -1;
    let lastVersion: string | null = null;
    let lastLoads: number | null = null;
    // A cold CI runner can spend half a minute on the worker swap and the
    // reload that follows it, so the window is generous; the contract (the
    // page runs `cache` and stops reloading) is unchanged.
    let reloadedAfterFailure = false;
    for (let attempt = 0; attempt < 450; attempt += 1) {
      if (!reloadedAfterFailure && attempt > 30) {
        const banner = await target
          .evaluate(() => document.getElementById("update-banner")?.dataset.state ?? null)
          .catch(() => null);
        if (banner === "activateFailed") {
          // The banner tells the user to reload and try again; do exactly that
          // once before reporting a stuck activation.
          reloadedAfterFailure = true;
          await target.reload().catch(() => {});
          previous = -1;
          stable = 0;
          continue;
        }
      }
      let version: string | null = null;
      let loads: number | null = null;
      try {
        version = await workerVersion(target);
        loads = await loadCount(target);
      } catch {
        /* a navigation is in flight */
      }
      if (version !== null) lastVersion = version;
      if (loads !== null) lastLoads = loads;
      if (version === cache && loads !== null && loads === previous) {
        stable += 1;
        if (stable >= 2) return loads;
      } else {
        stable = 0;
      }
      if (loads !== null) previous = loads;
      // Deliberate: poll until the load count holds still.
      await target.waitForTimeout(200);
    }
    let diagnosis = "state unavailable";
    try {
      diagnosis = JSON.stringify(
        await target.evaluate(async () => ({
          waiting: !!(await navigator.serviceWorker.getRegistration())?.waiting,
          controller: navigator.serviceWorker.controller?.state ?? null,
          caches: await caches.keys(),
          banner: document.getElementById("update-banner")?.dataset.state ?? null,
          bannerHidden: document.getElementById("update-banner")?.hidden ?? null,
          message: document.getElementById("update-message")?.textContent ?? null,
          visibility: document.visibilityState,
        })),
      );
    } catch {
      /* the page was still navigating */
    }
    throw new Error(
      `the page never settled on ${cache}; last worker ${lastVersion}, loads ${lastLoads}, ${diagnosis}`,
    );
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await route("/table");
  await seed(7);
  await chooseLanguage("en");
  assert.equal(
    await page.locator("#update-banner").isVisible(),
    false,
    "no prompt without a waiting worker",
  );
  assert.equal(await workerVersion(), baseCache);

  // Offline clients keep running the cached app; returning online checks again.
  await context.setOffline(true);
  await page.waitForFunction(() => navigator.onLine === false);
  publish(nextCache);
  // Deliberate: an offline client must not install a worker within this window.
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
    false,
    "an offline client cannot install a new worker",
  );
  await context.setOffline(false);
  await page.waitForFunction(() => navigator.onLine === true);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
    { timeout: 15000 },
  );
  await page.waitForSelector("#update-banner:not([hidden])");
  assert.match((await page.locator("#update-message").textContent()) ?? "", /update is ready/i);
  assert.equal(
    await workerVersion(),
    baseCache,
    "an installed update does not replace the running code",
  );
  const cachesDuringInstall = await page.evaluate(() => caches.keys());
  assert.ok(
    cachesDuringInstall.includes(baseCache),
    "the old cache remains active before confirmation",
  );
  assert.ok(cachesDuringInstall.includes(nextCache), "the new version is precached independently");
  await page.screenshot({ path: join(screenshots, "update-available-phone.png"), fullPage: true });

  // Later keeps the running code and the waiting worker.
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.locator("#update-later").click();
  assert.equal(await page.locator("#update-banner").isVisible(), false);
  // Deliberate: Later must not reload the running document at any point in this window.
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => performance.timeOrigin),
    timeOrigin,
    "Later must not reload",
  );
  assert.equal(await workerVersion(), baseCache);
  assert.equal(
    await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
    true,
  );

  // Opening the page applies the waiting worker with no prompt. The browser can
  // activate it during the reload, before the new document exists, so the page
  // replaces itself at most once and the result is what gets asserted.
  const loadsBeforeOpen = await loadCount();
  await page.reload();
  const openingLoadCount = await settle(page, nextCache);
  await page.waitForSelector(".host");
  const openingLoads = openingLoadCount - loadsBeforeOpen;
  assert.ok(
    openingLoads >= 1 && openingLoads <= 2,
    `the opening load replaces itself at most once; loads ${openingLoads}`,
  );
  assert.equal(
    await page.locator("#update-banner").isVisible(),
    false,
    "an automatic update shows no prompt",
  );
  const cachesAfterUpdate = await page.evaluate(() => caches.keys());
  assert.ok(cachesAfterUpdate.includes(nextCache));
  assert.ok(!cachesAfterUpdate.includes(baseCache), "activation prunes the previous cache");
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.players["1"].name),
    "Alice",
    "the saved game survives an automatic update",
  );

  // The opening check finds a deploy the page never asked about, without the
  // 30-minute throttle the old check waited for.
  const loadsBeforeCheck = await loadCount();
  publish(thirdCache);
  await page.reload();
  const checkLoadCount = await settle(page, thirdCache);
  await page.waitForSelector(".host");
  const checkLoads = checkLoadCount - loadsBeforeCheck;
  assert.ok(
    checkLoads >= 1 && checkLoads <= 2,
    `the opening check installs without a prompt; loads ${checkLoads}`,
  );
  assert.equal(await page.locator("#update-banner").isVisible(), false);

  // A deploy found while the page stays open waits for the host.
  await deploy(fourthCache);
  const loadsBeforeApply = await loadCount();
  // Deliberate: a deploy found while the page stays open must not reload by itself.
  await page.waitForTimeout(500);
  assert.equal(await loadCount(), loadsBeforeApply, "a later deploy does not reload by itself");
  assert.equal(
    await workerVersion(),
    thirdCache,
    "a later deploy does not replace the running code",
  );

  // A page still running the previous page code asks the waiting worker for its
  // save preflight before it sends SKIP_WAITING. The worker answers, so one
  // rollout covers clients that predate the fast-update change.
  assert.deepEqual(
    await page.evaluate(
      () =>
        new Promise((done) => {
          navigator.serviceWorker.getRegistration().then((reg) => {
            const worker = reg && reg.waiting;
            if (!worker) {
              done("no waiting worker");
              return;
            }
            const channel = new MessageChannel();
            const timer = setTimeout(() => done("no reply"), 5000);
            channel.port1.onmessage = (event) => {
              clearTimeout(timer);
              done(event.data);
            };
            worker.postMessage({ type: "PREPARE_UPDATE" }, [channel.port2]);
          });
        }),
    ),
    { ok: true, failed: 0, unconfirmed: 0 },
    "a page on the previous page code still gets a preflight reply",
  );

  // A window that cannot save must not hold the update back. The unsaved note is
  // lost, which this change accepts.
  await page.evaluate(async () => {
    const { KEY, state } = (await window.PG_MODULES()).store;
    state.notes = "Unsaved update note";
    window.__pgSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === KEY) throw new Error("Quota exceeded");
      return window.__pgSetItem!.call(this, key, value);
    };
  });
  await page.locator("#update-now").click();
  await waitForLoads(page, loadsBeforeApply + 1);
  await page.waitForSelector(".host");
  // Deliberate: activation after a failed save is asynchronous and must finish here.
  await page.waitForTimeout(600);
  assert.equal(await workerVersion(), fourthCache, "a failed save does not stop activation");
  assert.equal(await page.locator("#update-banner").isVisible(), false);
  assert.notEqual(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.notes),
    "Unsaved update note",
    "the unsaved note is gone, as this change accepts",
  );
  await page.evaluate(() => {
    if (!window.__pgSetItem) return;
    Storage.prototype.setItem = window.__pgSetItem;
    delete window.__pgSetItem;
  });

  // Two windows reload once each, with no save coordination between them.
  const publicTab = await context.newPage();
  await publicTab.goto(url + "#/public");
  await publicTab.waitForSelector(".public");
  await deploy(fifthCache);
  await publicTab.waitForSelector("#update-banner:not([hidden])");
  const hostLoads = await loadCount();
  const publicLoads = await loadCount(publicTab);
  await page.locator("#update-now").click();
  await waitForLoads(page, hostLoads + 1);
  await page.waitForSelector(".host");
  await waitForLoads(publicTab, publicLoads + 1);
  await publicTab.waitForSelector(".public");
  // Deliberate: both windows get this window to prove each reloads exactly once.
  await page.waitForTimeout(1200);
  assert.equal(await loadCount(), hostLoads + 1, "the applying window reloads exactly once");
  assert.equal(
    await loadCount(publicTab),
    publicLoads + 1,
    "the other window reloads exactly once",
  );
  assert.equal(await workerVersion(), fifthCache, "the new worker controls the reloaded app");
  assert.equal(await workerVersion(publicTab), fifthCache, "every window runs the new worker");
  await publicTab.close();

  // The pre-#11 client scenario needed the unbundled source tree. The worker
  // protocol it exercised (activation, cache pruning) is covered by
  // src/infrastructure/offline/offline-worker.test.ts, and the game survival of
  // an update is asserted above.
  releaseOverride = null;

  phase("offline and update");

  // Issue #46 — phone acceptance. A blank profile, no config file and no saved
  // bag registry: every screen from setup to the finale is reached by tapping
  // visible controls at 360x640 and 640x360, and each screen keeps its document
  // width and every link/button inside the viewport, unclipped and at least
  // 44x44.
  const auditPhone = async (tab: Page, screen: string, route: string) => {
    const detail = await tab.evaluate(() => {
      const viewport = innerWidth;
      const visible = (el: HTMLElement) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const describe = (el: HTMLElement) =>
        `${el.tagName.toLowerCase()} ${el.dataset.act || el.dataset.panel || ""} ${(el.textContent || "").trim().slice(0, 24)}`;
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          '#screen a[href], #screen button, #screen [role="button"]',
        ),
      ].filter(visible);
      const outside = [];
      const undersized = [];
      const clipped = [];
      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (rect.left < -0.5 || rect.right > viewport + 0.5)
          outside.push(`${describe(control)} [${Math.round(rect.left)},${Math.round(rect.right)}]`);
        if (Math.round(rect.width) < 44 || Math.round(rect.height) < 44)
          undersized.push(
            `${describe(control)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        for (
          let parent = control.parentElement;
          parent && parent !== document.body;
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent);
          if (style.overflowX !== "hidden" && style.overflowX !== "clip") continue;
          const box = parent.getBoundingClientRect();
          if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5)
            clipped.push(
              `${describe(control)} clipped by .${String(parent.className).slice(0, 40)}`,
            );
          break;
        }
      }
      return {
        route: document.body.dataset.route,
        viewport,
        scrollWidth: document.documentElement.scrollWidth,
        outside,
        undersized,
        clipped,
      };
    });
    assert.equal(detail.route, route, `${screen}: route`);
    assert.equal(
      detail.scrollWidth <= detail.viewport,
      true,
      `${screen}: horizontal overflow ${JSON.stringify(detail)}`,
    );
    assert.deepEqual(detail.outside, [], `${screen}: controls outside the viewport`);
    assert.deepEqual(detail.undersized, [], `${screen}: controls below 44px`);
    assert.deepEqual(
      detail.clipped,
      [],
      `${screen}: controls clipped by an overflow-hidden ancestor`,
    );
  };

  const fillPhoneSecrets = async (tab: Page) => {
    // The screen opens one obligation at a time, so the helper visits each
    // index item. The pair must include the player who really holds the role
    // named by the block heading; the Drunk-mask editor reuses the same slot,
    // so it must be filled through the heading too.
    const openObligation = async (id: string) => {
      const button = tab.locator(`[data-obligation="${id}"]`);
      if (!(await button.count())) return;
      await button.click();
      await settled(tab);
    };
    const obligationIds = await tab
      .locator("[data-obligation]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-obligation") || ""));
    for (const id of obligationIds) {
      if (!id) continue;
      await openObligation(id);
      const block = tab.locator(".secrets-info").first();
      if (!(await block.count())) continue;
      const roleSelect = block.locator("select[data-info-role]");
      if (!(await roleSelect.count())) continue;
      const heading = (
        await block
          .locator("h2")
          .innerText()
          .catch(() => "")
      ).trim();
      if (heading.includes(":")) continue;
      const pairA = block.locator('select[data-player^="pair-a"]');
      const pairB = block.locator('select[data-player^="pair-b"]');
      let roleValue = await roleSelect.inputValue();
      if (!roleValue) {
        const firstRole = await roleSelect
          .locator("option")
          .evaluateAll(
            (nodes) =>
              (
                nodes.find((node) => (node as HTMLOptionElement).value) as
                  | HTMLOptionElement
                  | undefined
              )?.value ?? "",
          );
        if (!firstRole) continue;
        await roleSelect.selectOption(firstRole);
        await settled(tab);
        roleValue = firstRole;
      }
      const currentA = await pairA.inputValue();
      const currentB = await pairB.inputValue().catch(() => "");
      if (currentA && currentB) continue;
      const roleText = await roleSelect
        .locator("option:checked")
        .innerText()
        .catch(() => "");
      const options = await pairA.locator("option").evaluateAll((nodes) =>
        nodes.map((node) => ({
          value: (node as HTMLOptionElement).value,
          text: node.textContent?.trim() ?? "",
        })),
      );
      const trueRole = options.find((option) => option.value && option.text.includes(roleText));
      const first = trueRole?.value ?? options.find((option) => option.value)?.value ?? "";
      const second = options.find((option) => option.value && option.value !== first)?.value ?? "";
      if (first) await pairA.selectOption(first);
      await settled(tab);
      if (second) await pairB.selectOption(second);
      await settled(tab);
    }
    await openObligation("herring");
    const herring = tab.locator("select[data-herring]");
    if (await herring.count()) {
      const good = await herring
        .locator("option")
        .evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLOptionElement).value).filter(Boolean),
        );
      if (good.length) await herring.selectOption(good[0]);
    }
  };

  const finishPhoneNight = async (tab: Page) => {
    for (let guard = 0; guard < 40; guard += 1) {
      if (await tab.locator('[data-act="end-night"]').count()) return;
      const targets = tab.locator("[data-target]:not(:disabled)");
      if (await targets.count()) {
        const mode = await tab.evaluate(async () => {
          const { state } = (await window.PG_MODULES()).store;
          const { currentStep } = (await window.PG_MODULES()).engine;
          return currentStep(state)?.targetMode ?? "one";
        });
        const need = mode === "two" ? 2 : mode === "none" ? 0 : 1;
        const pressed = await tab.locator('[data-target][aria-pressed="true"]').count();
        // Select only the missing targets: a second click on a chosen seat
        // would clear it for a one-target step.
        const free = tab.locator('[data-target]:not(:disabled)[aria-pressed="false"]');
        // The sticky app bar can cover a seat scrolled to the stage top, and a
        // forced mouse click still lands on the bar. Dispatch to the control.
        for (let index = pressed; index < need; index += 1) {
          if (await free.count()) {
            await free.first().evaluate((node) => (node as HTMLElement).click());
          }
        }
        await settled(tab);
      }
      const given = tab.locator("select[data-given]:visible");
      if (await given.count()) {
        const value = await given
          .locator("option")
          .evaluateAll(
            (nodes) =>
              (
                nodes.find((node) => (node as HTMLOptionElement).value) as
                  | HTMLOptionElement
                  | undefined
              )?.value,
          );
        if (value) await given.selectOption(value);
      }
      const complete = tab.locator('[data-act="complete"]:visible');
      if ((await complete.count()) && (await complete.first().isEnabled())) {
        await complete.first().click();
        await tab
          .locator("[data-step-sheet]:visible")
          .waitFor({ timeout: 2000 })
          .catch(() => {});
        await settled(tab);
        const sheetGiven = tab.locator("select[data-given]:visible");
        if (await sheetGiven.count()) {
          const value = await sheetGiven
            .locator("option")
            .evaluateAll(
              (nodes) =>
                (
                  nodes.find((node) => (node as HTMLOptionElement).value) as
                    | HTMLOptionElement
                    | undefined
                )?.value,
            );
          if (value) await sheetGiven.selectOption(value);
        }
        const confirm = tab.locator('[data-act="step-confirm"]:visible');
        if (await confirm.count()) {
          if (await confirm.first().isEnabled()) await confirm.first().click();
          else {
            const blocked = await tab.evaluate(async () => {
              const { state } = (await window.PG_MODULES()).store;
              const { currentStep } = (await window.PG_MODULES()).engine;
              const step = currentStep(state);
              return {
                role: step && (step.roleId || step.system),
                mode: step && step.targetMode,
                blockers: [...document.querySelectorAll("[data-blocker-reason]")].map(
                  (node) => (node as HTMLElement).dataset.blockerReason,
                ),
                given: Boolean(document.querySelector("select[data-given]")),
                pressed: document.querySelectorAll('[data-target][aria-pressed="true"]').length,
                targets: document.querySelectorAll("[data-target]").length,
                phase: state.phase,
                seats: document.querySelectorAll("[data-seat-open]").length,
              };
            });
            throw new Error("phone confirm blocked: " + JSON.stringify(blocked));
          }
        }
      } else {
        await advanceFixtureStep(tab);
      }
      await settled(tab);
    }
    throw new Error("the phone night did not end");
  };

  const walkPhone = async ({ width, height }: { height: number; width: number }) => {
    const label = `phone ${width}x${height}`;
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: true,
      isMobile: true,
    });
    // Same test-mode probe as the default context: the walk reads the current
    // step's target mode and the Imp's id, and every transition is still a tap.
    await context.addInitScript(() => {
      // The page resolves this specifier at runtime; the harness never bundles it.
      window.PG_MODULES = () => import(String("/pocket/test-entry.js"));
    });
    const tab = await context.newPage();
    tab.on("pageerror", (error) => errors.push(error.message));
    try {
      const visited: string[] = [];
      const record = async (screen: string, route: string) => {
        await auditPhone(tab, `${label} ${screen}`, route);
        visited.push(screen);
      };

      await tab.goto(url + "table");
      await tab.waitForSelector("#screen > *");
      // No configuration or saved-bag registry: a new profile may hold only
      // the language preference before the first interaction.
      assert.deepEqual(
        await tab.evaluate(() => Object.keys(localStorage).sort()),
        ["pg.lang"],
        `${label}: a clean profile holds no config or registry`,
      );
      await record("setup", "table");

      await tab.locator('#screen a[href$="/bag"]:visible').first().click();
      await tab.waitForSelector(".setup");
      await record("bag", "bag");
      await tab.locator(".bag-preset-card [data-apply]").first().click();
      await tab.waitForFunction(
        () => !(document.querySelector('[data-act="deal"]') as HTMLButtonElement | null)?.disabled,
      );
      await tab.locator('[data-act="deal"]').click();
      await tab.waitForSelector(".player-view");
      await record("player", "player");

      for (let guard = 0; guard < 20; guard += 1) {
        const seat = tab.locator("[data-seat]").first();
        if (!(await seat.count())) break;
        await seat.click();
        await tab.waitForSelector(".player-card");
        await tab.locator("#player-name").fill(`Player ${guard + 1}`);
        await tab.locator(".player-save").click();
        await tab.waitForFunction(() => document.querySelector(".player-card") === null);
      }
      assert.equal(await tab.locator("[data-seat]").count(), 0, `${label}: every seat is claimed`);
      await tab.locator('[data-act="to-seat"]').click();
      await tab.waitForSelector(".seat-ring");
      await record("seat", "seat");

      await tab.locator('[data-act="use"]').click();
      await tab.waitForSelector(".secrets");
      await record("secrets", "secrets");
      await fillPhoneSecrets(tab);
      await tab.waitForSelector('[data-act="start"]:not([disabled])');
      await tab.locator('[data-act="start"]').click();
      await tab.waitForSelector('[data-table-dock][data-phase="night"]');
      await record("night", "table");

      await finishPhoneNight(tab);
      await tab.locator('[data-act="end-night"]').click();
      await tab.waitForSelector('[data-table-dock][data-phase="day"]');
      await record("day", "table");

      // The host knows the Imp and executes it, which ends the game in a good
      // victory; the choice is still made through the day card's select.
      const demonId = await tab.evaluate(async () => {
        const { store } = await window.PG_MODULES();
        return (
          Object.values(store.state.players).find((player) => player.roleId === "imp")?.id ?? null
        );
      });
      assert.ok(demonId, `${label}: the dealt bag contains the Imp`);
      assert.equal(
        await tab.locator(`[data-seat-open="${demonId}"]`).count(),
        1,
        `${label}: the Imp is an execution target ${JSON.stringify(
          await tab.evaluate(async () => {
            const { state } = (await window.PG_MODULES()).store;
            const table = document.querySelector("[data-game-table]");
            const box = table?.getBoundingClientRect();
            return {
              phase: state.phase,
              players: Object.keys(state.players).length,
              order: state.order.length,
              seats: document.querySelectorAll("[data-seat-open]").length,
              table: box ? [Math.round(box.width), Math.round(box.height)] : null,
            };
          }),
        )}`,
      );
      await tab.locator(`[data-seat-open="${demonId}"]`).click();
      await tab.waitForSelector("[data-player-sheet]");
      // The sheet opens with a focus move; tapping before it settles can land
      // on the moving surface.
      await settled(tab);
      await tab.locator('[data-act="player-execute"]').click();
      await settled(tab);
      await executeNow(tab);
      await tab.waitForSelector('[data-table-dock][data-phase="over"]');
      await record("result", "table");

      await tab.locator('[data-act="review"]').click();
      await tab.waitForSelector(".host-review");
      await record("review", "table");

      assert.deepEqual(
        visited,
        ["setup", "bag", "player", "seat", "secrets", "night", "day", "result", "review"],
        `${label}: every screen was reached by tapping`,
      );
      assert.equal(
        await tab.evaluate(() => localStorage.getItem("pg.library.v1")),
        null,
        `${label}: no saved bag registry is required`,
      );
      // A played game writes two records of its own: the save and the console's
      // night-step recovery aid. Neither is a configuration the host supplied.
      const OWN_KEYS = ["pg.game.v4", "pg.lang", "pg.stepDraft", "pg.guided"];
      const keys = await tab.evaluate(() => Object.keys(localStorage).sort());
      assert.deepEqual(
        keys.filter((key) => !OWN_KEYS.includes(key)),
        [],
        `${label}: no config key is required`,
      );
      console.log(`${label} acceptance reached: ${visited.join(" -> ")}`);
    } finally {
      await context.close();
    }
  };

  await walkPhone({ width: 360, height: 640 });
  await walkPhone({ width: 640, height: 360 });

  // The Velvet console gaps: the count stepper, the day-help split, the dawn
  // readout, the scheduled and registered badges, the badge source, the
  // victory copy and the minion card dismissal.
  if (
    await page
      .locator("#update-later")
      .isVisible()
      .catch(() => false)
  ) {
    await page.locator("#update-later").click();
  }
  await seed(7, "deal");
  await route("/bag");
  const countBefore = await page.evaluate(
    async () => (await window.PG_MODULES()).store.state.setup.count,
  );
  const acceptCount = (dialog: PageDialog) => dialog.accept();
  page.on("dialog", acceptCount);
  await page.locator('[data-count="1"]').click();
  await page.locator('[data-count="1"]').click();
  page.off("dialog", acceptCount);
  await page.waitForFunction(
    async (expected) => (await window.PG_MODULES()).store.state.setup.count === expected,
    countBefore + 2,
    { timeout: 3000 },
  );

  await seed(7);
  await route("/table");
  await finishNight();
  assert.equal(
    await page.locator("[data-nomination-none]").count(),
    0,
    "the dawn report opens before the nomination readout",
  );
  await page.locator('[data-act="dawn-dismiss"]').click();
  assert.match(
    await page.locator("[data-nomination-none]").innerText(),
    /Номинации нет|No nomination is open|Namizədlik yoxdur/,
  );
  await page.locator('[data-act="day-help"]').click();
  assert.equal(
    await page.locator('[role="dialog"] [data-exec-target]').count(),
    0,
    "day help keeps the generic execution in the dock",
  );
  assert.equal(await page.locator('[role="dialog"] [data-virgin-form]').count(), 1);
  await page.keyboard.press("Escape");

  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    store.run((state) => {
      state.players["2"].registeredDead = true;
      state.effects.push(
        {
          id: "browser-scheduled",
          kind: "pukka-death",
          sourceId: "3",
          targetId: "4",
          start: { phase: "night", number: 1 },
          expires: null,
          active: true,
        },
        {
          id: "browser-drunk",
          kind: "drunk",
          sourceId: "2",
          targetId: "5",
          start: { phase: "night", number: 1 },
          expires: null,
          active: true,
        },
      );
    });
  });
  await settled();
  assert.equal(
    await page.locator('[data-seat-open="2"] [data-seat-badge="registered-dead"]').count(),
    1,
    "the ring marks a registered death",
  );
  assert.equal(
    await page.locator('[data-seat-open="4"] [data-seat-badge="scheduled"]').count(),
    1,
    "the ring marks a scheduled death",
  );
  assert.equal(
    await page.locator('[data-seat-open="5"] [data-seat-badge="drunk"]').count(),
    1,
    "the ring marks the drunk seat",
  );
  assert.match(
    (await page.locator('[data-seat-open="5"] [data-seat-badge="drunk"]').textContent()) ?? "",
    /Эмпат|Empath|Empat/,
    "the drunk badge names its source",
  );

  await page.evaluate(async () => {
    const { store } = await window.PG_MODULES();
    store.run((state) => {
      state.phase = "over";
      state.day.execution = { playerId: "7", cause: "execution", at: new Date().toISOString() };
      state.players["7"].roleId = "imp";
      state.winner = { team: "good", reason: "demon-dead", title: "Победа добра" };
    });
  });
  await settled();
  assert.match(
    await page.locator('[data-step="over"] [data-win-reason="demon-dead"]').innerText(),
    /Демон казнён|Demon was executed|Demon edam edildi/,
    "an executed Demon reads as executed",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-act="new-game"]').click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('[data-act="new-game"]').click();
  await page.waitForURL(/\/bag/);
  await route("/table");
  assert.equal(await page.locator('[data-step="over"]').count(), 0, "the finished table is gone");
  assert.equal(
    await page.evaluate(async () => (await window.PG_MODULES()).store.state.order.length),
    8,
    "the new game starts from the default bag",
  );

  await seed(7, "deal");
  await route("/table");
  const dealLabels = await page.locator(".host-card a.btn").allTextContents();
  assert.equal(
    new Set(dealLabels).size,
    dealLabels.length,
    "the deal screen does not repeat one return action",
  );

  await seed(7);
  await route("/table");
  await page.locator('[data-act="complete"]').click();
  const cardButton = page.locator('[data-act="show-info"]');
  if (await cardButton.count()) {
    await cardButton.click();
    await page.locator('[data-act="hide-card"]').click();
    await page.waitForSelector('[data-act="step-confirm"]');
    await page.keyboard.press("Escape");
  }

  await seed(7);
  await route("/table");
  assert.equal(
    await page.locator('[data-table-dock] [data-act="undo"]').count(),
    1,
    "the dock owns one undo control",
  );
  assert.match(
    await page.locator('[data-act="reset-step"]').innerText(),
    /Очистить выбор|Clear selection|Seçimi təmizlə/,
    "the draft reset is not labelled as undo",
  );
  while (!(await page.locator('[data-table-dock] [data-act="skip"]').count())) {
    await advanceFixtureStep();
  }
  const stepBeforeUndo = await stepRole();
  await page.locator('[data-act="skip"]').click();
  await settled();
  assert.notEqual(await stepRole(), stepBeforeUndo, "skip advances the night");
  await page.locator('[data-table-dock] [data-act="undo"]').click();
  await settled();
  assert.equal(await stepRole(), stepBeforeUndo, "the dock undo restores the step");
  await openTableMenu();
  assert.equal(
    await page.locator('[data-menu] [data-act="undo"]').count(),
    0,
    "the table menu does not repeat undo",
  );
  await page.locator('[data-act="close"]:visible').first().click();

  // States r1039: a corpse can be executed without another death. Both the
  // mobile and desktop dock must offer the same command as the engine.
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await seed(7);
    await route("/table");
    await finishNight();
    await page.locator('[data-act="dawn-dismiss"]').click();
    await page.evaluate(async () => {
      const { store } = await window.PG_MODULES();
      const result = store.dispatch({
        id: "browser-corpse-" + crypto.randomUUID(),
        type: "manualCorrection",
        payload: {
          change: { kind: "alive", playerId: "2", value: false, reason: "Execution regression" },
        },
      });
      if (result.status !== "allowed") throw new Error(JSON.stringify(result));
    });
    await page.locator('[data-seat-open="2"]').click();
    await page.waitForSelector("[data-player-sheet]");
    await page.locator('[data-act="player-execute"]').click();
    const executeCorpse = page.locator('[data-table-dock] [data-act="execute"]');
    assert.equal(await executeCorpse.isEnabled(), true, width + "px: corpse execution enabled");
    await executeNow();
    const execution = await page.evaluate(async () => {
      const { state } = (await window.PG_MODULES()).store;
      return {
        playerId: state.day.execution?.playerId,
        deathId: state.day.execution?.deathId,
        alive: state.players["2"].alive,
        ended: state.day.ended,
      };
    });
    assert.deepEqual(execution, { playerId: "2", deathId: null, alive: false, ended: true });
    await overflow();
    await page.screenshot({ path: join(screenshots, `corpse-execution-${width}.png`) });
  }

  // A dead Evil Twin whose ability the Vigormortis retains still owes the
  // Storyteller's partner choice. The dock must offer an actionable gate at the
  // table (390 px), not an inert button or a menu-only correction.
  {
    const width = 390;
    await page.setViewportSize({ width, height: 900 });
    await seedRetainedTwinNight();
    await route("/table");
    await page.locator('[data-act="end-night"]').click();
    await page.waitForSelector('[data-act="choose-twin-partner"]');
    assert.match(
      (await page.locator("[data-table-dock]").innerText()) ?? "",
      /Выберите партнёра Злого Близнеца|Choose the Evil Twin|Pis Əkizin tərəfdaşını/,
      width + "px: the gate explains the missing partner",
    );
    await page.locator('[data-act="choose-twin-partner"]').click();
    const twinSelect = page.locator('[role="dialog"] [data-correct="twin-value"]');
    await twinSelect.waitFor();
    const options = await twinSelect
      .locator("option")
      .evaluateAll((list) => list.map((option) => (option as HTMLOptionElement).value));
    assert.ok(
      options.includes("5"),
      width + "px: the dead opposite-alignment player is a legal partner",
    );
    await twinSelect.selectOption("5");
    await page
      .locator('[data-correct="reason"]')
      .fill("Browser regression: the retained Twin's partner");
    await page.locator('[data-act="apply-correction"]').click();
    await page.waitForFunction(
      async () => {
        const { state } = (await window.PG_MODULES()).store;
        return state.setup.evilTwinGoodPlayerId === "5" && state.setup.evilTwinPlayerId === "6";
      },
      null,
      { timeout: 3000 },
    );
    await page.locator('[data-act="end-night"]').click();
    await page.waitForFunction(
      async () => (await window.PG_MODULES()).store.state.phase === "day",
      null,
      { timeout: 3000 },
    );
    assert.equal(
      await page.locator('[data-table-dock][data-phase="day"]').count(),
      1,
      width + "px: the night ends after the Storyteller chooses the partner",
    );
    await overflow();
    await page.screenshot({ path: join(screenshots, `retained-twin-${width}.png`) });
  }

  phase("phone acceptance");

  await timed("saved-custom-bag", savedCustomBagRestoresPool);
  await timed("role-corrections", currentScriptRoleCorrections);
  await timed("madness-execution", madnessExecutionFromTable);
  await timed("player-voting", playerBubbleVoting);
  await timed("player-card", playerCardHasNoCountdown);
  await timed("drunk-slayer", drunkSlayerFromTable);
  await timed("lunatic-setup", lunaticSetupControls);
  await timed("verification-contracts", verificationContracts);
  await timed("setup-zero", setupZeroIsTheLibrariansAlone);
  await timed("demon-wake", newDemonWakesOnce);
  await timed("pukka-goon", pukkaChoosesGoonWhileSelfPoisoned);
  await timed("mayor-redirect", mayorRedirectIsAsked);
  await timed("heir-question", heirQuestionLeadsTheNight);
  await timed("heir-sheet", heirQuestionLeadsAnOpenSheet);
  await timed("chef-label", chefRegistrationIsLabelled);
  await timed("tinker-night", tinkerNightDeathNeedsTheAbility);
  await timed("night-resurrection", nightResurrectionNeedsTheAbility);
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, native role sheet, dialog contract, offline project-subpath reload, fast PWA update.",
  );
  console.log("Screenshots: " + screenshots);
}

try {
  if (focusedName) {
    const check = focusedChecks[focusedName];
    await page.goto(url);
    await page.waitForSelector(".host");
    await timed(focusedName, check);
    assert.deepEqual(errors, []);
    console.log("Browser check passed: " + focusedName);
  } else {
    await fullChecks();
  }
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
