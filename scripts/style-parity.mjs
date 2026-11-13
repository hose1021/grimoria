#!/usr/bin/env node
// Measures the rendered result of the built artifact. `--record` writes the
// baseline, `--check` compares the current build with it, so a styling
// refactor cannot move a value without saying so.
//
// The build under test must be the test-mode artifact (it emits
// `test-entry.js`), which the harness uses to seed a deterministic game.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createDistServer } from "./serve-dist.mjs";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright"
);

const root = fileURLToPath(new URL("../", import.meta.url));
const BASELINE = join(root, "scripts/fixtures/computed-styles.json");

const ROUTES = ["/bag", "/seat", "/secrets", "/table", "/player", "/sheet/en", "/help", "/demo"];
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
];

// The element that proves the route finished its first render.
const MARKERS = {
  "/bag": ".setup",
  "/seat": ".seat-ring",
  "/secrets": ".secrets-head",
  "/table": ".host",
  "/player": ".player-view",
  "/sheet/en": ".sheet-page",
  "/help": "#screen h1",
  "/demo": "#screen > *",
};

// Selectors use structure, ids and data attributes that outlive a class
// rename: the migration must not be able to hide a change by moving a hook.
const PROBES = [
  "body",
  "#screen",
  "#screen > *:first-child",
  "#screen h1",
  "#screen h2",
  "#screen p",
  "#screen button:not([data-app-bar-toggle])",
  "#screen button[disabled]",
  "#screen a",
  "#screen input",
  "#screen select",
  "#screen [role='dialog']",
];

const PROPERTIES = [
  "display",
  "position",
  "width",
  "height",
  "margin",
  "padding",
  "gap",
  "grid-template-columns",
  "flex-direction",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-align",
  "color",
  "background-color",
  "background-image",
  "border-top-width",
  "border-top-color",
  "border-top-left-radius",
  "box-shadow",
  "opacity",
  "overflow-x",
  "overflow-y",
];

const DURATION_PROPERTIES = ["animation-duration", "transition-duration"];
const IDENTITY_PROPERTIES = [
  "tag",
  "id",
  "class",
  "outline-width",
  "outline-color",
  "outline-style",
  "outline-offset",
];

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const record = process.argv.includes("--record");
const distRoot = resolve(root, argument("--root") ?? "dist");
const target = resolve(root, argument("--out") ?? BASELINE);

let expected = null;
if (!record) {
  try {
    expected = JSON.parse(await readFile(target, "utf8"));
  } catch {
    console.error(
      `baseline missing: ${target}.\n` +
        "Record it with `node scripts/style-parity.mjs --record --root <built dist>`.",
    );
    process.exit(1);
  }
}

const server = createDistServer({ root: distRoot, prefix: "/" });
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });

// A seven-player Trouble Brewing deal with every seat claimed: the console and
// the hand-off then render their real markup instead of an empty state.
async function seed(page) {
  const result = await page.evaluate(async () => {
    const { model, engine, store } = await window.PG_MODULES();
    const assignment = {
      1: "chef",
      2: "empath",
      3: "fortuneteller",
      4: "undertaker",
      5: "virgin",
      6: "poisoner",
      7: "imp",
    };
    const game = model.createGame(7);
    Object.entries(assignment).forEach(([id, role]) => {
      game.players[id].name = id === "1" ? "Alice" : `Player ${id}`;
      game.players[id].claimed = true;
      game.players[id].roleId = role;
    });
    game.setup.count = 7;
    game.setup.roles = Object.values(assignment);
    game.setup.bluffs = ["washerwoman", "librarian", "monk"];
    const dealt = engine.dealGame(game, { assignment });
    if (!dealt.ok) return dealt;
    engine.autoSecrets(game);
    const errors = model.validateState(game);
    if (errors.length) return { ok: false, errors };
    store.replaceState(game);
    dispatchEvent(new PopStateEvent("popstate"));
    return { ok: true };
  });
  if (!result.ok) throw new Error(`seed failed: ${JSON.stringify(result)}`);
  await page.waitForTimeout(50);
}

async function visit(page, route) {
  const segment = route.split("/")[1];
  await page.evaluate((href) => {
    history.pushState(null, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
  }, route);
  await page.waitForFunction((name) => document.body.dataset.route === name, segment);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => {
      const images = [...document.images];
      if (images.some((image) => !image.complete)) return false;
      const height = document.body.scrollHeight;
      const previous = window.__parityHeight;
      window.__parityHeight = height;
      return previous === height;
    },
    undefined,
    { polling: 150, timeout: 8000 },
  );
  await page.waitForTimeout(80);
}

