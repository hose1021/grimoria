// Shared harness for the full-game scenario checks: one built dist, one
// browser, one real UI path per step. Game state is seeded through the same
// engine commands the setup screen dispatches, then every night step, host
// decision and execution goes through the table controls.
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Page, Playwright } from "./playwright.ts";
import { createDistServer } from "./serve-dist.ts";
import { shotPath } from "./harness.ts";

const { chromium } = (await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright"
)) as Playwright;

const root = fileURLToPath(new URL("../", import.meta.url));
const BASE = "/pocket/";

export { assert };

export async function bootScenario({
  viewport = { width: 1280, height: 900 },
}: {
  viewport?: { height: number; width: number };
} = {}): Promise<Kit> {
  const server = createDistServer({ root: join(root, "dist"), prefix: BASE });
  await new Promise<void>((done) =>
    server.listen(0, "127.0.0.1", () => {
      done();
    }),
  );
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${BASE}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    // The page resolves this specifier at runtime; the harness never bundles it.
    window.PG_MODULES = () => import(String("/pocket/test-entry.js"));
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(url + "table");
  await page.waitForSelector(".host");
  return {
    page,
    url,
    errors,
    failed,
    async close() {
      await browser.close();
      await new Promise((done) => server.close(done));
    },
    async screenshot(name: string) {
      await page.screenshot({
        path: shotPath(process.env.PG_SCENARIO_SHOTS, join(root, "dist"), name),
        fullPage: true,
      });
    },
  };
}

/** The editions a scenario deals; "sv" is the shorthand the engine does not route on. */
export type SeedEdition = "bmr" | "snv" | "sv" | "tb";

/** What one scenario deals: the edition, the seat-to-role map and the setup choices. */
export interface SeedOptions {
  assignment: Record<string, string>;
  bluffs?: string[];
  drunkShown?: string;
  edition?: SeedEdition;
  lunaticShown?: string;
  start?: string;
  twin?: string;
}

/** A seed with every default resolved. */
interface ResolvedSeed {
  assignment: Record<string, string>;
  bluffs: string[];
  drunkShown?: string;
  edition: SeedEdition;
  lunaticShown?: string;
  start: string;
  twin?: string;
}

/**
 * Seeds a dealt game and lands on the table.
 * edition: "tb" | "bmr" | "snv" | "manual"; assignment: { seatId: roleId }.
 */
export async function seedGame(
  page: Page,
  {
    edition = "tb",
    assignment,
    bluffs = [],
    start = "night",
    twin,
    drunkShown,
    lunaticShown,
  }: SeedOptions,
) {
  const result = await page.evaluate(
    async ({
      edition,
      assignment,
      bluffs,
      start,
      twin,
      drunkShown,
      lunaticShown,
    }: ResolvedSeed) => {
      // "sv" is a common shorthand; the engine routes only on "snv".
      const { model, engine, store, rules } = await window.PG_MODULES();
      const seats = Object.keys(assignment);
      const game = model.createGame(seats.length);
      const scriptEdition = edition === "sv" ? "snv" : edition;
      if (scriptEdition !== "tb") {
        const all = scriptEdition === "bmr" ? rules.BMR_ALL : rules.SNV_ALL;
        game.scriptId = scriptEdition;
        game.script = {
          ...game.script,
          id: scriptEdition,
          name: scriptEdition === "bmr" ? "Bad Moon Rising" : "Sects and Violets",
          edition: scriptEdition,
          roles: [...all],
        };
      }
      for (const [id, roleId] of Object.entries(assignment)) {
        game.players[id].name = "P" + id;
        game.players[id].claimed = true;
        void roleId;
      }
      game.setup.count = seats.length;
      game.setup.roles = [...new Set(Object.values(assignment))];
      game.setup.bluffs = bluffs;
      if (twin) game.setup.evilTwinGoodId = twin;
      if (drunkShown) game.setup.drunkShownId = drunkShown;
      if (lunaticShown) game.setup.lunaticShownId = lunaticShown;
      const dealt = engine.dealGame(game, { assignment });
      if (!dealt.ok) return { ok: false, step: "deal", detail: dealt };
      engine.autoSecrets(game);
      game.phase = "seat";
      if (start === "night") {
        const begun = engine.startNight(game);
        if (!begun.ok) return { ok: false, step: "startNight", detail: begun };
      }
      const errors = model.validateState(game);
      if (errors.length) return { ok: false, step: "validate", detail: errors };
      const replaced = store.replaceState(game);
      if (!replaced.ok) return { ok: false, step: "replace", detail: replaced };
      dispatchEvent(new PopStateEvent("popstate"));
      return { ok: true };
    },
    { edition, assignment, bluffs, start, twin, drunkShown, lunaticShown },
  );
  assert.equal(result.ok, true, `seed failed: ${JSON.stringify(result)}`);
  await settle(page);
}

