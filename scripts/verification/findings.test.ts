import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createGame } from "../../src/core/model/state.ts";
import {
  badMoonRisingScript,
  sectsAndVioletsScript,
  troubleBrewingScript,
} from "../../src/core/model/scripts.ts";
import {
  dealGame,
  nominate,
  recordVotes,
  skipStep,
  startNight,
  useSlayer,
} from "../../src/core/engine/index.ts";
import { lifecycleGuard } from "../../src/core/engine/lifecycle.ts";
import { seatBadges } from "../../src/ui/screens/table/ring.ts";
import { infoRoleChoices, obligationDone } from "../../src/ui/screens/secrets-options.ts";
import { executionDraftKey } from "../../src/ui/screens/table/helpers.ts";
import type { GameState } from "../../src/core/model/types.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = dir + "/" + entry.name;
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

function tbGame(): GameState {
  const game = createGame(5);
  game.script = troubleBrewingScript();
  game.scriptId = "tb";
  game.setup.count = 5;
  game.setup.roles = ["chef", "empath", "soldier", "poisoner", "imp"];
  game.setup.bluffs = [];
  assert.equal(
    dealGame(game, {
      assignment: { 1: "chef", 2: "empath", 3: "soldier", 4: "poisoner", 5: "imp" },
    }).ok,
    true,
  );
  return game;
}

test("F-001 the UI does not offer survives from a broad role list", () => {
  assert.equal(
    read("src/ui/screens/table/cards.tsx").includes(
      '["pacifist", "sailor", "fool", "devilsadvocate", "zombuul"]',
    ),
    false,
  );
});

test("F-002 a mandatory living night step cannot be skipped", () => {
  const game = tbGame();
  game.phase = "night";
  game.night.number = 2;
  game.day.number = 2;
  game.night.queue = [];
  assert.equal(startNight(game).ok, true);
  const imp = game.night.queue.find((step) => step.roleId === "imp");
  assert.ok(imp);
  assert.equal(skipStep(game, imp.key, "verification").ok, false);
});

test("F-003 the UI calls recordKlutzChoice for a day death", () => {
  const text = walk("src/ui").map(read).join("\n");
  assert.match(text, /recordKlutzChoice/);
});

test("F-004 a Philosopher can use a borrowed Slayer", () => {
  const game = createGame(7);
  game.script = sectsAndVioletsScript();
  game.scriptId = "snv";
  game.setup.count = 7;
  game.setup.roles = [
    "philosopher",
    "clockmaker",
    "dreamer",
    "seamstress",
    "mutant",
    "cerenovus",
    "fanggu",
  ];
  game.setup.bluffs = ["oracle", "savant", "artist"];
  assert.equal(
    dealGame(game, {
      assignment: {
        1: "philosopher",
        2: "clockmaker",
        3: "dreamer",
        4: "seamstress",
        5: "mutant",
        6: "cerenovus",
        7: "fanggu",
      },
    }).ok,
    true,
  );
  game.phase = "day";
  game.day.number = 1;
  game.day.ended = false;
  game.day.execution = null;
  game.players["1"].used.philosopherAbility = "slayer";
  assert.equal(useSlayer(game, "1", "2").ok, true);
});

test("F-005 an impaired card opens for a chosen given answer", () => {
  assert.match(read("src/ui/screens/table/cards.tsx"), /disabled=\{!given\}/);
});

test("F-006 a target change drops the previous given answer", () => {
  assert.match(read("src/ui/screens/table/index.tsx"), /dropGiven\(key\)/);
});

test("F-007 a step change clears the shared information template", () => {
  assert.doesNotMatch(read("src/ui/screens/table/drafts.ts"), /infoTemplate/);
});

test("F-008 a day change clears the execution target and survives flag", () => {
  const game = createGame(5);
  game.phase = "day";
  game.day.number = 1;
  game.night.number = 1;
  const first = executionDraftKey(game);
  game.day.number = 2;
  assert.notEqual(
    executionDraftKey(game),
    first,
    "the table screen resets the execution drafts on a new day",
  );
  game.day.number = 1;
  game.phase = "night";
  game.night.number = 2;
  assert.notEqual(executionDraftKey(game), first, "a phase change resets them too");
});