const snapshot = ({ selectors, properties }) =>
  selectors.flatMap((selector) => {
    const element = document.querySelector(selector);
    if (!element) return [];
    const style = getComputedStyle(element);
    return [
      [
        selector,
        Object.fromEntries(
          properties.map((property) => [property, style.getPropertyValue(property)]),
        ),
      ],
    ];
  });

async function capture(page) {
  const result = {};
  result.default = Object.fromEntries(
    await page.evaluate(snapshot, { selectors: [...PROBES], properties: PROPERTIES }),
  );

  const hoverable = "#screen button:not([disabled]), #screen a[href], #screen [data-act]";
  const hovered = await page.evaluate((selector) => {
    const element = [...document.querySelectorAll(selector)].find((candidate) => {
      const style = getComputedStyle(candidate);
      const rect = candidate.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
    if (!element) return false;
    element.setAttribute("data-parity-hover", "");
    element.scrollIntoView({ block: "center" });
    return true;
  }, hoverable);
  if (hovered) {
    await page.hover("[data-parity-hover]");
    result.hover = Object.fromEntries(
      await page.evaluate(snapshot, {
        selectors: ["[data-parity-hover]"],
        properties: [...PROPERTIES, ...DURATION_PROPERTIES],
      }),
    );
    await page.evaluate(() =>
      document.querySelector("[data-parity-hover]")?.removeAttribute("data-parity-hover"),
    );
    await page.mouse.move(1, 1);
  }

  await page.evaluate(() => document.body.focus());
  await page.keyboard.press("Tab");
  result.focus = await page.evaluate(
    (values) => {
      const element = document.activeElement;
      if (!element) return {};
      const style = getComputedStyle(element);
      return {
        identity: Object.fromEntries(
          values.identity.map((key) => [
            key,
            key === "tag" || key === "id" || key === "class"
              ? key === "tag"
                ? element.tagName
                : String(element[key] ?? "")
              : style.getPropertyValue(key),
          ]),
        ),
        outline: Object.fromEntries(
          values.outline.map((property) => [property, style.getPropertyValue(property)]),
        ),
      };
    },
    { identity: IDENTITY_PROPERTIES, outline: IDENTITY_PROPERTIES.slice(3) },
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  result.reduced = Object.fromEntries(
    await page.evaluate(snapshot, { selectors: [...PROBES], properties: DURATION_PROPERTIES }),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return result;
}

async function captureRoute(viewport, route) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    window.PG_MODULES = () => import("/test-entry.js");
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForSelector("#screen > *");
  // The boot loads the locale catalog and the saved game after the first
  // paint; measuring before it settles compares two different states.
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Boolean(document.body.dataset.route));
  // `/bag` fills an empty bag with a random one on mount, so it gets a fixed
  // bag too; otherwise two runs measure two different compositions.
  const SEEDED = new Set(["/bag", "/table", "/player", "/seat", "/secrets"]);
  if (SEEDED.has(route)) await seed(page);
  await visit(page, route);
  const marker = MARKERS[route];
  if (marker) await page.waitForSelector(marker, { timeout: 5000 });
  if (route === "/player") {
    const seat = page.locator('[data-seat="0"]');
    if (await seat.count()) {
      await seat.click();
      await page.waitForSelector(".player-card");
      await page.evaluate(() => document.fonts.ready);
    }
  }
  const result = await capture(page);
  await context.close();
  return result;
}

const baseline = {};
for (const route of ROUTES) {
  baseline[route] = {};
  for (const viewport of VIEWPORTS) {
    baseline[route][`${viewport.width}x${viewport.height}`] = await captureRoute(viewport, route);
  }
}

await browser.close();
await new Promise((done) => server.close(done));

if (record) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Recorded ${ROUTES.length} routes x ${VIEWPORTS.length} viewports to ${target}`);
} else {
  const differences = [];
  const compare = (path, left, right) => {
    if (left === undefined || right === undefined) {
      differences.push(
        `${path}: ${left === undefined ? "missing" : left} -> ${right === undefined ? "missing" : right}`,
      );
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object") {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
        compare(`${path}.${key}`, left[key], right[key]);
      }
      return;
    }
    if (left !== right) differences.push(`${path}: ${left} -> ${right}`);
  };
  compare("", expected, baseline);
  if (differences.length) {
    console.error(`Computed styles changed in ${differences.length} place(s):`);
    for (const line of differences.slice(0, 60)) console.error(`  - ${line}`);
    if (differences.length > 60) console.error(`  ... ${differences.length - 60} more`);
    process.exit(1);
  }
  console.log(
    `Computed styles match the baseline for ${ROUTES.length} routes at ${VIEWPORTS.length} viewports.`,
  );
}