/** In-app navigation: the router reads popstate, so no 404 document is fetched. */
export async function gotoRoute(page: Page, route: string) {
  const path = route.replace(/^\//, "");
  await page.evaluate((target: string) => {
    history.pushState({}, "", target);
    dispatchEvent(new PopStateEvent("popstate"));
  }, BASE + path);
  await waitRoute(page, path.split("/")[0] || "home");
}

/** The shell publishes the route after its lazy screen has committed. */
export async function waitRoute(page: Page, route: string) {
  try {
    await page.waitForFunction((wanted) => document.body.dataset.route === wanted, route, {
      timeout: 8000,
    });
  } catch {
    const actual = await page
      .evaluate(() => document.body.dataset.route || "(none)")
      .catch(() => "(gone)");
    assert.fail(`the ${route} route must open, the app is on ${actual}`);
  }
}

export async function visibleText(page: Page) {
  return page.locator("body").innerText();
}

export async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
}

/** Serialized view of the fields a scenario asserts on. */
export async function snapshot(page: Page): Promise<Shot> {
  return page.evaluate(async (): Promise<Shot> => {
    const { store, engine } = await window.PG_MODULES();
    const state = store.state;
    const step = engine.currentStep(state);
    return {
      phase: state.phase,
      day: state.day.number,
      winner: state.winner,
      dayEnded: state.day.ended,
      execution: state.day.execution
        ? { playerId: state.day.execution.playerId, deathId: state.day.execution.deathId }
        : null,
      step: step ? { key: step.key, roleId: step.roleId, targetMode: step.targetMode } : null,
      players: Object.values(state.players).map((player) => ({
        id: player.id,
        seat: player.seat,
        roleId: player.roleId,
        alive: player.alive,
        registeredDead: player.registeredDead === true,
        team: player.team,
      })),
      deaths: state.deaths.map((death) => ({
        playerId: death.playerId,
        cause: death.cause,
        phase: death.phase,
        number: death.number,
      })),
      effects: state.effects.map((effect) => ({
        kind: effect.kind,
        sourceId: effect.sourceId,
        targetId: effect.targetId,
        bmr: effect.bmr,
      })),
      log: state.log.length,
      logTail: state.log.slice(-6).map((entry) => entry.title),
    };
  });
}

export async function currentStep(page: Page) {
  return page.evaluate(async () => {
    const { store, engine } = await window.PG_MODULES();
    const step = engine.currentStep(store.state);
    return step ? { key: step.key, roleId: step.roleId, targetMode: step.targetMode } : null;
  });
}

/** Fixture-only: advance the current night step as a recorded ruleset could skip it. */
export async function advanceStep(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { store, engine } = await window.PG_MODULES();
    const step = engine.currentStep(store.state);
    if (!step) return;
    // A permitted skip goes through the command; a mandatory step is marked in
    // the fixture state, because this driver is setup, not a host action.
    const applied = store.dispatch({ type: "skipStep", payload: { key: step.key } });
    if (applied.status === "allowed") return;
    const next = structuredClone(store.state);
    const target = next.night.queue.find((entry) => entry.key === step.key);
    if (!target) return;
    target.done = true;
    target.skipped = true;
    store.replaceState(next);
  });
  await settle(page);
}