test("F-009 a registered-dead Zombuul cannot nominate and spends its vote token", () => {
  const game = createGame(5);
  game.script = badMoonRisingScript();
  game.scriptId = "bmr";
  game.setup.count = 5;
  game.setup.roles = ["zombuul", "assassin", "sailor", "courtier", "chambermaid"];
  game.setup.bluffs = [];
  assert.equal(
    dealGame(game, {
      assignment: {
        1: "zombuul",
        2: "assassin",
        3: "sailor",
        4: "courtier",
        5: "chambermaid",
      },
    }).ok,
    true,
  );
  game.phase = "day";
  game.day = {
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  game.players["1"].registeredDead = true;
  assert.equal(nominate(game, "1", "3").ok, false, "a registered-dead Zombuul cannot nominate");
  assert.equal(nominate(game, "3", "1").ok, true);
  const first = game.day.activeNominationId!;
  assert.equal(recordVotes(game, first, ["1"]).ok, true);
  assert.equal(game.players["1"].voteToken, false, "the first vote spends the token");
  assert.equal(nominate(game, "4", "5").ok, true);
  const second = game.day.activeNominationId!;
  assert.equal(recordVotes(game, second, ["1"]).ok, true);
  assert.equal(
    game.day.nominations.find((item) => item.id === second)!.count,
    0,
    "the spent dead vote is not counted again",
  );
});

test("F-010 both drunk and poisoned are true display states", () => {
  const badges = seatBadges({ alive: true, drunk: true, poisoned: true });
  assert.ok(badges.includes("drunk"));
  assert.ok(badges.includes("poison"));
});

test("F-011 the /secrets done mark follows the engine's secrets errors", () => {
  assert.equal(obligationDone("washerwoman", []), true, "no problem, the row is done");
  assert.equal(
    obligationDone("washerwoman", [{ code: "info-pair-washerwoman" }]),
    false,
    "a reported pair problem clears the mark",
  );
  assert.equal(obligationDone("librarian", [{ code: "librarian-zero" }]), false);
  assert.equal(obligationDone("herring", [{ code: "herring-team" }]), false);
});

test("F-012 a registering Spy does not make every not-in-play role legal without the pair", () => {
  const held = ["spy", "chef"];
  const withoutPair = infoRoleChoices({
    team: "townsfolk",
    forDrunk: false,
    held,
    scriptRoles: ["spy", "chef", "empath", "soldier"],
    pairRoles: [],
  });
  assert.equal(withoutPair.includes("empath"), false, "the Spy outside the pair registers nothing");
  const withPair = infoRoleChoices({
    team: "townsfolk",
    forDrunk: false,
    held,
    scriptRoles: ["spy", "chef", "empath", "soldier"],
    pairRoles: ["spy", "1"],
  });
  assert.ok(withPair.includes("empath"), "the Spy in the pair offers the not-in-play role");
});

test("F-013 the spec allows a dead player to be executed", () => {
  const text = read("openspec/specs/game/day-and-win/spec.md");
  assert.equal(text.includes("executes an already dead player"), false);
  assert.match(
    text,
    /execution is recorded, the day is spent, and no new death occurs/,
    "the requirement states the recorded execution with no new death",
  );
});

test("F-014 the correction form exposes effect and shown changes", () => {
  const text = read("src/ui/screens/table/dialogs.tsx");
  assert.match(text, /data-correct="effect"/);
  assert.match(text, /data-correct="shown"/);
});

test("F-015 the Russian Empath ability states the two-neighbour count", () => {
  const context: { PG?: { roles?: Array<{ id: string; ability?: string }> } } = {};
  vm.createContext(context);
  vm.runInContext(read("public/assets/data/ru_RU.js"), context);
  const empath = context.PG?.roles?.find((role) => role.id === "empath");
  assert.ok(empath);
  assert.match(empath.ability ?? "", /2\s+живых соседей/);
});

test("F-017 a mid-game seat reorder needs an explicit correction", () => {
  const game = tbGame();
  game.phase = "day";
  game.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.notEqual(
    lifecycleGuard(game, "setOrder"),
    null,
    "setOrder during a live day must be rejected or confirmed as a correction",
  );
});

test("F-018 notes do not dispatch on every character", () => {
  const text = read("src/ui/screens/table/frame.tsx");
  const start = text.indexOf("data-notes");
  const notes = text.slice(start, start + 700);
  assert.doesNotMatch(notes, /setNotes/);
});

test("F-021 the step given gate has a unit oracle", () => {
  const manifest = JSON.parse(read("docs/audits/verification-gates/test-manifest.json")) as {
    tests: Array<{ key: string }>;
  };
  assert.ok(
    manifest.tests.some(
      (entry) =>
        entry.key.includes("step-context.verification.test.ts") &&
        entry.key.includes("blocked until a given answer exists"),
    ),
  );
});