/** Skips every remaining night step and ends the night. */
export async function skipNight(page: Page) {
  for (let guard = 0; guard < 80; guard += 1) {
    if (await page.locator('[data-act="end-night"]').count()) {
      await page.locator('[data-act="end-night"]').click();
      await settle(page);
      return;
    }
    const step = await currentStep(page);
    assert.ok(step, "a night step or the end-night control must exist");
    await advanceStep(page);
  }
  throw new Error("night did not end");
}

async function pickTargets(page: Page, wanted: number | (number | string | null)[]) {
  const seats = page.locator("[data-target]:not(:disabled)");
  const available = await seats.count();
  if (Array.isArray(wanted)) {
    // An explicit empty list means "choose no one" (the Po may decline).
    for (const id of wanted.map(String)) {
      const seat = page.locator(`[data-target][data-id="${id}"]:not(:disabled)`);
      assert.equal(await seat.count(), 1, `target ${id} must be selectable`);
      await seat.click();
    }
    return;
  }
  const count = Number(wanted) || 1;
  assert.ok(available >= count, `step needs ${count} target(s), ${available} selectable`);
  for (let index = 0; index < count; index += 1) await seats.nth(index).click();
}

async function pickGiven(page: Page, wanted: boolean | number | string | undefined) {
  const select = page.locator("select[data-given]:visible");
  if (!(await select.count())) return;
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      text: node.textContent,
    })),
  );
  const value =
    wanted === undefined || wanted === null
      ? (options.find((option) => option.value) || {}).value
      : typeof wanted === "number"
        ? (options[wanted] || options.find((option) => option.value) || {}).value
        : String(wanted);
  if (value === undefined) return;
  await select.selectOption(value);
}

/** What one scenario does on a night step it recognises. */
export interface StepPlan {
  checks?: string[];
  click?: string[];
  fills?: Record<string, string>;
  given?: boolean | number | string;
  selectors?: string[];
  selects?: { index?: number; selector: string; value?: number | string }[];
  skip?: boolean;
  targets?: number | (number | string | null)[];
}

export type NightPlan = Record<string, StepPlan>;

/**
 * Plays the whole night through the console.
 * plan: { [roleId]: { targets, given, click: [selectors], skip } }.
 */
export async function playNight(
  page: Page,
  plan: NightPlan = {},
  { skipUnplanned = false }: { skipUnplanned?: boolean } = {},
) {
  for (let guard = 0; guard < 80; guard += 1) {
    if (await page.locator('[data-act="end-night"]').count()) {
      await page.locator('[data-act="end-night"]').click();
      await settle(page);
      return;
    }
    const step = await currentStep(page);
    assert.ok(step, "a night step or the end-night control must exist");
    const spec = (step.roleId && plan[step.roleId]) || plan[step.key] || {};
    if (
      spec.skip ||
      (skipUnplanned && !spec.targets && step.targetMode && step.targetMode !== "none")
    ) {
      await advanceStep(page);
      continue;
    }
    if (spec.targets) await pickTargets(page, spec.targets);
    else if (step.targetMode === "two") await pickTargets(page, 2);
    else if (step.targetMode === "po") {
      /* the Po may choose none; the scenario decides */
    } else if (step.targetMode && step.targetMode !== "none") await pickTargets(page, 1);
    await page.locator('[data-act="complete"]').click();
    await page.waitForSelector('[data-act="step-confirm"]');
    await pickGiven(page, spec.given);
    for (const selector of spec.click || []) {
      const control = page.locator(selector).first();
      if (await control.count()) await control.click();
    }
    for (const { selector, value, index } of spec.selects || []) {
      const control = page.locator(selector).first();
      if (!(await control.count())) continue;
      const options = await control
        .locator("option")
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
      const chosen =
        value !== undefined
          ? String(value)
          : index !== undefined
            ? options[index]
            : options.find((option) => option);
      if (chosen !== undefined) await control.selectOption(chosen);
    }
    for (const selector of spec.checks || []) {
      const control = page.locator(selector).first();
      if (await control.count()) await control.check();
    }
    for (const [selector, text] of Object.entries(spec.fills || {})) {
      const control = page.locator(selector).first();
      if (await control.count()) await control.fill(String(text));
    }
    const confirm = page.locator('[data-act="step-confirm"]');
    assert.equal(
      await confirm.isEnabled(),
      true,
      `confirm disabled on ${step.roleId}: ${await page.locator("[data-blocker-reason]").allTextContents()}`,
    );
    await confirm.click();
    await settle(page);
  }
  throw new Error("night did not end");
}

/** One scenario's snapshot of the game and the fields a scenario asserts on. */
export interface Shot {
  day: number;
  dayEnded: boolean;
  deaths: { cause: string; number: number; phase: string; playerId: string }[];
  effects: { bmr?: string; kind: string; sourceId?: string | null; targetId?: string | null }[];
  execution: { deathId?: string | null; playerId: string } | null;
  log: number;
  logTail: (string | undefined)[];
  phase: string;
  players: {
    alive: boolean;
    id: string;
    registeredDead: boolean;
    roleId: string | null;
    seat: number;
    team: string | null;
  }[];
  step: { key: string; roleId?: string | null; targetMode?: string } | null;
  winner: { reason?: string; team: string } | null;
}

/** One scenario's browser session: its page, its collected errors and teardown. */
export interface Kit {
  close(): Promise<void>;
  errors: string[];
  failed: string[];
  page: Page;
  screenshot(name: string): Promise<void>;
  url: string;
}

/** Executes one living player through the dock, or ends the day without one. */
export async function playDay(
  page: Page,
  {
    execute = null,
    survives = false,
  }: { execute?: number | string | null; survives?: boolean } = {},
) {
  if (execute) {
    if (survives) {
      const card = page.locator("[data-exec-target]");
      if (await card.count()) await card.selectOption(String(execute));
      const surviveBox = page.locator("[data-exec-survives]");
      if (await surviveBox.count()) await surviveBox.check();
      await page.locator('[data-act="execute-direct"]').click();
      await settle(page);
      return;
    }
    await page.locator(`[data-seat-open="${execute}"]`).click();
    await page.waitForSelector("[data-player-sheet]");
    await page.locator('[data-act="player-execute"]').click();
    await page.locator('[data-act="execute"]').click();
    await page.waitForSelector("[data-execute-confirm]");
    await page.locator('[data-act="execute-confirm"]').click();
    await settle(page);
    return;
  }
  await page.locator('[data-act="end-day"]').click();
  await settle(page);
}

export function expectWinner(shot: Shot, team: string, reason?: string) {
  assert.ok(shot.winner, `expected a ${team} win, no winner yet`);
  assert.equal(shot.winner.team, team, `winner team (${JSON.stringify(shot.winner)})`);
  if (reason) assert.equal(shot.winner.reason, reason, "winner reason");
}

export function expectAlive(shot: Shot, ids: (number | string)[], alive = true) {
  for (const id of ids) {
    const player = shot.players.find((candidate) => candidate.id === String(id));
    assert.ok(player, `player ${id} missing`);
    assert.equal(player.alive, alive, `player ${id} alive must be ${alive}`);
  }
}

/** Runs one scenario, prints one PASS line, exits non-zero on failure. */
export async function runScenario(name: string, fn: (kit: Kit, name: string) => Promise<unknown>) {
  const started = Date.now();
  let kit: Kit | null = null;
  try {
    kit = await bootScenario();
    const summary = await fn(kit, name);
    const ms = Date.now() - started;
    console.log(`SCENARIO PASS ${name} (${ms} ms)${summary ? `: ${summary}` : ""}`);
    if (kit.errors.length) console.log(`  page errors: ${kit.errors.join(" | ")}`);
    if (kit.failed.length) console.log(`  failed requests: ${kit.failed.join(" | ")}`);
    await kit.close();
    process.exit(0);
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error ? error.message : error;
    console.log(`SCENARIO FAIL ${name}: ${message}`);
    if (kit) {
      try {
        await kit.screenshot(name);
        const shot = await snapshot(kit.page);
        console.log(JSON.stringify(shot, null, 1));
        if (kit.errors.length) console.log(`page errors: ${kit.errors.join(" | ")}`);
      } catch {
        /* the page may already be gone */
      }
      await kit.close();
    }
    process.exit(1);
  }
}
